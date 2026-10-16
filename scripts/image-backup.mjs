/* 截图备份：把所有用户交易 / 复盘 / 打法里的外链截图转成无损 WebP，存一份到自建图床。
   截图大多是纯色背景 + 线条文字，无损 WebP 比有损 q80 还小一半，画质和原图逐像素一致
   - 只备份，不改任何原链接；对照关系写进 image_backups 表（见 supabase/migrations/20261015000000_image_backups.sql）
   - 可以反复跑：表里已经 ok 的跳过，失败的下次再试（最多 MAX_ATTEMPTS 次）
   - 编码方式（ENCODING）换了的话，老格式的备份会重新做一份；重做失败（比如原图已经没了）就留着老备份不动
   - 只备份 FX Replay 和 TradingView 两种；用户自己图床上的图不管
   - 优先级：FX Replay（最容易丢）→ TradingView
   - 仓库是公开的，Actions 日志谁都能看：这里只打印数量，不打印任何链接和密钥

   需要的环境变量：SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY、IMG_API_TOKEN
   可选：MAX_PER_RUN（默认 5000）、DRY_RUN=1（只盘点不上传）
   依赖 sharp：npm i --no-save sharp */

const SB_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
const SB_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const IMG_TOKEN = (process.env.IMG_API_TOKEN || "").trim();
const IMG_API = "https://img-gallery.wjt6912.workers.dev";
const MAX_PER_RUN = parseInt(process.env.MAX_PER_RUN || "5000", 10);
const DRY_RUN = process.env.DRY_RUN === "1";
const MAX_ATTEMPTS = 7;
const ENCODING = "webp-lossless";
const BATCH = 10;          // 每批上传几张
const PAUSE_MS = 1000;     // 批次之间停一下，不猛刷
const MAX_BYTES = 25 * 1024 * 1024;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

if (!SB_URL || !SB_KEY || (!IMG_TOKEN && !DRY_RUN)) {
  console.error("缺少环境变量 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / IMG_API_TOKEN");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

async function sbSelectAll(table, select) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?select=${select}`, {
      headers: { ...sbHeaders, Range: `${from}-${from + 999}`, "Range-Unit": "items" },
    });
    if (!res.ok) throw new Error(`读取 ${table} 失败：${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function sbUpsert(rows) {
  if (!rows.length) return;
  const res = await fetch(`${SB_URL}/rest/v1/image_backups?on_conflict=source_url`, {
    method: "POST",
    headers: { ...sbHeaders, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`写 image_backups 失败：${res.status} ${await res.text()}`);
}

/* ---------- 找图 ---------- */
// 和前端 src/10-markdown.js 的 imgSrc() 保持一致：表里的 source_url 必须等于网页 <img> 实际加载的地址
const TV_SNAPSHOT_RE = /^https?:\/\/(?:[a-z-]+\.)?tradingview\.com\/x\/([A-Za-z0-9]+)\/?(?:[?#]\S*)?$/i;
const URL_RE = /https?:\/\/[^\s"'<>()\[\]`\\]+/g;

function classify(raw) {
  const u = raw.replace(/[.,;:!?*_~]+$/, "");
  const tv = u.match(TV_SNAPSHOT_RE);
  if (tv) return { key: `https://s3.tradingview.com/snapshots/${tv[1][0].toLowerCase()}/${tv[1]}.png`, kind: "tradingview", prio: 1 };
  if (/^https?:\/\/fxr-snapshots[a-z0-9-]*\.s3[a-z0-9.-]*\.amazonaws\.com\/\S+/i.test(u)) return { key: u, kind: "fxreplay", prio: 0 };
  if (/^https?:\/\/s3\.tradingview\.com\/snapshots\/\S+/i.test(u)) return { key: u, kind: "tradingview", prio: 1 };
  return null;
}

function collectStrings(v, out) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collectStrings(x, out));
}

async function findImages() {
  const [trades, reviews, playbook] = await Promise.all([
    sbSelectAll("trades", "data"),
    sbSelectAll("journal_reviews", "title,body"),
    sbSelectAll("journal_playbook", "title,body"),
  ]);
  const found = new Map();
  const strings = [];
  for (const r of [...trades, ...reviews, ...playbook]) collectStrings(r, strings);
  for (const s of strings) {
    for (const m of s.matchAll(URL_RE)) {
      const c = classify(m[0]);
      if (c && !found.has(c.key)) found.set(c.key, c);
    }
  }
  return { images: [...found.values()], rowCount: trades.length + reviews.length + playbook.length };
}

/* ---------- 下载 / 压缩 / 上传 ---------- */
async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "";
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("太大");
  return { type, buf };
}

let sharp;
async function toWebp(item) {
  const { type, buf } = await download(item.key);
  if (!/^image\//i.test(type)) throw new Error(`不是图片（${type.split(";")[0] || "无类型"}）`);
  const webp = await sharp(buf, { animated: false }).webp({ lossless: true }).toBuffer();
  return { origBytes: buf.length, webp };
}

async function uploadBatch(files) {
  const form = new FormData();
  files.forEach((f, i) => form.append("file", new Blob([f.webp], { type: "image/webp" }), `b${i}.webp`));
  const res = await fetch(`${IMG_API}/api/upload`, {
    method: "POST", headers: { Authorization: `Bearer ${IMG_TOKEN}` }, body: form, signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`图床上传失败 HTTP ${res.status}`);
  const { results = [] } = await res.json();
  const byName = new Map(results.map((r) => [r.name, r]));
  return files.map((_, i) => byName.get(`b${i}.webp`) || null);
}

async function verify(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(20000) });
      if (res.ok && /^image\//i.test(res.headers.get("content-type") || "")) return true;
    } catch (e) {}
    await sleep(1500);
  }
  return false;
}

const shortErr = (e) => String((e && e.message) || e).slice(0, 200);

async function main() {
  const { images, rowCount } = await findImages();
  const existing = new Map((await sbSelectAll("image_backups", "source_url,status,attempts,encoding")).map((r) => [r.source_url, r]));
  const todo = images
    .filter((it) => {
      const ex = existing.get(it.key);
      if (!ex) return true;
      if (ex.status === "ok") return ex.encoding !== ENCODING;
      return ex.attempts < MAX_ATTEMPTS;
    })
    .sort((a, b) => a.prio - b.prio)
    .slice(0, MAX_PER_RUN);

  const byKind = {};
  for (const it of images) byKind[it.kind] = (byKind[it.kind] || 0) + 1;
  console.log(`扫描 ${rowCount} 行，找到 ${images.length} 张图：${JSON.stringify(byKind)}`);
  const okRows = [...existing.values()].filter((r) => r.status === "ok");
  console.log(`已备份 ${okRows.length}（其中老格式 ${okRows.filter((r) => r.encoding !== ENCODING).length}），本次要处理 ${todo.length}`);
  if (DRY_RUN || !todo.length) return;

  sharp = (await import("sharp")).default;
  let ok = 0, failed = 0, kept = 0, origTotal = 0, webpTotal = 0;
  const reasons = {};
  // 已经有老格式备份的，重做失败不能把它标成 failed：前端还要靠那份老备份
  const fail = (it, err) => {
    if ((existing.get(it.key) || {}).status === "ok") { kept++; return null; }
    failed++;
    reasons[err] = (reasons[err] || 0) + 1;
    return { source_url: it.key, kind: it.kind, status: "failed", error: err,
      attempts: ((existing.get(it.key) || {}).attempts || 0) + 1, updated_at: new Date().toISOString() };
  };

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const rows = [];
    const ready = [];
    await Promise.all(batch.map(async (it) => {
      try { ready.push({ it, ...(await toWebp(it)) }); }
      catch (e) { rows.push(fail(it, shortErr(e))); }
    }));
    if (ready.length) {
      let results;
      try { results = await uploadBatch(ready); }
      catch (e) { results = ready.map(() => ({ error: shortErr(e) })); }
      await Promise.all(ready.map(async (f, j) => {
        const r = results[j];
        if (!r || !r.url) return rows.push(fail(f.it, (r && r.error) || "图床没返回链接"));
        if (!(await verify(r.url))) return rows.push(fail(f.it, "备份链接校验失败"));
        ok++; origTotal += f.origBytes; webpTotal += f.webp.length;
        rows.push({ source_url: f.it.key, backup_url: r.url, backup_key: r.key, kind: f.it.kind,
          orig_bytes: f.origBytes, backup_bytes: f.webp.length, status: "ok", error: null, encoding: ENCODING,
          attempts: ((existing.get(f.it.key) || {}).attempts || 0) + 1, updated_at: new Date().toISOString() });
      }));
    }
    await sbUpsert(rows.filter(Boolean));
    if ((i / BATCH) % 10 === 0) console.log(`进度 ${Math.min(i + BATCH, todo.length)}/${todo.length}（成功 ${ok}，失败 ${failed}）`);
    await sleep(PAUSE_MS);
  }

  const mb = (n) => (n / 1048576).toFixed(1) + "MB";
  console.log(`完成：成功 ${ok}，失败 ${failed}，重做没成功保留老备份 ${kept}；原图 ${mb(origTotal)} → WebP ${mb(webpTotal)}`);
  if (failed) console.log(`失败原因：${JSON.stringify(reasons)}`);
}

main().catch((e) => { console.error(shortErr(e)); process.exit(1); });

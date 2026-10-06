/* ============================================================
   导出中心

   顶栏「导出」打开的一整页。一次勾好要什么，打成一个 zip（只勾了一样、而且只出一个文件时直接下那个文件）：
     Excel 工作簿 (.xlsx)  交易 / 模型库页面 / 笔记 / 笔记里的交易 / 标签对比 / 复盘 / 说明，做统计用
     Markdown             模型库按 系统 → 策略 放文件夹，复盘按 模式 → 分组；另各有一份合在一起的，丢给 AI 一个文件就够
     网页报告 (.html)      双击打开，带目录，截图直接显示，能打印——发给别人看
     完整备份 (.json)      所有原始数据（两种模式的交易和复盘、模型库、字段和各种设置），以后做导入就靠它
     交易 CSV             老格式，当前模式、可选列

   ⚠ 几条要注意的：
   - **库里到处是 id**：字段键是 f_xxx、交易归属和标签存的是页面 id、正文里是 [[trade:…]] / [[page:…]]。
     给人看 / 给 AI 看的三种格式全部换成文字（exTradeText / exResolveMd），只有完整备份保留原样
   - **内存里只有当前模式那一批**交易和复盘，另一种模式要导出时现拉（exFetchMode）。模型库的成绩永远按实盘算，
     所以导模型库时实盘那批也一定要在手上
   - 模型库那些函数（pbStats、pbTradesOf、tradeRefHtml…）读的是全局 trades / reviews。导出时用 exWithData()
     临时换成要导出的那一批再换回来——中间没有 await，换回来之前不会有任何别的代码跑到
   - xlsx 和 zip 都是自己写的（不压缩的 zip + 最小的 SpreadsheetML），没有引第三方库：
     一个 xlsx 就是几份 XML 打成的 zip，引 1MB 的库只为了写这几份 XML 不值当
   - 截图只放链接，不把图片打进包里：图在 TradingView / FX Replay 上，跨域下载大多会被拦，打不全不如不打
   ============================================================ */

/* ---------- 状态 ---------- */
let exportCenterOpen = false;
let exportBusy = false;
let exportStatus = "";
let exportError = "";
const EX_FORMATS = ["xlsx", "md", "html", "json", "csv"];
let exportOpts = (function () {
  const def = { modes: { live: true, backtest: false }, fmt: { xlsx: true, md: true, html: true, json: true, csv: false } };
  try {
    const raw = JSON.parse(localStorage.getItem("journal_export_opts") || "null");
    if (raw && raw.fmt && raw.modes) {
      EX_FORMATS.forEach((k) => { if (typeof raw.fmt[k] === "boolean") def.fmt[k] = raw.fmt[k]; });
      ["live", "backtest"].forEach((k) => { if (typeof raw.modes[k] === "boolean") def.modes[k] = raw.modes[k]; });
    }
  } catch (e) {}
  return def;
})();
function saveExportOpts() { try { localStorage.setItem("journal_export_opts", JSON.stringify(exportOpts)); } catch (e) {} }

/* ============================================================
   底层：zip / xlsx / 文件名
   ============================================================ */
const EX_CRC_TABLE = (function () {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function exCrc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = EX_CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
let exEncoderInst = null;   // 用的时候才建：测试的 vm 沙箱里没有 TextEncoder，模块加载时不能碰它
function exEncode(str) { if (!exEncoderInst) exEncoderInst = new TextEncoder(); return exEncoderInst.encode(str); }
/* 不压缩的 zip（store）。文件名按 UTF-8 写并打上 0x0800 标记，中文文件名在 Windows / macOS 解压都不乱码 */
function exZip(files) {
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts = [], central = [];
  let offset = 0;
  files.forEach((f) => {
    const name = exEncode(f.name);
    const data = typeof f.data === "string" ? exEncode(f.data) : f.data;
    const crc = exCrc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  });
  const cdSize = central.reduce((s, b) => s + b.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: "application/zip" });
}

/* Excel 不认的控制字符（制表、换行、回车以外的 0x00–0x1F）会让整个文件打不开，先剥掉 */
function exXml(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function exColName(i) { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
/* 单元格：字符串、数字，或者 { v, s } 指定样式。样式下标见 EX_STYLES 里 cellXfs 的顺序 */
const EX_S = { text: 0, head: 1, wrap: 2, date: 3, time: 4, datetime: 5, pct: 6, num: 7 };
const EX_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm"/><numFmt numFmtId="166" formatCode="0.00"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFEBE1"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="20" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
</styleSheet>`;
function exCellXml(ref, cell) {
  if (cell === undefined || cell === null || cell === "") return "";
  const o = typeof cell === "object" ? cell : { v: cell };
  if (o.v === undefined || o.v === null || o.v === "") return "";
  if (typeof o.v === "number" && isFinite(o.v)) return `<c r="${ref}"${o.s ? ` s="${o.s}"` : ""}><v>${o.v}</v></c>`;
  let s = String(o.v);
  if (s.length > 32000) s = s.slice(0, 32000) + "…";   // Excel 单元格上限 32767 字
  return `<c r="${ref}" t="inlineStr"${o.s ? ` s="${o.s}"` : ""}><is><t xml:space="preserve">${exXml(s)}</t></is></c>`;
}
function exSheetXml(sheet) {
  const rows = sheet.rows;
  const cols = Math.max(1, ...rows.map((r) => r.length));
  const widths = sheet.widths || [];
  const colXml = Array.from({ length: cols }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${widths[i] || 14}" customWidth="1"/>`).join("");
  const body = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => exCellXml(exColName(ci) + (ri + 1), ri === 0 ? { v: c, s: EX_S.head } : c)).join("")}</row>`).join("");
  const last = exColName(cols - 1) + Math.max(rows.length, 1);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${colXml}</cols><sheetData>${body}</sheetData>${rows.length > 1 ? `<autoFilter ref="A1:${last}"/>` : ""}</worksheet>`;
}
function exSheetName(name, used) {
  const base = String(name).replace(/[\[\]:*?\/\\]/g, " ") || "Sheet";
  let n = base.slice(0, 31);
  let k = 2;
  while (used.has(n)) n = base.slice(0, 26) + " (" + k++ + ")";
  used.add(n);
  return n;
}
/* sheets: [{ name, rows: [[表头…], [单元格…]…], widths }]。第一行自动当表头（加粗、冻结、筛选） */
function exXlsx(sheets) {
  const used = new Set();
  const names = sheets.map((s) => exSheetName(s.name, used));
  const files = [
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${exXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets><definedNames>${sheets.map((s, i) => {
      if (s.rows.length < 2) return "";
      const cols = Math.max(1, ...s.rows.map((r) => r.length));
      return `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${exXml(names[i].replace(/'/g, "''"))}'!$A$1:$${exColName(cols - 1)}$${s.rows.length}</definedName>`;
    }).join("")}</definedNames></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", data: EX_STYLES },
  ];
  sheets.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: exSheetXml(s) }));
  return exZip(files);
}
/* Excel 的日期是「1899-12-30 起第几天」，时间是一天里的小数。这样存进去才能排序、透视、按月汇总 */
function exExcelDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  return m ? (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000 : null;
}
function exExcelTime(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || ""));
  return m ? (+m[1] * 60 + +m[2]) / 1440 : null;
}
function exExcelDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  // 用户本地时区的钟点：跟页面上看到的「创建日期」一致
  return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()) - Date.UTC(1899, 11, 30)) / 86400000;
}
function exNum(v) { const n = parseFloat(v); return v !== "" && v !== null && v !== undefined && isFinite(n) ? n : null; }
/* 文件名里不能有的字符换掉，太长的截短 */
function exFileName(s) {
  return String(s || "").replace(/[\/\\:*?"<>|\u0000-\u001F]/g, "_").replace(/\s+/g, " ").trim().slice(0, 80) || "untitled";
}
function exUniquePath(path, used) {
  let p = path, k = 2;
  const dot = path.lastIndexOf(".");
  while (used.has(p)) p = path.slice(0, dot) + " (" + k++ + ")" + path.slice(dot);
  used.add(p);
  return p;
}
function exDownloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ============================================================
   取数据
   ============================================================ */
async function exFetchMode(mode) {
  if (mode === recordMode) return { trades: trades.slice(), reviews: reviews.slice() };
  const uid = viewingUserId || session.user.id;
  const tr = await fetchAllRows(() => sb.from("trades").select("*", { count: "exact" })
    .eq("user_id", uid).eq("mode", mode).order("created_at", { ascending: true }).order("id", { ascending: true }));
  if (tr.error) throw tr.error;
  const rv = await fetchAllRows(() => sb.from("journal_reviews").select("*", { count: "exact" })
    .eq("user_id", uid).eq("mode", mode).order("created_at", { ascending: false }).order("id", { ascending: false }));
  if (rv.error) throw rv.error;
  return { trades: (tr.data || []).map(tradeFromRow), reviews: rv.data || [] };
}
/* 临时把全局 trades / reviews 换成别的一批跑 fn，跑完换回来。fn 必须是同步的 */
function exWithData(tradeList, reviewList, fn) {
  const t0 = trades, r0 = reviews;
  trades = tradeList; reviews = reviewList;
  try { return fn(); } finally { trades = t0; reviews = r0; }
}
function exModeLabel(m) { return m === "live" ? T("mode.live") : T("mode.backtest"); }
function exNeedsPlaybook() { return pbPages.length > 0 && (exportOpts.fmt.xlsx || exportOpts.fmt.md || exportOpts.fmt.html); }

/* 把这次要导出的东西都收齐：选中的模式各自的交易和复盘；完整备份要两种模式都有；导模型库要有实盘那批 */
async function exGather() {
  const want = new Set(["live", "backtest"].filter((m) => exportOpts.modes[m]));
  const need = new Set(want);
  if (exportOpts.fmt.json) { need.add("live"); need.add("backtest"); }
  if (exNeedsPlaybook()) need.add("live");
  const data = {};
  for (const m of ["live", "backtest"]) {
    if (!need.has(m)) continue;
    exportStatus = T("ex.status.fetching", { mode: exModeLabel(m) });
    renderExportCenter();
    data[m] = await exFetchMode(m);
  }
  // 当前模式下「只导出记录页筛出来的」：另一种模式没有筛选这回事，照全部
  const scopedTrades = (m) => {
    const list = data[m].trades;
    if (resolvedExportScope() === "datascope") return list.filter(tradeInScopeStrict);   // 数据范围两种模式都认
    if (m === recordMode && resolvedExportScope() === "filtered") {
      const keep = new Set(exportFilteredTrades().map((t) => t.id));
      return list.filter((t) => keep.has(t.id));
    }
    return list;
  };
  const exTrades = [], exReviews = [];
  ["live", "backtest"].forEach((m) => {
    if (!want.has(m)) return;
    pbSortTradesDesc(scopedTrades(m)).forEach((t) => exTrades.push({ t, mode: m }));
    sortReviewsForDisplay(data[m].reviews).forEach((r) => exReviews.push({ r, mode: m }));
  });
  // 交易 / 复盘按 id 查：两种模式都算上（复盘里引用的交易只会是同一模式的，但查表不用分）
  const tradeMap = new Map(), reviewMap = new Map();
  Object.keys(data).forEach((m) => {
    data[m].trades.forEach((t) => tradeMap.set(t.id, { t, mode: m }));
    data[m].reviews.forEach((r) => reviewMap.set(r.id, { r, mode: m }));
  });
  // 交易被哪些复盘引用（只算这次导出的复盘）
  const citedBy = new Map();
  exReviews.forEach(({ r }) => (r.linked_trade_ids || extractTradeRefs(r.body)).forEach((id) => {
    if (!citedBy.has(id)) citedBy.set(id, []);
    citedBy.get(id).push(reviewTitleOf(r));
  }));
  return {
    at: new Date(), want, data, exTrades, exReviews, tradeMap, reviewMap, citedBy,
    live: data.live ? data.live.trades : [],
    allReviews: Object.keys(data).reduce((a, m) => a.concat(data[m].reviews), []),
  };
}

/* ============================================================
   id → 文字
   ============================================================ */
function exTradeText(t) {
  const modelF = roleField("model"), resultF = roleField("result"), rF = roleField("r_multiple");
  const bits = [pbTradeDateOf(t) || "—"];
  const mv = modelF ? t[modelF.id] : "";
  if (mv && (!Array.isArray(mv) || mv.length)) bits.push(Array.isArray(mv) ? mv.join("/") : mv);
  if (resultF && t[resultF.id]) bits.push(t[resultF.id]);
  const r = rF ? exNum(t[rF.id]) : null;
  if (r !== null) bits.push((r >= 0 ? "+" : "") + r + "R");
  return bits.join(" · ");
}
function exShotUrl(t) { const s = pbShotOf(t); const u = s && mdSafeUrl(imgSrc(s)); return u || ""; }
function exDocName(ctx, id) {
  const p = pbFind(id);
  if (p) return pbIsPage(p) ? pbLabel(id) : pbTitle(p);
  const r = ctx.reviewMap.get(id);
  return r ? reviewTitleOf(r.r) : "";
}
/* 正文里的引用换成文字（给 Markdown / AI 看的版本）。交易带上截图链接，页面写名字，上色变加粗 */
function exResolveMd(ctx, body) {
  return String(body || "")
    .replace(/\[\[trade:([A-Za-z0-9_-]+)\]\]/g, (m, id) => {
      const e = ctx.tradeMap.get(id);
      if (!e) return "（" + T("review.tradeMissing") + "）";
      const txt = exTradeText(e.t).replace(/([\[\]])/g, "\\$1");
      const u = exShotUrl(e.t);
      return u ? "[" + txt + "](" + u.replace(/\)/g, "%29") + ")" : "「" + txt + "」";
    })
    .replace(/\[\[page:([A-Za-z0-9_-]+)\]\]/g, (m, id) => { const n = exDocName(ctx, id); return n ? "「" + n + "」" : "（" + T("pb.pageMissing") + "）"; })
    .replace(/\{(red|green|yellow|blue|gray|mark)\|([^}\n]+)\}/g, "**$2**");
}
/* 表格格子：| 会切格子、换行会断表；用户写的 < > 在 Markdown 查看器里会被当成 HTML 标签，一并转掉 */
function exMdCell(v) {
  return String(v === undefined || v === null ? "" : v).replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}
function exMdTable(head, rows) {
  if (!rows.length) return "";
  return "| " + head.map(exMdCell).join(" | ") + " |\n| " + head.map(() => "---").join(" | ") + " |\n"
    + rows.map((r) => "| " + r.map(exMdCell).join(" | ") + " |").join("\n");
}
function exStatsText(st) {
  if (!st.all) return T("pb.noTrades");
  const bits = [T("ex.stat.n", { n: st.all, k: st.n }), T("pb.stat.wr") + " " + fmtPct(st.wr)];
  if (st.hasR) bits.push(T("pb.stat.ev") + " " + fmtNum(st.ev) + "R", T("pb.stat.total") + " " + fmtNum(st.totalR) + "R");
  return bits.join(" · ");
}
function exValueText(t, f) {
  let v = tradeFieldValue(t, f);
  if (Array.isArray(v)) v = v.join("; ");
  return v === undefined || v === null ? "" : String(v);
}
/* 交易的模型库那几列（Excel / CSV / 报告共用一份） */
function exPbCols(t) {
  const p = pbFind(pbTradePageId(t));
  const sys = p ? (p.kind === "system" ? p : pbFind(p.parent_id)) : null;
  return {
    label: pbTradeLabel(t),
    system: sys ? pbTitle(sys) : "",
    strategy: p && p.kind === "strategy" ? pbTitle(p) : "",
    none: pbTradeIsNone(t),
    star: pbTradeStarred(t),
    tags: pbTradeTagLabels(t).join("; "),
    note: pbTradeNote(t),
    mistakes: pbNotesWithTrade(t.id, "mistake").map(pbTitle).join("; "),
    verify: pbNotesWithTrade(t.id, "verify").map(pbTitle).join("; "),
  };
}

/* ============================================================
   完整备份（原始数据，不做任何换算）
   ============================================================ */
function exBackupJson(ctx) {
  const rowOf = (t, mode) => {
    const data = { ...t };
    delete data.id; delete data._created_at; delete data._updated_at;
    return { id: t.id, mode, created_at: t._created_at || null, updated_at: t._updated_at || null, data };
  };
  return JSON.stringify({
    app: "IFVG Trade Journal", format: "full-backup", version: 1, exportedAt: ctx.at.toISOString(),
    user: { email: viewingUserId ? viewingUserEmail : (session && session.user.email), displayName: (currentProfile && currentProfile.display_name) || null },
    schema, cardFields, focusFields, analysisPrefs, reviewPrefs,
    trades: { live: (ctx.data.live ? ctx.data.live.trades : []).map((t) => rowOf(t, "live")), backtest: (ctx.data.backtest ? ctx.data.backtest.trades : []).map((t) => rowOf(t, "backtest")) },
    reviews: { live: ctx.data.live ? ctx.data.live.reviews : [], backtest: ctx.data.backtest ? ctx.data.backtest.reviews : [] },
    playbook: pbPages,
  }, null, 2);
}

/* ============================================================
   Excel 工作簿
   ============================================================ */
function exTradeCell(t, f) {
  const raw = tradeFieldValue(t, f);
  if (f.type === "date") { const d = exExcelDate(raw); if (d !== null) return { v: d, s: EX_S.date }; }
  if (f.type === "time") { const d = exExcelTime(raw); if (d !== null) return { v: d, s: EX_S.time }; }
  if (f.type === "number" || f.role === "r_multiple") { const n = exNum(raw); if (n !== null) return n; }
  if (Array.isArray(raw)) return raw.join("; ");
  return raw === undefined || raw === null ? "" : (f.type === "textarea" ? { v: String(raw), s: EX_S.wrap } : String(raw));
}
function exStatCells(st) {
  return [st.all, st.n, st.wr === null ? "" : { v: st.wr / 100, s: EX_S.pct },
    st.hasR && st.ev !== null ? { v: st.ev, s: EX_S.num } : "", st.hasR && st.totalR !== null ? { v: st.totalR, s: EX_S.num } : ""];
}
function exXlsxSheets(ctx) {
  const userFields = schema;   // 停用的字段也导：老数据里填过的值还在
  const H = (k) => T("ex.col." + k);
  const sheets = [];

  // 交易
  const tradeHead = [H("mode"), H("id")].concat(userFields.map((f) => f.label), [H("created"), H("updated"),
    H("pbLabel"), H("system"), H("strategy"), H("star"), H("tags"), H("note"), H("mistakes"), H("verify"), H("citedBy"), H("shotImg")]);
  const tradeRows = ctx.exTrades.map(({ t, mode }) => {
    const pb = exPbCols(t);
    return [exModeLabel(mode), t.id].concat(userFields.map((f) => exTradeCell(t, f)), [
      exExcelDateTime(t._created_at) !== null ? { v: exExcelDateTime(t._created_at), s: EX_S.datetime } : "",
      exExcelDateTime(t._updated_at || t._created_at) !== null ? { v: exExcelDateTime(t._updated_at || t._created_at), s: EX_S.datetime } : "",
      pb.none ? T("pb.none") : pb.label, pb.system, pb.strategy, pb.star ? "★" : "", pb.tags,
      pb.note ? { v: pb.note, s: EX_S.wrap } : "", pb.mistakes, pb.verify, (ctx.citedBy.get(t.id) || []).join("; "), exShotUrl(t)]);
  });
  sheets.push({ name: T("ex.sheet.trades"), rows: [tradeHead].concat(tradeRows),
    widths: [8, 16].concat(userFields.map((f) => (f.type === "textarea" ? 40 : f.type === "url" ? 30 : 13)), [17, 17, 24, 14, 14, 6, 22, 40, 22, 22, 22, 30]) });

  if (pbPages.length) {
    exWithData(ctx.live, ctx.allReviews, () => {
      // 模型库页面（系统 / 策略）
      const pageRows = [];
      pbAssignOptions().forEach((o) => {
        const p = pbFind(o.id);
        const list = pbTradesOf(p.id);
        const sys = p.kind === "strategy" ? pbFind(p.parent_id) : null;
        pageRows.push([T("pb.kind." + p.kind), pbTitle(p), sys ? pbTitle(sys) : ""].concat(exStatCells(pbStats(list)), [
          list.filter(pbTradeStarred).length, pbNotesOf(p.id, "mistake").length, pbNotesOf(p.id, "verify").length, pbNotesOf(p.id, "tag").length,
          list.filter((t) => pbTradeNote(t)).length, { v: exResolveMd(ctx, p.body), s: EX_S.wrap }]));
      });
      sheets.push({ name: T("ex.sheet.pages"), widths: [10, 20, 14, 8, 8, 9, 9, 9, 7, 7, 8, 7, 9, 60],
        rows: [[H("kind"), H("name"), H("system"), H("all"), H("taken"), H("wr"), H("ev"), H("totalR"), H("starred"), H("nMistakes"), H("nVerify"), H("nTags"), H("nNoted"), H("body")]].concat(pageRows) });

      // 笔记（错题 / 待验证）
      const notes = pbSortList(pbPages.filter(pbIsNote));
      const noteRows = notes.map((m) => {
        const o = pbNoteOwner(m);
        const list = pbNoteTrades(m);
        return [T("pb.kind." + m.kind), pbTitle(m), o ? pbLabel(o.id) : T(PB_GLOBAL_KEY[m.kind]),
          m.kind === "verify" ? T("pb.status." + pbVerifyStatus(m)) : ""].concat(exStatCells(pbStats(list)), [
          { v: exExcelDate(pbNoteLastDate(m)) || "", s: EX_S.date }, { v: pbMistakeGist(m), s: EX_S.wrap }, { v: exResolveMd(ctx, m.body), s: EX_S.wrap }]);
      });
      sheets.push({ name: T("ex.sheet.notes"), widths: [8, 22, 22, 10, 8, 8, 9, 9, 9, 12, 40, 60],
        rows: [[H("kind"), H("name"), H("owner"), H("status"), H("all"), H("taken"), H("wr"), H("ev"), H("totalR"), H("lastDate"), H("gist"), H("body")]].concat(noteRows) });

      // 笔记里的交易：一行 = 一条笔记 × 一笔交易，做透视表最方便
      const linkRows = [];
      notes.forEach((m) => pbNoteTrades(m).forEach((t) => {
        const rF = roleField("r_multiple"), resultF = roleField("result");
        const d = exExcelDate(pbTradeDateOf(t));
        linkRows.push([T("pb.kind." + m.kind), pbTitle(m), t.id, d !== null ? { v: d, s: EX_S.date } : pbTradeDateOf(t),
          pbTradeLabel(t), resultF ? t[resultF.id] || "" : "", rF ? exNum(t[rF.id]) : "", { v: pbMistakeLineNote(m.body, t.id), s: EX_S.wrap }, pbTradeNote(t)]);
      }));
      sheets.push({ name: T("ex.sheet.noteTrades"), widths: [8, 22, 16, 11, 22, 8, 7, 40, 40],
        rows: [[H("kind"), H("noteName"), H("id"), H("date"), H("pbLabel"), H("result"), H("r"), H("lineNote"), H("note")]].concat(linkRows) });

      // 标签对比
      const tagRows = pbSortList(pbTags()).map((g) => {
        const c = pbTagCompare(g);
        const dWr = c.with.wr !== null && c.without.wr !== null ? { v: (c.with.wr - c.without.wr) / 100, s: EX_S.pct } : "";
        const dEv = c.with.ev !== null && c.without.ev !== null && c.with.hasR ? { v: c.with.ev - c.without.ev, s: EX_S.num } : "";
        return [pbTitle(g), c.owner ? pbLabel(c.owner.id) : T("pb.globalTag")].concat(exStatCells(c.with), exStatCells(c.without), [dWr, dEv]);
      });
      if (tagRows.length) {
        sheets.push({ name: T("ex.sheet.tags"), widths: [18, 22, 8, 8, 9, 9, 9, 8, 8, 9, 9, 9, 10, 10],
          rows: [[H("name"), H("owner"), H("withAll"), H("withTaken"), H("withWr"), H("withEv"), H("withTotal"), H("woAll"), H("woTaken"), H("woWr"), H("woEv"), H("woTotal"), H("dWr"), H("dEv")]].concat(tagRows) });
      }
    });
  }

  // 复盘
  const groupName = (r) => { const g = findReviewGroup(r.group_id); return g ? g.name : T("reviewGroup.ungrouped"); };
  const revRows = ctx.exReviews.map(({ r, mode }) => [exModeLabel(mode), reviewTitleOf(r), reviewPeriodTagText(r), groupName(r),
    (r.linked_trade_ids || extractTradeRefs(r.body)).length,
    exExcelDateTime(r.created_at) !== null ? { v: exExcelDateTime(r.created_at), s: EX_S.datetime } : "",
    exExcelDateTime(r.updated_at) !== null ? { v: exExcelDateTime(r.updated_at), s: EX_S.datetime } : "",
    { v: exResolveMd(ctx, r.body), s: EX_S.wrap }]);
  sheets.push({ name: T("ex.sheet.reviews"), widths: [8, 26, 16, 14, 8, 17, 17, 80],
    rows: [[H("mode"), H("title"), H("period"), H("group"), H("nLinked"), H("created"), H("updated"), H("body")]].concat(revRows) });

  // 说明：给打开文件的人（和 AI）看每张表是什么
  sheets.push({ name: T("ex.sheet.readme"), widths: [24, 90], rows: [[H("item"), H("desc")]].concat(exReadmeRows(ctx)) });
  return sheets;
}
/* 模型库成绩口径写进说明：导出的胜率是按什么条件算的，打开文件的人（和 AI）要知道 */
function exScopeText() {
  return pbScopeActive() ? comboConditionsText({ conditions: pbScopeConditions() }) : T("pb.scope.none");
}
function exReadmeRows(ctx) {
  return [
    [T("ex.readme.at"), ctx.at.toLocaleString(localeTag())],
    [T("ex.readme.modes"), [...ctx.want].map(exModeLabel).join(" + ") + (resolvedExportScope() === "filtered" && ctx.want.has(recordMode) ? " · " + T("ex.readme.filtered") : "")],
    [T("ex.readme.counts"), T("ex.readme.countsVal", { t: ctx.exTrades.length, r: ctx.exReviews.length, p: pbPages.length })],
    [T("ex.sheet.trades"), T("ex.readme.trades")],
    [T("ex.sheet.pages"), T("ex.readme.pages")],
    [T("ex.sheet.notes"), T("ex.readme.notes")],
    [T("ex.sheet.noteTrades"), T("ex.readme.noteTrades")],
    [T("ex.sheet.tags"), T("ex.readme.tags")],
    [T("ex.sheet.reviews"), T("ex.readme.reviews")],
    [T("ex.readme.statsTitle"), T("ex.readme.stats")],
    [T("ex.readme.scope"), exScopeText()],
  ];
}

/* ============================================================
   Markdown
   ============================================================ */
function exTradeRowsMd(ctx, list, opts) {
  const o = opts || {};
  const head = [T("ex.col.date")].concat(o.showLabel ? [T("ex.col.pbLabel")] : [], [T("ex.col.model"), T("ex.col.result"), T("ex.col.r"), T("ex.col.star"), T("ex.col.tags")],
    o.lineNoteOf ? [T("ex.col.lineNote")] : [], [T("ex.col.note"), T("ex.col.shot")]);
  const modelF = roleField("model"), resultF = roleField("result"), rF = roleField("r_multiple");
  const rows = list.map((t) => {
    const mv = modelF ? t[modelF.id] : "";
    const u = exShotUrl(t);
    return [pbTradeDateOf(t)].concat(o.showLabel ? [pbTradeLabel(t)] : [], [Array.isArray(mv) ? mv.join("/") : mv || "",
      resultF ? t[resultF.id] || "" : "", rF ? t[rF.id] || "" : "", pbTradeStarred(t) ? "★" : "", pbTradeTagLabels(t).join("; ")],
      o.lineNoteOf ? [pbMistakeLineNote(o.lineNoteOf.body, t.id)] : [], [pbTradeNote(t), u ? `[${T("ex.col.shot")}](${u})` : ""]);
  });
  return exMdTable(head, rows);
}
function exPageMd(ctx, p) {
  const list = pbTradesOf(p.id);
  const sys = p.kind === "strategy" ? pbFind(p.parent_id) : null;
  const L = [`# ${pbTitle(p)}`, "",
    `- ${T("ex.col.kind")}：${T("pb.kind." + p.kind)}`];
  if (sys) L.push(`- ${T("ex.col.system")}：${pbTitle(sys)}`);
  L.push(`- ${T("ex.md.stats")}：${exStatsText(pbStats(list))}`);
  L.push(`- ${T("ex.md.counts", { s: list.filter(pbTradeStarred).length, m: pbNotesOf(p.id, "mistake").length, v: pbNotesOf(p.id, "verify").length, g: pbNotesOf(p.id, "tag").length })}`);
  L.push("", exResolveMd(ctx, p.body).trim());
  if (p.kind === "system") {
    const st = pbStrategiesOf(p.id);
    if (st.length) {
      L.push("", `## ${T("pb.section.strategies")}`, "", exMdTable([T("ex.col.name"), T("ex.md.stats")], st.map((s) => [pbTitle(s), exStatsText(pbStats(pbTradesOf(s.id)))])));
    }
  }
  ["mistake", "verify"].forEach((kind) => {
    const ns = pbNotesOf(p.id, kind);
    if (!ns.length) return;
    L.push("", `## ${T(kind === "mistake" ? "pb.section.mistakes" : "pb.section.verify")}`, "");
    ns.forEach((m) => L.push(`- **${pbTitle(m)}**${kind === "verify" ? `（${T("pb.status." + pbVerifyStatus(m))}）` : ""}：${pbMistakeGist(m) || "—"}（${T("ex.md.noteTrades", { n: pbNoteTrades(m).length })}）`));
  });
  const tags = pbNotesOf(p.id, "tag");
  if (tags.length) {
    L.push("", `## ${T("pb.section.tags")}`, "", exMdTable([T("ex.col.name"), T("pb.tag.with"), T("pb.tag.without")],
      tags.map((g) => { const c = pbTagCompare(g); return [pbTitle(g), exStatsText(c.with), exStatsText(c.without)]; })));
  }
  const starred = list.filter(pbTradeStarred);
  if (starred.length) L.push("", `## ${T("pb.section.starred")}（${starred.length}）`, "", exTradeRowsMd(ctx, starred, { showLabel: p.kind === "system" }));
  if (list.length) L.push("", `## ${T("pb.section.trades")}（${list.length}）`, "", exTradeRowsMd(ctx, list, { showLabel: p.kind === "system" }));
  return L.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}
function exNoteMd(ctx, m) {
  const o = pbNoteOwner(m);
  const list = pbNoteTrades(m);
  const L = [`# ${pbTitle(m)}`, "", `- ${T("ex.col.kind")}：${T("pb.kind." + m.kind)}`,
    `- ${T("ex.col.owner")}：${o ? pbLabel(o.id) : T(PB_GLOBAL_KEY[m.kind])}`];
  if (m.kind === "verify") L.push(`- ${T("ex.col.status")}：${T("pb.status." + pbVerifyStatus(m))}`);
  if (m.kind === "tag") {
    const c = pbTagCompare(m);
    L.push(`- ${T("pb.tag.with")}：${exStatsText(c.with)}`, `- ${T("pb.tag.without")}：${exStatsText(c.without)}`);
  } else {
    L.push(`- ${T("ex.md.stats")}：${exStatsText(pbStats(list))}`);
    const last = pbNoteLastDate(m);
    if (last) L.push(`- ${T("ex.col.lastDate")}：${last}`);
  }
  L.push("", exResolveMd(ctx, m.body).trim());
  const tl = m.kind === "tag" ? pbTagTrades(m) : list;
  if (tl.length) L.push("", `## ${T("ex.md.tradeList")}（${tl.length}）`, "", exTradeRowsMd(ctx, tl, { showLabel: true, lineNoteOf: m.kind === "tag" ? null : m }));
  return L.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}
function exReviewMd(ctx, r, mode) {
  const g = findReviewGroup(r.group_id);
  return [`# ${reviewTitleOf(r)}`, "",
    `- ${T("ex.col.mode")}：${exModeLabel(mode)}`,
    `- ${T("ex.col.period")}：${reviewPeriodTagText(r)}`,
    `- ${T("ex.col.group")}：${g ? g.name : T("reviewGroup.ungrouped")}`,
    `- ${T("ex.col.updated")}：${fmtReviewTime(r.updated_at || r.created_at)}`,
    "", exResolveMd(ctx, r.body).trim(), ""].join("\n");
}
/* 返回 [{ name, data }]：分文件夹的一份 + 合在一起的一份 */
function exMarkdownFiles(ctx) {
  const files = [], used = new Set();
  const all = [];
  if (pbPages.length) {
    exWithData(ctx.live, ctx.allReviews, () => {
      const root = T("ex.dir.playbook");
      const pageDir = (p) => {
        if (!p) return root + "/" + exFileName(T("ex.dir.general"));
        const sys = p.kind === "system" ? p : pbFind(p.parent_id);
        return root + "/" + exFileName(pbTitle(sys || p));
      };
      const push = (path, md) => { files.push({ name: exUniquePath(path, used), data: md }); all.push(md); };
      pbSystems().concat(pbOrphanStrategies()).forEach((s) => {
        push(pageDir(s) + "/" + exFileName(pbTitle(s)) + ".md", exPageMd(ctx, s));
        pbStrategiesOf(s.id).forEach((st) => push(pageDir(st) + "/" + exFileName(pbTitle(st)) + ".md", exPageMd(ctx, st)));
      });
      pbSortList(pbPages.filter(pbIsChild)).forEach((m) => {
        const o = pbNoteOwner(m);
        push(pageDir(o) + "/" + exFileName(T("pb.kind." + m.kind) + "-" + (o && o.kind === "strategy" ? pbTitle(o) + "-" : "") + pbTitle(m)) + ".md", exNoteMd(ctx, m));
      });
      files.push({ name: exFileName(T("ex.file.playbookAll")) + ".md", data: `# ${T("tab.playbook")}\n\n> ${T("ex.md.exportedAt", { at: ctx.at.toLocaleString(localeTag()) })}\n\n` + all.join("\n\n---\n\n") });
    });
  }
  if (ctx.exReviews.length) {
    const revAll = [];
    ctx.exReviews.forEach(({ r, mode }) => {
      const g = findReviewGroup(r.group_id);
      const day = r.day_date || r.week_start || (r.created_at || "").slice(0, 10);
      const md = exReviewMd(ctx, r, mode);
      files.push({ name: exUniquePath(`${T("ex.dir.reviews")}/${exFileName(exModeLabel(mode))}/${exFileName(g ? g.name : T("reviewGroup.ungrouped"))}/${exFileName((day ? day + " " : "") + reviewTitleOf(r))}.md`, used), data: md });
      revAll.push(md);
    });
    files.push({ name: exFileName(T("ex.file.reviewsAll")) + ".md", data: `# ${T("tab.reviews")}\n\n` + revAll.join("\n\n---\n\n") });
  }
  return files;
}

/* ============================================================
   网页报告：一个自带样式、不带脚本的 .html，双击就能开、能打印
   ============================================================ */
const EX_REPORT_CSS = `
:root{--bg:#F6F4EF;--surface:#fff;--surface2:#EFEBE1;--border:#E1DACB;--text:#211D16;--muted:#6C6558;--dim:#9B9385;--accent:#A87526;--accentSoft:rgba(168,117,38,.12);--pos:#2E8F5C;--neg:#B23A2C;--info:#2C6BD6;--note:#FBF2D5;--noteEdge:#E0C27A}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--text);font:14px/1.7 -apple-system,'PingFang SC','Microsoft YaHei','Segoe UI',sans-serif}
a{color:var(--info)}.mono{font-family:ui-monospace,'JetBrains Mono',Consolas,monospace}
.toc{position:fixed;top:0;left:0;bottom:0;width:250px;overflow:auto;padding:24px 18px;border-right:1px solid var(--border);background:var(--surface)}
.toc b{display:block;font-size:15px;margin-bottom:10px}.toc a{display:block;color:var(--muted);text-decoration:none;padding:3px 6px;border-radius:5px;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.toc a:hover{background:var(--surface2);color:var(--text)}.toc .l2{padding-left:18px;font-size:12.5px}.toc .l3{padding-left:30px;font-size:12px;color:var(--dim)}
main{margin-left:250px;padding:36px 48px 80px;max-width:1280px}
h1{font-size:28px;margin:0 0 6px}h2.sec{font-size:22px;margin:56px 0 16px;padding-bottom:8px;border-bottom:2px solid var(--text)}
.meta{color:var(--muted);font-size:13px}.stats{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 16px;min-width:150px}.stat .k{font-size:12px;color:var(--muted)}.stat .v{font-size:20px;font-weight:700}
.pos{color:var(--pos)}.neg{color:var(--neg)}
.page{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:22px 26px;margin:18px 0}
.page.system{border-left:4px solid var(--accent)}.page.strategy{border-left:4px solid var(--info);margin-left:28px}
.page h3{font-size:20px;margin:0 0 4px}.kind{display:inline-block;font-size:11px;padding:1px 8px;border-radius:9px;border:1px solid currentColor;margin-left:8px;vertical-align:3px}
.kind.system{color:var(--accent)}.kind.strategy{color:var(--info)}.kind.mistake{color:var(--neg)}.kind.verify{color:#7a5cc7}.kind.tag{color:var(--pos)}
.sub{font-size:13px;font-weight:700;color:var(--muted);margin:22px 0 10px;letter-spacing:.3px}
.body{margin-top:14px}.body h1,.body h2,.body h3{font-size:16px;margin:18px 0 6px}.body img{max-width:100%;max-height:520px;border-radius:8px;border:1px solid var(--border);display:block;margin:8px 0}
.body blockquote{margin:0 0 10px;padding:6px 12px;border-left:3px solid var(--accent);background:var(--accentSoft);color:var(--muted)}
.body table{border-collapse:collapse}.body td,.body th{border:1px solid var(--border);padding:4px 8px}.body pre{background:var(--surface2);padding:10px;border-radius:6px;overflow:auto}
.mdC-red{color:var(--neg)}.mdC-green{color:var(--pos)}.mdC-yellow{color:#B8860B}.mdC-blue{color:var(--info)}.mdC-gray{color:var(--dim)}.mdC-mark{background:#fff3a3}
.tradeRef,.pageRef{display:inline-flex;gap:6px;align-items:center;padding:0 8px;border-radius:10px;font-size:12px;border:1px solid var(--accent);background:var(--accentSoft);color:var(--accent)}
.tradeRef svg,.pageRef svg{display:none}.pageRef{border-color:var(--border);background:var(--surface2);color:var(--text)}.pageRefKind{font-size:10px;color:var(--muted)}.broken{border-color:var(--neg);color:var(--neg)}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.tile{border:1px solid var(--border);border-radius:9px;overflow:hidden;background:var(--surface)}.tile img{width:100%;aspect-ratio:16/10;object-fit:cover;display:block;background:var(--surface2)}
.tile .cap{padding:6px 9px;font-size:12px}.tile .nt{margin:0 9px 9px;padding:5px 8px;font-size:12px;background:var(--note);border-left:2px solid var(--noteEdge)}
.notes{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.note{background:var(--note);border:1px solid var(--noteEdge);border-top-width:4px;border-radius:4px 4px 10px 10px;padding:12px 14px}.note h4{margin:0 0 4px;font-size:15px}.note .body{margin-top:6px;font-size:13px}
table.t{border-collapse:collapse;width:100%;font-size:12.5px;background:var(--surface)}table.t th{position:sticky;top:0;background:var(--surface2);text-align:left;font-weight:600}
table.t td,table.t th{border-bottom:1px solid var(--border);padding:6px 8px;vertical-align:top}table.t img{width:96px;height:60px;object-fit:cover;border-radius:4px;border:1px solid var(--border)}
.tw{overflow-x:auto;border:1px solid var(--border);border-radius:10px}.small{font-size:12px;color:var(--muted)}
.review{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px 24px;margin:16px 0}.review h3{margin:0}
@media(max-width:900px){.toc{display:none}main{margin-left:0;padding:20px}}
@media print{.toc{display:none}main{margin:0;padding:0;max-width:none}h2.sec{page-break-before:always}.page,.review,.note,.tile{break-inside:avoid}body{background:#fff}}
`;
/* 报告里的 HTML 都出自 renderMarkdown（先转义再排版）和 esc()，跟页面上一样安全；
   只是把交互用的属性摘掉——报告里没有脚本，留着 onerror 只会在控制台报错 */
function exStaticHtml(html) {
  return String(html || "").replace(/\s(data-action|data-id|data-url|data-fallback-url|data-fallback-class)="[^"]*"/g, "")
    .replace(/\sonerror="[^"]*"/g, "");
}
function exImgTag(t, cls) {
  const u = exShotUrl(t);
  return u ? `<a href="${esc(u)}" target="_blank" rel="noopener"><img${cls ? ` class="${cls}"` : ""} src="${esc(u)}" loading="lazy" referrerpolicy="no-referrer" alt=""></a>` : "";
}
function exStatCardsHtml(st) {
  const tone = (v) => (v > 0.0001 ? "pos" : v < -0.0001 ? "neg" : "");
  return `<div class="stats">
    <div class="stat"><div class="k">${esc(T("ex.col.all"))}</div><div class="v mono">${st.all}</div></div>
    <div class="stat"><div class="k">${esc(T("ex.col.wr"))}</div><div class="v mono">${esc(fmtPct(st.wr))}</div></div>
    ${st.hasR ? `<div class="stat"><div class="k">${esc(T("ex.col.ev"))}</div><div class="v mono ${tone(st.ev)}">${esc(fmtNum(st.ev))}R</div></div>
    <div class="stat"><div class="k">${esc(T("ex.col.totalR"))}</div><div class="v mono ${tone(st.totalR)}">${esc(fmtNum(st.totalR))}R</div></div>
    <div class="stat"><div class="k">PF</div><div class="v mono">${esc(fmtPF(st.pf))}</div></div>` : ""}
  </div>`;
}
function exTileHtml(t, note) {
  return `<div class="tile">${exImgTag(t) || ""}<div class="cap mono"><a href="#t-${esc(t.id)}">${esc(exTradeText(t))}</a>${pbTradeStarred(t) ? " ★" : ""}</div>${note ? `<div class="nt">${esc(note)}</div>` : ""}</div>`;
}
function exNoteCardHtml(m) {
  const o = pbNoteOwner(m);
  const list = m.kind === "tag" ? pbTagTrades(m) : pbNoteTrades(m);
  let stat = m.kind === "tag"
    ? (() => { const c = pbTagCompare(m); return `${esc(T("pb.tag.with"))}：${esc(exStatsText(c.with))}<br>${esc(T("pb.tag.without"))}：${esc(exStatsText(c.without))}`; })()
    : esc(exStatsText(pbStats(list)));
  return `<div class="note" id="p-${esc(m.id)}"><h4>${esc(pbTitle(m))}<span class="kind ${m.kind}">${esc(T("pb.kind." + m.kind))}${m.kind === "verify" ? " · " + esc(T("pb.status." + pbVerifyStatus(m))) : ""}</span></h4>
    <div class="small">${esc(o ? pbLabel(o.id) : T(PB_GLOBAL_KEY[m.kind]))} · ${stat}</div>
    <div class="body">${exStaticHtml(renderMarkdown(m.body))}</div>
    ${list.length ? `<div class="small" style="margin-top:8px">${list.map((t) => `<a href="#t-${esc(t.id)}">${esc(exTradeText(t))}</a>${m.kind !== "tag" && pbMistakeLineNote(m.body, t.id) ? "：" + esc(pbMistakeLineNote(m.body, t.id)) : ""}`).join("<br>")}</div>` : ""}
  </div>`;
}
function exPageHtml(p) {
  const list = pbTradesOf(p.id);
  const starred = list.filter(pbTradeStarred);
  const own = (kind) => pbSortList(pbNotes(kind).filter((m) => m.parent_id === p.id));
  const notes = own("mistake").concat(own("verify"), own("tag"));
  return `<div class="page ${p.kind}" id="p-${esc(p.id)}">
    <h3>${esc(pbTitle(p))}<span class="kind ${p.kind}">${esc(T("pb.kind." + p.kind))}</span></h3>
    ${exStatCardsHtml(pbStats(list))}
    <div class="body">${exStaticHtml(renderMarkdown(p.body))}</div>
    ${starred.length ? `<div class="sub">${esc(T("pb.section.starred"))}（${starred.length}）</div><div class="gallery">${starred.map((t) => exTileHtml(t, pbTradeNote(t))).join("")}</div>` : ""}
    ${notes.length ? `<div class="sub">${esc(T("ex.report.notesHere"))}（${notes.length}）</div><div class="notes">${notes.map(exNoteCardHtml).join("")}</div>` : ""}
    ${list.length ? `<div class="sub">${esc(T("pb.section.trades"))}（${list.length}）</div><div class="tw"><table class="t"><thead><tr><th>${esc(T("ex.col.date"))}</th>${p.kind === "system" ? `<th>${esc(T("ex.col.strategy"))}</th>` : ""}<th>${esc(T("ex.col.tags"))}</th><th>${esc(T("ex.col.note"))}</th></tr></thead><tbody>
      ${list.map((t) => `<tr><td class="mono"><a href="#t-${esc(t.id)}">${esc(exTradeText(t))}</a>${pbTradeStarred(t) ? " ★" : ""}</td>${p.kind === "system" ? `<td>${esc(exPbCols(t).strategy)}</td>` : ""}<td>${esc(pbTradeTagLabels(t).join("; "))}</td><td>${esc(pbTradeNote(t))}</td></tr>`).join("")}
    </tbody></table></div>` : ""}
  </div>`;
}
function exReportHtml(ctx) {
  const name = (currentProfile && currentProfile.display_name) || (viewingUserId ? viewingUserEmail : session && session.user.email) || "";
  const toc = [`<b>IFVG · ${esc(T("ex.report.title"))}</b>`, `<a href="#overview">${esc(T("ex.report.overview"))}</a>`];
  let body = `<h1>${esc(T("ex.report.title"))}${name ? " · " + esc(name) : ""}</h1>
    <div class="meta">${esc(T("ex.md.exportedAt", { at: ctx.at.toLocaleString(localeTag()) }))} · ${esc([...ctx.want].map(exModeLabel).join(" + "))}</div>
    <section id="overview">`;
  [...ctx.want].forEach((m) => {
    const list = ctx.exTrades.filter((e) => e.mode === m).map((e) => e.t);
    body += `<div class="sub">${esc(exModeLabel(m))}</div>${exStatCardsHtml(pbStats(list))}`;
  });
  body += `</section>`;

  if (pbPages.length) {
    toc.push(`<a href="#playbook">${esc(T("tab.playbook"))}</a>`);
    body += `<h2 class="sec" id="playbook">${esc(T("tab.playbook"))}</h2>`;
    exWithData(ctx.live, ctx.allReviews, () => {
      pbSystems().concat(pbOrphanStrategies()).forEach((s) => {
        toc.push(`<a class="l2" href="#p-${esc(s.id)}">${esc(pbTitle(s))}</a>`);
        body += exPageHtml(s);
        pbStrategiesOf(s.id).forEach((st) => {
          toc.push(`<a class="l3" href="#p-${esc(st.id)}">${esc(pbTitle(st))}</a>`);
          body += exPageHtml(st);
        });
      });
      const globals = ["mistake", "verify", "tag"].reduce((a, k) => a.concat(pbGlobalNotes(k)), []);
      if (globals.length) {
        toc.push(`<a class="l2" href="#pb-general">${esc(T("ex.dir.general"))}</a>`);
        body += `<div class="page" id="pb-general"><h3>${esc(T("ex.dir.general"))}</h3><div class="notes" style="margin-top:12px">${globals.map(exNoteCardHtml).join("")}</div></div>`;
      }
    });
  }

  if (ctx.exTrades.length) {
    toc.push(`<a href="#trades">${esc(T("ex.report.trades"))}（${ctx.exTrades.length}）</a>`);
    const shotF = roleField("screenshot");
    const cols = schema.filter((f) => !shotF || f.id !== shotF.id);
    body += `<h2 class="sec" id="trades">${esc(T("ex.report.trades"))}（${ctx.exTrades.length}）</h2>
      <div class="tw"><table class="t"><thead><tr><th></th><th>${esc(T("ex.col.mode"))}</th>${cols.map((f) => `<th>${esc(f.label)}</th>`).join("")}
      <th>${esc(T("ex.col.pbLabel"))}</th><th>${esc(T("ex.col.tags"))}</th><th>${esc(T("ex.col.note"))}</th><th>${esc(T("ex.col.mistakes"))}</th><th>${esc(T("ex.col.verify"))}</th></tr></thead><tbody>
      ${ctx.exTrades.map(({ t, mode }) => { const pb = exPbCols(t); return `<tr id="t-${esc(t.id)}"><td>${exImgTag(t)}</td><td>${esc(exModeLabel(mode))}</td>${cols.map((f) => `<td>${esc(exValueText(t, f))}</td>`).join("")}
        <td>${esc(pb.none ? T("pb.none") : pb.label)}${pb.star ? " ★" : ""}</td><td>${esc(pb.tags)}</td><td>${esc(pb.note)}</td><td>${esc(pb.mistakes)}</td><td>${esc(pb.verify)}</td></tr>`; }).join("")}
      </tbody></table></div>`;
  }

  if (ctx.exReviews.length) {
    toc.push(`<a href="#reviews">${esc(T("tab.reviews"))}（${ctx.exReviews.length}）</a>`);
    body += `<h2 class="sec" id="reviews">${esc(T("tab.reviews"))}（${ctx.exReviews.length}）</h2>`;
    // 复盘里的交易胶囊要按复盘自己那个模式的交易查
    ctx.exReviews.forEach(({ r, mode }) => {
      const g = findReviewGroup(r.group_id);
      const html = exWithData(ctx.data[mode].trades, ctx.allReviews, () => exStaticHtml(renderMarkdown(r.body)));
      body += `<div class="review" id="r-${esc(r.id)}"><h3>${esc(reviewTitleOf(r))}</h3>
        <div class="small">${esc(exModeLabel(mode))} · ${esc(reviewPeriodTagText(r))} · ${esc(g ? g.name : T("reviewGroup.ungrouped"))} · ${esc(fmtReviewTime(r.updated_at || r.created_at))}</div>
        <div class="body">${html}</div></div>`;
    });
  }
  return `<!DOCTYPE html><html lang="${lang === "zh" ? "zh-CN" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(T("ex.report.title"))}${name ? " · " + esc(name) : ""} · ${esc(toDateStr(ctx.at))}</title><style>${EX_REPORT_CSS}</style></head>
<body><nav class="toc">${toc.join("")}</nav><main>${body}</main></body></html>`;
}

/* ============================================================
   跑一次导出
   ============================================================ */
function exReadmeMd(ctx, names) {
  return [`# ${T("ex.readme.title")}`, "", `- ${T("ex.readme.at")}：${ctx.at.toLocaleString(localeTag())}`,
    `- ${T("ex.readme.modes")}：${[...ctx.want].map(exModeLabel).join(" + ")}`,
    `- ${T("ex.readme.counts")}：${T("ex.readme.countsVal", { t: ctx.exTrades.length, r: ctx.exReviews.length, p: pbPages.length })}`, "",
    `## ${T("ex.readme.files")}`, "", ...names.map((n) => `- ${n}`), "", T("ex.readme.stats"), "", `- ${T("ex.readme.scope")}：${exScopeText()}`, ""].join("\n");
}
async function runExport() {
  if (exportBusy) return;
  if (!EX_FORMATS.some((k) => exportOpts.fmt[k])) return;
  exportBusy = true; exportError = ""; exportStatus = T("ex.status.start");
  renderExportCenter();
  try {
    const ctx = await exGather();
    exportStatus = T("ex.status.building");
    renderExportCenter();
    await new Promise((r) => setTimeout(r, 30));   // 让「正在生成」先画出来，下面是一大段同步计算
    const stamp = toDateStr(ctx.at);
    const out = [];   // [{ name, data: string | Blob }]
    if (exportOpts.fmt.xlsx) out.push({ name: `${T("ex.file.xlsx")}-${stamp}.xlsx`, data: exXlsx(exXlsxSheets(ctx)) });
    if (exportOpts.fmt.html) out.push({ name: `${T("ex.file.report")}-${stamp}.html`, data: exReportHtml(ctx) });
    if (exportOpts.fmt.csv) out.push({ name: `${T("ex.file.csv")}-${stamp}.csv`, data: "﻿" + toCSV(exportTradeList(), exportFieldList()) });
    if (exportOpts.fmt.json) out.push({ name: `${T("ex.file.backup")}-${stamp}.json`, data: exBackupJson(ctx) });
    const mdFiles = exportOpts.fmt.md ? exMarkdownFiles(ctx) : [];
    if (out.length === 1 && !mdFiles.length) {
      const f = out[0];
      const mime = { json: "application/json", html: "text/html", csv: "text/csv" }[f.name.split(".").pop()] || "text/plain";
      exDownloadBlob(f.name, f.data instanceof Blob ? f.data : new Blob([f.data], { type: mime + ";charset=utf-8" }));
    } else {
      const files = [];
      for (const f of out) files.push({ name: f.name, data: f.data instanceof Blob ? new Uint8Array(await f.data.arrayBuffer()) : f.data });
      mdFiles.forEach((f) => files.push(f));
      const topNames = out.map((f) => f.name).concat(mdFiles.length ? [T("ex.dir.playbook") + "/", T("ex.dir.reviews") + "/"] : []);
      files.unshift({ name: T("ex.file.readme") + ".md", data: exReadmeMd(ctx, topNames) });
      exDownloadBlob(`IFVG-${T("ex.file.zip")}-${stamp}.zip`, exZip(files));
    }
    exportStatus = T("ex.status.done");
  } catch (err) {
    console.error(err);
    exportError = T("ex.status.failed", { msg: (err && err.message) || String(err) });
    exportStatus = "";
  } finally {
    exportBusy = false;
    renderExportCenter();
  }
}

/* ============================================================
   界面
   ============================================================ */
function exFmtCardHtml(key, badgeKey) {
  const on = !!exportOpts.fmt[key];
  return `<button type="button" class="exFmt${on ? " on" : ""}" data-action="ex-toggle-fmt" data-fmt="${key}">
    <span class="exCheck">${on ? ICONS.check : ""}</span>
    <span class="exFmtMain">
      <span class="exFmtTitle">${esc(T("ex.fmt." + key))}<span class="exFmtBadge">${esc(T(badgeKey))}</span></span>
      <span class="exFmtDesc">${esc(T("ex.fmt." + key + "Desc"))}</span>
    </span>
  </button>`;
}
function exCsvColumnsHtml() {
  if (!exportOpts.fmt.csv) return "";
  return `<div class="exCsvCols">
    <div class="exSubLabel">${esc(T("export.columns"))}</div>
    <div class="chipGroup">
      <button type="button" class="chip ${exportColumns === "all" ? "active" : ""}" data-action="set-export-columns" data-value="all">${T("export.columnsAll")}</button>
      <button type="button" class="chip ${exportColumns === "selected" ? "active" : ""}" data-action="set-export-columns" data-value="selected">${T("export.columnsSelected")}</button>
    </div>
    ${exportColumns === "selected" ? `<div id="exportFieldsScroll" class="chipGroup" style="max-height:180px;overflow-y:auto;">
      ${exportAllFields().map((f) => `<button type="button" class="chip ${exportSelectedFields.includes(f.id) ? "active" : ""}" data-action="toggle-export-field" data-id="${esc(f.id)}">${esc(f.label)}</button>`).join("")}
    </div>
    <div style="display:flex;gap:10px;">
      <button type="button" class="tinyBtn" data-action="export-fields-select-all">${T("export.selectAll")}</button>
      <button type="button" class="tinyBtn" data-action="export-fields-clear">${T("export.clearAll")}</button>
    </div>` : ""}
  </div>`;
}
function exportCenterHtml() {
  const filtered = exportHasActiveFilters();
  const scope = resolvedExportScope();
  const anyFmt = EX_FORMATS.some((k) => exportOpts.fmt[k]);
  const anyMode = exportOpts.modes.live || exportOpts.modes.backtest;
  const needMode = exportOpts.fmt.xlsx || exportOpts.fmt.md || exportOpts.fmt.html;
  const blocked = !anyFmt || (needMode && !anyMode && !exportOpts.fmt.json) || (exportOpts.fmt.csv && exportColumns === "selected" && !exportSelectedFields.length);
  const modeBtn = (m) => `<button type="button" class="chip ${exportOpts.modes[m] ? "active" : ""}" data-action="ex-toggle-mode" data-mode="${m}">${esc(exModeLabel(m))}${m === recordMode ? ` <span class="exNow">${esc(T("ex.current"))}</span>` : ""}</button>`;
  return `<div class="exOverlay" id="exScroller">
    <div class="reviewTopBar">
      <div class="reviewCrumbs"><span class="reviewCrumbTitle">${esc(T("ex.title"))}</span></div>
      <div class="reviewTopRight"><button class="iconBtn" data-action="close-export-center" title="${esc(T("common.close"))}">${ICONS.x}</button></div>
    </div>
    <div class="exPage">
      <h1 class="display exH1">${esc(T("ex.title"))}</h1>
      <p class="exLead">${esc(T("ex.lead"))}</p>

      <div class="exBlock">
        <div class="exBlockTitle">${esc(T("ex.scope"))}</div>
        <div class="exRow"><span class="exRowLabel">${esc(T("ex.modes"))}</span><div class="chipGroup">${modeBtn("live")}${modeBtn("backtest")}</div></div>
        <div class="exRow"><span class="exRowLabel">${esc(T("ex.tradesRange", { mode: exModeLabel(recordMode) }))}</span>
          <div class="chipGroup">
            <button type="button" class="chip ${scope === "all" ? "active" : ""}" data-action="set-export-scope" data-value="all">${T("export.scopeAll", { n: trades.length })}</button>
            ${dataScopeActive() ? `<button type="button" class="chip ${scope === "datascope" ? "active" : ""}" data-action="set-export-scope" data-value="datascope">${T("export.scopeData", { n: trades.filter(tradeInScopeStrict).length })}</button>` : ""}
            <button type="button" class="chip ${scope === "filtered" ? "active" : ""}" data-action="set-export-scope" data-value="filtered" ${filtered ? "" : "disabled"}>${T("export.scopeFiltered", { n: exportFilteredTrades().length })}</button>
          </div></div>
        <div class="exHint">${esc(T("ex.scopeHint"))}</div>
      </div>

      <div class="exBlock">
        <div class="exBlockTitle">${esc(T("ex.formats"))}</div>
        <div class="exFmts">
          ${exFmtCardHtml("xlsx", "ex.for.excel")}
          ${exFmtCardHtml("md", "ex.for.ai")}
          ${exFmtCardHtml("html", "ex.for.share")}
          ${exFmtCardHtml("json", "ex.for.backup")}
          ${exFmtCardHtml("csv", "ex.for.quick")}
        </div>
        ${exCsvColumnsHtml()}
      </div>

      <div class="exFoot">
        <div class="exFootText">
          ${exportError ? `<span class="exErr">${ICONS.alert} ${esc(exportError)}</span>`
            : exportStatus ? `<span class="${exportBusy ? "exBusy" : "exDone"}">${exportBusy ? "" : ICONS.check + " "}${esc(exportStatus)}</span>`
            : `<span>${esc(T("ex.footHint"))}</span>`}
        </div>
        <button class="btn btn-primary exGo" data-action="ex-run" ${blocked || exportBusy ? "disabled" : ""}>${ICONS.download} ${esc(exportBusy ? T("ex.running") : T("ex.go"))}</button>
      </div>
    </div>
  </div>`;
}
/* 自己一个根节点（盖在复盘编辑器 90 之上、弹窗 100 之下）。里面没有输入框，整块重画不会丢东西，只要把滚动位置搬过去 */
function renderExportCenter() {
  let root = document.getElementById("exportRoot");
  if (!root) {
    if (!exportCenterOpen) return;
    root = document.createElement("div");
    root.id = "exportRoot";
    document.body.appendChild(root);
  }
  if (!exportCenterOpen) { root.innerHTML = ""; return; }
  const prev = document.getElementById("exScroller");
  const top = prev ? prev.scrollTop : 0;
  root.innerHTML = exportCenterHtml();
  const next = document.getElementById("exScroller");
  if (next) next.scrollTop = top;
}

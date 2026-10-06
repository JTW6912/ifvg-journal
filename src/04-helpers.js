/* ============================================================
   HELPERS
   ============================================================ */
function uid() { return "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function newFieldId() { return "f_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function esc(s) {
  if (s === undefined || s === null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function roleField(role) { return schema.find((f) => f.role === role); }
function fmtPct(n) { return n === null || n === undefined || isNaN(n) ? "—" : n.toFixed(1) + "%"; }
function fmtNum(n, d) { d = d || 2; return n === null || n === undefined || isNaN(n) ? "—" : (n >= 0 ? "+" : "") + n.toFixed(d); }
function csvEscape(val) {
  if (val === undefined || val === null) val = "";
  if (Array.isArray(val)) val = val.join("; ");
  val = String(val);
  if (/[",\n]/.test(val)) val = '"' + val.replace(/"/g, '""') + '"';
  return val;
}
function toCSV(list, fields) {
  const rows = list || trades;
  const cols = fields || exportAllFields();
  const headers = cols.map((f) => f.label);
  const lines = [headers.map(csvEscape).join(",")];
  rows.forEach((t) => lines.push(cols.map((f) => csvEscape(tradeFieldValue(t, f))).join(",")));
  return lines.join("\n");
}
// Records 页筛选条件/搜索是全局状态，导出面板不管当前在哪个 tab 都能拿来复用
function exportHasActiveFilters() {
  // 只看真的在筛东西的条件：记录页默认摆着两行没选值的筛选，按「有字段」算的话导出会默认成「筛选结果」，其实就是全部
  return activeFilters.some(filterNodeIsEffective) || searchQuery.trim() !== "";
}
function exportFilteredTrades() {
  return scopedTrades().filter((t) => tradeMatchesFilters(t, activeFilters) && tradeMatchesSearch(t, searchQuery));
}
/* 导出范围：all 全部 / datascope 数据范围内（两种模式都按这个范围筛）/ filtered 记录页筛出来的（已经含数据范围） */
function resolvedExportScope() {
  if (exportScope === "datascope" && !dataScopeActive()) return "all";
  return exportScope || (exportHasActiveFilters() ? "filtered" : dataScopeActive() ? "datascope" : "all");
}
function exportTradeList() {
  const s = resolvedExportScope();
  return s === "filtered" ? exportFilteredTrades() : s === "datascope" ? trades.filter(tradeInScopeStrict) : trades;
}
// 导出的候选列 = 用户字段 + 创建/修改日期。虚拟字段排在最后，跟表格视图保持一致的顺序
function exportAllFields() {
  return schema.concat(virtualFields());
}
function exportFieldList() {
  const all = exportAllFields();
  return exportColumns === "selected" ? all.filter((f) => exportSelectedFields.includes(f.id)) : all;
}
function downloadFile(filename, content, mime) {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
/* ============================================================
   结果口径 —— 一个 result 值到底算赢还是算输
   胜率、日历的绿/红、拆解里的 W/L 全都只看 result 这一个字段，所以判定集中在这里。
   别处一律走 resultBucket()，不要再写 t[resultF.id] === "W" 这种散落的字面量比较——
   以前就是散着写的，用户往选项里加一个新值，得改十几处才认得出来。

   partial = 没走到 full TP，但吃满了预设的那个固定 R。账面上它就是一笔赢单，
   所以跟 W 放同一个桶：算进胜率的分子，颜色走 --pos。
   ⚠ 日历格子的绿/红另说——那是按当天 R 总和定的，跟这里的赢/输桶无关。
   partial 的 +1R 自然会把当天总和顶上去，但赢一笔亏一笔刚好打平的日子仍然是灰色。

   BE 三兄弟各占一桶，别并进 win：SQ 的口径是 (w + bew) / (w + l + bew + bel)，
   "保本后转赢"在那条公式里是单独一项，混进 win 会被重复数一次。

   比较前统一 trim + 转小写，用户在设置页写成 "Partial"、"PARTIAL"、"be -> w" 都认。
   ============================================================ */
const RESULT_BUCKETS = {
  "w": "win", "partial": "win",
  "l": "loss",
  "be": "be", "be -> w": "bewin", "be -> l": "beloss",
};
function resultBucket(v) {
  return RESULT_BUCKETS[String(v === undefined || v === null ? "" : v).trim().toLowerCase()] || "other";
}
function isWinResult(v) { return resultBucket(v) === "win"; }
function isLossResult(v) { return resultBucket(v) === "loss"; }
// 三种 BE 都算"碰过保本"，拆解卡那列 be 用它
function isAnyBEResult(v) { const b = resultBucket(v); return b === "be" || b === "bewin" || b === "beloss"; }
function resultColor(v) {
  const b = resultBucket(v);
  if (b === "win" || b === "bewin") return "var(--pos)";
  if (b === "loss" || b === "beloss") return "var(--neg)";
  return "var(--muted)";
}

/* ============================================================
   虚拟字段 —— 创建日期 / 修改日期
   这两个不是用户自己定义的字段，不在 schema 里、不落 trades.data、交易弹窗里也不出现；
   它们是 trades 表本来就有的 created_at / updated_at 列，loadAll() 已经映射成 t._created_at /
   t._updated_at 挂在每笔交易上（见 loadAll）。这里把它们包装成「长得像 date 字段」的对象，
   于是筛选行、组合条件、卡片额外字段、CSV 导出这些地方全都能免费复用现成的那套代码。

   ⚠ 两条铁律：
   1. 任何按 id 找字段的地方都要走 resolveField()，不能再直接 schema.find()——
      漏一处的后果是：组合里存了创建日期条件，comboIssues() 会把它当成「字段已删除」标红并禁掉统计。
   2. 任何取字段值的地方都要走 tradeFieldValue()，不能直接 t[field.id]——
      _created_at 是完整的 UTC ISO（2026-09-06T20:14:33.921Z），必须先折成用户本地时区的自然日
      才能跟筛选框里的 YYYY-MM-DD 比。直接比会同时错两处：
      (a) "2026-09-06T20:14..." > "2026-09-06" 恒真，结束日期选当天会把当天的单全部排除；
      (b) 北京时间晚上 8 点以后录的单，UTC 已经是第二天，会整整错开一天。
   ============================================================ */
const VF_CREATED = "__created_at";
const VF_UPDATED = "__updated_at";
/* 第三个虚拟字段：模型库归属（「RIFVG › 趋势延续」）。值存在交易的 __pb 上（见 11b-playbook-data），
   包装成一个 select 字段之后，筛选、组合、拆解、卡片额外字段、导出都能直接按策略来。
   选项就是当前的页面名字——改了页面名字，存着旧名字的筛选条件会照常被标红（跟删掉一个选项一样） */
const VF_PLAYBOOK = "__playbook";
function playbookVirtualField() {
  return { id: VF_PLAYBOOK, label: T("vfield.playbook"), type: "select", role: "", virtual: true,
    options: pbAssignOptions().map((o) => o.full) };
}
/* 第四个：模型库标签（多选，「Mech · 有 SMT」）。值在交易的 __pb_tags 上。
   做成虚拟字段之后，筛选、拆解、组合都能拿「有没有这个标签」切 */
const VF_PB_TAGS = "__pb_tags_vf";
function pbTagsVirtualField() {
  return { id: VF_PB_TAGS, label: T("vfield.pbTags"), type: "multiselect", role: "", virtual: true,
    options: pbSortList(pbTags()).map(pbTagLabel) };
}
/* 第五个：归类记录（长文本，值在交易的 __pb_note 上）。筛选里按「包含」找、卡片 / 看图 / 表格 / 导出都能挂出来 */
const VF_PB_NOTE = "__pb_note_vf";
function pbNoteVirtualField() {
  return { id: VF_PB_NOTE, label: T("vfield.pbNote"), type: "textarea", role: "", virtual: true };
}
// 没建过模型库页面的用户不该多出一个永远是空的列 / 筛选字段
function virtualFields() {
  const out = [
    { id: VF_CREATED, label: T("vfield.created"), type: "date", role: "", virtual: true },
    { id: VF_UPDATED, label: T("vfield.updated"), type: "date", role: "", virtual: true },
  ];
  if (pbHasPages()) out.push(playbookVirtualField(), pbNoteVirtualField());
  if (pbTags().length) out.push(pbTagsVirtualField());
  return out;
}
function isVirtualFieldId(id) { return id === VF_CREATED || id === VF_UPDATED || id === VF_PLAYBOOK || id === VF_PB_TAGS || id === VF_PB_NOTE; }
// 按 id 找字段：先虚拟字段，再用户自己的 schema。找不到返回 null（调用方按"字段已删除"处理）
function resolveField(id) {
  if (id === VF_PLAYBOOK) return playbookVirtualField();   // 页面全删光了也认得：存着它的条件不该被当成「字段已删除」
  if (id === VF_PB_TAGS) return pbTagsVirtualField();
  if (id === VF_PB_NOTE) return pbNoteVirtualField();
  if (isVirtualFieldId(id)) return virtualFields().find((f) => f.id === id) || null;
  return schema.find((x) => x.id === id) || null;
}
// UTC ISO 时间戳 → 用户本地时区的自然日 YYYY-MM-DD。所以「9月6号」指的永远是用户那边的 9月6号
function localDateStr(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : toDateStr(d);
}
// 一笔交易在某个字段上的值。虚拟字段从 _created_at/_updated_at 折出本地自然日，其余原样取
function tradeFieldValue(t, field) {
  if (!field) return undefined;
  if (field.id === VF_CREATED) return localDateStr(t._created_at);
  // 没被改过的老数据 updated_at 可能是空的，回落到创建时间，免得筛「修改日期」时整批凭空消失
  if (field.id === VF_UPDATED) return localDateStr(t._updated_at || t._created_at);
  if (field.id === VF_PLAYBOOK) return pbTradeLabel(t);
  if (field.id === VF_PB_TAGS) return pbTradeTagLabels(t);
  if (field.id === VF_PB_NOTE) return pbTradeNote(t);
  return t[field.id];
}

/* ============================================================
   字段停用（hidden）

   字段上多一个 `hidden: true`，含义是「这个字段不再录了」——录入表单里不出现，
   新交易在这个字段上一律留空。**不是删除**：schema 里那一行还在，trades.data 里
   老数据一个字节都不动，拆解 / 组合 / 筛选 / 导出全都照旧认这个字段。

   为什么要有它：一套字段用久了总会有几个被证明没信息量（拆解出来胜率跟大盘没差），
   继续每笔都填是纯成本；但删掉列的话，当初「已确认无效」的证据本身也一起没了，
   以后想复核那张拆解表就再也复核不了。停用是可逆的，删除不是——所以默认走停用。

   一句话边界：hidden 只影响**写**（录入表单），不影响**读**（任何统计和展示）。
   ============================================================ */
// 录入表单用这份；统计那边一律还是用完整的 schema
function activeSchema() { return schema.filter((f) => !f.hidden); }
// 停用这几个角色会让统计直接失真（日期/结果/R 是所有胜率、PF、回撤的分母），单独确认一次
const CORE_ROLES = ["date", "result", "r_multiple"];
// 一笔交易在某字段上到底有没有填过东西——决定编辑老交易时要不要把停用字段翻出来
function hasFieldValue(t, f) {
  const v = t ? t[f.id] : undefined;
  if (Array.isArray(v)) return v.length > 0;
  return v !== undefined && v !== null && String(v).trim() !== "";
}


/* ============================================================
   外观：布局 × 配色 × 日/夜，三条独立的轴，存在本机 localStorage
   - 布局 classic = 原来的顶部页签（不挂属性）；modern = 侧边栏新版（theme-modern.css，挂 data-layout="modern"）。
     从没选过的人默认新版；选过经典的人存了 "classic"，一直按经典来
   - 配色 gold = 原来的黑金（不挂属性）；其余见 palettes.css（挂 data-palette）
   index.html 头部有一段内联脚本在首帧前就按同样的规则挂好，避免先闪一下默认样式
   ============================================================ */
const LAYOUTS = ["classic", "modern"];
const PALETTES = ["gold", "sky", "violet", "rose", "sunset", "ocean", "graphite"];
function currentLayout() { return document.documentElement.dataset.layout || "classic"; }
function currentPalette() { return document.documentElement.dataset.palette || "gold"; }
function applyLayout(v) {
  if (v && v !== "classic" && LAYOUTS.includes(v)) document.documentElement.dataset.layout = v;
  else delete document.documentElement.dataset.layout;
}
function applyPalette(v) {
  if (v && v !== "gold" && PALETTES.includes(v)) document.documentElement.dataset.palette = v;
  else delete document.documentElement.dataset.palette;
}
function loadAppearance() {
  try {
    // 早期试做时存过一个 journal_skin=sky（= 新版布局 + 晴空蓝），读到就换成新的两个键
    if (localStorage.getItem("journal_skin") === "sky" && !localStorage.getItem("journal_layout")) {
      localStorage.setItem("journal_layout", "modern");
      localStorage.setItem("journal_palette", "sky");
    }
    localStorage.removeItem("journal_skin");
    // 从没选过布局（本机没存）= 新版；手动切回经典会存下 "classic"，之后一直按经典来
    applyLayout(localStorage.getItem("journal_layout") || "modern");
    applyPalette(localStorage.getItem("journal_palette"));
  } catch (e) {}
}
/* ---------- 外观绑账号（profiles.ui_prefs，跟界面语言 profiles.lang 同一个套路） ----------
   登录后账号里存过就以账号为准（换设备 / 换浏览器也一致），没存过就把本机当前的选择补写上去。
   本机 localStorage 那份始终同步一份：首帧前的内联脚本只能读它，避免先闪一下默认样式 */
function currentTheme() { return document.documentElement.dataset.theme === "light" ? "light" : "dark"; }
function currentAppearance() { return { layout: currentLayout(), palette: currentPalette(), theme: currentTheme() }; }
function applyAppearance(p) {
  if (!p || typeof p !== "object") return;
  if (p.layout) applyLayout(p.layout);
  if (p.palette) applyPalette(p.palette);
  if (p.theme === "light") document.documentElement.dataset.theme = "light";
  else if (p.theme === "dark") delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem("journal_layout", currentLayout());
    localStorage.setItem("journal_palette", currentPalette());
    localStorage.setItem("journal_theme", currentTheme());
  } catch (e) {}
}
// 连着点几种配色比较时只写最后那一次
let appearanceSaveTimer = null;
function persistAppearance() {
  clearTimeout(appearanceSaveTimer);
  appearanceSaveTimer = setTimeout(async () => {
    if (!sb || !session) return;
    const prefs = currentAppearance();
    try {
      const { error } = await sb.rpc("update_own_ui_prefs", { new_prefs: prefs });
      if (error) console.warn("外观没能同步到账号（数据库可能还没跑 update_own_ui_prefs 迁移）:", error.message);
      else if (currentProfile) currentProfile.ui_prefs = prefs;
    } catch (e) { console.warn(e); }
  }, 500);
}
function syncAppearanceFromProfile() {
  if (!currentProfile) return;
  const p = currentProfile.ui_prefs;
  if (p && typeof p === "object" && (p.layout || p.palette || p.theme)) applyAppearance(p);
  else persistAppearance();
}

// 新版布局页面大标题上方那行问候（按本地时间分早/午/晚/深夜）
function greetingText(name) {
  const hr = new Date().getHours();
  const key = hr < 5 ? "greet.night" : hr < 11 ? "greet.morning" : hr < 13 ? "greet.noon" : hr < 18 ? "greet.afternoon" : hr < 23 ? "greet.evening" : "greet.night";
  return name ? T(key + "Name", { name }) : T(key);
}

// 侧边栏底部那条迷你资金曲线：口径跟上面那几个数字一样（当前模式、只算 Taken），纯装饰，不参与任何统计
function navSparkHtml() {
  const takenF = roleField("taken"), rF = roleField("r_multiple");
  if (!rF) return "";
  const base = scopedTrades();
  const list = takenF ? base.filter((t) => t[takenF.id] === "Taken") : base;
  const vals = [0, ...equityCurve(list, rF).map((p) => p.eq)];
  if (vals.length < 3) return "";
  const W = 200, H = 34;
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * W).toFixed(1)},${(H - 2 - ((v - lo) / span) * (H - 4)).toFixed(1)}`).join(" ");
  const tone = vals[vals.length - 1] >= 0 ? "pos" : "neg";
  return `<svg class="navSpark ${tone}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" vector-effect="non-scaling-stroke"/></svg>`;
}

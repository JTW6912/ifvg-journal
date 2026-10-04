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
  return activeFilters.some((f) => f.fieldId) || searchQuery.trim() !== "";
}
function exportFilteredTrades() {
  return trades.filter((t) => tradeMatchesFilters(t, activeFilters) && tradeMatchesSearch(t, searchQuery));
}
function resolvedExportScope() {
  return exportScope || (exportHasActiveFilters() ? "filtered" : "all");
}
function exportTradeList() {
  return resolvedExportScope() === "filtered" ? exportFilteredTrades() : trades;
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
// 没建过模型库页面的用户不该多出一个永远是空的列 / 筛选字段
function virtualFields() {
  const out = [
    { id: VF_CREATED, label: T("vfield.created"), type: "date", role: "", virtual: true },
    { id: VF_UPDATED, label: T("vfield.updated"), type: "date", role: "", virtual: true },
  ];
  if (pbHasPages()) out.push(playbookVirtualField());
  if (pbTags().length) out.push(pbTagsVirtualField());
  return out;
}
function isVirtualFieldId(id) { return id === VF_CREATED || id === VF_UPDATED || id === VF_PLAYBOOK || id === VF_PB_TAGS; }
// 按 id 找字段：先虚拟字段，再用户自己的 schema。找不到返回 null（调用方按"字段已删除"处理）
function resolveField(id) {
  if (id === VF_PLAYBOOK) return playbookVirtualField();   // 页面全删光了也认得：存着它的条件不该被当成「字段已删除」
  if (id === VF_PB_TAGS) return pbTagsVirtualField();
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


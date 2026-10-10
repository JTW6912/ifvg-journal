/* ============================================================
   RENDER — GRID VIEW
   ============================================================ */
function newFilterRow(fieldId) {
  return { fieldId: fieldId || "", values: [], negate: false, matchMode: "or", rangeStart: "", rangeEnd: "", textValue: "" };
}

/* ============================================================
   筛选条件树 —— 嵌套的 且 / 或 / 非
   平铺的「所有条件一律 AND」表达不了「排除掉某个组合」这种规则。比如
   「noticeable 整体胜率低，但 noticeable + BW gap 是能做的」，要写的是
   非( 信号=noticeable 且 gap=non-BW )——对一个组合取反，平铺列表没有任何写法能表达。

   模型上做的取舍：**顶层仍然是数组、仍然是隐式 AND，只是数组元素可以是条件，也可以是分组**。
   于是老数据（localStorage 里的筛选、数据库 analysis_prefs 里的组合）读上来就是合法的树，
   一行迁移代码都不用写，没建过分组的用户界面也跟以前一模一样。

     叶子 = 现在的筛选行，字段一个没变
     分组 = { op: "and"|"or", negate: bool, children: [叶子|分组, ...] }

   ⚠ 三条容易踩的：
   1. **空分组必须中性，而且要忽略 negate**。项目铁律是「没填的条件匹配全部交易」，
      照搬到分组上就是「空分组 = 全部」，那么「非(空分组)」= 全部筛掉——用户刚点出一个分组
      还没来得及填，页面唰地空了，看起来完全像 bug。所以先数有效子节点，一个都没有就直接 true。
   2. **定位节点一律用路径不用下标**（"1.0.2" = 顶层第 1 个 → 它的第 0 个孩子 → 再第 2 个）。
      嵌套之后 data-idx 那套单层下标彻底不够用了，混用会改错节点而且不报错。
   3. **深拷贝要能拷树**。组合跳记录页那两座桥靠的是深拷贝，浅拷贝会让两边共享同一个 children
      数组，在一边改条件另一边跟着变——正是"复制不是共享"那条约定要防的。
   ============================================================ */
// 顶层数组本身算第 0 层，顶层里的分组是第 1 层。限死两层嵌套（分组里还能再放一层分组）：
// 无限嵌套的 UI 会难读到没人用，项目里组合分组也是同样理由限死两层的
const MAX_FILTER_GROUP_DEPTH = 2;
function isFilterGroup(n) { return !!n && typeof n === "object" && Array.isArray(n.children); }
function newFilterGroup(op) { return { op: op === "or" ? "or" : "and", negate: false, children: [newFilterRow()] }; }

// 这个节点会不会真的筛掉点什么。空节点在顶层无所谓（反正 return true），
// 但在「非(...)」里面就是天壤之别，所以判定集中在这一个函数里
function filterNodeIsEffective(n) {
  if (isFilterGroup(n)) return (n.children || []).some(filterNodeIsEffective);
  if (!n || !n.fieldId) return false;
  const field = resolveField(n.fieldId);
  if (!field) return false;                       // 字段被删了：按无效算，别让它污染外面的取反
  if (field.type === "select" || field.type === "multiselect") return (n.values || []).length > 0;
  if (field.type === "date" || field.type === "time") return !!(n.rangeStart || n.rangeEnd);
  if (field.type === "number") return !!(n.rangeStart || n.rangeEnd || n.textValue);
  return !!n.textValue;
}
function nodeMatchesTrade(t, node) {
  if (!isFilterGroup(node)) return tradeMatchesFilter(t, node);
  const kids = (node.children || []).filter(filterNodeIsEffective);
  if (!kids.length) return true;                  // 见上面第 1 条：空分组中性，negate 也不生效
  const hit = node.op === "or"
    ? kids.some((k) => nodeMatchesTrade(t, k))
    : kids.every((k) => nodeMatchesTrade(t, k));
  return node.negate ? !hit : hit;
}
// 顶层：数组元素之间隐式 AND，跟以前完全一致
function tradeMatchesFilters(t, arr) {
  return (arr || []).every((n) => nodeMatchesTrade(t, n));
}

/* ============================================================
   数据范围：全站统一的一层过滤（存在 analysisPrefs.dataScope，跟着账号走）
   用户反馈：用一个字段（比如 schema_version = 2）区分新交易和旧数据，但筛选是各页各一份，
   侧栏的数字、分析页、模型库的列表和归类队列里旧数据都还在。
   规则：
   - 设了范围之后，侧栏 / 顶部的数字、记录页、日历、分析页、组合、模型库（成绩、列表、未归类数、归类队列、便利贴）
     都先过这一层，再叠各页自己的筛选。模型库的「统计口径」叠在它上面
   - **交易本身一笔不少**：复盘、笔记里引用的范围外交易照样能点开；笔记的交易区里范围外的变灰、不算成绩
   - 默认是空的 = 完全不生效，没设过的用户什么都不变（网站不止一个人在用）
   - 可以临时「看全部」（dataScopeBypass，只记在这台设备上），不用删条件
   ============================================================ */
const DATA_SCOPE_CTX = "datascope";
const DATA_SCOPE_OFF_KEY = "journal_data_scope_off";
let dataScopeBypass = (function () { try { return localStorage.getItem(DATA_SCOPE_OFF_KEY) === "1"; } catch (e) { return false; } })();
function dataScopeConditions() { return (analysisPrefs && analysisPrefs.dataScope) || []; }
function dataScopeActive() { return dataScopeConditions().some(filterNodeIsEffective); }
function dataScopeOn() { return dataScopeActive() && !dataScopeBypass; }
function tradeInScopeStrict(t) { return tradeMatchesFilters(t, dataScopeConditions()); }   // 不管「看全部」开没开
function inDataScope(t) { return !dataScopeOn() || tradeInScopeStrict(t); }
function scopedTrades() { return dataScopeOn() ? trades.filter(tradeInScopeStrict) : trades; }
function setDataScopeBypass(on) {
  dataScopeBypass = !!on;
  try { localStorage.setItem(DATA_SCOPE_OFF_KEY, on ? "1" : "0"); } catch (e) {}
}
/* 新交易自动填的值：范围里只有平铺的「某个选择字段 是 某一个值」时，新建交易就把这个值填上，
   免得记了新交易忘了填、结果自己被筛掉。有分组、取反、多个值的条件一律不猜 */
function dataScopeDefaults() {
  const out = {};
  if (!dataScopeActive()) return out;
  for (const n of dataScopeConditions()) {
    if (!filterNodeIsEffective(n)) continue;
    if (isFilterGroup(n)) return {};
    const f = resolveField(n.fieldId);
    if (!f || f.virtual || (f.type !== "select" && f.type !== "multiselect")) continue;
    if (n.negate || (n.values || []).length !== 1) continue;
    out[f.id] = f.type === "multiselect" ? [n.values[0]] : n.values[0];
  }
  return out;
}
function applyDataScopeDefaults(blank) {
  const d = dataScopeDefaults();
  Object.keys(d).forEach((k) => {
    const v = blank[k];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) blank[k] = d[k];
  });
  return blank;
}

/* ---------- 路径寻址 ---------- */
// "2" = 顶层第 2 个；"2.0" = 它的第 0 个孩子。空串代表顶层数组本身
function parseFilterPath(p) {
  return String(p == null ? "" : p).split(".").filter((s) => s !== "").map((s) => parseInt(s, 10));
}
// 返回这条路径指向的节点；路径指不到就返回 null（渲染和事件之间隔着一次 render，可能已经不在了）
function filterNodeAt(arr, path) {
  const idx = parseFilterPath(path);
  let cur = null, list = arr;
  for (let i = 0; i < idx.length; i++) {
    if (!Array.isArray(list)) return null;
    cur = list[idx[i]];
    if (cur === undefined) return null;
    list = isFilterGroup(cur) ? cur.children : null;
  }
  return cur;
}
// 返回 { list, index }：这条路径的节点挂在哪个数组的第几位。删除/插入/换位都要用它
function filterParentAt(arr, path) {
  const idx = parseFilterPath(path);
  if (!idx.length) return null;
  let list = arr;
  for (let i = 0; i < idx.length - 1; i++) {
    const n = list[idx[i]];
    if (!isFilterGroup(n)) return null;
    list = n.children;
  }
  return { list, index: idx[idx.length - 1] };
}
// 往这条路径指向的容器里追加一个节点。path 为空 = 顶层数组
function filterChildListAt(arr, path) {
  if (!String(path || "")) return arr;
  const n = filterNodeAt(arr, path);
  return isFilterGroup(n) ? n.children : null;
}
function filterPathDepth(path) { return parseFilterPath(path).length; }
// 同一个父级下面才允许换位。跨层拖拽的语义（拖进/拖出分组）先不做，
// 不然"拖到分组标题上"到底是插进去还是插在它前面会很难说清楚
function filterPathParentKey(path) {
  const idx = parseFilterPath(path);
  return idx.slice(0, -1).join(".");
}

/* ---------- 规范化 / 深拷贝 ---------- */
// 读盘入口：localStorage 的筛选和数据库里的组合都走这里。老的平铺数组原样就是合法的树
function normalizeFilterNodes(raw, depth) {
  if (!Array.isArray(raw)) return [];
  const d = depth || 0;
  return raw.map((n) => {
    if (isFilterGroup(n)) {
      return {
        op: n.op === "or" ? "or" : "and",
        negate: !!n.negate,
        // 深度超限的分组不丢数据，原样读进来照常渲染，只是 UI 不再提供"继续往里加分组"
        children: normalizeFilterNodes(n.children, d + 1),
      };
    }
    return migrateLegacyNumberCondition({ ...newFilterRow(), ...n });
  }).filter(Boolean);
}
// 数字字段以前存的是 textValue（字符串包含）。改成数值区间之后，老条件如果原样留着，
// 用户在界面上只看得到两个空的区间框，却有一条看不见的条件在生效。
// 所以读盘时就地迁移成「精确等于」——那正是当初填 "2" 想表达的意思，而且比原来的
// 包含匹配更准（原来填 2 会把 12、2.5 一起捞进来）。解析不出数字的就留着，
// tradeMatchesFilter 里有兜底，绝不会静默变成"匹配全部"
function migrateLegacyNumberCondition(f) {
  if (!f.fieldId || !f.textValue || f.rangeStart || f.rangeEnd) return f;
  const field = resolveField(f.fieldId);
  if (!field || field.type !== "number") return f;
  const v = parseFloat(f.textValue);
  if (isNaN(v)) return f;
  return { ...f, rangeStart: String(v), rangeEnd: String(v), textValue: "" };
}
function cloneFilterNodes(arr) {
  return (arr || []).map((n) => isFilterGroup(n)
    ? { op: n.op, negate: !!n.negate, children: cloneFilterNodes(n.children) }
    : { ...n, values: [...(n.values || [])] });
}
// 按渲染顺序把树拍平成叶子列表。comboIssues 报"第 N 条"用它，编号才跟用户从上往下看到的一致
function flattenFilterLeaves(arr, out) {
  const acc = out || [];
  (arr || []).forEach((n) => { if (isFilterGroup(n)) flattenFilterLeaves(n.children, acc); else acc.push(n); });
  return acc;
}
function countFilterConditions(arr) {
  return flattenFilterLeaves(arr).filter((f) => f.fieldId).length;
}
// 存成组合的时候用：把还没选字段的空行、以及被清空的分组剪掉。
// ⚠ 不能写成 arr.filter(f => f.fieldId)——分组节点没有 fieldId，那样会把用户搭的整棵子树静默丢掉
function pruneFilterNodes(arr) {
  return (arr || []).reduce((out, n) => {
    if (isFilterGroup(n)) {
      const children = pruneFilterNodes(n.children);
      if (children.length) out.push({ op: n.op, negate: !!n.negate, children });
    } else if (n.fieldId) {
      out.push({ ...n, values: [...(n.values || [])] });
    }
    return out;
  }, []);
}
// 三个地方共用同一套筛选行 DOM 和事件处理，靠元素上的属性区分改的是哪个数组：
//   data-filter-ctx="analysis" → 分析页的 analysisFilters
//   data-combo-id="c_xxx"      → 那个组合的 conditions
//   两个都没有                 → 记录页的 activeFilters
// ⚠ 加新的筛选入口时一定要带上自己的上下文属性，否则会默默落到记录页那份上，把用户的记录页筛选改掉
//   data-filter-ctx="playbook" → 模型库的成绩口径 analysisPrefs.pbScope
const PB_SCOPE_CTX = "playbook";
function filterCtxOf(el) {
  if (el.dataset.filterCtx === ANALYSIS_CTX) return { arr: analysisFilters, comboId: "", scope: ANALYSIS_CTX };
  if (el.dataset.filterCtx === PB_SCOPE_CTX) return viewingUserId ? null : { arr: analysisPrefs.pbScope, comboId: "", scope: PB_SCOPE_CTX };
  if (el.dataset.filterCtx === DATA_SCOPE_CTX) {
    if (viewingUserId) return null;
    if (!Array.isArray(analysisPrefs.dataScope)) analysisPrefs.dataScope = [];
    return { arr: analysisPrefs.dataScope, comboId: "", scope: DATA_SCOPE_CTX };
  }
  const comboId = el.dataset.comboId || "";
  if (!comboId) return { arr: activeFilters, comboId: "", scope: "grid" };
  const c = findCombo(comboId);
  return c ? { arr: c.conditions, comboId, scope: "combo" } : null;
}
// filterCtxOf 返回的是上下文对象，chipKey / filterCtxAttr 要的是渲染时那个上下文字符串。
// 展开状态的 key 必须两边算出来一模一样，否则点开的分组下一次 render 就自己合上了
function ctxKeyOf(ctx) {
  if (ctx.scope === PB_SCOPE_CTX) return PB_SCOPE_CTX;
  if (ctx.scope === DATA_SCOPE_CTX) return DATA_SCOPE_CTX;
  return ctx.scope === ANALYSIS_CTX ? ANALYSIS_CTX : (ctx.comboId || "");
}
// 分析页筛选变了：存自己那份 localStorage，顺便标记"套进来的组合已经被改过"
function afterAnalysisFilterChange() {
  analysisComboDirty = !!analysisComboId;
  saveAnalysisFilters();
  render();
}
function afterFilterChange(ctx) {
  if (ctx.scope === ANALYSIS_CTX) { afterAnalysisFilterChange(); return; }
  // 模型库成绩口径：跟着账号走（存 analysis_prefs），改了卡片和页面上的成绩全部跟着变
  if (ctx.scope === PB_SCOPE_CTX) { queueSaveAnalysisPrefs(); render(); refreshPbPanels(); return; }
  // 数据范围：跟着账号走，改了全站的数字都跟着变；编辑框画在二级弹窗里，要强制重画
  if (ctx.scope === DATA_SCOPE_CTX) { gridPage = 1; queueSaveAnalysisPrefs(); render(); refreshPbPanels(); renderSecondaryModals(true); return; }
  if (ctx.comboId) {
    queueSaveAnalysisPrefs();
  } else {
    // 手动改过筛选，就不再算是「正在看某个组合」/「从分析页搬过来的」了
    activeComboId = null;
    activeFromAnalysis = false;
    saveActiveFilters();
    gridPage = 1;
  }
  render();
}
const FILTERS_KEY = "journal_active_filters";
function saveActiveFilters() {
  if (viewingUserId) return;
  try { localStorage.setItem(FILTERS_KEY, JSON.stringify(activeFilters)); } catch (e) {}
}
function loadSavedFilters() {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (e) { return null; }
}
function tradeMatchesSearch(t, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (pbTradeNote(t).toLowerCase().includes(q)) return true;   // 归类记录也搜（不是用户字段，单独看）
  return schema.some((f) => {
    if (!["text", "textarea", "url"].includes(f.type)) return false;
    const v = t[f.id];
    return typeof v === "string" && v.toLowerCase().includes(q);
  });
}
function tradeMatchesFilter(t, f) {
  const field = resolveField(f.fieldId);
  if (!field) return true;
  if (field.type === "select" || field.type === "multiselect") {
    if (!f.values || f.values.length === 0) return true;
    const tv = tradeFieldValue(t, field);
    const matches = field.type === "multiselect"
      ? (Array.isArray(tv) && (f.matchMode === "and" ? f.values.every((v) => tv.includes(v)) : f.values.some((v) => tv.includes(v))))
      : f.values.includes(tv);
    return f.negate ? !matches : matches;
  }
  if (field.type === "date" || field.type === "time") {
    const tv = tradeFieldValue(t, field) || "";
    if (!f.rangeStart && !f.rangeEnd) return true;
    // 创建/修改日期永远有值；但用户自己的日期字段可以留空，空值不该被区间"意外筛掉"之外的方式匹配
    if (f.rangeStart && tv < f.rangeStart) return false;
    if (f.rangeEnd && tv > f.rangeEnd) return false;
    return true;
  }
  // 数字字段走数值区间，不走字符串包含。以前是包含匹配，填 2 会把 12、2.5 全捞进来，
  // 而且「R >= 2」这种根本写不出来——空着一头就是单边比较
  if (field.type === "number") {
    if (f.rangeStart === "" || f.rangeStart === undefined || f.rangeStart === null) {
      if (f.rangeEnd === "" || f.rangeEnd === undefined || f.rangeEnd === null) {
        // 没填区间：优先看有没有遗留的 textValue（老数据 normalize 时会迁移掉，这里是兜底）。
        // 直接 return true 的话，没迁移成功的老条件会从"substring 匹配"悄悄变成"匹配全部"，
        // 数字凭空变好看——正是这个项目最忌讳的那种静默放宽
        return f.textValue ? legacyTextContains(t, field, f.textValue) : true;
      }
    }
    const n = parseFloat(tradeFieldValue(t, field));
    if (isNaN(n)) return false;   // 跟日期区间一致：设了边界，没填值的那批就不算满足
    const lo = parseFloat(f.rangeStart), hi = parseFloat(f.rangeEnd);
    if (!isNaN(lo) && n < lo) return false;
    if (!isNaN(hi) && n > hi) return false;
    return true;
  }
  if (!f.textValue) return true;
  return legacyTextContains(t, field, f.textValue);
}
function legacyTextContains(t, field, needle) {
  const tv = tradeFieldValue(t, field);
  return String(tv === undefined || tv === null ? "" : tv).toLowerCase().includes(String(needle).toLowerCase());
}
// comboId 为空 = 记录页的 activeFilters；有值 = 分析页某个组合的条件。
// 两边共用同一套 DOM 结构和事件处理，靠 data-combo-id 区分改哪个数组。
// ctx: "" = 记录页 / ANALYSIS_CTX = 分析页 / 其他字符串 = 组合 id
function filterCtxAttr(ctx) {
  if (!ctx) return "";
  if (ctx === PB_SCOPE_CTX) return ` data-filter-ctx="${PB_SCOPE_CTX}"`;
  if (ctx === DATA_SCOPE_CTX) return ` data-filter-ctx="${DATA_SCOPE_CTX}"`;
  return ctx === ANALYSIS_CTX ? ` data-filter-ctx="${ANALYSIS_CTX}"` : ` data-combo-id="${esc(ctx)}"`;
}
// 选项超过这个数，筛选行默认只显示已选中的那几个，其余收进「+N 更多」。
// 5 是按「一行放得下」定的：超过就会折行，条件卡立刻高一倍。
// 分析页和记录页/月度页都启用；组合编辑器不启用——那是个专门展开来编辑条件的地方，
// 正在挑值的时候把选项藏起来只会碍事
const COLLAPSE_CHIPS_OVER = 5;
// 展开状态的 key 必须带上下文，否则记录页第 0 行和分析页第 0 行会互相影响
function chipKey(ctx, idx) {
  return (ctx === ANALYSIS_CTX ? "analysis" : ctx === PB_SCOPE_CTX ? "playbook" : ctx || "grid") + ":" + idx;
}
function filterRowValuesHtml(field, path, f, ctx) {
  const cid = filterCtxAttr(ctx);
  if (field.type === "select" || field.type === "multiselect") {
    const vals = f.values || [];
    const opts = field.options || [];
    // 选项被删掉但条件里还留着的，也列出来并标红，否则用户根本看不见问题在哪
    const ghosts = vals.filter((v) => !opts.includes(v));
    const collapsible = (ctx === ANALYSIS_CTX || ctx === PB_SCOPE_CTX || !ctx) && opts.length > COLLAPSE_CHIPS_OVER;
    const key = chipKey(ctx, path);
    const expanded = !collapsible || expandedFilterChips.has(key);
    const shown = expanded ? opts : opts.filter((o) => vals.includes(o));
    const hiddenCount = opts.length - shown.length;
    return `<div class="chipGroup" style="margin-top:8px;">
      ${shown.map((o) => `<button type="button" class="chip ${vals.includes(o) ? "active" : ""}" data-action="toggle-filter-value" data-idx="${path}" data-val="${esc(o)}"${cid}>${esc(o)}</button>`).join("")}
      ${ghosts.map((o) => `<button type="button" class="chip active" style="border-color:var(--neg);color:var(--neg);background:var(--negSoft);" title="${esc(T("filter.ghostOption"))}" data-action="toggle-filter-value" data-idx="${path}" data-val="${esc(o)}"${cid}>${esc(o)} ⚠</button>`).join("")}
      ${collapsible ? `<button type="button" class="chip chipMore" data-action="toggle-filter-chips" data-chip-key="${esc(key)}">${esc(expanded ? T("filter.chipsCollapse") : T("filter.chipsMore", { n: hiddenCount }))}</button>` : ""}
    </div>`;
  }
  if (field.type === "date") {
    return `<div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
      <input type="date" class="select" data-filter-range="${path}" data-bound="start"${cid} value="${esc(f.rangeStart || "")}" />
      <span style="color:var(--mutedDark);font-size:12px;">${T("filter.rangeTo")}</span>
      <input type="date" class="select" data-filter-range="${path}" data-bound="end"${cid} value="${esc(f.rangeEnd || "")}" />
    </div>`;
  }
  if (field.type === "time") {
    return `<div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
      <input type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM" class="select mono" data-filter-range="${path}" data-bound="start" data-time-input${cid} value="${esc(f.rangeStart || "")}" oninput="window.__formatTimeInput(this)" />
      <span style="color:var(--mutedDark);font-size:12px;">${T("filter.rangeTo")}</span>
      <input type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM" class="select mono" data-filter-range="${path}" data-bound="end" data-time-input${cid} value="${esc(f.rangeEnd || "")}" oninput="window.__formatTimeInput(this)" />
    </div>
    <div style="font-size:10.5px;color:var(--mutedDark);margin-top:5px;">${T("filter.timeHint")}</div>`;
  }
  if (field.type === "number") {
    // 两头都可以空着：只填左边 = 「≥ 这个数」，只填右边 = 「≤ 这个数」，都填 = 闭区间
    return `<div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
      <input type="number" step="any" class="select mono" data-filter-range="${path}" data-bound="start"${cid} value="${esc(f.rangeStart || "")}" placeholder="${esc(T("filter.numMin"))}" />
      <span style="color:var(--mutedDark);font-size:12px;">${T("filter.rangeTo")}</span>
      <input type="number" step="any" class="select mono" data-filter-range="${path}" data-bound="end"${cid} value="${esc(f.rangeEnd || "")}" placeholder="${esc(T("filter.numMax"))}" />
    </div>
    <div style="font-size:10.5px;color:var(--mutedDark);margin-top:5px;">${T("filter.numHint")}</div>`;
  }
  return `<div style="margin-top:8px;"><input type="text" class="select" data-filter-text="${path}"${cid} value="${esc(f.textValue || "")}" placeholder="${esc(T("filter.containsPlaceholder"))}" /></div>`;
}
// 一整行筛选条件（字段下拉 + AND/取反开关 + 值），记录页 / 分析页 / 组合编辑器共用。
// path 是这一行在条件树里的位置（"1" 或 "1.0"），所有 data-* 都带着它，handler 靠它回头定位节点
// 拖拽排序只有记录页顶层那份有：条件之间是 AND，顺序不影响结果，另外两处没做
function filterConditionRowHtml(f, path, ctx) {
  const cid = filterCtxAttr(ctx);
  const field = resolveField(f.fieldId);
  const missing = f.fieldId && !field;
  const showNegate = field && (field.type === "select" || field.type === "multiselect");
  const showAndToggle = field && field.type === "multiselect";
  // 只有记录页的顶层行可拖：嵌套之后跨层拖拽的语义（拖到分组标题上是插进去还是插在它前面）说不清楚
  const canDrag = !ctx && filterPathDepth(path) === 1;
  const dragAttrs = canDrag ? ` draggable="true" data-filter-idx="${path}"` : "";
  return `<div class="filterRow"${dragAttrs} style="padding:10px 12px;border:1px solid ${missing ? "var(--neg)" : "var(--border)"};border-radius:8px;flex:1 1 320px;min-width:280px;max-width:420px;${canDrag ? "cursor:grab;" : ""}">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      ${canDrag ? `<span style="color:var(--mutedDark);cursor:grab;font-size:14px;" title="${esc(T("common.dragToReorder"))}">⠿</span>` : ""}
      <select class="select" data-filter-field="${path}"${cid}>
        <option value="">${esc(T("filter.selectField"))}</option>
        ${schema.filter((x) => filterableTypes.includes(x.type)).map((x) => `<option value="${esc(x.id)}" ${f.fieldId === x.id ? "selected" : ""}>${esc(x.label)}</option>`).join("")}
        <optgroup label="${esc(T("vfield.group"))}">
          ${virtualFields().map((x) => `<option value="${esc(x.id)}" ${f.fieldId === x.id ? "selected" : ""}>${esc(x.label)}</option>`).join("")}
        </optgroup>
      </select>
      ${showAndToggle ? `<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted);cursor:pointer;">
        <input type="checkbox" data-action="toggle-filter-and" data-idx="${path}"${cid} ${f.matchMode === "and" ? "checked" : ""} style="width:13px;height:13px;" />${T("filter.matchAll")}
      </label>` : ""}
      ${showNegate ? `<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted);cursor:pointer;">
        <input type="checkbox" data-action="toggle-filter-negate" data-idx="${path}"${cid} ${f.negate ? "checked" : ""} style="width:13px;height:13px;" />${T("filter.negate")}
      </label>` : ""}
      <button class="tinyBtn" data-action="remove-filter" data-idx="${path}"${cid} style="color:var(--neg);font-size:16px;margin-left:auto;">${ICONS.x}</button>
    </div>
    ${missing ? `<div style="font-size:11.5px;color:var(--neg);margin-top:8px;">${T("filter.fieldDeleted")}</div>` : ""}
    ${field ? filterRowValuesHtml(field, path, f, ctx) : ""}
  </div>`;
}

/* ---------- 分组块 ----------
   ⚠ 布局上的硬要求：**没建分组时界面必须跟以前像素级一致**。
   条件行是在一个 flex-wrap 容器里平铺的卡片（flex:1 1 320px）。分组折叠时就长成同样一张卡，
   跟条件行并排；展开时才 flex-basis:100% 独占一整行。这样不用嵌套的人完全看不出加过东西。
   分组默认折叠，只显示一行人话摘要——分析页天生就长，展开的嵌套块很占高度。
   新建的分组例外，建完自动展开，否则点一下"添加分组"什么都没看见。 */
function filterGroupHtml(node, path, ctx) {
  const cid = filterCtxAttr(ctx);
  const key = chipKey(ctx, path);
  const open = expandedFilterGroups.has(key);
  const text = filterNodeText(node) || T("filter.groupEmpty");
  const canNest = filterPathDepth(path) < MAX_FILTER_GROUP_DEPTH;
  const kids = node.children || [];
  const head = `<div class="filterGroupHead">
    <button type="button" class="filterGroupChev" data-action="toggle-filter-group" data-chip-key="${esc(key)}" title="${esc(T(open ? "filter.groupCollapse" : "filter.groupExpand"))}">${open ? ICONS.chevUp : ICONS.chevDown}</button>
    <!-- 取反时徽章只写「排除」：右边那行摘要已经是「非(a 且 b)」，把且/或再写一遍是重复，
         而「非全部满足」这种拼法读起来还容易被误解成「不是全都满足」 -->
    <span class="filterGroupOp ${node.negate ? "neg" : ""}">${node.negate ? T("filter.groupExclude") : T(node.op === "or" ? "filter.opOr" : "filter.opAnd")}</span>
    <span class="filterGroupSummary" title="${esc(text)}">${esc(text)}</span>
    <button class="tinyBtn" data-action="remove-filter" data-idx="${path}"${cid} style="color:var(--neg);font-size:16px;margin-left:auto;">${ICONS.x}</button>
  </div>`;
  if (!open) return `<div class="filterGroup">${head}</div>`;
  return `<div class="filterGroup open">
    ${head}
    <div class="filterGroupBody">
      <div class="filterGroupOps">
        <span style="font-size:11.5px;color:var(--mutedDark);">${T("filter.groupLogic")}</span>
        <button type="button" class="chip ${node.op !== "or" ? "active" : ""}" data-action="set-filter-group-op" data-idx="${path}" data-op="and"${cid}>${T("filter.opAnd")}</button>
        <button type="button" class="chip ${node.op === "or" ? "active" : ""}" data-action="set-filter-group-op" data-idx="${path}" data-op="or"${cid}>${T("filter.opOr")}</button>
        <label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted);cursor:pointer;margin-left:4px;">
          <input type="checkbox" data-action="toggle-filter-group-negate" data-idx="${path}"${cid} ${node.negate ? "checked" : ""} style="width:13px;height:13px;" />${T("filter.groupNegate")}
        </label>
      </div>
      <div class="filterNodeList">
        ${kids.map((child, i) => filterNodeHtml(child, path + "." + i, ctx)).join("")}
      </div>
      <div class="filterGroupFoot">
        <button class="btn" data-action="add-filter" data-parent-path="${path}"${cid}>${ICONS.plus} ${T("filter.addCondition")}</button>
        ${canNest ? `<button class="btn" data-action="add-filter-group" data-parent-path="${path}"${cid}>${ICONS.plus} ${T("filter.addGroup")}</button>` : ""}
      </div>
    </div>
  </div>`;
}
// 一个节点：是分组就画分组块，是条件就画条件行
function filterNodeHtml(node, path, ctx) {
  return isFilterGroup(node) ? filterGroupHtml(node, path, ctx) : filterConditionRowHtml(node, path, ctx);
}
// 一整棵树（顶层数组）。三个筛选面板都调这个
function filterNodeListHtml(arr, ctx) {
  return (arr || []).map((n, i) => filterNodeHtml(n, String(i), ctx)).join("");
}
function filteredSummaryStats(list) {
  const rF = roleField("r_multiple"), resultF = roleField("result");
  const clean = list;
  const w = resultF ? clean.filter((t) => isWinResult(t[resultF.id])).length : 0;
  const l = resultF ? clean.filter((t) => isLossResult(t[resultF.id])).length : 0;
  const be = resultF ? clean.filter((t) => resultBucket(t[resultF.id]) === "be").length : 0;
  const bew = resultF ? clean.filter((t) => resultBucket(t[resultF.id]) === "bewin").length : 0;
  const bel = resultF ? clean.filter((t) => resultBucket(t[resultF.id]) === "beloss").length : 0;
  const wr = w + l ? (w / (w + l)) * 100 : null;
  let totalR = null, ev = null, hasR = false;
  if (rF) {
    totalR = clean.reduce((s, t) => { if (t[rF.id] !== undefined && t[rF.id] !== "") { hasR = true; return s + (parseFloat(t[rF.id]) || 0); } return s; }, 0);
    ev = clean.length ? totalR / clean.length : null;
  }
  const pfInfo = profitFactorOf(clean, rF);
  return { n: clean.length, w, l, be, bew, bel, wr, totalR, ev, hasR, pf: pfInfo.pf, pfSample: pfInfo.n };
}
/* ---------- 筛选面板共用的小零件（分析页 / 记录页 / 月度页长一个样） ---------- */
// 折叠状态下的一行人话摘要：不展开也知道现在筛的是什么，大多数时候根本不用展开
function filterPanelSummaryHtml(conditions) {
  const text = comboConditionsText({ conditions });
  return `<div class="filterPanelSummary" title="${esc(text)}">${esc(text)}</div>`;
}
// 「全部 230 → 57」：把"这个数字是怎么来的"直接摆在标题上
function filterPanelChainHtml(total, shown, hasFilters, titleText) {
  if (!hasFilters) return `<span class="filterPanelChain mono">${esc(T("grid.tradeCount", { n: total }))}</span>`;
  return `<span class="filterPanelChain mono" title="${esc(titleText)}">${total}<span class="arrow">→</span><b>${shown}</b></span>`;
}
// 记录页/月度页顶上的「这套筛选是从哪来的」横幅。两个来源：组合卡片的「查看这 N 笔交易」，
// 或分析页的「去记录页/月度页看」。两页共用同一份 activeFilters，所以两页都要显示这条——
// 否则从月度页进来的人根本不知道自己的筛选被换过，会以为数据错了
function renderFilterOriginBanner() {
  const activeCombo = activeComboId ? findCombo(activeComboId) : null;
  if (!activeCombo && !activeFromAnalysis) return "";
  // viewingCombo 的文案里带 <b>，是有意的 HTML，不能 esc
  const label = activeCombo
    ? T("grid.viewingCombo", { name: `<b>${esc(activeCombo.name)}</b>` })
    : esc(T("grid.viewingAnalysisFilter"));
  const backLabel = activeCombo ? T("grid.backToCombo") : T("grid.backToAnalysis");
  return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--accentSoft);border:1px solid var(--accent);border-radius:8px;padding:10px 16px;margin-bottom:16px;flex-wrap:wrap;">
    <span style="font-size:13px;color:var(--accent);">${ICONS.filter} ${label}</span>
    <span style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn" data-action="back-to-combo">${esc(backLabel)}</button>
      <button class="btn" data-action="restore-pre-combo-filters">${T("grid.restoreFilters")}</button>
    </span>
  </div>`;
}
function renderFilterSummary(filtered) {
  const s = filteredSummaryStats(filtered);
  if (s.n === 0) return `<div style="font-size:12px;color:var(--mutedDark);margin-bottom:16px;">${T("grid.summaryEmpty")}</div>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;font-size:12.5px;color:var(--muted);margin-bottom:16px;padding:11px 14px;background:var(--surface2);border-radius:8px;">
    <span class="mono" style="color:var(--accent);font-weight:600;">${T("grid.winRate")} ${fmtPct(s.wr)}</span>
    <span>W ${s.w} · L ${s.l} · BE ${s.be} · BE→W ${s.bew} · BE→L ${s.bel}</span>
    ${s.hasR ? `<span class="mono" style="color:${s.totalR >= 0 ? "var(--pnlPos)" : "var(--pnlNeg)"}">${T("grid.total")} ${fmtNum(s.totalR)}R · EV ${fmtNum(s.ev, 3)}</span>` : ""}
    ${s.hasR ? `<span class="mono" style="color:${pfColor(s.pf)}" title="${esc(T("grid.pfTitle", { n: s.pfSample }))}">PF ${fmtPF(s.pf)}</span>` : ""}
    ${!viewingUserId ? `<button class="tinyBtn" data-action="save-filters-as-combo" style="margin-left:auto;color:var(--accent);font-size:12px;">${ICONS.plus} ${T("grid.saveFiltersAsCombo")}</button>` : ""}
  </div>`;
}
/* 原来还有一档 huge:500。删掉了：它还是走 .grid 的多列布局、还是被 object-fit:cover 裁，
   在 2200px 的 .wrap 里一行照样排四张——"更宽的缩略图"而已，不是"看得清的大图"。
   真想看清一张图请用看图模式（focus），那边不裁、一行一笔 */
const CARD_SIZES = { compact: 190, standard: 260, large: 360 };
const TABLE_PAGE_SIZE = 25;
// 看图模式一笔就占大半屏，一页给多了只是让分页条更远、图更多张一起下载
const FOCUS_PAGE_SIZE = 10;
const FOCUS_HEIGHTS = { comfy: "62vh", large: "78vh", full: "92vh" };
function estimateCardColumns() {
  const cardPx = CARD_SIZES[gridCardSize] || CARD_SIZES.standard;
  const gap = 18;
  const availableWidth = Math.min(window.innerWidth || 1200, 2200) - 56;
  return Math.max(1, Math.floor((availableWidth + gap) / (cardPx + gap)));
}
function currentPageSize() {
  if (gridViewMode === "table") return TABLE_PAGE_SIZE;
  if (gridViewMode === "focus") return FOCUS_PAGE_SIZE;
  return estimateCardColumns() * 4;
}
function renderPaginationControls(totalPages, totalCount) {
  if (totalPages <= 1) return "";
  return `<div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:20px;">
    <button class="btn" data-action="grid-prev-page" ${gridPage <= 1 ? "disabled style='opacity:.35'" : ""}>${T("grid.prevPage")}</button>
    <span class="mono" style="font-size:12.5px;color:var(--muted);">${esc(T("grid.pageInfo", { page: gridPage, total: totalPages, count: totalCount }))}</span>
    <button class="btn" data-action="grid-next-page" ${gridPage >= totalPages ? "disabled style='opacity:.35'" : ""}>${T("grid.nextPage")}</button>
  </div>`;
}
const filterableTypes = ["select", "multiselect", "text", "textarea", "number", "date", "time"];
// 记录页和月度页共用这一个面板（两页也共用同一份 activeFilters）。
// 外壳和分析页的「分析范围」是同一套 .filterPanel* 样式，只是里面装的条件数组不同
function renderFilterPanel(filteredCount, filteredForSummary) {
  const activeCount = countFilterConditions(activeFilters);
  let html = `<div class="filterPanel${filterPanelOpen ? " open" : ""}">
    <button class="filterPanelHead" data-action="toggle-filter-panel">
      ${ICONS.filter}
      <span class="filterPanelTitle">${T("filter.title")}</span>
      ${activeCount
        ? `<span class="filterPanelBadge">${esc(T("filter.activeCount", { n: activeCount }))}</span>`
        : `<span class="filterPanelBadge off">${T("ascope.noFilter")}</span>`}
      ${filterPanelChainHtml(scopedTrades().length, filteredCount, activeCount > 0, T("filter.chainTitle"))}
      <span class="filterPanelChev">${filterPanelOpen ? ICONS.chevUp : ICONS.chevDown}</span>
    </button>
    ${!filterPanelOpen && activeCount ? filterPanelSummaryHtml(activeFilters) : ""}`;
  if (filterPanelOpen) {
    html += `<div class="filterPanelBody">
      <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:10px;line-height:1.7;">${T("filter.logicHint")}<br>${T("filter.groupHint")}</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;width:100%;">
        ${filterNodeListHtml(activeFilters, "")}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
        <button class="btn" data-action="add-filter">${ICONS.plus} ${T("filter.addCondition")}</button>
        <button class="btn" data-action="add-filter-group">${ICONS.plus} ${T("filter.addGroup")}</button>
        ${activeFilters.length ? `<button class="btn" data-action="clear-all-filter-values">${T("filter.clearAllValues")}</button>` : ""}
      </div>
      <div style="margin-top:14px;">${renderFilterSummary(filteredForSummary)}</div>
    </div>`;
  }
  html += `</div>`;
  return html;
}
/* ============================================================
   记录页 —— 看图模式（focus）
   一行一笔，左边一张不裁的大图，右边（或底下）挂用户选的字段。
   用途跟卡片视图不一样：卡片是"找到那一笔"，这里是"把这一笔看清楚"，
   连着翻几十笔来找规律、养盘感。所以这里的取舍全部倒过来：
   不裁图、不定宽高比、一页只放 10 笔。
   ============================================================ */
// 这几个角色在看图模式里是常驻的（顶上那两行），不进"额外字段"的候选池，
// 免得同一个值在同一栏里出现两遍
const FOCUS_PINNED_ROLES = ["date", "model", "result", "r_multiple", "screenshot"];

// 能被挑来当"额外显示字段"的：排掉常驻角色，再把创建/修改日期这两个虚拟字段接在后面
function pickableFields(pinnedRoles) {
  return schema.filter((f) => !pinnedRoles.includes(f.role)).concat(virtualFields());
}

/* 还没配过时的默认：所有长文本字段。
   复盘一张图的时候最想看的就是当时写的那几句话，而长文本正是卡片视图里最挤、
   最放不下的东西——看图模式右边有一整栏，正好归它。
   一个长文本都没有的话退回前三个非常驻字段，总比空着强 */
function defaultFocusFields() {
  const longs = activeSchema().filter((f) => f.type === "textarea" && !FOCUS_PINNED_ROLES.includes(f.role));
  if (longs.length) return longs.map((f) => f.id);
  return activeSchema().filter((f) => !FOCUS_PINNED_ROLES.includes(f.role)).slice(0, 3).map((f) => f.id);
}

/* 图片高度是一个挂在 <html> 上的 CSS 变量，不是 inline style：
   一行一笔、一页十行，写 inline 就是十份重复的样式；改一档还得整页重渲染 */
function applyFocusHeight() {
  document.documentElement.style.setProperty("--focusH", FOCUS_HEIGHTS[focusHeight] || FOCUS_HEIGHTS.large);
}

function renderFocusToolbar() {
  const heightBtn = (k, label) => `<button class="btn ${focusHeight === k ? "btn-primary" : ""}" data-action="set-focus-height" data-height="${k}" style="padding:5px 10px;font-size:12px;">${esc(label)}</button>`;
  const sideBtn = (k, label, title) => `<button class="btn ${focusSidePos === k ? "btn-primary" : ""}" data-action="set-focus-side" data-side="${k}" style="padding:5px 10px;font-size:12px;"${title ? ` title="${esc(title)}"` : ""}>${esc(label)}</button>`;
  return `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
    <span style="font-size:11.5px;color:var(--mutedDark);">${T("focus.height")}</span>
    ${heightBtn("comfy", T("focus.heightComfy"))}${heightBtn("large", T("focus.heightLarge"))}${heightBtn("full", T("focus.heightFull"))}
    <span style="font-size:11.5px;color:var(--mutedDark);margin-left:8px;">${T("focus.sidePos")}</span>
    ${sideBtn("right", T("focus.sideRight"))}${sideBtn("bottom", T("focus.sideBottom"), T("focus.sideBottomTitle"))}
    <button class="btn ${focusMasked ? "btn-primary" : ""}" data-action="toggle-focus-mask" title="${esc(T("focus.maskTitle"))}" style="padding:5px 10px;font-size:12px;margin-left:8px;">${T("focus.mask")}</button>
    <button class="btn ${focusFieldsPickerOpen ? "btn-primary" : ""}" data-action="toggle-focus-fields-picker" style="padding:5px 10px;font-size:12px;">${ICONS.settings} ${T("focus.fields")}</button>
  </div>`;
}

/* pageItems 是当前这一页的交易。totalCount 只用来在序号条上显示"共 N 笔"，不参与别的 */
function renderFocusList(pageItems, totalCount, roles) {
  const { modelF, resultF, dateF, rF, shotF } = roles;
  if (focusCursor >= pageItems.length) focusCursor = Math.max(0, pageItems.length - 1);
  focusIndexTotal = totalCount;

  let html = `<div class="focusIndex">${esc(T("focus.position", { cur: focusCursor + 1, total: pageItems.length, n: totalCount }))} · ${esc(T("focus.navHint"))}</div>`;
  html += `<div class="focusList">`;

  pageItems.forEach((t, i) => {
    const result = resultF ? t[resultF.id] : null;
    const rc = resultColor(result);
    const shot = shotF ? shotUrls(t[shotF.id])[0] : null;   // 多张时只显示封面
    const rVal = rF ? t[rF.id] : undefined;
    const hasR = rVal !== undefined && rVal !== "";
    // 遮挡只盖"结果"，日期和模型照常显示——不然连是哪一天哪个模型都不知道，没法判断
    const hidden = focusMasked && !focusRevealed.has(t.id);

    const outcomeHtml = hidden
      ? `<div class="focusSideHead"><span class="focusDate">${dateF ? esc(t[dateF.id] || "—") : "—"}</span></div>
         <div class="focusModelRow"><span class="focusModel">${modelF ? esc(t[modelF.id] || "—") : "—"}</span></div>
         <div class="focusMaskBox">
           <div class="focusMaskHint">${T("focus.maskHint")}</div>
           <button class="btn" data-action="focus-reveal" data-id="${esc(t.id)}" style="padding:6px 14px;font-size:12px;">${T("focus.reveal")}</button>
         </div>`
      : `<div class="focusSideHead">
           <span class="focusDate">${dateF ? esc(t[dateF.id] || "—") : "—"}</span>
           ${hasR ? `<span class="focusR" style="color:${rc}">${(parseFloat(rVal) >= 0 ? "+" : "") + esc(String(rVal))}R</span>` : ""}
         </div>
         <div class="focusModelRow">
           <span class="focusModel">${modelF ? esc(t[modelF.id] || "—") : "—"}</span>
           ${result ? `<span class="focusResult" style="background:${rc}">${esc(result)}</span>` : ""}
         </div>`;

    const fieldsHtml = focusFields.map((fid) => {
      const f = resolveField(fid);
      if (!f) return "";   // 字段被删了：静默跳过，不留空壳
      let v = tradeFieldValue(t, f);
      if (Array.isArray(v)) v = v.length ? v.join(", ") : "";
      const text = (v === undefined || v === null || v === "") ? "—" : String(v);
      return `<div class="focusField${f.type === "textarea" || text.length > 40 ? " isLong" : ""}">
        <div class="focusFieldLabel">${esc(f.label)}</div>
        <div class="focusFieldVal">${esc(text)}</div>
      </div>`;
    }).join("");

    /* ⚠ 图片和整行都没有 data-action="edit-trade"：卡片视图整张卡点了就进编辑弹窗，
       在这儿会变成灾难——一边翻一边看，误触一次就弹一个编辑器出来。
       这里点图是看原图（lightbox），要改得点右下角那个明确的"编辑" */
    html += `<div class="focusRow${focusSidePos === "bottom" ? " sideBottom" : ""}${shot ? "" : " noShot"}${i === focusCursor ? " isCurrent" : ""}" data-focus-row="${i}">
      <div class="focusShot"${shot ? ` data-action="preview-image" data-url="${esc(imgSrc(shot))}"` : ""}>
        ${shot
          ? `<img src="${esc(imgSrc(shot))}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fallback-url="${esc(imgSrc(shot))}" data-fallback-class="focusShotEmpty" onerror="window.__imgFallback(this)" />
             <span class="focusZoomHint">${esc(T("focus.zoomHint"))}</span>`
          : `<div class="focusShotEmpty">${ICONS.camera} ${esc(T("focus.noShot"))}</div>`}
      </div>
      <div class="focusSide"><div class="focusSideInner">
        <div class="focusSideTop">${outcomeHtml}</div>
        ${fieldsHtml ? `<div class="focusSideDivider"></div><div class="focusFields">${fieldsHtml}</div>` : ""}
        ${viewingUserId ? "" : `<div class="focusSideFoot">
          <button class="btn" data-action="edit-trade" data-id="${esc(t.id)}">${T("focus.edit")}</button>
          ${confirmDeleteId === t.id
            ? `<button class="btn" data-action="confirm-delete" data-id="${esc(t.id)}" style="background:var(--negSoft);color:var(--neg);">${T("common.confirmDelete")}</button><button class="btn" data-action="cancel-delete">${T("common.cancel")}</button>`
            : `<button class="btn" data-action="ask-delete" data-id="${esc(t.id)}" style="color:var(--neg)">${ICONS.trash}</button>`}
        </div>`}
      </div></div>
    </div>`;
  });

  html += `</div>`;
  return html;
}

function renderGrid() {
  const modelF = roleField("model"), resultF = roleField("result"), dateF = roleField("date"), rF = roleField("r_multiple"), shotF = roleField("screenshot");

  let filtered = scopedTrades().filter((t) => tradeMatchesFilters(t, activeFilters) && tradeMatchesSearch(t, searchQuery));
  const sortVal = (t) => {
    if (sortBy === "created_at") return t._created_at || "";
    if (sortBy === "updated_at") return t._updated_at || t._created_at || "";
    return dateF ? t[dateF.id] || "" : "";
  };
  filtered.sort((a, b) => {
    const cmp = String(sortVal(a)).localeCompare(String(sortVal(b)));
    return sortDir === "desc" ? -cmp : cmp;
  });

  let html = renderFilterOriginBanner();
  html += `<div style="position:relative;margin-bottom:12px;max-width:340px;">
    <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--mutedDark);pointer-events:none;">${ICONS.search}</span>
    <input type="text" class="input" data-action="search-input" placeholder="${esc(T("grid.searchPlaceholder"))}" value="${esc(searchQuery)}" style="padding-left:34px;" />
  </div>`;
  html += renderFilterPanel(filtered.length, filtered);

  // 字段选择器展开时，视图切换那一行要贴着它，中间不留 16px 的缝
  const pickerOpen = (gridViewMode === "card" && cardFieldsPickerOpen)
                  || (gridViewMode === "focus" && focusFieldsPickerOpen);

  // sort controls
  html += `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:14px;">
    <span style="font-size:11.5px;color:var(--mutedDark);">${T("grid.sort")}</span>
    <select class="select" data-bind="sort-by">
      <option value="trade_date" ${sortBy === "trade_date" ? "selected" : ""}>${esc(T("grid.sortTradeDate"))}</option>
      <option value="created_at" ${sortBy === "created_at" ? "selected" : ""}>${esc(T("grid.sortCreated"))}</option>
      <option value="updated_at" ${sortBy === "updated_at" ? "selected" : ""}>${esc(T("grid.sortUpdated"))}</option>
    </select>
    <button class="btn" data-action="toggle-sort-dir" style="padding:5px 10px;font-size:12px;">${sortDir === "desc" ? T("grid.sortDesc") : T("grid.sortAsc")}</button>
  </div>

  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:${pickerOpen ? "0" : "16"}px;">
    <div style="display:flex;gap:6px;">
      <button class="btn ${gridViewMode === "card" ? "btn-primary" : ""}" data-action="set-view-mode" data-mode="card">${ICONS.grid} ${T("grid.viewCard")}</button>
      <button class="btn ${gridViewMode === "table" ? "btn-primary" : ""}" data-action="set-view-mode" data-mode="table">${ICONS.table} ${T("grid.viewTable")}</button>
      <button class="btn ${gridViewMode === "focus" ? "btn-primary" : ""}" data-action="set-view-mode" data-mode="focus">${ICONS.expand} ${T("grid.viewFocus")}</button>
    </div>
    ${gridViewMode === "card" ? `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
      <span style="font-size:11.5px;color:var(--mutedDark);">${T("grid.imageSize")}</span>
      ${Object.keys(CARD_SIZES).map((sz) => `<button class="btn ${gridCardSize === sz ? "btn-primary" : ""}" data-action="set-card-size" data-size="${sz}" style="padding:5px 10px;font-size:12px;">${esc(T("grid.size" + sz.charAt(0).toUpperCase() + sz.slice(1)))}</button>`).join("")}
      <button class="btn ${cardFieldsPickerOpen ? "btn-primary" : ""}" data-action="toggle-card-fields-picker" style="padding:5px 10px;font-size:12px;">${ICONS.settings} ${T("grid.cardFields")}</button>
    </div>` : ""}
    ${gridViewMode === "focus" ? renderFocusToolbar() : ""}
  </div>
  ${gridViewMode === "card" && cardFieldsPickerOpen ? `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:16px;">
    <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:8px;">${T("grid.cardFieldsHint")}</div>
    <div class="chipGroup">
      ${pickableFields(["date", "model", "r_multiple"]).map((f) => `<button type="button" class="chip ${cardFields.includes(f.id) ? "active" : ""}" data-action="toggle-card-field" data-id="${esc(f.id)}">${esc(f.label)}</button>`).join("")}
    </div>
    ${cardFields.length ? `<button class="tinyBtn" data-action="reset-card-fields" style="color:var(--mutedDark);margin-top:8px;">${T("grid.clearExtraFields")}</button>` : ""}
  </div>` : ""}
  ${gridViewMode === "focus" && focusFieldsPickerOpen ? `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:16px;">
    <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:8px;">${T("focus.fieldsHint")}</div>
    <div class="chipGroup">
      ${pickableFields(FOCUS_PINNED_ROLES).map((f) => `<button type="button" class="chip ${focusFields.includes(f.id) ? "active" : ""}" data-action="toggle-focus-field" data-id="${esc(f.id)}">${esc(f.label)}</button>`).join("")}
    </div>
    ${focusFields.length ? `<button class="tinyBtn" data-action="reset-focus-fields" style="color:var(--mutedDark);margin-top:8px;">${T("focus.clearFields")}</button>` : ""}
  </div>` : ""}`;

  if (!filtered.length) {
    html += `<div class="emptyState"><div style="font-size:14px;margin-bottom:14px;">${T("grid.empty")}</div><button class="btn btn-primary" data-action="new-trade">${ICONS.plus} ${T("common.newTrade")}</button></div>`;
    return html;
  }

  const pageSize = currentPageSize();
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (gridPage > totalPages) gridPage = totalPages;
  if (gridPage < 1) gridPage = 1;
  const pageStart = (gridPage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  if (gridViewMode === "focus") {
    html += renderFocusList(pageItems, filtered.length, { modelF, resultF, dateF, rF, shotF });
    html += renderPaginationControls(totalPages, filtered.length);
    return html;
  }

  if (gridViewMode === "table") {
    // 创建/修改日期挂在最后两列：它们不是交易内容，是"这条记录本身"的信息，混在自定义字段中间会乱
    const cols = schema.concat(virtualFields());
    html += `<div class="tableScroll"><table class="dataTable"><thead><tr>
      <th></th>${cols.map((f) => `<th>${esc(f.label)}</th>`).join("")}
    </tr></thead><tbody>`;
    pageItems.forEach((t) => {
      const result = resultF ? t[resultF.id] : null;
      const rc = resultColor(result);
      const confirming = confirmDeleteId === t.id;
      html += `<tr data-action="edit-trade" data-id="${esc(t.id)}">
        <td>${viewingUserId ? "" : (!confirming
          ? `<button class="tinyBtn" data-action="ask-delete" data-id="${esc(t.id)}" style="color:var(--neg)">${ICONS.trash}</button>`
          : `<button class="tinyBtn" data-action="confirm-delete" data-id="${esc(t.id)}" style="color:var(--neg)">✓</button><button class="tinyBtn" data-action="cancel-delete">${ICONS.x}</button>`)}</td>
        ${cols.map((f) => {
          let v = tradeFieldValue(t, f);
          if (Array.isArray(v)) v = v.join(", ");
          if (f.role === "screenshot") v = shotUrls(v)[0] || "";   // 只显示封面
          const isResultCol = f.role === "result";
          return `<td style="${isResultCol ? `color:${rc};font-weight:600;` : ""}${f.virtual ? "color:var(--mutedDark);white-space:nowrap;" : ""}${f.role === "screenshot" ? "max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" : ""}">${esc(v ?? "")}</td>`;
        }).join("")}
      </tr>`;
    });
    html += `</tbody></table></div>`;
    html += renderPaginationControls(totalPages, filtered.length);
    return html;
  }

  const cardPx = CARD_SIZES[gridCardSize] || CARD_SIZES.standard;
  html += `<div class="grid" style="grid-template-columns:repeat(auto-fill, minmax(${cardPx}px, 1fr));">`;
  function formatFieldValueShort(field, value) {
    if (value === undefined || value === null || value === "") return "—";
    if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
    return String(value);
  }
  pageItems.forEach((t) => {
    const result = resultF ? t[resultF.id] : null;
    const rc = resultColor(result);
    const shot = shotF ? shotUrls(t[shotF.id])[0] : null;   // 多张时只显示封面
    const confirming = confirmDeleteId === t.id;
    let bodyHtml = `<div class="cardTop">
          <span class="mono" style="font-size:12px;color:var(--muted);">${dateF ? esc(t[dateF.id] || "—") : "—"}</span>
          ${rF && t[rF.id] !== undefined && t[rF.id] !== "" ? `<span class="mono" style="font-size:12.5px;font-weight:600;color:${rc}">${(parseFloat(t[rF.id]) >= 0 ? "+" : "") + t[rF.id]}R</span>` : ""}
        </div>
        <div class="cardModel">${modelF ? esc(t[modelF.id] || "—") : "—"}</div>`;
    if (cardFields.length) {
      bodyHtml += cardFields.map((fid) => {
        const f = resolveField(fid);
        if (!f) return "";
        const isLongText = f.type === "textarea";
        return `<div style="margin-top:8px;font-size:${isLongText ? "13px" : "11.5px"};">
          <div style="color:var(--mutedDark);margin-bottom:2px;${isLongText ? "font-size:11.5px;" : ""}">${esc(f.label)}</div>
          <div style="color:var(--text);white-space:normal;word-break:break-word;line-height:1.6;">${esc(formatFieldValueShort(f, tradeFieldValue(t, f)))}</div>
        </div>`;
      }).join("");
    }
    html += `<div class="card res-${result ? resultBucket(result) : "none"}" data-action="edit-trade" data-id="${esc(t.id)}">
      <div class="cardImg">
        ${shot ? `<img src="${esc(imgSrc(shot))}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fallback-url="${esc(imgSrc(shot))}" data-fallback-class="cardImgFallback" onerror="window.__imgFallback(this)" />`
               : `<div class="cardImgFallback">${ICONS.camera}</div>`}
        ${shot ? `<button class="previewIcon" data-action="preview-image" data-url="${esc(imgSrc(shot))}" title="${esc(T("grid.viewLarge"))}">${ICONS.expand}</button>` : ""}
        ${result ? `<span class="resultBadge" style="background:${rc}">${esc(result)}</span>` : ""}
      </div>
      <div class="cardBody">
        ${bodyHtml}
      </div>
      <div class="cardFoot">
        ${viewingUserId ? "" : (!confirming
          ? `<button data-action="ask-delete" data-id="${esc(t.id)}">${ICONS.trash}</button>`
          : `<button data-action="confirm-delete" data-id="${esc(t.id)}" style="background:var(--negSoft);color:var(--neg);">${T("common.confirmDelete")}</button><button data-action="cancel-delete">${T("common.cancel")}</button>`)}
      </div>
    </div>`;
  });
  html += `</div>`;
  html += renderPaginationControls(totalPages, filtered.length);
  return html;
}


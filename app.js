/* ============================================================
   CONFIG — 真实值在 config.js（已 gitignore，不进仓库）
   本地开发：复制 config.example.js 为 config.js 并填入你的
   Supabase 后台 → Settings → API → Project URL / anon public key
   ============================================================ */
const SUPABASE_URL = window.IFVG_CONFIG?.url || "";
const SUPABASE_ANON_KEY = window.IFVG_CONFIG?.key || "";

function getStoredApiConfig() {
  try {
    const raw = localStorage.getItem("journal_api_config");
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}
function currentApiConfig() {
  const stored = getStoredApiConfig();
  return {
    url: (stored && stored.url) || SUPABASE_URL,
    key: (stored && stored.key) || SUPABASE_ANON_KEY,
  };
}
let sb = null;
let rememberMe = true;
const authStorageAdapter = {
  getItem: (key) => {
    try { return localStorage.getItem(key) ?? sessionStorage.getItem(key); } catch (e) { return null; }
  },
  setItem: (key, value) => {
    try {
      if (rememberMe) { localStorage.setItem(key, value); sessionStorage.removeItem(key); }
      else { sessionStorage.setItem(key, value); localStorage.removeItem(key); }
    } catch (e) {}
  },
  removeItem: (key) => {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch (e) {}
  },
};
function initSupabaseClient() {
  const cfg = currentApiConfig();
  sb = cfg.url && cfg.url.startsWith("http") && cfg.key
    ? supabase.createClient(cfg.url, cfg.key, { auth: { storage: authStorageAdapter, persistSession: true, autoRefreshToken: true } })
    : null;
}
initSupabaseClient();

/* ============================================================
   ICONS — tiny inline SVGs (no external icon lib needed)
   ============================================================ */
const ICONS = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/></svg>',
  plus: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  download: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>',
  trash: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>',
  x: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="18" height="18"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  grid: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  table: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
  clock: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  shield: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>',
  chart: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18M18 17V9M13 17V5M8 17v-4"/></svg>',
  calendar: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  settings: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 005 16a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="11" height="11"><path d="M18 15l-6-6-6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="11" height="11"><path d="M6 9l6 6 6-6"/></svg>',
  chevDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M6 9l6 6 6-6"/></svg>',
  chevUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M18 15l-6-6-6 6"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
  /* ---------- 复盘 / markdown 工具栏 ---------- */
  book: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4.5A2.5 2.5 0 016.5 2H20v18H6.5A2.5 2.5 0 004 22z"/><path d="M8 7h8M8 11h6"/></svg>',
  check: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>',
  pencil: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
  tbBold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15"><path d="M6 4h7a4 4 0 010 8H6zM6 12h8a4 4 0 010 8H6z"/></svg>',
  tbItalic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M19 4h-9M14 20H5M15 4L9 20"/></svg>',
  tbStrike: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M4 12h16"/><path d="M7.5 8A3.5 3.5 0 0111 5h2a3.5 3.5 0 013.2 2M6.8 16A3.5 3.5 0 0010 19h3a3.5 3.5 0 003.5-3.5"/></svg>',
  tbUl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none"/></svg>',
  tbOl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 4.5h1V9M3.4 14.2c0-.7.6-1.2 1.3-1.2s1.3.5 1.3 1.2c0 1.2-2.6 1.9-2.6 3.3H6" stroke-width="1.6"/></svg>',
  tbTask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="4" width="8" height="8" rx="1.6"/><path d="M5 8.2l1.6 1.6L9.2 6.6"/><path d="M14 8h7M14 17h7M3 17h7"/></svg>',
  tbQuote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M4 5v14"/><path d="M9 8h11M9 12h11M9 16h7"/></svg>',
  tbCode: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M9 6l-5 6 5 6M15 6l5 6-5 6"/></svg>',
  tbLink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M10 13a4 4 0 006 .5l2.5-2.5a4 4 0 00-5.7-5.7L11.5 6.6"/><path d="M14 11a4 4 0 00-6-.5L5.5 13a4 4 0 005.7 5.7l1.3-1.3"/></svg>',
  tbImage: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="4" width="18" height="16" rx="2.2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M4 17l4.5-4.5 3.5 3.5 3-3L20 17"/></svg>',
  tbHr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M3 12h18"/><path d="M6 7h12M6 17h12" opacity=".35"/></svg>',
  tbHeading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M5 5v14M15 5v14M5 12h10"/></svg>',
  tbTable: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/></svg>',
};

/* ============================================================
   FIELD TYPES / ROLES
   标签跟着界面语言走，所以是函数不是常量——切语言后重新 render 就会拿到新文案。
   value 是存进数据库的那一份，永远不变。
   ============================================================ */
function fieldTypes() {
  return [
    { value: "text", label: T("fieldType.text") }, { value: "textarea", label: T("fieldType.textarea") },
    { value: "number", label: T("fieldType.number") }, { value: "date", label: T("fieldType.date") }, { value: "time", label: T("fieldType.time") },
    { value: "select", label: T("fieldType.select") }, { value: "multiselect", label: T("fieldType.multiselect") }, { value: "url", label: T("fieldType.url") },
  ];
}
function roleOptions() {
  return [
    { value: "", label: T("role.none") }, { value: "date", label: T("role.date") },
    { value: "model", label: T("role.model") }, { value: "taken", label: T("role.taken") },
    { value: "result", label: T("role.result") }, { value: "r_multiple", label: T("role.r_multiple") },
    { value: "max_rr", label: T("role.max_rr") }, { value: "human_error", label: T("role.human_error") },
    { value: "screenshot", label: T("role.screenshot") },
  ];
}
function fieldTypeLabel(v) { return fieldTypes().find((x) => x.value === v)?.label || v; }
function roleLabel(v) { return roleOptions().find((x) => x.value === v)?.label || v; }

/* 新账号第一次进来时写进数据库的字段表。按当前语言生成一次就落库，
   之后这些 label 就是用户自己的数据了——切语言不会回头改它们（用户可能已经改过名）。
   options 里的值刻意保持英文/符号，中英文用户共用，切语言不影响统计口径。 */
function defaultSchema() {
  return [
    { id: "date", label: T("defaultField.date"), type: "date", role: "date" },
    { id: "session", label: T("defaultField.session"), type: "select", role: "", options: ["London", "NYAM", "Asia", "Other"] },
    { id: "entry_time", label: T("defaultField.entry_time"), type: "time", role: "" },
    { id: "direction", label: T("defaultField.direction"), type: "select", role: "", options: ["Long", "Short"] },
    { id: "model", label: T("defaultField.model"), type: "select", role: "model", options: ["ifvg"] },
    { id: "entry", label: T("defaultField.entry"), type: "multiselect", role: "", options: ["displacement", "IFVG", "CISD"] },
    { id: "taken", label: T("defaultField.taken"), type: "select", role: "taken", options: ["Taken", "Faded"] },
    { id: "result", label: T("defaultField.result"), type: "select", role: "result", options: ["W", "L", "BE", "BE -> L", "BE -> W"] },
    { id: "r_multiple", label: T("defaultField.r_multiple"), type: "number", role: "r_multiple" },
    { id: "human_error", label: T("defaultField.human_error"), type: "select", role: "human_error", options: ["yes", "no"] },
    { id: "setup_grade_self", label: T("defaultField.setup_grade_self"), type: "select", role: "", options: ["A+", "A", "B+", "B", "C", "D"] },
    { id: "target_type", label: T("defaultField.target_type"), type: "multiselect", role: "", options: ["5M ITH/L", "15M ITH/L", "30M+ ITH/L", "BSL/SSL", "PDH/L", "INTERNAL LRL", "SESSION HIGH/LOW", "Unfilled FVG", "REQH/L", "Data H/L", "HR"] },
    { id: "notes", label: T("defaultField.notes"), type: "textarea", role: "" },
    { id: "post_note", label: T("defaultField.post_note"), type: "textarea", role: "" },
    { id: "screenshot", label: T("defaultField.screenshot"), type: "url", role: "screenshot" },
  ];
}

// 时间字段拆解的默认分段边界（美股 RTH：开盘前半小时切细，之后放宽）。完整说明见下面 TIME BUCKETS 那一段。
// ⚠ 必须声明在 STATE 之前：下面 `let analysisPrefs = defaultAnalysisPrefs()` 在加载时就会读它，
// 放到 TIME BUCKETS 那一段里会撞 TDZ，app.js 整个起不来
const DEFAULT_TIME_BUCKETS = ["09:30", "09:45", "10:00", "10:30", "11:00", "12:00"];

/* ============================================================
   STATE
   ============================================================ */
let schema = defaultSchema();
let cardFields = [];
let cardFieldsPickerOpen = false;
let trades = [];
let tab = "grid";
let editingTrade = null;
let confirmDeleteId = null;
let exportMenuOpen = false;
let exportScope = null; // null = auto (filtered if a filter/search is active, else all); "filtered" | "all" once user picks explicitly
let exportColumns = "all"; // "all" | "selected"
let exportSelectedFields = [];
let activeFilters = []; // [{fieldId, value}]
let searchQuery = "";
let openSettingsRow = null;
let loadError = null;
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth() + 1;
let dayDetailDate = null;
let returnToDayDetail = null;
let apiDraft = { url: "", key: "" };
let changelog = [];

/* ---------- 复盘（Reviews）状态 ----------
   只在实盘模式下出现，所以没有 mode 维度。编辑器不在 #app 里，
   而是自己一个根节点 #reviewEditorRoot + reviewEditorRenderedFor 守卫，
   跟 renderModal 的 modalRenderedForId 同一个套路——否则后台 render()
   会把正在写的长文冲掉。 */
let reviews = [];
let reviewsTableMissing = false;      // 没跑迁移 SQL 时置 true，页面上提示去跑
let reviewSearch = "";
let reviewConfirmDeleteId = null;
let editingReview = null;             // { id, title, body, week_start, _isNew }
let reviewEditorRenderedFor = null;   // 守卫：已经在显示这一篇就不重绘
let reviewSaveState = "idle";         // 'idle' | 'dirty' | 'saving' | 'saved'
let reviewSavedAt = null;
let reviewSaveTimer = null;
let reviewSaveError = null;
let reviewPreviewOpen = (function () { try { return localStorage.getItem("journal_review_preview") !== "false"; } catch (e) { return true; } })();
// 编辑器分两种模式：只读（只显示 markdown 渲染后的样子）和编辑（正文框 + 工具栏 + 预览）。
// 打开已有帖子一律从只读开始——大多数时候是回头看，不是改；新建帖子当然直接进编辑。
let reviewEditMode = false;
let slashMenu = null;                 // { query, index, top, left, anchor } —— 正文里打 / 弹出来的插入菜单
let tradePickerOpen = false;
let tradePickerQuery = "";
let gridCardSize = (function () { try { return localStorage.getItem("journal_card_size") || "large"; } catch (e) { return "large"; } })();
let gridViewMode = (function () { try { return localStorage.getItem("journal_view_mode") || "card"; } catch (e) { return "card"; } })();
let filterPanelOpen = (function () { try { return localStorage.getItem("journal_filter_panel_open") === "true"; } catch (e) { return false; } })();
let sortBy = (function () { try { return localStorage.getItem("journal_sort_by") || "trade_date"; } catch (e) { return "trade_date"; } })();
let sortDir = (function () { try { return localStorage.getItem("journal_sort_dir") || "desc"; } catch (e) { return "desc"; } })();
let gridPage = 1;
let viewingUserId = null;
let viewingUserEmail = null;
let ownStateSnapshot = null;
let session = null;
let currentProfile = null;
let authScreenMode = "login"; // 'login' | 'register'
let authError = "";
let authSuccess = "";
let authBusy = false;
let authLoading = true;
let recordMode = (function () { try { return localStorage.getItem("journal_record_mode") || "backtest"; } catch (e) { return "backtest"; } })();
let adminUsers = null;
let adminUsersSortBy = "created_at";
let adminUsersSortDir = "desc";
let userMenuOpen = false;
let profileModalOpen = false;
let profileError = "";
let profileSuccess = "";
let profileBusy = false;
let passwordError = "";
let passwordSuccess = "";
let passwordBusy = false;
let lightboxUrl = null;
let defaultFiltersSeeded = false;
let analysisPrefs = defaultAnalysisPrefs();
let analysisPrefsError = null;
let breakdownPickerOpen = false;
/* ---------- 分析页的"这次怎么看"状态 ----------
   全是纯视图状态，不影响任何数字。展开/折叠这类临时状态只放内存（刷新回到默认），
   视图模式/排序这类"我习惯这么看"才存 localStorage。 */
let expandedLowSample = new Set();     // 哪些拆解卡把「其他 N 项（样本少）」展开了，key=字段 id
let expandedFilterChips = new Set();   // 分析页筛选行里哪几行把全部选项 chip 展开了，key=行下标
let comboViewMode = (function () { try { return localStorage.getItem("journal_combo_view") === "list" ? "list" : "card"; } catch (e) { return "card"; } })();
let breakdownSort = (function () { try { const v = localStorage.getItem("journal_breakdown_sort"); return v === "delta" || v === "ev" ? v : "n"; } catch (e) { return "n"; } })();
// 分析页两个大区块（组合 / 拆解）收起了哪些
let collapsedAnalyticsSections = (function () {
  try {
    const raw = JSON.parse(localStorage.getItem("journal_analytics_sections") || "[]");
    return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : []);
  } catch (e) { return new Set(); }
})();
function saveCollapsedAnalyticsSections() {
  try { localStorage.setItem("journal_analytics_sections", JSON.stringify([...collapsedAnalyticsSections])); } catch (e) {}
}
let comboEditingId = null;   // 哪个组合的条件编辑器展开着
let activeComboId = null;    // 记录页顶部「正在查看组合」横幅
let activeFromAnalysis = false; // 记录页/月度页当前这套筛选是从分析页「搬过来」的（横幅用，不影响任何统计）
let preComboFilters = null;  // 跳到组合前的筛选快照，「还原筛选」用它原样恢复
let comboConfirmDeleteId = null;
let comboGroupConfirmDeleteId = null;
let comboGroupModal = null; // { mode: "root"|"sub"|"rename", parentId, groupId, name } —— 新建/新建二级/改名分组的弹窗
// 哪些分组被收起了——纯本地"这次怎么看"状态，不跨设备同步，跟分析页筛选一个套路。
// "__ungrouped__" 这个 key 代表页面最下面那个"未分组"桶
let collapsedComboGroups = (function () {
  try {
    const raw = JSON.parse(localStorage.getItem("journal_collapsed_combo_groups") || "[]");
    return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : []);
  } catch (e) { return new Set(); }
})();
function saveCollapsedComboGroups() {
  try { localStorage.setItem("journal_collapsed_combo_groups", JSON.stringify([...collapsedComboGroups])); } catch (e) {}
}
let dragGroupOverId = null;  // 组合卡片正拖在哪个分组头上方（高亮用），"" 代表"未分组"那个投放区
/* ---------- ANALYSIS FILTERS：分析页专属筛选 ----------
   和记录页的 activeFilters、月度页彻底分开：各自的数组、各自的 localStorage key、
   各自的事件上下文（data-filter-ctx="analysis"），任何一边改动都碰不到另一边。
   它取代了以前的「统计口径开关（只算 Taken / 排除人为错误）+ 模型筛选」——
   口径不再是藏在代码里的隐藏逻辑，而是面板里看得见、能删能改的普通条件。
   默认只有一条「已入场 = Taken」，所以用户压根不展开面板时，分析页看到的就是 Taken 的数据。 */
const ANALYSIS_FILTERS_KEY = "journal_analysis_filters";
const ANALYSIS_CTX = "analysis";
let analysisFilters = [];
let analysisFiltersSeeded = false;
let analysisPanelOpen = (function () { try { return localStorage.getItem("journal_analysis_panel_open") === "true"; } catch (e) { return false; } })();
let analysisComboId = null;      // 当前这套筛选是从哪个组合套进来的（只用于展示/回写，不参与统计）
let analysisComboDirty = false;  // 套进来之后又手动改过条件——此时数字已经不代表那个组合了
/* ---------- 界面语言 ----------
   lang / T() 本身定义在 i18n.js（要在 app.js 之前加载）。这里只管「切换」这个动作：
   本地立刻生效，同时best-effort写回账号，让别的设备登录后也是同一种语言。 */
async function setLang(next) {
  if (!I18N_LANGS.includes(next) || next === lang) return;
  lang = next;
  try { localStorage.setItem("journal_lang", next); } catch (e) {}
  applyLangAttr();
  render();
  refreshProfileModalLang();
  await persistLang();
}
// 个人设置弹窗放了语言开关，但 renderSecondaryModals 平时会跳过重渲染——
// 那是为了保护用户正在输入还没保存的内容（显示名、密码框）不被后台刷新打断。
// 切语言必须强制重渲染弹窗才能换掉里面的文案，所以这里手动把还没保存的输入值
// （包括只存在本地变量里的性别选择）搬到新 DOM 上，两头都要顾到。
function refreshProfileModalLang() {
  if (!profileModalOpen) return;
  const ids = ["profileNameInput", "pwCurrentInput", "pwNewInput", "pwConfirmInput"];
  const savedValues = {};
  ids.forEach((id) => { const el = document.getElementById(id); if (el) savedValues[id] = el.value; });
  const savedGender = profileGenderDraft;
  renderSecondaryModals(true);
  ids.forEach((id) => { const el = document.getElementById(id); if (el && savedValues[id] !== undefined) el.value = savedValues[id]; });
  profileGenderDraft = savedGender;
  document.querySelectorAll('[data-action="set-gender-draft"]').forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.val === profileGenderDraft);
  });
}
// 写回 profiles.lang。数据库迁移还没跑的时候这里必然失败——只警告不打断，
// 本地 localStorage 那份已经生效了，用户不会看到任何异常。
async function persistLang() {
  if (!sb || !session || viewingUserId) return;
  try {
    const { error } = await sb.rpc("update_own_lang", { new_lang: lang });
    if (error) console.warn("语言没能同步到账号（数据库可能还没跑 update_own_lang 迁移）:", error.message);
    else if (currentProfile) currentProfile.lang = lang;
  } catch (e) { console.warn(e); }
}
// 登录后：账号里存了语言就以账号为准（换设备也一致）；没存过就把当前语言补写上去
function syncLangFromProfile() {
  if (!currentProfile) return;
  if (I18N_LANGS.includes(currentProfile.lang)) {
    if (currentProfile.lang !== lang) {
      lang = currentProfile.lang;
      try { localStorage.setItem("journal_lang", lang); } catch (e) {}
      applyLangAttr();
    }
  } else {
    persistLang();
  }
}

function saveAnalysisFilters() {
  if (viewingUserId) return;
  try { localStorage.setItem(ANALYSIS_FILTERS_KEY, JSON.stringify(analysisFilters)); } catch (e) {}
}
function saveAnalysisPanelOpen() {
  if (viewingUserId) return;
  try { localStorage.setItem("journal_analysis_panel_open", analysisPanelOpen ? "true" : "false"); } catch (e) {}
}
// 默认口径：只看已入场。没有 taken 角色字段（或它没有 Taken 这个选项）就退回"全部交易"
function defaultAnalysisFilters() {
  const takenF = roleField("taken");
  if (takenF && (takenF.options || []).includes("Taken")) return [{ ...newFilterRow(takenF.id), values: ["Taken"] }];
  return [];
}
// 每次加载数据时跑一次：本地存过就用存的（哪怕是空数组——那是用户主动清成"全部"的意思），没存过才给默认
function seedAnalysisFilters() {
  if (analysisFiltersSeeded) return;
  analysisFiltersSeeded = true;
  let saved = null;
  if (!viewingUserId) {
    try {
      const raw = JSON.parse(localStorage.getItem(ANALYSIS_FILTERS_KEY) || "null");
      if (Array.isArray(raw)) saved = raw.map((f) => ({ ...newFilterRow(), ...f }));
    } catch (e) {}
  }
  analysisFilters = saved || defaultAnalysisFilters();
}

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
  return trades.filter((t) => activeFilters.every((f) => tradeMatchesFilter(t, f)) && tradeMatchesSearch(t, searchQuery));
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
function resultColor(v) {
  if (v === "W" || v === "BE -> W") return "var(--pos)";
  if (v === "L" || v === "BE -> L") return "var(--neg)";
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
function virtualFields() {
  return [
    { id: VF_CREATED, label: T("vfield.created"), type: "date", role: "", virtual: true },
    { id: VF_UPDATED, label: T("vfield.updated"), type: "date", role: "", virtual: true },
  ];
}
function isVirtualFieldId(id) { return id === VF_CREATED || id === VF_UPDATED; }
// 按 id 找字段：先虚拟字段，再用户自己的 schema。找不到返回 null（调用方按"字段已删除"处理）
function resolveField(id) {
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
  return t[field.id];
}

/* ============================================================
   ANALYSIS PREFS —— 分析页的拆解显示配置 / 组合 / 组合分组
   存在 journal_schema.analysis_prefs (jsonb) 这一列里，跨设备同步。
   分析页那套筛选条件(analysisFilters)不在这里——它是纯本地的"这次想看哪批交易"，
   只存 localStorage，不跨设备同步，见上面 ANALYSIS FILTERS 那一段。
   ============================================================ */
function defaultAnalysisPrefs() {
  return {
    breakdownHidden: [],   // 存「隐藏哪些」，新加的字段自动出现
    breakdownOrder: [],    // 只存用户排过序的，没排到的按 schema 顺序接在后面
    combos: [],
    comboGroups: [],        // {id, name, parentId} 扁平列表，parentId=null 是顶层分组，最多两层
    timeBuckets: DEFAULT_TIME_BUCKETS.slice(), // 时间字段拆解用的分段边界，见 TIME BUCKETS 那一段
  };
}
function normalizeAnalysisPrefs(raw) {
  const d = defaultAnalysisPrefs();
  if (!raw || typeof raw !== "object") return d;
  const groups = Array.isArray(raw.comboGroups) ? raw.comboGroups : [];
  const rootIds = new Set(groups.filter((g) => g && g.id && !g.parentId).map((g) => g.id));
  const comboGroups = groups
    .filter((g) => g && typeof g === "object" && g.id && typeof g.name === "string")
    // parentId 只能指向一个"没有父级"的分组，否则会出现三层，直接把它降级成顶层分组
    .map((g) => ({
      id: String(g.id), name: g.name,
      parentId: g.parentId && rootIds.has(g.parentId) && g.parentId !== g.id ? g.parentId : null,
      // 只有顶层分组会用到：它下面"未归入二级分组"的组合桶排在第几个位置（0=最前）。
      // 用下标而不是"挂在哪个二级分组前面"，是因为"前面"这种指针式定位天然够不到"最后一个"这个位置
      // （没有任何二级分组可以代表"我后面"）。下标越界（比如二级分组变少了）渲染时会自动夹到合法范围
      directOrder: typeof g.directOrder === "number" ? g.directOrder : null,
    }));
  return {
    breakdownHidden: Array.isArray(raw.breakdownHidden) ? raw.breakdownHidden.filter((x) => typeof x === "string") : [],
    breakdownOrder: Array.isArray(raw.breakdownOrder) ? raw.breakdownOrder.filter((x) => typeof x === "string") : [],
    combos: Array.isArray(raw.combos) ? raw.combos.map(normalizeCombo).filter(Boolean) : [],
    comboGroups,
    timeBuckets: sanitizeTimeBoundaries(raw.timeBuckets),
  };
}
function normalizeCombo(c) {
  if (!c || typeof c !== "object" || !c.id) return null;
  let conditions = Array.isArray(c.conditions) ? c.conditions.map((f) => ({ ...newFilterRow(), ...f })) : [];
  // 老数据迁移：以前"只算Taken/排除人为错误"是组合自带的隐藏开关，现在改成用户自己在下面加条件。
  // 只在旧数据明确是 true（不是新组合缺这个字段）时才转成一条显式条件，避免升级后旧组合口径突然变宽
  if (c.scopeTaken === true) {
    const takenF = roleField("taken");
    if (takenF && !conditions.some((f) => f.fieldId === takenF.id)) {
      conditions = [{ ...newFilterRow(takenF.id), values: ["Taken"] }, ...conditions];
    }
  }
  if (c.scopeHE === true) {
    const heF = roleField("human_error");
    if (heF && !conditions.some((f) => f.fieldId === heF.id)) {
      conditions = [{ ...newFilterRow(heF.id), values: ["yes"], negate: true }, ...conditions];
    }
  }
  return {
    id: String(c.id),
    name: typeof c.name === "string" ? c.name : T("combo.untitled"),
    // tag 是旧版"可以做/要避免"标签留下的字段，功能已经被自定义分组取代，不再读它、不再给 UI 用，
    // 但也不主动清掉——老数据里如果还有值，原样保留，不强行丢用户的东西
    tag: c.tag === "do" || c.tag === "avoid" ? c.tag : "",
    // 指向 analysisPrefs.comboGroups 里的某个分组（顶层或二级都行）；""=未分组。
    // 这里不校验分组是否真的存在——分组被删掉后引用会变成"悬空"，渲染时按未分组处理，不会导致组合丢失
    groupId: typeof c.groupId === "string" ? c.groupId : "",
    conditions,
  };
}
function newComboId() { return "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function findCombo(id) { return analysisPrefs.combos.find((c) => c.id === id) || null; }

/* ---------- 组合分组：扁平列表 {id, name, parentId}，parentId=null 是顶层，最多两层 ---------- */
function newGroupId() { return "g_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function findComboGroup(id) { return (analysisPrefs.comboGroups || []).find((g) => g.id === id) || null; }
function comboGroupRoots() { return (analysisPrefs.comboGroups || []).filter((g) => !g.parentId); }
function comboGroupChildren(parentId) { return (analysisPrefs.comboGroups || []).filter((g) => g.parentId === parentId); }
// 组合实际归到哪：groupId 指向不存在的分组（比如分组被删了）一律按未分组处理，组合不会因此凭空消失
function comboEffectiveGroupId(combo) {
  return combo.groupId && findComboGroup(combo.groupId) ? combo.groupId : "";
}
// 删一个分组会连带删掉：它自己、它下面的二级分组、以及归在这些分组里的全部组合
function comboGroupCascadePreview(groupId) {
  const children = comboGroupChildren(groupId);
  const groupIds = new Set([groupId, ...children.map((g) => g.id)]);
  const combos = (analysisPrefs.combos || []).filter((c) => groupIds.has(comboEffectiveGroupId(c)));
  return { subgroupCount: children.length, comboCount: combos.length, comboIds: combos.map((c) => c.id) };
}
// 把顶层分组按 rootIdsInOrder 的顺序重建整个 comboGroups 数组，每个顶层后面紧跟着它自己的二级分组（保持各自原有相对顺序）
function rebuildComboGroupsOrder(rootIdsInOrder) {
  const next = [];
  rootIdsInOrder.forEach((rid) => {
    const root = findComboGroup(rid);
    if (root) next.push(root);
    comboGroupChildren(rid).forEach((sub) => next.push(sub));
  });
  analysisPrefs.comboGroups = next;
}
// 数组内两个元素换位置：把 draggedId 移到 targetId 原来所在的下标。
// 这个 splice 手法能够拖到"最后一个"——先把 dragged 移出数组会让它后面的元素整体前移一位，
// 这时再插入到 target 原始下标，如果 target 恰好是最后一个、dragged 排在它前面，就会正好落在数组末尾。
// （早期版本用的是"把 dragged 插到 target 前面"这种指针式模型，天生够不到最后一个位置，因为
//  没有任何东西能代表"排在最后一个的后面"——这就是这次要修的 bug 的根因）
function spliceReorder(ids, draggedId, targetId) {
  const fromIdx = ids.indexOf(draggedId), toIdx = ids.indexOf(targetId);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return null;
  const next = [...ids];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}
// "未归入二级分组"那个组合桶不是真的分组，没有自己的 id，用这个规律拼一个虚拟 key，
// 拖拽/收起状态复用跟真分组一样的机制（drag、collapsedComboGroups 都按普通字符串 key 处理）
const DIRECT_SUFFIX = "::direct";
function directGroupKey(rootId) { return rootId + DIRECT_SUFFIX; }
function parseDirectGroupKey(key) { return typeof key === "string" && key.endsWith(DIRECT_SUFFIX) ? key.slice(0, -DIRECT_SUFFIX.length) : null; }
function comboHasDirectCombos(rootId) { return (analysisPrefs.combos || []).some((c) => comboEffectiveGroupId(c) === rootId); }
// 某个顶层分组下"二级分组 + 未归入二级分组桶"的完整展示顺序，用一个 id 数组统一表示
// （虚拟桶用 directGroupKey 那个 key 代表自己），这样可以直接复用同一套 splice 重排逻辑
function comboSubgroupSlotIds(root, subgroups) {
  const ids = subgroups.map((s) => s.id);
  if (comboHasDirectCombos(root.id)) {
    let idx = root.directOrder;
    if (typeof idx !== "number" || idx < 0 || idx > ids.length) idx = ids.length;
    ids.splice(idx, 0, directGroupKey(root.id));
  }
  return ids;
}
// 某个顶层分组下，二级分组和虚拟桶之间的重排：统一走 spliceReorder，再拆回真实的二级分组顺序 + directOrder
function reorderComboSubgroupSlots(parentId, draggedId, targetId) {
  const root = findComboGroup(parentId);
  if (!root) return;
  const subgroups = comboGroupChildren(parentId);
  const next = spliceReorder(comboSubgroupSlotIds(root, subgroups), draggedId, targetId);
  if (!next) return;
  const dKey = directGroupKey(parentId);
  const newDirectIdx = next.indexOf(dKey);
  if (newDirectIdx !== -1) root.directOrder = newDirectIdx;
  const newSubIds = next.filter((id) => id !== dKey);
  const nextGroups = [];
  comboGroupRoots().forEach((r) => {
    nextGroups.push(r);
    if (r.id === parentId) newSubIds.forEach((sid) => { const s = findComboGroup(sid); if (s) nextGroups.push(s); });
    else comboGroupChildren(r.id).forEach((s) => nextGroups.push(s));
  });
  analysisPrefs.comboGroups = nextGroups;
}
// 拖一个分组标题到另一个上：只处理"同级"重排（两个都是顶层，或两个都在同一个顶层下面，
// 包括"未归入二级分组"这个虚拟桶）；跨级/换父不支持，直接忽略——不想因为拖拽手滑就把
// 二级分组挪到别的顶层下面
function moveComboGroup(draggedId, targetId) {
  const draggedRootId = parseDirectGroupKey(draggedId), targetRootId = parseDirectGroupKey(targetId);
  if (draggedRootId || targetRootId) {
    const dragged = findComboGroup(draggedId), target = findComboGroup(targetId);
    const parentId = draggedRootId || (dragged ? dragged.parentId : null);
    const targetParentId = targetRootId || (target ? target.parentId : null);
    if (!parentId || parentId !== targetParentId) return;
    reorderComboSubgroupSlots(parentId, draggedId, targetId);
    return;
  }
  const dragged = findComboGroup(draggedId), target = findComboGroup(targetId);
  if (!dragged || !target || dragged.parentId !== target.parentId) return;
  if (dragged.parentId === null) {
    const order = spliceReorder(comboGroupRoots().map((g) => g.id), draggedId, targetId);
    if (order) rebuildComboGroupsOrder(order);
  } else {
    reorderComboSubgroupSlots(dragged.parentId, draggedId, targetId);
  }
}

let analysisPrefsSaveTimer = null;
async function writeAnalysisPrefs() {
  analysisPrefsSaveTimer = null;
  if (viewingUserId || !sb || !session) return;
  const { error } = await sb.from("journal_schema").update({ analysis_prefs: analysisPrefs }).eq("user_id", session.user.id);
  if (error) {
    console.error(error);
    // 42703 = undefined_column，PGRST204 = PostgREST 缓存里没这一列，都说明那条 alter table 还没跑
    const missingColumn = error.code === "42703" || error.code === "PGRST204" || /analysis_prefs/.test(error.message || "");
    analysisPrefsError = missingColumn
      ? T("prefs.saveErrorMissingColumn")
      : T("prefs.saveError", { msg: error.message });
    render();
  } else if (analysisPrefsError) {
    analysisPrefsError = null;
    render();
  }
}
// 编辑组合时点一下选项就写一次库太吵，本地立刻生效、写库合并成 800ms 一次
function queueSaveAnalysisPrefs() {
  if (viewingUserId) return;
  if (analysisPrefsSaveTimer) clearTimeout(analysisPrefsSaveTimer);
  analysisPrefsSaveTimer = setTimeout(writeAnalysisPrefs, 800);
}
function flushAnalysisPrefs() {
  if (!analysisPrefsSaveTimer) return;
  clearTimeout(analysisPrefsSaveTimer);
  writeAnalysisPrefs();
}
async function saveAnalysisPrefsNow() {
  if (analysisPrefsSaveTimer) { clearTimeout(analysisPrefsSaveTimer); analysisPrefsSaveTimer = null; }
  await writeAnalysisPrefs();
}

/* ============================================================
   ANALYTICS ENGINE
   ============================================================ */
// 模型筛选（多选，空=全部）也算总览/拆解的口径之一，跟另外两个开关一样不影响组合
// 分析页当前在看的那批交易：总览数字、字段拆解、最大回撤全都用这一批，没有任何额外的隐藏过滤。
// 「看到的数字 = 面板里那几条条件筛出来的结果」是这一页唯一的口径规则，别再往里塞暗逻辑。
function analysisFilteredTrades() {
  return trades.filter((t) => analysisFilters.every((f) => tradeMatchesFilter(t, f)));
}
// Profit Factor：正R之和 ÷ |负R之和|。只统计真的填了 R 的那些交易，n 一并返回好让 UI 标注口径。
function profitFactorOf(list, rF) {
  if (!rF) return { pf: null, n: 0 };
  let gross = 0, loss = 0, n = 0;
  list.forEach((t) => {
    const raw = t[rF.id];
    if (raw === undefined || raw === null || raw === "") return;
    const v = parseFloat(raw);
    if (isNaN(v)) return;
    n++;
    if (v > 0) gross += v; else if (v < 0) loss += -v;
  });
  if (!n) return { pf: null, n: 0 };
  if (loss === 0) return { pf: gross > 0 ? Infinity : null, n };
  return { pf: gross / loss, n };
}
function fmtPF(pf) {
  if (pf === null || pf === undefined) return "—";
  if (pf === Infinity) return "∞";
  return pf.toFixed(2);
}
function pfColor(pf) {
  if (pf === null || pf === undefined) return "var(--muted)";
  if (pf === Infinity) return "var(--pos)";
  return pf >= 1 ? "var(--pos)" : "var(--neg)";
}
// 最大回撤：按交易日期把 R 累加成一条资金曲线，取「峰值 → 谷底」的最大跌幅，单位 R，返回正数。
// 只算真的填了 R 的交易；没填日期的排到最后，免得它们插进曲线中间把回撤算歪。
function maxDrawdownR(list, rF) {
  if (!rF) return null;
  const dateF = roleField("date");
  const rows = list.filter((t) => {
    const raw = t[rF.id];
    return raw !== undefined && raw !== null && raw !== "" && !isNaN(parseFloat(raw));
  });
  if (!rows.length) return null;
  const dayOf = (t) => (dateF && t[dateF.id] ? String(t[dateF.id]) : "9999-12-31");
  const ordered = rows.slice().sort((a, b) => {
    const da = dayOf(a), db = dayOf(b);
    if (da !== db) return da < db ? -1 : 1;
    return String(a._created_at || "").localeCompare(String(b._created_at || ""));
  });
  let equity = 0, peak = 0, maxDD = 0;
  ordered.forEach((t) => {
    equity += parseFloat(t[rF.id]);
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDD) maxDD = dd;
  });
  return { dd: maxDD, n: ordered.length };
}
// 标题栏那行摘要用的是固定口径（只算 Taken），故意不吃分析页的筛选：
// 它代表"这个账号现在整体什么水平"，不该被某一页里临时筛出来的一小撮交易带偏。
function headerStats() {
  const takenF = roleField("taken"), resultF = roleField("result"), rF = roleField("r_multiple");
  const list = takenF ? trades.filter((t) => t[takenF.id] === "Taken") : trades;
  const w = resultF ? list.filter((t) => t[resultF.id] === "W").length : 0;
  const l = resultF ? list.filter((t) => t[resultF.id] === "L").length : 0;
  let ev = null, hasR = false;
  if (rF) {
    const totalR = list.reduce((sum, t) => {
      if (t[rF.id] !== undefined && t[rF.id] !== "") { hasR = true; return sum + (parseFloat(t[rF.id]) || 0); }
      return sum;
    }, 0);
    ev = list.length ? totalR / list.length : null;
  }
  return { n: list.length, wr: w + l ? (w / (w + l)) * 100 : null, ev, hasR };
}
function computeStats() {
  const resultF = roleField("result"), takenF = roleField("taken"), rF = roleField("r_multiple");
  const list = analysisFilteredTrades();
  const isW = (t) => resultF && t[resultF.id] === "W";
  const isL = (t) => resultF && t[resultF.id] === "L";
  const isBEW = (t) => resultF && t[resultF.id] === "BE -> W";
  const isBEL = (t) => resultF && t[resultF.id] === "BE -> L";
  const isBE = (t) => resultF && t[resultF.id] === "BE";
  const w = list.filter(isW).length, l = list.filter(isL).length;
  const bew = list.filter(isBEW).length, bel = list.filter(isBEL).length, be = list.filter(isBE).length;
  const wr = w + l ? (w / (w + l)) * 100 : null;
  const sq = w + l + bew + bel ? ((w + bew) / (w + l + bew + bel)) * 100 : null;
  let totalR = null, ev = null;
  if (rF) { totalR = list.reduce((sum, t) => sum + (parseFloat(t[rF.id]) || 0), 0); ev = list.length ? totalR / list.length : null; }
  // Faded 这行是「当前这批里被放掉的」，不是从别处另算一批——分析页所有数字都出自同一个 list
  const faded = takenF ? list.filter((t) => t[takenF.id] === "Faded") : [];
  const pfInfo = profitFactorOf(list, rF);
  const ddInfo = maxDrawdownR(list, rF);
  // 拆解不在这里算：render() 每次重绘都会调 computeStats()，塞进来等于在设置页点个按钮也要把
  // 所有字段拆解白算一遍。拆解由 renderAnalytics() 拿 stats.list 单独算，只在分析页付这个代价。
  return { list, total: list.length, totalFaded: faded.length, w, l, be, bew, bel, wr, sq, totalR, ev,
           dd: ddInfo ? ddInfo.dd : null, ddSample: ddInfo ? ddInfo.n : 0,
           pf: pfInfo.pf, pfSample: pfInfo.n,
           fadedW: faded.filter(isW).length, fadedL: faded.filter(isL).length,
           hasResult: !!resultF, hasR: !!rF };
}

/* ============================================================
   近期表现 —— 按「创建日期」往回看几个滚动窗口
   问的是「我最近这几天录进来的单打得怎么样」。用创建日期而不是交易日期，是因为回测模式下
   交易日期可能是 2021 年的历史 K 线，只有创建日期才代表「我最近的判断水平」。

   三个窗口是故意重叠的（最近 3 天也在最近 30 天里），读法是「越往右越平滑」：
   最右边那格是当前分析范围的全体，当基准，前三格标相对它的差值。
   正因为重叠，它不能做成拆解卡——拆解卡各行的语义是互斥分桶，混进重叠窗口会让人以为笔数算错了。

   ⚠ 口径：切的是 computeStats() 那个 list，不是 trades。跟总览、拆解永远是同一批交易的时间切片，
   不是"从别处另算一批"。卡片上写明「基于当前分析范围」，用户改了上面的筛选这里会跟着动。
   ============================================================ */
const RECENT_WINDOWS = [3, 7, 30];
// 按本地自然日往回数，今天算第 1 天：最近 3 天 = 今天 + 昨天 + 前天。
// 不用「往回 72 小时」是因为那样同一批交易上午看和下午看结果会不一样
function recentWindowStats(list) {
  const resultF = roleField("result"), rF = roleField("r_multiple");
  const today = toDateStr(new Date());
  return RECENT_WINDOWS.map((days) => {
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const fromStr = toDateStr(from);
    const sub = list.filter((t) => {
      const c = localDateStr(t._created_at);
      return c && c >= fromStr && c <= today;
    });
    return { days, ...breakdownRowStats(T("recent.window", { n: days }), sub, resultF, rF) };
  });
}

/* ============================================================
   TIME BUCKETS —— 时间字段的分段拆解
   time 类型字段（入场时间这种）没法像 select 那样按值拆：每个 09:37 都是独一无二的值，
   拆出来是几十行 n=1。所以按用户定义的边界切成时间段，用「这个时段的胜率」来拆。

   边界存 analysisPrefs.timeBuckets，是一串 "HH:MM"，n 个边界切出 n-1 段，左闭右开：
   ["09:30","09:45","10:00"] → [09:30,09:45) 和 [09:45,10:00)，09:45 那笔算后一段。
   默认这套是美股 RTH（开盘 09:30 起，前半小时切细、后面放宽），记纽约数据直接能用；
   记 London/Asia 时段的用户在「拆解显示设置」里改成自己的边界。
   落在所有段之外的交易归到最后一行「其他时段」，不静默丢掉——否则用户会觉得笔数对不上。

   ⚠ 这里全是 "HH:MM" 的字符串比较，不转数字：值本来就是 normalizeTimeValue() 补过零的
   两位小时+两位分钟，字典序等于时间序。别改成 parseInt，那样 09:30 会变成 930 反而要处理进位。

   ⚠ DEFAULT_TIME_BUCKETS 不在这一段里，它被提到文件最上面的 STATE 之前去了——
   defaultAnalysisPrefs() 在模块加载时就被调用（let analysisPrefs = defaultAnalysisPrefs()），
   const 放在这里的话那次调用会撞上 TDZ，整个 app.js 直接起不来。
   ============================================================ */
// 清洗一串边界：去掉解析不出来的、去重、排序。不足 2 个（切不出任何一段）就回落到默认，
// 免得用户不小心清空之后时间拆解卡整张消失、还不知道为什么
function sanitizeTimeBoundaries(raw) {
  if (!Array.isArray(raw)) return DEFAULT_TIME_BUCKETS.slice();
  const seen = new Set();
  raw.forEach((v) => {
    const norm = normalizeTimeValue(v);
    if (norm) seen.add(norm);
  });
  const list = Array.from(seen).sort();
  return list.length >= 2 ? list : DEFAULT_TIME_BUCKETS.slice();
}
// 用户在输入框里随便怎么分隔（逗号 / 中文逗号 / 空格 / 顿号）都认
function parseTimeBoundaryInput(text) {
  return sanitizeTimeBoundaries(String(text || "").split(/[,，、\s]+/).filter(Boolean));
}
function currentTimeBoundaries() {
  return sanitizeTimeBoundaries(analysisPrefs.timeBuckets);
}
// 边界 → 段。每段 { label, start, end }，end 是开区间上界
function timeBucketDefs() {
  const b = currentTimeBoundaries();
  const out = [];
  for (let i = 0; i < b.length - 1; i++) out.push({ label: b[i] + "–" + b[i + 1], start: b[i], end: b[i + 1] });
  return out;
}
// 段是左闭右开 [start, end)，但筛选行的时间区间是两头都闭的（tradeMatchesFilter 里 tv > rangeEnd 才排除）。
// 直接把 end 填进筛选，09:45 那笔会同时算进 [09:30,09:45) 这一行和它生成的组合里，两个数字对不上。
// 时间精度就是分钟，所以退一分钟正好等价。
function timeMinusOneMinute(hhmm) {
  const [h, m] = String(hhmm).split(":").map((x) => parseInt(x, 10));
  if (isNaN(h) || isNaN(m)) return hhmm;
  const total = h * 60 + m - 1;
  if (total < 0) return "00:00";
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}
// 一笔交易的时间值落在第几段；返回 -1 表示落在所有段之外（归「其他时段」）
function timeBucketIndexOf(value, defs) {
  const v = normalizeTimeValue(value);
  if (!v) return -1;
  for (let i = 0; i < defs.length; i++) if (v >= defs[i].start && v < defs[i].end) return i;
  return -1;
}

/* ---------- 字段拆解 ---------- */
// 能拆解的字段：所有 select/multiselect（只排掉「结果」角色——按 result 拆是自我循环，W 那行必然 100%），
// 外加所有 time 字段（按上面那套时间段分桶）。跟项目其他地方一样只认 type/role，不认字段叫什么名字，
// 所以以后加个「出场时间」字段也会自动多出一张拆解卡
function breakdownCandidateFields() {
  const all = schema.filter((f) => (f.type === "select" || f.type === "multiselect" || f.type === "time") && f.role !== "result");
  const order = analysisPrefs.breakdownOrder || [];
  const ranked = [], rest = [];
  all.forEach((f) => (order.includes(f.id) ? ranked : rest).push(f));
  ranked.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  // 用户没排过的：taken / 人为错误 这两个信息量低，默认沉到最后
  const lowSignal = (f) => (f.role === "taken" || f.role === "human_error" ? 1 : 0);
  rest.sort((a, b) => lowSignal(a) - lowSignal(b));
  return ranked.concat(rest);
}
function visibleBreakdownFields() {
  const hidden = analysisPrefs.breakdownHidden || [];
  return breakdownCandidateFields().filter((f) => !hidden.includes(f.id));
}
// 一个选项值下面那批交易的统计。n 是全部笔数（含 BE 系列），胜率分母只算 W 和 L。
function breakdownRowStats(value, list, resultF, rF) {
  const res = (t) => (resultF ? t[resultF.id] : "");
  const w = list.filter((t) => res(t) === "W").length;
  const l = list.filter((t) => res(t) === "L").length;
  const be = list.filter((t) => { const v = res(t); return v === "BE" || v === "BE -> W" || v === "BE -> L"; }).length;
  const wr = w + l ? (w / (w + l)) * 100 : null;
  let totalR = null, ev = null, hasR = false;
  if (rF) {
    totalR = list.reduce((s, t) => {
      const raw = t[rF.id];
      if (raw === undefined || raw === null || raw === "") return s;
      hasR = true;
      return s + (parseFloat(raw) || 0);
    }, 0);
    ev = list.length ? totalR / list.length : null;
  }
  const pfInfo = profitFactorOf(list, rF);
  return { value, w, l, be, n: list.length, wr, totalR, ev, hasR, pf: pfInfo.pf };
}
// 拆解行的排序。默认按笔数，找 edge 时按「离整体多远」或按 EV 更快。
// 排序在渲染时做（要用到整批的胜率做基准），computeBreakdowns 里那次按 n 排只是给个稳定的初始顺序
function sortBreakdownRows(rows, baseWr) {
  const arr = rows.slice();
  if (breakdownSort === "delta") {
    const d = (r) => (r.wr === null || baseWr === null || baseWr === undefined ? -Infinity : Math.abs(r.wr - baseWr));
    arr.sort((a, b) => (d(b) - d(a)) || (b.n - a.n));
  } else if (breakdownSort === "ev") {
    const e = (r) => (r.hasR && r.ev !== null && r.ev !== undefined ? r.ev : -Infinity);
    arr.sort((a, b) => (e(b) - e(a)) || (b.n - a.n));
  } else {
    arr.sort((a, b) => b.n - a.n);
  }
  return arr;
}
// 一张拆解卡的行：样本够的正常画，样本不足的默认折成一行「其他 N 项」，点开才展开。
// 折叠只在有 2 行以上可折时才做——折 1 行既不省高度又少了信息
function breakdownRowsHtml(field, rows, baseWr) {
  const strong = rows.filter((r) => r.n >= BREAKDOWN_MIN_SAMPLE);
  const weak = rows.filter((r) => r.n < BREAKDOWN_MIN_SAMPLE);
  let html = strong.map((r) => barRow(r, field.id, baseWr)).join("");
  if (!weak.length) return html;
  if (weak.length < 2) return html + weak.map((r) => barRow(r, field.id, baseWr)).join("");
  const open = expandedLowSample.has(field.id);
  if (open) {
    html += weak.map((r) => barRow(r, field.id, baseWr)).join("");
    html += `<button class="bdFoldRow" data-action="toggle-low-sample" data-field="${esc(field.id)}">${ICONS.chevUp} ${esc(T("breakdown.foldBack"))}</button>`;
  } else {
    const wn = weak.reduce((sum, r) => sum + r.n, 0);
    html += `<button class="bdFoldRow" data-action="toggle-low-sample" data-field="${esc(field.id)}" title="${esc(T("breakdown.lowSampleTitle", { n: BREAKDOWN_MIN_SAMPLE }))}">${ICONS.chevDown} ${esc(T("breakdown.folded", { k: weak.length, n: wn }))}</button>`;
  }
  return html;
}
// 时间字段的拆解：按段分桶，空桶不出行（一张全是"—"的卡没意义），
// 但顺序必须原样保留——时间轴打乱了就读不出「开盘那半小时最好、11 点以后最差」这种趋势。
// ordered:true 就是告诉渲染层「这张卡别排序、别折叠」
function computeTimeBreakdown(field, list, resultF, rF) {
  const defs = timeBucketDefs();
  const buckets = defs.map(() => []);
  const other = [];
  list.forEach((t) => {
    const raw = t[field.id];
    if (raw === undefined || raw === null || raw === "") return;
    const i = timeBucketIndexOf(raw, defs);
    if (i < 0) other.push(t); else buckets[i].push(t);
  });
  const rows = [];
  defs.forEach((d, i) => {
    if (!buckets[i].length) return;
    // 带上区间，行末的「+组合」才能建出 time 字段能用的区间条件（而不是 select 那种 values 条件）
    rows.push({ ...breakdownRowStats(d.label, buckets[i], resultF, rF), rangeStart: d.start, rangeEnd: timeMinusOneMinute(d.end) });
  });
  // 「其他时段」是所有段的补集，没法用一个连续区间表示，所以这行不给「+组合」按钮
  if (other.length) rows.push({ ...breakdownRowStats(T("breakdown.timeOther"), other, resultF, rF), noCombo: true });
  return { field, rows, ordered: true };
}
function computeBreakdowns(list) {
  const resultF = roleField("result"), rF = roleField("r_multiple");
  return visibleBreakdownFields().map((f) => {
    if (f.type === "time") return computeTimeBreakdown(f, list, resultF, rF);
    const map = {};
    list.forEach((t) => {
      let vals = t[f.id];
      if (vals === undefined || vals === null || vals === "") return;
      if (!Array.isArray(vals)) vals = [vals];
      // 多选字段一笔交易会落进多行，所以各行 n 之和可能大于总笔数，这是预期行为
      vals.forEach((v) => { if (v === "" || v === null || v === undefined) return; if (!map[v]) map[v] = []; map[v].push(t); });
    });
    const rows = Object.entries(map)
      .map(([value, sub]) => breakdownRowStats(value, sub, resultF, rF))
      .sort((a, b) => b.n - a.n);
    return { field: f, rows };
  }).filter((b) => b.rows.length > 0);
}
/* ---------- 组合 ---------- */
// 组合的完整筛选条件 = 用户自己加的条件（想只算 Taken / 排除人为错误，自己在下面加一行）。
// 组合卡片的统计和「跳到记录页」都走这一个函数，两边数字才能保证一模一样。
function comboFilterRows(combo) {
  return (combo.conditions || []).map((f) => ({ ...f, values: [...(f.values || [])] }));
}
function comboMatchedTrades(combo) {
  const rows = comboFilterRows(combo);
  return trades.filter((t) => rows.every((f) => tradeMatchesFilter(t, f)));
}
function comboStats(combo) {
  const list = comboMatchedTrades(combo);
  const resultF = roleField("result"), rF = roleField("r_multiple");
  return breakdownRowStats(combo.name, list, resultF, rF);
}
// tradeMatchesFilter 找不到字段时会 return true，也就是删掉字段后组合会悄悄变成「匹配全部交易」，
// 数字突然变好看却毫无提示。所以渲染前先把这类失效条件挑出来。
function comboIssues(combo) {
  const hard = [], soft = [];
  (combo.conditions || []).forEach((f, i) => {
    const no = i + 1;
    if (!f.fieldId) { soft.push(T("combo.issue.noField", { no })); return; }
    const field = resolveField(f.fieldId);
    if (!field) { hard.push(T("combo.issue.fieldDeleted", { no })); return; }
    if (field.type === "select" || field.type === "multiselect") {
      const opts = field.options || [];
      const missing = (f.values || []).filter((v) => !opts.includes(v));
      if (missing.length) hard.push(T("combo.issue.missingOptions", { label: field.label, opts: listJoin(missing) }));
      if (!(f.values || []).length) soft.push(T("combo.issue.noValues", { label: field.label }));
    } else if (field.type === "date" || field.type === "time") {
      if (!f.rangeStart && !f.rangeEnd) soft.push(T("combo.issue.noRange", { label: field.label }));
    } else if (!f.textValue) {
      soft.push(T("combo.issue.noText", { label: field.label }));
    }
  });
  return { hard, soft };
}
// 卡片上那行人话版的条件描述
function comboConditionsText(combo) {
  const parts = [];
  (combo.conditions || []).forEach((f) => {
    const field = resolveField(f.fieldId);
    if (!field) { parts.push(T("combo.cond.fieldDeleted")); return; }
    if (field.type === "select" || field.type === "multiselect") {
      if (!(f.values || []).length) return;
      const join = f.matchMode === "and" ? T("combo.cond.and") : " / ";
      parts.push(`${field.label} ${f.negate ? "≠" : "="} ${f.values.join(join)}`);
    } else if (field.type === "date" || field.type === "time") {
      if (!f.rangeStart && !f.rangeEnd) return;
      parts.push(`${field.label} ${f.rangeStart || "…"}~${f.rangeEnd || "…"}`);
    } else if (f.textValue) {
      parts.push(T("combo.cond.contains", { label: field.label, value: f.textValue }));
    }
  });
  return parts.length ? parts.join(" · ") : T("combo.cond.none");
}
const COMBO_SMALL_SAMPLE = 10;

function computeMonthCoverageForYear(year) {
  const dateF = roleField("date");
  const monthsData = {};
  for (let i = 1; i <= 12; i++) monthsData[String(i).padStart(2, "0")] = { first: false, second: false };
  if (dateF) {
    trades.forEach((t) => {
      const raw = t[dateF.id];
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d.getTime()) || d.getFullYear() !== year) return;
      const mo = String(d.getMonth() + 1).padStart(2, "0"), day = d.getDate();
      if (day >= 1 && day <= 10) monthsData[mo].first = true;
      if (day >= 20) monthsData[mo].second = true;
    });
  }
  const result = {};
  Object.entries(monthsData).forEach(([mo, v]) => {
    result[mo] = { ...v, status: v.first && v.second ? "complete" : v.first || v.second ? "partial" : "empty" };
  });
  return result;
}

// Aggregate a set of trades (already filtered by the user's own filter panel) into a stats
// object for one day / one month. Colors by R sum when an r_multiple field exists; falls back
// to W/L balance otherwise. Does NOT apply any additional hidden filtering — what's passed in
// is exactly what gets counted, so the calendar only ever hides what the user filtered out above.
function aggregateTradeStats(list) {
  const rF = roleField("r_multiple"), resultF = roleField("result");
  const clean = list;
  let rSum = 0, hasR = false;
  if (rF) clean.forEach((t) => { if (t[rF.id] !== undefined && t[rF.id] !== "") { rSum += parseFloat(t[rF.id]) || 0; hasR = true; } });
  const w = resultF ? clean.filter((t) => t[resultF.id] === "W").length : 0;
  const l = resultF ? clean.filter((t) => t[resultF.id] === "L").length : 0;
  let tone = "neutral";
  if (hasR) tone = rSum > 0.0001 ? "pos" : rSum < -0.0001 ? "neg" : "neutral";
  else if (w + l > 0) tone = w > l ? "pos" : w < l ? "neg" : "neutral";
  const wr = (w + l) > 0 ? (w / (w + l)) * 100 : null;
  return { count: clean.length, takenCount: clean.length, rSum, hasR, w, l, wr, tone };
}
function tradesOnDate(dateStr) {
  const dateF = roleField("date");
  if (!dateF) return [];
  return trades.filter((t) => (t[dateF.id] || "") === dateStr && activeFilters.every((f) => tradeMatchesFilter(t, f)));
}
function tradesInMonth(year, month) {
  const dateF = roleField("date");
  if (!dateF) return [];
  const prefix = year + "-" + String(month).padStart(2, "0");
  return trades.filter((t) => String(t[dateF.id] || "").startsWith(prefix) && activeFilters.every((f) => tradeMatchesFilter(t, f)));
}

/* ============================================================
   DATA LAYER — Supabase
   ============================================================ */
async function loadProfile() {
  const { data, error } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
  if (error) { console.error(error); currentProfile = null; return; }
  currentProfile = data;
  syncLangFromProfile();
  sb.rpc("touch_last_seen").then(({ error: e }) => { if (e) console.error(e); });
}
async function loadAll() {
  if (!sb || !session) return;
  try {
    const uid = viewingUserId || session.user.id;
    const { data: schemaRow, error: e1 } = await sb.from("journal_schema").select("*").eq("user_id", uid).single();
    if (e1 && e1.code !== "PGRST116") throw e1;
    if (!schemaRow || !schemaRow.fields || !schemaRow.fields.length) {
      // 新账号：按注册/首次登录时的界面语言把默认字段落库，之后就归用户所有
      const seeded = defaultSchema();
      schema = seeded;
      if (!viewingUserId) await sb.from("journal_schema").upsert({ user_id: uid, fields: seeded, card_fields: [] });
    } else {
      schema = schemaRow.fields;
    }
    cardFields = (schemaRow && Array.isArray(schemaRow.card_fields)) ? schemaRow.card_fields : [];
    analysisPrefs = normalizeAnalysisPrefs(schemaRow && schemaRow.analysis_prefs);
    const { data: tradeRows, error: e2 } = await sb.from("trades").select("*")
      .eq("user_id", uid).eq("mode", recordMode).order("created_at", { ascending: true });
    if (e2) throw e2;
    trades = (tradeRows || []).map((r) => ({ id: r.id, _created_at: r.created_at, _updated_at: r.updated_at, ...r.data }));
    loadError = null;

    try {
      const { data: logRows, error: e3 } = await sb.from("changelog").select("*").order("created_at", { ascending: false });
      if (!e3) changelog = logRows || [];
    } catch (e) { /* changelog table may not exist yet */ }

    // 复盘：表可能还没建，loadReviews 内部自己降级，不会影响这次 loadAll 的其他部分
    try { await loadReviews(); } catch (e) { console.error(e); }

    // 分析页筛选：本地存过就用存的，没存过给默认（只看 Taken）。跟记录页那份各存各的，互不影响
    seedAnalysisFilters();

    if (!defaultFiltersSeeded && !viewingUserId) {
      defaultFiltersSeeded = true;
      const saved = loadSavedFilters();
      if (saved) {
        activeFilters = saved;
      } else {
        const modelF = roleField("model"), takenF = roleField("taken");
        const seed = [];
        if (modelF) seed.push(newFilterRow(modelF.id));
        if (takenF) seed.push(newFilterRow(takenF.id));
        if (seed.length) activeFilters = seed;
      }
    }
  } catch (err) {
    console.error(err);
    loadError = T("error.loadData");
    schema = defaultSchema(); trades = [];
  }
}
async function persistSchema(next) {
  if (viewingUserId) return;
  schema = next;
  render();
  if (!sb || !session) return;
  const { error } = await sb.from("journal_schema").update({ fields: next }).eq("user_id", session.user.id);
  if (error) console.error(error);
}
async function persistCardFields(next) {
  if (viewingUserId) return;
  cardFields = next;
  render();
  if (!sb || !session) return;
  const { error } = await sb.from("journal_schema").update({ card_fields: next }).eq("user_id", session.user.id);
  if (error) console.error(error);
}
async function persistTrade(trade) {
  if (viewingUserId) return;
  const clean = { ...trade };
  const id = clean.id; delete clean.id; delete clean._isNew; delete clean._resumedDraft;
  delete clean._created_at; delete clean._updated_at;
  if (!sb || !session) return;
  const { error } = await sb.from("trades").upsert({ id, user_id: session.user.id, mode: recordMode, data: clean, updated_at: new Date().toISOString() });
  if (error) { console.error(error); alert(T("error.saveTrade", { msg: error.message })); return; }
  await loadAll(); render();
}
async function removeTrade(id) {
  if (viewingUserId) return;
  if (!sb || !session) return;
  const { error } = await sb.from("trades").delete().eq("id", id).eq("user_id", session.user.id);
  if (error) console.error(error);
  await loadAll(); render();
}
async function addOptionToField(fieldId, opt) {
  if (viewingUserId) return;
  const next = schema.map((f) => (f.id === fieldId ? { ...f, options: [...(f.options || []), opt] } : f));
  await persistSchema(next);
}
const DRAFT_KEY = "journal_trade_draft";
function saveDraft() {
  if (!editingTrade || !editingTrade._isNew) return;
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(formDraft)); } catch (e) {}
}
function loadDraft() {
  try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
}
async function addChangelogEntry(text) {
  if (!sb || !text.trim()) return;
  const { error } = await sb.from("changelog").insert({ entry: text.trim() });
  if (error) { alert(T("error.publish", { msg: error.message })); return; }
  await loadAll(); render();
}
async function removeChangelogEntry(id) {
  if (!sb) return;
  const { error } = await sb.from("changelog").delete().eq("id", id);
  if (error) console.error(error);
  await loadAll(); render();
}

/* ============================================================
   复盘（REVIEWS）—— 数据层
   表可能还没建（用户没跑 docs/reviews-migration.sql），所有读写都要
   能优雅降级：置 reviewsTableMissing，页面提示去跑 SQL，别把整个 app 拖垮。
   ============================================================ */
const REVIEW_MISSING_CODES = ["42P01", "PGRST205", "PGRST202"];
function isMissingTableError(err) {
  if (!err) return false;
  if (REVIEW_MISSING_CODES.includes(err.code)) return true;
  return /journal_reviews/.test(err.message || "") && /(does not exist|schema cache)/i.test(err.message || "");
}
function newReviewId() { return "r_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

async function loadReviews() {
  if (!sb || !session) return;
  const uid = viewingUserId || session.user.id;
  const { data, error } = await sb.from("journal_reviews").select("*")
    .eq("user_id", uid).order("created_at", { ascending: false });
  if (error) {
    if (isMissingTableError(error)) { reviewsTableMissing = true; reviews = []; return; }
    console.error(error); reviews = []; return;
  }
  reviewsTableMissing = false;
  reviews = data || [];
}

/* 正文里抽出所有 [[trade:xxx]]，存进 linked_trade_ids 当冗余索引。
   正文永远是唯一真相，这一列只是给「这笔交易被哪几篇提到」之类的反查用。 */
function extractTradeRefs(body) {
  const out = [];
  const re = /\[\[trade:([A-Za-z0-9_-]+)\]\]/g;
  let m;
  while ((m = re.exec(body || ""))) { if (!out.includes(m[1])) out.push(m[1]); }
  return out;
}

async function persistReview(rev, opts) {
  if (viewingUserId || !sb || !session) return false;
  const row = {
    id: rev.id,
    user_id: session.user.id,
    title: rev.title || "",
    body: rev.body || "",
    week_start: rev.week_start || null,
    linked_trade_ids: extractTradeRefs(rev.body),
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from("journal_reviews").upsert(row);
  if (error) {
    if (isMissingTableError(error)) { reviewsTableMissing = true; reviewSaveError = T("review.tableMissing"); return false; }
    console.error(error);
    reviewSaveError = T("review.saveFailed", { msg: error.message });
    return false;
  }
  reviewSaveError = null;
  // 本地列表同步更新，不重新拉全表——编辑器开着时任何 loadAll 都是多余的网络往返
  const i = reviews.findIndex((r) => r.id === row.id);
  if (i >= 0) reviews[i] = { ...reviews[i], ...row };
  else reviews.unshift({ ...row, created_at: new Date().toISOString() });
  if (!(opts && opts.silent)) clearReviewDraft();
  return true;
}

async function deleteReview(id) {
  if (viewingUserId || !sb || !session) return;
  const { error } = await sb.from("journal_reviews").delete().eq("id", id).eq("user_id", session.user.id);
  if (error) { console.error(error); return; }
  reviews = reviews.filter((r) => r.id !== id);
}

/* 本地草稿：数据库那边是 debounce 保存，中间这一秒断网/关标签页靠这个兜底。
   跟交易草稿（journal_trade_draft）各存各的，互不影响。 */
const REVIEW_DRAFT_KEY = "journal_review_draft";
function saveReviewDraft() {
  if (!editingReview) return;
  try { localStorage.setItem(REVIEW_DRAFT_KEY, JSON.stringify(editingReview)); } catch (e) {}
}
function loadReviewDraft() {
  try { const raw = localStorage.getItem(REVIEW_DRAFT_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function clearReviewDraft() {
  try { localStorage.removeItem(REVIEW_DRAFT_KEY); } catch (e) {}
}

/* ============================================================
   AUTH
   ============================================================ */
function friendlyAuthError(msg) {
  const m = (msg || "").toLowerCase();
  // 匹配的是 Supabase 返回的英文原文，跟界面语言无关；只有返回给用户看的那句要翻译
  if (m.includes("invalid login credentials")) return T("auth.err.badCredentials");
  if (m.includes("email not confirmed")) return T("auth.err.notConfirmed");
  if (m.includes("user already registered") || m.includes("already registered")) return T("auth.err.alreadyRegistered");
  if (m.includes("password") && m.includes("6")) return T("auth.err.passwordShort");
  if (m.includes("rate limit") || m.includes("too many")) return T("auth.err.rateLimit");
  if (m.includes("network") || m.includes("fetch")) return T("auth.err.network");
  return T("auth.err.generic");
}
async function doLogin(email, password, remember) {
  authBusy = true; authError = ""; authSuccess = ""; rememberMe = remember; render();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  authBusy = false;
  if (error) { authError = friendlyAuthError(error.message); render(); }
}
async function doRegister(email, password) {
  authBusy = true; authError = ""; authSuccess = ""; rememberMe = true; render();
  const { error } = await sb.auth.signUp({ email, password });
  authBusy = false;
  if (error) { authError = friendlyAuthError(error.message); render(); return; }
  authSuccess = T("auth.registerSuccess");
  authScreenMode = "login"; render();
}
async function doLogout() {
  await sb.auth.signOut();
}
async function loadAdminUsers() {
  if (!sb || !currentProfile || currentProfile.role !== "admin") return;
  const { data, error } = await sb.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) { console.error(error); adminUsers = []; return; }
  adminUsers = data || [];
  try {
    const { data: tradeRows, error: e2 } = await sb.from("trades").select("user_id");
    if (!e2 && tradeRows) {
      const counts = {};
      tradeRows.forEach((r) => { counts[r.user_id] = (counts[r.user_id] || 0) + 1; });
      adminUsers = adminUsers.map((u) => ({ ...u, tradeCount: counts[u.id] || 0 }));
    }
  } catch (e) { console.error(e); }
}
function sortAdminUsers(list) {
  const key = adminUsersSortBy;
  const dir = adminUsersSortDir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    let av = a[key], bv = b[key];
    if (key === "tradeCount") { av = av || 0; bv = bv || 0; }
    else { av = av ? new Date(av).getTime() : 0; bv = bv ? new Date(bv).getTime() : 0; }
    return (av - bv) * dir;
  });
}
async function setUserActive(userId, active) {
  const { error } = await sb.from("profiles").update({ active }).eq("id", userId);
  if (error) { alert(T("error.action", { msg: error.message })); return; }
  await loadAdminUsers(); render();
}
async function setUserRole(userId, role) {
  const { error } = await sb.from("profiles").update({ role }).eq("id", userId);
  if (error) { alert(T("error.action", { msg: error.message })); return; }
  await loadAdminUsers(); render();
}

async function updateOwnProfile(displayName, gender) {
  profileBusy = true; profileError = ""; profileSuccess = ""; render(); renderSecondaryModals(true);
  const { error } = await sb.rpc("update_own_profile", { new_display_name: displayName, new_gender: gender || null });
  profileBusy = false;
  if (error) { profileError = T("profile.saveFailed"); render(); renderSecondaryModals(true); return; }
  await loadProfile();
  profileSuccess = T("profile.saved");
  render(); renderSecondaryModals(true);
}
async function changeOwnPassword(currentPw, newPw, confirmPw) {
  passwordError = ""; passwordSuccess = "";
  if (!currentPw || !newPw || !confirmPw) { passwordError = T("password.allRequired"); render(); renderSecondaryModals(true); return; }
  if (newPw.length < 6) { passwordError = T("password.tooShort"); render(); renderSecondaryModals(true); return; }
  if (newPw !== confirmPw) { passwordError = T("password.mismatch"); render(); renderSecondaryModals(true); return; }
  passwordBusy = true; render(); renderSecondaryModals(true);
  const { error: verifyErr } = await sb.auth.signInWithPassword({ email: session.user.email, password: currentPw });
  if (verifyErr) {
    passwordBusy = false; passwordError = T("password.currentWrong"); render(); renderSecondaryModals(true); return;
  }
  const { error: updateErr } = await sb.auth.updateUser({ password: newPw });
  passwordBusy = false;
  if (updateErr) { passwordError = T("password.changeFailed", { msg: updateErr.message }); render(); renderSecondaryModals(true); return; }
  passwordSuccess = T("password.changed");
  render(); renderSecondaryModals(true);
}

/* ============================================================
   RENDER — GRID VIEW
   ============================================================ */
function newFilterRow(fieldId) {
  return { fieldId: fieldId || "", values: [], negate: false, matchMode: "or", rangeStart: "", rangeEnd: "", textValue: "" };
}
// 三个地方共用同一套筛选行 DOM 和事件处理，靠元素上的属性区分改的是哪个数组：
//   data-filter-ctx="analysis" → 分析页的 analysisFilters
//   data-combo-id="c_xxx"      → 那个组合的 conditions
//   两个都没有                 → 记录页的 activeFilters
// ⚠ 加新的筛选入口时一定要带上自己的上下文属性，否则会默默落到记录页那份上，把用户的记录页筛选改掉
function filterCtxOf(el) {
  if (el.dataset.filterCtx === ANALYSIS_CTX) return { arr: analysisFilters, comboId: "", scope: ANALYSIS_CTX };
  const comboId = el.dataset.comboId || "";
  if (!comboId) return { arr: activeFilters, comboId: "", scope: "grid" };
  const c = findCombo(comboId);
  return c ? { arr: c.conditions, comboId, scope: "combo" } : null;
}
// 分析页筛选变了：存自己那份 localStorage，顺便标记"套进来的组合已经被改过"
function afterAnalysisFilterChange() {
  analysisComboDirty = !!analysisComboId;
  saveAnalysisFilters();
  render();
}
function afterFilterChange(ctx) {
  if (ctx.scope === ANALYSIS_CTX) { afterAnalysisFilterChange(); return; }
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
  if (!f.textValue) return true;
  const tv = tradeFieldValue(t, field);
  return String(tv === undefined || tv === null ? "" : tv).toLowerCase().includes(String(f.textValue).toLowerCase());
}
// comboId 为空 = 记录页的 activeFilters；有值 = 分析页某个组合的条件。
// 两边共用同一套 DOM 结构和事件处理，靠 data-combo-id 区分改哪个数组。
// ctx: "" = 记录页 / ANALYSIS_CTX = 分析页 / 其他字符串 = 组合 id
function filterCtxAttr(ctx) {
  if (!ctx) return "";
  return ctx === ANALYSIS_CTX ? ` data-filter-ctx="${ANALYSIS_CTX}"` : ` data-combo-id="${esc(ctx)}"`;
}
// 选项超过这个数，筛选行默认只显示已选中的那几个，其余收进「+N 更多」。
// 5 是按「一行放得下」定的：超过就会折行，条件卡立刻高一倍。
// 分析页和记录页/月度页都启用；组合编辑器不启用——那是个专门展开来编辑条件的地方，
// 正在挑值的时候把选项藏起来只会碍事
const COLLAPSE_CHIPS_OVER = 5;
// 展开状态的 key 必须带上下文，否则记录页第 0 行和分析页第 0 行会互相影响
function chipKey(ctx, idx) {
  return (ctx === ANALYSIS_CTX ? "analysis" : ctx || "grid") + ":" + idx;
}
function filterRowValuesHtml(field, idx, f, ctx) {
  const cid = filterCtxAttr(ctx);
  if (field.type === "select" || field.type === "multiselect") {
    const vals = f.values || [];
    const opts = field.options || [];
    // 选项被删掉但条件里还留着的，也列出来并标红，否则用户根本看不见问题在哪
    const ghosts = vals.filter((v) => !opts.includes(v));
    const collapsible = (ctx === ANALYSIS_CTX || !ctx) && opts.length > COLLAPSE_CHIPS_OVER;
    const key = chipKey(ctx, idx);
    const expanded = !collapsible || expandedFilterChips.has(key);
    const shown = expanded ? opts : opts.filter((o) => vals.includes(o));
    const hiddenCount = opts.length - shown.length;
    return `<div class="chipGroup" style="margin-top:8px;">
      ${shown.map((o) => `<button type="button" class="chip ${vals.includes(o) ? "active" : ""}" data-action="toggle-filter-value" data-idx="${idx}" data-val="${esc(o)}"${cid}>${esc(o)}</button>`).join("")}
      ${ghosts.map((o) => `<button type="button" class="chip active" style="border-color:var(--neg);color:var(--neg);background:var(--negSoft);" title="${esc(T("filter.ghostOption"))}" data-action="toggle-filter-value" data-idx="${idx}" data-val="${esc(o)}"${cid}>${esc(o)} ⚠</button>`).join("")}
      ${collapsible ? `<button type="button" class="chip chipMore" data-action="toggle-filter-chips" data-chip-key="${esc(key)}">${esc(expanded ? T("filter.chipsCollapse") : T("filter.chipsMore", { n: hiddenCount }))}</button>` : ""}
    </div>`;
  }
  if (field.type === "date") {
    return `<div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
      <input type="date" class="select" data-filter-range="${idx}" data-bound="start"${cid} value="${esc(f.rangeStart || "")}" />
      <span style="color:var(--mutedDark);font-size:12px;">${T("filter.rangeTo")}</span>
      <input type="date" class="select" data-filter-range="${idx}" data-bound="end"${cid} value="${esc(f.rangeEnd || "")}" />
    </div>`;
  }
  if (field.type === "time") {
    return `<div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
      <input type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM" class="select mono" data-filter-range="${idx}" data-bound="start" data-time-input${cid} value="${esc(f.rangeStart || "")}" oninput="window.__formatTimeInput(this)" />
      <span style="color:var(--mutedDark);font-size:12px;">${T("filter.rangeTo")}</span>
      <input type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM" class="select mono" data-filter-range="${idx}" data-bound="end" data-time-input${cid} value="${esc(f.rangeEnd || "")}" oninput="window.__formatTimeInput(this)" />
    </div>
    <div style="font-size:10.5px;color:var(--mutedDark);margin-top:5px;">${T("filter.timeHint")}</div>`;
  }
  return `<div style="margin-top:8px;"><input type="text" class="select" data-filter-text="${idx}"${cid} value="${esc(f.textValue || "")}" placeholder="${esc(T("filter.containsPlaceholder"))}" /></div>`;
}
// 一整行筛选条件（字段下拉 + AND/取反开关 + 值），记录页 / 分析页 / 组合编辑器共用
// 拖拽排序只有记录页那份有：条件之间是 AND，顺序不影响结果，另外两处的拖拽代码是直接绑死 activeFilters 的
function filterConditionRowHtml(f, idx, ctx) {
  const cid = filterCtxAttr(ctx);
  const field = resolveField(f.fieldId);
  const missing = f.fieldId && !field;
  const showNegate = field && (field.type === "select" || field.type === "multiselect");
  const showAndToggle = field && field.type === "multiselect";
  const dragAttrs = ctx ? "" : ` draggable="true" data-filter-idx="${idx}"`;
  return `<div class="filterRow"${dragAttrs} style="padding:10px 12px;border:1px solid ${missing ? "var(--neg)" : "var(--border)"};border-radius:8px;flex:1 1 320px;min-width:280px;max-width:420px;${ctx ? "" : "cursor:grab;"}">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      ${ctx ? "" : `<span style="color:var(--mutedDark);cursor:grab;font-size:14px;" title="${esc(T("common.dragToReorder"))}">⠿</span>`}
      <select class="select" data-filter-field="${idx}"${cid}>
        <option value="">${esc(T("filter.selectField"))}</option>
        ${schema.filter((x) => filterableTypes.includes(x.type)).map((x) => `<option value="${esc(x.id)}" ${f.fieldId === x.id ? "selected" : ""}>${esc(x.label)}</option>`).join("")}
        <optgroup label="${esc(T("vfield.group"))}">
          ${virtualFields().map((x) => `<option value="${esc(x.id)}" ${f.fieldId === x.id ? "selected" : ""}>${esc(x.label)}</option>`).join("")}
        </optgroup>
      </select>
      ${showAndToggle ? `<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted);cursor:pointer;">
        <input type="checkbox" data-action="toggle-filter-and" data-idx="${idx}"${cid} ${f.matchMode === "and" ? "checked" : ""} style="width:13px;height:13px;" />${T("filter.matchAll")}
      </label>` : ""}
      ${showNegate ? `<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted);cursor:pointer;">
        <input type="checkbox" data-action="toggle-filter-negate" data-idx="${idx}"${cid} ${f.negate ? "checked" : ""} style="width:13px;height:13px;" />${T("filter.negate")}
      </label>` : ""}
      <button class="tinyBtn" data-action="remove-filter" data-idx="${idx}"${cid} style="color:var(--neg);font-size:16px;margin-left:auto;">${ICONS.x}</button>
    </div>
    ${missing ? `<div style="font-size:11.5px;color:var(--neg);margin-top:8px;">${T("filter.fieldDeleted")}</div>` : ""}
    ${field ? filterRowValuesHtml(field, idx, f, ctx) : ""}
  </div>`;
}
function filteredSummaryStats(list) {
  const rF = roleField("r_multiple"), resultF = roleField("result");
  const clean = list;
  const w = resultF ? clean.filter((t) => t[resultF.id] === "W").length : 0;
  const l = resultF ? clean.filter((t) => t[resultF.id] === "L").length : 0;
  const be = resultF ? clean.filter((t) => t[resultF.id] === "BE").length : 0;
  const bew = resultF ? clean.filter((t) => t[resultF.id] === "BE -> W").length : 0;
  const bel = resultF ? clean.filter((t) => t[resultF.id] === "BE -> L").length : 0;
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
    ${s.hasR ? `<span class="mono" style="color:${s.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">${T("grid.total")} ${fmtNum(s.totalR)}R · EV ${fmtNum(s.ev, 3)}</span>` : ""}
    ${s.hasR ? `<span class="mono" style="color:${pfColor(s.pf)}" title="${esc(T("grid.pfTitle", { n: s.pfSample }))}">PF ${fmtPF(s.pf)}</span>` : ""}
    ${!viewingUserId ? `<button class="tinyBtn" data-action="save-filters-as-combo" style="margin-left:auto;color:var(--accent);font-size:12px;">${ICONS.plus} ${T("grid.saveFiltersAsCombo")}</button>` : ""}
  </div>`;
}
const CARD_SIZES = { compact: 190, standard: 260, large: 360, huge: 500 };
const TABLE_PAGE_SIZE = 25;
function estimateCardColumns() {
  const cardPx = CARD_SIZES[gridCardSize] || CARD_SIZES.standard;
  const gap = 18;
  const availableWidth = Math.min(window.innerWidth || 1200, 2200) - 56;
  return Math.max(1, Math.floor((availableWidth + gap) / (cardPx + gap)));
}
function currentPageSize() {
  return gridViewMode === "table" ? TABLE_PAGE_SIZE : estimateCardColumns() * 4;
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
  const activeCount = activeFilters.filter((f) => f.fieldId).length;
  let html = `<div class="filterPanel${filterPanelOpen ? " open" : ""}">
    <button class="filterPanelHead" data-action="toggle-filter-panel">
      ${ICONS.filter}
      <span class="filterPanelTitle">${T("filter.title")}</span>
      ${activeCount
        ? `<span class="filterPanelBadge">${esc(T("filter.activeCount", { n: activeCount }))}</span>`
        : `<span class="filterPanelBadge off">${T("ascope.noFilter")}</span>`}
      ${filterPanelChainHtml(trades.length, filteredCount, activeCount > 0, T("filter.chainTitle"))}
      <span class="filterPanelChev">${filterPanelOpen ? ICONS.chevUp : ICONS.chevDown}</span>
    </button>
    ${!filterPanelOpen && activeCount ? filterPanelSummaryHtml(activeFilters) : ""}`;
  if (filterPanelOpen) {
    html += `<div class="filterPanelBody">
      <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:10px;">${T("filter.logicHint")}</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;width:100%;">
        ${activeFilters.map((f, idx) => filterConditionRowHtml(f, idx, "")).join("")}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
        <button class="btn" data-action="add-filter">${ICONS.plus} ${T("filter.addCondition")}</button>
        ${activeFilters.length ? `<button class="btn" data-action="clear-all-filter-values">${T("filter.clearAllValues")}</button>` : ""}
      </div>
      <div style="margin-top:14px;">${renderFilterSummary(filteredForSummary)}</div>
    </div>`;
  }
  html += `</div>`;
  return html;
}
function renderGrid() {
  const modelF = roleField("model"), resultF = roleField("result"), dateF = roleField("date"), rF = roleField("r_multiple"), shotF = roleField("screenshot");

  let filtered = trades.filter((t) => activeFilters.every((f) => tradeMatchesFilter(t, f)) && tradeMatchesSearch(t, searchQuery));
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

  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:${gridViewMode === "card" && cardFieldsPickerOpen ? "0" : "16"}px;">
    <div style="display:flex;gap:6px;">
      <button class="btn ${gridViewMode === "card" ? "btn-primary" : ""}" data-action="set-view-mode" data-mode="card">${ICONS.grid} ${T("grid.viewCard")}</button>
      <button class="btn ${gridViewMode === "table" ? "btn-primary" : ""}" data-action="set-view-mode" data-mode="table">${ICONS.table} ${T("grid.viewTable")}</button>
    </div>
    ${gridViewMode === "card" ? `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
      <span style="font-size:11.5px;color:var(--mutedDark);">${T("grid.imageSize")}</span>
      ${Object.keys(CARD_SIZES).map((sz) => `<button class="btn ${gridCardSize === sz ? "btn-primary" : ""}" data-action="set-card-size" data-size="${sz}" style="padding:5px 10px;font-size:12px;">${esc(T("grid.size" + sz.charAt(0).toUpperCase() + sz.slice(1)))}</button>`).join("")}
      <button class="btn ${cardFieldsPickerOpen ? "btn-primary" : ""}" data-action="toggle-card-fields-picker" style="padding:5px 10px;font-size:12px;">${ICONS.settings} ${T("grid.cardFields")}</button>
    </div>` : ""}
  </div>
  ${gridViewMode === "card" && cardFieldsPickerOpen ? `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:16px;">
    <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:8px;">${T("grid.cardFieldsHint")}</div>
    <div class="chipGroup">
      ${schema.filter((f) => !["date", "model", "r_multiple"].includes(f.role)).concat(virtualFields()).map((f) => `<button type="button" class="chip ${cardFields.includes(f.id) ? "active" : ""}" data-action="toggle-card-field" data-id="${esc(f.id)}">${esc(f.label)}</button>`).join("")}
    </div>
    ${cardFields.length ? `<button class="tinyBtn" data-action="reset-card-fields" style="color:var(--mutedDark);margin-top:8px;">${T("grid.clearExtraFields")}</button>` : ""}
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
    const shot = shotF ? t[shotF.id] : null;
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
    html += `<div class="card" data-action="edit-trade" data-id="${esc(t.id)}">
      <div class="cardImg">
        ${shot ? `<img src="${esc(shot)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fallback-url="${esc(shot)}" data-fallback-class="cardImgFallback" onerror="window.__imgFallback(this)" />`
               : `<div class="cardImgFallback">${ICONS.camera}</div>`}
        ${shot ? `<button class="previewIcon" data-action="preview-image" data-url="${esc(shot)}" title="${esc(T("grid.viewLarge"))}">${ICONS.expand}</button>` : ""}
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

/* ============================================================
   RENDER — ANALYTICS VIEW
   ============================================================ */
// 样本这么少的行不画色条、不标 delta：n=3 的 67% 是噪音，不能长得跟 n=80 的 67% 一样有说服力
const BREAKDOWN_MIN_SAMPLE = 5;
// baseWr = 这一批交易的整体胜率。传了就在每行右边标出「相对整体 +9.2pp」——
// 拆解真正有信息量的是差值，绝对胜率高往往只是因为整批本来就高
function barRow(row, fieldId, baseWr) {
  const low = row.n < BREAKDOWN_MIN_SAMPLE;
  const width = row.wr === null || low ? 0 : row.wr;
  const color = row.wr === null ? "var(--mutedDark)" : row.wr >= 60 ? "var(--pos)" : row.wr >= 45 ? "var(--accent)" : "var(--neg)";
  const rPart = row.hasR
    ? ` · <span style="color:${row.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(row.totalR)}R</span> · EV ${fmtNum(row.ev, 2)} · PF <span style="color:${pfColor(row.pf)}">${fmtPF(row.pf)}</span>`
    : "";
  const delta = !low && baseWr !== undefined && baseWr !== null && row.wr !== null ? " " + deltaText(row.wr, baseWr, "pp", 1) : "";
  return `<div class="barRow${low ? " lowSample" : ""}">
    <div class="barTop">
      <span style="color:var(--text)">${esc(row.value)}${low ? ` <span class="lowSampleTag" title="${esc(T("breakdown.lowSampleTitle", { n: BREAKDOWN_MIN_SAMPLE }))}">${esc(T("breakdown.lowSample"))}</span>` : ""}</span>
      <span class="mono" style="color:var(--muted)">n=${row.n} · ${fmtPct(row.wr)}${delta}</span>
    </div>
    <div class="barTrack"><div class="barFill" style="width:${width}%;background:${color}"></div></div>
    <div class="barMeta">
      <span class="mono">W${row.w} L${row.l}${row.be ? " BE" + row.be : ""}${rPart}</span>
      ${fieldId && !viewingUserId && !row.noCombo ? `<button class="tinyBtn" data-action="combo-from-breakdown" data-field="${esc(fieldId)}" data-val="${esc(row.value)}"${row.rangeStart ? ` data-range-start="${esc(row.rangeStart)}" data-range-end="${esc(row.rangeEnd)}"` : ""} title="${esc(T("breakdown.comboFromRow"))}">${ICONS.plus}${T("breakdown.comboBtn")}</button>` : ""}
    </div>
  </div>`;
}

/* ---------- 分析页：分析范围面板 ----------
   取代了以前那条「统计口径开关」。和记录页 activeFilters、月度页彻底分开，见 ANALYSIS FILTERS 那一段。
   面板头上常驻一行「全部 412 → 47」，把"这个数字怎么来的"直接摆出来，
   省掉以前"口径藏在别处、用户不知道数字为什么对不上"的疑问。 */
// 两个快捷条件：点一下往筛选里加/删一条显式条件，不是隐藏开关——加完能在下面的条件行里看见、能改能删
function analysisQuickPreset(kind) {
  const field = kind === "taken" ? roleField("taken") : roleField("human_error");
  if (!field) return null;
  const val = kind === "taken" ? "Taken" : "yes";
  if (!(field.options || []).includes(val)) return null;
  const negate = kind === "he";
  const idx = analysisFilters.findIndex((r) => r.fieldId === field.id && !!r.negate === negate
    && (r.values || []).length === 1 && r.values[0] === val);
  return { kind, field, val, negate, idx, on: idx >= 0 };
}
function renderAnalysisScopePanel(stats) {
  const activeCount = analysisFilters.filter((f) => f.fieldId).length;
  const combo = analysisComboId ? findCombo(analysisComboId) : null;
  const presets = ["taken", "he"].map(analysisQuickPreset).filter(Boolean);
  let html = `<div class="filterPanel${analysisPanelOpen ? " open" : ""}">
    <button class="filterPanelHead" data-action="toggle-analysis-panel">
      ${ICONS.filter}
      <span class="filterPanelTitle">${T("ascope.title")}</span>
      ${activeCount
        ? `<span class="filterPanelBadge">${esc(T("filter.activeCount", { n: activeCount }))}</span>`
        : `<span class="filterPanelBadge off">${T("ascope.noFilter")}</span>`}
      ${filterPanelChainHtml(trades.length, stats.total, activeCount > 0, T("ascope.chainTitle"))}
      <span class="filterPanelChev">${analysisPanelOpen ? ICONS.chevUp : ICONS.chevDown}</span>
    </button>
    ${!analysisPanelOpen && activeCount ? filterPanelSummaryHtml(analysisFilters) : ""}`;
  if (combo) {
    html += `<div class="analysisComboTag">
      ${ICONS.chart}
      <span>${esc(T(analysisComboDirty ? "ascope.fromComboDirty" : "ascope.fromCombo", { name: combo.name }))}</span>
      <span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;">
        ${!viewingUserId && analysisComboDirty ? `<button class="tinyBtn" data-action="write-back-analysis-combo" style="color:var(--accent);">${T("ascope.writeBack")}</button>` : ""}
        <button class="tinyBtn" data-action="detach-analysis-combo" style="color:var(--mutedDark);">${T("ascope.detach")}</button>
      </span>
    </div>`;
  }
  if (analysisPanelOpen) {
    html += `<div class="filterPanelBody">
      ${presets.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px;">
        <span style="font-size:11.5px;color:var(--mutedDark);">${T("ascope.quick")}</span>
        ${presets.map((pr) => `<button type="button" class="chip ${pr.on ? "active" : ""}" data-action="toggle-analysis-quick" data-quick="${pr.kind}">${esc(T(pr.kind === "taken" ? "ascope.quickTaken" : "ascope.quickNoHE"))}</button>`).join("")}
      </div>` : ""}
      <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:10px;">${T("filter.logicHint")}</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;width:100%;">
        ${analysisFilters.map((f, idx) => filterConditionRowHtml(f, idx, ANALYSIS_CTX)).join("")}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center;">
        <button class="btn" data-action="add-filter" data-filter-ctx="${ANALYSIS_CTX}">${ICONS.plus} ${T("filter.addCondition")}</button>
        ${analysisFilters.length ? `<button class="btn" data-action="clear-all-filter-values" data-filter-ctx="${ANALYSIS_CTX}">${T("filter.clearAllValues")}</button>` : ""}
        <button class="btn" data-action="analysis-filters-default">${T("ascope.reset")}</button>
        <span style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button class="btn" data-action="apply-analysis-filters" data-target="grid" title="${esc(T("ascope.applyTitle"))}">${ICONS.grid} ${esc(T("ascope.applyToGrid", { n: stats.total }))}</button>
          <button class="btn" data-action="apply-analysis-filters" data-target="calendar" title="${esc(T("ascope.applyToCalendarTitle"))}">${ICONS.calendar}</button>
          ${!viewingUserId && activeCount ? `<button class="btn" data-action="save-analysis-filters-as-combo" style="color:var(--accent);">${ICONS.plus} ${T("grid.saveFiltersAsCombo")}</button>` : ""}
        </span>
      </div>
      <div style="font-size:11px;color:var(--mutedDark);margin-top:14px;line-height:1.7;">${T("ascope.localHint")}</div>
    </div>`;
  }
  html += `</div>`;
  return html;
}

/* ---------- 分析页：组合 ---------- */
function comboBaseline(combo) {
  return comboStats({ ...combo, conditions: [] });
}
function deltaText(v, base, unit, digits) {
  if (v === null || v === undefined || base === null || base === undefined) return "";
  const d = v - base;
  const color = d > 0 ? "var(--pos)" : d < 0 ? "var(--neg)" : "var(--mutedDark)";
  return `<span style="color:${color};font-size:11px;">(${d >= 0 ? "+" : ""}${d.toFixed(digits)}${unit})</span>`;
}
function renderComboEditor(combo) {
  return `<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px;">
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">
      <input type="text" class="select" data-combo-name="${esc(combo.id)}" value="${esc(combo.name)}" placeholder="${esc(T("combo.namePlaceholder"))}" style="flex:1 1 220px;max-width:420px;" />
    </div>
    <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:8px;">${T("combo.editorHint")}</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;width:100%;">
      ${(combo.conditions || []).map((f, idx) => filterConditionRowHtml(f, idx, combo.id)).join("")}
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn" data-action="add-filter" data-combo-id="${esc(combo.id)}">${ICONS.plus} ${T("combo.addCondition")}</button>
      ${(combo.conditions || []).length ? `<button class="btn" data-action="clear-all-filter-values" data-combo-id="${esc(combo.id)}">${T("filter.clearAllValues")}</button>` : ""}
      <button class="btn btn-primary" data-action="close-combo-editor">${T("combo.done")}</button>
    </div>
  </div>`;
}
// 列表模式：一行一个组合。刻意保留 .comboCard 类名、draggable 和 data-combo-id，
// 拖拽排序/投放分组的处理器全靠这三样定位，换布局不用动一行拖拽代码
function renderComboRow(combo, s, base, broken, analyzing, deleting) {
  const wrColor = s.wr === null ? "var(--muted)" : s.wr > 60 ? "var(--pos)" : "var(--neg)";
  const small = !broken && s.n > 0 && s.n < COMBO_SMALL_SAMPLE;
  return `<div class="comboCard listRow${analyzing ? " analyzing" : ""}" ${viewingUserId ? "" : `draggable="true" data-combo-id="${esc(combo.id)}"`} title="${esc(comboConditionsText(combo))}">
    ${viewingUserId ? "" : `<span class="listDrag" title="${esc(T("combo.dragHint"))}">⠿</span>`}
    <span class="listName">${esc(combo.name)}${small ? ` <span class="lowSampleTag" title="${esc(T("combo.smallSampleTitle"))}">${esc(T("combo.smallSample", { n: s.n }))}</span>` : ""}</span>
    ${broken
      ? `<span style="font-size:12px;color:var(--neg);">${T("combo.broken")}</span>`
      : `<span class="listStats">
          <span class="mono" style="font-size:15px;font-weight:600;color:${wrColor};">${fmtPct(s.wr)}</span>
          ${deltaText(s.wr, base.wr, "pp", 1)}
          <span class="mono">n=${s.n}</span>
          <span class="mono">W${s.w} L${s.l}${s.be ? " BE" + s.be : ""}</span>
          ${s.hasR ? `<span class="mono" style="color:${s.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(s.totalR)}R</span>` : ""}
          ${s.hasR ? `<span class="mono">EV ${fmtNum(s.ev, 3)}</span>` : ""}
          ${s.hasR ? `<span class="mono" style="color:${pfColor(s.pf)}">PF ${fmtPF(s.pf)}</span>` : ""}
        </span>`}
    <span class="listActions">
      ${broken ? "" : `<button class="btn ${analyzing ? "" : "btn-primary"}" data-action="apply-combo-to-analysis" data-combo-id="${esc(combo.id)}" title="${esc(T("combo.analyzeTitle"))}">${ICONS.chart} ${esc(T("combo.analyzeShort"))}</button>
      <button class="btn" data-action="open-combo-in-grid" data-combo-id="${esc(combo.id)}" title="${esc(T("combo.viewTrades", { n: s.n }))}">${ICONS.grid}</button>`}
      ${!viewingUserId ? `<button class="tinyBtn" data-action="edit-combo" data-combo-id="${esc(combo.id)}">${T("combo.edit")}</button>
      <button class="tinyBtn" data-action="ask-delete-combo" data-combo-id="${esc(combo.id)}" style="color:var(--neg);">${T("common.delete")}</button>` : ""}
    </span>
    ${deleting ? `<span class="listConfirm">
      ${esc(T("combo.confirmDelete", { name: combo.name }))}
      <button class="btn btn-danger" data-action="confirm-delete-combo" data-combo-id="${esc(combo.id)}" style="padding:3px 9px;font-size:12px;">${T("common.delete")}</button>
      <button class="btn" data-action="cancel-delete-combo" style="padding:3px 9px;font-size:12px;">${T("common.cancel")}</button>
    </span>` : ""}
  </div>`;
}
function renderComboCard(combo) {
  const issues = comboIssues(combo);
  const broken = issues.hard.length > 0;
  const s = comboStats(combo);
  const base = comboBaseline(combo);
  const editing = comboEditingId === combo.id;
  const analyzing = analysisComboId === combo.id;
  const small = !broken && s.n > 0 && s.n < COMBO_SMALL_SAMPLE;
  const deleting = comboConfirmDeleteId === combo.id;

  // 胜率 >60 绿，其余红——固定两档，一眼看出这个组合整体是不是打得过
  const wrColor = s.wr === null ? "var(--muted)" : s.wr > 60 ? "var(--pos)" : "var(--neg)";
  let stats;
  if (broken) {
    stats = `<div style="font-size:12.5px;color:var(--neg);margin:2px 0 8px;">${T("combo.broken")}</div>`;
  } else {
    stats = `<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:baseline;margin:2px 0 8px;font-size:12.5px;color:var(--muted);">
      <span class="mono" style="font-size:17px;font-weight:600;color:${wrColor};">${fmtPct(s.wr)}</span>
      ${deltaText(s.wr, base.wr, "pp", 1)}
      <span class="mono">n=${s.n}</span>
      <span class="mono">W${s.w} L${s.l}${s.be ? " BE" + s.be : ""}</span>
      ${s.hasR ? `<span class="mono" style="color:${s.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(s.totalR)}R</span>` : ""}
      ${s.hasR ? `<span class="mono">EV ${fmtNum(s.ev, 3)} ${deltaText(s.ev, base.ev, "", 3)}</span>` : ""}
      ${s.hasR ? `<span class="mono" style="color:${pfColor(s.pf)}">PF ${fmtPF(s.pf)}</span>` : ""}
    </div>`;
  }

  if (comboViewMode === "list" && !editing) return renderComboRow(combo, s, base, broken, analyzing, deleting);

  // 编辑器展开时卡片独占一整行（.comboCard.editing）：网格列只有 340px，
  // 编辑器里的下拉和条件行塞不下会顶出卡片边框，看着像布局坏了
  return `<div class="comboCard${editing ? " editing" : ""}${analyzing ? " analyzing" : ""}" ${viewingUserId || editing ? "" : `draggable="true" data-combo-id="${esc(combo.id)}"`}>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      ${viewingUserId || editing ? "" : `<span style="color:var(--mutedDark);cursor:grab;font-size:14px;" title="${esc(T("combo.dragHint"))}">⠿</span>`}
      <span style="font-size:14px;color:var(--text);font-weight:500;">${esc(combo.name)}</span>
      ${!viewingUserId ? `<span style="margin-left:auto;display:flex;gap:6px;">
        <button class="tinyBtn" data-action="edit-combo" data-combo-id="${esc(combo.id)}">${editing ? T("combo.collapse") : T("combo.edit")}</button>
        <button class="tinyBtn" data-action="ask-delete-combo" data-combo-id="${esc(combo.id)}" style="color:var(--neg);">${T("common.delete")}</button>
      </span>` : ""}
    </div>
    ${small ? `<div class="comboSmallSampleBadge" title="${esc(T("combo.smallSampleTitle"))}">${ICONS.alert} ${esc(T("combo.smallSample", { n: s.n }))}</div>` : ""}
    ${stats}
    ${issues.hard.length ? `<div style="font-size:11.5px;color:var(--neg);margin-bottom:8px;line-height:1.6;">${issues.hard.map((x) => "⚠ " + esc(x)).join("<br>")}</div>` : ""}
    ${issues.soft.length ? `<div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:8px;line-height:1.6;">${issues.soft.map((x) => "· " + esc(x)).join("<br>")}</div>` : ""}
    <div style="font-size:11.5px;color:var(--mutedDark);line-height:1.6;">${esc(comboConditionsText(combo))}</div>
    ${deleting ? `<div style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:12px;color:var(--neg);">
      ${esc(T("combo.confirmDelete", { name: combo.name }))}
      <button class="btn btn-danger" data-action="confirm-delete-combo" data-combo-id="${esc(combo.id)}" style="padding:4px 10px;font-size:12px;">${T("common.delete")}</button>
      <button class="btn" data-action="cancel-delete-combo" style="padding:4px 10px;font-size:12px;">${T("common.cancel")}</button>
    </div>` : ""}
    ${broken ? "" : `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
      <button class="btn ${analyzing ? "" : "btn-primary"}" data-action="apply-combo-to-analysis" data-combo-id="${esc(combo.id)}" style="padding:5px 10px;font-size:12px;" title="${esc(T("combo.analyzeTitle"))}">${ICONS.chart} ${esc(T(analyzing ? "combo.analyzeAgain" : "combo.analyze"))}</button>
      <button class="btn" data-action="open-combo-in-grid" data-combo-id="${esc(combo.id)}" style="padding:5px 10px;font-size:12px;">${esc(T("combo.viewTrades", { n: s.n }))}</button>
    </div>`}
    ${editing ? renderComboEditor(combo) : ""}
  </div>`;
}
function renderComboGroupDeleteConfirm(groupId, kindKey) {
  if (comboGroupConfirmDeleteId !== groupId) return "";
  const g = findComboGroup(groupId);
  if (!g) return "";
  const preview = comboGroupCascadePreview(groupId);
  const parts = [];
  if (preview.subgroupCount) parts.push(T("comboGroup.subCount", { n: preview.subgroupCount }));
  if (preview.comboCount) parts.push(T("comboGroup.comboCount", { n: preview.comboCount }));
  const warn = parts.length ? T("comboGroup.cascadeWarn", { parts: parts.join(T("comboGroup.andJoin")) }) : T("comboGroup.cascadeEmpty");
  return `<div style="display:flex;gap:8px;align-items:center;margin:8px 0;font-size:12px;color:var(--neg);flex-wrap:wrap;">
    ${esc(T("comboGroup.confirmDelete", { kind: T(kindKey), name: g.name, warn }))}
    <button class="btn btn-danger" data-action="confirm-delete-combo-group" data-group-id="${esc(groupId)}" style="padding:4px 10px;font-size:12px;">${T("common.delete")}</button>
    <button class="btn" data-action="cancel-delete-combo-group" style="padding:4px 10px;font-size:12px;">${T("common.cancel")}</button>
  </div>`;
}
function renderComboGroupHeader(id, extraAttrs, nameHtml, count, extraButtons) {
  const collapsed = collapsedComboGroups.has(id);
  return `<div class="comboGroupHeader" data-action="toggle-combo-group-collapse" data-group-id="${esc(id)}" ${extraAttrs}>
    <span style="color:var(--mutedDark);display:flex;">${collapsed ? ICONS.chevDown : ICONS.chevUp}</span>
    ${nameHtml}
    <span style="color:var(--mutedDark);font-size:11.5px;">${esc(T("comboGroup.comboCount", { n: count }))}</span>
    ${extraButtons || ""}
  </div>`;
}
function renderComboSubgroupSection(sub, combos) {
  const collapsed = collapsedComboGroups.has(sub.id);
  const dragAttrs = viewingUserId ? "" : `draggable="true" data-group-id="${esc(sub.id)}" data-parent-id="${esc(sub.parentId)}"`;
  const header = renderComboGroupHeader(
    sub.id, dragAttrs,
    `<span style="font-weight:500;">${esc(sub.name)}</span>`,
    combos.length,
    !viewingUserId ? `<span style="margin-left:auto;display:flex;gap:6px;">
      <button class="tinyBtn" data-action="rename-combo-group" data-group-id="${esc(sub.id)}">${T("comboGroup.rename")}</button>
      <button class="tinyBtn" data-action="ask-delete-combo-group" data-group-id="${esc(sub.id)}" style="color:var(--neg);">${T("common.delete")}</button>
    </span>` : ""
  );
  return `<div class="comboSubgroupSection" data-group-drop="${esc(sub.id)}">
    ${header}
    ${renderComboGroupDeleteConfirm(sub.id, "comboGroup.kindSub")}
    ${collapsed ? "" : (combos.length ? `<div class="comboGrid">${combos.map(renderComboCard).join("")}</div>` : `<div style="font-size:11.5px;color:var(--mutedDark);padding:4px 0 8px;">${T("comboGroup.dropHintSub")}</div>`)}
  </div>`;
}
function renderComboGroupSection(root, directCombos, subgroups, byGroup) {
  const collapsed = collapsedComboGroups.has(root.id);
  const dragAttrs = viewingUserId ? "" : `draggable="true" data-group-id="${esc(root.id)}"`;
  const header = renderComboGroupHeader(
    root.id, dragAttrs,
    `<span style="font-weight:600;font-size:14px;">${esc(root.name)}</span>`,
    directCombos.length + subgroups.reduce((s, sub) => s + (byGroup[sub.id] || []).length, 0),
    !viewingUserId ? `<span style="margin-left:auto;display:flex;gap:6px;">
      <button class="tinyBtn" data-action="rename-combo-group" data-group-id="${esc(root.id)}">${T("comboGroup.rename")}</button>
      <button class="tinyBtn" data-action="add-combo-subgroup" data-parent-id="${esc(root.id)}">${ICONS.plus}${T("comboGroup.addSub")}</button>
      <button class="tinyBtn" data-action="ask-delete-combo-group" data-group-id="${esc(root.id)}" style="color:var(--neg);">${T("common.delete")}</button>
    </span>` : ""
  );
  let body = "";
  if (!collapsed) {
    if (directCombos.length || subgroups.length) {
      // "未归入二级分组"现在跟真的二级分组一样：能拖、能收起，默认排最后，
      // 拖到任意位置都会记下来（root.directOrder），下次照这个位置摆——顺序统一由 comboSubgroupSlotIds 决定
      const dKey = directGroupKey(root.id);
      const htmlById = {};
      subgroups.forEach((sub) => { htmlById[sub.id] = renderComboSubgroupSection(sub, byGroup[sub.id] || []); });
      if (directCombos.length) {
        const directCollapsed = collapsedComboGroups.has(dKey);
        const directHeader = renderComboGroupHeader(
          dKey, viewingUserId ? "" : `draggable="true" data-group-id="${esc(dKey)}"`,
          `<span style="font-weight:500;color:var(--mutedDark);">${esc(T("comboGroup.directBucket"))}</span>`,
          directCombos.length, ""
        );
        htmlById[dKey] = `<div class="comboSubgroupSection" data-group-drop="${esc(root.id)}">
          ${directHeader}
          ${directCollapsed ? "" : `<div class="comboGrid">${directCombos.map(renderComboCard).join("")}</div>`}
        </div>`;
      }
      body += comboSubgroupSlotIds(root, subgroups).map((id) => htmlById[id] || "").join("");
    } else {
      body += `<div style="font-size:11.5px;color:var(--mutedDark);padding:4px 0 8px;">${T("comboGroup.dropHintRoot")}</div>`;
    }
  }
  return `<div class="comboGroupSection" data-group-drop="${esc(root.id)}">${header}${renderComboGroupDeleteConfirm(root.id, "comboGroup.kindRoot")}${body}</div>`;
}
// 分析页大区块的标题：点标题整块收起，状态存 localStorage。
// 组合和拆解都很长，想专心看一边就把另一边收掉
function analyticsSectionHead(secId, label, countHint, rightHtml) {
  const collapsed = collapsedAnalyticsSections.has(secId);
  return `<div class="anaSectionHead">
    <button class="anaSectionToggle" data-action="toggle-analytics-section" data-sec="${esc(secId)}">
      <span style="color:var(--mutedDark);display:flex;">${collapsed ? ICONS.chevDown : ICONS.chevUp}</span>
      <span class="sectionLabel" style="margin:0;">⟦ ${esc(label)} ⟧</span>
      ${countHint ? `<span style="font-size:11.5px;color:var(--mutedDark);">${esc(countHint)}</span>` : ""}
    </button>
    ${rightHtml || ""}
  </div>`;
}
function renderCombosSection() {
  const combos = analysisPrefs.combos || [];
  const groups = analysisPrefs.comboGroups || [];
  const collapsed = collapsedAnalyticsSections.has("combos");
  let html = analyticsSectionHead("combos", T("combos.title"), T("comboGroup.comboCount", { n: combos.length }),
    `<span class="anaSectionActions">
      <span class="viewToggle">
        <button class="viewBtn ${comboViewMode === "card" ? "active" : ""}" data-action="set-combo-view" data-mode="card" title="${esc(T("combos.viewCard"))}">${ICONS.grid}</button>
        <button class="viewBtn ${comboViewMode === "list" ? "active" : ""}" data-action="set-combo-view" data-mode="list" title="${esc(T("combos.viewList"))}">${ICONS.table}</button>
      </span>
      ${!viewingUserId ? `<button class="tinyBtn" data-action="add-combo-group" style="color:var(--mutedDark);">${ICONS.plus} ${T("combos.newGroup")}</button>
      <button class="btn" data-action="add-combo" style="padding:5px 12px;font-size:12px;">${ICONS.plus} ${T("combos.newCombo")}</button>` : ""}
    </span>`);
  if (collapsed) return html;
  // 一个组合都没有、也没建过分组，才是真正的空状态；只要建过分组就得把分组画出来，
  // 否则新用户先建分组、还没建组合，会以为分组没存上
  if (!combos.length && !groups.length) {
    html += `<div style="font-size:12.5px;color:var(--mutedDark);border:1px dashed var(--border);border-radius:10px;padding:16px;margin-bottom:26px;line-height:1.7;">
      ${T("combos.emptyIntro")}
    </div>`;
    return html;
  }
  if (!combos.length && !viewingUserId) {
    html += `<div style="font-size:12.5px;color:var(--mutedDark);border:1px dashed var(--border);border-radius:10px;padding:14px 16px;margin-bottom:16px;line-height:1.7;">
      ${T("combos.emptyWithGroups")}
    </div>`;
  }
  // 「未分组」这个框现在始终显示（哪怕一个分组都没建过），跟建了分组之后视觉上保持一致，
  // 不会一建分组就突然"多"出一个框来
  const byGroup = {};
  combos.forEach((c) => { const gid = comboEffectiveGroupId(c); (byGroup[gid] = byGroup[gid] || []).push(c); });
  comboGroupRoots().forEach((root) => {
    html += renderComboGroupSection(root, byGroup[root.id] || [], comboGroupChildren(root.id), byGroup);
  });
  const ungrouped = byGroup[""] || [];
  const ungroupedCollapsed = collapsedComboGroups.has("__ungrouped__");
  const ungroupedHeader = renderComboGroupHeader(
    "__ungrouped__", `style="cursor:pointer;"`,
    `<span style="font-weight:500;color:var(--mutedDark);">${esc(T("comboGroup.ungrouped"))}</span>`,
    ungrouped.length, ""
  );
  html += `<div class="comboUngroupedSection" data-group-drop="__ungrouped__">
    ${ungroupedHeader}
    ${ungroupedCollapsed ? "" : (ungrouped.length ? `<div class="comboGrid">${ungrouped.map(renderComboCard).join("")}</div>` : `<div style="font-size:11.5px;color:var(--mutedDark);padding:4px 0 8px;">${T("comboGroup.dropHintUngroup")}</div>`)}
  </div>`;
  return html;
}

/* ---------- 分析页：拆解显示配置 ---------- */
function renderBreakdownPicker() {
  const hidden = analysisPrefs.breakdownHidden || [];
  const fields = breakdownCandidateFields();
  // 一个 time 字段都没有就别把时间段设置摆出来占地方
  const hasTime = fields.some((f) => f.type === "time");
  return `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:16px;">
    <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:10px;">${T("breakdown.pickerHint")}</div>
    <div style="display:flex;flex-direction:column;gap:4px;">
      ${fields.map((f, idx) => `<div class="bdRow" draggable="true" data-bd-idx="${idx}">
        <span style="color:var(--mutedDark);cursor:grab;font-size:14px;" title="${esc(T("common.dragToReorder"))}">⠿</span>
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer;flex:1;">
          <input type="checkbox" data-action="toggle-breakdown-field" data-id="${esc(f.id)}" ${hidden.includes(f.id) ? "" : "checked"} style="width:13px;height:13px;" />
          <span style="font-size:12.5px;color:var(--text);">${esc(f.label)}</span>
          <span style="font-size:11px;color:var(--mutedDark);">${esc(fieldTypeLabel(f.type))}${f.role ? " · " + esc(f.role) : ""}</span>
        </label>
      </div>`).join("")}
    </div>
    ${hasTime ? `<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px;">
      <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:8px;">${T("breakdown.timeBucketsHint")}</div>
      <input type="text" class="input mono" data-bind="time-buckets" value="${esc(currentTimeBoundaries().join(", "))}" placeholder="${esc(DEFAULT_TIME_BUCKETS.join(", "))}" style="font-size:12.5px;" />
      <div style="font-size:11px;color:var(--mutedDark);margin-top:6px;line-height:1.6;">${T("breakdown.timeBucketsNote", { n: Math.max(0, currentTimeBoundaries().length - 1) })}</div>
    </div>` : ""}
    <button class="tinyBtn" data-action="reset-breakdown-prefs" style="margin-top:10px;color:var(--mutedDark);">${T("breakdown.reset")}</button>
  </div>`;
}
// 贴在顶部的一条细统计条。存在的理由很实在：拆解区很长，
// 你在第 15 张卡上看到「+17.1pp」时，得知道整体是多少才知道这个差值值不值钱。
// 用纯 CSS 的 position:sticky，不挂滚动监听：没有 JS 状态要同步，render() 重建它也不会闪，
// 而且不依赖 scroll 事件（后台标签页/不合成帧的环境里 scroll 事件根本不发）。
/* ---------- 分析页：近期表现 ----------
   四格一行：最近 3 / 7 / 30 天 + 当前范围全体（基准）。前三格的胜率右边标相对基准的差值。
   n 少的时候胜率会剧烈跳动（3 笔里 2 胜 = 66.7%，纯噪音），所以沿用拆解那套阈值：
   n < BREAKDOWN_MIN_SAMPLE 的格子降透明度并标「样本少」，不让它看起来跟 n=80 那格一样有说服力。 */
function renderRecentPanel(stats) {
  const rows = recentWindowStats(stats.list);
  const cell = (label, s, isBase) => {
    const low = !isBase && s.n > 0 && s.n < BREAKDOWN_MIN_SAMPLE;
    const delta = !isBase && !low && s.wr !== null && stats.wr !== null ? " " + deltaText(s.wr, stats.wr, "pp", 1) : "";
    return `<div class="recentBox${isBase ? " recentBase" : ""}${low ? " lowSample" : ""}">
      <div class="recentLabel">${esc(label)}${low ? ` <span class="lowSampleTag" title="${esc(T("breakdown.lowSampleTitle", { n: BREAKDOWN_MIN_SAMPLE }))}">${esc(T("breakdown.lowSample"))}</span>` : ""}</div>
      <div class="recentWr" style="color:${s.wr === null ? "var(--mutedDark)" : "var(--accent)"}">${fmtPct(s.wr)}${delta}</div>
      <div class="recentMeta mono">n=${s.n} · W${s.w} L${s.l}${s.be ? " BE" + s.be : ""}</div>
      ${s.hasR ? `<div class="recentMeta mono"><span style="color:${s.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(s.totalR)}R</span> · EV ${fmtNum(s.ev, 2)}</div>` : ""}
    </div>`;
  };
  return `<div class="recentPanel">
    <div class="recentHead">
      <span class="sectionLabel" style="margin:0;">⟦ ${esc(T("recent.title"))} ⟧</span>
      <span style="font-size:11.5px;color:var(--mutedDark);">${esc(T("recent.basis"))}</span>
    </div>
    <div class="recentRow">
      ${rows.map((s) => cell(s.value, s, false)).join("")}
      ${cell(T("recent.all"), { ...stats, n: stats.total, be: stats.be + stats.bew + stats.bel }, true)}
    </div>
  </div>`;
}
function renderAnalyticsSticky(stats) {
  const links = [["anaScope", "sticky.scope"], ["anaOverview", "sticky.overview"], ["anaCombos", "sticky.combos"], ["anaBreakdowns", "sticky.breakdowns"]];
  return `<div class="analyticsSticky" id="analyticsSticky"><div class="analyticsStickyInner">
    <span class="mono" style="color:var(--mutedDark);">n=${stats.total}</span>
    <span class="mono" style="color:var(--accent);font-weight:600;">${fmtPct(stats.wr)}</span>
    ${stats.hasR ? `<span class="mono" style="color:${stats.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(stats.totalR)}R</span>` : ""}
    ${stats.hasR ? `<span class="mono" style="color:${pfColor(stats.pf)}">PF ${fmtPF(stats.pf)}</span>` : ""}
    ${stats.hasR && stats.dd !== null ? `<span class="mono" style="color:${stats.dd > 0.0001 ? "var(--neg)" : "var(--mutedDark)"}">DD ${stats.dd > 0.0001 ? "-" : ""}${stats.dd.toFixed(2)}R</span>` : ""}
    <span class="stickyLinks">${links.map(([id, k]) => `<button class="tinyBtn" data-action="scroll-to-section" data-sec="${id}">${esc(T(k))}</button>`).join("")}</span>
    <button class="tinyBtn stickyTop" data-action="scroll-top" title="${esc(T("sticky.top"))}">${ICONS.up}</button>
  </div></div>`;
}
function renderAnalytics() {
  const stats = computeStats();
  if (!stats.hasResult) {
    return `<div class="notice">${ICONS.alert}<span>${T("analytics.noResultRole")}</span></div>`;
  }
  const prefsNotice = analysisPrefsError ? `<div class="notice error" style="margin-bottom:16px;">${ICONS.alert}<span>${esc(analysisPrefsError)}</span></div>` : "";
  const panel = `<div id="anaScope">${renderAnalysisScopePanel(stats)}</div>`;
  const activeCount = analysisFilters.filter((f) => f.fieldId).length;

  if (stats.total === 0) {
    return prefsNotice + panel + `<div class="notice">${ICONS.alert}<div>
      <div style="color:var(--text);margin-bottom:6px;">${esc(activeCount ? T("ascope.emptyFiltered", { total: trades.length, n: activeCount }) : T("ascope.emptyAll"))}</div>
      <div>${esc(activeCount ? T("ascope.emptyFilteredHint") : T("ascope.emptyAllHint"))}</div>
    </div></div>`;
  }

  let html = prefsNotice + panel + renderAnalyticsSticky(stats) + `<div id="anaOverview" class="statRow">
    <div class="statBox"><div class="statLabel">${T("analytics.countTrades")}</div><div class="statValue">${stats.total}</div></div>
    <div class="statBox"><div class="statLabel">${T("grid.winRate")}</div><div class="statValue" style="color:var(--accent)">${fmtPct(stats.wr)}</div><div class="statSub">W${stats.w} · L${stats.l}</div></div>
    <div class="statBox"><div class="statLabel">${T("analytics.setupQuality")}</div><div class="statValue">${fmtPct(stats.sq)}</div></div>
    ${stats.hasR ? `<div class="statBox"><div class="statLabel">${T("analytics.totalR")}</div><div class="statValue" style="color:${stats.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(stats.totalR)}</div></div>` : ""}
    ${stats.hasR ? `<div class="statBox"><div class="statLabel">${T("analytics.evPerTrade")}</div><div class="statValue" style="color:${stats.ev >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(stats.ev, 3)}</div></div>` : ""}
    ${stats.hasR ? `<div class="statBox" title="${esc(T("grid.pfTitle", { n: stats.pfSample }))}"><div class="statLabel">${T("analytics.profitFactor")}</div><div class="statValue" style="color:${pfColor(stats.pf)}">${fmtPF(stats.pf)}</div>${stats.pfSample !== stats.total ? `<div class="statSub">${esc(T("analytics.pfBasis", { n: stats.pfSample }))}</div>` : ""}</div>` : ""}
    ${stats.hasR && stats.dd !== null ? `<div class="statBox" title="${esc(T("analytics.maxDDTitle"))}"><div class="statLabel">${T("analytics.maxDD")}</div><div class="statValue" style="color:${stats.dd > 0.0001 ? "var(--neg)" : "var(--mutedDark)"}">${stats.dd > 0.0001 ? "-" : ""}${stats.dd.toFixed(2)}R</div>${stats.ddSample !== stats.total ? `<div class="statSub">${esc(T("analytics.ddBasis", { n: stats.ddSample }))}</div>` : ""}</div>` : ""}
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:28px;font-size:12.5px;color:var(--muted);">
    <span>BE ${stats.be} · BE→W ${stats.bew} · BE→L ${stats.bel}</span>
    ${stats.totalFaded ? `<span>${esc(T("analytics.fadedLine", { n: stats.totalFaded, w: stats.fadedW, l: stats.fadedL }))}</span>` : ""}
  </div>`;

  html += renderRecentPanel(stats);

  html += `<div id="anaCombos" style="margin-bottom:28px;">${renderCombosSection()}</div>`;

  // 拆解跟总览吃的是同一批交易（stats.list），两边数字天然对得上，不用各自再筛一遍
  const allBreakdowns = computeBreakdowns(stats.list);
  // 当前范围内只有一个值的字段（往往是被筛选钉死的）：拆出来必然是单行、差值恒等于 0，
  // 信息量数学上就是零，却要占一整张卡。收成下面一行灰字，别让它们撑长页面
  const uniform = allBreakdowns.filter((b) => b.rows.length === 1);
  const breakdowns = allBreakdowns.filter((b) => b.rows.length > 1);
  const bdCollapsed = collapsedAnalyticsSections.has("breakdowns");
  html += `<div id="anaBreakdowns">` + analyticsSectionHead("breakdowns", T("breakdown.title"),
    T("breakdown.basis", { n: stats.total, wr: fmtPct(stats.wr) }),
    `<span class="anaSectionActions">
      <span style="font-size:11.5px;color:var(--mutedDark);">${T("breakdown.sortBy")}</span>
      <select class="select" data-bind="breakdown-sort" style="padding:4px 8px;font-size:12px;">
        <option value="n" ${breakdownSort === "n" ? "selected" : ""}>${esc(T("breakdown.sortN"))}</option>
        <option value="delta" ${breakdownSort === "delta" ? "selected" : ""}>${esc(T("breakdown.sortDelta"))}</option>
        <option value="ev" ${breakdownSort === "ev" ? "selected" : ""}>${esc(T("breakdown.sortEv"))}</option>
      </select>
      ${!viewingUserId ? `<button class="btn ${breakdownPickerOpen ? "btn-primary" : ""}" data-action="toggle-breakdown-picker" style="padding:4px 10px;font-size:12px;">${ICONS.settings} ${T("breakdown.displaySettings")}</button>` : ""}
    </span>`);

  if (!bdCollapsed) {
    if (breakdownPickerOpen && !viewingUserId) html += renderBreakdownPicker();
    if (breakdowns.length) {
      html += `<div class="breakdownGrid">`;
      breakdowns.forEach((b) => {
        const draggable = !viewingUserId ? ` draggable="true" data-bd-card-id="${esc(b.field.id)}"` : "";
        // 多选字段一笔交易会落进多行，各行 n 之和大于总笔数——小样本下特别容易被当成 bug，标出来
        const multi = b.field.type === "multiselect";
        html += `<div class="breakdownCard"${draggable}>
          <div class="breakdownTitle" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span>${!viewingUserId ? `<span style="cursor:grab;color:var(--mutedDark);" title="${esc(T("common.dragToReorder"))}">⠿</span> ` : ""}${esc(b.field.label)}${multi ? ` <span class="bdMultiTag" title="${esc(T("breakdown.multiTitle"))}">${esc(T("breakdown.multiTag"))}</span>` : ""}${b.ordered ? ` <span class="bdMultiTag" title="${esc(T("breakdown.timeTagTitle"))}">${esc(T("breakdown.timeTag"))}</span>` : ""}</span>
            ${!viewingUserId ? `<button class="tinyBtn" data-action="hide-breakdown-field" data-id="${esc(b.field.id)}" title="${esc(T("breakdown.hideField"))}">${ICONS.x}</button>` : ""}
          </div>
          ${b.ordered
            // 时间段卡固定按时间先后，不吃排序下拉、也不折叠低样本行：
            // 时间轴一旦被重排或者中间挖个洞，「开盘那半小时最好、11 点以后最差」这种趋势就读不出来了
            ? b.rows.map((r) => barRow(r, b.field.id, stats.wr)).join("")
            : breakdownRowsHtml(b.field, sortBreakdownRows(b.rows, stats.wr), stats.wr)}
        </div>`;
      });
      html += `</div>`;
    } else if (!uniform.length) {
      html += `<div style="font-size:12.5px;color:var(--mutedDark);">${T("breakdown.none")}</div>`;
    }
    if (uniform.length) {
      html += `<div class="bdUniform">${esc(T("breakdown.uniformIntro"))} ${uniform.map((b) =>
        `<span class="bdUniformItem">${esc(b.field.label)} = ${esc(b.rows[0].value)} <span style="color:var(--mutedDark);">(${b.rows[0].n}/${stats.total})</span></span>`).join("")}</div>`;
    }
  }
  html += `</div>`;
  return html;
}

/* ============================================================
   RENDER — CHANGELOG VIEW
   ============================================================ */
function renderChangelog() {
  const isAdmin = currentProfile && currentProfile.role === "admin";
  let html = isAdmin ? `<div class="field">
    <div class="fieldLabel">${T("changelog.publishLabel")}</div>
    <textarea class="input" id="changelogDraft" rows="3" placeholder="${esc(T("changelog.placeholder"))}"></textarea>
    <button class="btn btn-primary" data-action="add-changelog" style="margin-top:8px;">${ICONS.plus} ${T("changelog.publish")}</button>
  </div>
  <div style="margin:22px 0 14px;"><div class="sectionLabel">⟦ ${esc(T("changelog.history"))} ⟧</div></div>` : "";
  if (!changelog.length) {
    html += `<div class="notice">${ICONS.alert}<span>${T("changelog.empty")}</span></div>`;
  } else {
    changelog.forEach((c) => {
      const d = new Date(c.created_at);
      const dateStr = isNaN(d.getTime()) ? "" : d.toLocaleString(localeTag(), { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      html += `<div class="changelogEntry">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="changelogDate">${esc(dateStr)}</div>
          ${isAdmin ? `<button class="tinyBtn" data-action="delete-changelog" data-id="${esc(c.id)}" style="color:var(--mutedDark);">${ICONS.x}</button>` : ""}
        </div>
        <div class="changelogText">${esc(c.entry)}</div>
      </div>`;
    });
  }
  return html;
}

/* ============================================================
   MARKDOWN —— 复盘正文的渲染器

   ⚠️ 安全模型（改这一段前务必读完）
   这是整个项目里唯一一处把用户输入变成 HTML 的地方，别处全部走 esc()。
   而管理员能只读查看任意用户的数据，所以一段带 <img onerror> 的复盘正文
   会在管理员的会话里执行 —— 那是权限最高的会话。

   因此本渲染器的铁律是「先转义、再排版」：
     1. 一进来就把整段过 esc()，此后源文本里不可能再出现真正的 < > " &
     2. 后续所有规则都只在这份已转义的文本上加白名单标签
     3. 链接和图片的 URL 只放行 http(s):// 开头的（挡 javascript: / data:）
   任何时候都不要为了支持某个语法而把原始 HTML 放回去。
   ============================================================ */
function mdSafeUrl(u) {
  const raw = String(u || "").trim();
  // esc() 把 & 变成了 &amp;，放进 HTML 属性里本来就该是这个形态，不用还原
  return /^https?:\/\//i.test(raw) ? raw : null;
}

/* 行内规则。传进来的 text 必须已经是 esc() 过的。 */
function mdInline(text) {
  // 行内代码先抽成占位符，免得里面的 * _ [ 被当成语法
  const codes = [];
  let out = String(text).replace(/`([^`\n]+)`/g, (m, c) => {
    codes.push(c);
    return " CODE" + (codes.length - 1) + " ";
  });

  // 交易引用要排在链接前面，否则 [[trade:x]] 会先被方括号规则啃掉
  out = out.replace(/\[\[trade:([A-Za-z0-9_-]+)\]\]/g, (m, id) => tradeRefHtml(id));

  // 图片在链接之前（语法上 ![]() 是 []() 的超集）
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, url) => {
    const safe = mdSafeUrl(url);
    if (!safe) return m;
    return `<img class="mdImg" src="${safe}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" data-action="preview-image" data-url="${safe}" data-fallback-url="${safe}" data-fallback-class="mdImgFallback" onerror="window.__imgFallback(this)" />`;
  });

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
    const safe = mdSafeUrl(url);
    if (!safe) return m;
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>`;
  });

  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*(?![*\w])/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_\w])_([^_\n]+)_(?![_\w])/g, "$1<em>$2</em>");
  out = out.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");

  return out.replace(/ CODE(\d+) /g, (m, i) => `<code>${codes[+i]}</code>`);
}

/* [[trade:xxx]] 渲染成一个可点的小胶囊。
   找不到那笔交易时**显式标红**，不静默消失 —— 组合引用失效字段的老坑同款。
   复盘只在实盘模式下用，所以 trades 里就是实盘那批，不存在跨 mode 查不到的情况。 */
function tradeRefHtml(id) {
  const t = trades.find((x) => x.id === id);
  if (!t) {
    return `<span class="tradeRef broken" title="${esc(id)}">${ICONS.alert}<span class="tradeRefMeta">${esc(T("review.tradeMissing"))}</span></span>`;
  }
  const dateF = roleField("date"), modelF = roleField("model"), resultF = roleField("result"), rF = roleField("r_multiple");
  const result = resultF ? t[resultF.id] : "";
  const rc = resultColor(result);
  const bits = [];
  if (dateF && t[dateF.id]) bits.push(esc(t[dateF.id]));
  if (modelF && t[modelF.id]) bits.push(esc(String(t[modelF.id])));
  const rVal = rF ? t[rF.id] : "";
  const rTxt = (rVal !== undefined && rVal !== "" && !isNaN(parseFloat(rVal)))
    ? (parseFloat(rVal) >= 0 ? "+" : "") + rVal + "R" : "";
  return `<span class="tradeRef" data-action="open-trade-ref" data-id="${esc(id)}" title="${esc(T("review.tradeOpen"))}">`
    + `<span class="tradeRefIcon">${ICONS.grid}</span>`
    + `<span class="tradeRefMeta">${bits.join(" · ") || esc(id)}</span>`
    + (result ? `<span class="mono" style="color:${rc};font-weight:600;">${esc(result)}</span>` : "")
    + (rTxt ? `<span class="mono" style="color:${rc};">${esc(rTxt)}</span>` : "")
    + `</span>`;
}

function mdTableRowCells(line) {
  let inner = line.trim();
  if (inner.startsWith("|")) inner = inner.slice(1);
  if (inner.endsWith("|")) inner = inner.slice(0, -1);
  return inner.split("|").map((c) => c.trim());
}
function mdIsTableDivider(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line || "");
}

function renderMarkdown(src) {
  if (!src || !String(src).trim()) return "";
  const lines = esc(src).replace(/\r\n?/g, "\n").split("\n");
  let html = "";
  let i = 0;
  // 支持一层缩进嵌套。子列表要放进上一个 <li> 里面才是合法结构，
  // 所以开子列表时把刚写完的 </li> 撕掉，收子列表时再补回去。
  const listStack = []; // [{ kind: 'ul'|'ol', nested: boolean }]

  // 这两个直接写 html，不返回字符串：`html += openList()` 会先读走 html 的旧值，
  // 函数内部对 html 的截断就白做了
  function openList(kind) {
    let nested = false;
    if (listStack.length && html.endsWith("</li>")) { html = html.slice(0, -5); nested = true; }
    listStack.push({ kind, nested });
    html += `<${kind} class="mdList">`;
  }
  function closeOneList() {
    const l = listStack.pop();
    html += `</${l.kind}>` + (l.nested ? "</li>" : "");
  }
  function closeLists(toDepth) {
    while (listStack.length > toDepth) closeOneList();
  }

  while (i < lines.length) {
    const line = lines[i];

    // 代码块 ```
    if (/^\s*```/.test(line)) {
      closeLists(0);
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // 吃掉收尾的 ```
      html += `<pre class="mdPre"><code>${buf.join("\n")}</code></pre>`;
      continue;
    }

    // 表格：一行表头 + 一行分隔线，后面跟数据行
    if (/\|/.test(line) && mdIsTableDivider(lines[i + 1] || "")) {
      closeLists(0);
      const head = mdTableRowCells(line);
      i += 2;
      const body = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) { body.push(mdTableRowCells(lines[i])); i++; }
      html += `<div class="mdTableWrap"><table class="mdTable"><thead><tr>`
        + head.map((c) => `<th>${mdInline(c)}</th>`).join("")
        + `</tr></thead><tbody>`
        + body.map((r) => `<tr>` + head.map((_, ci) => `<td>${mdInline(r[ci] || "")}</td>`).join("") + `</tr>`).join("")
        + `</tbody></table></div>`;
      continue;
    }

    // 空行 = 段落分隔，同时结束列表
    if (!line.trim()) { closeLists(0); i++; continue; }

    // 分割线
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { closeLists(0); html += `<hr class="mdHr" />`; i++; continue; }

    // 标题 # ~ ######
    const h = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (h) {
      closeLists(0);
      const lv = Math.min(h[1].length, 6);
      html += `<h${lv} class="mdH mdH${lv}">${mdInline(h[2].trim())}</h${lv}>`;
      i++; continue;
    }

    // 引用 >（esc() 之后 > 已经变成 &gt;）
    if (/^\s{0,3}&gt;\s?/.test(line)) {
      closeLists(0);
      const buf = [];
      while (i < lines.length && /^\s{0,3}&gt;\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s{0,3}&gt;\s?/, "")); i++; }
      html += `<blockquote class="mdQuote">${buf.map((b) => mdInline(b)).join("<br />")}</blockquote>`;
      continue;
    }

    // 列表（含待办）。缩进 >=2 空格算第二层
    const li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (li) {
      const depth = Math.min(Math.floor(li[1].replace(/\t/g, "  ").length / 2), 1) + 1;
      const kind = /^\d/.test(li[2]) ? "ol" : "ul";
      let content = li[3];
      let taskHtml = "";
      const task = content.match(/^\[( |x|X)\]\s+(.*)$/);
      if (task) {
        const done = task[1].toLowerCase() === "x";
        content = task[2];
        taskHtml = `<span class="mdTask ${done ? "done" : ""}"></span>`;
      }
      while (listStack.length > depth) closeOneList();
      while (listStack.length < depth) openList(kind);
      if (listStack[depth - 1].kind !== kind) { closeOneList(); openList(kind); }
      html += `<li${taskHtml ? ' class="mdTaskItem"' : ""}>${taskHtml}${mdInline(content)}</li>`;
      i++; continue;
    }

    // 普通段落：连着的非空行合成一段，段内换行转 <br>
    closeLists(0);
    const para = [];
    while (i < lines.length && lines[i].trim()
      && !/^\s*```/.test(lines[i])
      && !/^\s{0,3}#{1,6}\s/.test(lines[i])
      && !/^\s{0,3}&gt;\s?/.test(lines[i])
      && !/^(\s*)([-*+]|\d+[.)])\s+/.test(lines[i])
      && !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])) { para.push(lines[i]); i++; }
    html += `<p class="mdP">${para.map((l) => mdInline(l)).join("<br />")}</p>`;
  }
  closeLists(0);
  return html;
}

/* 列表页摘要用：把 markdown 语法剥干净，只留人话 */
function mdPlainExcerpt(src, max) {
  const t = String(src || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[\[trade:[A-Za-z0-9_-]+\]\]/g, "[trade]")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "[img]")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/gm, " ")   // 表格分隔行
    .replace(/^\s*([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/gm, "")                  // 列表标记 + 待办方框
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*-{3,}\s*$/gm, " ")
    .replace(/[*_~`|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const lim = max || 150;
  return t.length > lim ? t.slice(0, lim) + "…" : t;
}

/* ============================================================
   RENDER — 复盘（REVIEWS）

   只在实盘模式下出现（TABS 里按 recordMode 判断），所以这一整块都不用管
   回测那份数据，trades 里就是实盘那批。

   ⚠️ 编辑器不在 #app 里，它有自己的根节点 #reviewEditorRoot，
   靠 reviewEditorRenderedFor 守卫防止背景 render() 把正在写的长文冲掉，
   跟 renderModal 的 modalRenderedForId 是同一个套路。
   ============================================================ */

/* 周一那天。日历页 app.js 里也是周一开头，这里保持一致 */
function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function toDateStr(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function thisMondayStr() { return toDateStr(mondayOf(new Date())); }
function lastMondayStr() {
  const m = mondayOf(new Date());
  m.setDate(m.getDate() - 7);
  return toDateStr(m);
}
function fmtReviewTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(localeTag(), { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function reviewTitleOf(r) { return (r.title || "").trim() || T("review.untitled"); }

function reviewMatchesSearch(r, q) {
  const s = (q || "").trim().toLowerCase();
  if (!s) return true;
  return ((r.title || "") + " " + (r.body || "")).toLowerCase().includes(s);
}

function renderReviews() {
  const readOnly = !!viewingUserId;
  if (reviewsTableMissing) {
    return `<div class="notice error">${ICONS.alert}<span>${esc(T("review.tableMissing"))}</span></div>`;
  }
  const list = reviews.filter((r) => reviewMatchesSearch(r, reviewSearch));

  let html = `<div class="reviewTop">
    ${readOnly ? "" : `<button class="btn btn-primary" data-action="new-review">${ICONS.plus} ${T("review.new")}</button>`}
    <div class="reviewSearchBox">
      ${ICONS.search}
      <input class="input reviewSearchInput" type="text" placeholder="${esc(T("review.searchPlaceholder"))}"
        value="${esc(reviewSearch)}" data-action="review-search-input" />
    </div>
    <div class="reviewCount mono">${esc(T("review.count", { n: reviews.length }))}</div>
  </div>`;

  if (!list.length) {
    html += `<div class="notice">${ICONS.alert}<span>${esc(reviewSearch ? T("review.emptySearch") : T("review.empty"))}</span></div>`;
    return html;
  }

  html += `<div class="reviewList">`;
  list.forEach((r) => {
    const confirming = reviewConfirmDeleteId === r.id;
    const excerpt = mdPlainExcerpt(r.body, 180);
    const linked = (r.linked_trade_ids || []).length;
    html += `<div class="reviewCard" data-action="open-review" data-id="${esc(r.id)}">
      <div class="reviewCardHead">
        <div class="reviewCardTitle display">${esc(reviewTitleOf(r))}</div>
        ${readOnly ? "" : (!confirming
          ? `<button class="tinyBtn reviewCardDel" data-action="ask-delete-review" data-id="${esc(r.id)}" title="${esc(T("review.deleteThis"))}">${ICONS.trash}</button>`
          : `<span class="reviewCardDelConfirm">
              <button class="tinyBtn" data-action="confirm-delete-review" data-id="${esc(r.id)}" style="color:var(--neg);">✓</button>
              <button class="tinyBtn" data-action="cancel-delete-review">${ICONS.x}</button>
            </span>`)}
      </div>
      <div class="reviewCardMeta mono">
        <span class="reviewWeekTag ${r.week_start ? "on" : ""}">${esc(r.week_start ? T("review.weekOf", { date: r.week_start }) : T("review.freePost"))}</span>
        <span>${esc(T("review.edited", { time: fmtReviewTime(r.updated_at || r.created_at) }))}</span>
        ${linked ? `<span class="reviewLinkTag">${ICONS.grid} ${esc(T("review.linkedTrades", { n: linked }))}</span>` : ""}
      </div>
      ${excerpt ? `<div class="reviewCardExcerpt">${esc(excerpt)}</div>` : ""}
    </div>`;
  });
  html += `</div>`;
  return html;
}

/* ============================================================
   复盘编辑器 —— 自己的根节点 + 重绘守卫
   ============================================================ */
const SLASH_ITEMS = [
  { cmd: "h1",    labelKey: "review.slash.h1",    keys: ["h1", "heading", "title", "标题", "biaoti"] },
  { cmd: "h2",    labelKey: "review.slash.h2",    keys: ["h2", "subheading", "小标题"] },
  { cmd: "h3",    labelKey: "review.slash.h3",    keys: ["h3", "小小标题"] },
  { cmd: "ul",    labelKey: "review.slash.ul",    keys: ["ul", "list", "bullet", "列表", "liebiao"] },
  { cmd: "ol",    labelKey: "review.slash.ol",    keys: ["ol", "number", "ordered", "编号", "有序"] },
  { cmd: "task",  labelKey: "review.slash.task",  keys: ["task", "todo", "check", "待办", "daiban"] },
  { cmd: "quote", labelKey: "review.slash.quote", keys: ["quote", "引用", "yinyong"] },
  { cmd: "code",  labelKey: "review.slash.code",  keys: ["code", "代码", "daima"] },
  { cmd: "hr",    labelKey: "review.slash.hr",    keys: ["hr", "divider", "line", "分割线", "fenge"] },
  { cmd: "table", labelKey: "review.slash.table", keys: ["table", "表格", "biaoge"] },
  { cmd: "image", labelKey: "review.slash.image", keys: ["image", "img", "photo", "pic", "图片", "tupian"] },
  { cmd: "link",  labelKey: "review.slash.link",  keys: ["link", "url", "链接", "lianjie"] },
  { cmd: "trade", labelKey: "review.slash.trade", keys: ["trade", "交易", "jiaoyi", "复盘", "关联"] },
];
const SLASH_MENU_WIDTH = 220;   // 跟 style.css 里 .slashMenu 的 width / max-height 对齐
const SLASH_MENU_MAX_H = 260;
const SLASH_ICONS = {
  h1: "tbHeading", h2: "tbHeading", h3: "tbHeading", ul: "tbUl", ol: "tbOl", task: "tbTask",
  quote: "tbQuote", code: "tbCode", hr: "tbHr", table: "tbTable", image: "tbImage", link: "tbLink", trade: "grid",
};

/* 「能不能编辑」和「此刻是不是在编辑」是两回事：
   管理员只读查看别人的数据时前者就是 false，连编辑按钮都不该出现。 */
function reviewCanEdit() { return !viewingUserId; }
function reviewIsReadOnly() { return !reviewCanEdit() || !reviewEditMode; }

function slashFilteredItems() {
  const q = ((slashMenu && slashMenu.query) || "").toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter((it) =>
    it.keys.some((k) => k.toLowerCase().includes(q)) || T(it.labelKey).toLowerCase().includes(q));
}

function reviewToolbarHtml() {
  const b = (cmd, icon, titleKey, label) =>
    `<button class="tbBtn" data-action="review-tb" data-cmd="${cmd}" title="${esc(T(titleKey))}">${ICONS[icon]}${label ? `<span class="tbLabel">${label}</span>` : ""}</button>`;
  return `<div class="reviewToolbar">
    ${b("bold", "tbBold", "review.tb.bold")}
    ${b("italic", "tbItalic", "review.tb.italic")}
    ${b("strike", "tbStrike", "review.tb.strike")}
    <span class="tbSep"></span>
    ${b("h1", "tbHeading", "review.tb.h1", "1")}
    ${b("h2", "tbHeading", "review.tb.h2", "2")}
    <span class="tbSep"></span>
    ${b("ul", "tbUl", "review.tb.ul")}
    ${b("ol", "tbOl", "review.tb.ol")}
    ${b("task", "tbTask", "review.tb.task")}
    ${b("quote", "tbQuote", "review.tb.quote")}
    ${b("code", "tbCode", "review.tb.code")}
    <span class="tbSep"></span>
    ${b("link", "tbLink", "review.tb.link")}
    ${b("image", "tbImage", "review.tb.image")}
    ${b("hr", "tbHr", "review.tb.hr")}
    <span class="tbSep"></span>
    <button class="tbBtn tbTrade" data-action="review-tb" data-cmd="trade" title="${esc(T("review.tb.trade"))}">${ICONS.grid}<span class="tbLabel">${esc(T("review.tb.trade"))}</span></button>
    <span class="tbHint">${esc(T("review.tb.help"))}</span>
  </div>`;
}

function reviewSaveBadgeHtml() {
  if (reviewSaveError) return `<span class="reviewSaveBadge err">${ICONS.alert} ${esc(reviewSaveError)}</span>`;
  if (reviewSaveState === "saving") return `<span class="reviewSaveBadge">${esc(T("review.saving"))}</span>`;
  if (reviewSaveState === "dirty") return `<span class="reviewSaveBadge dirty">${esc(T("review.unsaved"))}</span>`;
  if (reviewSaveState === "saved" && reviewSavedAt) {
    return `<span class="reviewSaveBadge ok">${esc(T("review.saved", { time: new Date(reviewSavedAt).toLocaleTimeString(localeTag(), { hour: "2-digit", minute: "2-digit" }) }))}</span>`;
  }
  return `<span class="reviewSaveBadge"></span>`;
}
function updateReviewSaveBadge() {
  const n = document.getElementById("reviewSaveSlot");
  if (n) n.innerHTML = reviewSaveBadgeHtml();
}

/* 关联周那一行。单独拆出来是因为改周只需要换这一行——
   重绘整个编辑器会把正在写的正文和光标一起冲掉。 */
function reviewWeekRowInnerHtml() {
  if (!editingReview) return "";
  const readOnly = reviewIsReadOnly();
  const week = editingReview.week_start || "";
  // 只读态是拿来看的，一排禁用按钮纯属噪音——只留一枚说明关联到哪一周的标签
  if (readOnly) {
    return `<span class="reviewWeekTag ${week ? "on" : ""}">${esc(week ? T("review.weekOf", { date: week }) : T("review.freePost"))}</span>`
      + (viewingUserId ? `<span class="reviewReadOnly">${esc(T("review.readOnly"))}</span>` : "");
  }
  return `<span class="reviewWeekLabel">${esc(T("review.linkedWeek"))}</span>
    <button class="tinyBtn ${week === thisMondayStr() ? "on" : ""}" data-action="review-week" data-week="this">${esc(T("review.weekThis"))}</button>
    <button class="tinyBtn ${week === lastMondayStr() ? "on" : ""}" data-action="review-week" data-week="last">${esc(T("review.weekLast"))}</button>
    <input type="date" class="input reviewWeekDate" value="${esc(week)}" data-review-week-date />
    <button class="tinyBtn ${week ? "" : "on"}" data-action="review-week" data-week="clear">${esc(T("review.weekClear"))}</button>`;
}
function refreshReviewWeekRow() {
  const row = document.getElementById("reviewWeekRow");
  if (row) row.innerHTML = reviewWeekRowInnerHtml();
}

function renderReviewEditor(force) {
  const root = document.getElementById("reviewEditorRoot");
  if (!root) return;
  if (!editingReview) { reviewEditorRenderedFor = null; root.innerHTML = ""; return; }
  // 已经在显示这一篇就不重绘——否则正在写的正文和光标位置全没了
  if (!force && reviewEditorRenderedFor === editingReview.id) return;
  reviewEditorRenderedFor = editingReview.id;

  const canEdit = reviewCanEdit();
  const readOnly = reviewIsReadOnly();
  root.innerHTML = `<div class="reviewEditorOverlay">
    <div class="reviewEditor">
      <div class="reviewEditorHead">
        ${readOnly
          ? `<div class="reviewTitleStatic display">${esc(reviewTitleOf(editingReview))}</div>`
          : `<input class="reviewTitleInput display" type="text" id="reviewTitleInput"
              placeholder="${esc(T("review.titlePlaceholder"))}" value="${esc(editingReview.title || "")}"
              oninput="window.__reviewTitleInput(this)" />`}
        <div class="reviewHeadRight">
          <span id="reviewSaveSlot">${canEdit ? reviewSaveBadgeHtml() : ""}</span>
          ${readOnly ? "" : `<button class="btn" data-action="toggle-review-preview">${esc(reviewPreviewOpen ? T("review.previewOn") : T("review.previewOff"))}</button>`}
          ${canEdit ? `<button class="btn ${reviewEditMode ? "" : "btn-primary"}" data-action="toggle-review-edit-mode" title="${esc(reviewEditMode ? T("review.modeDoneTitle") : T("review.modeEditTitle"))}">${reviewEditMode ? ICONS.check : ICONS.pencil} ${esc(reviewEditMode ? T("review.modeDone") : T("review.modeEdit"))}</button>` : ""}
          <button class="iconBtn" data-action="close-review-editor" title="${esc(T("review.editorClose"))}">${ICONS.x}</button>
        </div>
      </div>
      <div class="reviewWeekRow" id="reviewWeekRow">${reviewWeekRowInnerHtml()}</div>
      ${readOnly ? "" : reviewToolbarHtml()}
      <div class="reviewEditorBody ${readOnly ? "readOnly" : reviewPreviewOpen ? "" : "noPreview"}">
        <div class="reviewPane">
          <textarea class="reviewBodyInput" id="reviewBodyInput" spellcheck="false"
            placeholder="${esc(T("review.bodyPlaceholder"))}"
            oninput="window.__reviewBodyInput(this)"
            onkeydown="window.__reviewKeydown(event, this)"
            onclick="window.__reviewCaretMoved()"
            onpaste="window.__reviewPaste(event, this)">${esc(editingReview.body || "")}</textarea>
          <div id="slashMenuRoot"></div>
        </div>
        <div class="reviewPreviewPane mdBody" id="reviewPreview">${renderMarkdown(editingReview.body) || `<div class="reviewPreviewEmpty">${esc(T("review.previewEmpty"))}</div>`}</div>
      </div>
      <div id="tradePickerRoot"></div>
    </div>
  </div>`;

  lastPreviewHtml = null;   // 预览区刚被重建，上一篇的缓存作废
  const ta = document.getElementById("reviewBodyInput");
  if (ta && !readOnly) {
    ta.focus();
    const end = ta.value.length;
    ta.setSelectionRange(end, end);
  }
}

/* ⚠️ 这里不能简单地 `box.innerHTML = ...`。
   整块替换会把预览区里的 <img> 全部换成新元素，而新建的 <img> 在图片解码完成前
   高度是 0 —— 浏览器恰好在这一刻做布局，scrollHeight 骤降，scrollTop 跟着被夹小；
   等图片异步恢复高度时滚动位置已经丢了。每按一次键削掉几十像素，长文里就表现为
   「一打字预览区就自己往上滚」。
   所以：内容没变就不动 DOM；要换就把已经加载好的 <img> 原样搬到新树里，最后把
   滚动位置放回去。 */
let lastPreviewHtml = null;
function updateReviewPreview() {
  const box = document.getElementById("reviewPreview");
  if (!box || !editingReview) return;
  const html = renderMarkdown(editingReview.body) || `<div class="reviewPreviewEmpty">${esc(T("review.previewEmpty"))}</div>`;
  if (html === lastPreviewHtml) return;
  lastPreviewHtml = html;

  const top = box.scrollTop;
  const next = document.createElement("div");
  next.innerHTML = html;

  // 按 src 建索引，把旧树里已经加载完的图片节点复用过去（移动节点不会触发重新加载）。
  // 同一张图可能在正文里出现多次，所以每个 src 存一队，逐个取用。
  const loaded = new Map();
  box.querySelectorAll("img").forEach((img) => {
    if (!img.complete || !img.naturalHeight) return;
    if (!loaded.has(img.src)) loaded.set(img.src, []);
    loaded.get(img.src).push(img);
  });
  next.querySelectorAll("img").forEach((img) => {
    const queue = loaded.get(img.src);
    if (!queue || !queue.length) return;
    const old = queue.shift();
    old.alt = img.alt;                 // alt 可能被改过，其余属性由 src 唯一决定
    img.replaceWith(old);
  });

  box.replaceChildren(...next.childNodes);
  box.scrollTop = top;
}

/* ---------- 自动保存 ----------
   停手 1.2 秒写数据库，同时每次输入都镜像一份到 localStorage 兜底。
   全程不调 render()，否则编辑器会被重建。 */
function scheduleReviewSave() {
  reviewSaveState = "dirty";
  reviewSaveError = null;
  updateReviewSaveBadge();
  saveReviewDraft();
  clearTimeout(reviewSaveTimer);
  reviewSaveTimer = setTimeout(() => { flushReviewSave(); }, 1200);
}
async function flushReviewSave() {
  clearTimeout(reviewSaveTimer);
  reviewSaveTimer = null;
  if (!editingReview || viewingUserId) return true;
  if (reviewSaveState !== "dirty") return true;
  reviewSaveState = "saving";
  updateReviewSaveBadge();
  const ok = await persistReview(editingReview);
  if (ok) {
    editingReview._isNew = false;
    reviewSaveState = "saved";
    reviewSavedAt = Date.now();
  } else {
    reviewSaveState = "dirty";
  }
  updateReviewSaveBadge();
  return ok;
}

/* ---------- textarea 上的输入处理 ----------
   全部走内联 on* 属性交给这几个 window.__ 函数，跟项目里
   window.__updateUrlPreview / window.__imgFallback 一个路子。 */
window.__reviewTitleInput = function (el) {
  if (!editingReview) return;
  editingReview.title = el.value;
  scheduleReviewSave();
};
window.__reviewBodyInput = function (ta) {
  if (!editingReview) return;
  editingReview.body = ta.value;
  updateReviewPreview();
  scheduleReviewSave();
  syncSlashMenu(ta);
};
window.__reviewCaretMoved = function () {
  if (slashMenu) closeSlashMenu();
};
window.__reviewPaste = function (e, ta) {
  const text = (e.clipboardData && e.clipboardData.getData("text")) || "";
  if (!/^https?:\/\/\S+$/i.test(text.trim())) return;   // 不是纯链接就走默认粘贴
  const url = text.trim();
  const hasSel = ta.selectionStart !== ta.selectionEnd;
  const isImage = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?|#|$)/i.test(url);
  if (!hasSel && !isImage) return;                      // 光秃秃粘个普通链接，保持原样最省事
  e.preventDefault();
  if (isImage && !hasSel) {
    replaceRange(ta, ta.selectionStart, ta.selectionEnd, `![](${url})`, null);
  } else {
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd) || T("review.linkText");
    replaceRange(ta, ta.selectionStart, ta.selectionEnd, `[${sel}](${url})`, null);
  }
};

/* 统一的「改 textarea 内容」入口：改完同步状态、预览、光标 */
function replaceRange(ta, from, to, text, selStart, selEnd) {
  const before = ta.value.slice(0, from);
  const after = ta.value.slice(to);
  ta.value = before + text + after;
  const a = (selStart === null || selStart === undefined) ? from + text.length : selStart;
  const b = (selEnd === null || selEnd === undefined) ? a : selEnd;
  ta.setSelectionRange(a, b);
  ta.focus();
  if (editingReview) editingReview.body = ta.value;
  updateReviewPreview();
  scheduleReviewSave();
}

/* 整行整行地改（缩进、列表、标题都走这里）。
   本来选中了多行，就把改完的这几行继续选着——否则 Tab 之后选区一塌，
   紧接着的 Shift+Tab 只能退最后一行。没选中就只按长度差挪一下光标。 */
function applyLineEdit(ta, s, en, text) {
  const hadRange = ta.selectionStart !== ta.selectionEnd;
  const caret = ta.selectionStart;
  const delta = text.length - (en - s);
  if (hadRange) replaceRange(ta, s, en, text, s, s + text.length);
  else replaceRange(ta, s, en, text, Math.max(s, caret + delta));
}

function lineBoundsAt(value, pos) {
  const start = value.lastIndexOf("\n", pos - 1) + 1;
  let end = value.indexOf("\n", pos);
  if (end === -1) end = value.length;
  return { start, end };
}

/* 给选中的每一行加/去掉前缀（列表、引用、标题都走这个） */
function toggleLinePrefix(ta, prefix, numbered) {
  const v = ta.value;
  const s = lineBoundsAt(v, ta.selectionStart).start;
  const e = lineBoundsAt(v, ta.selectionEnd).end;
  const lines = v.slice(s, e).split("\n");
  const stripRe = /^(\s*)(#{1,6}\s+|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+|>\s?)?/;
  const allHave = lines.every((l) => !l.trim() || l.replace(/^\s*/, "").startsWith(numbered ? "" : prefix.trim()));
  const out = lines.map((l, i) => {
    const m = l.match(stripRe);
    const indent = m[1] || "";
    const bare = l.slice((m[0] || "").length);
    if (allHave && !numbered && m[2] && m[2].trim() === prefix.trim()) return indent + bare;   // 再点一次 = 去掉
    return indent + (numbered ? (i + 1) + ". " : prefix) + bare;
  });
  const text = out.join("\n");
  applyLineEdit(ta, s, e, text);
}

function wrapSelection(ta, mark, endMark) {
  const close = endMark === undefined ? mark : endMark;
  const from = ta.selectionStart, to = ta.selectionEnd;
  const sel = ta.value.slice(from, to);
  // 已经包着同样的标记就脱掉，再点一次能取消
  if (sel && ta.value.slice(from - mark.length, from) === mark && ta.value.slice(to, to + close.length) === close) {
    const inner = sel;
    replaceRange(ta, from - mark.length, to + close.length, inner, from - mark.length + inner.length);
    return;
  }
  if (!sel) {
    replaceRange(ta, from, to, mark + close, from + mark.length);   // 空选中：把光标停在中间
    return;
  }
  replaceRange(ta, from, to, mark + sel + close, from + mark.length + sel.length + close.length);
}

function insertBlock(ta, text) {
  const v = ta.value;
  const { start } = lineBoundsAt(v, ta.selectionStart);
  const atLineStart = ta.selectionStart === start;
  const lead = atLineStart ? "" : "\n";
  replaceRange(ta, ta.selectionStart, ta.selectionEnd, lead + text);
}

function runReviewCommand(cmd) {
  const ta = document.getElementById("reviewBodyInput");
  if (!ta || reviewIsReadOnly()) return;
  switch (cmd) {
    case "bold": wrapSelection(ta, "**"); break;
    case "italic": wrapSelection(ta, "*"); break;
    case "strike": wrapSelection(ta, "~~"); break;
    case "h1": toggleLinePrefix(ta, "# "); break;
    case "h2": toggleLinePrefix(ta, "## "); break;
    case "h3": toggleLinePrefix(ta, "### "); break;
    case "ul": toggleLinePrefix(ta, "- "); break;
    case "ol": toggleLinePrefix(ta, "1. ", true); break;
    case "task": toggleLinePrefix(ta, "- [ ] "); break;
    case "quote": toggleLinePrefix(ta, "> "); break;
    case "code": {
      const multi = ta.value.slice(ta.selectionStart, ta.selectionEnd).includes("\n");
      if (multi) {
        const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
        replaceRange(ta, ta.selectionStart, ta.selectionEnd, "```\n" + sel + "\n```");
      } else wrapSelection(ta, "`");
      break;
    }
    case "hr": insertBlock(ta, "\n---\n"); break;
    case "table": insertBlock(ta, "\n| A | B |\n| --- | --- |\n|  |  |\n"); break;
    case "link": {
      const url = window.prompt(T("review.promptLink"), "https://");
      if (!url || !/^https?:\/\//i.test(url.trim())) return;
      const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd) || T("review.linkText");
      replaceRange(ta, ta.selectionStart, ta.selectionEnd, `[${sel}](${url.trim()})`);
      break;
    }
    case "image": {
      const url = window.prompt(T("review.promptImage"), "https://");
      if (!url || !/^https?:\/\//i.test(url.trim())) return;
      insertBlock(ta, `![](${url.trim()})\n`);
      break;
    }
    case "trade": openTradePicker(); break;
  }
}

/* ---------- 键盘：回车续列表 / Tab 缩进 / 常用快捷键 ----------
   ⚠️ 所有分支都要先看 e.isComposing —— 中文输入法选词时按回车/空格
   走的是同一个 keydown，不挡住的话会把没上屏的拼音切碎。 */
window.__reviewKeydown = function (e, ta) {
  if (reviewIsReadOnly()) return;

  if (slashMenu && !e.isComposing) {
    const items = slashFilteredItems();
    if (e.key === "ArrowDown") { e.preventDefault(); slashMenu.index = (slashMenu.index + 1) % Math.max(items.length, 1); renderSlashMenu(); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); slashMenu.index = (slashMenu.index - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1); renderSlashMenu(); return; }
    if (e.key === "Enter" || e.key === "Tab") {
      if (items.length) { e.preventDefault(); applySlashItem(items[slashMenu.index] || items[0]); return; }
    }
    if (e.key === "Escape") { e.preventDefault(); closeSlashMenu(); return; }
  }

  const mod = e.ctrlKey || e.metaKey;
  if (mod && !e.altKey && !e.isComposing) {
    const k = e.key.toLowerCase();
    if (k === "b") { e.preventDefault(); runReviewCommand("bold"); return; }
    if (k === "i") { e.preventDefault(); runReviewCommand("italic"); return; }
    if (k === "k") { e.preventDefault(); runReviewCommand("link"); return; }
    if (k === "s") { e.preventDefault(); flushReviewSave(); return; }
  }

  if (e.key === "Tab" && !e.isComposing) {
    e.preventDefault();
    const v = ta.value;
    const s = lineBoundsAt(v, ta.selectionStart).start;
    const en = lineBoundsAt(v, ta.selectionEnd).end;
    const lines = v.slice(s, en).split("\n");
    const out = e.shiftKey ? lines.map((l) => l.replace(/^ {1,2}/, "")) : lines.map((l) => "  " + l);
    const text = out.join("\n");
    applyLineEdit(ta, s, en, text);
    return;
  }

  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    const v = ta.value;
    const { start } = lineBoundsAt(v, ta.selectionStart);
    const line = v.slice(start, ta.selectionStart);
    const m = line.match(/^(\s*)([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?(.*)$/);
    if (!m) return;
    const [, indent, marker, task, rest] = m;
    if (!rest.trim()) {
      // 空的列表项上按回车 = 退出列表（把这一行的标记清掉）
      e.preventDefault();
      replaceRange(ta, start, ta.selectionStart, "");
      return;
    }
    e.preventDefault();
    let nextMarker = marker;
    if (/^\d/.test(marker)) {
      const n = parseInt(marker, 10) + 1;
      nextMarker = n + marker.replace(/^\d+/, "");
    }
    const nextTask = task ? "[ ] " : "";
    replaceRange(ta, ta.selectionStart, ta.selectionEnd, "\n" + indent + nextMarker + " " + nextTask);
  }
};

/* ---------- 斜杠插入菜单 ---------- */
function syncSlashMenu(ta) {
  const caret = ta.selectionStart;
  if (!slashMenu) {
    // 行首或空白后面刚打了个 / 才弹，写 and/or 这种就不该跳出来
    if (caret > 0 && ta.value[caret - 1] === "/" && (caret === 1 || /[\s\n]/.test(ta.value[caret - 2]))) {
      slashMenu = { start: caret - 1, query: "", index: 0 };
      renderSlashMenu();
    }
    return;
  }
  if (caret <= slashMenu.start || ta.value[slashMenu.start] !== "/") { closeSlashMenu(); return; }
  const q = ta.value.slice(slashMenu.start + 1, caret);
  if (/\s/.test(q) || q.length > 20) { closeSlashMenu(); return; }
  slashMenu.query = q;
  slashMenu.index = 0;
  renderSlashMenu();
}
function closeSlashMenu() {
  slashMenu = null;
  const root = document.getElementById("slashMenuRoot");
  if (root) root.innerHTML = "";
}
function applySlashItem(item) {
  const ta = document.getElementById("reviewBodyInput");
  if (!ta || !item || !slashMenu) return;
  const from = slashMenu.start;
  const to = ta.selectionStart;
  closeSlashMenu();
  replaceRange(ta, from, to, "");   // 先把 /query 本身删掉
  runReviewCommand(item.cmd);
}

/* textarea 里光标的像素位置：做一个样式一致的隐藏 div，把光标前的文字塞进去量 */
function caretCoords(ta, index) {
  const cs = getComputedStyle(ta);
  const div = document.createElement("div");
  ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "wordSpacing",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].forEach((k) => { div.style[k] = cs[k]; });
  div.style.position = "absolute";
  div.style.top = "0";
  div.style.left = "-9999px";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.boxSizing = "border-box";
  div.style.border = "none";
  div.style.width = ta.clientWidth + "px";
  div.textContent = ta.value.slice(0, index);
  const span = document.createElement("span");
  span.textContent = ta.value.slice(index) || ".";
  div.appendChild(span);
  document.body.appendChild(div);
  const top = span.offsetTop;
  const left = span.offsetLeft;
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
  document.body.removeChild(div);
  return { top: top - ta.scrollTop, left: left - ta.scrollLeft, lineHeight: lh };
}

function renderSlashMenu() {
  const root = document.getElementById("slashMenuRoot");
  const ta = document.getElementById("reviewBodyInput");
  if (!root || !ta || !slashMenu) return;
  const items = slashFilteredItems();
  const pos = caretCoords(ta, slashMenu.start);
  const maxLeft = Math.max(ta.clientWidth - SLASH_MENU_WIDTH - 8, 0);
  const left = Math.min(Math.max(pos.left, 0), maxLeft);
  // 菜单默认挂在光标那一行下面；下面塞不下就翻到上面去，别让它掉出编辑区
  const menuH = Math.min(items.length * 32 + 34, SLASH_MENU_MAX_H);
  const below = pos.top + pos.lineHeight;
  const rawTop = (below + menuH > ta.clientHeight && pos.top - menuH > 0) ? pos.top - menuH - 2 : below;
  const top = Math.max(Math.min(rawTop, ta.clientHeight - menuH), 0);
  root.innerHTML = `<div class="slashMenu" style="top:${top}px;left:${left}px;">
    <div class="slashMenuHead">${esc(T("review.slash.title"))}${slashMenu.query ? ` · ${esc(slashMenu.query)}` : ""}</div>
    ${items.length
      ? items.map((it, i) => `<button class="slashItem ${i === slashMenu.index ? "active" : ""}" data-action="slash-pick" data-cmd="${it.cmd}">
          ${ICONS[SLASH_ICONS[it.cmd]] || ""}<span>${esc(T(it.labelKey))}</span>
        </button>`).join("")
      : `<div class="slashEmpty">${esc(T("review.slash.empty"))}</div>`}
  </div>`;
}

/* ---------- 交易选择器 ----------
   只渲染进 #tradePickerRoot，绝不碰编辑器本体；搜索时也只换结果区，
   否则输入框自己会被重建、光标丢失。 */
let tradePickerCaret = null;
const TRADE_PICKER_LIMIT = 40;

function openTradePicker() {
  const ta = document.getElementById("reviewBodyInput");
  tradePickerCaret = ta ? { from: ta.selectionStart, to: ta.selectionEnd } : null;
  tradePickerOpen = true;
  tradePickerQuery = "";
  renderTradePicker();
}
function closeTradePicker() {
  tradePickerOpen = false;
  const root = document.getElementById("tradePickerRoot");
  if (root) root.innerHTML = "";
  const ta = document.getElementById("reviewBodyInput");
  if (ta) ta.focus();
}
/* 选择器自己的搜索，不复用记录页的 tradeMatchesSearch()——那个只搜
   text/textarea/url，而在这里最常搜的恰恰是日期和模型（select 类型）。 */
function tradePickerMatches(t, q) {
  if (!q) return true;
  return schema.some((f) => {
    const v = t[f.id];
    if (v === undefined || v === null || v === "") return false;
    const str = Array.isArray(v) ? v.join(" ") : String(v);
    return str.toLowerCase().includes(q);
  });
}
function tradePickerList() {
  const q = (tradePickerQuery || "").trim().toLowerCase();
  const dateF = roleField("date");
  const list = trades.filter((t) => tradePickerMatches(t, q));
  return list.slice().sort((a, b) => {
    const av = dateF ? (a[dateF.id] || "") : "";
    const bv = dateF ? (b[dateF.id] || "") : "";
    if (av !== bv) return av < bv ? 1 : -1;
    return (b._created_at || "") < (a._created_at || "") ? -1 : 1;
  });
}
function tradePickerResultsHtml() {
  const all = tradePickerList();
  if (!all.length) {
    return `<div class="tradePickerEmpty">${esc(trades.length ? T("review.picker.empty") : T("review.picker.noTrades"))}</div>`;
  }
  const shown = all.slice(0, TRADE_PICKER_LIMIT);
  const dateF = roleField("date"), modelF = roleField("model"), resultF = roleField("result"),
    rF = roleField("r_multiple"), shotF = roleField("screenshot");
  let html = shown.map((t) => {
    const result = resultF ? t[resultF.id] : "";
    const rc = resultColor(result);
    const shot = shotF ? t[shotF.id] : null;
    const rVal = rF ? t[rF.id] : "";
    const rTxt = (rVal !== undefined && rVal !== "" && !isNaN(parseFloat(rVal)))
      ? (parseFloat(rVal) >= 0 ? "+" : "") + rVal + "R" : "";
    return `<button class="tradePickerRow" data-action="pick-trade" data-id="${esc(t.id)}">
      ${shot
        ? `<img class="tradePickerThumb" src="${esc(shot)}" loading="lazy" referrerpolicy="no-referrer" data-fallback-url="${esc(shot)}" data-fallback-class="tradePickerThumbEmpty" onerror="window.__imgFallback(this)" />`
        : `<span class="tradePickerThumbEmpty">${ICONS.camera}</span>`}
      <span class="tradePickerDate mono">${esc((dateF && t[dateF.id]) || "—")}</span>
      <span class="tradePickerModel">${esc((modelF && t[modelF.id]) || "")}</span>
      <span class="mono" style="color:${rc};font-weight:600;">${esc(result || "")}</span>
      <span class="mono" style="color:${rc};">${esc(rTxt)}</span>
    </button>`;
  }).join("");
  if (all.length > shown.length) {
    html += `<div class="tradePickerMore">${esc(T("review.picker.more", { n: TRADE_PICKER_LIMIT }))}</div>`;
  }
  return html;
}
function renderTradePicker() {
  const root = document.getElementById("tradePickerRoot");
  if (!root) return;
  if (!tradePickerOpen) { root.innerHTML = ""; return; }
  root.innerHTML = `<div class="overlay tradePickerOverlay" data-action="close-trade-picker">
    <div class="modal tradePickerModal">
      <div class="modalHead">
        <div class="display" style="font-size:16px;font-weight:600;">${esc(T("review.picker.title"))}</div>
        <button class="iconBtn" data-action="close-trade-picker">${ICONS.x}</button>
      </div>
      <div class="tradePickerSearch">
        ${ICONS.search}
        <input class="input" type="text" id="tradePickerInput" placeholder="${esc(T("review.picker.search"))}"
          value="${esc(tradePickerQuery)}" oninput="window.__tradePickerInput(this)" />
      </div>
      <div class="tradePickerResults" id="tradePickerResults">${tradePickerResultsHtml()}</div>
    </div>
  </div>`;
  const input = document.getElementById("tradePickerInput");
  if (input) input.focus();
}
window.__tradePickerInput = function (el) {
  tradePickerQuery = el.value;
  const box = document.getElementById("tradePickerResults");
  if (box) box.innerHTML = tradePickerResultsHtml();   // 只换结果，输入框留着
};
function insertTradeRef(id) {
  const ta = document.getElementById("reviewBodyInput");
  closeTradePicker();
  if (!ta) return;
  const from = tradePickerCaret ? tradePickerCaret.from : ta.selectionStart;
  const to = tradePickerCaret ? tradePickerCaret.to : ta.selectionEnd;
  tradePickerCaret = null;
  replaceRange(ta, from, to, `[[trade:${id}]] `);
}

/* ---------- 打开 / 关闭编辑器 ---------- */
function openReviewEditor(id) {
  const r = reviews.find((x) => x.id === id);
  if (!r) return;
  editingReview = { id: r.id, title: r.title || "", body: r.body || "", week_start: r.week_start || "", _isNew: false };
  reviewEditMode = false;          // 打开已有帖子默认只读
  reviewSaveState = "idle";
  reviewSavedAt = null;
  reviewSaveError = null;
  slashMenu = null;
  tradePickerOpen = false;
  renderReviewEditor(true);
}
function openNewReview() {
  editingReview = { id: newReviewId(), title: "", body: "", week_start: thisMondayStr(), _isNew: true };
  reviewEditMode = true;           // 新建当然直接进编辑，只读的空白页没有意义
  reviewSaveState = "idle";
  reviewSavedAt = null;
  reviewSaveError = null;
  slashMenu = null;
  tradePickerOpen = false;
  renderReviewEditor(true);
}
async function closeReviewEditor() {
  closeSlashMenu();
  tradePickerOpen = false;
  const wasNew = editingReview && editingReview._isNew;
  const isBlank = editingReview && !(editingReview.title || "").trim() && !(editingReview.body || "").trim();
  if (wasNew && isBlank) {
    // 开了个空白页又直接关掉：别往数据库里塞空行
    clearTimeout(reviewSaveTimer); reviewSaveTimer = null;
    reviewSaveState = "idle";
    clearReviewDraft();
  } else {
    await flushReviewSave();
  }
  editingReview = null;
  reviewEditorRenderedFor = null;
  renderReviewEditor();
  render();
}

/* ============================================================
   RENDER — CALENDAR VIEW
   ============================================================ */
function renderMonthBar() {
  let html = `<div class="calendarPanel">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <div class="sectionLabel" style="margin:0;padding:0;border:none;">⟦ ${esc(T("calendar.monthOverview"))} ⟧</div>
    <div style="display:flex;align-items:center;gap:14px;">
      <button class="tinyBtn" data-action="calendar-prev-year" style="font-size:20px;line-height:1;">‹</button>
      <div class="monthYear" style="margin-bottom:0;">${calendarYear}</div>
      <button class="tinyBtn" data-action="calendar-next-year" style="font-size:20px;line-height:1;">›</button>
    </div>
  </div>
  <div class="monthBar">`;
  let ytdR = 0, ytdHasR = false, ytdCount = 0;
  for (let m = 1; m <= 12; m++) {
    const stats = aggregateTradeStats(tradesInMonth(calendarYear, m));
    if (stats.hasR) { ytdR += stats.rSum; ytdHasR = true; }
    ytdCount += stats.count;
    const tone = stats.count > 0 ? stats.tone : "";
    html += `<button class="monthBarCell ${tone} ${calendarMonth === m ? "current" : ""}" data-action="jump-to-month" data-month="${m}">
      <div class="monthBarLabel">${esc(new Date(2000, m - 1, 1).toLocaleString(localeTag(), { month: "short" }))}</div>
      ${stats.count > 0 ? `<div class="monthBarValue">${stats.hasR ? fmtNum(stats.rSum) + "R" : T("calendar.winLoss", { w: stats.w, l: stats.l })}${stats.wr !== null ? ` · ${fmtPct(stats.wr)}` : ""}</div>` : ""}
    </button>`;
  }
  const ytdTone = ytdHasR ? (ytdR > 0.0001 ? "pos" : ytdR < -0.0001 ? "neg" : "neutral") : "";
  html += `<div class="monthBarCell ${ytdTone}" style="cursor:default;">
    <div class="monthBarLabel">YTD</div>
    ${ytdCount > 0 ? `<div class="monthBarValue">${ytdHasR ? fmtNum(ytdR) + "R" : ""}</div>` : ""}
  </div></div></div>`;
  return html;
}
function renderDayCalendar() {
  const year = calendarYear, month = calendarMonth;
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadBlanks = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const totalCells = Math.ceil((leadBlanks + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(year, month - 1, 1 - leadBlanks + i);
    cells.push({
      day: d.getDate(),
      inMonth: d.getMonth() === month - 1 && d.getFullYear() === year,
      dateStr: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"),
    });
  }

  let weeksHtml = "";
  for (let w = 0; w < cells.length; w += 7) {
    const weekCells = cells.slice(w, w + 7);
    weeksHtml += weekCells.map((c) => {
      if (!c.inMonth) return `<div class="dayCell outMonth"><div class="dayCellNum">${c.day}</div></div>`;
      const stats = aggregateTradeStats(tradesOnDate(c.dateStr));
      const tone = stats.count > 0 ? stats.tone : "";
      return `<div class="dayCell ${tone}" data-action="open-day-detail" data-date="${c.dateStr}">
        <div class="dayCellNum">${c.day}</div>
        ${stats.count > 0 ? `<div class="dayCellInfo">${esc(T("dayDetail.summary", { n: stats.count }))}${stats.hasR ? `<br>${fmtNum(stats.rSum)}R${stats.wr !== null ? ` · ${fmtPct(stats.wr)}` : ""}` : ""}</div>` : ""}
      </div>`;
    }).join("");
    const weekStats = aggregateTradeStats(weekCells.flatMap((c) => tradesOnDate(c.dateStr)));
    const weekTone = weekStats.count > 0 ? weekStats.tone : "";
    weeksHtml += `<div class="weekCell ${weekTone}">
      ${weekStats.count > 0 ? `<div class="weekCellInfo">${weekStats.hasR ? fmtNum(weekStats.rSum) + "R" : T("calendar.winLoss", { w: weekStats.w, l: weekStats.l })}${weekStats.wr !== null ? ` · ${fmtPct(weekStats.wr)}` : ""}</div>` : `<div class="weekCellInfo muted">—</div>`}
    </div>`;
  }

  let html = `<div class="calendarPanel" id="day-calendar-top">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <div class="sectionLabel" style="margin:0;padding:0;border:none;">⟦ ${esc(T("calendar.dayDetail"))} ⟧</div>
    <div style="display:flex;align-items:center;gap:14px;">
      <button class="tinyBtn" data-action="cal-prev-month" style="font-size:20px;line-height:1;">‹</button>
      <div class="monthYear" style="margin-bottom:0;">${esc(new Date(year, month - 1, 1).toLocaleString(localeTag(), { year: "numeric", month: "long" }))}</div>
      <button class="tinyBtn" data-action="cal-next-month" style="font-size:20px;line-height:1;">›</button>
    </div>
  </div>
  <div class="dayGrid">
    ${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => `<div class="dayGridHead">${esc(T("calendar.week" + d))}</div>`).join("")}<div class="dayGridHead">${esc(T("calendar.thisWeek"))}</div>
    ${weeksHtml}
  </div></div>`;
  return html;
}
function renderHistoryCoverage() {
  const statusLabel = { complete: T("coverage.complete"), partial: T("coverage.partial"), empty: T("coverage.empty") };
  const curYear = new Date().getFullYear();
  let html = `<div class="calendarPanel" style="margin-top:20px;">
  <div class="sectionLabel" style="margin:0 0 12px;padding:0;border:none;">⟦ ${esc(T("coverage.title", { year: curYear }))} ⟧</div>
  <div style="font-size:12.5px;color:var(--muted);margin-bottom:20px;line-height:1.7;">
    ${T("coverage.rule")}</div>`;
  for (let y = curYear; y >= 2020; y--) {
    const monthsData = computeMonthCoverageForYear(y);
    html += `<div class="monthYear">${y}</div><div class="monthGrid">`;
    for (let i = 1; i <= 12; i++) {
      const mo = String(i).padStart(2, "0");
      const m = monthsData[mo];
      const isSelected = calendarYear === y && calendarMonth === i;
      html += `<div class="monthCell ${m.status} ${isSelected ? "selected" : ""}" data-action="jump-to-history-month" data-year="${y}" data-month="${i}" style="cursor:pointer;"><div class="monthCellDate">${y}-${mo}</div><div class="monthCellStatus">${statusLabel[m.status]}</div></div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}
function renderCalendar() {
  const dateF = roleField("date");
  if (!dateF) return `<div class="notice">${ICONS.alert}<span>${T("calendar.noDateRole")}</span></div>`;
  const filtered = trades.filter((t) => activeFilters.every((f) => tradeMatchesFilter(t, f)));
  let html = renderFilterOriginBanner() + `<div style="margin-bottom:22px;">${renderFilterPanel(filtered.length, filtered)}</div>`;
  html += `<div style="margin-bottom:22px;">${renderMonthBar()}</div><div style="margin-bottom:22px;">${renderDayCalendar()}</div>`;
  if (recordMode === "backtest") html += renderHistoryCoverage();
  return html;
}

/* ============================================================
   RENDER — SETTINGS VIEW
   ============================================================ */
function renderAdminPanel() {
  const cfg = currentApiConfig();
  const usingStored = !!getStoredApiConfig();
  let html = `<div class="settingsRow" style="border-color:var(--accent);">
      <div class="settingsRowHead" style="cursor:default;">
        <div style="flex:1;"><span class="mono" style="font-size:13.5px;color:var(--accent);">${T("admin.supabaseTitle")}</span>
        <span class="fieldTypeTag">${esc(usingStored ? T("admin.usingStored") : T("admin.usingFile"))}</span></div>
      </div>
      <div class="settingsRowBody open">
        <div class="field"><div class="fieldLabel">Project URL</div><input class="input" id="apiUrlInput" placeholder="https://xxxx.supabase.co" value="${esc(cfg.url)}" /></div>
        <div class="field"><div class="fieldLabel">Publishable / anon key</div><input class="input" id="apiKeyInput" placeholder="sb_publishable_..." value="${esc(cfg.key)}" /></div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary" data-action="save-api-config">${T("admin.saveReconnect")}</button>
          ${usingStored ? `<button class="btn" data-action="reset-api-config">${T("admin.resetApi")}</button>` : ""}
        </div>
        <div style="font-size:11px;color:var(--mutedDark);margin-top:8px;">${T("admin.apiHint")}</div>
      </div>
    </div>

    <div class="settingsRow" style="border-color:var(--accent);">
      <div class="settingsRowHead" data-action="toggle-settings-row" data-id="__admin_users__">
        <div style="flex:1;"><span class="mono" style="font-size:13.5px;color:var(--accent);">${T("admin.usersTitle")}</span>
        <span class="fieldTypeTag">${esc(adminUsers === null ? T("admin.clickToLoad") : T("admin.userCount", { n: adminUsers.length }))}</span></div>
        ${openSettingsRow === "__admin_users__" ? ICONS.chevUp : ICONS.chevDown}
      </div>
      <div class="settingsRowBody ${openSettingsRow === "__admin_users__" ? "open" : ""}">
        ${adminUsers === null
          ? `<div style="font-size:12px;color:var(--mutedDark);">${T("admin.autoLoad")}</div>`
          : `<div style="overflow-x:auto;"><table class="adminTable"><thead><tr><th>${esc(T("admin.colEmail"))}</th><th>${esc(T("admin.colName"))}</th><th>${esc(T("admin.colRole"))}</th><th>${esc(T("admin.colStatus"))}</th>${["tradeCount", "last_seen_at", "created_at"].map((key, i) => {
                const label = [T("admin.colTrades"), T("admin.colLastSeen"), T("admin.colCreated")][i];
                const active = adminUsersSortBy === key;
                const arrow = active ? (adminUsersSortDir === "asc" ? " ▲" : " ▼") : "";
                return `<th data-action="sort-admin-users" data-key="${key}" style="cursor:pointer;user-select:none;${active ? "color:var(--accent);" : ""}">${label}${arrow}</th>`;
              }).join("")}<th></th></tr></thead><tbody>
              ${sortAdminUsers(adminUsers).map((u) => `<tr>
                <td>${esc(u.email)}</td>
                <td>${esc(u.display_name || "—")}</td>
                <td><span class="pill ${u.role === "admin" ? "on" : ""}">${esc(u.role)}</span></td>
                <td><span class="pill ${u.active ? "on" : "off"}">${esc(u.active ? T("admin.active") : T("admin.disabled"))}</span></td>
                <td class="mono">${u.tradeCount !== undefined ? u.tradeCount : "—"}</td>
                <td class="mono" style="font-size:11px;color:var(--mutedDark);">${u.last_seen_at ? esc(new Date(u.last_seen_at).toLocaleString(localeTag(), { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })) : esc(T("admin.neverLoggedIn"))}</td>
                <td class="mono" style="font-size:11px;color:var(--mutedDark);">${esc(String(u.created_at || "").slice(0, 10))}</td>
                <td style="white-space:nowrap;">
                  <button class="tinyBtn" data-action="toggle-user-active" data-id="${esc(u.id)}" data-next="${!u.active}" style="color:${u.active ? "var(--neg)" : "var(--pos)"};margin-right:10px;">${esc(u.active ? T("admin.disable") : T("admin.enable"))}</button>
                  <button class="tinyBtn" data-action="toggle-user-role" data-id="${esc(u.id)}" data-next="${u.role === "admin" ? "user" : "admin"}" style="color:var(--accent);margin-right:10px;">${esc(u.role === "admin" ? T("admin.removeAdmin") : T("admin.makeAdmin"))}</button>
                  ${u.id !== session.user.id ? `<button class="tinyBtn" data-action="view-user-data" data-id="${esc(u.id)}" data-email="${esc(u.email)}" style="color:var(--accent);">${ICONS.expand} ${T("admin.viewData")}</button>` : ""}
                </td>
              </tr>`).join("")}
            </tbody></table></div>
            <div style="font-size:11px;color:var(--mutedDark);margin-top:10px;">${T("admin.disableHint")}</div>`
        }
      </div>
    </div>`;
  return html;
}
function renderSettings() {
  if (viewingUserId) {
    return `<div style="font-size:12.5px;color:var(--muted);margin-bottom:16px;line-height:1.7;">
      ${esc(T("settings.readOnlyNote", { email: viewingUserEmail }))}</div>
      ${schema.map((f) => `<div class="settingsRow" style="cursor:default;">
        <div class="settingsRowHead" style="cursor:default;">
          <div style="flex:1;">
            <span class="mono" style="font-size:13.5px;color:var(--text);">${esc(f.label)}</span>
            <span class="fieldTypeTag">${esc(fieldTypeLabel(f.type))}</span>
            ${f.role ? `<span class="fieldRoleTag">· ${esc(roleLabel(f.role))}</span>` : ""}
          </div>
        </div>
        ${(f.options && f.options.length) ? `<div class="settingsRowBody open"><div class="chipGroup">${f.options.map((o) => `<span class="chip">${esc(o)}</span>`).join("")}</div></div>` : ""}
      </div>`).join("")}`;
  }
  let html = `<div style="font-size:12.5px;color:var(--muted);margin-bottom:16px;line-height:1.7;">
    ${T("settings.fieldsHint")}</div>`;
  schema.forEach((f, i) => {
    const open = openSettingsRow === f.id;
    html += `<div class="settingsRow" draggable="${open ? "false" : "true"}" data-field-idx="${i}">
      <div class="settingsRowHead" data-action="toggle-settings-row" data-id="${esc(f.id)}">
        <span class="dragHandle" title="${esc(T("common.dragToReorder"))}">⠿</span>
        <div style="flex:1;">
          <span class="mono" style="font-size:13.5px;color:var(--text);">${esc(f.label)}</span>
          <span class="fieldTypeTag">${esc(fieldTypeLabel(f.type))}</span>
          ${f.role ? `<span class="fieldRoleTag">· ${esc(roleLabel(f.role))}</span>` : ""}
        </div>
        ${open ? ICONS.chevUp : ICONS.chevDown}
      </div>
      <div class="settingsRowBody ${open ? "open" : ""}">
        <div class="field"><div class="fieldLabel">${T("settings.fieldName")}</div><input class="input" data-field-edit="label" data-id="${esc(f.id)}" value="${esc(f.label)}" /></div>
        <div class="field"><div class="fieldLabel">${T("settings.type")}</div>
          <select class="input" data-field-edit="type" data-id="${esc(f.id)}">
            ${fieldTypes().map((ft) => `<option value="${ft.value}" ${f.type === ft.value ? "selected" : ""}>${esc(ft.label)}</option>`).join("")}
          </select></div>
        <div class="field"><div class="fieldLabel">${T("settings.role")}</div>
          <select class="input" data-field-edit="role" data-id="${esc(f.id)}">
            ${roleOptions().map((r) => `<option value="${r.value}" ${(f.role || "") === r.value ? "selected" : ""}>${esc(r.label)}</option>`).join("")}
          </select></div>
        ${(f.type === "select" || f.type === "multiselect") ? `
        <div class="field"><div class="fieldLabel">${T("settings.optionPool")}</div>
          <div id="optpool-${esc(f.id)}">${(f.options || []).map((o, oi) => `<span class="tagChip" draggable="true" data-opt-field="${esc(f.id)}" data-opt-idx="${oi}" style="cursor:grab;">⠿ ${esc(o)}<span data-action="remove-option" data-id="${esc(f.id)}" data-opt="${esc(o)}">${ICONS.x}</span></span>`).join("")}</div>
          <div class="addOptRow"><input class="input" id="optdraft-${esc(f.id)}" placeholder="${esc(T("settings.newOptionPlaceholder"))}" />
          <button class="btn" data-action="add-option" data-id="${esc(f.id)}">${T("common.add")}</button></div>
        </div>` : ""}
        <button class="btn btn-danger" data-action="delete-field" data-id="${esc(f.id)}">${ICONS.trash} ${T("settings.deleteField")}</button>
      </div>
    </div>`;
  });
  html += `<div class="addFieldBox">
    <div class="dashLabel">${esc(T("settings.addFieldTitle"))}</div>
    <div class="field"><div class="fieldLabel">${T("settings.fieldName")}</div><input class="input" id="newFieldLabel" placeholder="${esc(T("settings.newFieldPlaceholder"))}" /></div>
    <div class="field"><div class="fieldLabel">${T("settings.type")}</div>
      <select class="input" id="newFieldType">${fieldTypes().map((ft) => `<option value="${ft.value}">${esc(ft.label)}</option>`).join("")}</select></div>
    <div class="field"><div class="fieldLabel">${T("settings.initialOptions")}</div><input class="input" id="newFieldOpts" placeholder="yes, no, maybe" /></div>
    <button class="btn btn-primary" data-action="add-field">${ICONS.plus} ${T("settings.addField")}</button>
  </div>`;
  return html;
}

/* ============================================================
   RENDER — TRADE FORM MODAL
   ============================================================ */
let formDraft = {};
function chipGroupHtml(field, valueArr, multi) {
  const arr = multi ? (valueArr || []) : null;
  const single = multi ? null : (valueArr || "");
  let html = `<div class="chipGroup" id="chipgroup-${esc(field.id)}">`;
  (field.options || []).forEach((opt) => {
    const active = multi ? arr.includes(opt) : single === opt;
    html += `<button type="button" class="chip ${active ? "active" : ""}" data-action="toggle-chip" data-field="${esc(field.id)}" data-opt="${esc(opt)}" data-multi="${multi}">${esc(opt)}</button>`;
  });
  html += `</div>`;
  return html;
}
function fieldInputHtml(field) {
  const val = formDraft[field.id];
  switch (field.type) {
    case "select": return chipGroupHtml(field, val, false);
    case "multiselect": return chipGroupHtml(field, val, true);
    case "textarea": return `<textarea class="input" rows="${field.id === "notes" ? 4 : 3}" data-form-field="${esc(field.id)}">${esc(val || "")}</textarea>`;
    case "number": return `<input type="number" step="0.01" class="input" data-form-field="${esc(field.id)}" value="${esc(val ?? "")}" />`;
    case "date": return `<input type="date" class="input" data-form-field="${esc(field.id)}" value="${esc(val || "")}" />`;
    case "time": return `<input type="time" class="input" data-form-field="${esc(field.id)}" value="${esc(val || "")}" />`;
    case "url":
      return `<input type="text" class="input" placeholder="https://…" data-form-field="${esc(field.id)}" value="${esc(val || "")}" oninput="window.__updateUrlPreview('${esc(field.id)}', this.value)" />
        <div id="urlpreview-${esc(field.id)}">${urlPreviewHtml(val)}</div>`;
    default: return `<input type="text" class="input" data-form-field="${esc(field.id)}" value="${esc(val || "")}" />`;
  }
}
function urlPreviewHtml(val) {
  if (!val || !/^https?:\/\//.test(val)) return "";
  return `<div class="thumbWrap"><img class="thumb" src="${esc(val)}" referrerpolicy="no-referrer" data-fallback-url="${esc(val)}" data-fallback-class="thumbFallback" onerror="window.__imgFallback(this)" /></div><div class="thumbHint">${T("modal.urlPreviewHint")}</div>`;
}
window.__updateUrlPreview = function (fieldId, val) {
  formDraft[fieldId] = val;
  const box = document.getElementById("urlpreview-" + fieldId);
  if (box) box.innerHTML = urlPreviewHtml(val);
};
function timeDigitsToDisplay(digits) {
  digits = digits.slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, digits.length - 2) + ":" + digits.slice(-2);
}
window.__formatTimeInput = function (el) {
  const pos = el.selectionStart;
  const before = el.value.length;
  const digits = el.value.replace(/\D/g, "").slice(0, 4);
  el.value = timeDigitsToDisplay(digits);
  const after = el.value.length;
  const newPos = Math.max(0, (pos || after) + (after - before));
  try { el.setSelectionRange(newPos, newPos); } catch (e) {}
};
function normalizeTimeValue(raw) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 4);
  if (!digits) return "";
  const h = digits.length <= 2 ? digits : digits.slice(0, digits.length - 2);
  const m = digits.length <= 2 ? "0" : digits.slice(-2);
  const hn = Math.min(23, parseInt(h, 10) || 0);
  const mn = Math.min(59, parseInt(m, 10) || 0);
  return String(hn).padStart(2, "0") + ":" + String(mn).padStart(2, "0");
}
const IMG_RETRY_DELAYS = [700, 1800]; // ms — a couple of short backoffs before giving up
window.__imgFallback = function (imgEl) {
  const url = imgEl.dataset.fallbackUrl || "";
  const retryCount = parseInt(imgEl.dataset.retryCount || "0", 10);
  if (retryCount < IMG_RETRY_DELAYS.length) {
    imgEl.dataset.retryCount = String(retryCount + 1);
    const sep = url.includes("?") ? "&" : "?";
    setTimeout(() => {
      if (!imgEl.isConnected) return;
      imgEl.src = url + sep + "_retry=" + Date.now();
    }, IMG_RETRY_DELAYS[retryCount]);
    return;
  }
  const originalImgHtml = imgEl.outerHTML;
  const wrap = document.createElement("div");
  wrap.className = imgEl.dataset.fallbackClass || "thumbFallback";
  const iconSpan = document.createElement("span");
  iconSpan.innerHTML = ICONS.camera;
  if (iconSpan.firstElementChild) { iconSpan.firstElementChild.style.width = "16px"; iconSpan.firstElementChild.style.height = "16px"; }
  wrap.appendChild(iconSpan);
  const label = document.createElement("span");
  label.textContent = T("image.loadFailed");
  wrap.appendChild(label);
  const linkRow = document.createElement("div");
  linkRow.style.display = "flex";
  linkRow.style.gap = "8px";
  const retryLink = document.createElement("a");
  retryLink.href = "#";
  retryLink.textContent = T("image.retry");
  retryLink.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const tmp = document.createElement("div");
    tmp.innerHTML = originalImgHtml;
    const freshImg = tmp.firstElementChild;
    freshImg.removeAttribute("data-retry-count");
    wrap.replaceWith(freshImg);
  });
  linkRow.appendChild(retryLink);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = T("image.openInNewTab");
  a.addEventListener("click", (e) => e.stopPropagation());
  linkRow.appendChild(a);
  wrap.appendChild(linkRow);
  imgEl.replaceWith(wrap);
};
let modalRenderedForId = null;
function renderModal(force) {
  const root = document.getElementById("modalRoot");
  if (!editingTrade) { modalRenderedForId = null; root.innerHTML = ""; return; }
  if (!force && modalRenderedForId === editingTrade.id) return; // already showing this trade — don't wipe unsaved input
  modalRenderedForId = editingTrade.id;
  formDraft = { ...editingTrade };
  const isNew = editingTrade._isNew;
  const resumedDraft = editingTrade._resumedDraft;
  const readOnly = !!viewingUserId;
  root.innerHTML = `<div class="overlay">
    <div class="modal">
      <div class="modalHead"><div class="display" style="font-size:17px;font-weight:600;">${readOnly ? T("modal.viewTrade") : isNew ? T("common.newTrade") : T("modal.editTrade")}</div>
        <button class="iconBtn" data-action="close-modal">${ICONS.x}</button></div>
      ${resumedDraft ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 22px;background:var(--accentSoft);border-bottom:1px solid var(--border);font-size:12.5px;color:var(--accent);">
        <span>${T("modal.draftRestored")}</span>
        <button class="tinyBtn" data-action="clear-draft" style="color:var(--accent);text-decoration:underline;">${T("modal.clearDraft")}</button>
      </div>` : ""}
      <div class="modalBody ${readOnly ? "readOnlyFields" : ""}" ${readOnly ? 'style="opacity:.75;"' : ""}>
        ${schema.map((f) => `<div class="field"><div class="fieldLabel">${esc(f.label)}</div>${fieldInputHtml(f)}</div>`).join("")}
      </div>
      <div class="modalFoot"><button class="btn" data-action="close-modal">${readOnly ? T("common.close") : T("common.cancel")}</button>
        ${readOnly ? "" : `<button class="btn btn-primary" data-action="save-trade">${T("common.save")}</button>`}</div>
    </div>
  </div>`;
}

/* ============================================================
   MAIN RENDER
   ============================================================ */
function renderAuthScreen() {
  const isRegister = authScreenMode === "register";
  return `
  <div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:auto;padding:40px 16px;">
    <div style="max-width:380px;width:100%;">
      <div class="brand" style="text-align:center;margin-bottom:28px;"><span class="accent">IFVG</span> Trade Journal</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;">
        <div style="display:flex;gap:6px;margin-bottom:18px;">
          <button class="btn ${!isRegister ? "btn-primary" : ""}" style="flex:1;" data-action="auth-mode" data-mode="login">${T("auth.login")}</button>
          <button class="btn ${isRegister ? "btn-primary" : ""}" style="flex:1;" data-action="auth-mode" data-mode="register">${T("auth.register")}</button>
        </div>
        <div class="field"><div class="fieldLabel">${T("auth.email")}</div><input class="input" type="email" id="authEmail" autocomplete="username" /></div>
        <div class="field"><div class="fieldLabel">${T("auth.password")}</div><input class="input" type="password" id="authPassword" autocomplete="${isRegister ? "new-password" : "current-password"}" /></div>
        ${!isRegister ? `<label style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--muted);margin-bottom:14px;cursor:pointer;">
          <input type="checkbox" id="rememberMeCheck" checked style="width:14px;height:14px;" />${T("auth.rememberMe")}
        </label>` : ""}
        ${isRegister ? `<div style="font-size:12px;color:var(--mutedDark);margin-bottom:12px;line-height:1.6;">${T("auth.newAccountLangHint")}</div>` : ""}
        ${authError ? `<div style="font-size:12.5px;color:var(--neg);margin-bottom:12px;line-height:1.6;">${esc(authError)}</div>` : ""}
        ${authSuccess ? `<div style="font-size:12.5px;color:var(--pos);margin-bottom:12px;line-height:1.6;">${esc(authSuccess)}</div>` : ""}
        <button class="btn btn-primary" style="width:100%;justify-content:center;" data-action="auth-submit" ${authBusy ? "disabled" : ""}>
          ${authBusy ? T("common.processing") : isRegister ? T("auth.register") : T("auth.login")}
        </button>
      </div>
      <div style="display:flex;justify-content:center;margin-top:20px;">${langToggleHtml()}</div>
    </div>
  </div>`;
}
/* 语言切换控件：登录页和个人设置弹窗共用同一段 HTML */
function langToggleHtml() {
  return `<div class="modeToggle" title="${esc(T("lang.switchTitle"))}">
    ${I18N_LANGS.map((L) => `<button class="modeBtn ${lang === L ? "active" : ""}" data-action="set-lang" data-lang="${L}">${esc(T("lang." + L))}</button>`).join("")}
  </div>`;
}
function renderDisabledScreen() {
  return `<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:auto;padding:40px 16px;">
    <div style="max-width:380px;width:100%;text-align:center;">
      <div class="notice error" style="justify-content:center;">${ICONS.alert}<span>${T("auth.disabled")}</span></div>
      <button class="btn" style="margin-top:16px;" data-action="logout">${T("auth.logout")}</button>
    </div>
  </div>`;
}
function profileModalHtml() {
  const p = currentProfile || {};
  profileGenderDraft = p.gender || null;
  return `<div class="overlay">
    <div class="modal" style="max-width:420px;">
      <div class="modalHead"><div class="display" style="font-size:17px;font-weight:600;">${T("header.profile")}</div>
        <button class="iconBtn" data-action="close-profile-modal">${ICONS.x}</button></div>
      <div class="modalBody">
        <div class="field"><div class="fieldLabel">${esc(T("lang.label"))}</div>
          ${langToggleHtml()}
          <div style="font-size:11px;color:var(--mutedDark);margin-top:6px;line-height:1.5;">${esc(T("lang.hintShort"))}</div>
        </div>
        <div style="border-top:1px solid var(--border);margin:16px 0;"></div>
        <div class="field"><div class="fieldLabel">${T("profile.displayName")}</div>
          <input class="input" id="profileNameInput" value="${esc(p.display_name || "")}" placeholder="${esc(T("profile.namePlaceholder"))}" /></div>
        <div class="field"><div class="fieldLabel">${T("profile.gender")}</div>
          <div class="chipGroup">
            <button type="button" class="chip ${p.gender === "男" ? "active" : ""}" data-action="set-gender-draft" data-val="男">${esc(T("profile.male"))}</button>
            <button type="button" class="chip ${p.gender === "女" ? "active" : ""}" data-action="set-gender-draft" data-val="女">${esc(T("profile.female"))}</button>
          </div>
        </div>
        ${profileError ? `<div style="font-size:12.5px;color:var(--neg);margin-bottom:10px;">${esc(profileError)}</div>` : ""}
        ${profileSuccess ? `<div style="font-size:12.5px;color:var(--pos);margin-bottom:10px;">${esc(profileSuccess)}</div>` : ""}
        <button class="btn btn-primary" data-action="save-profile" ${profileBusy ? "disabled" : ""}>${profileBusy ? T("common.saving") : T("common.save")}</button>

        <div style="border-top:1px solid var(--border);margin:22px 0 16px;"></div>
        <div class="sectionLabel">⟦ ${esc(T("password.title"))} ⟧</div>
        <div class="field"><div class="fieldLabel">${T("password.current")}</div><input class="input" type="password" id="pwCurrentInput" autocomplete="current-password" /></div>
        <div class="field"><div class="fieldLabel">${T("password.new")}</div><input class="input" type="password" id="pwNewInput" autocomplete="new-password" /></div>
        <div class="field"><div class="fieldLabel">${T("password.confirm")}</div><input class="input" type="password" id="pwConfirmInput" autocomplete="new-password" /></div>
        ${passwordError ? `<div style="font-size:12.5px;color:var(--neg);margin-bottom:10px;">${esc(passwordError)}</div>` : ""}
        ${passwordSuccess ? `<div style="font-size:12.5px;color:var(--pos);margin-bottom:10px;">${esc(passwordSuccess)}</div>` : ""}
        <button class="btn btn-primary" data-action="save-password" ${passwordBusy ? "disabled" : ""}>${passwordBusy ? T("common.processing") : T("password.title")}</button>
      </div>
    </div>
  </div>`;
}
let profileGenderDraft = null;
function lightboxHtml() {
  return `<div class="overlay" data-action="close-lightbox" style="padding:30px;">
    <img src="${esc(lightboxUrl)}" referrerpolicy="no-referrer" style="max-width:100%;max-height:100%;border-radius:10px;display:block;" onclick="event.stopPropagation()" />
    <button class="iconBtn" data-action="close-lightbox" style="position:absolute;top:20px;right:24px;background:rgba(0,0,0,.5);color:#fff;">${ICONS.x}</button>
  </div>`;
}
let secondaryModalState = null;
function dayDetailModalHtml() {
  const dateF = roleField("date"), resultF = roleField("result"), rF = roleField("r_multiple"), modelF = roleField("model"), shotF = roleField("screenshot");
  const list = tradesOnDate(dayDetailDate);
  const stats = aggregateTradeStats(list);
  return `<div class="overlay" data-action="close-day-detail">
    <div class="modal" style="max-width:580px;">
      <div class="modalHead"><div class="display" style="font-size:17px;font-weight:600;">${esc(dayDetailDate)}</div>
        <button class="iconBtn" data-action="close-day-detail">${ICONS.x}</button></div>
      <div class="modalBody">
        <div style="font-size:12.5px;color:var(--muted);margin-bottom:14px;">${esc(stats.hasR ? T("dayDetail.summaryWithR", { n: stats.count, r: fmtNum(stats.rSum) }) : T("dayDetail.summary", { n: stats.count }))}</div>
        ${list.length === 0 ? `<div style="color:var(--mutedDark);font-size:13px;margin-bottom:14px;">${T("dayDetail.empty")}</div>` : ""}
        ${list.map((t) => {
          const result = resultF ? t[resultF.id] : null;
          const rc = resultColor(result);
          const shot = shotF ? t[shotF.id] : null;
          const confirming = confirmDeleteId === t.id;
          return `<div class="dayDetailRow">
            <div data-action="open-trade-from-day" data-id="${esc(t.id)}" style="display:flex;align-items:center;gap:12px;flex:1;cursor:pointer;min-width:0;">
              ${shot
                ? `<img class="dayDetailThumb" src="${esc(shot)}" loading="lazy" referrerpolicy="no-referrer" data-action="preview-image" data-url="${esc(shot)}" data-fallback-url="${esc(shot)}" data-fallback-class="dayDetailThumbEmpty" onerror="window.__imgFallback(this)" />`
                : `<div class="dayDetailThumbEmpty">${ICONS.camera}</div>`}
              <span class="mono" style="color:${rc};font-weight:600;width:28px;flex-shrink:0;">${esc(result || "—")}</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${modelF ? esc(t[modelF.id] || "") : ""}</span>
              ${rF && t[rF.id] !== undefined && t[rF.id] !== "" ? `<span class="mono" style="color:${rc};flex-shrink:0;">${(parseFloat(t[rF.id]) >= 0 ? "+" : "") + t[rF.id]}R</span>` : ""}
            </div>
            ${viewingUserId ? "" : (!confirming
              ? `<button class="tinyBtn" data-action="ask-delete-day-trade" data-id="${esc(t.id)}" style="color:var(--mutedDark);flex-shrink:0;margin-left:8px;">${ICONS.trash}</button>`
              : `<span style="display:flex;gap:6px;flex-shrink:0;margin-left:8px;"><button class="tinyBtn" data-action="confirm-delete-day-trade" data-id="${esc(t.id)}" style="color:var(--neg);">✓</button><button class="tinyBtn" data-action="cancel-delete-day-trade">${ICONS.x}</button></span>`)}
          </div>`;
        }).join("")}
        ${viewingUserId ? "" : `<button class="btn btn-primary" data-action="new-trade-for-day" style="margin-top:14px;width:100%;justify-content:center;">${ICONS.plus} ${T("dayDetail.newTrade")}</button>`}
      </div>
    </div>
  </div>`;
}
function comboGroupModalHtml() {
  const m = comboGroupModal;
  const title = m.mode === "root" ? T("comboGroup.modalNewRoot") : m.mode === "sub" ? T("comboGroup.modalNewSub") : T("comboGroup.modalRename");
  return `<div class="overlay" data-action="dismiss-combo-group-overlay">
    <div class="modal" style="max-width:420px;">
      <div class="modalHead">
        <div class="display" style="font-size:16px;font-weight:600;">${esc(title)}</div>
        <button class="iconBtn" data-action="close-combo-group-modal">${ICONS.x}</button>
      </div>
      <div class="modalBody">
        <div class="field" style="margin-bottom:0;">
          <div class="fieldLabel">${T("comboGroup.nameLabel")}</div>
          <input type="text" class="input" id="comboGroupNameInput" value="${esc(m.name)}" placeholder="${esc(T("comboGroup.namePlaceholder"))}" maxlength="40" autofocus />
        </div>
      </div>
      <div class="modalFoot">
        <button class="btn" data-action="close-combo-group-modal">${T("common.cancel")}</button>
        <button class="btn btn-primary" data-action="save-combo-group-modal">${T("common.save")}</button>
      </div>
    </div>
  </div>`;
}
function renderSecondaryModals(force) {
  const root = document.getElementById("secondaryModalRoot");
  if (!root) return;
  const want = profileModalOpen ? "profile" : (lightboxUrl ? "lightbox" : (dayDetailDate ? "daydetail" : (comboGroupModal ? "combogroup" : null)));
  if (!force && want === secondaryModalState && want !== null) return; // already showing the right thing — don't wipe in-progress typing
  secondaryModalState = want;
  if (want === "profile") root.innerHTML = profileModalHtml();
  else if (want === "lightbox") root.innerHTML = lightboxHtml();
  else if (want === "combogroup") root.innerHTML = comboGroupModalHtml();
  else if (want === "daydetail") root.innerHTML = dayDetailModalHtml();
  else root.innerHTML = "";
}
// render() 每次都整体重建 app 的 innerHTML，滚动容器的节点也跟着被换掉，
// scrollTop 会被浏览器重置成 0 —— 这里手动把滚动位置搬到新节点上
function renderPreservingScroll(elId) {
  const prev = document.getElementById(elId);
  const scrollTop = prev ? prev.scrollTop : null;
  render();
  if (scrollTop !== null) {
    const next = document.getElementById(elId);
    if (next) next.scrollTop = scrollTop;
  }
}
function renderExportPanel() {
  const filteredCount = exportFilteredTrades().length;
  const allCount = trades.length;
  const scope = resolvedExportScope();
  return `
    <div style="padding:10px 12px 6px;font-size:11px;color:var(--mutedDark);">${T("export.scope")}</div>
    <div class="chipGroup" style="padding:0 12px 8px;margin-bottom:0;">
      <button type="button" class="chip ${scope === "filtered" ? "active" : ""}" data-action="set-export-scope" data-value="filtered">${T("export.scopeFiltered", { n: filteredCount })}</button>
      <button type="button" class="chip ${scope === "all" ? "active" : ""}" data-action="set-export-scope" data-value="all">${T("export.scopeAll", { n: allCount })}</button>
    </div>
    <div style="padding:8px 12px 6px;font-size:11px;color:var(--mutedDark);border-top:1px solid var(--border);">${T("export.columns")}</div>
    <div class="chipGroup" style="padding:0 12px 8px;margin-bottom:0;">
      <button type="button" class="chip ${exportColumns === "all" ? "active" : ""}" data-action="set-export-columns" data-value="all">${T("export.columnsAll")}</button>
      <button type="button" class="chip ${exportColumns === "selected" ? "active" : ""}" data-action="set-export-columns" data-value="selected">${T("export.columnsSelected")}</button>
    </div>
    ${exportColumns === "selected" ? `<div id="exportFieldsScroll" class="chipGroup" style="padding:0 12px 8px;max-height:180px;overflow-y:auto;">
      ${exportAllFields().map((f) => `<button type="button" class="chip ${exportSelectedFields.includes(f.id) ? "active" : ""}" data-action="toggle-export-field" data-id="${esc(f.id)}">${esc(f.label)}</button>`).join("")}
    </div>
    <div style="padding:0 12px 8px;display:flex;gap:10px;">
      <button type="button" class="tinyBtn" data-action="export-fields-select-all">${T("export.selectAll")}</button>
      <button type="button" class="tinyBtn" data-action="export-fields-clear">${T("export.clearAll")}</button>
    </div>` : ""}
    <button data-action="export-csv" ${exportColumns === "selected" && exportSelectedFields.length === 0 ? "disabled" : ""} style="border-top:1px solid var(--border);font-weight:600;color:var(--accent);">${ICONS.download} ${T("export.exportCsv")}</button>
    <button data-action="export-json">${ICONS.download} ${T("header.jsonBackup")}</button>
    <div style="padding:6px 12px 10px;font-size:10.5px;color:var(--mutedDark);line-height:1.4;">${T("export.jsonBackupHint")}</div>
  `;
}
function render() {
  const app = document.getElementById("app");

  if (authLoading) { app.innerHTML = `<div class="loading">${T("common.loading")}</div>`; return; }
  if (!session) { app.innerHTML = renderAuthScreen(); renderModal(); return; }
  if (currentProfile && currentProfile.active === false) { app.innerHTML = renderDisabledScreen(); return; }

  const hs = headerStats();
  const isAdmin = currentProfile && currentProfile.role === "admin";
  const displayName = currentProfile && currentProfile.display_name;
  const TABS = [
    { id: "grid", label: T("tab.grid"), icon: ICONS.grid },
    { id: "analytics", label: T("tab.analytics"), icon: ICONS.chart },
    { id: "calendar", label: T("tab.calendar"), icon: ICONS.calendar },
    { id: "changelog", label: T("tab.changelog"), icon: ICONS.clock },
    { id: "settings", label: T("tab.settings"), icon: ICONS.settings },
  ];
  // 复盘只在实盘模式下出现——回测那批数据不需要写周复盘，页签也就不该占位置
  if (recordMode === "live") TABS.splice(3, 0, { id: "reviews", label: T("tab.reviews"), icon: ICONS.book });
  if (isAdmin) TABS.push({ id: "admin", label: T("tab.admin"), icon: ICONS.shield });
  let body = "";
  try {
    if (tab === "grid") body = renderGrid();
    else if (tab === "analytics") body = renderAnalytics();
    else if (tab === "calendar") body = renderCalendar();
    else if (tab === "reviews") body = renderReviews();
    else if (tab === "changelog") body = renderChangelog();
    else if (tab === "settings") body = renderSettings();
    else if (tab === "admin") body = isAdmin ? renderAdminPanel() : `<div class="notice">${ICONS.alert}<span>${T("common.noPermission")}</span></div>`;
  } catch (err) {
    console.error(err);
    body = `<div class="notice error">${ICONS.alert}<span>${esc(T("common.tabRenderError", { msg: err.message || err }))}</span></div>`;
  }

  document.title = displayName ? T("header.titleWithName", { name: displayName }) : "IFVG Trade Journal";

  app.innerHTML = `
    <div class="header">
      <div>
        <div class="brand">${displayName ? T("header.titleWithName", { name: `<span class="accent">${esc(displayName)}</span>` }) : `<span class="accent">IFVG</span> Trade Journal`}</div>
        <div class="subline">${recordMode === "backtest" ? T("mode.backtest") : T("mode.live")} · taken ${hs.n} · WR ${fmtPct(hs.wr)} ${hs.hasR ? "· EV " + fmtNum(hs.ev, 3) : ""}</div>
      </div>
      <div class="headerActions">
        <div class="modeToggle">
          <button class="modeBtn ${recordMode === "backtest" ? "active" : ""}" data-action="set-record-mode" data-mode="backtest">${T("mode.backtest")}</button>
          <button class="modeBtn ${recordMode === "live" ? "active" : ""}" data-action="set-record-mode" data-mode="live">${T("mode.live")}</button>
        </div>
        <button class="themeToggle" data-action="toggle-theme" title="${esc(T("header.toggleTheme"))}">${document.documentElement.dataset.theme === "light" ? ICONS.moon : ICONS.sun}</button>
        <div style="position:relative;">
          <button class="btn" data-action="toggle-export">${ICONS.download} ${T("header.export")}</button>
          <div class="exportMenu ${exportMenuOpen ? "open" : ""}" style="min-width:250px;">
            ${exportMenuOpen ? renderExportPanel() : ""}
          </div>
        </div>
        ${!viewingUserId ? `<button class="btn btn-primary" data-action="new-trade">${ICONS.plus} ${T("common.newTrade")}</button>` : ""}
        <div style="position:relative;">
          <button class="themeToggle" data-action="toggle-user-menu" title="${esc(T("header.account"))}">${ICONS.user}</button>
          <div class="exportMenu ${userMenuOpen ? "open" : ""}" style="min-width:220px;">
            <div style="padding:9px 12px;font-size:11.5px;color:var(--mutedDark);border-bottom:1px solid var(--border);">
              ${esc(session.user.email)} ${isAdmin ? "· admin" : ""}
            </div>
            <button data-action="open-profile-modal">${T("header.profile")}</button>
            <button data-action="logout">${T("auth.logout")}</button>
          </div>
        </div>
      </div>
    </div>
    ${viewingUserId ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--accentSoft);border:1px solid var(--accent);border-radius:8px;padding:10px 16px;margin-bottom:16px;">
      <span style="font-size:13px;color:var(--accent);">${ICONS.expand} ${T("header.viewingUser", { email: `<b>${esc(viewingUserEmail)}</b>` })}</span>
      <button class="btn" data-action="exit-view-mode">${T("header.exitViewMode")}</button>
    </div>` : ""}
    <div class="nav">
      ${TABS.map((tb) => `<button class="tab ${tab === tb.id ? "active" : ""}" data-action="switch-tab" data-tab="${tb.id}">${tb.icon} ${tab === tb.id ? "[ " + esc(tb.label) + " ]" : esc(tb.label)}</button>`).join("")}
    </div>
    ${loadError ? `<div class="notice error" style="margin-bottom:20px;">${ICONS.alert}<span>${esc(loadError)}</span></div>` : ""}
    <div id="tabBody">${body}</div>
  `;
  renderModal();
  renderSecondaryModals();
  renderReviewEditor();
}

/* ============================================================
   EVENT DELEGATION
   ============================================================ */
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) {
    let changed = false;
    if (exportMenuOpen && !e.target.closest(".exportMenu") && !e.target.closest('[data-action="toggle-export"]')) { exportMenuOpen = false; changed = true; }
    if (userMenuOpen && !e.target.closest(".exportMenu") && !e.target.closest('[data-action="toggle-user-menu"]')) { userMenuOpen = false; changed = true; }
    if (changed) render();
    return;
  }
  const action = el.dataset.action;

  if (action === "switch-tab") { flushAnalysisPrefs(); tab = el.dataset.tab; confirmDeleteId = null; comboConfirmDeleteId = null; render(); }
  else if (action === "toggle-theme") {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    if (next === "light") document.documentElement.dataset.theme = "light"; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem("journal_theme", next); } catch (e) {}
    render();
  }
  else if (action === "set-lang") { await setLang(el.dataset.lang); }
  else if (action === "toggle-export") { exportMenuOpen = !exportMenuOpen; render(); }
  else if (action === "set-export-scope") { exportScope = el.dataset.value; render(); }
  else if (action === "set-export-columns") {
    exportColumns = el.dataset.value;
    if (exportColumns === "selected" && exportSelectedFields.length === 0) exportSelectedFields = schema.map((f) => f.id);
    render();
  }
  else if (action === "toggle-export-field") {
    const id = el.dataset.id;
    exportSelectedFields = exportSelectedFields.includes(id) ? exportSelectedFields.filter((x) => x !== id) : [...exportSelectedFields, id];
    renderPreservingScroll("exportFieldsScroll");
  }
  else if (action === "export-fields-select-all") { exportSelectedFields = exportAllFields().map((f) => f.id); renderPreservingScroll("exportFieldsScroll"); }
  else if (action === "export-fields-clear") { exportSelectedFields = []; renderPreservingScroll("exportFieldsScroll"); }
  else if (action === "export-csv") { downloadFile(`trades-${new Date().toISOString().slice(0,10)}.csv`, toCSV(exportTradeList(), exportFieldList()), "text/csv;charset=utf-8;"); exportMenuOpen = false; render(); }
  else if (action === "export-json") { downloadFile(`journal-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify({ schema, trades }, null, 2), "application/json"); exportMenuOpen = false; render(); }
  else if (action === "new-trade") {
    if (viewingUserId) return;
    const draft = loadDraft();
    const blank = { id: uid(), _isNew: true };
    schema.forEach((f) => { blank[f.id] = f.type === "multiselect" ? [] : ""; });
    if (draft) {
      schema.forEach((f) => { if (draft[f.id] !== undefined) blank[f.id] = draft[f.id]; });
      blank._resumedDraft = true;
    }
    const dateF = roleField("date");
    if (dateF && !blank[dateF.id]) {
      let latest = null;
      trades.forEach((t) => { if (!latest || (t._created_at || "") > (latest._created_at || "")) latest = t; });
      if (latest && latest[dateF.id]) blank[dateF.id] = latest[dateF.id];
    }
    editingTrade = blank; renderModal();
  }
  else if (action === "edit-trade") {
    const id = el.dataset.id;
    editingTrade = { ...trades.find((t) => t.id === id) };
    renderModal();
  }
  else if (action === "clear-draft") {
    clearDraft();
    const blank = { id: uid(), _isNew: true };
    schema.forEach((f) => { blank[f.id] = f.type === "multiselect" ? [] : ""; });
    editingTrade = blank;
    renderModal(true);
  }
  else if (action === "close-modal") {
    editingTrade = null;
    if (returnToDayDetail) { dayDetailDate = returnToDayDetail; returnToDayDetail = null; }
    renderModal(); render();
  }
  else if (action === "save-trade") {
    const wasNew = editingTrade && editingTrade._isNew;
    schema.forEach((f) => {
      if (f.type === "select" || f.type === "multiselect") return; // handled via chip clicks already in formDraft
      const inputEl = document.querySelector(`[data-form-field="${f.id}"]`);
      if (inputEl) formDraft[f.id] = inputEl.value;
    });
    await persistTrade(formDraft);
    if (wasNew) clearDraft();
    editingTrade = null;
    if (returnToDayDetail) { dayDetailDate = returnToDayDetail; returnToDayDetail = null; }
    renderModal(); render();
  }
  else if (action === "ask-delete") { if (viewingUserId) return; confirmDeleteId = el.dataset.id; render(); }
  else if (action === "add-filter") {
    const ctx = filterCtxOf(el); if (!ctx) return;
    ctx.arr.push(newFilterRow());
    afterFilterChange(ctx);
  }
  else if (action === "remove-filter") {
    const ctx = filterCtxOf(el); if (!ctx) return;
    ctx.arr.splice(parseInt(el.dataset.idx, 10), 1);
    afterFilterChange(ctx);
  }
  else if (action === "toggle-filter-value") {
    const ctx = filterCtxOf(el); if (!ctx) return;
    const row = ctx.arr[parseInt(el.dataset.idx, 10)];
    if (!row) return;
    const val = el.dataset.val, vals = row.values || [];
    row.values = vals.includes(val) ? vals.filter((v) => v !== val) : [...vals, val];
    afterFilterChange(ctx);
  }
  else if (action === "calendar-prev-year") { calendarYear--; render(); }
  else if (action === "calendar-next-year") { calendarYear++; render(); }
  else if (action === "cal-prev-month") {
    calendarMonth--; if (calendarMonth < 1) { calendarMonth = 12; calendarYear--; }
    render();
  }
  else if (action === "cal-next-month") {
    calendarMonth++; if (calendarMonth > 12) { calendarMonth = 1; calendarYear++; }
    render();
  }
  else if (action === "jump-to-month") { calendarMonth = parseInt(el.dataset.month, 10); render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  else if (action === "open-day-detail") { dayDetailDate = el.dataset.date; render(); }
  else if (action === "close-day-detail") { dayDetailDate = null; render(); }
  else if (action === "open-trade-from-day") {
    const id = el.dataset.id;
    returnToDayDetail = dayDetailDate;
    dayDetailDate = null;
    editingTrade = { ...trades.find((t) => t.id === id) };
    render(); renderModal();
  }
  else if (action === "new-trade-for-day") {
    if (viewingUserId) return;
    const forDate = dayDetailDate;
    returnToDayDetail = forDate;
    dayDetailDate = null;
    const draft = loadDraft();
    const blank = { id: uid(), _isNew: true };
    schema.forEach((f) => { blank[f.id] = f.type === "multiselect" ? [] : ""; });
    if (draft) { schema.forEach((f) => { if (draft[f.id] !== undefined) blank[f.id] = draft[f.id]; }); blank._resumedDraft = true; }
    const dateF = roleField("date");
    if (dateF) blank[dateF.id] = forDate;
    editingTrade = blank;
    render(); renderModal();
  }
  else if (action === "ask-delete-day-trade") { if (viewingUserId) return; confirmDeleteId = el.dataset.id; renderSecondaryModals(true); }
  else if (action === "cancel-delete-day-trade") { confirmDeleteId = null; renderSecondaryModals(true); }
  else if (action === "confirm-delete-day-trade") {
    await removeTrade(el.dataset.id);
    confirmDeleteId = null;
    renderSecondaryModals(true);
  }
  else if (action === "jump-to-history-month") {
    calendarYear = parseInt(el.dataset.year, 10);
    calendarMonth = parseInt(el.dataset.month, 10);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  else if (action === "toggle-filter-panel") {
    filterPanelOpen = !filterPanelOpen;
    try { localStorage.setItem("journal_filter_panel_open", String(filterPanelOpen)); } catch (e) {}
    render();
  }
  else if (action === "toggle-sort-dir") {
    sortDir = sortDir === "desc" ? "asc" : "desc";
    if (!viewingUserId) { try { localStorage.setItem("journal_sort_dir", sortDir); } catch (e) {} }
    gridPage = 1;
    render();
  }
  else if (action === "set-view-mode") {
    gridViewMode = el.dataset.mode;
    if (!viewingUserId) { try { localStorage.setItem("journal_view_mode", gridViewMode); } catch (e) {} }
    gridPage = 1;
    render();
  }
  else if (action === "set-card-size") {
    gridCardSize = el.dataset.size;
    if (!viewingUserId) { try { localStorage.setItem("journal_card_size", gridCardSize); } catch (e) {} }
    gridPage = 1;
    render();
  }
  else if (action === "grid-prev-page") { gridPage--; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  else if (action === "grid-next-page") { gridPage++; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  else if (action === "toggle-card-fields-picker") { cardFieldsPickerOpen = !cardFieldsPickerOpen; render(); }
  else if (action === "toggle-card-field") {
    const id = el.dataset.id;
    const next = cardFields.includes(id) ? cardFields.filter((x) => x !== id) : [...cardFields, id];
    await persistCardFields(next);
  }
  else if (action === "reset-card-fields") { await persistCardFields([]); }
  /* ---------- 分析页：组合 ---------- */
  else if (action === "add-combo") {
    if (viewingUserId) return;
    const c = normalizeCombo({ id: newComboId(), name: T("combo.newName", { n: analysisPrefs.combos.length + 1 }), conditions: [newFilterRow()] });
    analysisPrefs.combos.push(c);
    comboEditingId = c.id;
    // 新组合默认落在"未分组"桶里，那个桶要是被收起了，新建的东西会悄悄不可见——顺手展开
    collapsedComboGroups.delete("__ungrouped__"); saveCollapsedComboGroups();
    queueSaveAnalysisPrefs(); render();
  }
  else if (action === "edit-combo") {
    const id = el.dataset.comboId;
    comboEditingId = comboEditingId === id ? null : id;
    comboConfirmDeleteId = null;
    render();
  }
  else if (action === "close-combo-editor") { comboEditingId = null; flushAnalysisPrefs(); render(); }
  else if (action === "ask-delete-combo") { comboConfirmDeleteId = el.dataset.comboId; render(); }
  else if (action === "cancel-delete-combo") { comboConfirmDeleteId = null; render(); }
  else if (action === "confirm-delete-combo") {
    if (viewingUserId) return;
    const id = el.dataset.comboId;
    analysisPrefs.combos = analysisPrefs.combos.filter((c) => c.id !== id);
    if (comboEditingId === id) comboEditingId = null;
    if (activeComboId === id) activeComboId = null;
    // 组合没了，但分析页那份条件是复制来的，留着不动，只是不再显示"正在分析组合 XXX"
    if (analysisComboId === id) { analysisComboId = null; analysisComboDirty = false; }
    comboConfirmDeleteId = null;
    await saveAnalysisPrefsNow(); render();
  }
  /* ---------- 分析页：组合分组 ---------- */
  else if (action === "add-combo-group") {
    if (viewingUserId) return;
    comboGroupModal = { mode: "root", parentId: null, groupId: null, name: "" };
    render();
  }
  else if (action === "add-combo-subgroup") {
    if (viewingUserId) return;
    const parentId = el.dataset.parentId;
    if (!findComboGroup(parentId)) return;
    comboGroupModal = { mode: "sub", parentId, groupId: null, name: "" };
    render();
  }
  else if (action === "rename-combo-group") {
    if (viewingUserId) return;
    const g = findComboGroup(el.dataset.groupId);
    if (!g) return;
    comboGroupModal = { mode: "rename", parentId: null, groupId: g.id, name: g.name };
    render();
  }
  else if (action === "close-combo-group-modal") { comboGroupModal = null; render(); }
  else if (action === "dismiss-combo-group-overlay") {
    // 只有真的点在遮罩背景本身（不是弹窗内部冒泡上来的）才关，避免点弹窗里的空白文字区域也被误关
    if (e.target !== el) return;
    comboGroupModal = null; render();
  }
  else if (action === "save-combo-group-modal") {
    if (viewingUserId || !comboGroupModal) return;
    const input = document.getElementById("comboGroupNameInput");
    const name = (input ? input.value : "").trim();
    if (!name) return;
    if (comboGroupModal.mode === "root") {
      analysisPrefs.comboGroups.push({ id: newGroupId(), name, parentId: null });
    } else if (comboGroupModal.mode === "sub") {
      analysisPrefs.comboGroups.push({ id: newGroupId(), name, parentId: comboGroupModal.parentId });
    } else if (comboGroupModal.mode === "rename") {
      const g = findComboGroup(comboGroupModal.groupId);
      if (g) g.name = name;
    }
    comboGroupModal = null;
    await saveAnalysisPrefsNow(); render();
  }
  else if (action === "toggle-combo-group-collapse") {
    const id = el.dataset.groupId;
    if (collapsedComboGroups.has(id)) collapsedComboGroups.delete(id); else collapsedComboGroups.add(id);
    saveCollapsedComboGroups(); render();
  }
  else if (action === "ask-delete-combo-group") { comboGroupConfirmDeleteId = el.dataset.groupId; render(); }
  else if (action === "cancel-delete-combo-group") { comboGroupConfirmDeleteId = null; render(); }
  else if (action === "confirm-delete-combo-group") {
    if (viewingUserId) return;
    const groupId = el.dataset.groupId;
    const preview = comboGroupCascadePreview(groupId);
    const doomedGroupIds = new Set([groupId, ...comboGroupChildren(groupId).map((g) => g.id)]);
    const doomedComboIds = new Set(preview.comboIds);
    analysisPrefs.comboGroups = analysisPrefs.comboGroups.filter((g) => !doomedGroupIds.has(g.id));
    analysisPrefs.combos = analysisPrefs.combos.filter((c) => !doomedComboIds.has(c.id));
    if (doomedComboIds.has(comboEditingId)) comboEditingId = null;
    if (doomedComboIds.has(activeComboId)) activeComboId = null;
    if (doomedComboIds.has(analysisComboId)) { analysisComboId = null; analysisComboDirty = false; }
    comboGroupConfirmDeleteId = null;
    await saveAnalysisPrefsNow(); render();
  }
  else if (action === "open-combo-in-grid") {
    const c = findCombo(el.dataset.comboId);
    if (!c) return;
    // 记住跳转前用户手调的筛选，这样「还原筛选」才能把它原样找回来，而不是丢掉
    preComboFilters = JSON.parse(JSON.stringify(activeFilters));
    // 和组合卡片上的数字走的是同一个 comboFilterRows()，所以两边统计必然一致
    activeFilters = comboFilterRows(c);
    activeComboId = c.id;
    saveActiveFilters();
    gridPage = 1; tab = "grid"; filterPanelOpen = true;
    render(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  else if (action === "back-to-combo") { tab = "analytics"; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  else if (action === "restore-pre-combo-filters") {
    // 还原成点「查看这N笔交易」之前的筛选状态（字段和选中值都原样恢复），不是清空成空值
    activeFilters = preComboFilters || [];
    preComboFilters = null;
    activeComboId = null;
    activeFromAnalysis = false;
    saveActiveFilters(); gridPage = 1; render();
  }
  else if (action === "save-filters-as-combo") {
    if (viewingUserId) return;
    const c = normalizeCombo({
      id: newComboId(),
      name: T("combo.fromFilters", { date: new Date().toLocaleDateString(localeTag()) }),
      conditions: activeFilters.filter((f) => f.fieldId).map((f) => ({ ...f, values: [...(f.values || [])] })),
    });
    analysisPrefs.combos.push(c);
    comboEditingId = c.id;
    tab = "analytics";
    // 新组合默认落在"未分组"桶里，那个桶要是被收起了，新建的东西会悄悄不可见——顺手展开
    collapsedComboGroups.delete("__ungrouped__"); saveCollapsedComboGroups();
    await saveAnalysisPrefsNow(); render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  else if (action === "combo-from-breakdown") {
    if (viewingUserId) return;
    const fieldId = el.dataset.field, val = el.dataset.val;
    const field = resolveField(fieldId);
    if (!field) return;
    // 时间段那一行给的是区间不是某个值——time 字段的筛选走 rangeStart/rangeEnd，
    // 塞进 values 的话 tradeMatchesFilter 根本不看，组合会变成"匹配全部交易"
    const rangeStart = el.dataset.rangeStart;
    const condition = rangeStart
      ? { ...newFilterRow(fieldId), rangeStart, rangeEnd: el.dataset.rangeEnd || "" }
      : { ...newFilterRow(fieldId), values: [val] };
    const c = normalizeCombo({
      id: newComboId(),
      name: `${field.label} = ${val}`,
      conditions: [condition],
    });
    analysisPrefs.combos.push(c);
    comboEditingId = c.id;
    collapsedComboGroups.delete("__ungrouped__"); saveCollapsedComboGroups();
    await saveAnalysisPrefsNow(); render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  else if (action === "clear-all-filter-values") {
    // 一键清空：只清每一行已选的值，字段行本身还留着，不删行
    const ctx = filterCtxOf(el); if (!ctx) return;
    for (let i = 0; i < ctx.arr.length; i++) ctx.arr[i] = newFilterRow(ctx.arr[i].fieldId);
    afterFilterChange(ctx);
  }
  /* ---------- 分析页：分析范围面板 ---------- */
  else if (action === "toggle-analysis-panel") {
    analysisPanelOpen = !analysisPanelOpen; saveAnalysisPanelOpen(); render();
  }
  else if (action === "toggle-analysis-quick") {
    const pre = analysisQuickPreset(el.dataset.quick); if (!pre) return;
    // 快捷条件只是"帮你加/删一条普通条件"，加完就是下面条件行里那一条，用户随时能改能删
    if (pre.on) analysisFilters.splice(pre.idx, 1);
    else analysisFilters.push({ ...newFilterRow(pre.field.id), values: [pre.val], negate: pre.negate });
    afterAnalysisFilterChange();
  }
  else if (action === "analysis-filters-default") {
    analysisFilters = defaultAnalysisFilters();
    analysisComboId = null; analysisComboDirty = false;
    afterAnalysisFilterChange();
  }
  else if (action === "apply-combo-to-analysis") {
    const c = findCombo(el.dataset.comboId); if (!c) return;
    // 复制一份条件，不是绑定：在分析页怎么改都不会动到组合本身，想改回去点「回写到组合」
    analysisFilters = comboFilterRows(c);
    analysisComboId = c.id; analysisComboDirty = false;
    analysisPanelOpen = true; saveAnalysisPanelOpen();
    tab = "analytics";
    saveAnalysisFilters(); render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  else if (action === "apply-analysis-filters") {
    // 把分析页这套筛选原样复制给记录页/月度页（两页共用一份 activeFilters，所以一次就够）。
    // 复制不是共享：搬过去之后两边各改各的，分析页不会跟着变。
    // 不用存成组合就能逐笔翻——这是除了组合卡片之外的第二座桥
    const target = el.dataset.target === "calendar" ? "calendar" : "grid";
    // 记住搬过去之前用户手调的筛选，「还原筛选」才能原样找回来
    preComboFilters = JSON.parse(JSON.stringify(activeFilters));
    activeFilters = analysisFilters.map((f) => ({ ...f, values: [...(f.values || [])] }));
    activeComboId = null;
    activeFromAnalysis = true;
    saveActiveFilters();
    gridPage = 1; tab = target; filterPanelOpen = true;
    render(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  else if (action === "detach-analysis-combo") { analysisComboId = null; analysisComboDirty = false; render(); }
  else if (action === "write-back-analysis-combo") {
    if (viewingUserId) return;
    const c = findCombo(analysisComboId); if (!c) return;
    c.conditions = analysisFilters.filter((f) => f.fieldId).map((f) => ({ ...f, values: [...(f.values || [])] }));
    analysisComboDirty = false;
    await saveAnalysisPrefsNow(); render();
  }
  else if (action === "save-analysis-filters-as-combo") {
    if (viewingUserId) return;
    const c = normalizeCombo({
      id: newComboId(),
      name: T("combo.fromFilters", { date: new Date().toLocaleDateString(localeTag()) }),
      conditions: analysisFilters.filter((f) => f.fieldId).map((f) => ({ ...f, values: [...(f.values || [])] })),
    });
    analysisPrefs.combos.push(c);
    comboEditingId = c.id;
    analysisComboId = c.id; analysisComboDirty = false;
    // 新组合默认落在"未分组"桶里，那个桶要是被收起了，新建的东西会悄悄不可见——顺手展开
    collapsedComboGroups.delete("__ungrouped__"); saveCollapsedComboGroups();
    await saveAnalysisPrefsNow(); render();
  }
  else if (action === "toggle-breakdown-picker") { breakdownPickerOpen = !breakdownPickerOpen; render(); }
  /* ---------- 分析页：视图状态（都不影响任何数字） ---------- */
  else if (action === "toggle-low-sample") {
    const id = el.dataset.field;
    if (expandedLowSample.has(id)) expandedLowSample.delete(id); else expandedLowSample.add(id);
    render();
  }
  else if (action === "toggle-filter-chips") {
    const key = el.dataset.chipKey;
    if (expandedFilterChips.has(key)) expandedFilterChips.delete(key); else expandedFilterChips.add(key);
    render();
  }
  else if (action === "toggle-analytics-section") {
    const sec = el.dataset.sec;
    if (collapsedAnalyticsSections.has(sec)) collapsedAnalyticsSections.delete(sec); else collapsedAnalyticsSections.add(sec);
    saveCollapsedAnalyticsSections(); render();
  }
  else if (action === "set-combo-view") {
    comboViewMode = el.dataset.mode === "list" ? "list" : "card";
    try { localStorage.setItem("journal_combo_view", comboViewMode); } catch (e) {}
    render();
  }
  else if (action === "scroll-to-section") {
    // 顶部粘条是 fixed 的，会盖住目标——靠 CSS 的 scroll-margin-top 让出位置，这里不用手算偏移
    const target = document.getElementById(el.dataset.sec);
    if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  else if (action === "scroll-top") { window.scrollTo({ top: 0, behavior: "smooth" }); }
  else if (action === "hide-breakdown-field") {
    if (viewingUserId) return;
    const id = el.dataset.id;
    if (!analysisPrefs.breakdownHidden.includes(id)) analysisPrefs.breakdownHidden = [...analysisPrefs.breakdownHidden, id];
    await saveAnalysisPrefsNow(); render();
  }
  else if (action === "reset-breakdown-prefs") {
    if (viewingUserId) return;
    analysisPrefs.breakdownHidden = [];
    analysisPrefs.breakdownOrder = [];
    analysisPrefs.timeBuckets = DEFAULT_TIME_BUCKETS.slice();
    await saveAnalysisPrefsNow(); render();
  }
  else if (action === "add-changelog") {
    const ta = document.getElementById("changelogDraft");
    await addChangelogEntry(ta.value);
  }
  else if (action === "delete-changelog") {
    if (!confirm(T("changelog.confirmDelete"))) return;
    await removeChangelogEntry(el.dataset.id);
  }
  else if (action === "auth-mode") { authScreenMode = el.dataset.mode; authError = ""; authSuccess = ""; render(); }
  else if (action === "auth-submit") {
    if (!sb) { authError = T("auth.noDb"); render(); return; }
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    if (!email || !password) { authError = T("auth.emailPasswordRequired"); authSuccess = ""; render(); return; }
    if (authScreenMode === "register") await doRegister(email, password);
    else {
      const remember = document.getElementById("rememberMeCheck")?.checked ?? true;
      await doLogin(email, password, remember);
    }
  }
  else if (action === "toggle-user-menu") { userMenuOpen = !userMenuOpen; exportMenuOpen = false; render(); }
  else if (action === "open-profile-modal") {
    userMenuOpen = false;
    profileModalOpen = true; profileError = ""; profileSuccess = ""; passwordError = ""; passwordSuccess = "";
    render();
  }
  else if (action === "close-profile-modal") {
    profileModalOpen = false; render();
  }
  else if (action === "set-gender-draft") {
    profileGenderDraft = el.dataset.val;
    document.querySelectorAll('[data-action="set-gender-draft"]').forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.val === profileGenderDraft);
    });
  }
  else if (action === "save-profile") {
    const name = document.getElementById("profileNameInput").value;
    await updateOwnProfile(name, profileGenderDraft);
  }
  else if (action === "save-password") {
    const cur = document.getElementById("pwCurrentInput").value;
    const nw = document.getElementById("pwNewInput").value;
    const cf = document.getElementById("pwConfirmInput").value;
    await changeOwnPassword(cur, nw, cf);
  }
  /* ---------- 复盘 ---------- */
  else if (action === "new-review") { if (!viewingUserId) openNewReview(); }
  else if (action === "open-review") { openReviewEditor(el.dataset.id); }
  else if (action === "close-review-editor") { await closeReviewEditor(); }
  else if (action === "ask-delete-review") { reviewConfirmDeleteId = el.dataset.id; render(); }
  else if (action === "cancel-delete-review") { reviewConfirmDeleteId = null; render(); }
  else if (action === "confirm-delete-review") {
    const id = el.dataset.id;
    reviewConfirmDeleteId = null;
    await deleteReview(id);
    if (editingReview && editingReview.id === id) {
      clearTimeout(reviewSaveTimer); reviewSaveTimer = null;
      editingReview = null; reviewEditorRenderedFor = null; clearReviewDraft();
      renderReviewEditor();
    }
    render();
  }
  else if (action === "toggle-review-edit-mode") {
    if (!editingReview || !reviewCanEdit()) return;
    closeSlashMenu();
    if (reviewEditMode) await flushReviewSave();   // 退出编辑就立刻落盘，不等 debounce
    reviewEditMode = !reviewEditMode;
    renderReviewEditor(true);                      // 两种模式的骨架不一样，必须强制重建
  }
  else if (action === "review-tb") { runReviewCommand(el.dataset.cmd); }
  else if (action === "slash-pick") {
    const item = SLASH_ITEMS.find((i) => i.cmd === el.dataset.cmd);
    if (item) applySlashItem(item);
  }
  else if (action === "toggle-review-preview") {
    reviewPreviewOpen = !reviewPreviewOpen;
    try { localStorage.setItem("journal_review_preview", String(reviewPreviewOpen)); } catch (err) {}
    // 只换一个 class 和一个按钮文案，不重建编辑器——正文和光标要留在原地
    const body = document.querySelector(".reviewEditorBody");
    if (body) body.classList.toggle("noPreview", !reviewPreviewOpen);
    el.textContent = reviewPreviewOpen ? T("review.previewOn") : T("review.previewOff");
  }
  else if (action === "review-week") {
    if (!editingReview || reviewIsReadOnly()) return;
    const w = el.dataset.week;
    editingReview.week_start = w === "this" ? thisMondayStr() : w === "last" ? lastMondayStr() : "";
    scheduleReviewSave();
    refreshReviewWeekRow();
  }
  else if (action === "open-trade-picker") { openTradePicker(); }
  else if (action === "close-trade-picker") {
    if (el.classList.contains("tradePickerOverlay") && e.target !== el) return;  // 点内容不关闭（不能用 stopPropagation）
    closeTradePicker();
  }
  else if (action === "pick-trade") { insertTradeRef(el.dataset.id); }
  else if (action === "open-trade-ref") {
    const t = trades.find((x) => x.id === el.dataset.id);
    if (t) { editingTrade = { ...t }; renderModal(true); }
  }
  else if (action === "preview-image") {
    lightboxUrl = el.dataset.url;
    render();
  }
  else if (action === "close-lightbox") {
    lightboxUrl = null;
    render();
  }
  else if (action === "logout") { userMenuOpen = false; await doLogout(); }
  else if (action === "set-record-mode") {
    if (recordMode === el.dataset.mode) return;
    recordMode = el.dataset.mode;
    // 复盘页签只在实盘下存在，切回回测时得离开，否则会停在一个不存在的页签上
    if (recordMode !== "live" && tab === "reviews") tab = "grid";
    if (!viewingUserId) { try { localStorage.setItem("journal_record_mode", recordMode); } catch (e) {} }
    if (recordMode === "live") {
      const now = new Date();
      calendarYear = now.getFullYear();
      calendarMonth = now.getMonth() + 1;
    }
    await loadAll(); render();
  }
  else if (action === "sort-admin-users") {
    const key = el.dataset.key;
    if (adminUsersSortBy === key) { adminUsersSortDir = adminUsersSortDir === "asc" ? "desc" : "asc"; }
    else { adminUsersSortBy = key; adminUsersSortDir = "desc"; }
    render();
  }
  else if (action === "toggle-user-active") { await setUserActive(el.dataset.id, el.dataset.next === "true"); }
  else if (action === "toggle-user-role") { await setUserRole(el.dataset.id, el.dataset.next); }
  else if (action === "view-user-data") {
    flushAnalysisPrefs(); // 切进只读模式后就写不了库了，先把没保存的分析设置落盘
    ownStateSnapshot = {
      activeFilters: JSON.parse(JSON.stringify(activeFilters)),
      gridPage, sortBy, sortDir, recordMode, tab,
    };
    viewingUserId = el.dataset.id;
    viewingUserEmail = el.dataset.email;
    activeFilters = [];
    // 别人的数据用默认口径看，也别把人家的条件写进自己的 localStorage（saveAnalysisFilters 里也挡了一道）
    analysisFilters = []; analysisFiltersSeeded = false; analysisComboId = null; analysisComboDirty = false;
    activeComboId = null; activeFromAnalysis = false; comboEditingId = null; comboConfirmDeleteId = null; breakdownPickerOpen = false; comboGroupModal = null; comboGroupConfirmDeleteId = null;
    gridPage = 1;
    tab = "grid";
    await loadAll();
    render();
  }
  else if (action === "exit-view-mode") {
    viewingUserId = null;
    viewingUserEmail = null;
    if (ownStateSnapshot) {
      activeFilters = ownStateSnapshot.activeFilters;
      gridPage = ownStateSnapshot.gridPage;
      sortBy = ownStateSnapshot.sortBy;
      sortDir = ownStateSnapshot.sortDir;
      recordMode = ownStateSnapshot.recordMode;
      tab = ownStateSnapshot.tab;
      ownStateSnapshot = null;
    }
    // 退出只读模式：重新播种，把自己那份分析页筛选从 localStorage 读回来
    analysisFiltersSeeded = false; analysisComboId = null; analysisComboDirty = false;
    activeComboId = null; activeFromAnalysis = false; comboEditingId = null; comboConfirmDeleteId = null; comboGroupModal = null; comboGroupConfirmDeleteId = null;
    await loadAll();
    render();
  }
  else if (action === "save-api-config") {
    const url = document.getElementById("apiUrlInput").value.trim();
    const key = document.getElementById("apiKeyInput").value.trim();
    try { localStorage.setItem("journal_api_config", JSON.stringify({ url, key })); } catch (e) {}
    initSupabaseClient();
    loadError = null; session = null; currentProfile = null; authLoading = true;
    render();
    await bootstrapAuth();
    render();
  }
  else if (action === "reset-api-config") {
    try { localStorage.removeItem("journal_api_config"); } catch (e) {}
    initSupabaseClient();
    loadError = null; session = null; currentProfile = null; authLoading = true;
    render();
    await bootstrapAuth();
    render();
  }
  else if (action === "cancel-delete") { confirmDeleteId = null; render(); }
  else if (action === "confirm-delete") { await removeTrade(el.dataset.id); confirmDeleteId = null; }
  else if (action === "toggle-chip") {
    const fieldId = el.dataset.field, opt = el.dataset.opt, multi = el.dataset.multi === "true";
    if (multi) {
      const arr = formDraft[fieldId] || [];
      formDraft[fieldId] = arr.includes(opt) ? arr.filter((v) => v !== opt) : [...arr, opt];
    } else {
      formDraft[fieldId] = formDraft[fieldId] === opt ? "" : opt;
    }
    const field = schema.find((f) => f.id === fieldId);
    document.getElementById("chipgroup-" + fieldId).outerHTML = chipGroupHtml(field, formDraft[fieldId], multi);
    saveDraft();
  }
  else if (action === "toggle-settings-row") {
    const id = el.dataset.id;
    openSettingsRow = openSettingsRow === id ? null : id;
    render();
    if (openSettingsRow === "__admin_users__" && adminUsers === null) { await loadAdminUsers(); render(); }
  }
  else if (action === "delete-field") {
    if (!confirm(T("settings.confirmDeleteField"))) return;
    await persistSchema(schema.filter((f) => f.id !== el.dataset.id));
  }
  else if (action === "remove-option") {
    const fieldId = el.dataset.id, opt = el.dataset.opt;
    const next = schema.map((f) => f.id === fieldId ? { ...f, options: (f.options || []).filter((o) => o !== opt) } : f);
    await persistSchema(next);
  }
  else if (action === "add-option") {
    const fieldId = el.dataset.id;
    const input = document.getElementById("optdraft-" + fieldId);
    const v = input.value.trim();
    if (!v) return;
    await addOptionToField(fieldId, v);
  }
  else if (action === "add-field") {
    const label = document.getElementById("newFieldLabel").value.trim();
    const type = document.getElementById("newFieldType").value;
    const optsText = document.getElementById("newFieldOpts").value;
    if (!label) return;
    const newField = { id: newFieldId(), label, type, role: "" };
    if (type === "select" || type === "multiselect") newField.options = optsText.split(",").map((s) => s.trim()).filter(Boolean);
    await persistSchema([...schema, newField]);
  }
});

document.addEventListener("input", (e) => {
  if (e.target.dataset.formField !== undefined && editingTrade && editingTrade._isNew) {
    formDraft[e.target.dataset.formField] = e.target.value;
    saveDraft();
  }
  else if (e.target.dataset.action === "search-input") {
    searchQuery = e.target.value;
    gridPage = 1;
    const caret = e.target.selectionStart;
    render();
    const el = document.querySelector('[data-action="search-input"]');
    if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch (err) {} }
  }
  else if (e.target.dataset.action === "review-search-input") {
    reviewSearch = e.target.value;
    const caret = e.target.selectionStart;
    render();
    const el = document.querySelector('[data-action="review-search-input"]');
    if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch (err) {} }
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.dataset.reviewWeekDate !== undefined) {
    if (!editingReview || reviewIsReadOnly()) return;
    editingReview.week_start = e.target.value || "";
    scheduleReviewSave();
    refreshReviewWeekRow();
    return;
  }
  if (e.target.dataset.bind === "breakdown-sort") {
    const v = e.target.value;
    breakdownSort = v === "delta" || v === "ev" ? v : "n";
    try { localStorage.setItem("journal_breakdown_sort", breakdownSort); } catch (err) {}
    render();
  }
  else if (e.target.dataset.bind === "time-buckets") {
    if (viewingUserId) return;
    // 走 change 不走 input：边打字边解析的话，"09:3" 这种中间状态会被清洗成别的边界，输入框自己跳
    analysisPrefs.timeBuckets = parseTimeBoundaryInput(e.target.value);
    await saveAnalysisPrefsNow(); render();
  }
  else if (e.target.dataset.bind === "sort-by") {
    sortBy = e.target.value;
    if (!viewingUserId) { try { localStorage.setItem("journal_sort_by", sortBy); } catch (err) {} }
    gridPage = 1;
    render();
  }
  else if (e.target.dataset.filterField !== undefined) {
    const ctx = filterCtxOf(e.target); if (!ctx) return;
    ctx.arr[parseInt(e.target.dataset.filterField, 10)] = newFilterRow(e.target.value);
    afterFilterChange(ctx);
  }
  else if (e.target.dataset.filterRange !== undefined) {
    const ctx = filterCtxOf(e.target); if (!ctx) return;
    const row = ctx.arr[parseInt(e.target.dataset.filterRange, 10)];
    if (!row) return;
    const val = e.target.dataset.timeInput !== undefined ? normalizeTimeValue(e.target.value) : e.target.value;
    if (e.target.dataset.bound === "start") row.rangeStart = val; else row.rangeEnd = val;
    afterFilterChange(ctx);
  }
  else if (e.target.dataset.filterText !== undefined) {
    const ctx = filterCtxOf(e.target); if (!ctx) return;
    const row = ctx.arr[parseInt(e.target.dataset.filterText, 10)];
    if (!row) return;
    row.textValue = e.target.value;
    afterFilterChange(ctx);
  }
  else if (e.target.dataset.action === "toggle-filter-negate") {
    const ctx = filterCtxOf(e.target); if (!ctx) return;
    const row = ctx.arr[parseInt(e.target.dataset.idx, 10)];
    if (!row) return;
    row.negate = e.target.checked;
    afterFilterChange(ctx);
  }
  else if (e.target.dataset.action === "toggle-filter-and") {
    const ctx = filterCtxOf(e.target); if (!ctx) return;
    const row = ctx.arr[parseInt(e.target.dataset.idx, 10)];
    if (!row) return;
    row.matchMode = e.target.checked ? "and" : "or";
    afterFilterChange(ctx);
  }
  else if (e.target.dataset.action === "toggle-breakdown-field") {
    if (viewingUserId) return;
    const id = e.target.dataset.id;
    const hidden = analysisPrefs.breakdownHidden;
    analysisPrefs.breakdownHidden = e.target.checked ? hidden.filter((x) => x !== id) : [...hidden, id];
    queueSaveAnalysisPrefs(); render();
  }
  else if (e.target.dataset.comboName !== undefined) {
    if (viewingUserId) return;
    const c = findCombo(e.target.dataset.comboName);
    if (!c) return;
    c.name = e.target.value.trim() || T("combo.untitled");
    queueSaveAnalysisPrefs(); render();
  }
  else if (e.target.dataset.fieldEdit) {
    const id = e.target.dataset.id, key = e.target.dataset.fieldEdit, val = e.target.value;
    let next = schema.map((f) => f.id === id ? { ...f, [key]: val } : f);
    if (key === "role" && val) next = next.map((f) => (f.id !== id && f.role === val) ? { ...f, role: "" } : f);
    await persistSchema(next);
  }
});

let dragFilterIdx = null;
let dragOptField = null;
let dragOptIdx = null;
let dragComboId = null;
let dragGroupId = null;
let dragBdIdx = null;
let dragBdCardId = null;
let dragSettingsIdx = null;
let dragOverEl = null;
const DRAGGABLES = '.filterRow[draggable="true"], .tagChip[draggable="true"], .comboCard[draggable="true"], .bdRow[draggable="true"], .breakdownCard[draggable="true"], .settingsRow[draggable="true"], .comboGroupHeader[draggable="true"]';

function clearDragOverHighlight() {
  if (dragOverEl) { dragOverEl.classList.remove("dragOverTarget"); dragOverEl = null; }
}

// 原生拖拽在靠近视口边缘时，浏览器自带的自动滚动很不可靠（不同浏览器表现不一致，长页面尤其明显）。
// 这里自己接管：拖拽过程中鼠标离顶部/底部多近就用 JS 持续滚，松手/拖出这个区域就停。
// 挂在最外层，不专属于任何一种可拖拽列表——筛选卡片、字段拆解卡片、组合、设置页字段全部一起受益。
let autoScrollRAF = null;
let autoScrollClientY = null;
const AUTOSCROLL_EDGE = 70;
const AUTOSCROLL_MAX_SPEED = 16;
function autoScrollTick() {
  if (autoScrollClientY === null) { autoScrollRAF = null; return; }
  const h = window.innerHeight;
  let speed = 0;
  if (autoScrollClientY < AUTOSCROLL_EDGE) speed = -AUTOSCROLL_MAX_SPEED * (1 - autoScrollClientY / AUTOSCROLL_EDGE);
  else if (autoScrollClientY > h - AUTOSCROLL_EDGE) speed = AUTOSCROLL_MAX_SPEED * (1 - (h - autoScrollClientY) / AUTOSCROLL_EDGE);
  if (speed !== 0) window.scrollBy(0, speed);
  autoScrollRAF = requestAnimationFrame(autoScrollTick);
}
function updateAutoScroll(clientY) {
  autoScrollClientY = clientY;
  if (!autoScrollRAF) autoScrollRAF = requestAnimationFrame(autoScrollTick);
}
function stopAutoScroll() {
  autoScrollClientY = null;
  if (autoScrollRAF) { cancelAnimationFrame(autoScrollRAF); autoScrollRAF = null; }
}

document.addEventListener("dragstart", (e) => {
  const row = e.target.closest('.filterRow[draggable="true"]');
  if (row) {
    dragFilterIdx = parseInt(row.dataset.filterIdx, 10);
    e.dataTransfer.effectAllowed = "move";
    row.style.opacity = "0.4";
    return;
  }
  const chip = e.target.closest('.tagChip[draggable="true"]');
  if (chip) {
    dragOptField = chip.dataset.optField;
    dragOptIdx = parseInt(chip.dataset.optIdx, 10);
    e.dataTransfer.effectAllowed = "move";
    chip.style.opacity = "0.4";
    return;
  }
  const combo = e.target.closest('.comboCard[draggable="true"]');
  if (combo) {
    dragComboId = combo.dataset.comboId;
    e.dataTransfer.effectAllowed = "move";
    combo.style.opacity = "0.4";
    return;
  }
  const groupHeader = e.target.closest('.comboGroupHeader[draggable="true"]');
  if (groupHeader) {
    dragGroupId = groupHeader.dataset.groupId;
    e.dataTransfer.effectAllowed = "move";
    groupHeader.style.opacity = "0.4";
    return;
  }
  const bd = e.target.closest('.bdRow[draggable="true"]');
  if (bd) {
    dragBdIdx = parseInt(bd.dataset.bdIdx, 10);
    e.dataTransfer.effectAllowed = "move";
    bd.style.opacity = "0.4";
    return;
  }
  const bdCard = e.target.closest('.breakdownCard[draggable="true"]');
  if (bdCard) {
    dragBdCardId = bdCard.dataset.bdCardId;
    e.dataTransfer.effectAllowed = "move";
    bdCard.style.opacity = "0.4";
    return;
  }
  const settingsRow = e.target.closest('.settingsRow[draggable="true"]');
  if (settingsRow) {
    dragSettingsIdx = parseInt(settingsRow.dataset.fieldIdx, 10);
    e.dataTransfer.effectAllowed = "move";
    settingsRow.style.opacity = "0.4";
  }
});
document.addEventListener("dragend", (e) => {
  const dragged = e.target.closest(DRAGGABLES);
  if (dragged) dragged.style.opacity = "";
  clearDragOverHighlight();
  stopAutoScroll();
});
document.addEventListener("dragover", (e) => {
  updateAutoScroll(e.clientY);
  let target = e.target.closest(DRAGGABLES);
  // 正在拖组合卡片时，分组/二级分组/未分组区域本身（不只是卡片）也是合法投放目标
  if (!target && dragComboId !== null) target = e.target.closest('[data-group-drop]');
  if (target) {
    e.preventDefault();
    if (dragOverEl && dragOverEl !== target) dragOverEl.classList.remove("dragOverTarget");
    target.classList.add("dragOverTarget");
    dragOverEl = target;
  } else {
    clearDragOverHighlight();
  }
});
document.addEventListener("drop", (e) => {
  clearDragOverHighlight();
  stopAutoScroll();
  const row = e.target.closest('.filterRow[draggable="true"]');
  if (row && dragFilterIdx !== null) {
    e.preventDefault();
    const targetIdx = parseInt(row.dataset.filterIdx, 10);
    if (targetIdx !== dragFilterIdx) {
      const [moved] = activeFilters.splice(dragFilterIdx, 1);
      activeFilters.splice(targetIdx, 0, moved);
      saveActiveFilters();
      render();
    }
    dragFilterIdx = null;
    return;
  }
  const chip = e.target.closest('.tagChip[draggable="true"]');
  if (chip && dragOptField !== null) {
    e.preventDefault();
    const targetField = chip.dataset.optField, targetIdx = parseInt(chip.dataset.optIdx, 10);
    if (targetField === dragOptField && targetIdx !== dragOptIdx) {
      const field = schema.find((f) => f.id === dragOptField);
      if (field) {
        const opts = [...(field.options || [])];
        const [moved] = opts.splice(dragOptIdx, 1);
        opts.splice(targetIdx, 0, moved);
        const next = schema.map((f) => f.id === dragOptField ? { ...f, options: opts } : f);
        persistSchema(next);
      }
    }
    dragOptField = null; dragOptIdx = null;
    return;
  }
  if (dragComboId !== null) {
    // 优先判断是不是拖到了另一张卡片上：同桶内重排（两张卡片本来就在同一个分组区块里才够得着）
    const targetCard = e.target.closest('.comboCard[draggable="true"]');
    if (targetCard && targetCard.dataset.comboId !== dragComboId) {
      e.preventDefault();
      const list = analysisPrefs.combos;
      const fromIdx = list.findIndex((c) => c.id === dragComboId);
      const toIdx = list.findIndex((c) => c.id === targetCard.dataset.comboId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const [moved] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, moved);
        saveAnalysisPrefsNow(); render();
      }
      dragComboId = null;
      return;
    }
    // 没落在别的卡片上，落在了某个分组/二级分组/未分组区域里：改归属
    const dropZone = e.target.closest('[data-group-drop]');
    if (dropZone) {
      e.preventDefault();
      const c = findCombo(dragComboId);
      if (c) {
        c.groupId = dropZone.dataset.groupDrop === "__ungrouped__" ? "" : dropZone.dataset.groupDrop;
        saveAnalysisPrefsNow(); render();
      }
    }
    dragComboId = null;
    return;
  }
  if (dragGroupId !== null) {
    const targetHeader = e.target.closest('.comboGroupHeader[draggable="true"]');
    if (targetHeader && targetHeader.dataset.groupId !== dragGroupId) {
      e.preventDefault();
      moveComboGroup(dragGroupId, targetHeader.dataset.groupId);
      saveAnalysisPrefsNow(); render();
    }
    dragGroupId = null;
    return;
  }
  const bd = e.target.closest('.bdRow[draggable="true"]');
  if (bd && dragBdIdx !== null) {
    e.preventDefault();
    const targetIdx = parseInt(bd.dataset.bdIdx, 10);
    if (targetIdx !== dragBdIdx) {
      // 拖过一次就把当前完整顺序落成 breakdownOrder，之后新加的字段仍然会接在尾部
      const ids = breakdownCandidateFields().map((f) => f.id);
      const [moved] = ids.splice(dragBdIdx, 1);
      ids.splice(targetIdx, 0, moved);
      analysisPrefs.breakdownOrder = ids;
      saveAnalysisPrefsNow();
      render();
    }
    dragBdIdx = null;
    return;
  }
  const bdCard = e.target.closest('.breakdownCard[draggable="true"]');
  if (bdCard && dragBdCardId !== null) {
    e.preventDefault();
    const targetId = bdCard.dataset.bdCardId;
    if (targetId !== dragBdCardId) {
      // 卡片区只显示未隐藏的字段，是完整候选列表的子集，所以按 id 定位、
      // 而不是按卡片在这个子集里的下标——下标和 breakdownOrder 里的下标含义不一样
      const ids = breakdownCandidateFields().map((f) => f.id);
      const fromIdx = ids.indexOf(dragBdCardId), toIdx = ids.indexOf(targetId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const [moved] = ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, moved);
        analysisPrefs.breakdownOrder = ids;
        saveAnalysisPrefsNow();
        render();
      }
    }
    dragBdCardId = null;
    return;
  }
  const settingsRow = e.target.closest('.settingsRow[draggable="true"]');
  if (settingsRow && dragSettingsIdx !== null) {
    e.preventDefault();
    const targetIdx = parseInt(settingsRow.dataset.fieldIdx, 10);
    if (targetIdx !== dragSettingsIdx) {
      const next = [...schema];
      const [moved] = next.splice(dragSettingsIdx, 1);
      next.splice(targetIdx, 0, moved);
      persistSchema(next);
    }
    dragSettingsIdx = null;
  }
});
// 800ms 的 debounce 还没到就关页面的话，把没写完的分析设置补上
window.addEventListener("beforeunload", () => { flushAnalysisPrefs(); });

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (lightboxUrl) { lightboxUrl = null; render(); return; }
  // 复盘编辑器这几层要排在交易弹窗前面：插入菜单 → 交易选择器，
  // 都关掉了才轮到编辑器本身（编辑器自己排在 editingTrade 后面，见下面）
  if (slashMenu) { closeSlashMenu(); return; }
  if (tradePickerOpen) { closeTradePicker(); return; }
  if (comboGroupModal) { comboGroupModal = null; render(); return; }
  if (profileModalOpen) { profileModalOpen = false; render(); return; }
  if (editingTrade) {
    editingTrade = null;
    if (returnToDayDetail) { dayDetailDate = returnToDayDetail; returnToDayDetail = null; }
    renderModal(); render();
    return;
  }
  if (editingReview) { closeReviewEditor(); return; }
  if (dayDetailDate) { dayDetailDate = null; render(); return; }
});

/* 复盘是长文，debounce 那一秒里关掉标签页就丢了。localStorage 那份草稿能兜底，
   但还是先拦一下，让用户自己决定。 */
window.addEventListener("beforeunload", (e) => {
  if (!editingReview || viewingUserId) return;
  if (reviewSaveState !== "dirty" && reviewSaveState !== "saving") return;
  e.preventDefault();
  e.returnValue = "";
});

/* ============================================================
   INIT
   ============================================================ */
async function bootstrapAuth() {
  if (!sb) { authLoading = false; loadError = T("auth.noConfig"); return; }
  const { data: { session: s } } = await sb.auth.getSession();
  session = s;
  if (session) {
    await loadProfile();
    if (currentProfile && currentProfile.active !== false) await loadAll();
  }
  authLoading = false;
  sb.auth.onAuthStateChange(async (event, newSession) => {
    session = newSession; // keep session object current regardless of event type
    if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED" || event === "INITIAL_SESSION") return;
    if (session) {
      await loadProfile();
      if (currentProfile && currentProfile.active !== false) await loadAll();
    } else {
      currentProfile = null; trades = []; schema = defaultSchema(); adminUsers = null;
      defaultFiltersSeeded = false; activeFilters = [];
      analysisFilters = []; analysisFiltersSeeded = false; analysisComboId = null; analysisComboDirty = false;
      analysisPrefs = defaultAnalysisPrefs(); analysisPrefsError = null;
      activeComboId = null; activeFromAnalysis = false; comboEditingId = null; comboConfirmDeleteId = null; breakdownPickerOpen = false;
      comboGroupModal = null; comboGroupConfirmDeleteId = null;
    }
    render();
  });
}
(async function init() {
  try {
    const savedTheme = localStorage.getItem("journal_theme");
    if (savedTheme === "light") document.documentElement.dataset.theme = "light";
  } catch (e) {}
  applyLangAttr();
  await bootstrapAuth();
  render();
})();

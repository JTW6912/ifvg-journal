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
let comboEditingId = null;   // 哪个组合的条件编辑器展开着
let activeComboId = null;    // 记录页顶部「正在查看组合」横幅
let preComboFilters = null;  // 跳到组合前的筛选快照，「还原筛选」用它原样恢复
let comboConfirmDeleteId = null;
let comboGroupConfirmDeleteId = null;
let comboGroupModal = null; // { mode: "root"|"sub"|"rename", parentId, groupId, name } —— 新建/新建二级/改名分组的弹窗
// 哪些分组被收起了——纯本地"这次怎么看"状态，不跨设备同步，跟 statScope/modelFilters 一个套路。
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
// 统计口径开关 + 模型筛选：纯本地"这次怎么看"设置，不跨设备同步，只存 localStorage
let statScope = (function () {
  try {
    const raw = JSON.parse(localStorage.getItem("journal_stat_scope") || "null");
    if (raw && typeof raw === "object") return { excludeHumanError: raw.excludeHumanError !== false, takenOnly: raw.takenOnly !== false };
  } catch (e) {}
  return { excludeHumanError: true, takenOnly: true };
})();
// 模型筛选是多选（空数组=全部），不是反选——想排除一个就把其余的都勾上，更灵活
let modelFilters = (function () {
  try {
    const raw = JSON.parse(localStorage.getItem("journal_model_filters") || "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
  } catch (e) { return []; }
})();
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

function saveStatScope() { try { localStorage.setItem("journal_stat_scope", JSON.stringify(statScope)); } catch (e) {} }
function saveModelFilters() {
  try { localStorage.setItem("journal_model_filters", JSON.stringify(modelFilters)); } catch (e) {}
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
function toCSV() {
  const headers = schema.map((f) => f.label);
  const lines = [headers.map(csvEscape).join(",")];
  trades.forEach((t) => lines.push(schema.map((f) => csvEscape(t[f.id])).join(",")));
  return lines.join("\n");
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
   ANALYSIS PREFS —— 分析页的拆解显示配置 / 组合 / 组合分组
   存在 journal_schema.analysis_prefs (jsonb) 这一列里，跨设备同步。
   统计口径开关(statScope)和模型筛选(modelFilters)不在这里——那两个是
   纯本地的"这次怎么看"设置，只存 localStorage，见下面 STAT SCOPE 那一段。
   ============================================================ */
function defaultAnalysisPrefs() {
  return {
    breakdownHidden: [],   // 存「隐藏哪些」，新加的字段自动出现
    breakdownOrder: [],    // 只存用户排过序的，没排到的按 schema 顺序接在后面
    combos: [],
    comboGroups: [],        // {id, name, parentId} 扁平列表，parentId=null 是顶层分组，最多两层
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
function analysisBaseTrades() {
  const modelF = roleField("model");
  if (!modelF || !modelFilters.length) return trades;
  return trades.filter((t) => modelFilters.includes(t[modelF.id]));
}
// 当前口径下参与统计的交易集（顶部数字和字段拆解共用同一批）
function scopedTrades() {
  const heF = roleField("human_error"), takenF = roleField("taken");
  const scope = statScope;
  let list = analysisBaseTrades();
  if (scope.excludeHumanError && heF) list = list.filter((t) => t[heF.id] !== "yes");
  if (scope.takenOnly && takenF) list = list.filter((t) => t[takenF.id] === "Taken");
  return list;
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
function computeStats() {
  const resultF = roleField("result"), takenF = roleField("taken"), heF = roleField("human_error"),
        rF = roleField("r_multiple"), maxRrF = roleField("max_rr");
  const scope = statScope;
  const base = analysisBaseTrades();
  const clean = scope.excludeHumanError && heF ? base.filter((t) => t[heF.id] !== "yes") : base;
  const taken = scopedTrades();
  const faded = clean.filter((t) => takenF && t[takenF.id] === "Faded");
  const isW = (t) => resultF && t[resultF.id] === "W";
  const isL = (t) => resultF && t[resultF.id] === "L";
  const isBEW = (t) => resultF && t[resultF.id] === "BE -> W";
  const isBEL = (t) => resultF && t[resultF.id] === "BE -> L";
  const isBE = (t) => resultF && t[resultF.id] === "BE";
  const w = taken.filter(isW).length, l = taken.filter(isL).length;
  const bew = taken.filter(isBEW).length, bel = taken.filter(isBEL).length, be = taken.filter(isBE).length;
  const wr = w + l ? (w / (w + l)) * 100 : null;
  const sq = w + l + bew + bel ? ((w + bew) / (w + l + bew + bel)) * 100 : null;
  let totalR = null, ev = null;
  if (rF) { totalR = taken.reduce((s, t) => s + (parseFloat(t[rF.id]) || 0), 0); ev = taken.length ? totalR / taken.length : null; }
  let captureRate = null;
  if (rF && maxRrF) {
    const both = taken.filter((t) => t[rF.id] !== undefined && t[rF.id] !== "" && t[maxRrF.id] !== undefined && t[maxRrF.id] !== "");
    const sumR = both.reduce((s, t) => s + (parseFloat(t[rF.id]) || 0), 0);
    const sumMax = both.reduce((s, t) => s + (parseFloat(t[maxRrF.id]) || 0), 0);
    captureRate = sumMax ? (sumR / sumMax) * 100 : null;
  }
  const fadedW = faded.filter(isW).length, fadedL = faded.filter(isL).length;
  const pfInfo = profitFactorOf(taken, rF);
  const breakdowns = computeBreakdowns(taken);
  const modelF = roleField("model");
  let byModel = [];
  if (modelF) { const found = breakdowns.find((b) => b.field.id === modelF.id); if (found) byModel = found.rows; }
  return { totalTaken: taken.length, totalFaded: faded.length, w, l, be, bew, bel, wr, sq, totalR, ev, captureRate,
           pf: pfInfo.pf, pfSample: pfInfo.n, fadedW, fadedL, breakdowns, byModel, hasResult: !!resultF, hasR: !!rF };
}

/* ---------- 字段拆解 ---------- */
// 能拆解的字段：所有 select/multiselect，只排掉「结果」角色（按 result 拆是自我循环，W 那行必然 100%）
function breakdownCandidateFields() {
  const all = schema.filter((f) => (f.type === "select" || f.type === "multiselect") && f.role !== "result");
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
function computeBreakdowns(list) {
  const resultF = roleField("result"), rF = roleField("r_multiple");
  return visibleBreakdownFields().map((f) => {
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
    const field = schema.find((x) => x.id === f.fieldId);
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
    const field = schema.find((x) => x.id === f.fieldId);
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
  const rF = roleField("r_multiple"), resultF = roleField("result"), takenF = roleField("taken");
  const clean = list;
  const taken = clean.filter((t) => !takenF || t[takenF.id] === "Taken");
  let rSum = 0, hasR = false;
  if (rF) taken.forEach((t) => { if (t[rF.id] !== undefined && t[rF.id] !== "") { rSum += parseFloat(t[rF.id]) || 0; hasR = true; } });
  const w = resultF ? taken.filter((t) => t[resultF.id] === "W").length : 0;
  const l = resultF ? taken.filter((t) => t[resultF.id] === "L").length : 0;
  let tone = "neutral";
  if (hasR) tone = rSum > 0.0001 ? "pos" : rSum < -0.0001 ? "neg" : "neutral";
  else if (w + l > 0) tone = w > l ? "pos" : w < l ? "neg" : "neutral";
  return { count: clean.length, takenCount: taken.length, rSum, hasR, w, l, tone };
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
// 记录页的 activeFilters 和分析页某个组合的 conditions 共用同一套 DOM 结构和事件处理，
// 元素上有没有 data-combo-id 决定改的是哪个数组
function filterCtxOf(el) {
  const comboId = el.dataset.comboId || "";
  if (!comboId) return { arr: activeFilters, comboId: "" };
  const c = findCombo(comboId);
  return c ? { arr: c.conditions, comboId } : null;
}
function afterFilterChange(ctx) {
  if (ctx.comboId) {
    queueSaveAnalysisPrefs();
  } else {
    activeComboId = null; // 手动改过筛选，就不再算是「正在看某个组合」了
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
  const field = schema.find((x) => x.id === f.fieldId);
  if (!field) return true;
  if (field.type === "select" || field.type === "multiselect") {
    if (!f.values || f.values.length === 0) return true;
    const tv = t[field.id];
    const matches = field.type === "multiselect"
      ? (Array.isArray(tv) && (f.matchMode === "and" ? f.values.every((v) => tv.includes(v)) : f.values.some((v) => tv.includes(v))))
      : f.values.includes(tv);
    return f.negate ? !matches : matches;
  }
  if (field.type === "date" || field.type === "time") {
    const tv = t[field.id] || "";
    if (!f.rangeStart && !f.rangeEnd) return true;
    if (f.rangeStart && tv < f.rangeStart) return false;
    if (f.rangeEnd && tv > f.rangeEnd) return false;
    return true;
  }
  if (!f.textValue) return true;
  const tv = t[field.id];
  return String(tv === undefined || tv === null ? "" : tv).toLowerCase().includes(String(f.textValue).toLowerCase());
}
// comboId 为空 = 记录页的 activeFilters；有值 = 分析页某个组合的条件。
// 两边共用同一套 DOM 结构和事件处理，靠 data-combo-id 区分改哪个数组。
function filterRowValuesHtml(field, idx, f, comboId) {
  const cid = comboId ? ` data-combo-id="${esc(comboId)}"` : "";
  if (field.type === "select" || field.type === "multiselect") {
    const vals = f.values || [];
    const opts = field.options || [];
    // 选项被删掉但条件里还留着的，也列出来并标红，否则用户根本看不见问题在哪
    const ghosts = vals.filter((v) => !opts.includes(v));
    return `<div class="chipGroup" style="margin-top:8px;">
      ${opts.map((o) => `<button type="button" class="chip ${vals.includes(o) ? "active" : ""}" data-action="toggle-filter-value" data-idx="${idx}" data-val="${esc(o)}"${cid}>${esc(o)}</button>`).join("")}
      ${ghosts.map((o) => `<button type="button" class="chip active" style="border-color:var(--neg);color:var(--neg);background:var(--negSoft);" title="${esc(T("filter.ghostOption"))}" data-action="toggle-filter-value" data-idx="${idx}" data-val="${esc(o)}"${cid}>${esc(o)} ⚠</button>`).join("")}
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
// 一整行筛选条件（字段下拉 + AND/取反开关 + 值），记录页和组合编辑器共用
function filterConditionRowHtml(f, idx, comboId) {
  const cid = comboId ? ` data-combo-id="${esc(comboId)}"` : "";
  const field = schema.find((x) => x.id === f.fieldId);
  const missing = f.fieldId && !field;
  const showNegate = field && (field.type === "select" || field.type === "multiselect");
  const showAndToggle = field && field.type === "multiselect";
  const dragAttrs = comboId ? "" : ` draggable="true" data-filter-idx="${idx}"`;
  return `<div class="filterRow"${dragAttrs} style="padding:10px 12px;border:1px solid ${missing ? "var(--neg)" : "var(--border)"};border-radius:8px;flex:1 1 320px;min-width:280px;max-width:420px;${comboId ? "" : "cursor:grab;"}">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      ${comboId ? "" : `<span style="color:var(--mutedDark);cursor:grab;font-size:14px;" title="${esc(T("common.dragToReorder"))}">⠿</span>`}
      <select class="select" data-filter-field="${idx}"${cid}>
        <option value="">${esc(T("filter.selectField"))}</option>
        ${schema.filter((x) => filterableTypes.includes(x.type)).map((x) => `<option value="${esc(x.id)}" ${f.fieldId === x.id ? "selected" : ""}>${esc(x.label)}</option>`).join("")}
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
    ${field ? filterRowValuesHtml(field, idx, f, comboId) : ""}
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
function renderFilterPanel(filteredCount, filteredForSummary) {
  const activeCount = activeFilters.filter((f) => f.fieldId).length;
  let html = `<div class="filterBar" style="flex-direction:column;align-items:flex-start;">
    <button data-action="toggle-filter-panel" style="display:flex;align-items:center;gap:8px;background:transparent;border:none;cursor:pointer;padding:0;width:100%;">
      ${ICONS.filter}
      <span style="font-size:12.5px;color:var(--text);font-weight:500;">${T("filter.title")}</span>
      ${activeCount > 0 ? `<span style="font-size:11px;color:var(--accent);background:var(--accentSoft);padding:2px 8px;border-radius:10px;">${esc(T("filter.activeCount", { n: activeCount }))}</span>` : ""}
      <span style="font-size:12px;color:var(--mutedDark);">${esc(T("grid.tradeCount", { n: filteredCount }))}</span>
      <span style="margin-left:auto;color:var(--mutedDark);">${filterPanelOpen ? ICONS.chevUp : ICONS.chevDown}</span>
    </button>`;
  if (filterPanelOpen) {
    html += `<div style="font-size:11.5px;color:var(--mutedDark);margin-top:8px;">${T("filter.logicHint")}</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;width:100%;">`;
    activeFilters.forEach((f, idx) => { html += filterConditionRowHtml(f, idx, ""); });
    html += `</div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn" data-action="add-filter">${ICONS.plus} ${T("filter.addCondition")}</button>
      ${activeFilters.length ? `<button class="btn" data-action="clear-all-filter-values">${T("filter.clearAllValues")}</button>` : ""}
    </div>
    <div style="margin-top:14px;">${renderFilterSummary(filteredForSummary)}</div>`;
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

  const activeCombo = activeComboId ? findCombo(activeComboId) : null;
  let html = activeCombo ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--accentSoft);border:1px solid var(--accent);border-radius:8px;padding:10px 16px;margin-bottom:16px;">
    <span style="font-size:13px;color:var(--accent);">${ICONS.filter} ${T("grid.viewingCombo", { name: `<b>${esc(activeCombo.name)}</b>` })}</span>
    <span style="display:flex;gap:8px;">
      <button class="btn" data-action="back-to-combo">${T("grid.backToCombo")}</button>
      <button class="btn" data-action="restore-pre-combo-filters">${T("grid.restoreFilters")}</button>
    </span>
  </div>` : "";
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
      ${schema.filter((f) => !["date", "model", "r_multiple"].includes(f.role)).map((f) => `<button type="button" class="chip ${cardFields.includes(f.id) ? "active" : ""}" data-action="toggle-card-field" data-id="${esc(f.id)}">${esc(f.label)}</button>`).join("")}
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
    html += `<div class="tableScroll"><table class="dataTable"><thead><tr>
      <th></th>${schema.map((f) => `<th>${esc(f.label)}</th>`).join("")}
    </tr></thead><tbody>`;
    pageItems.forEach((t) => {
      const result = resultF ? t[resultF.id] : null;
      const rc = resultColor(result);
      const confirming = confirmDeleteId === t.id;
      html += `<tr data-action="edit-trade" data-id="${esc(t.id)}">
        <td>${viewingUserId ? "" : (!confirming
          ? `<button class="tinyBtn" data-action="ask-delete" data-id="${esc(t.id)}" style="color:var(--neg)">${ICONS.trash}</button>`
          : `<button class="tinyBtn" data-action="confirm-delete" data-id="${esc(t.id)}" style="color:var(--neg)">✓</button><button class="tinyBtn" data-action="cancel-delete">${ICONS.x}</button>`)}</td>
        ${schema.map((f) => {
          let v = t[f.id];
          if (Array.isArray(v)) v = v.join(", ");
          const isResultCol = f.role === "result";
          return `<td style="${isResultCol ? `color:${rc};font-weight:600;` : ""}${f.role === "screenshot" ? "max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" : ""}">${esc(v ?? "")}</td>`;
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
        const f = schema.find((x) => x.id === fid);
        if (!f) return "";
        const isLongText = f.type === "textarea";
        return `<div style="margin-top:8px;font-size:${isLongText ? "13px" : "11.5px"};">
          <div style="color:var(--mutedDark);margin-bottom:2px;${isLongText ? "font-size:11.5px;" : ""}">${esc(f.label)}</div>
          <div style="color:var(--text);white-space:normal;word-break:break-word;line-height:1.6;">${esc(formatFieldValueShort(f, t[fid]))}</div>
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
function barRow(row, fieldId) {
  const width = row.wr === null ? 0 : row.wr;
  const color = row.wr === null ? "var(--mutedDark)" : row.wr >= 60 ? "var(--pos)" : row.wr >= 45 ? "var(--accent)" : "var(--neg)";
  const rPart = row.hasR
    ? ` · <span style="color:${row.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(row.totalR)}R</span> · EV ${fmtNum(row.ev, 2)} · PF <span style="color:${pfColor(row.pf)}">${fmtPF(row.pf)}</span>`
    : "";
  return `<div class="barRow">
    <div class="barTop">
      <span style="color:var(--text)">${esc(row.value)}</span>
      <span class="mono" style="color:var(--muted)">n=${row.n} · ${fmtPct(row.wr)}</span>
    </div>
    <div class="barTrack"><div class="barFill" style="width:${width}%;background:${color}"></div></div>
    <div class="barMeta">
      <span class="mono">W${row.w} L${row.l}${row.be ? " BE" + row.be : ""}${rPart}</span>
      ${fieldId && !viewingUserId ? `<button class="tinyBtn" data-action="combo-from-breakdown" data-field="${esc(fieldId)}" data-val="${esc(row.value)}" title="${esc(T("breakdown.comboFromRow"))}">${ICONS.plus}${T("breakdown.comboBtn")}</button>` : ""}
    </div>
  </div>`;
}

/* ---------- 分析页：口径开关 ---------- */
function renderStatScopeBar() {
  const scope = statScope;
  const takenF = roleField("taken"), heF = roleField("human_error"), modelF = roleField("model");
  if (!takenF && !heF && !modelF) return "";
  return `<div style="display:flex;flex-wrap:wrap;gap:18px;align-items:center;margin-bottom:16px;padding:10px 14px;background:var(--surface2);border-radius:8px;font-size:12px;color:var(--muted);">
    <span style="color:var(--mutedDark);">${T("scope.title")}</span>
    ${takenF ? `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
      <input type="checkbox" data-action="toggle-scope-taken" ${scope.takenOnly ? "checked" : ""} style="width:13px;height:13px;" />${T("scope.takenOnly")}
    </label>` : ""}
    ${heF ? `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
      <input type="checkbox" data-action="toggle-scope-he" ${scope.excludeHumanError ? "checked" : ""} style="width:13px;height:13px;" />${T("scope.excludeHumanError")}
    </label>` : ""}
    ${modelF ? `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <span>${T("scope.model")}</span>
      <div class="chipGroup" style="margin:0;">
        ${(modelF.options || []).map((o) => `<button type="button" class="chip ${modelFilters.includes(o) ? "active" : ""}" data-action="toggle-model-filter-value" data-val="${esc(o)}">${esc(o)}</button>`).join("")}
      </div>
      ${modelFilters.length ? `<button class="tinyBtn" data-action="clear-model-filters" style="color:var(--mutedDark);">${T("scope.clearModels")}</button>` : `<span style="color:var(--mutedDark);font-size:11px;">${T("scope.allModels")}</span>`}
    </div>` : ""}
    <span style="color:var(--mutedDark);font-size:11px;">${T("scope.localHint")}</span>
  </div>`;
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
function renderComboCard(combo) {
  const issues = comboIssues(combo);
  const broken = issues.hard.length > 0;
  const s = comboStats(combo);
  const base = comboBaseline(combo);
  const editing = comboEditingId === combo.id;
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

  // 编辑器展开时卡片独占一整行（.comboCard.editing）：网格列只有 340px，
  // 编辑器里的下拉和条件行塞不下会顶出卡片边框，看着像布局坏了
  return `<div class="comboCard${editing ? " editing" : ""}" ${viewingUserId || editing ? "" : `draggable="true" data-combo-id="${esc(combo.id)}"`}>
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
    ${broken ? "" : `<button class="btn" data-action="open-combo-in-grid" data-combo-id="${esc(combo.id)}" style="margin-top:10px;padding:5px 10px;font-size:12px;">${esc(T("combo.viewTrades", { n: s.n }))}</button>`}
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
function renderCombosSection() {
  const combos = analysisPrefs.combos || [];
  const groups = analysisPrefs.comboGroups || [];
  let html = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
    <div class="sectionLabel" style="margin:0;">⟦ ${esc(T("combos.title"))} ⟧</div>
    ${!viewingUserId ? `<span style="margin-left:auto;display:flex;align-items:center;gap:16px;">
      <button class="tinyBtn" data-action="add-combo-group" style="color:var(--mutedDark);">${ICONS.plus} ${T("combos.newGroup")}</button>
      <button class="btn" data-action="add-combo" style="padding:5px 12px;font-size:12px;">${ICONS.plus} ${T("combos.newCombo")}</button>
    </span>` : ""}
  </div>`;
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
  return `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:16px;">
    <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:10px;">${T("breakdown.pickerHint")}</div>
    <div style="display:flex;flex-direction:column;gap:4px;">
      ${fields.map((f, idx) => `<div class="bdRow" draggable="true" data-bd-idx="${idx}">
        <span style="color:var(--mutedDark);cursor:grab;font-size:14px;" title="${esc(T("common.dragToReorder"))}">⠿</span>
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer;flex:1;">
          <input type="checkbox" data-action="toggle-breakdown-field" data-id="${esc(f.id)}" ${hidden.includes(f.id) ? "" : "checked"} style="width:13px;height:13px;" />
          <span style="font-size:12.5px;color:var(--text);">${esc(f.label)}</span>
          <span style="font-size:11px;color:var(--mutedDark);">${esc(f.type === "multiselect" ? T("fieldType.multiselect") : T("fieldType.select"))}${f.role ? " · " + esc(f.role) : ""}</span>
        </label>
      </div>`).join("")}
    </div>
    <button class="tinyBtn" data-action="reset-breakdown-prefs" style="margin-top:10px;color:var(--mutedDark);">${T("breakdown.reset")}</button>
  </div>`;
}
function renderAnalytics() {
  const stats = computeStats();
  if (!stats.hasResult) {
    return `<div class="notice">${ICONS.alert}<span>${T("analytics.noResultRole")}</span></div>`;
  }
  const takenF = roleField("taken"), resultF = roleField("result");
  const scope = statScope;
  const prefsNotice = analysisPrefsError ? `<div class="notice error" style="margin-bottom:16px;">${ICONS.alert}<span>${esc(analysisPrefsError)}</span></div>` : "";

  if (stats.totalTaken === 0) {
    const baseList = analysisBaseTrades();
    const total = baseList.length;
    const withTaken = takenF ? baseList.filter((t) => t[takenF.id] === "Taken").length : total;
    const withResult = resultF ? baseList.filter((t) => t[resultF.id] === "W" || t[resultF.id] === "L").length : 0;
    return prefsNotice + renderStatScopeBar() + `<div class="notice">${ICONS.alert}<div>
      <div style="color:var(--text);margin-bottom:6px;">${esc(T("analytics.noTradesLine1", { source: modelFilters.length ? T("analytics.sourceModels") : T("analytics.sourceDb"), total, withTaken, withResult }))}</div>
      <div>${T("analytics.noTradesLine2")}</div>
    </div></div>`;
  }

  const countLabel = scope.takenOnly && takenF ? T("analytics.countTaken") : T("analytics.countTrades");
  let html = prefsNotice + renderStatScopeBar() + `<div class="statRow">
    <div class="statBox"><div class="statLabel">${countLabel}</div><div class="statValue">${stats.totalTaken}</div></div>
    <div class="statBox"><div class="statLabel">${T("grid.winRate")}</div><div class="statValue" style="color:var(--accent)">${fmtPct(stats.wr)}</div></div>
    <div class="statBox"><div class="statLabel">${T("analytics.setupQuality")}</div><div class="statValue">${fmtPct(stats.sq)}</div></div>
    ${stats.hasR ? `<div class="statBox"><div class="statLabel">${T("analytics.totalR")}</div><div class="statValue" style="color:${stats.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(stats.totalR)}</div></div>` : ""}
    ${stats.hasR ? `<div class="statBox"><div class="statLabel">${T("analytics.evPerTrade")}</div><div class="statValue" style="color:${stats.ev >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(stats.ev, 3)}</div></div>` : ""}
    ${stats.hasR ? `<div class="statBox" title="${esc(T("grid.pfTitle", { n: stats.pfSample }))}"><div class="statLabel">${T("analytics.profitFactor")}</div><div class="statValue" style="color:${pfColor(stats.pf)}">${fmtPF(stats.pf)}</div>${stats.pfSample !== stats.totalTaken ? `<div style="font-size:10.5px;color:var(--mutedDark);margin-top:3px;">${esc(T("analytics.pfBasis", { n: stats.pfSample }))}</div>` : ""}</div>` : ""}
    ${stats.captureRate !== null ? `<div class="statBox"><div class="statLabel">${T("analytics.captureRate")}</div><div class="statValue">${fmtPct(stats.captureRate)}</div></div>` : ""}
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:28px;font-size:12.5px;color:var(--muted);">
    <span>BE ${stats.be} · BE→W ${stats.bew} · BE→L ${stats.bel}</span>
    ${takenF ? `<span>${esc(T("analytics.fadedLine", { n: stats.totalFaded, w: stats.fadedW, l: stats.fadedL }))}</span>` : ""}
  </div>`;

  html += `<div style="margin-bottom:28px;">${renderCombosSection()}</div>`;

  if (stats.byModel.length && !modelFilters.length) {
    html += `<div style="margin-bottom:26px;"><div class="sectionLabel">⟦ ${esc(T("analytics.byModel"))} ⟧</div><div class="breakdownCard">${stats.byModel.map((r) => barRow(r, roleField("model").id)).join("")}</div></div>`;
  }

  html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
    <div class="sectionLabel" style="margin:0;">⟦ ${esc(T("breakdown.title"))} ⟧</div>
    ${!viewingUserId ? `<button class="btn ${breakdownPickerOpen ? "btn-primary" : ""}" data-action="toggle-breakdown-picker" style="padding:4px 10px;font-size:12px;">${ICONS.settings} ${T("breakdown.displaySettings")}</button>` : ""}
  </div>`;
  if (breakdownPickerOpen && !viewingUserId) html += renderBreakdownPicker();
  if (stats.breakdowns.length) {
    html += `<div class="breakdownGrid">`;
    stats.breakdowns.forEach((b) => {
      const draggable = !viewingUserId ? ` draggable="true" data-bd-card-id="${esc(b.field.id)}"` : "";
      html += `<div class="breakdownCard"${draggable}>
        <div class="breakdownTitle" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span>${!viewingUserId ? `<span style="cursor:grab;color:var(--mutedDark);" title="${esc(T("common.dragToReorder"))}">⠿</span> ` : ""}${esc(b.field.label)}</span>
          ${!viewingUserId ? `<button class="tinyBtn" data-action="hide-breakdown-field" data-id="${esc(b.field.id)}" title="${esc(T("breakdown.hideField"))}">${ICONS.x}</button>` : ""}
        </div>
        ${b.rows.map((r) => barRow(r, b.field.id)).join("")}
      </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div style="font-size:12.5px;color:var(--mutedDark);">${T("breakdown.none")}</div>`;
  }
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
      ${stats.count > 0 ? `<div class="monthBarValue">${stats.hasR ? fmtNum(stats.rSum) + "R" : T("calendar.winLoss", { w: stats.w, l: stats.l })}</div>` : ""}
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
        ${stats.count > 0 ? `<div class="dayCellInfo">${esc(T("dayDetail.summary", { n: stats.count }))}${stats.hasR ? `<br>${fmtNum(stats.rSum)}R` : ""}</div>` : ""}
      </div>`;
    }).join("");
    const weekStats = aggregateTradeStats(weekCells.flatMap((c) => tradesOnDate(c.dateStr)));
    const weekTone = weekStats.count > 0 ? weekStats.tone : "";
    weeksHtml += `<div class="weekCell ${weekTone}">
      ${weekStats.count > 0 ? `<div class="weekCellInfo">${weekStats.hasR ? fmtNum(weekStats.rSum) + "R" : T("calendar.winLoss", { w: weekStats.w, l: weekStats.l })}</div>` : `<div class="weekCellInfo muted">—</div>`}
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
  let html = `<div style="margin-bottom:22px;">${renderFilterPanel(filtered.length, filtered)}</div>`;
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
window.__imgFallback = function (imgEl) {
  const url = imgEl.dataset.fallbackUrl || "";
  const wrap = document.createElement("div");
  wrap.className = imgEl.dataset.fallbackClass || "thumbFallback";
  const iconSpan = document.createElement("span");
  iconSpan.innerHTML = ICONS.camera;
  if (iconSpan.firstElementChild) { iconSpan.firstElementChild.style.width = "16px"; iconSpan.firstElementChild.style.height = "16px"; }
  wrap.appendChild(iconSpan);
  const label = document.createElement("span");
  label.textContent = T("image.loadFailed");
  wrap.appendChild(label);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = T("image.openInNewTab");
  a.addEventListener("click", (e) => e.stopPropagation());
  wrap.appendChild(a);
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
function render() {
  const app = document.getElementById("app");

  if (authLoading) { app.innerHTML = `<div class="loading">${T("common.loading")}</div>`; return; }
  if (!session) { app.innerHTML = renderAuthScreen(); renderModal(); return; }
  if (currentProfile && currentProfile.active === false) { app.innerHTML = renderDisabledScreen(); return; }

  const stats = computeStats();
  const isAdmin = currentProfile && currentProfile.role === "admin";
  const displayName = currentProfile && currentProfile.display_name;
  const TABS = [
    { id: "grid", label: T("tab.grid"), icon: ICONS.grid },
    { id: "analytics", label: T("tab.analytics"), icon: ICONS.chart },
    { id: "calendar", label: T("tab.calendar"), icon: ICONS.calendar },
    { id: "changelog", label: T("tab.changelog"), icon: ICONS.clock },
    { id: "settings", label: T("tab.settings"), icon: ICONS.settings },
  ];
  if (isAdmin) TABS.push({ id: "admin", label: T("tab.admin"), icon: ICONS.shield });
  let body = "";
  try {
    if (tab === "grid") body = renderGrid();
    else if (tab === "analytics") body = renderAnalytics();
    else if (tab === "calendar") body = renderCalendar();
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
        <div class="subline">${recordMode === "backtest" ? T("mode.backtest") : T("mode.live")} · taken ${stats.totalTaken} · WR ${fmtPct(stats.wr)} ${stats.hasR ? "· EV " + fmtNum(stats.ev, 3) : ""}</div>
      </div>
      <div class="headerActions">
        <div class="modeToggle">
          <button class="modeBtn ${recordMode === "backtest" ? "active" : ""}" data-action="set-record-mode" data-mode="backtest">${T("mode.backtest")}</button>
          <button class="modeBtn ${recordMode === "live" ? "active" : ""}" data-action="set-record-mode" data-mode="live">${T("mode.live")}</button>
        </div>
        <button class="themeToggle" data-action="toggle-theme" title="${esc(T("header.toggleTheme"))}">${document.documentElement.dataset.theme === "light" ? ICONS.moon : ICONS.sun}</button>
        <div style="position:relative;">
          <button class="btn" data-action="toggle-export">${ICONS.download} ${T("header.export")}</button>
          <div class="exportMenu ${exportMenuOpen ? "open" : ""}">
            <button data-action="export-csv">CSV</button>
            <button data-action="export-json">${T("header.jsonBackup")}</button>
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
  else if (action === "export-csv") { downloadFile(`trades-${new Date().toISOString().slice(0,10)}.csv`, toCSV(), "text/csv;charset=utf-8;"); exportMenuOpen = false; render(); }
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
    const field = schema.find((f) => f.id === fieldId);
    if (!field) return;
    const c = normalizeCombo({
      id: newComboId(),
      name: `${field.label} = ${val}`,
      conditions: [{ ...newFilterRow(fieldId), values: [val] }],
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
  else if (action === "toggle-model-filter-value") {
    const val = el.dataset.val;
    modelFilters = modelFilters.includes(val) ? modelFilters.filter((v) => v !== val) : [...modelFilters, val];
    saveModelFilters(); render();
  }
  else if (action === "clear-model-filters") { modelFilters = []; saveModelFilters(); render(); }
  else if (action === "toggle-breakdown-picker") { breakdownPickerOpen = !breakdownPickerOpen; render(); }
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
    activeComboId = null; comboEditingId = null; comboConfirmDeleteId = null; breakdownPickerOpen = false; comboGroupModal = null; comboGroupConfirmDeleteId = null;
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
    activeComboId = null; comboEditingId = null; comboConfirmDeleteId = null; comboGroupModal = null; comboGroupConfirmDeleteId = null;
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
});
document.addEventListener("change", async (e) => {
  if (e.target.dataset.bind === "sort-by") {
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
  else if (e.target.dataset.action === "toggle-scope-taken") {
    // 纯本地设置，admin 只读查看别人数据时也能随便调，不影响被查看用户的数据
    statScope.takenOnly = e.target.checked;
    saveStatScope(); render();
  }
  else if (e.target.dataset.action === "toggle-scope-he") {
    statScope.excludeHumanError = e.target.checked;
    saveStatScope(); render();
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
  if (comboGroupModal) { comboGroupModal = null; render(); return; }
  if (profileModalOpen) { profileModalOpen = false; render(); return; }
  if (editingTrade) {
    editingTrade = null;
    if (returnToDayDetail) { dayDetailDate = returnToDayDetail; returnToDayDetail = null; }
    renderModal(); render();
    return;
  }
  if (dayDetailDate) { dayDetailDate = null; render(); return; }
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
      analysisPrefs = defaultAnalysisPrefs(); analysisPrefsError = null;
      activeComboId = null; comboEditingId = null; comboConfirmDeleteId = null; breakdownPickerOpen = false;
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

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
};

/* ============================================================
   FIELD TYPES / ROLES
   ============================================================ */
const FIELD_TYPES = [
  { value: "text", label: "单行文本" }, { value: "textarea", label: "多行文本" },
  { value: "number", label: "数字" }, { value: "date", label: "日期" }, { value: "time", label: "时间" },
  { value: "select", label: "单选" }, { value: "multiselect", label: "多选" }, { value: "url", label: "链接/截图" },
];
const ROLE_OPTIONS = [
  { value: "", label: "无" }, { value: "date", label: "日期(用于月度覆盖)" },
  { value: "model", label: "模型(按模型统计)" }, { value: "taken", label: "Taken / Faded" },
  { value: "result", label: "结果 W/L/BE" }, { value: "r_multiple", label: "R 倍数" },
  { value: "max_rr", label: "最大 RR" }, { value: "human_error", label: "人为失误" },
  { value: "screenshot", label: "截图链接" },
];

const DEFAULT_SCHEMA = [
  { id: "date", label: "日期", type: "date", role: "date" },
  { id: "session", label: "交易时段", type: "select", role: "", options: ["London", "NYAM", "Asia", "Other"] },
  { id: "entry_time", label: "入场时间", type: "time", role: "" },
  { id: "direction", label: "方向", type: "select", role: "", options: ["Long", "Short"] },
  { id: "model", label: "模型", type: "select", role: "model", options: ["ifvg"] },
  { id: "entry", label: "入场方式", type: "multiselect", role: "", options: ["displacement", "IFVG", "CISD"] },
  { id: "taken", label: "做了还是避免", type: "select", role: "taken", options: ["Taken", "Faded"] },
  { id: "result", label: "结果", type: "select", role: "result", options: ["W", "L", "BE", "BE -> L", "BE -> W"] },
  { id: "r_multiple", label: "RR", type: "number", role: "r_multiple" },
  { id: "human_error", label: "人为错误", type: "select", role: "human_error", options: ["yes", "no"] },
  { id: "setup_grade_self", label: "自评等级", type: "select", role: "", options: ["A+", "A", "B+", "B", "C", "D"] },
  { id: "target_type", label: "目标类型", type: "multiselect", role: "", options: ["5M ITH/L", "15M ITH/L", "30M+ ITH/L", "BSL/SSL", "PDH/L", "INTERNAL LRL", "SESSION HIGH/LOW", "Unfilled FVG", "REQH/L", "Data H/L", "HR"] },
  { id: "notes", label: "笔记", type: "textarea", role: "" },
  { id: "post_note", label: "复盘笔记", type: "textarea", role: "" },
  { id: "screenshot", label: "截图", type: "url", role: "screenshot" },
];

/* ============================================================
   STATE
   ============================================================ */
let schema = DEFAULT_SCHEMA;
let cardFields = [];
let cardFieldsPickerOpen = false;
let trades = [];
let tab = "grid";
let editingTrade = null;
let confirmDeleteId = null;
let exportMenuOpen = false;
let activeFilters = []; // [{fieldId, value}]
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
   ANALYSIS PREFS —— 分析页的口径开关 / 拆解显示配置 / 组合
   全部存在 journal_schema.analysis_prefs (jsonb) 这一列里
   ============================================================ */
function defaultAnalysisPrefs() {
  return {
    statScope: { excludeHumanError: true, takenOnly: true },
    modelFilter: "",        // ""=全部模型；只影响总览+拆解，不影响组合
    breakdownHidden: [],   // 存「隐藏哪些」，新加的字段自动出现
    breakdownOrder: [],    // 只存用户排过序的，没排到的按 schema 顺序接在后面
    combos: [],
  };
}
function normalizeAnalysisPrefs(raw) {
  const d = defaultAnalysisPrefs();
  if (!raw || typeof raw !== "object") return d;
  const scope = raw.statScope && typeof raw.statScope === "object" ? raw.statScope : {};
  return {
    statScope: {
      excludeHumanError: scope.excludeHumanError !== false,
      takenOnly: scope.takenOnly !== false,
    },
    modelFilter: typeof raw.modelFilter === "string" ? raw.modelFilter : "",
    breakdownHidden: Array.isArray(raw.breakdownHidden) ? raw.breakdownHidden.filter((x) => typeof x === "string") : [],
    breakdownOrder: Array.isArray(raw.breakdownOrder) ? raw.breakdownOrder.filter((x) => typeof x === "string") : [],
    combos: Array.isArray(raw.combos) ? raw.combos.map(normalizeCombo).filter(Boolean) : [],
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
    name: typeof c.name === "string" ? c.name : "未命名组合",
    tag: c.tag === "do" || c.tag === "avoid" ? c.tag : "",
    conditions,
  };
}
function newComboId() { return "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function findCombo(id) { return analysisPrefs.combos.find((c) => c.id === id) || null; }

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
      ? "分析设置没能保存到数据库——journal_schema 表还缺 analysis_prefs 这一列，去 Supabase SQL Editor 跑一次：alter table journal_schema add column if not exists analysis_prefs jsonb default '{}'::jsonb;"
      : "分析设置保存失败：" + error.message;
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
// 模型筛选（不选=全部）也算总览/拆解的口径之一，跟另外两个开关一样不影响组合
function analysisBaseTrades() {
  const modelF = roleField("model");
  if (modelF && analysisPrefs.modelFilter) return trades.filter((t) => t[modelF.id] === analysisPrefs.modelFilter);
  return trades;
}
// 当前口径下参与统计的交易集（顶部数字和字段拆解共用同一批）
function scopedTrades() {
  const heF = roleField("human_error"), takenF = roleField("taken");
  const scope = analysisPrefs.statScope;
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
  const scope = analysisPrefs.statScope;
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
    if (!f.fieldId) { soft.push(`第 ${no} 条还没选字段（不会起任何过滤作用）`); return; }
    const field = schema.find((x) => x.id === f.fieldId);
    if (!field) { hard.push(`第 ${no} 条引用的字段已被删除，这条会失效并放行全部交易`); return; }
    if (field.type === "select" || field.type === "multiselect") {
      const opts = field.options || [];
      const missing = (f.values || []).filter((v) => !opts.includes(v));
      if (missing.length) hard.push(`「${field.label}」的选项 ${missing.join("、")} 已不存在，永远匹配不到`);
      if (!(f.values || []).length) soft.push(`「${field.label}」没选任何值（不会起任何过滤作用）`);
    } else if (field.type === "date" || field.type === "time") {
      if (!f.rangeStart && !f.rangeEnd) soft.push(`「${field.label}」没填区间（不会起任何过滤作用）`);
    } else if (!f.textValue) {
      soft.push(`「${field.label}」没填内容（不会起任何过滤作用）`);
    }
  });
  return { hard, soft };
}
// 卡片上那行人话版的条件描述
function comboConditionsText(combo) {
  const parts = [];
  (combo.conditions || []).forEach((f) => {
    const field = schema.find((x) => x.id === f.fieldId);
    if (!field) { parts.push("⚠ 字段已删除"); return; }
    if (field.type === "select" || field.type === "multiselect") {
      if (!(f.values || []).length) return;
      const join = f.matchMode === "and" ? " 且 " : " / ";
      parts.push(`${field.label} ${f.negate ? "≠" : "="} ${f.values.join(join)}`);
    } else if (field.type === "date" || field.type === "time") {
      if (!f.rangeStart && !f.rangeEnd) return;
      parts.push(`${field.label} ${f.rangeStart || "…"}~${f.rangeEnd || "…"}`);
    } else if (f.textValue) {
      parts.push(`${field.label} 含「${f.textValue}」`);
    }
  });
  return parts.length ? parts.join(" · ") : "没有任何条件（= 全部交易）";
}
const COMBO_SMALL_SAMPLE = 10;
const COMBO_TAGS = { do: { label: "可以做", color: "var(--pos)", soft: "var(--posSoft)" },
                     avoid: { label: "要避免", color: "var(--neg)", soft: "var(--negSoft)" } };

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

// Aggregate taken trades (non-HE) into a stats object for a set of trades on one day / one month.
// Colors by R sum when an r_multiple field exists; falls back to W/L balance otherwise.
function aggregateTradeStats(list) {
  const rF = roleField("r_multiple"), resultF = roleField("result"), takenF = roleField("taken"), heF = roleField("human_error");
  const clean = list.filter((t) => !heF || t[heF.id] !== "yes");
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
  sb.rpc("touch_last_seen").then(({ error: e }) => { if (e) console.error(e); });
}
async function loadAll() {
  if (!sb || !session) return;
  try {
    const uid = viewingUserId || session.user.id;
    const { data: schemaRow, error: e1 } = await sb.from("journal_schema").select("*").eq("user_id", uid).single();
    if (e1 && e1.code !== "PGRST116") throw e1;
    if (!schemaRow || !schemaRow.fields || !schemaRow.fields.length) {
      schema = DEFAULT_SCHEMA;
      if (!viewingUserId) await sb.from("journal_schema").upsert({ user_id: uid, fields: DEFAULT_SCHEMA, card_fields: [] });
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
    loadError = "读取数据失败，请稍后刷新重试。如果一直这样，联系管理员检查一下数据库设置。";
    schema = DEFAULT_SCHEMA; trades = [];
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
  if (error) { console.error(error); alert("保存失败: " + error.message); return; }
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
  if (error) { alert("发布失败：" + error.message); return; }
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
  if (m.includes("invalid login credentials")) return "邮箱或密码不对，再试一次。";
  if (m.includes("email not confirmed")) return "邮箱还没验证——去邮箱里点确认链接，再回来登录。";
  if (m.includes("user already registered") || m.includes("already registered")) return "这个邮箱已经注册过了，直接登录就行。";
  if (m.includes("password") && m.includes("6")) return "密码太短，至少 6 位。";
  if (m.includes("rate limit") || m.includes("too many")) return "请求太频繁了，等一会再试。";
  if (m.includes("network") || m.includes("fetch")) return "网络连接失败，检查一下网络或者 Supabase 连接设置。";
  return "出了点问题，稍后再试一次。";
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
  authSuccess = "注册成功。如果需要邮箱验证，去邮箱点一下确认链接，然后回来登录；不需要验证的话现在就能直接登录。";
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
  if (error) { alert("操作失败：" + error.message); return; }
  await loadAdminUsers(); render();
}
async function setUserRole(userId, role) {
  const { error } = await sb.from("profiles").update({ role }).eq("id", userId);
  if (error) { alert("操作失败：" + error.message); return; }
  await loadAdminUsers(); render();
}

async function updateOwnProfile(displayName, gender) {
  profileBusy = true; profileError = ""; profileSuccess = ""; render(); renderSecondaryModals(true);
  const { error } = await sb.rpc("update_own_profile", { new_display_name: displayName, new_gender: gender || null });
  profileBusy = false;
  if (error) { profileError = "保存失败，请稍后再试。"; render(); renderSecondaryModals(true); return; }
  await loadProfile();
  profileSuccess = "已保存。";
  render(); renderSecondaryModals(true);
}
async function changeOwnPassword(currentPw, newPw, confirmPw) {
  passwordError = ""; passwordSuccess = "";
  if (!currentPw || !newPw || !confirmPw) { passwordError = "三个都要填。"; render(); renderSecondaryModals(true); return; }
  if (newPw.length < 6) { passwordError = "新密码至少 6 位。"; render(); renderSecondaryModals(true); return; }
  if (newPw !== confirmPw) { passwordError = "两次新密码不一致。"; render(); renderSecondaryModals(true); return; }
  passwordBusy = true; render(); renderSecondaryModals(true);
  const { error: verifyErr } = await sb.auth.signInWithPassword({ email: session.user.email, password: currentPw });
  if (verifyErr) {
    passwordBusy = false; passwordError = "当前密码不对。"; render(); renderSecondaryModals(true); return;
  }
  const { error: updateErr } = await sb.auth.updateUser({ password: newPw });
  passwordBusy = false;
  if (updateErr) { passwordError = "修改失败：" + updateErr.message; render(); renderSecondaryModals(true); return; }
  passwordSuccess = "密码已修改。";
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
      ${ghosts.map((o) => `<button type="button" class="chip active" style="border-color:var(--neg);color:var(--neg);background:var(--negSoft);" title="这个选项已经不存在了，点一下移除" data-action="toggle-filter-value" data-idx="${idx}" data-val="${esc(o)}"${cid}>${esc(o)} ⚠</button>`).join("")}
    </div>`;
  }
  if (field.type === "date") {
    return `<div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
      <input type="date" class="select" data-filter-range="${idx}" data-bound="start"${cid} value="${esc(f.rangeStart || "")}" />
      <span style="color:var(--mutedDark);font-size:12px;">到</span>
      <input type="date" class="select" data-filter-range="${idx}" data-bound="end"${cid} value="${esc(f.rangeEnd || "")}" />
    </div>`;
  }
  if (field.type === "time") {
    return `<div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
      <input type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM" class="select mono" data-filter-range="${idx}" data-bound="start" data-time-input${cid} value="${esc(f.rangeStart || "")}" oninput="window.__formatTimeInput(this)" />
      <span style="color:var(--mutedDark);font-size:12px;">到</span>
      <input type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM" class="select mono" data-filter-range="${idx}" data-bound="end" data-time-input${cid} value="${esc(f.rangeEnd || "")}" oninput="window.__formatTimeInput(this)" />
    </div>
    <div style="font-size:10.5px;color:var(--mutedDark);margin-top:5px;">24小时制，直接输入数字如 0930 会自动格式化为 09:30</div>`;
  }
  return `<div style="margin-top:8px;"><input type="text" class="select" data-filter-text="${idx}"${cid} value="${esc(f.textValue || "")}" placeholder="包含…" /></div>`;
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
      ${comboId ? "" : `<span style="color:var(--mutedDark);cursor:grab;font-size:14px;" title="拖动排序">⠿</span>`}
      <select class="select" data-filter-field="${idx}"${cid}>
        <option value="">选字段…</option>
        ${schema.filter((x) => filterableTypes.includes(x.type)).map((x) => `<option value="${esc(x.id)}" ${f.fieldId === x.id ? "selected" : ""}>${esc(x.label)}</option>`).join("")}
      </select>
      ${showAndToggle ? `<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted);cursor:pointer;">
        <input type="checkbox" data-action="toggle-filter-and" data-idx="${idx}"${cid} ${f.matchMode === "and" ? "checked" : ""} style="width:13px;height:13px;" />要求同时满足选中的全部
      </label>` : ""}
      ${showNegate ? `<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted);cursor:pointer;">
        <input type="checkbox" data-action="toggle-filter-negate" data-idx="${idx}"${cid} ${f.negate ? "checked" : ""} style="width:13px;height:13px;" />不是以下任何一个
      </label>` : ""}
      <button class="tinyBtn" data-action="remove-filter" data-idx="${idx}"${cid} style="color:var(--neg);font-size:16px;margin-left:auto;">${ICONS.x}</button>
    </div>
    ${missing ? `<div style="font-size:11.5px;color:var(--neg);margin-top:8px;">⚠ 这个字段已经被删掉了，这条条件不起作用，请重选或删掉</div>` : ""}
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
  if (s.n === 0) return `<div style="font-size:12px;color:var(--mutedDark);margin-bottom:16px;">当前筛选：0 笔 taken</div>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;font-size:12.5px;color:var(--muted);margin-bottom:16px;padding:11px 14px;background:var(--surface2);border-radius:8px;">
    <span class="mono" style="color:var(--accent);font-weight:600;">胜率 ${fmtPct(s.wr)}</span>
    <span>W ${s.w} · L ${s.l} · BE ${s.be} · BE→W ${s.bew} · BE→L ${s.bel}</span>
    ${s.hasR ? `<span class="mono" style="color:${s.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">总 ${fmtNum(s.totalR)}R · EV ${fmtNum(s.ev, 3)}</span>` : ""}
    ${s.hasR ? `<span class="mono" style="color:${pfColor(s.pf)}" title="正R之和 ÷ |负R之和|，只统计填了 R 的 ${s.pfSample} 笔">PF ${fmtPF(s.pf)}</span>` : ""}
    ${!viewingUserId ? `<button class="tinyBtn" data-action="save-filters-as-combo" style="margin-left:auto;color:var(--accent);font-size:12px;">${ICONS.plus} 把当前筛选存为组合</button>` : ""}
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
    <button class="btn" data-action="grid-prev-page" ${gridPage <= 1 ? "disabled style='opacity:.35'" : ""}>‹ 上一页</button>
    <span class="mono" style="font-size:12.5px;color:var(--muted);">第 ${gridPage} / ${totalPages} 页 · 共 ${totalCount} 笔</span>
    <button class="btn" data-action="grid-next-page" ${gridPage >= totalPages ? "disabled style='opacity:.35'" : ""}>下一页 ›</button>
  </div>`;
}
const filterableTypes = ["select", "multiselect", "text", "textarea", "number", "date", "time"];
function renderFilterPanel(filteredCount, filteredForSummary) {
  const activeCount = activeFilters.filter((f) => f.fieldId).length;
  let html = `<div class="filterBar" style="flex-direction:column;align-items:flex-start;">
    <button data-action="toggle-filter-panel" style="display:flex;align-items:center;gap:8px;background:transparent;border:none;cursor:pointer;padding:0;width:100%;">
      ${ICONS.filter}
      <span style="font-size:12.5px;color:var(--text);font-weight:500;">筛选条件</span>
      ${activeCount > 0 ? `<span style="font-size:11px;color:var(--accent);background:var(--accentSoft);padding:2px 8px;border-radius:10px;">${activeCount} 个已启用</span>` : ""}
      <span style="font-size:12px;color:var(--mutedDark);">${filteredCount} 笔</span>
      <span style="margin-left:auto;color:var(--mutedDark);">${filterPanelOpen ? ICONS.chevUp : ICONS.chevDown}</span>
    </button>`;
  if (filterPanelOpen) {
    html += `<div style="font-size:11.5px;color:var(--mutedDark);margin-top:8px;">条件之间 AND，同一条件内多选是 OR</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;width:100%;">`;
    activeFilters.forEach((f, idx) => { html += filterConditionRowHtml(f, idx, ""); });
    html += `</div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn" data-action="add-filter">${ICONS.plus} 添加筛选条件</button>
      ${activeFilters.length ? `<button class="btn" data-action="clear-all-filter-values">一键清空已选</button>` : ""}
    </div>
    <div style="margin-top:14px;">${renderFilterSummary(filteredForSummary)}</div>`;
  }
  html += `</div>`;
  return html;
}
function renderGrid() {
  const modelF = roleField("model"), resultF = roleField("result"), dateF = roleField("date"), rF = roleField("r_multiple"), shotF = roleField("screenshot");

  let filtered = trades.filter((t) => activeFilters.every((f) => tradeMatchesFilter(t, f)));
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
    <span style="font-size:13px;color:var(--accent);">${ICONS.filter} 正在查看组合 <b>${esc(activeCombo.name)}</b> 的交易</span>
    <span style="display:flex;gap:8px;">
      <button class="btn" data-action="back-to-combo">回到分析页</button>
      <button class="btn" data-action="restore-pre-combo-filters">还原筛选</button>
    </span>
  </div>` : "";
  html += renderFilterPanel(filtered.length, filtered);

  // sort controls
  html += `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:14px;">
    <span style="font-size:11.5px;color:var(--mutedDark);">排序</span>
    <select class="select" data-bind="sort-by">
      <option value="trade_date" ${sortBy === "trade_date" ? "selected" : ""}>交易日期</option>
      <option value="created_at" ${sortBy === "created_at" ? "selected" : ""}>创建日期</option>
      <option value="updated_at" ${sortBy === "updated_at" ? "selected" : ""}>修改日期</option>
    </select>
    <button class="btn" data-action="toggle-sort-dir" style="padding:5px 10px;font-size:12px;">${sortDir === "desc" ? "↓ 从新到旧" : "↑ 从旧到新"}</button>
  </div>

  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:${gridViewMode === "card" && cardFieldsPickerOpen ? "0" : "16"}px;">
    <div style="display:flex;gap:6px;">
      <button class="btn ${gridViewMode === "card" ? "btn-primary" : ""}" data-action="set-view-mode" data-mode="card">${ICONS.grid} 卡片</button>
      <button class="btn ${gridViewMode === "table" ? "btn-primary" : ""}" data-action="set-view-mode" data-mode="table">${ICONS.table} 表格</button>
    </div>
    ${gridViewMode === "card" ? `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
      <span style="font-size:11.5px;color:var(--mutedDark);">图片大小</span>
      ${Object.keys(CARD_SIZES).map((sz) => `<button class="btn ${gridCardSize === sz ? "btn-primary" : ""}" data-action="set-card-size" data-size="${sz}" style="padding:5px 10px;font-size:12px;">${sz === "compact" ? "紧凑" : sz === "standard" ? "标准" : sz === "large" ? "大图" : "超大图"}</button>`).join("")}
      <button class="btn ${cardFieldsPickerOpen ? "btn-primary" : ""}" data-action="toggle-card-fields-picker" style="padding:5px 10px;font-size:12px;">${ICONS.settings} 卡片显示字段</button>
    </div>` : ""}
  </div>
  ${gridViewMode === "card" && cardFieldsPickerOpen ? `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:16px;">
    <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:8px;">日期 / 模型 / R值 默认一直显示，这里选的是在这基础上额外多显示哪些字段</div>
    <div class="chipGroup">
      ${schema.filter((f) => !["date", "model", "r_multiple"].includes(f.role)).map((f) => `<button type="button" class="chip ${cardFields.includes(f.id) ? "active" : ""}" data-action="toggle-card-field" data-id="${esc(f.id)}">${esc(f.label)}</button>`).join("")}
    </div>
    ${cardFields.length ? `<button class="tinyBtn" data-action="reset-card-fields" style="color:var(--mutedDark);margin-top:8px;">清空额外字段</button>` : ""}
  </div>` : ""}`;

  if (!filtered.length) {
    html += `<div class="emptyState"><div style="font-size:14px;margin-bottom:14px;">还没有记录</div><button class="btn btn-primary" data-action="new-trade">${ICONS.plus} 新建交易</button></div>`;
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
        ${shot ? `<button class="previewIcon" data-action="preview-image" data-url="${esc(shot)}" title="大图查看">${ICONS.expand}</button>` : ""}
        ${result ? `<span class="resultBadge" style="background:${rc}">${esc(result)}</span>` : ""}
      </div>
      <div class="cardBody">
        ${bodyHtml}
      </div>
      <div class="cardFoot">
        ${viewingUserId ? "" : (!confirming
          ? `<button data-action="ask-delete" data-id="${esc(t.id)}">${ICONS.trash}</button>`
          : `<button data-action="confirm-delete" data-id="${esc(t.id)}" style="background:var(--negSoft);color:var(--neg);">确定删除</button><button data-action="cancel-delete">取消</button>`)}
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
      ${fieldId && !viewingUserId ? `<button class="tinyBtn" data-action="combo-from-breakdown" data-field="${esc(fieldId)}" data-val="${esc(row.value)}" title="用这一条直接建一个组合">${ICONS.plus}组合</button>` : ""}
    </div>
  </div>`;
}

/* ---------- 分析页：口径开关 ---------- */
function renderStatScopeBar() {
  const scope = analysisPrefs.statScope;
  const takenF = roleField("taken"), heF = roleField("human_error"), modelF = roleField("model");
  if (!takenF && !heF && !modelF) return "";
  return `<div style="display:flex;flex-wrap:wrap;gap:18px;align-items:center;margin-bottom:16px;padding:10px 14px;background:var(--surface2);border-radius:8px;font-size:12px;color:var(--muted);">
    <span style="color:var(--mutedDark);">统计口径</span>
    ${takenF ? `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
      <input type="checkbox" data-action="toggle-scope-taken" ${scope.takenOnly ? "checked" : ""} style="width:13px;height:13px;" />只算已入场（Taken）的交易
    </label>` : ""}
    ${heF ? `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
      <input type="checkbox" data-action="toggle-scope-he" ${scope.excludeHumanError ? "checked" : ""} style="width:13px;height:13px;" />排除标记为人为错误的交易
    </label>` : ""}
    ${modelF ? `<label style="display:flex;align-items:center;gap:6px;">
      <span>模型</span>
      <select class="select" data-bind="analysis-model-filter" style="padding:4px 8px;font-size:12px;" ${viewingUserId ? "disabled" : ""}>
        <option value="" ${!analysisPrefs.modelFilter ? "selected" : ""}>全部</option>
        ${(modelF.options || []).map((o) => `<option value="${esc(o)}" ${analysisPrefs.modelFilter === o ? "selected" : ""}>${esc(o)}</option>`).join("")}
      </select>
    </label>` : ""}
    <span style="color:var(--mutedDark);font-size:11px;">这些开关只影响上面的总览和下面的字段拆解，不影响组合分析（组合用的是自己单独添加的筛选条件）</span>
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
      <input type="text" class="select" data-combo-name="${esc(combo.id)}" value="${esc(combo.name)}" placeholder="组合名字…" style="flex:1 1 220px;" />
      <select class="select" data-combo-tag="${esc(combo.id)}">
        <option value="" ${combo.tag === "" ? "selected" : ""}>不标记</option>
        <option value="do" ${combo.tag === "do" ? "selected" : ""}>可以做</option>
        <option value="avoid" ${combo.tag === "avoid" ? "selected" : ""}>要避免</option>
      </select>
    </div>
    <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:8px;">条件之间 AND，同一条件内多选是 OR，勾上「不是以下任何一个」就是 NOR。想只算 Taken / 排除人为错误，跟其他条件一样在下面加一行</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;width:100%;">
      ${(combo.conditions || []).map((f, idx) => filterConditionRowHtml(f, idx, combo.id)).join("")}
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn" data-action="add-filter" data-combo-id="${esc(combo.id)}">${ICONS.plus} 添加条件</button>
      ${(combo.conditions || []).length ? `<button class="btn" data-action="clear-all-filter-values" data-combo-id="${esc(combo.id)}">一键清空已选</button>` : ""}
      <button class="btn btn-primary" data-action="close-combo-editor">完成</button>
    </div>
  </div>`;
}
function renderComboCard(combo, idx) {
  const issues = comboIssues(combo);
  const broken = issues.hard.length > 0;
  const s = comboStats(combo);
  const base = comboBaseline(combo);
  const tag = COMBO_TAGS[combo.tag];
  const editing = comboEditingId === combo.id;
  const small = !broken && s.n > 0 && s.n < COMBO_SMALL_SAMPLE;
  const deleting = comboConfirmDeleteId === combo.id;

  let stats;
  if (broken) {
    stats = `<div style="font-size:12.5px;color:var(--neg);margin:2px 0 8px;">条件失效，数字不可信，先修好再看</div>`;
  } else {
    stats = `<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:baseline;margin:2px 0 8px;font-size:12.5px;color:var(--muted);">
      <span class="mono" style="font-size:17px;font-weight:600;color:var(--accent);">${fmtPct(s.wr)}</span>
      ${deltaText(s.wr, base.wr, "pp", 1)}
      <span class="mono">n=${s.n}</span>
      <span class="mono">W${s.w} L${s.l}${s.be ? " BE" + s.be : ""}</span>
      ${s.hasR ? `<span class="mono" style="color:${s.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(s.totalR)}R</span>` : ""}
      ${s.hasR ? `<span class="mono">EV ${fmtNum(s.ev, 3)} ${deltaText(s.ev, base.ev, "", 3)}</span>` : ""}
      ${s.hasR ? `<span class="mono" style="color:${pfColor(s.pf)}">PF ${fmtPF(s.pf)}</span>` : ""}
    </div>`;
  }

  return `<div class="comboCard ${combo.tag ? "tag-" + combo.tag : ""}" ${viewingUserId || editing ? "" : `draggable="true" data-combo-idx="${idx}"`}>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      ${viewingUserId || editing ? "" : `<span style="color:var(--mutedDark);cursor:grab;font-size:14px;" title="拖动排序">⠿</span>`}
      <span style="font-size:14px;color:var(--text);font-weight:500;">${esc(combo.name)}</span>
      ${tag ? `<span class="pill" style="background:${tag.soft};color:${tag.color};">${tag.label}</span>` : ""}
      ${small ? `<span class="pill" style="background:var(--surface2);color:var(--mutedDark);" title="样本太少，胜率的随机波动会很大，别急着下结论">样本仅 ${s.n} 笔</span>` : ""}
      ${!viewingUserId ? `<span style="margin-left:auto;display:flex;gap:6px;">
        <button class="tinyBtn" data-action="edit-combo" data-combo-id="${esc(combo.id)}">${editing ? "收起" : "编辑"}</button>
        <button class="tinyBtn" data-action="ask-delete-combo" data-combo-id="${esc(combo.id)}" style="color:var(--neg);">删除</button>
      </span>` : ""}
    </div>
    ${stats}
    ${issues.hard.length ? `<div style="font-size:11.5px;color:var(--neg);margin-bottom:8px;line-height:1.6;">${issues.hard.map((x) => "⚠ " + esc(x)).join("<br>")}</div>` : ""}
    ${issues.soft.length ? `<div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:8px;line-height:1.6;">${issues.soft.map((x) => "· " + esc(x)).join("<br>")}</div>` : ""}
    <div style="font-size:11.5px;color:var(--mutedDark);line-height:1.6;">${esc(comboConditionsText(combo))}</div>
    ${deleting ? `<div style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:12px;color:var(--neg);">
      确定删掉「${esc(combo.name)}」？
      <button class="btn btn-danger" data-action="confirm-delete-combo" data-combo-id="${esc(combo.id)}" style="padding:4px 10px;font-size:12px;">删除</button>
      <button class="btn" data-action="cancel-delete-combo" style="padding:4px 10px;font-size:12px;">取消</button>
    </div>` : ""}
    ${broken ? "" : `<button class="btn" data-action="open-combo-in-grid" data-combo-id="${esc(combo.id)}" style="margin-top:10px;padding:5px 10px;font-size:12px;">查看这 ${s.n} 笔交易 →</button>`}
    ${editing ? renderComboEditor(combo) : ""}
  </div>`;
}
function renderCombosSection() {
  const combos = analysisPrefs.combos || [];
  let html = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
    <div class="sectionLabel" style="margin:0;">⟦ 组合分析 ⟧</div>
    ${!viewingUserId ? `<button class="btn" data-action="add-combo" style="padding:4px 10px;font-size:12px;">${ICONS.plus} 新建组合</button>` : ""}
  </div>`;
  if (!combos.length) {
    html += `<div style="font-size:12.5px;color:var(--mutedDark);border:1px dashed var(--border);border-radius:10px;padding:16px;margin-bottom:26px;line-height:1.7;">
      还没有组合。组合就是一组固定的筛选条件（比如「模型=A 且 目标类型含 BSL」），存下来之后这里会实时显示它的胜率、EV、PF，点一下就能跳到记录页看是哪些交易。<br>
      三个建法：这里点「新建组合」手搭；记录页调好筛选后点「把当前筛选存为组合」；下面字段拆解里每一行右边的「+组合」。
    </div>`;
    return html;
  }
  html += `<div class="comboGrid">${combos.map(renderComboCard).join("")}</div>`;
  return html;
}

/* ---------- 分析页：拆解显示配置 ---------- */
function renderBreakdownPicker() {
  const hidden = analysisPrefs.breakdownHidden || [];
  const fields = breakdownCandidateFields();
  return `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:16px;">
    <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:10px;">取消勾选就不显示，拖动 ⠿ 调整顺序。以后新加的字段会自动出现在最后面。</div>
    <div style="display:flex;flex-direction:column;gap:4px;">
      ${fields.map((f, idx) => `<div class="bdRow" draggable="true" data-bd-idx="${idx}">
        <span style="color:var(--mutedDark);cursor:grab;font-size:14px;" title="拖动排序">⠿</span>
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer;flex:1;">
          <input type="checkbox" data-action="toggle-breakdown-field" data-id="${esc(f.id)}" ${hidden.includes(f.id) ? "" : "checked"} style="width:13px;height:13px;" />
          <span style="font-size:12.5px;color:var(--text);">${esc(f.label)}</span>
          <span style="font-size:11px;color:var(--mutedDark);">${f.type === "multiselect" ? "多选" : "单选"}${f.role ? " · " + esc(f.role) : ""}</span>
        </label>
      </div>`).join("")}
    </div>
    <button class="tinyBtn" data-action="reset-breakdown-prefs" style="margin-top:10px;color:var(--mutedDark);">恢复默认（全显示 + 默认顺序）</button>
  </div>`;
}
function renderAnalytics() {
  const stats = computeStats();
  if (!stats.hasResult) {
    return `<div class="notice">${ICONS.alert}<span>当前没有字段被标记为『结果』角色 — 去设置页给某个字段打上『结果 W/L/BE』角色标签，分析才能算出来。</span></div>`;
  }
  const takenF = roleField("taken"), resultF = roleField("result");
  const scope = analysisPrefs.statScope;
  const prefsNotice = analysisPrefsError ? `<div class="notice error" style="margin-bottom:16px;">${ICONS.alert}<span>${esc(analysisPrefsError)}</span></div>` : "";

  if (stats.totalTaken === 0) {
    const baseList = analysisBaseTrades();
    const total = baseList.length;
    const withTaken = takenF ? baseList.filter((t) => t[takenF.id] === "Taken").length : total;
    const withResult = resultF ? baseList.filter((t) => t[resultF.id] === "W" || t[resultF.id] === "L").length : 0;
    return prefsNotice + renderStatScopeBar() + `<div class="notice">${ICONS.alert}<div>
      <div style="color:var(--text);margin-bottom:6px;">当前口径下没有可统计的交易——${analysisPrefs.modelFilter ? "选中的模型" : "数据库里"}共 ${total} 笔，其中 taken=Taken 的有 ${withTaken} 笔，result 填了 W/L 的有 ${withResult} 笔。</div>
      <div>要么放宽上面的统计口径，要么新建交易时记得点选 taken=Taken、result 也选一个具体值（不能留空）。</div>
    </div></div>`;
  }

  const countLabel = scope.takenOnly && takenF ? "已入场" : "交易数";
  let html = prefsNotice + renderStatScopeBar() + `<div class="statRow">
    <div class="statBox"><div class="statLabel">${countLabel}</div><div class="statValue">${stats.totalTaken}</div></div>
    <div class="statBox"><div class="statLabel">胜率</div><div class="statValue" style="color:var(--accent)">${fmtPct(stats.wr)}</div></div>
    <div class="statBox"><div class="statLabel">设置质量</div><div class="statValue">${fmtPct(stats.sq)}</div></div>
    ${stats.hasR ? `<div class="statBox"><div class="statLabel">总R</div><div class="statValue" style="color:${stats.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(stats.totalR)}</div></div>` : ""}
    ${stats.hasR ? `<div class="statBox"><div class="statLabel">EV / 笔</div><div class="statValue" style="color:${stats.ev >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(stats.ev, 3)}</div></div>` : ""}
    ${stats.hasR ? `<div class="statBox" title="正R之和 ÷ |负R之和|，只统计填了 R 的 ${stats.pfSample} 笔"><div class="statLabel">盈亏比</div><div class="statValue" style="color:${pfColor(stats.pf)}">${fmtPF(stats.pf)}</div>${stats.pfSample !== stats.totalTaken ? `<div style="font-size:10.5px;color:var(--mutedDark);margin-top:3px;">基于填了 R 的 ${stats.pfSample} 笔</div>` : ""}</div>` : ""}
    ${stats.captureRate !== null ? `<div class="statBox"><div class="statLabel">R 捕获率</div><div class="statValue">${fmtPct(stats.captureRate)}</div></div>` : ""}
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:28px;font-size:12.5px;color:var(--muted);">
    <span>BE ${stats.be} · BE→W ${stats.bew} · BE→L ${stats.bel}</span>
    ${takenF ? `<span>· Faded ${stats.totalFaded}（本应做的 W ${stats.fadedW} / 本应避开的 L ${stats.fadedL}）</span>` : ""}
  </div>`;

  html += `<div style="margin-bottom:28px;">${renderCombosSection()}</div>`;

  if (stats.byModel.length && !analysisPrefs.modelFilter) {
    html += `<div style="margin-bottom:26px;"><div class="sectionLabel">⟦ 按模型 ⟧</div><div class="breakdownCard">${stats.byModel.map((r) => barRow(r, roleField("model").id)).join("")}</div></div>`;
  }

  html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
    <div class="sectionLabel" style="margin:0;">⟦ 全部字段拆解 ⟧</div>
    ${!viewingUserId ? `<button class="btn ${breakdownPickerOpen ? "btn-primary" : ""}" data-action="toggle-breakdown-picker" style="padding:4px 10px;font-size:12px;">${ICONS.settings} 显示设置</button>` : ""}
  </div>`;
  if (breakdownPickerOpen && !viewingUserId) html += renderBreakdownPicker();
  if (stats.breakdowns.length) {
    html += `<div class="breakdownGrid">`;
    stats.breakdowns.forEach((b) => {
      const draggable = !viewingUserId ? ` draggable="true" data-bd-card-id="${esc(b.field.id)}"` : "";
      html += `<div class="breakdownCard"${draggable}>
        <div class="breakdownTitle" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span>${!viewingUserId ? `<span style="cursor:grab;color:var(--mutedDark);" title="拖动排序">⠿</span> ` : ""}${esc(b.field.label)}</span>
          ${!viewingUserId ? `<button class="tinyBtn" data-action="hide-breakdown-field" data-id="${esc(b.field.id)}" title="不显示这个字段的拆解（想找回去上面『显示设置』里重新勾选）">${ICONS.x}</button>` : ""}
        </div>
        ${b.rows.map((r) => barRow(r, b.field.id)).join("")}
      </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div style="font-size:12.5px;color:var(--mutedDark);">没有可拆解的字段（全被隐藏了，或者当前口径下这些字段都没填过值）。</div>`;
  }
  return html;
}

/* ============================================================
   RENDER — CHANGELOG VIEW
   ============================================================ */
function renderChangelog() {
  const isAdmin = currentProfile && currentProfile.role === "admin";
  let html = isAdmin ? `<div class="field">
    <div class="fieldLabel">发布一条更新</div>
    <textarea class="input" id="changelogDraft" rows="3" placeholder="这次更新了什么…"></textarea>
    <button class="btn btn-primary" data-action="add-changelog" style="margin-top:8px;">${ICONS.plus} 发布</button>
  </div>
  <div style="margin:22px 0 14px;"><div class="sectionLabel">⟦ 历史更新 ⟧</div></div>` : "";
  if (!changelog.length) {
    html += `<div class="notice">${ICONS.alert}<span>还没有更新记录。</span></div>`;
  } else {
    changelog.forEach((c) => {
      const d = new Date(c.created_at);
      const dateStr = isNaN(d.getTime()) ? "" : d.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
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
    <div class="sectionLabel" style="margin:0;padding:0;border:none;">⟦ 月度概览 ⟧</div>
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
      <div class="monthBarLabel">${m}月</div>
      ${stats.count > 0 ? `<div class="monthBarValue">${stats.hasR ? fmtNum(stats.rSum) + "R" : stats.w + "胜" + stats.l + "负"}</div>` : ""}
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
  const prevMonthDays = new Date(year, month - 1, 0).getDate();
  const leadBlanks = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const totalCells = Math.ceil((leadBlanks + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < leadBlanks; i++) cells.push({ day: prevMonthDays - leadBlanks + 1 + i, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true, dateStr: year + "-" + String(month).padStart(2, "0") + "-" + String(d).padStart(2, "0") });
  let nd = 1;
  while (cells.length < totalCells) cells.push({ day: nd++, inMonth: false });

  let html = `<div class="calendarPanel" id="day-calendar-top">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <div class="sectionLabel" style="margin:0;padding:0;border:none;">⟦ 每日明细 ⟧</div>
    <div style="display:flex;align-items:center;gap:14px;">
      <button class="tinyBtn" data-action="cal-prev-month" style="font-size:20px;line-height:1;">‹</button>
      <div class="monthYear" style="margin-bottom:0;">${year} 年 ${month} 月</div>
      <button class="tinyBtn" data-action="cal-next-month" style="font-size:20px;line-height:1;">›</button>
    </div>
  </div>
  <div class="dayGrid">
    ${["一", "二", "三", "四", "五", "六", "日"].map((d) => `<div class="dayGridHead">周${d}</div>`).join("")}
    ${cells.map((c) => {
      if (!c.inMonth) return `<div class="dayCell outMonth"><div class="dayCellNum">${c.day}</div></div>`;
      const stats = aggregateTradeStats(tradesOnDate(c.dateStr));
      const tone = stats.count > 0 ? stats.tone : "";
      return `<div class="dayCell ${tone}" data-action="open-day-detail" data-date="${c.dateStr}">
        <div class="dayCellNum">${c.day}</div>
        ${stats.count > 0 ? `<div class="dayCellInfo">${stats.count} 笔${stats.hasR ? `<br>${fmtNum(stats.rSum)}R` : ""}</div>` : ""}
      </div>`;
    }).join("")}
  </div></div>`;
  return html;
}
function renderHistoryCoverage() {
  const statusLabel = { complete: "已完成", partial: "部分", empty: "未开始" };
  const curYear = new Date().getFullYear();
  let html = `<div class="calendarPanel" style="margin-top:20px;">
  <div class="sectionLabel" style="margin:0 0 12px;padding:0;border:none;">⟦ 历史回测覆盖 2020–${curYear} ⟧</div>
  <div style="font-size:12.5px;color:var(--muted);margin-bottom:20px;line-height:1.7;">
    规则：当月 1–10 号与 20 号至月底 <b style="color:var(--text)">各至少一笔记录</b> 才算「已完成」；只满足一半算「部分」。</div>`;
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
  if (!dateF) return `<div class="notice">${ICONS.alert}<span>当前没有字段被标记为『日期』角色 — 去设置页给某个字段打上『日期』角色标签。</span></div>`;
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
        <div style="flex:1;"><span class="mono" style="font-size:13.5px;color:var(--accent);">Supabase 连接设置</span>
        <span class="fieldTypeTag">${usingStored ? "使用本地保存的配置" : "使用文件内默认值"}</span></div>
      </div>
      <div class="settingsRowBody open">
        <div class="field"><div class="fieldLabel">Project URL</div><input class="input" id="apiUrlInput" placeholder="https://xxxx.supabase.co" value="${esc(cfg.url)}" /></div>
        <div class="field"><div class="fieldLabel">Publishable / anon key</div><input class="input" id="apiKeyInput" placeholder="sb_publishable_..." value="${esc(cfg.key)}" /></div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary" data-action="save-api-config">保存并重连</button>
          ${usingStored ? `<button class="btn" data-action="reset-api-config">恢复文件默认值</button>` : ""}
        </div>
        <div style="font-size:11px;color:var(--mutedDark);margin-top:8px;">保存在这台设备的浏览器里，不会改动 index.html 源文件本身。</div>
      </div>
    </div>

    <div class="settingsRow" style="border-color:var(--accent);">
      <div class="settingsRowHead" data-action="toggle-settings-row" data-id="__admin_users__">
        <div style="flex:1;"><span class="mono" style="font-size:13.5px;color:var(--accent);">用户管理</span>
        <span class="fieldTypeTag">${adminUsers === null ? "点击加载" : adminUsers.length + " 个用户"}</span></div>
        ${openSettingsRow === "__admin_users__" ? ICONS.chevUp : ICONS.chevDown}
      </div>
      <div class="settingsRowBody ${openSettingsRow === "__admin_users__" ? "open" : ""}">
        ${adminUsers === null
          ? `<div style="font-size:12px;color:var(--mutedDark);">展开时自动加载…</div>`
          : `<div style="overflow-x:auto;"><table class="adminTable"><thead><tr><th>邮箱</th><th>名称</th><th>角色</th><th>状态</th>${["tradeCount", "last_seen_at", "created_at"].map((key, i) => {
                const label = ["交易数", "上次在线", "注册时间"][i];
                const active = adminUsersSortBy === key;
                const arrow = active ? (adminUsersSortDir === "asc" ? " ▲" : " ▼") : "";
                return `<th data-action="sort-admin-users" data-key="${key}" style="cursor:pointer;user-select:none;${active ? "color:var(--accent);" : ""}">${label}${arrow}</th>`;
              }).join("")}<th></th></tr></thead><tbody>
              ${sortAdminUsers(adminUsers).map((u) => `<tr>
                <td>${esc(u.email)}</td>
                <td>${esc(u.display_name || "—")}</td>
                <td><span class="pill ${u.role === "admin" ? "on" : ""}">${esc(u.role)}</span></td>
                <td><span class="pill ${u.active ? "on" : "off"}">${u.active ? "正常" : "已禁用"}</span></td>
                <td class="mono">${u.tradeCount !== undefined ? u.tradeCount : "—"}</td>
                <td class="mono" style="font-size:11px;color:var(--mutedDark);">${u.last_seen_at ? esc(new Date(u.last_seen_at).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })) : "从未登录"}</td>
                <td class="mono" style="font-size:11px;color:var(--mutedDark);">${esc(String(u.created_at || "").slice(0, 10))}</td>
                <td style="white-space:nowrap;">
                  <button class="tinyBtn" data-action="toggle-user-active" data-id="${esc(u.id)}" data-next="${!u.active}" style="color:${u.active ? "var(--neg)" : "var(--pos)"};margin-right:10px;">${u.active ? "禁用" : "启用"}</button>
                  <button class="tinyBtn" data-action="toggle-user-role" data-id="${esc(u.id)}" data-next="${u.role === "admin" ? "user" : "admin"}" style="color:var(--accent);margin-right:10px;">${u.role === "admin" ? "取消admin" : "设为admin"}</button>
                  ${u.id !== session.user.id ? `<button class="tinyBtn" data-action="view-user-data" data-id="${esc(u.id)}" data-email="${esc(u.email)}" style="color:var(--accent);">${ICONS.expand} 查看数据</button>` : ""}
                </td>
              </tr>`).join("")}
            </tbody></table></div>
            <div style="font-size:11px;color:var(--mutedDark);margin-top:10px;">"禁用"会立刻阻止该账号登录使用，但不会删除 Supabase 里的账号本体（前端安全限制，无法真正删号）。</div>`
        }
      </div>
    </div>`;
  return html;
}
function renderSettings() {
  if (viewingUserId) {
    return `<div style="font-size:12.5px;color:var(--muted);margin-bottom:16px;line-height:1.7;">
      只读查看 ${esc(viewingUserEmail)} 的字段配置，不能编辑。</div>
      ${schema.map((f) => `<div class="settingsRow" style="cursor:default;">
        <div class="settingsRowHead" style="cursor:default;">
          <div style="flex:1;">
            <span class="mono" style="font-size:13.5px;color:var(--text);">${esc(f.label)}</span>
            <span class="fieldTypeTag">${esc(FIELD_TYPES.find((t) => t.value === f.type)?.label || f.type)}</span>
            ${f.role ? `<span class="fieldRoleTag">· ${esc(ROLE_OPTIONS.find((r) => r.value === f.role)?.label || f.role)}</span>` : ""}
          </div>
        </div>
        ${(f.options && f.options.length) ? `<div class="settingsRowBody open"><div class="chipGroup">${f.options.map((o) => `<span class="chip">${esc(o)}</span>`).join("")}</div></div>` : ""}
      </div>`).join("")}`;
  }
  let html = `<div style="font-size:12.5px;color:var(--muted);margin-bottom:16px;line-height:1.7;">
    字段的增删改在这里管理，改动会立即同步到录入表单和分析页。「分析角色」决定这个字段在统计里扮演什么。</div>`;
  schema.forEach((f, i) => {
    const open = openSettingsRow === f.id;
    html += `<div class="settingsRow">
      <div class="settingsRowHead" data-action="toggle-settings-row" data-id="${esc(f.id)}">
        <div class="reorderCol">
          <button class="tinyBtn" data-action="move-field" data-id="${esc(f.id)}" data-dir="-1" ${i === 0 ? "disabled style='opacity:.25'" : ""}>${ICONS.up}</button>
          <button class="tinyBtn" data-action="move-field" data-id="${esc(f.id)}" data-dir="1" ${i === schema.length - 1 ? "disabled style='opacity:.25'" : ""}>${ICONS.down}</button>
        </div>
        <div style="flex:1;">
          <span class="mono" style="font-size:13.5px;color:var(--text);">${esc(f.label)}</span>
          <span class="fieldTypeTag">${esc(FIELD_TYPES.find((t) => t.value === f.type)?.label || f.type)}</span>
          ${f.role ? `<span class="fieldRoleTag">· ${esc(ROLE_OPTIONS.find((r) => r.value === f.role)?.label || f.role)}</span>` : ""}
        </div>
        ${open ? ICONS.chevUp : ICONS.chevDown}
      </div>
      <div class="settingsRowBody ${open ? "open" : ""}">
        <div class="field"><div class="fieldLabel">字段名</div><input class="input" data-field-edit="label" data-id="${esc(f.id)}" value="${esc(f.label)}" /></div>
        <div class="field"><div class="fieldLabel">类型</div>
          <select class="input" data-field-edit="type" data-id="${esc(f.id)}">
            ${FIELD_TYPES.map((t) => `<option value="${t.value}" ${f.type === t.value ? "selected" : ""}>${t.label}</option>`).join("")}
          </select></div>
        <div class="field"><div class="fieldLabel">分析角色</div>
          <select class="input" data-field-edit="role" data-id="${esc(f.id)}">
            ${ROLE_OPTIONS.map((r) => `<option value="${r.value}" ${(f.role || "") === r.value ? "selected" : ""}>${r.label}</option>`).join("")}
          </select></div>
        ${(f.type === "select" || f.type === "multiselect") ? `
        <div class="field"><div class="fieldLabel">选项池（可拖动排序）</div>
          <div id="optpool-${esc(f.id)}">${(f.options || []).map((o, oi) => `<span class="tagChip" draggable="true" data-opt-field="${esc(f.id)}" data-opt-idx="${oi}" style="cursor:grab;">⠿ ${esc(o)}<span data-action="remove-option" data-id="${esc(f.id)}" data-opt="${esc(o)}">${ICONS.x}</span></span>`).join("")}</div>
          <div class="addOptRow"><input class="input" id="optdraft-${esc(f.id)}" placeholder="新选项…" />
          <button class="btn" data-action="add-option" data-id="${esc(f.id)}">加</button></div>
        </div>` : ""}
        <button class="btn btn-danger" data-action="delete-field" data-id="${esc(f.id)}">${ICONS.trash} 删除字段</button>
      </div>
    </div>`;
  });
  html += `<div class="addFieldBox">
    <div class="dashLabel">+ 新增字段</div>
    <div class="field"><div class="fieldLabel">字段名</div><input class="input" id="newFieldLabel" placeholder="例如：mentor_confirm" /></div>
    <div class="field"><div class="fieldLabel">类型</div>
      <select class="input" id="newFieldType">${FIELD_TYPES.map((t) => `<option value="${t.value}">${t.label}</option>`).join("")}</select></div>
    <div class="field"><div class="fieldLabel">初始选项（逗号分隔，仅单选/多选需要）</div><input class="input" id="newFieldOpts" placeholder="yes, no, maybe" /></div>
    <button class="btn btn-primary" data-action="add-field">${ICONS.plus} 添加字段</button>
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
  return `<div class="thumbWrap"><img class="thumb" src="${esc(val)}" referrerpolicy="no-referrer" data-fallback-url="${esc(val)}" data-fallback-class="thumbFallback" onerror="window.__imgFallback(this)" /></div><div class="thumbHint">拖右下角可以调整预览大小</div>`;
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
  label.textContent = "图片没加载出来";
  wrap.appendChild(label);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = "在新标签打开";
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
      <div class="modalHead"><div class="display" style="font-size:17px;font-weight:600;">${readOnly ? "查看交易（只读）" : isNew ? "新建交易" : "编辑交易"}</div>
        <button class="iconBtn" data-action="close-modal">${ICONS.x}</button></div>
      ${resumedDraft ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 22px;background:var(--accentSoft);border-bottom:1px solid var(--border);font-size:12.5px;color:var(--accent);">
        <span>已恢复上次未完成的草稿</span>
        <button class="tinyBtn" data-action="clear-draft" style="color:var(--accent);text-decoration:underline;">清除草稿</button>
      </div>` : ""}
      <div class="modalBody ${readOnly ? "readOnlyFields" : ""}" ${readOnly ? 'style="opacity:.75;"' : ""}>
        ${schema.map((f) => `<div class="field"><div class="fieldLabel">${esc(f.label)}</div>${fieldInputHtml(f)}</div>`).join("")}
      </div>
      <div class="modalFoot"><button class="btn" data-action="close-modal">${readOnly ? "关闭" : "取消"}</button>
        ${readOnly ? "" : `<button class="btn btn-primary" data-action="save-trade">保存</button>`}</div>
    </div>
  </div>`;
}

/* ============================================================
   MAIN RENDER
   ============================================================ */
function renderAuthScreen() {
  const isRegister = authScreenMode === "register";
  return `
  <div style="max-width:380px;margin:80px auto;padding:0 16px;">
    <div class="brand" style="text-align:center;margin-bottom:28px;"><span class="accent">IFVG</span> Trade Journal</div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;">
      <div style="display:flex;gap:6px;margin-bottom:18px;">
        <button class="btn ${!isRegister ? "btn-primary" : ""}" style="flex:1;" data-action="auth-mode" data-mode="login">登录</button>
        <button class="btn ${isRegister ? "btn-primary" : ""}" style="flex:1;" data-action="auth-mode" data-mode="register">注册</button>
      </div>
      <div class="field"><div class="fieldLabel">邮箱</div><input class="input" type="email" id="authEmail" autocomplete="username" /></div>
      <div class="field"><div class="fieldLabel">密码</div><input class="input" type="password" id="authPassword" autocomplete="${isRegister ? "new-password" : "current-password"}" /></div>
      ${!isRegister ? `<label style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--muted);margin-bottom:14px;cursor:pointer;">
        <input type="checkbox" id="rememberMeCheck" checked style="width:14px;height:14px;" />下次自动登录
      </label>` : ""}
      ${authError ? `<div style="font-size:12.5px;color:var(--neg);margin-bottom:12px;line-height:1.6;">${esc(authError)}</div>` : ""}
      ${authSuccess ? `<div style="font-size:12.5px;color:var(--pos);margin-bottom:12px;line-height:1.6;">${esc(authSuccess)}</div>` : ""}
      <button class="btn btn-primary" style="width:100%;justify-content:center;" data-action="auth-submit" ${authBusy ? "disabled" : ""}>
        ${authBusy ? "处理中…" : isRegister ? "注册" : "登录"}
      </button>
    </div>
  </div>`;
}
function renderDisabledScreen() {
  return `<div style="max-width:380px;margin:100px auto;text-align:center;">
    <div class="notice error" style="justify-content:center;">${ICONS.alert}<span>这个账号已被管理员禁用。</span></div>
    <button class="btn" style="margin-top:16px;" data-action="logout">退出登录</button>
  </div>`;
}
function profileModalHtml() {
  const p = currentProfile || {};
  profileGenderDraft = p.gender || null;
  return `<div class="overlay">
    <div class="modal" style="max-width:420px;">
      <div class="modalHead"><div class="display" style="font-size:17px;font-weight:600;">个人设置</div>
        <button class="iconBtn" data-action="close-profile-modal">${ICONS.x}</button></div>
      <div class="modalBody">
        <div class="field"><div class="fieldLabel">显示名称</div>
          <input class="input" id="profileNameInput" value="${esc(p.display_name || "")}" placeholder="例如：Timmy" /></div>
        <div class="field"><div class="fieldLabel">性别</div>
          <div class="chipGroup">
            <button type="button" class="chip ${p.gender === "男" ? "active" : ""}" data-action="set-gender-draft" data-val="男">男</button>
            <button type="button" class="chip ${p.gender === "女" ? "active" : ""}" data-action="set-gender-draft" data-val="女">女</button>
          </div>
        </div>
        ${profileError ? `<div style="font-size:12.5px;color:var(--neg);margin-bottom:10px;">${esc(profileError)}</div>` : ""}
        ${profileSuccess ? `<div style="font-size:12.5px;color:var(--pos);margin-bottom:10px;">${esc(profileSuccess)}</div>` : ""}
        <button class="btn btn-primary" data-action="save-profile" ${profileBusy ? "disabled" : ""}>${profileBusy ? "保存中…" : "保存"}</button>

        <div style="border-top:1px solid var(--border);margin:22px 0 16px;"></div>
        <div class="sectionLabel">⟦ 修改密码 ⟧</div>
        <div class="field"><div class="fieldLabel">当前密码</div><input class="input" type="password" id="pwCurrentInput" autocomplete="current-password" /></div>
        <div class="field"><div class="fieldLabel">新密码</div><input class="input" type="password" id="pwNewInput" autocomplete="new-password" /></div>
        <div class="field"><div class="fieldLabel">确认新密码</div><input class="input" type="password" id="pwConfirmInput" autocomplete="new-password" /></div>
        ${passwordError ? `<div style="font-size:12.5px;color:var(--neg);margin-bottom:10px;">${esc(passwordError)}</div>` : ""}
        ${passwordSuccess ? `<div style="font-size:12.5px;color:var(--pos);margin-bottom:10px;">${esc(passwordSuccess)}</div>` : ""}
        <button class="btn btn-primary" data-action="save-password" ${passwordBusy ? "disabled" : ""}>${passwordBusy ? "处理中…" : "修改密码"}</button>
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
        <div style="font-size:12.5px;color:var(--muted);margin-bottom:14px;">${stats.count} 笔${stats.hasR ? ` · 合计 ${fmtNum(stats.rSum)}R` : ""}</div>
        ${list.length === 0 ? `<div style="color:var(--mutedDark);font-size:13px;margin-bottom:14px;">这天还没有记录</div>` : ""}
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
        ${viewingUserId ? "" : `<button class="btn btn-primary" data-action="new-trade-for-day" style="margin-top:14px;width:100%;justify-content:center;">${ICONS.plus} 新建这天的交易</button>`}
      </div>
    </div>
  </div>`;
}
function renderSecondaryModals(force) {
  const root = document.getElementById("secondaryModalRoot");
  if (!root) return;
  const want = profileModalOpen ? "profile" : (lightboxUrl ? "lightbox" : (dayDetailDate ? "daydetail" : null));
  if (!force && want === secondaryModalState && want !== null) return; // already showing the right thing — don't wipe in-progress typing
  secondaryModalState = want;
  if (want === "profile") root.innerHTML = profileModalHtml();
  else if (want === "lightbox") root.innerHTML = lightboxHtml();
  else if (want === "daydetail") root.innerHTML = dayDetailModalHtml();
  else root.innerHTML = "";
}
function render() {
  const app = document.getElementById("app");

  if (authLoading) { app.innerHTML = `<div class="loading">加载中…</div>`; return; }
  if (!session) { app.innerHTML = renderAuthScreen(); renderModal(); return; }
  if (currentProfile && currentProfile.active === false) { app.innerHTML = renderDisabledScreen(); return; }

  const stats = computeStats();
  const isAdmin = currentProfile && currentProfile.role === "admin";
  const displayName = currentProfile && currentProfile.display_name;
  const TABS = [
    { id: "grid", label: "记录", icon: ICONS.grid },
    { id: "analytics", label: "分析", icon: ICONS.chart },
    { id: "calendar", label: "月度", icon: ICONS.calendar },
    { id: "changelog", label: "更新日志", icon: ICONS.clock },
    { id: "settings", label: "设置", icon: ICONS.settings },
  ];
  if (isAdmin) TABS.push({ id: "admin", label: "管理后台", icon: ICONS.shield });
  let body = "";
  try {
    if (tab === "grid") body = renderGrid();
    else if (tab === "analytics") body = renderAnalytics();
    else if (tab === "calendar") body = renderCalendar();
    else if (tab === "changelog") body = renderChangelog();
    else if (tab === "settings") body = renderSettings();
    else if (tab === "admin") body = isAdmin ? renderAdminPanel() : `<div class="notice">${ICONS.alert}<span>没有权限。</span></div>`;
  } catch (err) {
    console.error(err);
    body = `<div class="notice error">${ICONS.alert}<span>这个页签渲染出错了：${esc(err.message || err)}</span></div>`;
  }

  document.title = displayName ? `${displayName}的 IFVG Trade Journal` : "IFVG Trade Journal";

  app.innerHTML = `
    <div class="header">
      <div>
        <div class="brand">${displayName ? `<span class="accent">${esc(displayName)}</span>的 IFVG Trade Journal` : `<span class="accent">IFVG</span> Trade Journal`}</div>
        <div class="subline">${recordMode === "backtest" ? "回测" : "实盘"} · taken ${stats.totalTaken} · WR ${fmtPct(stats.wr)} ${stats.hasR ? "· EV " + fmtNum(stats.ev, 3) : ""}</div>
      </div>
      <div class="headerActions">
        <div class="modeToggle">
          <button class="modeBtn ${recordMode === "backtest" ? "active" : ""}" data-action="set-record-mode" data-mode="backtest">回测</button>
          <button class="modeBtn ${recordMode === "live" ? "active" : ""}" data-action="set-record-mode" data-mode="live">实盘</button>
        </div>
        <button class="themeToggle" data-action="toggle-theme" title="切换主题">${document.documentElement.dataset.theme === "light" ? ICONS.moon : ICONS.sun}</button>
        <div style="position:relative;">
          <button class="btn" data-action="toggle-export">${ICONS.download} 导出</button>
          <div class="exportMenu ${exportMenuOpen ? "open" : ""}">
            <button data-action="export-csv">CSV</button>
            <button data-action="export-json">JSON 备份</button>
          </div>
        </div>
        ${!viewingUserId ? `<button class="btn btn-primary" data-action="new-trade">${ICONS.plus} 新建交易</button>` : ""}
        <div style="position:relative;">
          <button class="themeToggle" data-action="toggle-user-menu" title="账号">${ICONS.user}</button>
          <div class="exportMenu ${userMenuOpen ? "open" : ""}" style="min-width:220px;">
            <div style="padding:9px 12px;font-size:11.5px;color:var(--mutedDark);border-bottom:1px solid var(--border);">
              ${esc(session.user.email)} ${isAdmin ? "· admin" : ""}
            </div>
            <button data-action="open-profile-modal">个人设置</button>
            <button data-action="logout">退出登录</button>
          </div>
        </div>
      </div>
    </div>
    ${viewingUserId ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--accentSoft);border:1px solid var(--accent);border-radius:8px;padding:10px 16px;margin-bottom:16px;">
      <span style="font-size:13px;color:var(--accent);">${ICONS.expand} 正在查看 <b>${esc(viewingUserEmail)}</b> 的数据（只读）</span>
      <button class="btn" data-action="exit-view-mode">退出查看</button>
    </div>` : ""}
    <div class="nav">
      ${TABS.map((t) => `<button class="tab ${tab === t.id ? "active" : ""}" data-action="switch-tab" data-tab="${t.id}">${t.icon} ${tab === t.id ? "[ " + t.label + " ]" : t.label}</button>`).join("")}
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
    const c = normalizeCombo({ id: newComboId(), name: "新组合 " + (analysisPrefs.combos.length + 1), conditions: [newFilterRow()] });
    analysisPrefs.combos.push(c);
    comboEditingId = c.id;
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
      name: "来自筛选 " + new Date().toLocaleDateString("zh-CN"),
      conditions: activeFilters.filter((f) => f.fieldId).map((f) => ({ ...f, values: [...(f.values || [])] })),
    });
    analysisPrefs.combos.push(c);
    comboEditingId = c.id;
    tab = "analytics";
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
    await saveAnalysisPrefsNow(); render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  else if (action === "clear-all-filter-values") {
    // 一键清空：只清每一行已选的值，字段行本身还留着，不删行
    const ctx = filterCtxOf(el); if (!ctx) return;
    for (let i = 0; i < ctx.arr.length; i++) ctx.arr[i] = newFilterRow(ctx.arr[i].fieldId);
    afterFilterChange(ctx);
  }
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
    if (!confirm("删除这条更新记录？")) return;
    await removeChangelogEntry(el.dataset.id);
  }
  else if (action === "auth-mode") { authScreenMode = el.dataset.mode; authError = ""; authSuccess = ""; render(); }
  else if (action === "auth-submit") {
    if (!sb) { authError = "连不上数据库，联系管理员检查一下。"; render(); return; }
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    if (!email || !password) { authError = "邮箱和密码都要填"; authSuccess = ""; render(); return; }
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
    activeComboId = null; comboEditingId = null; comboConfirmDeleteId = null; breakdownPickerOpen = false;
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
    activeComboId = null; comboEditingId = null; comboConfirmDeleteId = null;
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
  else if (action === "move-field") {
    const id = el.dataset.id, dir = parseInt(el.dataset.dir, 10);
    const idx = schema.findIndex((f) => f.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= schema.length) return;
    const next = [...schema];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    await persistSchema(next);
  }
  else if (action === "delete-field") {
    if (!confirm("删除这个字段？已有交易里这个字段的数据会保留但不再显示。")) return;
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
    if (viewingUserId) return;
    analysisPrefs.statScope.takenOnly = e.target.checked;
    queueSaveAnalysisPrefs(); render();
  }
  else if (e.target.dataset.action === "toggle-scope-he") {
    if (viewingUserId) return;
    analysisPrefs.statScope.excludeHumanError = e.target.checked;
    queueSaveAnalysisPrefs(); render();
  }
  else if (e.target.dataset.bind === "analysis-model-filter") {
    if (viewingUserId) return;
    analysisPrefs.modelFilter = e.target.value;
    queueSaveAnalysisPrefs(); render();
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
    c.name = e.target.value.trim() || "未命名组合";
    queueSaveAnalysisPrefs(); render();
  }
  else if (e.target.dataset.comboTag !== undefined) {
    if (viewingUserId) return;
    const c = findCombo(e.target.dataset.comboTag);
    if (!c) return;
    c.tag = e.target.value;
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
let dragComboIdx = null;
let dragBdIdx = null;
let dragBdCardId = null;
let dragOverEl = null;
const DRAGGABLES = '.filterRow[draggable="true"], .tagChip[draggable="true"], .comboCard[draggable="true"], .bdRow[draggable="true"], .breakdownCard[draggable="true"]';

function clearDragOverHighlight() {
  if (dragOverEl) { dragOverEl.classList.remove("dragOverTarget"); dragOverEl = null; }
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
    dragComboIdx = parseInt(combo.dataset.comboIdx, 10);
    e.dataTransfer.effectAllowed = "move";
    combo.style.opacity = "0.4";
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
  }
});
document.addEventListener("dragend", (e) => {
  const dragged = e.target.closest(DRAGGABLES);
  if (dragged) dragged.style.opacity = "";
  clearDragOverHighlight();
});
document.addEventListener("dragover", (e) => {
  const target = e.target.closest(DRAGGABLES);
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
  const combo = e.target.closest('.comboCard[draggable="true"]');
  if (combo && dragComboIdx !== null) {
    e.preventDefault();
    const targetIdx = parseInt(combo.dataset.comboIdx, 10);
    if (targetIdx !== dragComboIdx) {
      const [moved] = analysisPrefs.combos.splice(dragComboIdx, 1);
      analysisPrefs.combos.splice(targetIdx, 0, moved);
      saveAnalysisPrefsNow();
      render();
    }
    dragComboIdx = null;
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
  }
});
// 800ms 的 debounce 还没到就关页面的话，把没写完的分析设置补上
window.addEventListener("beforeunload", () => { flushAnalysisPrefs(); });

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (lightboxUrl) { lightboxUrl = null; render(); return; }
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
  if (!sb) { authLoading = false; loadError = "还没配置 Supabase — 展开登录页下面的『登录不了？调整 Supabase 连接』填好再试。"; return; }
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
      currentProfile = null; trades = []; schema = DEFAULT_SCHEMA; adminUsers = null;
      defaultFiltersSeeded = false; activeFilters = [];
      analysisPrefs = defaultAnalysisPrefs(); analysisPrefsError = null;
      activeComboId = null; comboEditingId = null; comboConfirmDeleteId = null; breakdownPickerOpen = false;
    }
    render();
  });
}
(async function init() {
  try {
    const savedTheme = localStorage.getItem("journal_theme");
    if (savedTheme === "light") document.documentElement.dataset.theme = "light";
  } catch (e) {}
  await bootstrapAuth();
  render();
})();

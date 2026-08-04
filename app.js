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
   ANALYTICS ENGINE
   ============================================================ */
function computeStats() {
  const resultF = roleField("result"), takenF = roleField("taken"), heF = roleField("human_error"),
        rF = roleField("r_multiple"), maxRrF = roleField("max_rr");
  const clean = trades.filter((t) => !heF || t[heF.id] !== "yes");
  const taken = clean.filter((t) => !takenF || t[takenF.id] === "Taken");
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
  const breakdowns = schema
    .filter((f) => (f.type === "select" || f.type === "multiselect") && !["result", "taken", "human_error"].includes(f.role))
    .map((f) => {
      const map = {};
      taken.forEach((t) => {
        let vals = t[f.id];
        if (vals === undefined || vals === null || vals === "") return;
        if (!Array.isArray(vals)) vals = [vals];
        const win = isW(t), loss = isL(t);
        vals.forEach((v) => { if (!map[v]) map[v] = { w: 0, l: 0 }; if (win) map[v].w++; if (loss) map[v].l++; });
      });
      const rows = Object.entries(map)
        .map(([value, c]) => ({ value, w: c.w, l: c.l, n: c.w + c.l, wr: c.w + c.l ? (c.w / (c.w + c.l)) * 100 : null }))
        .filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
      return { field: f, rows };
    }).filter((b) => b.rows.length > 0);
  const modelF = roleField("model");
  let byModel = [];
  if (modelF) { const found = breakdowns.find((b) => b.field.id === modelF.id); if (found) byModel = found.rows; }
  return { totalTaken: taken.length, totalFaded: faded.length, w, l, be, bew, bel, wr, sq, totalR, ev, captureRate, fadedW, fadedL, breakdowns, byModel, hasResult: !!resultF, hasR: !!rF };
}
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
function filterRowValuesHtml(field, idx, f) {
  if (field.type === "select" || field.type === "multiselect") {
    const vals = f.values || [];
    return `<div class="chipGroup" style="margin-top:8px;">
      ${(field.options || []).map((o) => `<button type="button" class="chip ${vals.includes(o) ? "active" : ""}" data-action="toggle-filter-value" data-idx="${idx}" data-val="${esc(o)}">${esc(o)}</button>`).join("")}
    </div>`;
  }
  if (field.type === "date" || field.type === "time") {
    return `<div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
      <input type="${field.type}" class="select" data-filter-range="${idx}" data-bound="start" value="${esc(f.rangeStart || "")}" />
      <span style="color:var(--mutedDark);font-size:12px;">到</span>
      <input type="${field.type}" class="select" data-filter-range="${idx}" data-bound="end" value="${esc(f.rangeEnd || "")}" />
    </div>
    ${field.type === "time" ? `<div style="font-size:10.5px;color:var(--mutedDark);margin-top:5px;">注意：12小时制里 12:00 AM = 午夜，12:00 PM = 中午，选反了会导致筛不出结果</div>` : ""}`;
  }
  return `<div style="margin-top:8px;"><input type="text" class="select" data-filter-text="${idx}" value="${esc(f.textValue || "")}" placeholder="包含…" /></div>`;
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
  return { n: clean.length, w, l, be, bew, bel, wr, totalR, ev, hasR };
}
function renderFilterSummary(filtered) {
  const s = filteredSummaryStats(filtered);
  if (s.n === 0) return `<div style="font-size:12px;color:var(--mutedDark);margin-bottom:16px;">当前筛选：0 笔 taken</div>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;font-size:12.5px;color:var(--muted);margin-bottom:16px;padding:11px 14px;background:var(--surface2);border-radius:8px;">
    <span class="mono" style="color:var(--accent);font-weight:600;">胜率 ${fmtPct(s.wr)}</span>
    <span>W ${s.w} · L ${s.l} · BE ${s.be} · BE→W ${s.bew} · BE→L ${s.bel}</span>
    ${s.hasR ? `<span class="mono" style="color:${s.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">总 ${fmtNum(s.totalR)}R · EV ${fmtNum(s.ev, 3)}</span>` : ""}
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
    activeFilters.forEach((f, idx) => {
      const field = schema.find((x) => x.id === f.fieldId);
      const showNegate = field && (field.type === "select" || field.type === "multiselect");
      const showAndToggle = field && field.type === "multiselect";
      html += `<div class="filterRow" draggable="true" data-filter-idx="${idx}" style="padding:10px 12px;border:1px solid var(--border);border-radius:8px;flex:1 1 320px;min-width:280px;max-width:420px;cursor:grab;">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <span style="color:var(--mutedDark);cursor:grab;font-size:14px;" title="拖动排序">⠿</span>
          <select class="select" data-filter-field="${idx}">
            <option value="">选字段…</option>
            ${schema.filter((x) => filterableTypes.includes(x.type)).map((x) => `<option value="${esc(x.id)}" ${f.fieldId === x.id ? "selected" : ""}>${esc(x.label)}</option>`).join("")}
          </select>
          ${showAndToggle ? `<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted);cursor:pointer;">
            <input type="checkbox" data-action="toggle-filter-and" data-idx="${idx}" ${f.matchMode === "and" ? "checked" : ""} style="width:13px;height:13px;" />要求同时满足选中的全部
          </label>` : ""}
          ${showNegate ? `<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted);cursor:pointer;">
            <input type="checkbox" data-action="toggle-filter-negate" data-idx="${idx}" ${f.negate ? "checked" : ""} style="width:13px;height:13px;" />不是以下任何一个
          </label>` : ""}
          <button class="tinyBtn" data-action="remove-filter" data-idx="${idx}" style="color:var(--neg);font-size:16px;margin-left:auto;">${ICONS.x}</button>
        </div>
        ${field ? filterRowValuesHtml(field, idx, f) : ""}
      </div>`;
    });
    html += `</div>
    <button class="btn" data-action="add-filter" style="margin-top:12px;">${ICONS.plus} 添加筛选条件</button>
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

  let html = renderFilterPanel(filtered.length, filtered);

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
        return `<div style="margin-top:8px;font-size:11.5px;">
          <div style="color:var(--mutedDark);margin-bottom:2px;">${esc(f.label)}</div>
          <div style="color:var(--text);white-space:normal;word-break:break-word;line-height:1.5;">${esc(formatFieldValueShort(f, t[fid]))}</div>
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
function barRow(row) {
  const width = row.wr === null ? 0 : row.wr;
  const color = row.wr === null ? "var(--mutedDark)" : row.wr >= 60 ? "var(--pos)" : row.wr >= 45 ? "var(--accent)" : "var(--neg)";
  return `<div class="barRow">
    <div class="barTop"><span style="color:var(--text)">${esc(row.value)}</span>
    <span class="mono" style="color:var(--muted)">n=${row.n} · W${row.w} L${row.l} · ${fmtPct(row.wr)}</span></div>
    <div class="barTrack"><div class="barFill" style="width:${width}%;background:${color}"></div></div></div>`;
}
function renderAnalytics() {
  const stats = computeStats();
  if (!stats.hasResult) {
    return `<div class="notice">${ICONS.alert}<span>当前没有字段被标记为『结果』角色 — 去设置页给某个字段打上『结果 W/L/BE』角色标签，分析才能算出来。</span></div>`;
  }
  const takenF = roleField("taken"), resultF = roleField("result");
  if (stats.totalTaken === 0) {
    const total = trades.length;
    const withTaken = takenF ? trades.filter((t) => t[takenF.id] === "Taken").length : total;
    const withResult = resultF ? trades.filter((t) => t[resultF.id] === "W" || t[resultF.id] === "L").length : 0;
    return `<div class="notice">${ICONS.alert}<div>
      <div style="color:var(--text);margin-bottom:6px;">暂时算不出统计——数据库里共 ${total} 笔交易，但符合条件（taken=Taken）的有 ${withTaken} 笔，其中 result 填了 W/L 的有 ${withResult} 笔。</div>
      <div>新建交易时记得点选 taken=Taken、result 也要选一个具体值（不能留空），这两个字段决定了能不能被计入统计。</div>
    </div></div>`;
  }
  let html = `<div class="statRow">
    <div class="statBox"><div class="statLabel">TAKEN</div><div class="statValue">${stats.totalTaken}</div></div>
    <div class="statBox"><div class="statLabel">WIN RATE</div><div class="statValue" style="color:var(--accent)">${fmtPct(stats.wr)}</div></div>
    <div class="statBox"><div class="statLabel">SETUP QUALITY</div><div class="statValue">${fmtPct(stats.sq)}</div></div>
    ${stats.hasR ? `<div class="statBox"><div class="statLabel">TOTAL R</div><div class="statValue" style="color:${stats.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(stats.totalR)}</div></div>` : ""}
    ${stats.hasR ? `<div class="statBox"><div class="statLabel">EV / 笔</div><div class="statValue" style="color:${stats.ev >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(stats.ev, 3)}</div></div>` : ""}
    ${stats.captureRate !== null ? `<div class="statBox"><div class="statLabel">R 捕获率</div><div class="statValue">${fmtPct(stats.captureRate)}</div></div>` : ""}
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:28px;font-size:12.5px;color:var(--muted);">
    <span>BE ${stats.be} · BE→W ${stats.bew} · BE→L ${stats.bel}</span>
    <span>· Faded ${stats.totalFaded}（本应做的 W ${stats.fadedW} / 本应避开的 L ${stats.fadedL}）</span>
  </div>`;
  if (stats.byModel.length) {
    html += `<div style="margin-bottom:26px;"><div class="sectionLabel">⟦ BY MODEL ⟧</div><div class="breakdownCard">${stats.byModel.map(barRow).join("")}</div></div>`;
  }
  if (stats.breakdowns.length) {
    html += `<div class="sectionLabel">⟦ 全部字段拆解 ⟧</div><div class="breakdownGrid">`;
    stats.breakdowns.forEach((b) => {
      html += `<div class="breakdownCard"><div class="breakdownTitle">${esc(b.field.label)}</div>${b.rows.map(barRow).join("")}</div>`;
    });
    html += `</div>`;
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
          : `<div style="overflow-x:auto;"><table class="adminTable"><thead><tr><th>邮箱</th><th>名称</th><th>角色</th><th>状态</th><th>交易数</th><th>上次在线</th><th>注册时间</th><th></th></tr></thead><tbody>
              ${adminUsers.map((u) => `<tr>
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

  if (action === "switch-tab") { tab = el.dataset.tab; confirmDeleteId = null; render(); }
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
  else if (action === "add-filter") { activeFilters.push(newFilterRow()); saveActiveFilters(); gridPage = 1; render(); }
  else if (action === "remove-filter") { activeFilters.splice(parseInt(el.dataset.idx, 10), 1); saveActiveFilters(); gridPage = 1; render(); }
  else if (action === "toggle-filter-value") {
    const idx = parseInt(el.dataset.idx, 10), val = el.dataset.val;
    const row = activeFilters[idx];
    const vals = row.values || [];
    row.values = vals.includes(val) ? vals.filter((v) => v !== val) : [...vals, val];
    saveActiveFilters();
    gridPage = 1;
    render();
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
  else if (action === "toggle-user-active") { await setUserActive(el.dataset.id, el.dataset.next === "true"); }
  else if (action === "toggle-user-role") { await setUserRole(el.dataset.id, el.dataset.next); }
  else if (action === "view-user-data") {
    ownStateSnapshot = {
      activeFilters: JSON.parse(JSON.stringify(activeFilters)),
      gridPage, sortBy, sortDir, recordMode, tab,
    };
    viewingUserId = el.dataset.id;
    viewingUserEmail = el.dataset.email;
    activeFilters = [];
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
    const idx = parseInt(e.target.dataset.filterField, 10);
    activeFilters[idx] = newFilterRow(e.target.value);
    saveActiveFilters();
    gridPage = 1;
    render();
  }
  else if (e.target.dataset.filterRange !== undefined) {
    const idx = parseInt(e.target.dataset.filterRange, 10), bound = e.target.dataset.bound;
    if (bound === "start") activeFilters[idx].rangeStart = e.target.value;
    else activeFilters[idx].rangeEnd = e.target.value;
    saveActiveFilters();
    gridPage = 1;
    render();
  }
  else if (e.target.dataset.filterText !== undefined) {
    const idx = parseInt(e.target.dataset.filterText, 10);
    activeFilters[idx].textValue = e.target.value;
    saveActiveFilters();
    gridPage = 1;
    render();
  }
  else if (e.target.dataset.action === "toggle-filter-negate") {
    const idx = parseInt(e.target.dataset.idx, 10);
    activeFilters[idx].negate = e.target.checked;
    saveActiveFilters();
    gridPage = 1;
    render();
  }
  else if (e.target.dataset.action === "toggle-filter-and") {
    const idx = parseInt(e.target.dataset.idx, 10);
    activeFilters[idx].matchMode = e.target.checked ? "and" : "or";
    saveActiveFilters();
    gridPage = 1;
    render();
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
let dragOverEl = null;

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
  }
});
document.addEventListener("dragend", (e) => {
  const row = e.target.closest('.filterRow[draggable="true"]');
  if (row) row.style.opacity = "";
  const chip = e.target.closest('.tagChip[draggable="true"]');
  if (chip) chip.style.opacity = "";
  clearDragOverHighlight();
});
document.addEventListener("dragover", (e) => {
  const row = e.target.closest('.filterRow[draggable="true"]');
  const chip = e.target.closest('.tagChip[draggable="true"]');
  const target = row || chip;
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
  }
});

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

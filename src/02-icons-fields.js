/* ============================================================
   ICONS — tiny inline SVGs (no external icon lib needed)
   ============================================================ */
// 侧边栏里的品牌标（跟 favicon 同一个图形：四根柱子）
const LOGO_MARK = '<svg viewBox="0 0 32 32" width="18" height="18" fill="none"><path d="M8 22V14M14 22V8M20 22V17M26 22V11" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>';
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
  tbColor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M5 19h14"/><path d="M8 15L12 5l4 10"/><path d="M9.3 12.4h5.4"/></svg>',
  /* ---------- 模型库 ---------- */
  layers: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
  star: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  starFill: '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none"/></svg>',
  outline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M4 6h16M8 12h12M12 18h8"/></svg>',
  tbTable: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="4" width="18"height="16" rx="2"/><path d="M3 10h18M9 10v10"/></svg>',
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
    { id: "result", label: T("defaultField.result"), type: "select", role: "result", options: ["W", "L", "BE", "BE -> L", "BE -> W", "Partial"] },
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

// 样本这么少的行不画色条、不标 delta、也不参与显著性排序：n=3 的 67% 是噪音，
// 不能长得跟 n=80 的 67% 一样有说服力。这只是**默认值**，用户能在「拆解显示设置」里改
// （实际生效的值一律走 currentMinSample()，别直接读这个常量）。
// ⚠ 跟 DEFAULT_TIME_BUCKETS 同理，必须声明在 STATE 之前：defaultAnalysisPrefs() 在模块加载时就会读它
const BREAKDOWN_MIN_SAMPLE = 5;


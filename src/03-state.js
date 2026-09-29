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
let tradePreviewId = null;      // 复盘正文里点交易胶囊弹出的只读预览
let returnToDayDetail = null;
let apiDraft = { url: "", key: "" };
let changelog = [];

/* ---------- 复盘（Reviews）状态 ----------
   只在实盘模式下出现，所以没有 mode 维度。编辑器不在 #app 里，
   而是自己一个根节点 #reviewEditorRoot + reviewEditorRenderedFor 守卫，
   跟 renderModal 的 modalRenderedForId 同一个套路——否则后台 render()
   会把正在写的长文冲掉。 */
let reviews = [];
/* 库的结构比前端旧（缺表 / 缺列，见 isSchemaOutdatedError）时置 true，页面顶部常驻一条「去跑迁移」的提示。
   以前每个功能各带一个「缺列」标志、各自降级（摘列重存、退回默认），现在统一：不降级，只明确告诉用户去跑
   supabase/migrations——降级写进去的数据是残缺的，比直接报错更难收拾。 */
let dbOutdated = false;
let reviewSearch = "";
let reviewConfirmDeleteId = null;
let editingReview = null;             // { id, title, body, week_start, _isNew }
let reviewEditorRenderedFor = null;   // 守卫：已经在显示这一篇就不重绘
let reviewSaveState = "idle";         // 'idle' | 'dirty' | 'saving' | 'saved'
let reviewSavedAt = null;
let reviewSaveTimer = null;
let reviewSaveError = null;
/* ---------- 复盘分组 ----------
   分组只有一级（没有二级分组），每篇复盘要么在某个分组里，要么在「未分组」。
   分组定义存 journal_schema.review_prefs，跟组合分组存 analysis_prefs 是同一个路子；
   每篇复盘归属哪个组、排第几，存在 journal_reviews 自己的 group_id / sort_order 列上。 */
let reviewPrefs = defaultReviewPrefs();
let reviewPrefsError = null;
let reviewGroupModal = null;          // { mode: 'new' | 'rename', id, name }
let reviewGroupConfirmDeleteId = null;
let reviewPrefsSaveTimer = null;
let dragReviewId = null;
let dragReviewGroupId = null;
// 哪些分组被收起来了，key 是 `${recordMode}:${groupId}`——回测和实盘各记各的
let collapsedReviewGroups = (function () {
  try {
    const raw = JSON.parse(localStorage.getItem("journal_review_collapsed") || "[]");
    return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : []);
  } catch (e) { return new Set(); }
})();
function saveCollapsedReviewGroups() {
  try { localStorage.setItem("journal_review_collapsed", JSON.stringify([...collapsedReviewGroups])); } catch (e) {}
}
function reviewGroupCollapseKey(gid) { return recordMode + ":" + gid; }
let slashMenu = null;                 // { from, query, index } —— 正文里打 / 弹出来的插入菜单
let tradePickerOpen = false;
let tradePickerQuery = "";
/* localStorage 里读出来的枚举一律过一遍白名单：
   「超大图」(huge) 这一档被看图模式取代删掉了，老用户本地还存着 "huge"，
   不校验的话四个尺寸按钮会全都不高亮、还查不出为什么 */
function pickStored(key, allowed, fallback) {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v) ? v : fallback;
  } catch (e) { return fallback; }
}
let gridCardSize = pickStored("journal_card_size", ["compact", "standard", "large"], "large");
let gridViewMode = pickStored("journal_view_mode", ["card", "table", "focus"], "card");
/* ---------- 看图模式（focus）的状态 ----------
   高度/字段位置是"我习惯这么看"，存 localStorage；
   遮挡和已揭晓是"这一次想怎么练"，只放内存，刷新回到不遮挡——
   遮挡状态被记住的话，第二天打开记录页只看到一排盖住的牌，会莫名其妙 */
let focusHeight = pickStored("journal_focus_height", ["comfy", "large", "full"], "large");
let focusSidePos = pickStored("journal_focus_side", ["right", "bottom"], "right");
let focusMasked = false;
let focusRevealed = new Set();
let focusFieldsPickerOpen = false;
let focusCursor = 0;            // 当前停在这一页的第几笔，J/K 用
let focusIndexTotal = 0;        // 筛完之后一共多少笔，J/K 就地改序号条时要用，省得重算一遍筛选
let focusFields = [];           // journal_schema.focus_fields，跟卡片视图的 cardFields 各存各的
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
let expandedFilterChips = new Set();   // 筛选行里哪几行把全部选项 chip 展开了，key=chipKey(ctx, path)
let expandedFilterGroups = new Set();  // 哪几个条件分组是展开的（默认折叠成一行摘要），key 同上。纯 UI 状态，不落库
let comboViewMode = (function () { try { return localStorage.getItem("journal_combo_view") === "list" ? "list" : "card"; } catch (e) { return "card"; } })();
const BREAKDOWN_SORTS = ["n", "delta", "ev", "sig_r", "sig_wr"];
let breakdownSort = (function () { try { const v = localStorage.getItem("journal_breakdown_sort"); return BREAKDOWN_SORTS.includes(v) ? v : "sig_r"; } catch (e) { return "sig_r"; } })();
// 卡片之间怎么排：manual = 用户拖出来的顺序（analysisPrefs.breakdownOrder），sig = 按显著性自动排。
// 这是"这台设备想怎么看"，跟 breakdownSort 一样存 localStorage，不占数据库
let breakdownCardOrder = (function () { try { return localStorage.getItem("journal_bd_card_order") === "manual" ? "manual" : "sig"; } catch (e) { return "sig"; } })();
function saveBreakdownCardOrder() { try { localStorage.setItem("journal_bd_card_order", breakdownCardOrder); } catch (e) {} }
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
      if (Array.isArray(raw)) saved = normalizeFilterNodes(raw);
    } catch (e) {}
  }
  analysisFilters = saved || defaultAnalysisFilters();
}


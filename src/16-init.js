/* ============================================================
   打开交易表单（按钮和「刷新后回到原处」共用）
   ============================================================ */
function startNewTrade() {
  if (viewingUserId) return;
  const draft = loadDraft();
  const blank = { id: uid(), _isNew: true };
  schema.forEach((f) => { blank[f.id] = f.type === "multiselect" ? [] : ""; });
  if (draft) {
    schema.forEach((f) => { if (draft[f.id] !== undefined) blank[f.id] = draft[f.id]; });
    [PB_KEY, PB_STAR_KEY, PB_TAGS_KEY, PB_NOTE_KEY].forEach((k) => { if (draft[k] !== undefined) blank[k] = draft[k]; });   // 模型库归属不是字段，单独带上
    blank._resumedDraft = true;
  }
  applyDataScopeDefaults(blank);   // 设了数据范围（比如 schema_version = 2）就替新交易填上，免得自己被筛掉
  const dateF = roleField("date");
  if (dateF && !blank[dateF.id]) {
    let latest = null;
    trades.forEach((t) => { if (!latest || (t._created_at || "") > (latest._created_at || "")) latest = t; });
    if (latest && latest[dateF.id]) blank[dateF.id] = latest[dateF.id];
  }
  editingTrade = blank; renderModal();
}
/* 改一笔老交易。上次没点保存就刷新 / 关掉了的话，把那次的改动接上（跟库里一样就当没有） */
function openTradeForEdit(id) {
  const t = trades.find((x) => x.id === id);
  if (!t) return;
  editingTrade = { ...t };
  const d = viewingUserId ? null : loadEditDraft(id);
  if (d) {
    const keys = schema.map((f) => f.id).concat([PB_KEY, PB_STAR_KEY, PB_TAGS_KEY, PB_NOTE_KEY]);
    const same = (a, b) => JSON.stringify(a === undefined ? "" : a) === JSON.stringify(b === undefined ? "" : b);
    if (keys.some((k) => !same(d[k], t[k]))) {
      keys.forEach((k) => { if (d[k] !== undefined) editingTrade[k] = d[k]; else delete editingTrade[k]; });
      editingTrade._resumedDraft = true;
    } else clearEditDraft();
  }
  renderModal();
}

/* ============================================================
   刷新后回到原处
   记在 sessionStorage（每个浏览器标签页各一份，关掉就没了）：在哪个页签、编辑器开着哪一页、交易表单开着哪一笔。
   刷新后数据加载完，按这个把页签切回去、把编辑器 / 表单重新打开；没存的内容靠各自的本地草稿接上
   （复盘 / 模型库页面见 openReviewEditor，交易见 startNewTrade / openTradeForEdit）。
   恢复之前不写：不然加载数据时那几次 render 会先把「主页」写进去，把要恢复的盖掉
   ============================================================ */
const NAV_KEY = "journal_nav";
const NAV_TABS = ["grid", "analytics", "calendar", "reviews", "playbook", "changelog", "settings", "admin"];
let navRestored = false;
function saveNav() {
  if (!navRestored || !session || viewingUserId || authLoading) return;
  const nav = {
    tab,
    doc: editingReview ? editingReview.id : null,
    trade: editingTrade ? { id: editingTrade.id, isNew: !!editingTrade._isNew } : null,
  };
  try { sessionStorage.setItem(NAV_KEY, JSON.stringify(nav)); } catch (e) {}
}
function restoreNav() {
  if (navRestored || !session) return;
  navRestored = true;
  let nav = null;
  try { nav = JSON.parse(sessionStorage.getItem(NAV_KEY) || "null"); } catch (e) {}
  if (!nav || viewingUserId) return;
  if (NAV_TABS.includes(nav.tab)) tab = nav.tab;
  if (nav.doc) {
    if (findDocById(nav.doc)) { editorBackStack = []; openReviewEditor(nav.doc); }
    else restoreNewReviewDraft(nav.doc);
  }
  if (nav.trade) {
    if (nav.trade.isNew) startNewTrade();
    else openTradeForEdit(nav.trade.id);
  }
}

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
  if (session && currentProfile && currentProfile.active !== false) restoreNav();
  sb.auth.onAuthStateChange(async (event, newSession) => {
    session = newSession; // keep session object current regardless of event type
    if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED" || event === "INITIAL_SESSION") return;
    if (session) {
      await loadProfile();
      if (currentProfile && currentProfile.active !== false) { await loadAll(); restoreNav(); }
    } else {
      currentProfile = null; trades = []; schema = defaultSchema(); adminUsers = null;
      pbPages = []; pbTriage = null; pbError = null;
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
  loadAppearance();
  applyLangAttr();
  await bootstrapAuth();
  render();
})();

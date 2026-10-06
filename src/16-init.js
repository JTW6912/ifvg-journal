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

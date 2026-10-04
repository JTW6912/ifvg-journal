/* ============================================================
   EVENT DELEGATION
   ============================================================ */
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  // 复盘编辑器的小弹框、格式栏的二级面板：点到浮层外面就收起来
  if (reviewTiptap && !e.target.closest("#reviewFloatRoot")) {
    if (reviewPop) closeReviewPop();
    if (bubbleMode !== "main") { bubbleMode = "main"; updateBubble(); }
  }
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
      [PB_KEY, PB_STAR_KEY].forEach((k) => { if (draft[k] !== undefined) blank[k] = draft[k]; });   // 模型库归属不是字段，单独带上
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
    const saved = await persistTrade(formDraft);
    if (saved) await pbApplyFormNotes(formDraft.id);   // 表单里勾的错题 / 待验证，交易存好了才写进去
    if (wasNew) clearDraft();
    editingTrade = null;
    if (returnToDayDetail) { dayDetailDate = returnToDayDetail; returnToDayDetail = null; }
    renderModal(); render();
  }
  else if (action === "ask-delete") { if (viewingUserId) return; confirmDeleteId = el.dataset.id; render(); }
  else if (action === "add-filter") {
    const ctx = filterCtxOf(el); if (!ctx) return;
    // data-parent-path 有值 = 加进那个分组，没有 = 加在顶层
    const list = filterChildListAt(ctx.arr, el.dataset.parentPath || "");
    if (!list) return;
    list.push(newFilterRow());
    afterFilterChange(ctx);
  }
  else if (action === "add-filter-group") {
    const ctx = filterCtxOf(el); if (!ctx) return;
    const parentPath = el.dataset.parentPath || "";
    if (filterPathDepth(parentPath) >= MAX_FILTER_GROUP_DEPTH) return;
    const list = filterChildListAt(ctx.arr, parentPath);
    if (!list) return;
    list.push(newFilterGroup("and"));
    // 分组默认折叠，但刚建出来的必须展开——否则点完"添加分组"屏幕上只多一行灰字，像没反应
    expandedFilterGroups.add(chipKey(ctxKeyOf(ctx), (parentPath ? parentPath + "." : "") + (list.length - 1)));
    afterFilterChange(ctx);
  }
  else if (action === "toggle-filter-group") {
    const key = el.dataset.chipKey;
    if (expandedFilterGroups.has(key)) expandedFilterGroups.delete(key); else expandedFilterGroups.add(key);
    render();
  }
  else if (action === "set-filter-group-op") {
    const ctx = filterCtxOf(el); if (!ctx) return;
    const g = filterNodeAt(ctx.arr, el.dataset.idx);
    if (!isFilterGroup(g)) return;
    g.op = el.dataset.op === "or" ? "or" : "and";
    afterFilterChange(ctx);
  }
  else if (action === "remove-filter") {
    const ctx = filterCtxOf(el); if (!ctx) return;
    const at = filterParentAt(ctx.arr, el.dataset.idx);
    if (!at) return;
    at.list.splice(at.index, 1);
    afterFilterChange(ctx);
  }
  else if (action === "toggle-filter-value") {
    const ctx = filterCtxOf(el); if (!ctx) return;
    const row = filterNodeAt(ctx.arr, el.dataset.idx);
    if (!row || isFilterGroup(row)) return;
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
    if (draft) {
      schema.forEach((f) => { if (draft[f.id] !== undefined) blank[f.id] = draft[f.id]; });
      [PB_KEY, PB_STAR_KEY].forEach((k) => { if (draft[k] !== undefined) blank[k] = draft[k]; });
      blank._resumedDraft = true;
    }
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
    focusCursor = 0;
    render();
  }
  else if (action === "set-card-size") {
    gridCardSize = el.dataset.size;
    if (!viewingUserId) { try { localStorage.setItem("journal_card_size", gridCardSize); } catch (e) {} }
    gridPage = 1;
    render();
  }
  /* ---------- 记录页：看图模式 ---------- */
  else if (action === "set-focus-height") {
    focusHeight = el.dataset.height;
    if (!viewingUserId) { try { localStorage.setItem("journal_focus_height", focusHeight); } catch (e) {} }
    applyFocusHeight();   // 只是改一个 CSS 变量，不用重渲染整页
  }
  else if (action === "set-focus-side") {
    focusSidePos = el.dataset.side;
    if (!viewingUserId) { try { localStorage.setItem("journal_focus_side", focusSidePos); } catch (e) {} }
    render();
  }
  else if (action === "toggle-focus-mask") {
    focusMasked = !focusMasked;
    focusRevealed = new Set();   // 重新盖上时把已揭晓的清空，不然再打开是一排已经翻好的牌
    render();
  }
  else if (action === "focus-reveal") { focusRevealed.add(el.dataset.id); render(); }
  else if (action === "toggle-focus-fields-picker") { focusFieldsPickerOpen = !focusFieldsPickerOpen; render(); }
  else if (action === "toggle-focus-field") {
    const id = el.dataset.id;
    await persistFocusFields(focusFields.includes(id) ? focusFields.filter((x) => x !== id) : [...focusFields, id]);
  }
  else if (action === "reset-focus-fields") { await persistFocusFields([]); }
  else if (action === "grid-prev-page") { gridPage--; focusCursor = 0; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  else if (action === "grid-next-page") { gridPage++; focusCursor = 0; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
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
      conditions: pruneFilterNodes(activeFilters),
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
    // 一键清空：只清每一行已选的值，字段行本身还留着，不删行。
    // ⚠ 要递归进分组，而且分组本身（op/negate/结构）必须原样保留——用户搭的逻辑不能被"清空值"顺手拆了
    const ctx = filterCtxOf(el); if (!ctx) return;
    (function clearValues(list) {
      for (let i = 0; i < list.length; i++) {
        if (isFilterGroup(list[i])) clearValues(list[i].children);
        else list[i] = newFilterRow(list[i].fieldId);
      }
    })(ctx.arr);
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
    c.conditions = pruneFilterNodes(analysisFilters);
    analysisComboDirty = false;
    await saveAnalysisPrefsNow(); render();
  }
  else if (action === "save-analysis-filters-as-combo") {
    if (viewingUserId) return;
    const c = normalizeCombo({
      id: newComboId(),
      name: T("combo.fromFilters", { date: new Date().toLocaleDateString(localeTag()) }),
      conditions: pruneFilterNodes(analysisFilters),
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
  else if (action === "set-bd-card-order") {
    breakdownCardOrder = el.dataset.mode === "manual" ? "manual" : "sig";
    saveBreakdownCardOrder(); render();
  }
  else if (action === "scroll-to-breakdown") {
    const target = document.getElementById("bd_" + el.dataset.id);
    if (target && target.scrollIntoView) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      // 跳过去之后闪一下，否则一屏十几张卡，用户不知道到底跳到哪张了
      target.classList.add("bdFlash");
      setTimeout(() => target.classList.remove("bdFlash"), 1200);
    }
  }
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
    analysisPrefs.minSample = BREAKDOWN_MIN_SAMPLE;
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
  else if (action === "new-review-in-group") {
    // 在分组里新建的默认「不关联周」：分组基本是给「常见错误 / 猜想」这类
    // 跟某一周无关的条目用的。顶部那个「写复盘」还是默认本周
    if (!viewingUserId) openNewReview({ groupId: el.dataset.groupId || "", weekStart: "", dayDate: "" });
  }
  else if (action === "add-review-group") {
    if (viewingUserId) return;
    reviewGroupModal = { mode: "new", id: null, name: "" };
    render();
  }
  else if (action === "rename-review-group") {
    if (viewingUserId) return;
    const g = findReviewGroup(el.dataset.groupId);
    if (g) { reviewGroupModal = { mode: "rename", id: g.id, name: g.name || "" }; render(); }
  }
  else if (action === "close-review-group-modal") { reviewGroupModal = null; render(); }
  else if (action === "dismiss-review-group-overlay") { if (e.target === el) { reviewGroupModal = null; render(); } }
  else if (action === "save-review-group-modal") {
    const input = document.getElementById("reviewGroupNameInput");
    const name = (input ? input.value : "").trim();
    if (!name) { if (input) input.focus(); return; }
    if (reviewGroupModal && reviewGroupModal.mode === "rename") renameReviewGroup(reviewGroupModal.id, name);
    else addReviewGroup(name);
    reviewGroupModal = null;
    render();
  }
  else if (action === "ask-delete-review-group") { reviewGroupConfirmDeleteId = el.dataset.groupId; render(); }
  else if (action === "cancel-delete-review-group") { reviewGroupConfirmDeleteId = null; render(); }
  else if (action === "confirm-delete-review-group") {
    reviewGroupConfirmDeleteId = null;
    await removeReviewGroup(el.dataset.groupId);
    render();
  }
  else if (action === "toggle-review-group-collapse") {
    const key = reviewGroupCollapseKey(el.dataset.gid);
    if (collapsedReviewGroups.has(key)) collapsedReviewGroups.delete(key); else collapsedReviewGroups.add(key);
    saveCollapsedReviewGroups();
    render();
  }
  else if (action === "open-review") { openReviewEditor(el.dataset.id); }
  else if (action === "close-review-editor") { await closeReviewEditor(); }
  else if (action === "review-outline-toggle") { toggleReviewOutline(); }
  else if (action === "review-outline-go") { reviewOutlineGo(+el.dataset.idx); }
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
  else if (action === "rv-mark") {
    const ed = reviewTiptap;
    if (!ed) return;
    const cmd = el.dataset.cmd;
    const c = ed.chain().focus();
    if (cmd === "bold") c.toggleBold().run();
    else if (cmd === "italic") c.toggleItalic().run();
    else if (cmd === "strike") c.toggleStrike().run();
    else if (cmd === "code") c.toggleCode().run();
    else if (cmd === "h1") c.toggleHeading({ level: 1 }).run();
    else if (cmd === "h2") c.toggleHeading({ level: 2 }).run();
  }
  else if (action === "rv-bubble") {
    if (el.dataset.mode === "link") { openLinkEditor(); return; }
    bubbleMode = bubbleMode === el.dataset.mode ? "main" : el.dataset.mode;
    updateBubble();
  }
  else if (action === "rv-color") { applyReviewColor(el.dataset.color || ""); }
  else if (action === "rv-link-apply") { applyLinkFromBubble(); }
  else if (action === "rv-link-open") {
    const u = reviewTiptap && mdSafeUrl((reviewTiptap.getAttributes("link") || {}).href);
    if (u) window.open(u, "_blank", "noopener,noreferrer");
  }
  else if (action === "rv-link-remove") {
    if (!reviewTiptap) return;
    bubbleMode = "main";
    reviewTiptap.chain().focus().extendMarkRange("link").unsetLink().run();
  }
  else if (action === "rv-table") {
    const ed = reviewTiptap;
    if (!ed) return;
    const c = ed.chain().focus();
    const op = el.dataset.op;
    if (op === "addRow") c.addRowAfter().run();
    else if (op === "addCol") c.addColumnAfter().run();
    else if (op === "delRow") c.deleteRow().run();
    else if (op === "delCol") c.deleteColumn().run();
    else if (op === "delTable") c.deleteTable().run();
  }
  else if (action === "rv-pop-apply") { applyReviewPop(); }
  else if (action === "slash-pick") {
    const item = SLASH_ITEMS.find((i) => i.cmd === el.dataset.cmd);
    if (item) applySlashItem(item);
  }
  else if (action === "review-period") {
    if (!editingReview || reviewIsReadOnly()) return;
    // 日和周互斥：切过去就把另一边清掉，免得两个都填着，显示和筛选说不清
    const kind = el.dataset.kind;
    if (kind === "day") {
      editingReview.week_start = "";
      if (!editingReview.day_date) editingReview.day_date = todayStr();
    } else if (kind === "week") {
      editingReview.day_date = "";
      if (!editingReview.week_start) editingReview.week_start = thisMondayStr();
    } else {
      editingReview.day_date = ""; editingReview.week_start = "";
    }
    scheduleReviewSave();
    refreshReviewWeekRow();
  }
  else if (action === "review-day") {
    if (!editingReview || reviewIsReadOnly()) return;
    editingReview.week_start = "";
    editingReview.day_date = el.dataset.day === "yesterday" ? yesterdayStr() : todayStr();
    scheduleReviewSave();
    refreshReviewWeekRow();
  }
  else if (action === "review-week") {
    if (!editingReview || reviewIsReadOnly()) return;
    const w = el.dataset.week;
    editingReview.day_date = "";
    editingReview.week_start = w === "this" ? thisMondayStr() : w === "last" ? lastMondayStr() : "";
    scheduleReviewSave();
    refreshReviewWeekRow();
  }
  else if (action === "close-trade-picker") {
    if (el.classList.contains("tradePickerOverlay") && e.target !== el) return;  // 点内容不关闭（不能用 stopPropagation）
    closeTradePicker();
  }
  else if (action === "pick-trade") { insertTradeRef(el.dataset.id); }
  else if (action === "close-page-picker") {
    if (el.classList.contains("tradePickerOverlay") && e.target !== el) return;  // 点内容不关闭（不能用 stopPropagation）
    closePagePicker();
  }
  else if (action === "pick-page") { insertPageRef(el.dataset.id); }
  /* ---------- 模型库 ---------- */
  else if (action === "open-page-ref" || action === "pb-open") {
    const id = el.dataset.id;
    // 从交易预览里点的：预览是盖在编辑器上面的弹层，先收掉，不然新打开的页面被它挡着
    if (tradePreviewId) { tradePreviewId = null; renderSecondaryModals(true); }
    await pbOpenDoc(id);
  }
  else if (action === "editor-back") {
    const id = editorBackStack.pop();
    if (id && findDocById(id)) await navigateEditorTo(id, { back: true });
    else refreshPbPanels();
  }
  else if (action === "pb-home") {
    await closeReviewEditor();
    tab = "playbook"; pbTriage = null;
    render();
  }
  else if (action === "pb-new") {
    if (viewingUserId) return;
    pbNameModal = { kind: el.dataset.kind, parentId: el.dataset.parent || null, name: "", from: el.dataset.from || "" };
    renderSecondaryModals(true);
  }
  else if (action === "close-pb-name-modal") { pbNameModal = null; renderSecondaryModals(true); }
  else if (action === "dismiss-pb-name-overlay") { if (e.target === el) { pbNameModal = null; renderSecondaryModals(true); } }
  else if (action === "save-pb-name-modal") {
    const m = pbNameModal;
    const input = document.getElementById("pbNameInput");
    const name = (input ? input.value : "").trim();
    if (!m || !name) { if (input) input.focus(); return; }
    pbNameModal = null;
    renderSecondaryModals(true);
    const p = await pbCreatePage(m.kind, m.parentId, name);
    if (!p) { render(); refreshPbPanels(); return; }
    if (m.from === "triage" && pbTriage) {
      // 归类时现建的系统：顺手把眼前这一笔归进去，然后接着归类，不跳去编辑页面
      const t = pbTriageCurrent();
      if (t && !pbIsNote(p)) await pbTriageAssign(p.id);
      render();
      return;
    }
    render();
    await pbOpenDoc(p.id);
  }
  else if (action === "pb-ask-delete") { pbConfirmDeleteId = el.dataset.id; refreshReviewWeekRow(); }
  else if (action === "pb-cancel-delete") { pbConfirmDeleteId = null; refreshReviewWeekRow(); }
  else if (action === "pb-confirm-delete") {
    const id = el.dataset.id;
    const p = pbFind(id);
    pbConfirmDeleteId = null;
    if (!p) return;
    const up = pbIsNote(p) ? pbNoteOwner(p) : pbFind(p.parent_id);
    const ok = await deletePbPage(id);
    if (!ok) { reviewSaveError = pbError; updateReviewSaveBadge(); refreshReviewWeekRow(); return; }
    if (editingReview && editingReview.id === id) {
      // 删的就是开着的这一页：不保存直接关，回到上一层（没有上一层就回模型库）
      clearTimeout(reviewSaveTimer); reviewSaveTimer = null;
      reviewSaveState = "idle"; clearReviewDraft();
      editorBackStack = editorBackStack.filter((x) => x !== id && findDocById(x));
      editingReview = null; reviewEditorRenderedFor = null;
      if (up && findDocById(up.id)) openReviewEditor(up.id);
      else { renderReviewEditor(); tab = "playbook"; }
    }
    render();
  }
  else if (action === "pb-star") { await pbToggleStar(el.dataset.id); }
  else if (action === "pb-show-all-trades") { pbShowAllTrades = true; refreshPbPanels(); }
  else if (action === "pb-mistake-filter") { pbMistakeFilter = el.dataset.val || "all"; render(); }
  else if (action === "pb-verify-filter") { pbVerifyFilter = el.dataset.val || "all"; render(); }
  else if (action === "pb-verify-status") {
    // 待验证的状态：走编辑器那套自动保存，属性行和下面的面板跟着换
    if (!editingReview || editingReview.kind !== "verify" || reviewIsReadOnly()) return;
    if (!PB_VERIFY_STATUSES.includes(el.dataset.status)) return;
    editingReview.status = el.dataset.status;
    scheduleReviewSave();
    refreshReviewWeekRow();
    await flushReviewSave();
    refreshPbPanels();
  }
  else if (action === "pb-verify-promote") { await pbPromoteVerify(); }
  else if (action === "pb-triage-start") {
    if (editingReview) await closeReviewEditor();
    tab = "playbook";
    startPbTriage(el.dataset.scope);
    render();
  }
  else if (action === "pb-triage-exit") { pbTriage = null; render(); }
  else if (action === "pb-triage-scope") { startPbTriage(el.dataset.scope); render(); }
  else if (action === "pb-triage-assign") { await pbTriageAssign(el.dataset.id); }
  else if (action === "pb-triage-star") { await pbTriageStar(); }
  else if (action === "pb-triage-panel") { pbTriageOpenPanel(el.dataset.kind); }
  else if (action === "pb-triage-toggle-note") { await pbTriageToggleNote(el.dataset.id); }
  else if (action === "pb-triage-new-note") { await pbTriageNewNote(el.dataset.kind); }
  else if (action === "pb-triage-prev") { pbTriageStep(-1); }
  else if (action === "pb-triage-next") { pbTriageStep(1); }
  else if (action === "pb-form-star") {
    if (!editingTrade) return;
    if (formDraft[PB_STAR_KEY]) delete formDraft[PB_STAR_KEY]; else formDraft[PB_STAR_KEY] = true;
    refreshPbFormBlock(); saveDraft();
  }
  else if (action === "pb-form-note") { pbFormNoteToggle(el.dataset.id); }
  else if (action === "pb-form-notes-more") {
    const st = pbFormNotesState();
    if (st) { st.showAll[el.dataset.kind] = true; refreshPbFormBlock(); }
  }
  else if (action === "pb-form-note-new") {
    const st = pbFormNotesState();
    if (!st || viewingUserId) return;
    st.creating = el.dataset.kind === "verify" ? "verify" : "mistake";
    st.newName = "";
    refreshPbFormBlock();
    const inp = document.getElementById("pbFormNewName");
    if (inp) inp.focus();
  }
  else if (action === "pb-form-note-cancel") {
    const st = pbFormNotesState();
    if (st) { st.creating = ""; st.newName = ""; refreshPbFormBlock(); }
  }
  else if (action === "pb-form-note-create") { await pbFormNoteCreate(); }
  else if (action === "pb-form-suggest") {
    if (!editingTrade) return;
    formDraft[PB_KEY] = el.dataset.id;
    refreshPbFormBlock(); saveDraft();
  }
  else if (action === "open-trade-ref") {
    // 只读预览，不是编辑表单：看复盘时是在读，一点就弹一堆输入框既容易误改也太重
    tradePreviewId = el.dataset.id;
    renderSecondaryModals(true);
  }
  else if (action === "close-trade-preview") {
    if (el.classList.contains("overlay") && e.target !== el) return;   // 点内容不关闭（不能用 stopPropagation）
    tradePreviewId = null;
    renderSecondaryModals(true);
  }
  else if (action === "edit-trade-from-preview") {
    if (viewingUserId) return;
    const t = trades.find((x) => x.id === el.dataset.id);
    tradePreviewId = null;
    renderSecondaryModals(true);
    if (t) { editingTrade = { ...t }; renderModal(true); }
  }
  else if (action === "preview-image") { openLightbox(el, el.dataset.url); }
  else if (action === "close-lightbox") { closeLightbox(); }
  else if (action === "lightbox-prev") { stepLightbox(-1); }
  else if (action === "lightbox-next") { stepLightbox(1); }
  else if (action === "logout") { userMenuOpen = false; await doLogout(); }
  else if (action === "set-record-mode") {
    if (recordMode === el.dataset.mode) return;
    recordMode = el.dataset.mode;
    // 复盘现在回测/实盘各有一套，页签两边都在，不用再踢人；
    // 但要把编辑器和分组的临时状态收干净，免得把实盘那篇的编辑器留在回测页面上
    if (editingReview) { flushReviewSave(); editingReview = null; reviewEditorRenderedFor = null; renderReviewEditor(); }
    flushReviewPrefs();
    reviewSearch = ""; reviewConfirmDeleteId = null; reviewGroupConfirmDeleteId = null; reviewGroupModal = null;
    pbTriage = null;   // 归类只在实盘模式下做，队列是那一批交易拍下来的
    if (!viewingUserId) { try { localStorage.setItem("journal_record_mode", recordMode); } catch (e) {} }
    if (recordMode === "live") {
      const now = new Date();
      calendarYear = now.getFullYear();
      calendarMonth = now.getMonth() + 1;
    }
    await reloadModeData(); render();
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
    pbTriage = null; pbNameModal = null;
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
    pbTriage = null;
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
    // 模型标签一变，模型库那一栏的「建议归到哪」跟着变
    if (field && field.role === "model") refreshPbFormBlock();
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
  else if (action === "toggle-field-hidden") {
    const id = el.dataset.id;
    const f = schema.find((x) => x.id === id);
    if (!f) return;
    // 停用日期/结果/R 会让所有统计从下一笔开始失真，确认一次再走；恢复显示不用问
    if (!f.hidden && CORE_ROLES.includes(f.role) && !confirm(T("settings.confirmHideCore", { label: f.label }))) return;
    await persistSchema(schema.map((x) => {
      if (x.id !== id) return x;
      const next = { ...x };
      if (x.hidden) delete next.hidden; else next.hidden = true;   // 恢复时把键删掉，别留一堆 hidden:false
      return next;
    }));
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
  else if (e.target.dataset.action === "pb-search-input") {
    pbSearch = e.target.value;
    const caret = e.target.selectionStart;
    render();
    const el = document.querySelector('[data-action="pb-search-input"]');
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
  if (e.target.dataset.pbFormPick !== undefined) {
    if (!editingTrade || viewingUserId) return;
    const v = e.target.value;
    if (v) formDraft[PB_KEY] = v; else delete formDraft[PB_KEY];
    if (!v || v === PB_NONE) delete formDraft[PB_STAR_KEY];   // 关注是相对某一页说的，没归到页面就谈不上
    refreshPbFormBlock();
    saveDraft();
    return;
  }
  if (e.target.dataset.pbParent !== undefined) {
    // 模型库页面的属性行：策略换系统 / 错题换归属。走编辑器那套自动保存
    if (!editingReview || !isPbDoc(editingReview) || reviewIsReadOnly()) return;
    editingReview.parent_id = e.target.value || null;
    scheduleReviewSave();
    await flushReviewSave();
    refreshPbPanels();
    return;
  }
  if (e.target.dataset.reviewWeekDate !== undefined) {
    if (!editingReview || reviewIsReadOnly()) return;
    // 随手挑的日子归到那一周的周一——week_start 这个名字要求它就是周一
    editingReview.week_start = mondayOfStr(e.target.value);
    editingReview.day_date = "";
    scheduleReviewSave();
    refreshReviewWeekRow();
    return;
  }
  if (e.target.dataset.reviewDayDate !== undefined) {
    if (!editingReview || reviewIsReadOnly()) return;
    editingReview.day_date = e.target.value || "";
    editingReview.week_start = "";
    scheduleReviewSave();
    refreshReviewWeekRow();
    return;
  }
  if (e.target.dataset.bind === "breakdown-sort") {
    const v = e.target.value;
    breakdownSort = BREAKDOWN_SORTS.includes(v) ? v : "sig_r";
    try { localStorage.setItem("journal_breakdown_sort", breakdownSort); } catch (err) {}
    render();
  }
  else if (e.target.dataset.bind === "min-sample") {
    if (viewingUserId) return;
    analysisPrefs.minSample = sanitizeMinSample(e.target.value);
    await saveAnalysisPrefsNow(); render();
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
    // 换字段 = 整行重置，所以要按路径写回父数组的那一位，不能只改节点上的字段
    const at = filterParentAt(ctx.arr, e.target.dataset.filterField);
    if (!at) return;
    at.list[at.index] = newFilterRow(e.target.value);
    afterFilterChange(ctx);
  }
  else if (e.target.dataset.filterRange !== undefined) {
    const ctx = filterCtxOf(e.target); if (!ctx) return;
    const row = filterNodeAt(ctx.arr, e.target.dataset.filterRange);
    if (!row || isFilterGroup(row)) return;
    const val = e.target.dataset.timeInput !== undefined ? normalizeTimeValue(e.target.value) : e.target.value;
    if (e.target.dataset.bound === "start") row.rangeStart = val; else row.rangeEnd = val;
    afterFilterChange(ctx);
  }
  else if (e.target.dataset.filterText !== undefined) {
    const ctx = filterCtxOf(e.target); if (!ctx) return;
    const row = filterNodeAt(ctx.arr, e.target.dataset.filterText);
    if (!row || isFilterGroup(row)) return;
    row.textValue = e.target.value;
    afterFilterChange(ctx);
  }
  else if (e.target.dataset.action === "toggle-filter-negate") {
    const ctx = filterCtxOf(e.target); if (!ctx) return;
    const row = filterNodeAt(ctx.arr, e.target.dataset.idx);
    if (!row || isFilterGroup(row)) return;
    row.negate = e.target.checked;
    afterFilterChange(ctx);
  }
  else if (e.target.dataset.action === "toggle-filter-group-negate") {
    const ctx = filterCtxOf(e.target); if (!ctx) return;
    const g = filterNodeAt(ctx.arr, e.target.dataset.idx);
    if (!isFilterGroup(g)) return;
    g.negate = e.target.checked;
    afterFilterChange(ctx);
  }
  else if (e.target.dataset.action === "toggle-filter-and") {
    const ctx = filterCtxOf(e.target); if (!ctx) return;
    const row = filterNodeAt(ctx.arr, e.target.dataset.idx);
    if (!row || isFilterGroup(row)) return;
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
const DRAGGABLES = '.filterRow[draggable="true"], .tagChip[draggable="true"], .comboCard[draggable="true"], .bdRow[draggable="true"], .breakdownCard[draggable="true"], .settingsRow[draggable="true"], .comboGroupHeader[draggable="true"], .reviewCard[draggable="true"], .reviewGroupHeader[draggable="true"]';

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
    dragFilterIdx = row.dataset.filterIdx;   // 现在是路径字符串（"2"），不再是下标数字
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
  const reviewCard = e.target.closest('.reviewCard[draggable="true"]');
  if (reviewCard) {
    dragReviewId = reviewCard.dataset.reviewId;
    e.dataTransfer.effectAllowed = "move";
    reviewCard.style.opacity = "0.4";
    return;
  }
  const reviewGroupHeader = e.target.closest('.reviewGroupHeader[draggable="true"]');
  if (reviewGroupHeader) {
    dragReviewGroupId = reviewGroupHeader.dataset.groupId;
    e.dataTransfer.effectAllowed = "move";
    reviewGroupHeader.style.opacity = "0.4";
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
  if (!target && (dragComboId !== null || dragReviewId !== null)) target = e.target.closest('[data-group-drop]');
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
    const targetPath = row.dataset.filterIdx;
    // 只允许同一个父级下换位。跨层拖拽（拖进/拖出分组）的语义说不清楚——
    // "拖到分组标题上"到底是塞进去还是插在它前面，怎么定都会有人拖错，所以干脆不接
    if (targetPath !== dragFilterIdx && filterPathParentKey(targetPath) === filterPathParentKey(dragFilterIdx)) {
      const from = filterParentAt(activeFilters, dragFilterIdx);
      const to = filterParentAt(activeFilters, targetPath);
      if (from && to && from.list === to.list) {
        const [moved] = from.list.splice(from.index, 1);
        to.list.splice(to.index, 0, moved);
        saveActiveFilters();
        render();
      }
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
  if (dragReviewId !== null) {
    const id = dragReviewId;
    dragReviewId = null;
    // 先看是不是落在另一张卡片上：那是「插到它前面」，同桶就是重排，跨桶就是连搬带插
    const targetCard = e.target.closest('.reviewCard[draggable="true"]');
    if (targetCard && targetCard.dataset.reviewId !== id) {
      e.preventDefault();
      reorderReviewInBucket(id, targetCard.dataset.reviewId).then(render);
      return;
    }
    // 落在某个分组区块的空白处：只改归属，排到该组末尾
    const dropZone = e.target.closest('[data-group-drop]');
    if (dropZone) {
      e.preventDefault();
      const gid = dropZone.dataset.groupDrop === "__ungrouped__" ? "" : dropZone.dataset.groupDrop;
      const r = reviews.find((x) => x.id === id);
      if (r && reviewEffectiveGroupId(r) !== gid) moveReviewsToGroup([id], gid).then(render);
    }
    return;
  }
  if (dragReviewGroupId !== null) {
    const targetHeader = e.target.closest('.reviewGroupHeader[draggable="true"]');
    if (targetHeader && targetHeader.dataset.groupId !== dragReviewGroupId) {
      e.preventDefault();
      moveReviewGroup(dragReviewGroupId, targetHeader.dataset.groupId);
      render();
    }
    dragReviewGroupId = null;
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
      // 拖这个动作本身就表达了「我要自己排」。还停在「按显著性」的话，
      // 用户辛苦拖完顺序、关掉设置面板一看卡片纹丝不动，会以为拖拽坏了
      if (breakdownCardOrder !== "manual") { breakdownCardOrder = "manual"; saveBreakdownCardOrder(); }
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
window.addEventListener("beforeunload", () => { flushAnalysisPrefs(); flushReviewPrefs(); });

/* 看图模式的 J/K · ↑/↓ 翻笔。
   排在 Escape 那一串前面，但自己先把所有"正在输入/有弹层"的情况让开：
   记录页搜索框里打个 "j" 要能打出 j 来，弹窗开着时方向键归弹窗管 */
function focusKeyNav(e) {
  if (tab !== "grid" || gridViewMode !== "focus") return false;
  if (lightboxUrl || editingTrade || editingReview || dayDetailDate || profileModalOpen) return false;
  const t = e.target;
  if (t && (t.matches("input, textarea, select") || t.isContentEditable)) return false;
  if (e.ctrlKey || e.metaKey || e.altKey) return false;

  let delta = 0;
  if (e.key === "j" || e.key === "ArrowDown") delta = 1;
  else if (e.key === "k" || e.key === "ArrowUp") delta = -1;
  else return false;

  const rows = document.querySelectorAll("[data-focus-row]");
  if (!rows.length) return false;
  e.preventDefault();
  const next = Math.max(0, Math.min(rows.length - 1, focusCursor + delta));
  if (next === focusCursor) return true;   // 已经在头/尾，别白渲染一次
  setFocusCursor(next, "smooth");
  return true;
}
/* 看图模式挪到第 i 行并对齐到行首。J/K 和看大图时的 ←/→ 共用。
   只更新 class 和序号条，不重渲染整页——重渲染会把所有 <img> 拆了重建，滚动中途图会闪 */
function setFocusCursor(i, behavior) {
  const rows = document.querySelectorAll("[data-focus-row]");
  if (!rows[i]) return;
  focusCursor = i;
  rows.forEach((r, k) => r.classList.toggle("isCurrent", k === focusCursor));
  rows[focusCursor].scrollIntoView({ behavior: behavior || "auto", block: "start" });
  const bar = document.querySelector(".focusIndex");
  if (bar) bar.textContent = T("focus.position", { cur: focusCursor + 1, total: rows.length, n: focusIndexTotal }) + " · " + T("focus.navHint");
}

/* 看大图时 ←/→ 翻上一张/下一张。用捕获阶段抢在最前面：
   复盘编辑器里双击图片打开灯箱时，焦点还在编辑器里，不拦的话方向键会先去挪编辑器的光标 */
document.addEventListener("keydown", (e) => {
  if (!lightboxUrl || e.isComposing) return;
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  e.stopPropagation();
  stepLightbox(e.key === "ArrowRight" ? 1 : -1);
}, true);

document.addEventListener("keydown", (e) => {
  if (focusKeyNav(e)) return;
  if (pbTriageKey(e)) return;
  if (e.key !== "Escape") return;
  if (lightboxUrl) { closeLightbox(); return; }
  if (pbNameModal) { pbNameModal = null; renderSecondaryModals(true); return; }
  if (pagePickerOpen) { closePagePicker(); return; }
  // 复盘编辑器这几层要排在交易弹窗前面：插入菜单 → 交易选择器，
  // 都关掉了才轮到编辑器本身（编辑器自己排在 editingTrade 后面，见下面）
  if (reviewPop) { closeReviewPop(true); return; }
  if (slashMenu) { closeSlashMenu(true); return; }
  if (reviewTiptap && bubbleMode !== "main") { bubbleMode = "main"; updateBubble(); if (reviewTiptap) reviewTiptap.commands.focus(); return; }
  if (tradePickerOpen) { closeTradePicker(); return; }
  if (closeReviewOutlinePop()) return;
  if (tradePreviewId) { tradePreviewId = null; renderSecondaryModals(true); return; }
  if (comboGroupModal) { comboGroupModal = null; render(); return; }
  if (profileModalOpen) { profileModalOpen = false; render(); return; }
  if (editingTrade) {
    editingTrade = null;
    if (returnToDayDetail) { dayDetailDate = returnToDayDetail; returnToDayDetail = null; }
    renderModal(); render();
    return;
  }
  if (reviewGroupModal) { reviewGroupModal = null; render(); return; }
  if (editingReview) { closeReviewEditor(); return; }
  if (dayDetailDate) { dayDetailDate = null; render(); return; }
  if (tab === "playbook" && pbTriage) { pbTriage = null; render(); return; }
});

/* 复盘是长文，debounce 那一秒里关掉标签页就丢了。localStorage 那份草稿能兜底，
   但还是先拦一下，让用户自己决定。 */
window.addEventListener("beforeunload", (e) => {
  if (!editingReview || viewingUserId) return;
  if (syncReviewBody()) saveReviewDraft();   // 正文是停手 300ms 才转 markdown 的，草稿先补上最后几下
  flushReviewFolds();                        // 尽力而为：页面关掉时请求不一定发得出去
  if (reviewSaveState !== "dirty" && reviewSaveState !== "saving") return;
  e.preventDefault();
  e.returnValue = "";
});


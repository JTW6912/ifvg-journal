/* ============================================================
   RENDER — ANALYTICS VIEW
   ============================================================ */
/* 「强信号」徽章只发给过了 BH FDR 的行。
   ⚠️ 刻意不显示 p 值、也不用「显著」当结论词：这个分数的用途是**排序**，不是下结论。
   50 个组合里纯随机就有 ~2.5 个能达到 p<0.05，把 p 值摆出来只会让用户把噪音当证据。 */
function strongTagHtml(row) {
  if (!row.sig || !row.sig.strong) return "";
  const m = sigMetric();
  const d = m === "sig_wr" ? row.sig.dWr : row.sig.dR;
  const up = d !== null && d !== undefined && d > 0;
  const detail = m === "sig_wr"
    ? T("breakdown.strongTitleWr", { d: (d >= 0 ? "+" : "") + (d || 0).toFixed(1) })
    : T("breakdown.strongTitleR", { d: (d >= 0 ? "+" : "") + (d || 0).toFixed(2) });
  return ` <span class="bdStrongTag ${up ? "up" : "down"}" title="${esc(detail)}">${esc(T(up ? "breakdown.strongUp" : "breakdown.strongDown"))}</span>`;
}
// baseWr = 这一批交易的整体胜率。传了就在每行右边标出「相对整体 +9.2pp」——
// 拆解真正有信息量的是差值，绝对胜率高往往只是因为整批本来就高
function barRow(row, fieldId, baseWr) {
  const low = row.n < currentMinSample();
  const width = row.wr === null || low ? 0 : row.wr;
  const color = row.wr === null ? "var(--mutedDark)" : row.wr >= 60 ? "var(--pos)" : row.wr >= 45 ? "var(--accent)" : "var(--neg)";
  const rPart = row.hasR
    ? ` · <span style="color:${row.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(row.totalR)}R</span> · EV ${fmtNum(row.ev, 2)} · PF <span style="color:${pfColor(row.pf)}">${fmtPF(row.pf)}</span>`
    : "";
  const delta = !low && baseWr !== undefined && baseWr !== null && row.wr !== null ? " " + deltaText(row.wr, baseWr, "pp", 1) : "";
  return `<div class="barRow${low ? " lowSample" : ""}">
    <div class="barTop">
      <span style="color:var(--text)">${esc(row.value)}${low ? ` <span class="lowSampleTag" title="${esc(T("breakdown.lowSampleTitle", { n: currentMinSample() }))}">${esc(T("breakdown.lowSample"))}</span>` : ""}${strongTagHtml(row)}</span>
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
  const activeCount = countFilterConditions(analysisFilters);
  const combo = analysisComboId ? findCombo(analysisComboId) : null;
  const presets = ["taken", "he"].map(analysisQuickPreset).filter(Boolean);
  let html = `<div class="filterPanel${analysisPanelOpen ? " open" : ""}">
    <button class="filterPanelHead" data-action="toggle-analysis-panel">
      ${ICONS.filter}
      <span class="filterPanelTitle">${T("ascope.title")}</span>
      ${activeCount
        ? `<span class="filterPanelBadge">${esc(T("filter.activeCount", { n: activeCount }))}</span>`
        : `<span class="filterPanelBadge off">${T("ascope.noFilter")}</span>`}
      ${filterPanelChainHtml(scopedTrades().length, stats.total, activeCount > 0, T("ascope.chainTitle"))}
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
      <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:10px;line-height:1.7;">${T("filter.logicHint")}<br>${T("filter.groupHint")}</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;width:100%;">
        ${filterNodeListHtml(analysisFilters, ANALYSIS_CTX)}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center;">
        <button class="btn" data-action="add-filter" data-filter-ctx="${ANALYSIS_CTX}">${ICONS.plus} ${T("filter.addCondition")}</button>
        <button class="btn" data-action="add-filter-group" data-filter-ctx="${ANALYSIS_CTX}">${ICONS.plus} ${T("filter.addGroup")}</button>
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
      ${filterNodeListHtml(combo.conditions, combo.id)}
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn" data-action="add-filter" data-combo-id="${esc(combo.id)}">${ICONS.plus} ${T("combo.addCondition")}</button>
      <button class="btn" data-action="add-filter-group" data-combo-id="${esc(combo.id)}">${ICONS.plus} ${T("filter.addGroup")}</button>
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
      <span class="sectionLabel" style="margin:0;"><span class="bk">⟦ </span>${esc(label)}<span class="bk"> ⟧</span></span>
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
    html += `<div class="emptyHint" style="font-size:12.5px;color:var(--mutedDark);border:1px dashed var(--border);border-radius:10px;padding:16px;margin-bottom:26px;line-height:1.7;">
      ${T("combos.emptyIntro")}
    </div>`;
    return html;
  }
  if (!combos.length && !viewingUserId) {
    html += `<div class="emptyHint" style="font-size:12.5px;color:var(--mutedDark);border:1px dashed var(--border);border-radius:10px;padding:14px 16px;margin-bottom:16px;line-height:1.7;">
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

/* ---------- 分析页：重点发现 ----------
   跨所有字段所有值，按 |z| / |t| 取最高的几条摆在拆解区最上面，点一条直接跳到对应的拆解卡。
   ⚠️ 底下那句「检验了 N 个组合、预计 ~X 个是随机波动」不是免责套话，是这个功能的必要组成：
   50 个组合按 p<0.05 纯随机就有 ~2.5 个达标，不写这句用户会把第一条当成已验证的结论。 */
function renderTopFindings(breakdowns) {
  const top = topFindings(breakdowns);
  if (!top.length) return "";
  const { tested, expectedFalse } = findingsTestCount(breakdowns);
  const rows = top.map((f) => {
    const m = f.metric;
    const d = m === "sig_wr" ? f.row.sig.dWr : f.row.sig.dR;
    const up = d > 0;
    const diff = m === "sig_wr"
      ? T("finding.diffWr", { d: (d >= 0 ? "+" : "") + d.toFixed(1) })
      : T("finding.diffR", { d: (d >= 0 ? "+" : "") + d.toFixed(2) });
    const metricText = m === "sig_wr" ? fmtPct(f.row.wr) : (f.row.hasR ? T("finding.ev", { v: fmtNum(f.row.ev, 2) }) : "—");
    return `<button class="findingRow" data-action="scroll-to-breakdown" data-id="${esc(f.field.id)}" title="${esc(T("finding.jump", { label: f.field.label }))}">
      <span class="findingDir ${up ? "up" : "down"}">${up ? "▲" : "▼"}</span>
      <span class="findingWhat"><b>${esc(f.field.label)}</b> = ${esc(f.row.value)}</span>
      <span class="findingMeta mono">${T("finding.n", { n: f.row.n })} · ${metricText}</span>
      <span class="findingDiff mono ${up ? "up" : "down"}">${esc(diff)}</span>
      ${f.row.sig.strong ? `<span class="bdStrongTag ${up ? "up" : "down"}">${esc(T("breakdown.strongTag"))}</span>` : ""}
    </button>`;
  }).join("");
  return `<div class="findingsBox">
    <div class="findingsHead">
      <span class="sectionLabel" style="margin:0;"><span class="bk">⟦ </span>${esc(T("finding.title"))}<span class="bk"> ⟧</span></span>
      <span style="font-size:11.5px;color:var(--mutedDark);">${esc(T(sigMetric() === "sig_wr" ? "finding.basisWr" : "finding.basisR"))}</span>
    </div>
    ${rows}
    <div class="findingsNote">${esc(T("finding.caution", { n: tested, k: expectedFalse }))}</div>
  </div>`;
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
    <div style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px;">
      <div style="font-size:11.5px;color:var(--mutedDark);margin-bottom:8px;">${T("breakdown.minSampleHint")}</div>
      <input type="number" min="1" max="999" step="1" class="input mono" data-bind="min-sample" value="${currentMinSample()}" style="font-size:12.5px;max-width:120px;" />
      <div style="font-size:11px;color:var(--mutedDark);margin-top:6px;line-height:1.6;">${T("breakdown.minSampleNote", { n: currentMinSample() })}</div>
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
/* ---------- 月度页：近期表现（函数留在这里是因为它沿用拆解那套阈值和样式零件） ----------
   四格一行：最近 3 / 7 / 30 天 + 当前范围全体（基准）。前三格的胜率右边标相对基准的差值。
   n 少的时候胜率会剧烈跳动（3 笔里 2 胜 = 66.7%，纯噪音），所以沿用拆解那套阈值：
   n < BREAKDOWN_MIN_SAMPLE 的格子降透明度并标「样本少」，不让它看起来跟 n=80 那格一样有说服力。 */
function renderRecentPanel(stats) {
  const rows = recentWindowStats(stats.list);
  const cell = (label, s, isBase) => {
    const low = !isBase && s.n > 0 && s.n < currentMinSample();
    const delta = !isBase && !low && s.wr !== null && stats.wr !== null ? " " + deltaText(s.wr, stats.wr, "pp", 1) : "";
    return `<div class="recentBox${isBase ? " recentBase" : ""}${low ? " lowSample" : ""}">
      <div class="recentLabel">${esc(label)}${low ? ` <span class="lowSampleTag" title="${esc(T("breakdown.lowSampleTitle", { n: currentMinSample() }))}">${esc(T("breakdown.lowSample"))}</span>` : ""}</div>
      <div class="recentWr" style="color:${s.wr === null ? "var(--mutedDark)" : "var(--accent)"}">${fmtPct(s.wr)}${delta}</div>
      <div class="recentMeta mono">n=${s.n} · W${s.w} L${s.l}${s.be ? " BE" + s.be : ""}</div>
      ${s.hasR ? `<div class="recentMeta mono"><span style="color:${s.totalR >= 0 ? "var(--pos)" : "var(--neg)"}">${fmtNum(s.totalR)}R</span> · EV ${fmtNum(s.ev, 2)}</div>` : ""}
    </div>`;
  };
  return `<div class="recentPanel">
    <div class="recentHead">
      <span class="sectionLabel" style="margin:0;"><span class="bk">⟦ </span>${esc(T("recent.title"))}<span class="bk"> ⟧</span></span>
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
/* ============================================================
   分析页顶部的仪表盘（只在晴空皮肤下出现，经典主题保持原样）
   左：资金曲线（累计 R）；右：结果分布环 + 胜率。数字全部来自同一个 stats，不另算口径
   ============================================================ */
function renderEquityCard(stats) {
  const rF = roleField("r_multiple");
  const pts = equityCurve(stats.list, rF);
  if (pts.length < 2) {
    return `<div class="dashCard dashEquity"><div class="dashHead"><span class="dashTitle">${esc(T("dash.equity"))}</span></div>
      <div class="dashEmpty">${esc(T("dash.noCurve"))}</div></div>`;
  }
  const W = 600, H = 200, padT = 14, padB = 10;
  const vals = [0, ...pts.map((p) => p.eq)];
  const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  const span = hi - lo || 1;
  const x = (i) => (i / (vals.length - 1)) * W;
  const y = (v) => padT + (1 - (v - lo) / span) * (H - padT - padB);
  const line = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line}L${W},${H}L0,${H}Z`;
  const last = vals[vals.length - 1];
  const tone = last >= 0 ? "pos" : "neg";
  // 峰值：曲线最高点，在图上打个小点
  let peakI = 0; vals.forEach((v, i) => { if (v > vals[peakI]) peakI = i; });
  const dot = (i, cls) => `<span class="dashDot ${cls}" style="left:${(x(i) / W * 100).toFixed(2)}%;top:${(y(vals[i]) / H * 100).toFixed(2)}%"></span>`;
  return `<div class="dashCard dashEquity tone-${tone}">
    <div class="dashHead">
      <div>
        <div class="dashTitle">${esc(T("dash.equity"))}</div>
        <div class="dashBig ${tone}">${fmtNum(last)}<small>R</small></div>
      </div>
      <div class="dashMeta">
        ${stats.dd !== null ? `<div><span>${esc(T("dash.maxDD"))}</span><b class="neg">${stats.dd > 0.0001 ? "-" : ""}${stats.dd.toFixed(2)}R</b></div>` : ""}
        <div><span>${esc(T("dash.peak"))}</span><b>${fmtNum(vals[peakI])}R</b></div>
        <div><span>EV</span><b>${fmtNum(stats.ev, 3)}</b></div>
      </div>
    </div>
    <div class="dashChart">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="eqStop0"/><stop offset="1" class="eqStop1"/></linearGradient></defs>
        <line x1="0" x2="${W}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" class="eqZero" vector-effect="non-scaling-stroke"/>
        <path d="${area}" fill="url(#eqFill)"/>
        <path d="${line}" class="eqLine" vector-effect="non-scaling-stroke"/>
      </svg>
      ${peakI > 0 && peakI < vals.length - 1 ? dot(peakI, "peak") : ""}${dot(vals.length - 1, "end " + tone)}
    </div>
    <div class="dashAxis"><span>${esc(pts[0].date || "")}</span><span>${esc(T("dash.curveBasis", { n: pts.length }))}</span><span>${esc(pts[pts.length - 1].date || "")}</span></div>
  </div>`;
}
function renderWinRingCard(stats) {
  const beAll = stats.be + stats.bew + stats.bel;
  const parts = [["pos", stats.w, T("dash.wins")], ["be", beAll, T("dash.be")], ["neg", stats.l, T("dash.losses")]];
  const sum = parts.reduce((a, p) => a + p[1], 0);
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = sum ? parts.filter((p) => p[1] > 0).map(([cls, v]) => {
    const len = (v / sum) * C;
    // 段与段之间留 2px 缝，只有一段的时候不留
    const gap = parts.filter((p) => p[1] > 0).length > 1 ? 2 : 0;
    const seg = `<circle r="${R}" cx="64" cy="64" class="ringSeg ${cls}" stroke-dasharray="${Math.max(0, len - gap).toFixed(2)} ${(C - Math.max(0, len - gap)).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"/>`;
    offset += len;
    return seg;
  }).join("") : "";
  return `<div class="dashCard dashRing">
    <div class="dashHead"><div class="dashTitle">${esc(T("dash.mix"))}</div><div class="dashCount">${stats.total} ${esc(T("nav.trades"))}</div></div>
    <div class="ringWrap">
      <div class="ring">
        <svg viewBox="0 0 128 128" aria-hidden="true"><circle r="${R}" cx="64" cy="64" class="ringTrack"/><g transform="rotate(-90 64 64)">${arcs}</g></svg>
        <div class="ringCenter"><b>${fmtPct(stats.wr)}</b><span>${esc(T("dash.winRate"))}</span></div>
      </div>
      <div class="ringLegend">
        ${parts.map(([cls, v, label]) => `<div class="ringLegendRow"><i class="${cls}"></i><span>${esc(label)}</span><b>${v}</b><em>${sum ? Math.round((v / sum) * 100) : 0}%</em></div>`).join("")}
        ${stats.hasR ? `<div class="ringLegendRow pf"><span>PF</span><b style="color:${pfColor(stats.pf)}">${fmtPF(stats.pf)}</b></div>` : ""}
      </div>
    </div>
  </div>`;
}
function renderAnalyticsHero(stats) {
  return `<div class="dashHero">${stats.hasR ? renderEquityCard(stats) : ""}${renderWinRingCard(stats)}</div>`;
}
function renderAnalytics() {
  const stats = computeStats();
  if (!stats.hasResult) {
    return `<div class="notice">${ICONS.alert}<span>${T("analytics.noResultRole")}</span></div>`;
  }
  const prefsNotice = analysisPrefsError ? `<div class="notice error" style="margin-bottom:16px;">${ICONS.alert}<span>${esc(analysisPrefsError)}</span></div>` : "";
  const panel = `<div id="anaScope">${renderAnalysisScopePanel(stats)}</div>`;
  const activeCount = countFilterConditions(analysisFilters);

  if (stats.total === 0) {
    return prefsNotice + panel + `<div class="notice">${ICONS.alert}<div>
      <div style="color:var(--text);margin-bottom:6px;">${esc(activeCount ? T("ascope.emptyFiltered", { total: trades.length, n: activeCount }) : T("ascope.emptyAll"))}</div>
      <div>${esc(activeCount ? T("ascope.emptyFilteredHint") : T("ascope.emptyAllHint"))}</div>
    </div></div>`;
  }

  let html = prefsNotice + panel + renderAnalyticsSticky(stats) + (currentLayout() === "modern" ? renderAnalyticsHero(stats) : "") + `<div id="anaOverview" class="statRow">
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
        <option value="sig_r" ${breakdownSort === "sig_r" ? "selected" : ""}>${esc(T("breakdown.sortSigR"))}</option>
        <option value="sig_wr" ${breakdownSort === "sig_wr" ? "selected" : ""}>${esc(T("breakdown.sortSigWr"))}</option>
        <option value="n" ${breakdownSort === "n" ? "selected" : ""}>${esc(T("breakdown.sortN"))}</option>
        <option value="delta" ${breakdownSort === "delta" ? "selected" : ""}>${esc(T("breakdown.sortDelta"))}</option>
        <option value="ev" ${breakdownSort === "ev" ? "selected" : ""}>${esc(T("breakdown.sortEv"))}</option>
      </select>
      <span class="viewToggle textToggle" title="${esc(T("breakdown.cardOrderTitle"))}">
        <button class="viewBtn ${breakdownCardOrder === "sig" ? "active" : ""}" data-action="set-bd-card-order" data-mode="sig">${esc(T("breakdown.cardOrderSig"))}</button>
        <button class="viewBtn ${breakdownCardOrder === "manual" ? "active" : ""}" data-action="set-bd-card-order" data-mode="manual">${esc(T("breakdown.cardOrderManual"))}</button>
      </span>
      ${!viewingUserId ? `<button class="btn ${breakdownPickerOpen ? "btn-primary" : ""}" data-action="toggle-breakdown-picker" style="padding:4px 10px;font-size:12px;">${ICONS.settings} ${T("breakdown.displaySettings")}</button>` : ""}
    </span>`);

  if (!bdCollapsed) {
    if (breakdownPickerOpen && !viewingUserId) html += renderBreakdownPicker();
    html += renderTopFindings(allBreakdowns);
    if (breakdowns.length) {
      html += `<div class="breakdownGrid">`;
      // ⚠️ 按显著性自动排的时候必须把拖拽关掉：拖了没反应还不报错是这个项目明令禁止的那类交互
      sortBreakdownCards(breakdowns).forEach((b) => {
        const canDrag = !viewingUserId && breakdownCardOrder === "manual";
        const draggable = canDrag ? ` draggable="true" data-bd-card-id="${esc(b.field.id)}"` : "";
        // 多选字段一笔交易会落进多行，各行 n 之和大于总笔数——小样本下特别容易被当成 bug，标出来
        const multi = b.field.type === "multiselect";
        html += `<div class="breakdownCard" id="bd_${esc(b.field.id)}"${draggable}>
          <div class="breakdownTitle" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span>${canDrag ? `<span style="cursor:grab;color:var(--mutedDark);" title="${esc(T("common.dragToReorder"))}">⠿</span> ` : ""}${esc(b.field.label)}${multi ? ` <span class="bdMultiTag" title="${esc(T("breakdown.multiTitle"))}">${esc(T("breakdown.multiTag"))}</span>` : ""}${b.ordered ? ` <span class="bdMultiTag" title="${esc(T("breakdown.timeTagTitle"))}">${esc(T("breakdown.timeTag"))}</span>` : ""}</span>
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
  <div style="margin:22px 0 14px;"><div class="sectionLabel"><span class="bk">⟦ </span>${esc(T("changelog.history"))}<span class="bk"> ⟧</span></div></div>` : "";
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


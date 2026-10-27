/* Modern overview linkage: presentation and local drill-down only.
   Pure period/cohort calculations live in 11d. Existing propModal owns the sheet. */
function propLinkageIcon(key) {
  const paths = {
    bought: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-6 5h3"/>',
    passed: '<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z"/><path d="m8 12 3 3 5-6"/>',
    funded: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M6 16c0-3 6-3 6 0m3-7h3m-3 4h3"/>',
    paid: '<circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    funnel: '<path d="M3 4h18M6 9h12M9 14h6M11 19h2"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key] || paths.arrow}</svg>`;
}
function propLinkageStageLabel(key) { return T("prop.linkage.stage." + key); }
function propLinkageRate(rate) { return rate === null ? "—" : Math.round(rate) + "%"; }
function propLinkageSlice(range, year, month) {
  if (!range || range.preset === "all") return "";
  const first = String(year).padStart(4, "0") + "-" + String(month || 1).padStart(2, "0") + "-01";
  const next = propOverviewMonthStart(year * 12 + (month || 12));
  const last = next ? propOverviewShiftDay(next, -1) : "9999-12-31";
  return `${range.from > first ? range.from : first} – ${range.to < last ? range.to : last}`;
}
function propLinkageWarning(report) {
  return report.incompleteIds.length ? `<p class="propProgressNotice" role="status">${esc(T("prop.linkage.incomplete", { n: report.incompleteIds.length }))}</p>` : "";
}
function renderPropProgress(report) {
  const f = report.summary, edges = [2, 20, 38, 56, 74];
  return `<section class="propProgress" aria-label="${esc(T("prop.funnel.title"))}">
    <header class="propProgressHead"><div><span class="propOverviewIcon">${propLinkageIcon("funnel")}</span><div><h2>${esc(T("prop.funnel.title"))}</h2><p>${esc(T("prop.linkage.inspect"))}</p></div></div><span class="propProgressRange">${esc(propOverviewRangeText(report.range))}</span></header>
    ${propLinkageWarning(report)}
    <div class="propProgressScroll" role="region" tabindex="0" aria-label="${esc(T("prop.linkage.scroll"))}" aria-describedby="propProgressShape"><div class="propProgressTrack">
      ${PROP_LINKAGE_STAGES.map((key, i) => {
        const rows = report.stages[key], edge = report.edges[i];
        return `<div class="propProgressStep"><button type="button" id="propProgressStage-${key}" class="propProgressStage" data-action="prop-linkage-stage" data-stage="${key}" aria-label="${esc(propLinkageStageLabel(key) + " · " + T("prop.linkage.count", { n: rows.length }))}" style="--stage-tint:${6+i*5}%">
          <span class="propProgressCaption">${propLinkageIcon(key)}${esc(propLinkageStageLabel(key))}</span><span class="propProgressShape"><svg viewBox="0 0 300 240" preserveAspectRatio="none" aria-hidden="true"><polygon points="2,${edges[i]} 298,${edges[i+1]} 298,${240-edges[i+1]} 2,${240-edges[i]}" vector-effect="non-scaling-stroke"/></svg><span class="propProgressValue"><span><strong>${rows.length}</strong> ${esc(T("prop.linkage.unit"))}</span><small>${esc(T("prop.linkage.viewAccounts"))} ↗</small></span></span></button>
          ${edge ? `<button type="button" id="propProgressEdge-${i}" class="propProgressEdge" data-action="prop-linkage-edge" data-edge="${i}" ${edge.rows.length ? "" : "disabled"} aria-label="${esc(propLinkageStageLabel(edge.from) + " → " + propLinkageStageLabel(edge.to) + " · " + propLinkageRate(edge.rate) + " · " + edge.converted.length + "/" + edge.rows.length)}"><span><strong>${propLinkageRate(edge.rate)}</strong>${propLinkageIcon("arrow")}</span><small>${edge.converted.length} / ${edge.rows.length}</small></button>` : ""}</div>`;
      }).join("")}</div></div>
    <p class="propProgressDescription" id="propProgressShape"><span>${esc(T("prop.linkage.shape"))}</span><span class="propProgressSwipe">${esc(T("prop.linkage.swipe"))}</span></p>
    <div class="propProgressSummary"><div><span>${esc(T("prop.funnel.passRate"))}</span><strong>${propLinkageRate(f.passRate)}</strong><small>${esc(T("prop.funnel.passRateSub", { n: f.decided }))}</small><small>${esc(T("prop.linkage.attempts"))}</small></div><div><span>${esc(T("prop.funnel.costPerFunded"))}</span><strong>${propUsd(f.costPerFunded)}</strong><small>${esc(T(report.range?.preset === "all" ? "prop.funnel.costPerFundedSub" : "prop.linkage.costBasis"))}</small></div></div>
  </section>`;
}
function propLinkageListContent(m) {
  const { accounts, entries } = propScoped(), report = propLinkageReport(accounts, entries, m.range, todayStr());
  const edge = m.kind === "edge" ? report.edges[Number(m.key)] : null;
  const partition = m.partition === "unconverted" ? "unconverted" : "converted";
  const rows = edge ? edge[partition] : report.stages[m.key] || [];
  const title = edge ? `${propLinkageStageLabel(edge.from)} → ${propLinkageStageLabel(edge.to)}` : propLinkageStageLabel(m.key);
  const accountMap = new Map(accounts.map(a => [a.id, a]));
  const body = `<p class="propLinkageSubtitle">${esc(propOverviewRangeText(m.range))}${edge ? " · " + esc(T("prop.linkage.ratio", { n: edge.converted.length, d: edge.rows.length, p: propLinkageRate(edge.rate) })) : ""}</p>
    <p class="propLinkageSubtitle">${esc(T(edge ? "prop.linkage.cutoff" : "prop.linkage.stageBasis"))}</p>${propLinkageWarning(report)}
    ${edge ? `<div class="propLinkageTabs" role="tablist" aria-label="${esc(T("prop.linkage.conversion"))}">${["converted", "unconverted"].map(k => `<button type="button" id="propLinkageTab-${k}" role="tab" aria-controls="propLinkageRows" aria-selected="${partition === k}" tabindex="${partition === k ? 0 : -1}" data-action="prop-linkage-partition" data-partition="${k}">${esc(T("prop.linkage." + k))} · ${edge[k].length}</button>`).join("")}</div>` : ""}
    <div id="propLinkageRows" ${edge ? `role="tabpanel" aria-labelledby="propLinkageTab-${partition}"` : ""}>
    ${rows.length ? rows.map(row => {
      const a = accountMap.get(row.id);
      const source = edge ? edge.from : m.key;
      return `<button type="button" class="propLinkageAccount" data-action="prop-linkage-detail" data-id="${esc(row.id)}"><span class="propOverviewIcon">${propLinkageIcon("funded")}</span><span class="propLinkageAccountText"><strong>${esc(propAccountTitle(a))}</strong><small>${esc([a.firm_name, a.group_name].filter(Boolean).join(" · "))}</small><span>${propStatusPill(a.status)}<small>${esc(propLinkageStageLabel(source))} · ${esc(row.day)}</small>${edge ? `<small>${esc(propLinkageStageLabel(edge.to))} · ${esc(row.next || T("prop.linkage.notRecorded"))}</small>` : ""}</span></span>${propLinkageIcon("arrow")}</button>`;
    }).join("") : `<div class="emptyState">${esc(T("prop.linkage.empty"))}</div>`}</div>`;
  return { title: esc(title), body, count: rows.length };
}
function propLinkageModalHtml(m) {
  const c = propLinkageListContent(m);
  return `<div class="overlay propDrawerOverlay" data-action="prop-dismiss-overlay"><div class="modal propModal propDrawer propLinkageModal" role="dialog" aria-modal="true" aria-labelledby="propLinkageTitle" tabindex="-1" style="max-width:640px;">
    <div class="modalHead"><h2 id="propLinkageTitle">${c.title}</h2><button type="button" class="iconBtn" data-action="prop-close-modal" aria-label="${esc(T("common.close"))}">${ICONS.x}</button></div>
    <div class="modalBody">${c.body}</div><div class="modalFoot"><span>${esc(T("prop.linkage.count", { n: c.count }))}</span><button type="button" class="btn" data-action="prop-close-modal">${esc(T("common.close"))}</button></div></div></div>`;
}
function propLinkageContext() {
  return JSON.stringify([session?.user?.id || null, viewingUserId || "", propFirmFilter, propGroupFilter, propOverviewResolveRange(propOverviewRange, todayStr())]);
}
function propLinkageOrigin(m) { return m?.type === "overview-list" ? m : m?.linkageBack || m?.back?.linkageBack || null; }
function propLinkageDetailBack(m, id) {
  const detail = m?.type === "detail" ? m : m?.back;
  return { type: "detail", id, ...(detail?.type === "detail" && detail.id === id && detail.linkageBack ? { linkageBack: detail.linkageBack } : {}) };
}
function propLinkageBeforeRender() {
  const origin = propLinkageOrigin(propModal);
  if (origin && (origin.context !== propLinkageContext() || !session || authLoading || currentProfile?.active === false || tab !== "prop" || propView !== "overview" || currentLayout() !== "modern")) {
    propModal = null;
    // render() may return early during authentication. Clear the owned sheet now;
    // the normal non-forced modal seam preserves any other already-open form.
    renderSecondaryModals();
  }
}
function propLinkageReturnFocus(origin) {
  if (!origin || origin.context !== propLinkageContext() || !propOverviewCanInteract()) return;
  document.getElementById(origin.triggerId)?.focus({ preventScroll: true });
}
function propLinkageFocusDialog() {
  if (!propLinkageOrigin(propModal)) return;
  const modal = document.querySelector('.propModal[role="dialog"]');
  if (modal && !modal.contains(document.activeElement)) modal.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
}
function propLinkageFocusList(partition, accountId) {
  const modal = document.querySelector(".propLinkageModal");
  const row = accountId && modal ? [...modal.querySelectorAll('[data-action="prop-linkage-detail"]')].find(b => b.dataset.id === accountId) : null;
  (row || (partition ? document.getElementById("propLinkageTab-" + partition) : modal?.querySelector('[data-action="prop-close-modal"]')))?.focus({ preventScroll: true });
}
function propLinkageOpen(kind, key, triggerId) {
  if (!propOverviewCanInteract()) return;
  if (kind === "stage" ? !PROP_LINKAGE_STAGES.includes(key) : kind !== "edge" || ![0, 1, 2].includes(Number(key))) return;
  const range = propOverviewResolveRange(propOverviewRange, todayStr());
  if (!range) return;
  propOverviewCleanup();
  propModal = { type: "overview-list", kind, key, partition: "converted", context: propLinkageContext(), triggerId,
    range: range.preset === "all" ? range : { ...range, preset: "custom" } };
  propRenderModal(); propLinkageFocusList();
}
function propLinkageCurrent(status) {
  if (!PROP_ACTIVE.includes(status) || !propOverviewCanInteract()) return;
  propBatch = false; propSelected = []; propCardMenu = null;
  propStatusFilter = status; propView = "accounts";
  render(); document.getElementById("propExactStatus")?.focus({ preventScroll: true });
}
function propLinkagePartition(partition) {
  if (propModal?.type !== "overview-list" || propModal.kind !== "edge" || !["converted", "unconverted"].includes(partition)) return;
  propModal.partition = partition; propRenderModal(); propLinkageFocusList(partition);
}
function propLinkageOpenDetail(id) {
  const m = propModal;
  if (m?.type !== "overview-list" || m.context !== propLinkageContext()) return;
  const { accounts, entries } = propScoped(), report = propLinkageReport(accounts, entries, m.range, todayStr());
  const rows = m.kind === "edge" ? report.edges[Number(m.key)]?.[m.partition] : report.stages[m.key];
  if (!rows?.some(row => row.id === id)) return;
  m.returnAccountId = id;
  propModal = { type: "detail", id, linkageBack: m };
  propRenderModal(); document.querySelector('[data-action="prop-linkage-back"]')?.focus({ preventScroll: true });
}
function propLinkageBack() {
  const m = propModal, origin = propLinkageOrigin(m);
  if (!origin || m.type !== "detail" || m.busy) return;
  const a = propAccounts.find(a => a.id === m.id);
  if (a && m.draft && propDetailDirty(a, m.draft)) { m.error = T("prop.linkage.unsaved"); propRenderModal(); return; }
  if (origin.context !== propLinkageContext()) { propCloseModal(); return; }
  propModal = origin; propRenderModal(); propLinkageFocusList(origin.kind === "edge" ? origin.partition : null, origin.returnAccountId);
}
// A watched input redraws its modal on blur. Preserve Back through pointerdown
// so its click can check the already-synced draft instead of being swallowed.
function propLinkagePointerDown(e) {
  if (e.button === 0 && propModal?.linkageBack && e.target.closest?.('[data-action="prop-linkage-back"]')) e.preventDefault();
}
document.addEventListener("pointerdown", propLinkagePointerDown);
document.addEventListener("click", e => {
  const b = e.target.closest?.("[data-action]");
  if (!b || b.disabled) return;
  const a = b.dataset.action;
  if (a === "prop-linkage-stage") propLinkageOpen("stage", b.dataset.stage, b.id);
  else if (a === "prop-linkage-edge") propLinkageOpen("edge", Number(b.dataset.edge), b.id);
  else if (a === "prop-linkage-current") propLinkageCurrent(b.dataset.status);
  else if (a === "prop-linkage-partition") propLinkagePartition(b.dataset.partition);
  else if (a === "prop-linkage-detail") propLinkageOpenDetail(b.dataset.id);
  else if (a === "prop-linkage-back") propLinkageBack();
});
document.addEventListener("keydown", e => {
  if (e.isComposing || !propLinkageOrigin(propModal)) return;
  const modal = document.querySelector('.propModal[role="dialog"]');
  if (!modal) return;
  const tabButton = e.target.closest?.('[data-action="prop-linkage-partition"]');
  if (tabButton && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
    e.preventDefault(); propLinkagePartition(e.key === "Home" ? "converted" : e.key === "End" ? "unconverted" : propModal.partition === "converted" ? "unconverted" : "converted");
  } else if (e.key === "Tab") {
    const controls = [...modal.querySelectorAll('button,input,select,textarea,a[href],summary,[tabindex]')].filter(el => el.tabIndex >= 0 && !el.matches(':disabled') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
    const first = controls[0], last = controls[controls.length - 1];
    if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { e.preventDefault(); first?.focus(); }
  }
  // Escape remains owned by the existing global Prop modal handler.
});

/* Owner history inspection → local draft → explicit review/save.
   propModal owns one drawer. No fetching on open/render; only the two explicit
   actions Submit/Reload call 11k's narrow transport. Never reuse status/ledger writers. */
function propHistoryText(key, vars) { return T("prop.history." + key, vars); }
function propHistoryContext() {
  return JSON.stringify([session?.user?.id || null, viewingUserId || "", currentLayout(), tab, propView,
    propFirmFilter, propGroupFilter, propOverviewResolveRange(propOverviewRange, todayStr())]);
}
function propHistoryActive(m = propModal) {
  return m?.type === "history" && propModal === m && !!session && !authLoading && currentProfile?.active !== false &&
    m.auth === session && m.context === propHistoryContext() && tab === "prop" && (!m.id || !!propHistoryAccount(m.id));
}
function propHistoryEditable(m = propModal) {
  return propHistoryActive(m) && propHistoryCanWrite() && !m.busy && !m.confirm && m.mode === "edit" && !m.draft?.base._historyInvalidRoot;
}
function propHistorySignature(d) { return propHistoryJson([d.bought_on, d.rows]); }
function propHistoryDirty(m) { return !!m?.draft && propHistorySignature(m.draft) !== m.pristine; }
function propHistoryFocus(id) {
  const el = id ? document.getElementById(id) : null;
  (el || document.getElementById("propHistoryTitle"))?.focus({ preventScroll: true });
}
function propHistorySyncContrast() {
  const modal = document.querySelector(".propHistoryModal"), button = modal?.querySelector(".btn-primary");
  if (!button) return;
  modal.style.removeProperty("--history-on-accent");
  const luminance = color => {
    const rgb = color.match(/^rgba?\(([^)]+)\)$/)?.[1].split(/[, /]+/).slice(0, 3).map(Number);
    if (!rgb || rgb.length !== 3 || rgb.some(n => !Number.isFinite(n))) return null;
    return rgb.map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
  };
  const style = getComputedStyle(button), bg = luminance(style.backgroundColor), fg = luminance(style.color);
  if (bg === null || fg === null || (Math.max(bg, fg) + .05) / (Math.min(bg, fg) + .05) >= 4.5) return;
  modal.style.setProperty("--history-on-accent", (bg + .05) / .05 >= 1.05 / (bg + .05) ? "#000" : "#fff");
}
function propHistoryDraw(id) { propRenderModal(); propHistorySyncContrast(); propHistoryFocus(id); }
function propHistoryAccount(id) {
  const owner = viewingUserId || session?.user?.id;
  return propScoped().accounts.find(a => a.id === id && a.user_id === owner);
}
function propHistorySetDraft(m, account) {
  m.id = account.id; m.draft = propHistoryDraft(account); m.pristine = propHistorySignature(m.draft);
  m.mode = "edit"; m.error = null; m.confirm = null; m.acknowledged = false; m.result = null;
}
function propHistoryOpen(id = null, legacy = null) {
  if (!session || authLoading || currentProfile?.active === false || tab !== "prop") return;
  const parent = propModal;
  if (parent && (parent.type !== "detail" || parent.id !== id || parent.busy)) return;
  if (!parent && !propOverviewCanInteract()) return;
  const account = id ? propHistoryAccount(id) : null;
  if (id && !account) return;
  if (parent && account && parent.draft && propDetailDirty(account, parent.draft)) {
    parent.error = T("prop.linkage.unsaved"); propRenderModal(); return;
  }
  // The legacy date seam defers keyboard changes until blur. Preserve that value
  // when pointerdown intentionally prevents blur while opening this editor.
  const active = document.activeElement;
  if (!legacy && parent && active?.type === "date" && active.dataset?.propPending && active.dataset.id === id && active.dataset.propEvent !== undefined) {
    legacy = { index: Number(active.dataset.propEvent), day: active.value };
    delete active.dataset.propPending; delete active.dataset.propKeying;
  }
  propOverviewCleanup();
  const m = { type: "history", mode: "list", listTab: "pending", search: "", context: propHistoryContext(), auth: session,
    parent: parent ? { type: "detail", id, ...(parent.linkageBack ? { linkageBack: parent.linkageBack } : {}) } : null,
    trigger: parent ? "propHistoryDetailEntry" : "propHistoryEntry", busy: false, confirm: null, error: null };
  propModal = m;
  if (account) {
    propHistorySetDraft(m, account);
    if (legacy && propHistoryEditable(m) && Number.isInteger(legacy.index) && typeof legacy.day === "string") {
      const row = m.draft.rows.find(r => r.source === legacy.index);
      if (row) row.value = { ...(propHistoryObject(row.value) ? row.value : {}), day: legacy.day };
    }
  }
  propHistoryDraw();
}
function propHistorySelect(id) {
  const m = propModal, account = propHistoryAccount(id);
  if (!propHistoryActive(m) || m.busy || m.mode !== "list" || !account) return;
  propHistorySetDraft(m, account); propHistoryDraw();
}
function propHistoryInsert(position) {
  const m = propModal;
  if (!propHistoryEditable(m) || !Number.isInteger(position) || position < 0 || position > m.draft.rows.length) return;
  const key = "new-" + (++m.draft.serial);
  m.draft.rows.splice(position, 0, { key, source: null, value: { to: "", day: "" }, removed: false });
  m.error = null; propHistoryDraw("propHistoryDate-" + key);
}
function propHistoryRemove(key) {
  const m = propModal;
  if (!propHistoryEditable(m)) return;
  const row = m.draft.rows.find(r => r.key === key);
  if (row) { row.removed = !row.removed; m.error = null; propHistoryDraw("propHistoryRemove-" + key); }
}
function propHistoryReview() {
  const m = propModal;
  if (!propHistoryEditable(m)) return;
  const patch = propHistoryPatch(m.draft);
  if (!patch.ok || !patch.changed) { m.error = patch.reason || "unchanged"; propHistoryDraw(); return; }
  m.mode = "review"; m.acknowledged = false; m.error = null; propHistoryDraw();
}
function propHistoryFinish(destination) {
  const m = propModal;
  if (!propHistoryActive(m) || m.busy) return;
  if (destination === "list") {
    m.mode = "list"; m.id = null; m.draft = null; m.error = null; m.confirm = null; m.result = null; propHistoryDraw(); return;
  }
  if (destination === "parent" || destination === "detail") {
    // Only a clean detail can enter repair. Never resurrect its old bought_on.
    propModal = { ...(m.parent || { type: "detail", id: m.id }), draft: null };
    propRenderModal();
    (document.getElementById("propHistoryDetailEntry") || document.querySelector('.propModal [data-prop-event], .propModal [data-action="prop-close-modal"]'))?.focus({ preventScroll: true }); return;
  }
  propModal = null; propRenderModal(); render(); propHistoryFocus(m.trigger);
}
function propHistoryLeave(destination) {
  const m = propModal;
  if (!propHistoryActive(m) || m.busy) return;
  if (propHistoryDirty(m)) { m.confirm = { kind: destination }; propHistoryDraw("propHistoryKeep"); }
  else propHistoryFinish(destination);
}
function propHistoryClose() {
  const m = propModal;
  if (m?.type !== "history") return false;
  if (m.busy) return true;
  if (m.confirm) { propHistoryKeep(); return true; }
  propHistoryLeave("close"); return true;
}
function propHistoryBack() {
  const m = propModal;
  if (!propHistoryActive(m) || m.busy) return;
  if (m.confirm) { propHistoryKeep(); return; }
  if (m.mode === "review") { m.mode = "edit"; m.error = null; propHistoryDraw(); return; }
  propHistoryLeave(m.parent ? "parent" : m.mode === "list" ? "close" : "list");
}
function propHistoryKeep() {
  if (!propHistoryActive() || propModal.busy) return;
  propModal.confirm = null; propHistoryDraw();
}
function propHistoryRequestReload() {
  if (!propHistoryActive() || propModal.busy || !propHistoryCanWrite() || !propModal.draft) return;
  propModal.confirm = { kind: "reload" }; propHistoryDraw("propHistoryKeep");
}
async function propHistoryConfirm() {
  const m = propModal, kind = m?.confirm?.kind;
  if (!propHistoryActive(m) || m.busy || !kind) return;
  if (kind !== "reload") { m.draft = null; m.confirm = null; propHistoryFinish(kind); return; }
  m.busy = true; propHistoryDraw();
  const result = await propHistoryReload(m.id, { current: () => propHistoryActive(m) });
  if (!propHistoryActive(m)) { if (propModal === m) propHistoryBeforeRender(); return; }
  m.busy = false; m.confirm = null;
  if (result.ok && propHistoryAccount(m.id)) propHistorySetDraft(m, result.account);
  else m.error = result.ok ? "gone" : result.reason;
  // Refresh saved projections after reload without triggering loadPropData/renewals.
  if (result.ok) render();
  propHistoryDraw();
}
async function propHistorySubmit() {
  const m = propModal;
  if (!propHistoryActive(m) || !propHistoryCanWrite() || m.busy || m.confirm || m.mode !== "review" || ["conflict", "unverified", "gone", "stale"].includes(m.error)) return;
  const patch = propHistoryPatch(m.draft);
  if (!patch.ok || !patch.changed || (patch.removed && !m.acknowledged)) return;
  m.busy = true; m.error = null; propHistoryDraw();
  const result = await propHistorySave(m.draft, { acknowledged: m.acknowledged, current: () => propHistoryActive(m) });
  if (!propHistoryActive(m)) { if (propModal === m) propHistoryBeforeRender(); return; }
  m.busy = false;
  if (result.ok) {
    m.mode = "saved"; m.result = result; m.draft = null; m.error = null;
    if (m.parent) m.parent.draft = null;
    render();
  } else m.error = result.reason;
  propHistoryDraw();
}
function propHistoryBeforeRender() {
  if (propModal?.type === "history" && !propHistoryActive()) {
    // Identity/scope invalidation overrides unsaved prompts; do not expose stale drafts.
    propModal = null; renderSecondaryModals();
  }
}
function propHistoryEntryHtml() {
  const scope = propScoped(), pending = propHistoryList(scope.accounts, scope.entries).length;
  return `<button type="button" class="btn btn-sm propHistoryEntry" id="propHistoryEntry" data-action="prop-history-open" aria-label="${esc(propHistoryText("entryLabel", { n: pending }))}">${propOverviewIcon("info")} ${esc(propHistoryText("entry"))}<span class="propHistoryCount">${pending}</span></button>`;
}
function propHistoryLogo(a) {
  const logo = propCompanyLogo(a.firm_name || "—", [a], propFirms);
  const initial = Array.from(a.firm_name || "?")[0];
  return `<span class="propHistoryLogo"><span${logo ? " hidden" : ""}>${esc(initial)}</span>${logo ? `<img src="${esc(logo)}" alt="" width="38" height="38">` : ""}</span>`;
}
function propHistoryIdentity(a) {
  return `<div class="propHistoryIdentity">${propHistoryLogo(a)}<div><strong>${esc(propAccountTitle(a))}</strong><small>${esc([a.firm_name, a.plan_name, a.group_name].filter(Boolean).join(" · "))}</small></div><span>${esc(propHistoryText("current"))} ${propStatusPill(a.status)}</span></div>`;
}
function propHistoryIssueHtml(issues) {
  return issues.map(i => `<div class="propHistoryIssue" data-level="${esc(i.level)}"><span>${esc(propHistoryText("level." + i.level))}</span><div>${esc(propHistoryText("issue." + i.code))}${i.index !== null ? `<small>${esc(propHistoryText("record", { n: i.index + 1 }))}</small>` : ""}</div></div>`).join("");
}
function propHistoryRowsHtml(m) {
  const scope = propScoped(), owner = viewingUserId || session?.user?.id;
  const rows = propHistoryList(scope.accounts.filter(a => a.user_id === owner), scope.entries, m.listTab, m.search);
  return rows.length ? rows.map(({account: a, issues}) => `<button type="button" class="propHistoryAccount" data-action="prop-history-account" data-id="${esc(a.id)}">${propHistoryLogo(a)}<span><strong>${esc(propAccountTitle(a))}</strong><small>${esc([a.firm_name, a.plan_name, a.group_name].filter(Boolean).join(" · "))}</small><span class="propHistoryChips">${issues.length ? issues.map(i => `<span data-level="${esc(i.level)}">${esc(propHistoryText("issue." + i.code))}</span>`).join("") : `<span>${esc(propHistoryText("noIssue"))}</span>`}</span></span>${propStatusPill(a.status)}<span aria-hidden="true">›</span></button>`).join("") : `<div class="propHistoryEmpty">${esc(propHistoryText(m.search ? "noMatches" : m.listTab === "pending" ? "noPending" : "noAccounts"))}</div>`;
}
function propHistoryListHtml(m) {
  return `<div class="propHistoryTabs" role="tablist" aria-label="${esc(propHistoryText("entry"))}">${["pending", "all"].map(k => `<button type="button" role="tab" id="propHistoryTab-${k}" aria-selected="${m.listTab === k}" aria-controls="propHistoryRows" tabindex="${m.listTab === k ? 0 : -1}" data-action="prop-history-tab" data-tab="${k}">${esc(propHistoryText(k))}</button>`).join("")}</div>
    <label class="propHistorySearch"><span class="sr-only">${esc(propHistoryText("search"))}</span><input class="input" id="propHistorySearch" type="search" maxlength="120" value="${esc(m.search)}" placeholder="${esc(propHistoryText("search"))}"></label>
    <p class="propHistoryScope">${esc(propHistoryText("scope"))}${[propFirmFilter, propGroupFilter].filter(Boolean).length ? " · " + esc([propFirmFilter, propGroupFilter].filter(Boolean).join(" / ")) : ""}</p>
    <div id="propHistoryRows" role="tabpanel" aria-labelledby="propHistoryTab-${m.listTab}">${propHistoryRowsHtml(m)}</div>`;
}
function propHistoryEventValue(value) {
  if (!propHistoryObject(value)) return propHistoryText("unknown");
  return (PROP_STATUSES.includes(value.to) ? T("prop.status." + value.to) : propHistoryText("unknown")) + " · " + (value.day || propHistoryText("unknown"));
}
function propHistoryEditorHtml(m, a) {
  const d = m.draft, disabled = !propHistoryCanWrite() || m.busy || !!d.base._historyInvalidRoot;
  const issues = propHistoryIssues(a, propEntries);
  const insert = index => `<button type="button" class="propHistoryInsert" data-action="prop-history-insert" data-position="${index}" ${disabled ? "disabled" : ""} aria-label="${esc(propHistoryText("insert", { n: index + 1 }))}"><span aria-hidden="true">${index ? "›" : "+"}</span>${index ? '<small aria-hidden="true">+</small>' : ""}</button>`;
  const timeline = d.rows.map((row, index) => {
    const value = propHistoryObject(row.value) ? row.value : {}, changed = row.source === null || propHistoryJson(row.value) !== propHistoryJson(d.base.events[row.source]);
    return `${insert(index)}<div class="propHistoryStep"><div class="propHistoryEvent${row.removed ? " is-removed" : ""}">${row.removed ? `<div><s>${esc(propHistoryEventValue(row.value))}</s><small>${esc(propHistoryText("marked"))}</small></div>` : `
      <input id="propHistoryDate-${row.key}" class="input propHistoryEventDate" type="date" min="1990-01-01" max="2099-12-31" value="${esc(value.day || "")}" data-history-field="day" data-history-key="${row.key}" ${disabled ? "disabled" : ""} aria-label="${esc(propHistoryText("eventDate", { n: index + 1 }))}" aria-invalid="${changed && !propHistoryDay(value.day)}">
      <label class="propHistoryStage">${PROP_STATUSES.includes(value.to) ? propStatusPill(value.to) : `<span class="propSt">${esc(propHistoryText("chooseStage"))}</span>`}<select id="propHistoryStage-${row.key}" data-history-field="to" data-history-key="${row.key}" ${disabled ? "disabled" : ""} aria-label="${esc(propHistoryText("eventStage", { n: index + 1 }))}" aria-invalid="${changed && !PROP_STATUSES.includes(value.to)}"><option value="" ${!PROP_STATUSES.includes(value.to) ? "selected" : ""}>${esc(propHistoryText("chooseStage"))}</option>${PROP_STATUSES.map(s => `<option value="${s}" ${value.to === s ? "selected" : ""}>${esc(T("prop.status." + s))}</option>`).join("")}</select></label>`}
      <button type="button" class="propHistoryRemove" id="propHistoryRemove-${row.key}" data-action="prop-history-remove" data-key="${row.key}" ${disabled ? "disabled" : ""} aria-label="${esc(propHistoryText(row.removed ? "restore" : "remove"))}">${row.removed ? "↶" : ICONS.x}</button></div>
      ${row.source === null ? `<small>${esc(propHistoryText("added"))}</small>` : ""}${changed && !row.removed && (!propHistoryDay(value.day) || !PROP_STATUSES.includes(value.to)) ? `<small class="propHistoryInvalid">${esc(propHistoryText("validFields"))}</small>` : ""}</div>`;
  }).join("") + insert(d.rows.length);
  return `${propHistoryIdentity(a)}<div class="propHistoryBoundary">${esc(propHistoryText("boundary"))}</div>
    <div class="propHistoryPurchase"><div><label for="propHistoryBought">${esc(T("prop.form.boughtOn"))}</label><small>${esc(propHistoryText("purchaseWarning"))}</small></div><input id="propHistoryBought" class="input" type="date" min="1990-01-01" max="2099-12-31" data-history-field="bought_on" value="${esc(d.bought_on || "")}" ${disabled ? "disabled" : ""} aria-invalid="${d.bought_on !== d.base.bought_on && !propHistoryDay(d.bought_on)}"></div>
    <h3>${esc(T("prop.acc.timeline"))}</h3><p class="propHistoryScope">${esc(propHistoryText("timelineHint"))}</p><div class="propHistoryTimelineScroll" tabindex="0" role="region" aria-label="${esc(T("prop.acc.timeline"))}"><div class="propHistoryTimeline">${timeline}</div></div>
    ${issues.length ? `<h3>${esc(propHistoryText("savedIssues"))}</h3>` : ""}<div class="propHistoryIssues">${propHistoryIssueHtml(issues)}</div>${issues.some(i => i.level === "external") ? `<button type="button" class="btn btn-sm" data-action="prop-history-ledger">${esc(propHistoryText("ledger"))}</button>` : ""}`;
}
function propHistoryReviewHtml(m, a) {
  const patch = propHistoryPatch(m.draft);
  return `${propHistoryIdentity(a)}<div class="propHistoryBoundary">${esc(propHistoryText("boundary"))}</div>${patch.changes.map(c => `<div class="propHistoryDiff" data-kind="${c.kind}"><strong>${esc(propHistoryText("change." + c.kind))}</strong><div><span><small>${esc(propHistoryText("before"))}</small>${esc(c.kind === "purchase" ? c.before || propHistoryText("unknown") : c.before === null ? "—" : propHistoryEventValue(c.before))}</span><span aria-hidden="true">→</span><span><small>${esc(propHistoryText("after"))}</small>${esc(c.kind === "purchase" ? c.after : c.after === null ? "—" : propHistoryEventValue(c.after))}</span></div></div>`).join("")}
    ${patch.changes.some(c => c.kind === "purchase") ? `<p class="propHistoryBoundary">${esc(propHistoryText("purchaseWarning"))}</p>` : ""}
    ${patch.removed ? `<label class="propHistoryAck"><input type="checkbox" id="propHistoryAck" ${m.acknowledged ? "checked" : ""} ${m.busy ? "disabled" : ""}> ${esc(propHistoryText("ack", { n: patch.removed }))}</label>` : ""}`;
}
function propHistoryModalHtml(m) {
  const a = m.id ? propAccounts.find(a => a.id === m.id) || m.draft?.base : null;
  const disabled = !propHistoryCanWrite() || m.busy;
  let body, foot = "", title = propHistoryText(m.mode === "list" ? "entry" : m.mode === "review" ? "review" : m.mode === "saved" ? "saved" : "edit");
  if (m.confirm) {
    title = propHistoryText("discardTitle");
    body = `<div class="propHistoryEmpty"><h3>${esc(title)}</h3><p>${esc(propHistoryText(m.confirm.kind === "reload" ? "reloadWarning" : "discardWarning"))}</p></div>`;
    foot = `<button type="button" class="btn" id="propHistoryKeep" data-action="prop-history-keep" ${m.busy ? "disabled" : ""}>${esc(propHistoryText("keep"))}</button><button type="button" class="btn btn-danger" data-action="prop-history-confirm" ${m.busy ? "disabled" : ""}>${esc(propHistoryText(m.confirm.kind === "reload" ? "reload" : "discard"))}</button>`;
  } else if (m.mode === "list") body = propHistoryListHtml(m);
  else if (m.mode === "saved") body = `${a ? propHistoryIdentity(a) : ""}<div class="propHistoryEmpty" role="status"><h3>${esc(propHistoryText("saved"))}</h3><p>${esc(propHistoryText("remaining", { n: m.result?.remaining?.length || 0 }))}</p></div><div class="propHistoryIssues">${propHistoryIssueHtml(m.result?.remaining || [])}</div><p class="propHistoryBoundary">${esc(propHistoryText("boundary"))}</p>`;
  else if (!a || !m.draft) body = `<div class="propHistoryEmpty">${esc(propHistoryText("error.gone"))}</div>`;
  else {
    body = m.mode === "review" ? propHistoryReviewHtml(m, a) : propHistoryEditorHtml(m, a);
    const patch = propHistoryPatch(m.draft), blocked = disabled || !patch.ok || !patch.changed || (m.mode === "review" && ((patch.removed && !m.acknowledged) || ["conflict", "unverified", "gone", "stale"].includes(m.error)));
    foot = `<button type="button" class="btn btn-primary" id="propHistoryPrimary" data-action="${m.mode === "review" ? "prop-history-save" : "prop-history-review"}" ${blocked ? "disabled" : ""}>${esc(m.busy ? T("common.saving") : propHistoryText(m.mode === "review" ? "save" : "review"))}</button>`;
  }
  const error = m.error ? `<div class="notice error propHistoryError" role="alert"><span>${esc(propHistoryText("error." + m.error))}</span>${["conflict", "unverified", "gone", "stale"].includes(m.error) ? `<button type="button" class="btn btn-sm" data-action="prop-history-reload" ${disabled ? "disabled" : ""}>${esc(propHistoryText("reload"))}</button>` : ""}</div>` : "";
  return `<div class="overlay propDrawerOverlay" data-action="prop-dismiss-overlay"><div class="modal propModal propDrawer propHistoryModal" role="dialog" aria-modal="true" aria-labelledby="propHistoryTitle" aria-busy="${!!m.busy}"><header class="modalHead"><h2 id="propHistoryTitle" tabindex="-1">${esc(title)}</h2><button type="button" class="iconBtn" data-action="prop-close-modal" ${m.busy ? "disabled" : ""} aria-label="${esc(T("common.close"))}">${ICONS.x}</button></header><div class="modalBody">${!propHistoryCanWrite() ? `<p class="propHistoryBoundary">${esc(propHistoryText("readonly"))}</p>` : ""}${error}${body}</div><footer class="modalFoot">${m.confirm ? foot : `<button type="button" class="btn" data-action="prop-history-back" ${m.busy ? "disabled" : ""}>${esc(T(m.mode === "list" ? "common.close" : "prop.back"))}</button><span class="propHistoryFootNote">${esc(propHistoryText("draftOnly"))}</span>${foot}`}</footer></div></div>`;
}
function propHistoryField(el) {
  const m = propModal, field = el?.dataset?.historyField;
  if (!field || !propHistoryEditable(m)) return;
  if (field === "bought_on") m.draft.bought_on = el.value;
  else if (["day", "to"].includes(field)) {
    const row = m.draft.rows.find(r => r.key === el.dataset.historyKey);
    if (!row || row.removed) return;
    row.value = { ...(propHistoryObject(row.value) ? row.value : {}), [field]: el.value };
  }
  m.error = null;
  // Update eligibility without replacing a keyboard-edited date control.
  const primary = document.getElementById("propHistoryPrimary"), patch = propHistoryPatch(m.draft);
  if (primary) primary.disabled = !patch.ok || !patch.changed;
}
document.addEventListener("input", e => {
  const m = propModal;
  if (!propHistoryActive(m) || m.busy || m.confirm) return;
  if (e.target.id === "propHistorySearch" && m.mode === "list") {
    m.search = e.target.value;
    const rows = document.getElementById("propHistoryRows"); if (rows) rows.innerHTML = propHistoryRowsHtml(m);
  } else propHistoryField(e.target);
});
document.addEventListener("change", e => {
  if (!propHistoryActive() || propModal.busy || propModal.confirm) return;
  if (e.target.id === "propHistoryAck" && propModal.mode === "review") { propModal.acknowledged = e.target.checked; propHistoryDraw("propHistoryAck"); }
  else if (e.target.dataset?.historyField) {
    propHistoryField(e.target);
    if (!e.target.dataset.historyKeying) propHistoryDraw(e.target.id);
  }
});
document.addEventListener("focusout", e => {
  const t = e.target;
  if (!propHistoryActive() || !t.dataset?.historyKeying) return;
  delete t.dataset.historyKeying;
  propHistoryField(t);
  // Do not replace the control being clicked after blur. Validation occurs on
  // every input and again at Review; a later action will redraw field feedback.
});
document.addEventListener("click", async e => {
  const b = e.target.closest?.('[data-action^="prop-history-"]'); if (!b || b.disabled) return;
  const action = b.dataset.action, m = propModal;
  if (action === "prop-history-open") { propHistoryOpen(b.dataset.id || null); return; }
  if (!propHistoryActive(m) || m.busy) return;
  if (action === "prop-history-account") propHistorySelect(b.dataset.id);
  else if (action === "prop-history-tab" && m.mode === "list" && ["pending", "all"].includes(b.dataset.tab)) { m.listTab = b.dataset.tab; propHistoryDraw("propHistoryTab-" + m.listTab); }
  else if (action === "prop-history-insert") propHistoryInsert(Number(b.dataset.position));
  else if (action === "prop-history-remove") propHistoryRemove(b.dataset.key);
  else if (action === "prop-history-review") propHistoryReview();
  else if (action === "prop-history-save") await propHistorySubmit();
  else if (action === "prop-history-back") propHistoryBack();
  else if (action === "prop-history-keep") propHistoryKeep();
  else if (action === "prop-history-confirm") await propHistoryConfirm();
  else if (action === "prop-history-reload") propHistoryRequestReload();
  else if (action === "prop-history-ledger") propHistoryLeave("detail");
});
// Preserve explicit actions across blur-driven redraws in the existing detail form.
document.addEventListener("pointerdown", e => {
  if (e.button === 0 && e.target.closest?.('[data-action^="prop-history-"]') && propModal?.type === "detail") e.preventDefault();
});
document.addEventListener("focusin", e => {
  if (!propHistoryActive()) return;
  if (e.target.closest?.(".propHistoryTimelineScroll")) e.target.scrollIntoView?.({ block: "nearest", inline: "nearest" });
});
document.addEventListener("error", e => {
  const image = e.target;
  if (image.tagName !== "IMG" || !image.closest?.(".propHistoryLogo")) return;
  image.hidden = true; const initial = image.parentElement.querySelector("span"); if (initial) initial.hidden = false;
}, true);
function propHistoryKeydown(e) {
  if (!propHistoryActive() || e.isComposing) return;
  if (e.target.type === "date" && e.target.dataset?.historyField) {
    if (e.key === "Enter") {
      e.preventDefault(); delete e.target.dataset.historyKeying; propHistoryField(e.target); propHistoryDraw(e.target.id); return;
    }
    if (!["Tab", "Escape", "Shift", "Control", "Alt", "Meta"].includes(e.key)) e.target.dataset.historyKeying = "1";
  }
  const modal = document.querySelector(".propHistoryModal"); if (!modal) return;
  const tabButton = e.target.closest?.('[data-action="prop-history-tab"]');
  if (tabButton && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
    e.preventDefault(); propModal.listTab = e.key === "Home" ? "pending" : e.key === "End" ? "all" : propModal.listTab === "all" ? "pending" : "all";
    propHistoryDraw("propHistoryTab-" + propModal.listTab);
  } else if (e.key === "Tab") {
    const controls = [...modal.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].filter(el => el.tabIndex >= 0 && !el.matches(':disabled') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) { e.preventDefault(); propHistoryFocus(); return; }
    const index = controls.indexOf(document.activeElement);
    if (e.shiftKey && index <= 0) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (index < 0 || document.activeElement === last)) { e.preventDefault(); first.focus(); }
  }
  // Existing global Escape → propCloseModal → propHistoryClose owns dismissal.
}
document.addEventListener("keydown", propHistoryKeydown);

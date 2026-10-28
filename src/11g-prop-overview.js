/* Modern Prop overview. No fetching, persistence or ledger mutation.
   Finance/date helpers live in 11d; render() owns lifecycle of the page. */
function propOverviewIcon(name) {
  const paths = {
    net: '<circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12"/>',
    cash: '<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
    accounts: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M6 16c0-3 6-3 6 0m3-7h3m-3 4h3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.5"/>',
    up: '<path d="m3 16 6-6 4 4 8-9m-7 0h7v7"/>',
    down: '<path d="m3 8 6 6 4-4 8 9m-7 0h7v-7"/>',
    flat: '<path d="M3 12h18m-5-5 5 5-5 5"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;
}
function propOverviewHelp(field, label) {
  return `<button type="button" class="propOverviewHelp" data-prop-overview-tip="${field}" aria-label="${esc(T("prop.overview.helpLabel", { label }))}">${propOverviewIcon("info")}</button>`;
}
const PROP_OVERVIEW_HELP_SELECTOR = "[data-prop-overview-tip], [data-prop-month-tip], [data-prop-company-tip]";
function propOverviewHelpField(button) {
  return button?.dataset?.propOverviewTip || (button?.dataset?.propMonthTip === "recovery" ? "recovery" : propCompanyHelpField(button));
}
function propOverviewHelpButton(field) {
  if (typeof field === "string" && field.startsWith("company-")) return propCompanyHelpButton(field);
  if (field === "recovery") return document.getElementById("propMonthRecoveryHelp");
  return ["net", "spent", "received", "roi", "trend", "accounts"].includes(field) ? document.querySelector(`[data-prop-overview-tip="${field}"]`) : null;
}
function propOverviewLabel(key, field) {
  const text = T(key);
  return `<span>${esc(text)}</span>${field ? propOverviewHelp(field, text) : ""}`;
}
function propOverviewDateText(day, options) {
  const time = propOverviewDay(day);
  return time === null ? "" : new Date(time).toLocaleDateString(localeTag(), { timeZone: "UTC", ...options });
}
function propOverviewRangeText(range) {
  return range && range.preset === "custom" ? `${range.from.replaceAll("-", ".")} – ${range.to.replaceAll("-", ".")}` : T("prop.overview.range." + (range?.preset || "all"));
}
function propOverviewTrend(snapshot) {
  const { points, from, to, sum } = snapshot;
  if (!points.length) return `<div class="propOverviewTrendEmpty">${esc(T("prop.overview." + (snapshot.reason || "emptyTrend")))}</div>`;
  let low = 0, high = 0;
  for (const p of points) { low = Math.min(low, p.net); high = Math.max(high, p.net); }
  const start = points[0].at, end = points[points.length - 1].at;
  const x = (p) => 6 + (p.at - start) / (end - start || 1) * 188;
  const y = (v) => high === low ? 48 : 8 + (high - v) / (high - low) * 80;
  const f = (v) => v.toFixed(2), zero = y(0);
  let path = `M6,${f(zero)}`;
  points.slice(1).forEach((p) => { path += `H${f(x(p))}V${f(y(p.net))}`; });
  const area = path + `V${f(zero)}H6Z`;
  const description = T("prop.overview.trendDescription", { from, to, net: propUsd(sum.net, true) });
  return `<svg class="propOverviewPlot" viewBox="0 0 200 100" preserveAspectRatio="none" role="img" aria-label="${esc(description)}" data-end-cents="${Math.round(sum.net * 100)}">
    <defs><clipPath id="propOverviewAbove"><rect width="200" height="${f(zero)}"/></clipPath><clipPath id="propOverviewBelow"><rect y="${f(zero)}" width="200" height="${f(100-zero)}"/></clipPath></defs>
    <path class="propOverviewZero" d="M6,${f(zero)}H194"/>
    ${(high === low ? [] : [["positive", "Above"], ["negative", "Below"]]).map(([tone, clip]) => `<g class="propOverviewTrace" data-tone="${tone}" clip-path="url(#propOverview${clip})"><path class="propOverviewArea" d="${area}"/><path class="propOverviewLine" d="${path}"/></g>`).join("")}
    <circle cx="194" cy="${f(y(sum.net))}" r="2.5" class="propOverviewDot"/>
    </svg><div class="propOverviewDates"><span>${esc(from.slice(5).replace("-", "."))}</span><span>${esc(to.slice(5).replace("-", "."))}</span></div>`;
}
function renderPropOverviewPanel(accounts, entries, snapshot = propOverviewSnapshot(entries, propOverviewRange, todayStr())) {
  const all = snapshot.range?.preset === "all", s = snapshot.sum;
  const tone = !s || !s.net ? "neutral" : s.net > 0 ? "positive" : "negative";
  const netKey = "prop.overview." + (all ? "netAll" : "netRange");
  const spentKey = "prop.overview." + (all ? "spentAll" : "spentRange");
  const trendKey = "prop.overview." + (all ? "trendAll" : "trendRange");
  const money = s ? propUsd(s.net, true) : "—", parts = money.split(".");
  const bars = s ? propOverviewBarModel(s) : null;
  const amounts = s ? T("prop.overview.cashDescription", { spent: propUsd(s.spent), received: propUsd(s.received), net: propUsd(s.net, true) }) : "";
  const stages = [["eval", "prop.status.eval"], ["passed", "prop.overview.toActivate"], ["funded", "prop.status.funded"]];
  return `<section class="propOverview" aria-label="${esc(T("prop.overview.title"))}" data-tone="${tone}">
    <header class="propOverviewHeader"><h2><span class="propOverviewIcon">${ICONS.wallet}</span>${esc(T("prop.overview.title"))}</h2>
      <div class="propOverviewTools"><button type="button" id="propOverviewRangeTrigger" class="propOverviewButton" data-action="prop-overview-range" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(T("prop.overview.rangeLabel") + ": " + propOverviewRangeText(snapshot.range))}">${ICONS.calendar}<span>${esc(propOverviewRangeText(snapshot.range))}</span>${ICONS.chevDown}</button><span>USD</span></div></header>
    ${snapshot.available ? "" : `<div class="propOverviewError" role="status">${esc(T("prop.overview." + snapshot.reason))}</div>`}
    <div class="propOverviewBody"><section class="propOverviewZone propOverviewNet">
      <h3><span class="propOverviewIcon">${propOverviewIcon("net")}</span>${propOverviewLabel(netKey, "net")}</h3>
      <div class="propOverviewSpotlight"><div class="propOverviewValue${money.length > 12 ? " propOverviewValueCompact" : ""}" data-net-cents="${s ? Math.round(s.net * 100) : ""}" aria-label="${esc(money)}"><span>${esc(parts[0])}</span>${parts[1] ? `<small>.${esc(parts[1])}</small>` : ""}</div>
        <div class="propOverviewTrend"><div class="propOverviewCaption">${propOverviewLabel(trendKey, "trend")}</div>${propOverviewTrend(snapshot)}</div></div>
      <div class="propOverviewROI" data-applicable="${s?.roi !== null && !!s}"><span class="propOverviewIcon">${propOverviewIcon(!s || s.roi === null || s.net === 0 ? "flat" : s.net > 0 ? "up" : "down")}</span><strong>${s ? propPct(s.roi) : "—"}</strong><div class="propOverviewCaption">${propOverviewLabel("prop.overview.roi")} · ROI ${propOverviewHelp("roi", "ROI")}</div></div>
    </section><section class="propOverviewZone propOverviewCash"><h3><span class="propOverviewIcon">${propOverviewIcon("cash")}</span>${esc(T("prop.overview.cash"))}</h3>
      <div class="propOverviewCashFigure" role="group" aria-label="${esc(amounts)}">
        <div class="propOverviewCashLabel"><div class="propOverviewCaption">${propOverviewLabel(spentKey, "spent")}</div><strong>${s ? propUsd(s.spent) : "—"}</strong></div>
        <div class="propOverviewBar" aria-hidden="true"><i class="propOverviewHatch" style="width:${bars?.spent || 0}%"></i></div>
        <div class="propOverviewCashLabel"><div class="propOverviewCaption">${propOverviewLabel("prop.stat.received", "received")}</div><strong>${s ? propUsd(s.received) : "—"}</strong></div>
        <div class="propOverviewBar" aria-hidden="true"><i class="propOverviewHatch" style="width:${bars?.covered || 0}%"></i><i class="propOverviewIncome" style="width:${bars?.income || 0}%"></i></div>
      </div><div class="propOverviewLegend"><span><i class="propOverviewHatch"></i>${esc(T(bars?.refundMode ? "prop.overview.netRefund" : "prop.overview.covered"))}</span><span><i class="propOverviewIncome"></i>${esc(T(bars?.refundMode ? "prop.stat.received" : "prop.stat.net"))}</span></div>
      ${bars?.refundMode ? `<p class="propOverviewRefundNote">${esc(T("prop.overview.refundBars"))}</p>` : ""}
    </section><section class="propOverviewZone propOverviewAccounts"><h3><span class="propOverviewIcon">${propOverviewIcon("accounts")}</span>${propOverviewLabel("prop.overview.accounts", "accounts")}</h3>
      <div class="propOverviewAccountSummary"><div><div class="propOverviewAccountCount"><strong>${accounts.filter(propIsActive).length}</strong><span>${esc(T("prop.overview.accountUnit"))}</span></div><span>${esc(T("prop.filter.active"))}</span></div>
        <div class="propOverviewStages">${stages.map(([status, label]) => `<button type="button" class="propOverviewStatusLink" data-action="prop-linkage-current" data-status="${status}" aria-label="${esc(T("prop.view.accounts") + " · " + T(label))}"><span>${esc(T(label))}</span><b>${accounts.filter(a => a.status === status).length}</b>${propLinkageIcon("arrow")}</button>`).join("")}</div></div>
      <div class="propOverviewAccountTotal"><span>${esc(T("prop.overview.totalAccounts"))}</span><strong>${accounts.length}</strong></div>
    </section></div></section>`;
}

/* Portal controller: no page DOM is patched outside the main renderer. */
const propOverviewUI = { panel: null, tip: null, active: null, hovered: null, pending: null, dismissed: null, overTip: false, pinned: false, openTimer: 0, closeTimer: 0, restore: null };
function propOverviewCanInteract() {
  return currentLayout() === "modern" && tab === "prop" && propView === "overview" && !authLoading && !!session && currentProfile?.active !== false && !propModal && !editingTrade && !editingReview && !profileModalOpen && !lightboxUrl && !exportCenterOpen && !dataScopeModalOpen;
}
function propOverviewClosePicker(restore = true) {
  propOverviewPicker = null;
  propOverviewUI.panel?.remove(); propOverviewUI.panel = null;
  const trigger = document.getElementById("propOverviewRangeTrigger");
  trigger?.setAttribute("aria-expanded", "false");
  if (restore) trigger?.focus({ preventScroll: true });
}
function propOverviewHideHelp(suppress = false) {
  const ui = propOverviewUI;
  clearTimeout(ui.openTimer); clearTimeout(ui.closeTimer);
  ui.dismissed = suppress ? ui.active || ui.pending : null;
  ui.active?.removeAttribute("aria-describedby");
  ui.active?.classList.remove("is-showing");
  ui.tip?.remove(); ui.tip = null; ui.active = null; ui.pending = null; ui.pinned = false; ui.overTip = false;
}
function propOverviewCleanup() {
  propOverviewClosePicker(false); propOverviewHideHelp(); propOverviewUI.hovered = null;
}
function propOverviewBeforeRender() {
  const focus = document.activeElement;
  propOverviewUI.restore = propOverviewPicker || focus?.id === "propOverviewRangeTrigger" ? "range" : propOverviewHelpField(focus);
  propOverviewCleanup();
  const owner = session?.user?.id ? JSON.stringify([session.user.id, viewingUserId || ""]) : null;
  if (owner !== propOverviewOwner || !owner || currentLayout() !== "modern" || tab !== "prop" || propView !== "overview") propOverviewRange = { preset: "all", from: null, to: null };
  propOverviewOwner = owner;
  propLinkageBeforeRender();
  propMonthsBeforeRender(owner);
  propCompanyBeforeRender(owner);
}
function propOverviewAfterRender() {
  propMonthsAfterRender();
  propCompanyAfterRender();
  const restore = propOverviewUI.restore; propOverviewUI.restore = null;
  if (!restore || !propOverviewCanInteract()) return;
  const button = restore === "range" ? document.getElementById("propOverviewRangeTrigger") : propOverviewHelpButton(restore);
  // Returning focus must not reopen a tooltip cancelled by repaint.
  propOverviewUI.dismissed = button; button?.focus({ preventScroll: true });
  propCompanyRevealHelp(button);
  // Suppress only the synchronous focus event, not the next deliberate hover.
  if (propOverviewUI.dismissed === button) propOverviewUI.dismissed = null;
}
function propOverviewPosition(panel, anchor, tooltip = false) {
  if (!panel || !anchor?.isConnected) return;
  const r = anchor.getBoundingClientRect(), w = panel.offsetWidth, h = panel.offsetHeight;
  const left = Math.max(8, Math.min(tooltip ? r.left + r.width / 2 - w / 2 : r.right - w, window.innerWidth - w - 8));
  let top = r.bottom + 8;
  if (tooltip ? r.top - h - 8 >= 8 : top + h > window.innerHeight - 8 && r.top - h - 8 >= 8) top = r.top - h - 8;
  panel.style.left = left + "px";
  panel.style.top = Math.max(8, Math.min(top, window.innerHeight - h - 8)) + "px";
}

/* Calendar: one applied range, an independent draft; no fixture date bounds. */
function propOverviewOpenPicker() {
  if (!propOverviewCanInteract()) return;
  if (userMenuOpen || calColorPopOpen) { userMenuOpen = false; calColorPopOpen = false; render(); }
  propOverviewClosePicker(false);
  propOverviewHideHelp();
  const range = propOverviewResolveRange(propOverviewRange, todayStr());
  const start = range?.from || null, end = range?.to || null;
  propOverviewPicker = { start, end, choosingEnd: false, hover: null, preset: range?.preset || "all", month: propOverviewMonthIndex(start || todayStr()), focus: start || todayStr() };
  const panel = document.createElement("div");
  panel.id = "propOverviewPicker"; panel.className = "propOverviewPicker";
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", T("prop.overview.rangeChoose"));
  document.body.appendChild(panel); propOverviewUI.panel = panel;
  propOverviewRenderPicker();
  document.getElementById("propOverviewRangeTrigger")?.setAttribute("aria-expanded", "true");
  panel.querySelector(`[data-preset="${propOverviewPicker.preset}"]`)?.focus({ preventScroll: true });
}
function propOverviewCalendarMonth(index, ordinal) {
  const first = propOverviewMonthStart(index);
  if (!first) return "";
  const p = propOverviewPicker, offset = new Date(propOverviewDay(first)).getUTCDay();
  const title = propOverviewDateText(first, { year: "numeric", month: "long" });
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = propOverviewShiftDay(first, i - offset), inMonth = day?.slice(0, 7) === first.slice(0, 7);
    if (!day) return '<div role="gridcell" class="propOverviewDateCell"></div>';
    const label = propOverviewDateText(day, { year: "numeric", month: "long", day: "numeric" });
    return `<div role="gridcell" class="propOverviewDateCell${inMonth ? "" : " adjacent"}" data-cell-day="${day}" aria-selected="false"><button type="button" data-action="prop-overview-day" data-day="${day}" aria-label="${esc(label)}" tabindex="${inMonth && day === p.focus ? 0 : -1}"${day === todayStr() ? ' aria-current="date"' : ""}${inMonth ? "" : " disabled"}>${Number(day.slice(8))}</button></div>`;
  });
  let grid = `<div role="row" class="propOverviewWeek">${T("prop.overview.weekdays").split(",").map(d => `<span role="columnheader">${esc(d)}</span>`).join("")}</div>`;
  for (let i = 0; i < 6; i++) grid += `<div role="row" class="propOverviewWeek">${cells.slice(i * 7, i * 7 + 7).join("")}</div>`;
  return `<section class="propOverviewMonth" data-month-ordinal="${ordinal}"><h4>${esc(title)}</h4><div role="grid" aria-label="${esc(T("prop.overview.monthDates", { month: title }))}">${grid}</div></section>`;
}
function propOverviewRenderPicker(focusDay) {
  const p = propOverviewPicker, panel = propOverviewUI.panel;
  if (!p || !panel) return;
  if (focusDay) p.focus = focusDay;
  // A newly navigated month must always offer a keyboard entry point.
  const visibleEnd = p.month + (window.innerWidth <= 640 ? 0 : 1);
  const fm = propOverviewMonthIndex(p.focus);
  if (fm < p.month || fm > visibleEnd) p.focus = propOverviewMonthStart(p.month);
  panel.innerHTML = `<div class="propOverviewPresets">${PROP_OVERVIEW_PRESETS.map(k => `<button type="button" class="propOverviewPreset${k === p.preset ? " active" : ""}" data-action="prop-overview-preset" data-preset="${k}" aria-pressed="${k === p.preset}">${esc(T("prop.overview.range." + k))}</button>`).join("")}</div>
    <div class="propOverviewCalendar"><div class="propOverviewCalendarNav"><button type="button" data-action="prop-overview-month" data-step="-1" aria-label="${esc(T("prop.overview.previousMonth"))}"${p.month <= 12 ? " disabled" : ""}>‹</button><button type="button" data-action="prop-overview-month" data-step="1" aria-label="${esc(T("prop.overview.nextMonth"))}"${p.month >= 119999 ? " disabled" : ""}>›</button></div><div class="propOverviewMonths">${propOverviewCalendarMonth(p.month, 0)}${propOverviewCalendarMonth(p.month + 1, 1)}</div></div>
    <div class="propOverviewPickerFooter" role="status" aria-live="polite"></div>`;
  propOverviewHighlight();
  propOverviewPosition(panel, document.getElementById("propOverviewRangeTrigger"));
  if (focusDay) panel.querySelector(`[data-day="${p.focus}"]:not(:disabled)`)?.focus({ preventScroll: true });
}
function propOverviewHighlight() {
  const p = propOverviewPicker, panel = propOverviewUI.panel;
  if (!p || !panel) return;
  const target = p.choosingEnd ? p.hover || p.start : p.end;
  const lo = p.start && target ? (p.start < target ? p.start : target) : null;
  const hi = p.start && target ? (p.start > target ? p.start : target) : null;
  panel.querySelectorAll("[data-cell-day]").forEach(cell => {
    const day = cell.dataset.cellDay, chosen = !cell.firstElementChild.disabled && !!lo && day >= lo && day <= hi;
    cell.classList.toggle("in-range", chosen); cell.classList.toggle("range-start", chosen && day === lo); cell.classList.toggle("range-end", chosen && day === hi);
    cell.setAttribute("aria-selected", String(chosen));
    cell.firstElementChild.tabIndex = !cell.firstElementChild.disabled && day === p.focus ? 0 : -1;
  });
  panel.querySelectorAll("[data-preset]").forEach(b => { const active = b.dataset.preset === p.preset; b.classList.toggle("active", active); b.setAttribute("aria-pressed", String(active)); });
  panel.querySelector(".propOverviewPickerFooter").textContent = p.choosingEnd ? T("prop.overview.rangeStartSelected", { date: p.start }) : lo ? `${lo} – ${hi}` : T("prop.overview.rangeHint");
}
function propOverviewApply(choice) {
  const next = propOverviewResolveRange(choice, todayStr());
  if (!next || !propOverviewCanInteract()) return;
  propOverviewRange = next;
  propOverviewClosePicker(false); render();
  document.getElementById("propOverviewRangeTrigger")?.focus({ preventScroll: true });
}
function propOverviewKeydown(e) {
  if (e.isComposing) return false;
  if (propModal || editingTrade || editingReview || profileModalOpen || lightboxUrl || exportCenterOpen || acctPopOpen || dataScopeModalOpen || pbNameModal || dayDetailDate || tradePreviewId) { propOverviewCleanup(); return false; }
  if (e.key === "Escape") {
    if (propOverviewUI.active || propOverviewUI.pending) { propOverviewHideHelp(true); e.preventDefault(); return true; }
    if (propOverviewPicker) { propOverviewClosePicker(); e.preventDefault(); return true; }
    return false;
  }
  const p = propOverviewPicker, b = e.target.closest?.('[data-action="prop-overview-day"]');
  if (!p || !b || e.altKey || e.ctrlKey || e.metaKey) return propMonthsKeydown(e);
  const day = b.dataset.day, shift = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  let next = null;
  if (e.key in shift) next = propOverviewShiftDay(day, shift[e.key]);
  else if (e.key === "Home" || e.key === "End") { const weekday = new Date(propOverviewDay(day)).getUTCDay(); next = propOverviewShiftDay(day, e.key === "Home" ? -weekday : 6 - weekday); }
  else if (e.key === "PageUp" || e.key === "PageDown") next = propOverviewShiftMonth(day, (e.key === "PageUp" ? -1 : 1) * (e.shiftKey ? 12 : 1));
  else return false;
  e.preventDefault(); if (!next) return true;
  const index = propOverviewMonthIndex(next);
  if (index < p.month || index > p.month + (window.innerWidth <= 640 ? 0 : 1)) p.month = index;
  if (p.choosingEnd) p.hover = next;
  propOverviewRenderPicker(next); return true;
}

/* Overview, monthly recovery and company fields share one safe tooltip. */
function propOverviewShowHelp(button, pinned = false) {
  if (!propOverviewCanInteract() || !button?.isConnected || propOverviewUI.dismissed === button) return;
  const field = propOverviewHelpField(button);
  const companyText = propCompanyHelpText(field);
  if (!companyText && !["net", "spent", "received", "roi", "trend", "accounts", "recovery"].includes(field)) return;
  if (!propCompanyHelpVisible(button)) return;
  const text = companyText || (field === "recovery" ? button.dataset.propMonthHelpText : T("prop.overview.help." + field));
  if (typeof text !== "string" || !text) return;
  propOverviewClosePicker(false); propOverviewHideHelp();
  const tip = document.createElement("div"); tip.id = "propOverviewTooltip"; tip.className = "propOverviewTooltip" + (field === "recovery" ? " propMonthsRecoveryTip" : companyText ? " propCompanyTip" : ""); tip.setAttribute("role", "tooltip");
  tip.textContent = text; document.body.appendChild(tip);
  const ui = propOverviewUI; ui.tip = tip; ui.active = button; ui.pinned = pinned;
  button.setAttribute("aria-describedby", tip.id); button.classList.add("is-showing");
  propOverviewPosition(tip, button, true);
}
function propOverviewScheduleHide() {
  const ui = propOverviewUI; clearTimeout(ui.closeTimer);
  ui.closeTimer = setTimeout(() => {
    if (!ui.pinned && !ui.overTip && ui.hovered !== ui.active && !(ui.active && document.activeElement === ui.active && ui.active.matches(":focus-visible"))) propOverviewHideHelp();
  }, 160);
}
document.addEventListener("click", e => {
  const b = e.target.closest?.("[data-action]");
  if (b && !b.disabled && propOverviewCanInteract()) {
    const action = b.dataset.action, p = propOverviewPicker;
    if (action === "prop-overview-range") { if (p) propOverviewClosePicker(); else propOverviewOpenPicker(); }
    else if (action === "prop-overview-preset" && p) {
      if (b.dataset.preset !== "custom") propOverviewApply({ preset: b.dataset.preset });
      else { p.preset = "custom"; propOverviewHighlight(); propOverviewUI.panel.querySelector('[data-day][tabindex="0"]')?.focus({ preventScroll: true }); }
    } else if (action === "prop-overview-month" && p) {
      const next = p.month + Number(b.dataset.step);
      if (propOverviewMonthStart(next)) { p.month = next; propOverviewRenderPicker(); propOverviewUI.panel.querySelector(`[data-step="${b.dataset.step}"]`)?.focus({ preventScroll: true }); }
    } else if (action === "prop-overview-day" && p && propOverviewDay(b.dataset.day) !== null) {
      const day = b.dataset.day;
      if (p.choosingEnd) propOverviewApply({ preset: "custom", from: p.start, to: day });
      else { p.start = day; p.end = null; p.hover = null; p.focus = day; p.choosingEnd = true; p.preset = "custom"; propOverviewHighlight(); }
    }
  }
  let help = e.target.closest?.(PROP_OVERVIEW_HELP_SELECTOR);
  if (help) {
    if (userMenuOpen) { const field = propOverviewHelpField(help); userMenuOpen = false; render(); help = propOverviewHelpButton(field); }
    const ui = propOverviewUI;
    if (ui.active === help && ui.pinned) propOverviewHideHelp(true);
    else { ui.dismissed = null; propOverviewShowHelp(help, true); }
  }
});
document.addEventListener("pointerover", e => {
  const ui = propOverviewUI, tip = e.target.closest?.(".propOverviewTooltip");
  if (tip) { ui.overTip = true; clearTimeout(ui.closeTimer); return; }
  const button = e.target.closest?.(PROP_OVERVIEW_HELP_SELECTOR);
  if (button && e.pointerType !== "touch" && !button.contains(e.relatedTarget)) {
    ui.hovered = button; clearTimeout(ui.closeTimer);
    if (ui.active !== button && ui.dismissed !== button) { clearTimeout(ui.openTimer); ui.pending = button; ui.openTimer = setTimeout(() => { if (ui.hovered === button) propOverviewShowHelp(button); }, 180); }
  }
  const day = e.target.closest?.('[data-action="prop-overview-day"]');
  if (day && !day.disabled && propOverviewPicker?.choosingEnd) { propOverviewPicker.hover = day.dataset.day; propOverviewHighlight(); }
});
document.addEventListener("pointerout", e => {
  const ui = propOverviewUI, button = e.target.closest?.(PROP_OVERVIEW_HELP_SELECTOR);
  if (button && !button.contains(e.relatedTarget)) {
    if (ui.hovered === button) ui.hovered = null;
    if (ui.dismissed === button) ui.dismissed = null;
    if (ui.pending === button) { clearTimeout(ui.openTimer); ui.pending = null; }
    propOverviewScheduleHide();
  }
  if (ui.tip?.contains(e.target) && !ui.tip.contains(e.relatedTarget)) { ui.overTip = false; propOverviewScheduleHide(); }
  const months = e.target.closest?.(".propOverviewMonths");
  if (months && !months.contains(e.relatedTarget) && propOverviewPicker?.choosingEnd) { propOverviewPicker.hover = null; propOverviewHighlight(); }
});
document.addEventListener("focusin", e => {
  const b = e.target.closest?.(PROP_OVERVIEW_HELP_SELECTOR);
  if (b && b.matches(":focus-visible")) { propCompanyRevealHelp(b); propOverviewShowHelp(b); }
  if (propOverviewPicker && !propOverviewUI.panel?.contains(e.target) && e.target.id !== "propOverviewRangeTrigger") propOverviewClosePicker(false);
});
document.addEventListener("focusout", e => {
  const ui = propOverviewUI;
  if (e.target === ui.dismissed) ui.dismissed = null;
  if (e.target === ui.active) { ui.pinned = false; propOverviewScheduleHide(); }
});
document.addEventListener("pointerdown", e => {
  const ui = propOverviewUI;
  if (propOverviewPicker && !ui.panel?.contains(e.target) && !e.target.closest?.('[data-action="prop-overview-range"]')) propOverviewClosePicker(false);
  if ((ui.active || ui.pending) && !(ui.active || ui.pending).contains(e.target) && !ui.tip?.contains(e.target)) propOverviewHideHelp();
});
function propOverviewReposition() {
  const ui = propOverviewUI;
  if (!ui.panel && !ui.tip) return;
  if (!propOverviewCanInteract()) { propOverviewCleanup(); return; }
  const anchor = ui.active || document.getElementById("propOverviewRangeTrigger");
  if (!anchor?.isConnected) { propOverviewCleanup(); return; }
  const r = anchor.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight || !propCompanyHelpVisible(anchor)) { propOverviewCleanup(); return; }
  propOverviewPosition(ui.panel || ui.tip, anchor, !!ui.tip);
}
window.addEventListener("resize", () => {
  if (propOverviewPicker) propOverviewRenderPicker(propOverviewPicker.focus);
  propOverviewReposition();
});
window.addEventListener("scroll", propOverviewReposition, true);

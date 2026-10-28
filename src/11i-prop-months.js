/* Modern monthly presentation only. Financial totals remain owned by propMonthly/propSum.
   No fetching, persistence or form mutation. Classic keeps its original renderer. */
function propMonthsIcon(name) {
  const paths = {
    purchase: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/>',
    payout: '<path d="M12 3v12m-4-4 4 4 4-4M5 17v3h14v-3"/>',
    monthly: '<path d="M20 7a8 8 0 0 0-13-2L3 8m0-5v5h5M4 17a8 8 0 0 0 13 2l4-3m0 5v-5h-5"/>',
    reset: '<path d="M3 10a9 9 0 1 1 2.7 8.4M3 4v6h6"/>',
    activation: '<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
    refund: '<path d="m9 3-5 5 5 5M4 8h10a6 6 0 0 1 0 12"/>',
    other: '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2zM9 7h6M9 11h6M9 15h3"/>',
    chart: '<path d="M3 3v18h18M6 15l5-6 4 3 6-7"/>',
    wallet: '<path d="M19 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M21 9h-5a3 3 0 0 0 0 6h5zM16 12h.01"/>',
    percent: '<path d="m19 5-14 14"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>',
  };
  return `<svg class="propMonthsIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${Object.hasOwn(paths, name) ? paths[name] : paths.other}</svg>`;
}
function propMonthsControls() {
  return `<div class="propMonthsLegend"${propMonthLines ? "" : " hidden"} aria-hidden="true"><span><i class="received"></i>${esc(T("prop.month.received"))}</span><span><i class="invested"></i>${esc(T("prop.month.spent"))}</span></div><button type="button" id="propMonthLinesToggle" class="propMonthsToggle" data-action="prop-month-lines" aria-pressed="${propMonthLines}" aria-controls="propMonthsChart">${propMonthsIcon("chart")}<span>${esc(T("prop.monthly." + (propMonthLines ? "hideLines" : "showLines")))}</span></button>`;
}
function renderPropMonthsSummary(year, all, range) {
  const bounded = range && range.preset !== "all";
  let html = `<div class="propMiniLabel">${propMonthsIcon("calendar")}<span>${esc(T(bounded ? "prop.linkage.yearSlice" : "prop.mo.yearSum", { y: propYear }))}</span></div>`;
  [["spent", "purchase"], ["received", "payout"], ["net", "wallet"]].forEach(([key, icon]) => {
    html += `<div class="propMoSumRow${key === "net" ? " big" : ""}"><span class="propMonthsSummaryLabel">${propMonthsIcon(icon)}${esc(T("prop.month." + key))}</span><b class="${key === "net" ? propTone(year.net) : ""}">${propUsd(year[key], key === "net")}</b></div>`;
  });
  if (all.spent > 0) {
    const pct = Math.round(all.received / all.spent * 100), fill = Math.min(100, Math.max(0, pct));
    const label = T("prop.monthly.recovery");
    const help = T("prop.monthly.recoveryHelp", { range: bounded ? `${range.from} – ${range.to}` : T("prop.overview.range.all"), spent: propUsd(all.spent), received: propUsd(all.received), net: propUsd(all.net, true) });
    html += `<div class="propMoBack"><div class="propMoBackHead"><span class="propMonthsRecoveryLabel">${propMonthsIcon("percent")}<span>${esc(label)}</span><button type="button" id="propMonthRecoveryHelp" class="propOverviewHelp" data-prop-month-tip="recovery" data-prop-month-help-text="${esc(help)}" aria-label="${esc(T("prop.overview.helpLabel", { label }))}">${propOverviewIcon("info")}</button></span><b class="propMonthsRecoveryValue">${pct}%</b></div><div class="propMoBackBar" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${fill}" aria-valuetext="${pct}%"><i style="width:${fill}%"></i></div></div>`;
  }
  return html;
}
function renderPropMonthsHeading(title, totals, range) {
  const first = propOverviewMonthStart(propYear * 12 + propMonth - 1);
  const next = propOverviewMonthStart(propYear * 12 + propMonth);
  const last = next ? propOverviewShiftDay(next, -1) : "9999-12-31";
  const dates = propLinkageSlice(range && range.preset !== "all" ? range : { preset: "custom", from: first, to: last }, propYear, propMonth);
  const longAmounts = ["spent", "received", "net"].some(key => propUsd(totals[key], key === "net").length > 12);
  return `<div class="propMonthHead propMonthsHeading"><div class="propMonthsDate"><span class="propMonthsDateIcon">${propMonthsIcon("calendar")}</span><div><h3>${esc(title)}</h3><div class="propMonthsDates" title="${esc(dates)}">${esc(dates.replace(/\b\d{4}-(\d{2})-(\d{2})\b/g, "$1/$2"))}</div></div></div><div class="propMonthsMetrics${longAmounts ? " propMonthsMetricsLong" : ""}">${[["spent", "purchase"], ["received", "payout"], ["net", "wallet"]].map(([key, icon]) => `<div class="propMonthsMetric"><span>${propMonthsIcon(icon)}${esc(T("prop.month." + key))}</span><b class="${key === "net" ? propTone(totals.net) : ""}" data-month-amount="${key}">${propUsd(totals[key], key === "net")}</b></div>`).join("")}</div></div>`;
}
/* A known empty month is zero; an unrecorded future month is not a forecast.
   Actual dated entries may extend coverage beyond today, matching the existing all-time report. */
function propMonthsLineMask(months, year, range, today) {
  let last = propOverviewDay(today) === null ? "" : today.slice(0, 7);
  months.forEach((m, i) => {
    const key = propOverviewMonthStart(year * 12 + i)?.slice(0, 7);
    if (m.n && key > last) last = key;
  });
  return months.map((m, i) => {
    const key = propOverviewMonthStart(year * 12 + i)?.slice(0, 7);
    return !!key && key <= last && propLinkageMonthAllowed(range, year, i + 1);
  });
}
/* Numeric coordinates only, adjacent months only. Straight segments cannot overshoot cash values. */
function propMonthsSeries(points) {
  return ["received", "invested"].map(series => {
    let previous = null, lines = "", dots = "";
    points.forEach(p => {
      const point = p[series];
      if (!Number.isInteger(p.month) || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) { previous = null; return; }
      if (previous && p.month === previous.month + 1) lines += `<line x1="${previous[series].x}" y1="${previous[series].y}" x2="${point.x}" y2="${point.y}"/>`;
      dots += `<circle data-month="${p.month}" cx="${point.x}" cy="${point.y}" r="2.5"/>`;
      previous = p;
    });
    return `<g class="${series}" data-series="${series}">${lines}${dots}</g>`;
  }).join("");
}

const propMonthsUI = { owner: null, chart: null, observer: null, frame: 0, restore: null, scroll: 0, align: false };
function propMonthsViewActive() {
  return currentLayout() === "modern" && tab === "prop" && propView === "overview" && !!session && !authLoading && currentProfile?.active !== false;
}
function propMonthsDetach() {
  const ui = propMonthsUI;
  if (ui.frame) window.cancelAnimationFrame(ui.frame);
  ui.frame = 0; ui.observer?.disconnect(); ui.observer = null;
  ui.chart?.querySelector(".propMonthsOverlay")?.remove(); ui.chart = null;
}
function propMonthsBeforeRender(owner) {
  const ui = propMonthsUI, panel = document.getElementById("propMonthsPanel"), focus = document.activeElement;
  const control = focus?.closest?.('#propMonthsPanel [data-action]');
  ui.restore = control && ["prop-month", "prop-year", "prop-month-lines"].includes(control.dataset.action) ? { action: control.dataset.action, value: control.dataset.m || control.dataset.d || "" } : null;
  ui.scroll = panel?.querySelector(".propMonthsScroll")?.scrollLeft || 0;
  propMonthsDetach();
  if (owner !== ui.owner || !owner || currentLayout() !== "modern" || tab !== "prop" || propView !== "overview") {
    propMonthLines = false; ui.restore = null; ui.scroll = 0;
  }
  ui.owner = owner;
}
function propMonthsBind() {
  const ui = propMonthsUI;
  propMonthsDetach();
  if (!propMonthsViewActive()) return;
  const chart = document.getElementById("propMonthsChart");
  if (!chart || !propMonthLines) return;
  ui.chart = chart;
  if (window.ResizeObserver) {
    ui.observer = new window.ResizeObserver(() => propMonthsSchedule(true));
    ui.observer.observe(chart); ui.observer.observe(chart.parentElement);
  }
  propMonthsSchedule(true);
}
function propMonthsAfterRender() {
  const ui = propMonthsUI, restore = ui.restore; ui.restore = null;
  const panel = document.getElementById("propMonthsPanel");
  if (!propMonthsViewActive() || !panel) return;
  const wrap = panel.querySelector(".propMonthsScroll");
  if (wrap) wrap.scrollLeft = ui.scroll;
  propMonthsBind();
  if (restore && propOverviewCanInteract()) {
    const selector = restore.action === "prop-month-lines" ? "#propMonthLinesToggle" : `[data-action="${restore.action}"][data-${restore.action === "prop-month" ? "m" : "d"}="${restore.value}"]:not(:disabled)`;
    const target = panel.querySelector(selector) || panel.querySelector('.propMoCol.on:not(:disabled)') || panel.querySelector('#propMonthLinesToggle');
    target?.focus({ preventScroll: true });
  }
}
function propMonthsDraw() {
  const ui = propMonthsUI, chart = ui.chart;
  if (!propMonthLines || !propMonthsViewActive() || !chart?.isConnected) { propMonthsDetach(); return; }
  chart.querySelector(".propMonthsOverlay")?.remove();
  if (chart.dataset.hasCash !== "true") return;
  const box = chart.getBoundingClientRect();
  if (!(box.width > 0 && box.height > 0)) return;
  const points = [];
  chart.querySelectorAll('.propMoCol[data-line-point="true"]:not(:disabled)').forEach(col => {
    const up = col.querySelector(".up i").getBoundingClientRect(), down = col.querySelector(".down i").getBoundingClientRect();
    points.push({ month: Number(col.dataset.m), received: { x: up.left + up.width / 2 - box.left, y: up.top - box.top }, invested: { x: down.left + down.width / 2 - box.left, y: (col.querySelector(".propMoRefund") ? down.top : down.bottom) - box.top } });
  });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "propMonthsOverlay"); svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
  svg.setAttribute("aria-hidden", "true"); svg.innerHTML = propMonthsSeries(points); chart.appendChild(svg);
}
function propMonthsSchedule(align = false) {
  const ui = propMonthsUI;
  if (!ui.chart || !propMonthLines) return;
  ui.align = ui.align || align === true;
  if (ui.frame) window.cancelAnimationFrame(ui.frame);
  ui.frame = window.requestAnimationFrame(() => {
    ui.frame = 0;
    if (ui.align && ui.chart?.isConnected) {
      const wrap = ui.chart.parentElement, picked = ui.chart.querySelector(".propMoCol.on");
      if (picked && wrap.scrollWidth > wrap.clientWidth) {
        const a = wrap.getBoundingClientRect(), b = picked.getBoundingClientRect();
        if (b.left < a.left || b.right > a.right) wrap.scrollLeft += b.left - a.left - (wrap.clientWidth - b.width) / 2;
      }
    }
    ui.align = false; propMonthsDraw();
  });
}
function propMonthsToggle() {
  if (!propOverviewCanInteract()) return;
  const panel = document.getElementById("propMonthsPanel"), button = document.getElementById("propMonthLinesToggle");
  if (!panel || !button) return;
  propMonthLines = !propMonthLines;
  panel.classList.toggle("propMonthsLinesOn", propMonthLines);
  panel.querySelector(".propMonthsLegend").hidden = !propMonthLines;
  button.setAttribute("aria-pressed", String(propMonthLines));
  button.querySelector("span").textContent = T("prop.monthly." + (propMonthLines ? "hideLines" : "showLines"));
  propMonthsBind(); // Patch only the chart controls: keep expanded ledger groups and focus intact.
}
function propMonthsKeydown(e) {
  if (!propOverviewCanInteract() || propOverviewPicker || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
  const button = e.target.closest?.('#propMonthsPanel .propMoCol');
  if (!button || button.disabled || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return false;
  const buttons = [...button.parentElement.querySelectorAll('.propMoCol:not(:disabled)')], index = buttons.indexOf(button);
  const next = e.key === "Home" ? buttons[0] : e.key === "End" ? buttons.at(-1) : buttons[Math.max(0, Math.min(buttons.length - 1, index + (e.key === "ArrowRight" ? 1 : -1)))];
  if (!next) return false;
  e.preventDefault(); const month = next.dataset.m; next.click();
  document.querySelector(`#propMonthsPanel [data-action="prop-month"][data-m="${month}"]`)?.focus({ preventScroll: true });
  return true;
}
document.addEventListener("click", e => { if (e.target.closest?.('[data-action="prop-month-lines"]')) propMonthsToggle(); });
window.addEventListener("resize", () => propMonthsSchedule(true));
document.fonts?.ready.then(() => propMonthsSchedule(true));

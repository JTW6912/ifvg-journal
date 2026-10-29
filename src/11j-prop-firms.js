/* Modern company comparison. Consumes the existing renderPropByFirm rows:
   no financial formulas, fetching, persistence or retained private row cache. */
const PROP_COMPANY_SORTS = ["net", "spent", "received", "roi"];
const PROP_COMPANY_FIELDS = ["n", "pass", "spent", "received", "net", "roi"];
function propCompanySorted(rows, key = "net") {
  if (!PROP_COMPANY_SORTS.includes(key)) key = "net";
  return rows.map((row, index) => ({ row, index })).sort((a, b) => {
    const x = a.row.s[key], y = b.row.s[key];
    if (!Number.isFinite(x)) return Number.isFinite(y) ? 1 : a.index - b.index;
    if (!Number.isFinite(y)) return -1;
    return (x < y ? 1 : x > y ? -1 : 0) || a.index - b.index;
  }).map(item => item.row);
}
function propCompanyBar(net, scale) {
  if (!Number.isFinite(net) || !Number.isFinite(scale) || scale <= 0) return { tone: "neutral", width: 0 };
  return { tone: propTone(net) || "neutral", width: Math.min(50, Math.abs(net) / scale * 50) };
}
function propCompanyLogo(name, accounts, catalog) {
  const ids = [...new Set(accounts.filter(a => (a.firm_name || "—") === name).map(a => a.firm_id).filter(Boolean))];
  if (ids.length > 1) return ""; // Stored display names are the grouping key, not catalog IDs.
  const matches = ids.length ? catalog.filter(f => f.id === ids[0]) : catalog.filter(f => f.name === name);
  const logo = matches.length === 1 ? matches[0].logo : null;
  // Existing public local assets only. No external beacon, URL scheme, query or path traversal.
  return typeof logo === "string" && /^\/?img\/prop\/[a-zA-Z0-9_-]+\.(?:webp|svg|png|jpg|jpeg)$/i.test(logo) ? logo : "";
}
function propCompanyIcon(name) {
  const path = name === "sort" ? '<path d="M4 6h16M4 12h11M4 18h6"/>' : '<rect x="4" y="3" width="12" height="18" rx="2"/><path d="M16 9h4v12H4M8 7h4M8 11h4M8 15h4m-2 3v3"/>';
  return `<svg class="propCompanyIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
function propCompanyHelpField(button) {
  const field = button?.dataset?.propCompanyTip;
  return PROP_COMPANY_FIELDS.includes(field) ? "company-" + field : null;
}
function propCompanyHelpButton(field) {
  const key = typeof field === "string" ? field.replace(/^company-/, "") : "";
  return field === "company-" + key && PROP_COMPANY_FIELDS.includes(key) ? document.getElementById("propCompanyHelp-" + key) : null;
}
function propCompanyHelpText(field) {
  const key = typeof field === "string" ? field.replace(/^company-/, "") : "";
  return field === "company-" + key && PROP_COMPANY_FIELDS.includes(key) ? T("prop.company.help." + key) : null;
}
function propCompanyHeading(field, label) {
  const sort = PROP_COMPANY_SORTS.includes(propCompanySort) ? propCompanySort : "net";
  return `<th scope="col" data-company-column="${field}"${field === sort ? ' aria-sort="descending"' : ""}><span class="propCompanyColumn"><span>${esc(label)}</span><button type="button" id="propCompanyHelp-${field}" class="propOverviewHelp" data-prop-company-tip="${field}" aria-label="${esc(T("prop.overview.helpLabel", { label }))}">${propOverviewIcon("info")}</button></span></th>`;
}
function renderPropCompanyTable(rows, accounts, range) {
  const sort = PROP_COMPANY_SORTS.includes(propCompanySort) ? propCompanySort : "net";
  const scale = rows.reduce((max, r) => Number.isFinite(r.s.net) ? Math.max(max, Math.abs(r.s.net)) : max, 1);
  const indexed = rows.map((r, index) => ({ ...r, index }));
  const body = propCompanySorted(indexed, sort).map(r => {
    const logo = propCompanyLogo(r.name, accounts, propFirms);
    const initials = String(r.name).trim().split(/\s+/).slice(0, 2).map(s => Array.from(s)[0] || "").join("").toUpperCase() || "?";
    const bar = propCompanyBar(r.s.net, scale), rate = r.f.passRate;
    const pass = Number.isFinite(rate) ? rate.toFixed(0) + "%" : "—";
    const values = PROP_COMPANY_SORTS.map(key => ` data-company-${key}="${Number.isFinite(r.s[key]) ? r.s[key] : ""}"`).join("");
    return `<tr data-company-index="${r.index}"${values}><th scope="row"><div class="propCompanyIdentity"><span class="propCompanyMark"><span class="propCompanyInitials"${logo ? " hidden" : ""}>${esc(initials)}</span>${logo ? `<img src="${esc(logo)}" alt="" loading="lazy" width="34" height="34">` : ""}</span><span class="propCompanyName">${esc(r.name)}</span></div></th>
      <td data-field="n"><span class="propCompanyCount">${r.n}</span></td><td data-field="pass"><div class="propCompanyPass"><span class="propCompanyValue">${pass}</span><span class="propCompanyPassTrack" aria-hidden="true" data-pass="${Number.isFinite(rate) ? rate : ""}"${Number.isFinite(rate) ? "" : " hidden"}><i style="width:${Number.isFinite(rate) ? Math.max(0, Math.min(100, rate)) : 0}%"></i></span></div></td>
      <td data-field="spent"><span class="propCompanyValue">${propUsd(r.s.spent)}</span></td><td data-field="received"><span class="propCompanyValue">${propUsd(r.s.received)}</span></td>
      <td data-field="net" class="propCompanyNet"><span class="propCompanyValue" data-tone="${bar.tone}">${propUsd(r.s.net, true)}</span><div class="propCompanyNetTrack" aria-hidden="true" data-scale="${scale}">${bar.width ? `<i data-tone="${bar.tone}" style="width:${bar.width}%"></i>` : ""}</div></td>
      <td data-field="roi" class="propCompanyROI"><span class="propCompanyValue" data-tone="${propTone(r.s.roi || 0) || "neutral"}">${propPct(r.s.roi)}</span></td></tr>`;
  }).join("");
  const label = T("prop.firm.title");
  return `<section id="propCompanyPanel" class="calendarPanel propPanel propCompany" aria-label="${esc(label)}"><header class="propCompanyHead"><div class="propCompanyTitle">${propCompanyIcon("firm")}<h2>${esc(label)}</h2><span class="propCompanyTotal" aria-label="${esc(T("prop.company.count", { n: rows.length }))}">${rows.length}</span></div><div class="propCompanyTools">${range ? `<span class="propCompanyPeriod">${ICONS.calendar}${esc(propOverviewRangeText(range))}</span>` : ""}<label class="propCompanySort">${propCompanyIcon("sort")}<select id="propCompanySort" aria-label="${esc(T("prop.company.sort"))}"${rows.length < 2 ? " disabled" : ""}>${PROP_COMPANY_SORTS.map(key => `<option value="${key}"${key === sort ? " selected" : ""}>${esc(T("prop.company.sort." + key))}</option>`).join("")}</select></label></div></header>
    <div id="propCompanyScroll" class="propCompanyScroll" tabindex="0" role="region" aria-label="${esc(label)}"><table class="propCompanyTable"><thead><tr><th scope="col">${esc(T("prop.col.firm"))}</th>${propCompanyHeading("n", T("prop.col.accounts"))}${propCompanyHeading("pass", T("prop.col.passRate"))}${propCompanyHeading("spent", T(range && range.preset !== "all" ? "prop.overview.spentRange" : "prop.stat.spent"))}${propCompanyHeading("received", T("prop.stat.received"))}${propCompanyHeading("net", T("prop.stat.net"))}${propCompanyHeading("roi", "ROI")}</tr></thead><tbody>${body}</tbody></table></div><p class="propCompanyScrollHint">${esc(T("prop.company.scroll"))}</p></section>`;
}

/* Lifecycle stores only owner identity, a control ID and scroll offset, never row data. */
const propCompanyUI = { owner: null, scroll: 0, restore: null };
function propCompanyBeforeRender(owner) {
  const ui = propCompanyUI;
  ui.scroll = document.getElementById("propCompanyScroll")?.scrollLeft || 0;
  ui.restore = ["propCompanySort", "propCompanyScroll"].includes(document.activeElement?.id) ? document.activeElement.id : null;
  if (!owner || owner !== ui.owner || currentLayout() !== "modern" || tab !== "prop" || propView !== "overview") {
    propCompanySort = "net"; ui.scroll = 0; ui.restore = null;
  }
  ui.owner = owner;
}
function propCompanyAfterRender() {
  const ui = propCompanyUI, restore = ui.restore; ui.restore = null;
  const wrap = document.getElementById("propCompanyScroll");
  if (!wrap) return;
  wrap.scrollLeft = ui.scroll;
  if (restore && propOverviewCanInteract()) document.getElementById(restore)?.focus({ preventScroll: true });
}
function propCompanyCanSort() {
  return propOverviewCanInteract() && !propOverviewPicker && !acctPopOpen && !pbNameModal && !dayDetailDate && !tradePreviewId && !comboGroupModal && !reviewGroupModal;
}
function propCompanyChangeSort(key) {
  if (!PROP_COMPANY_SORTS.includes(key) || !propCompanyCanSort()) return;
  const panel = document.getElementById("propCompanyPanel"), select = document.getElementById("propCompanySort");
  if (!panel || !select || select.disabled) return;
  const body = panel.querySelector("tbody"), nodes = [...body.children];
  // Original net order is stable across repeated alternative sorts, independent of current DOM order.
  const rows = nodes.map(node => ({ node, index: Number(node.dataset.companyIndex), s: Object.fromEntries(PROP_COMPANY_SORTS.map(k => [k, node.dataset["company" + k[0].toUpperCase() + k.slice(1)] === "" ? null : Number(node.dataset["company" + k[0].toUpperCase() + k.slice(1)])])) })).sort((a, b) => a.index - b.index);
  propCompanySort = key; select.value = key;
  propOverviewHideHelp();
  const wrap = document.getElementById("propCompanyScroll"), scroll = wrap.scrollLeft;
  propCompanySorted(rows, key).forEach(row => body.appendChild(row.node));
  panel.querySelectorAll("[data-company-column]").forEach(th => { if (th.dataset.companyColumn === key) th.setAttribute("aria-sort", "descending"); else th.removeAttribute("aria-sort"); });
  wrap.scrollLeft = scroll; // No render(), table replacement, sibling mutation or focus change.
}
function propCompanyClip(button) {
  const wrap = button?.closest?.(".propCompanyScroll");
  if (!wrap) return null;
  const clip = wrap.getBoundingClientRect(), first = wrap.querySelector("thead th:first-child");
  const fixed = first && window.getComputedStyle(first).position === "sticky";
  return { wrap, left: Math.max(clip.left, fixed ? first.getBoundingClientRect().right : clip.left), right: Math.min(clip.right, window.innerWidth) };
}
function propCompanyRevealHelp(button) {
  const clip = propCompanyClip(button);
  if (!clip) return;
  const r = button.getBoundingClientRect();
  if (r.left < clip.left + 4) clip.wrap.scrollLeft += r.left - clip.left - 4;
  else if (r.right > clip.right - 4) clip.wrap.scrollLeft += r.right - clip.right + 4;
}
function propCompanyHelpVisible(button) {
  const clip = propCompanyClip(button);
  if (!clip) return true;
  const r = button.getBoundingClientRect();
  return r.left >= clip.left && r.right <= clip.right;
}
document.addEventListener("change", e => { if (e.target.id === "propCompanySort") propCompanyChangeSort(e.target.value); });
document.addEventListener("error", e => {
  const img = e.target;
  if (!img.matches?.(".propCompanyMark img")) return;
  img.hidden = true;
  const fallback = img.previousElementSibling;
  if (fallback?.classList.contains("propCompanyInitials")) fallback.hidden = false;
}, true);

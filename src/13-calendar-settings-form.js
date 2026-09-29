/* ============================================================
   RENDER — CALENDAR VIEW
   ============================================================ */
function renderMonthBar() {
  let html = `<div class="calendarPanel">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <div class="sectionLabel" style="margin:0;padding:0;border:none;">⟦ ${esc(T("calendar.monthOverview"))} ⟧</div>
    <div style="display:flex;align-items:center;gap:14px;">
      <button class="tinyBtn" data-action="calendar-prev-year" style="font-size:20px;line-height:1;">‹</button>
      <div class="monthYear" style="margin-bottom:0;">${calendarYear}</div>
      <button class="tinyBtn" data-action="calendar-next-year" style="font-size:20px;line-height:1;">›</button>
    </div>
  </div>
  <div class="monthBar">`;
  let ytdR = 0, ytdHasR = false, ytdCount = 0;
  for (let m = 1; m <= 12; m++) {
    const stats = aggregateTradeStats(tradesInMonth(calendarYear, m));
    if (stats.hasR) { ytdR += stats.rSum; ytdHasR = true; }
    ytdCount += stats.count;
    const tone = stats.count > 0 ? stats.tone : "";
    html += `<button class="monthBarCell ${tone} ${calendarMonth === m ? "current" : ""}" data-action="jump-to-month" data-month="${m}">
      <div class="monthBarLabel">${esc(new Date(2000, m - 1, 1).toLocaleString(localeTag(), { month: "short" }))}</div>
      ${stats.count > 0 ? `<div class="monthBarValue">${stats.hasR ? fmtNum(stats.rSum) + "R" : T("calendar.winLoss", { w: stats.w, l: stats.l })}${stats.wr !== null ? ` · ${fmtPct(stats.wr)}` : ""}</div>` : ""}
    </button>`;
  }
  const ytdTone = ytdHasR ? (ytdR > 0.0001 ? "pos" : ytdR < -0.0001 ? "neg" : "neutral") : "";
  html += `<div class="monthBarCell ${ytdTone}" style="cursor:default;">
    <div class="monthBarLabel">YTD</div>
    ${ytdCount > 0 ? `<div class="monthBarValue">${ytdHasR ? fmtNum(ytdR) + "R" : ""}</div>` : ""}
  </div></div></div>`;
  return html;
}
function renderDayCalendar() {
  const year = calendarYear, month = calendarMonth;
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadBlanks = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const totalCells = Math.ceil((leadBlanks + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(year, month - 1, 1 - leadBlanks + i);
    cells.push({
      day: d.getDate(),
      inMonth: d.getMonth() === month - 1 && d.getFullYear() === year,
      dateStr: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"),
    });
  }

  let weeksHtml = "";
  for (let w = 0; w < cells.length; w += 7) {
    const weekCells = cells.slice(w, w + 7);
    weeksHtml += weekCells.map((c) => {
      if (!c.inMonth) return `<div class="dayCell outMonth"><div class="dayCellNum">${c.day}</div></div>`;
      const stats = aggregateTradeStats(tradesOnDate(c.dateStr));
      const tone = stats.count > 0 ? stats.tone : "";
      return `<div class="dayCell ${tone}" data-action="open-day-detail" data-date="${c.dateStr}">
        <div class="dayCellNum">${c.day}</div>
        ${stats.count > 0 ? `<div class="dayCellInfo">${esc(T("dayDetail.summary", { n: stats.count }))}${stats.hasR ? `<br>${fmtNum(stats.rSum)}R${stats.wr !== null ? ` · ${fmtPct(stats.wr)}` : ""}` : ""}</div>` : ""}
      </div>`;
    }).join("");
    const weekStats = aggregateTradeStats(weekCells.flatMap((c) => tradesOnDate(c.dateStr)));
    const weekTone = weekStats.count > 0 ? weekStats.tone : "";
    weeksHtml += `<div class="weekCell ${weekTone}">
      ${weekStats.count > 0 ? `<div class="weekCellInfo">${weekStats.hasR ? fmtNum(weekStats.rSum) + "R" : T("calendar.winLoss", { w: weekStats.w, l: weekStats.l })}${weekStats.wr !== null ? ` · ${fmtPct(weekStats.wr)}` : ""}</div>` : `<div class="weekCellInfo muted">—</div>`}
    </div>`;
  }

  let html = `<div class="calendarPanel" id="day-calendar-top">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <div class="sectionLabel" style="margin:0;padding:0;border:none;">⟦ ${esc(T("calendar.dayDetail"))} ⟧</div>
    <div style="display:flex;align-items:center;gap:14px;">
      <button class="tinyBtn" data-action="cal-prev-month" style="font-size:20px;line-height:1;">‹</button>
      <div class="monthYear" style="margin-bottom:0;">${esc(new Date(year, month - 1, 1).toLocaleString(localeTag(), { year: "numeric", month: "long" }))}</div>
      <button class="tinyBtn" data-action="cal-next-month" style="font-size:20px;line-height:1;">›</button>
    </div>
  </div>
  <div class="dayGrid">
    ${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => `<div class="dayGridHead">${esc(T("calendar.week" + d))}</div>`).join("")}<div class="dayGridHead">${esc(T("calendar.thisWeek"))}</div>
    ${weeksHtml}
  </div></div>`;
  return html;
}
function renderHistoryCoverage(list) {
  const statusLabel = { complete: T("coverage.complete"), partial: T("coverage.partial"), empty: T("coverage.empty") };
  const curYear = new Date().getFullYear();
  // 筛选面板给什么，这里就统计什么。这段覆盖度回答的是「我要的这种信号，
  // 哪些月份真的回测过」，而不是「哪些月份我随便写过一笔」——后者在筛选后没意义
  const src = list || trades;
  const filterCount = countFilterConditions(activeFilters);
  let html = `<div class="calendarPanel" style="margin-top:20px;">
  <div class="sectionLabel" style="margin:0 0 12px;padding:0;border:none;">⟦ ${esc(T("coverage.title", { year: curYear }))} ⟧</div>
  <div style="font-size:12.5px;color:var(--muted);margin-bottom:${filterCount ? 10 : 20}px;line-height:1.7;">
    ${T("coverage.rule")}</div>`;
  if (filterCount) {
    html += `<div class="coverageScope">${esc(T("coverage.filtered", { n: filterCount, count: src.length }))}</div>`;
  }
  for (let y = curYear; y >= 2020; y--) {
    const monthsData = computeMonthCoverageForYear(y, src);
    const yearCount = Object.values(monthsData).reduce((a, m) => a + m.count, 0);
    const done = Object.values(monthsData).filter((m) => m.status === "complete").length;
    html += `<div class="monthYear">${y}<span class="coverageYearMeta">${esc(T("coverage.yearMeta", { done, count: yearCount }))}</span></div><div class="monthGrid">`;
    for (let i = 1; i <= 12; i++) {
      const mo = String(i).padStart(2, "0");
      const m = monthsData[mo];
      const isSelected = calendarYear === y && calendarMonth === i;
      html += `<div class="monthCell ${m.status} ${isSelected ? "selected" : ""}" data-action="jump-to-history-month" data-year="${y}" data-month="${i}" style="cursor:pointer;" title="${esc(T("coverage.cellTitle", { n: m.count }))}"><div class="monthCellDate">${y}-${mo}</div><div class="monthCellStatus">${statusLabel[m.status]}${m.status !== "empty" ? ` · ${m.count}` : ""}</div></div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}
function renderCalendar() {
  const dateF = roleField("date");
  if (!dateF) return `<div class="notice">${ICONS.alert}<span>${T("calendar.noDateRole")}</span></div>`;
  const filtered = trades.filter((t) => tradeMatchesFilters(t, activeFilters));
  let html = renderFilterOriginBanner() + `<div style="margin-bottom:22px;">${renderFilterPanel(filtered.length, filtered)}</div>`;
  html += `<div style="margin-bottom:22px;">${renderMonthBar()}</div><div style="margin-bottom:22px;">${renderDayCalendar()}</div>`;
  if (recordMode === "backtest") html += renderHistoryCoverage(filtered);
  return html;
}

/* ============================================================
   RENDER — SETTINGS VIEW
   ============================================================ */
function renderAdminPanel() {
  const cfg = currentApiConfig();
  const usingStored = !!getStoredApiConfig();
  let html = `<div class="settingsRow" style="border-color:var(--accent);">
      <div class="settingsRowHead" style="cursor:default;">
        <div style="flex:1;"><span class="mono" style="font-size:13.5px;color:var(--accent);">${T("admin.supabaseTitle")}</span>
        <span class="fieldTypeTag">${esc(usingStored ? T("admin.usingStored") : T("admin.usingFile"))}</span></div>
      </div>
      <div class="settingsRowBody open">
        <div class="field"><div class="fieldLabel">Project URL</div><input class="input" id="apiUrlInput" placeholder="https://xxxx.supabase.co" value="${esc(cfg.url)}" /></div>
        <div class="field"><div class="fieldLabel">Publishable / anon key</div><input class="input" id="apiKeyInput" placeholder="sb_publishable_..." value="${esc(cfg.key)}" /></div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary" data-action="save-api-config">${T("admin.saveReconnect")}</button>
          ${usingStored ? `<button class="btn" data-action="reset-api-config">${T("admin.resetApi")}</button>` : ""}
        </div>
        <div style="font-size:11px;color:var(--mutedDark);margin-top:8px;">${T("admin.apiHint")}</div>
      </div>
    </div>

    <div class="settingsRow" style="border-color:var(--accent);">
      <div class="settingsRowHead" data-action="toggle-settings-row" data-id="__admin_users__">
        <div style="flex:1;"><span class="mono" style="font-size:13.5px;color:var(--accent);">${T("admin.usersTitle")}</span>
        <span class="fieldTypeTag">${esc(adminUsers === null ? T("admin.clickToLoad") : T("admin.userCount", { n: adminUsers.length }))}</span></div>
        ${openSettingsRow === "__admin_users__" ? ICONS.chevUp : ICONS.chevDown}
      </div>
      <div class="settingsRowBody ${openSettingsRow === "__admin_users__" ? "open" : ""}">
        ${adminUsers === null
          ? `<div style="font-size:12px;color:var(--mutedDark);">${T("admin.autoLoad")}</div>`
          : `<div style="overflow-x:auto;"><table class="adminTable"><thead><tr><th>${esc(T("admin.colEmail"))}</th><th>${esc(T("admin.colName"))}</th><th>${esc(T("admin.colRole"))}</th><th>${esc(T("admin.colStatus"))}</th>${["tradeCount", "last_seen_at", "created_at"].map((key, i) => {
                const label = [T("admin.colTrades"), T("admin.colLastSeen"), T("admin.colCreated")][i];
                const active = adminUsersSortBy === key;
                const arrow = active ? (adminUsersSortDir === "asc" ? " ▲" : " ▼") : "";
                return `<th data-action="sort-admin-users" data-key="${key}" style="cursor:pointer;user-select:none;${active ? "color:var(--accent);" : ""}">${label}${arrow}</th>`;
              }).join("")}<th></th></tr></thead><tbody>
              ${sortAdminUsers(adminUsers).map((u) => `<tr>
                <td>${esc(u.email)}</td>
                <td>${esc(u.display_name || "—")}</td>
                <td><span class="pill ${u.role === "admin" ? "on" : ""}">${esc(u.role)}</span></td>
                <td><span class="pill ${u.active ? "on" : "off"}">${esc(u.active ? T("admin.active") : T("admin.disabled"))}</span></td>
                <td class="mono">${u.tradeCount !== undefined ? u.tradeCount : "—"}</td>
                <td class="mono" style="font-size:11px;color:var(--mutedDark);">${u.last_seen_at ? esc(new Date(u.last_seen_at).toLocaleString(localeTag(), { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })) : esc(T("admin.neverLoggedIn"))}</td>
                <td class="mono" style="font-size:11px;color:var(--mutedDark);">${esc(String(u.created_at || "").slice(0, 10))}</td>
                <td style="white-space:nowrap;">
                  <button class="tinyBtn" data-action="toggle-user-active" data-id="${esc(u.id)}" data-next="${!u.active}" style="color:${u.active ? "var(--neg)" : "var(--pos)"};margin-right:10px;">${esc(u.active ? T("admin.disable") : T("admin.enable"))}</button>
                  <button class="tinyBtn" data-action="toggle-user-role" data-id="${esc(u.id)}" data-next="${u.role === "admin" ? "user" : "admin"}" style="color:var(--accent);margin-right:10px;">${esc(u.role === "admin" ? T("admin.removeAdmin") : T("admin.makeAdmin"))}</button>
                  ${u.id !== session.user.id ? `<button class="tinyBtn" data-action="view-user-data" data-id="${esc(u.id)}" data-email="${esc(u.email)}" style="color:var(--accent);">${ICONS.expand} ${T("admin.viewData")}</button>` : ""}
                </td>
              </tr>`).join("")}
            </tbody></table></div>
            <div style="font-size:11px;color:var(--mutedDark);margin-top:10px;">${T("admin.disableHint")}</div>`
        }
      </div>
    </div>`;
  return html;
}
function renderSettings() {
  if (viewingUserId) {
    return `<div style="font-size:12.5px;color:var(--muted);margin-bottom:16px;line-height:1.7;">
      ${esc(T("settings.readOnlyNote", { email: viewingUserEmail }))}</div>
      ${schema.map((f) => `<div class="settingsRow${f.hidden ? " isHidden" : ""}" style="cursor:default;">
        <div class="settingsRowHead" style="cursor:default;">
          <div style="flex:1;">
            <span class="mono" style="font-size:13.5px;color:${f.hidden ? "var(--mutedDark)" : "var(--text)"};">${esc(f.label)}</span>
            <span class="fieldTypeTag">${esc(fieldTypeLabel(f.type))}</span>
            ${f.role ? `<span class="fieldRoleTag">· ${esc(roleLabel(f.role))}</span>` : ""}
            ${f.hidden ? `<span class="fieldHiddenTag">${esc(T("settings.hiddenTag"))}</span>` : ""}
          </div>
        </div>
        ${(f.options && f.options.length) ? `<div class="settingsRowBody open"><div class="chipGroup">${f.options.map((o) => `<span class="chip">${esc(o)}</span>`).join("")}</div></div>` : ""}
      </div>`).join("")}`;
  }
  let html = `<div style="font-size:12.5px;color:var(--muted);margin-bottom:16px;line-height:1.7;">
    ${T("settings.fieldsHint")}</div>`;
  schema.forEach((f, i) => {
    const open = openSettingsRow === f.id;
    html += `<div class="settingsRow${f.hidden ? " isHidden" : ""}" draggable="${open ? "false" : "true"}" data-field-idx="${i}">
      <div class="settingsRowHead" data-action="toggle-settings-row" data-id="${esc(f.id)}">
        <span class="dragHandle" title="${esc(T("common.dragToReorder"))}">⠿</span>
        <div style="flex:1;">
          <span class="mono" style="font-size:13.5px;color:${f.hidden ? "var(--mutedDark)" : "var(--text)"};">${esc(f.label)}</span>
          <span class="fieldTypeTag">${esc(fieldTypeLabel(f.type))}</span>
          ${f.role ? `<span class="fieldRoleTag">· ${esc(roleLabel(f.role))}</span>` : ""}
          ${f.hidden ? `<span class="fieldHiddenTag">${esc(T("settings.hiddenTag"))}</span>` : ""}
        </div>
        ${open ? ICONS.chevUp : ICONS.chevDown}
      </div>
      <div class="settingsRowBody ${open ? "open" : ""}">
        <div class="field"><div class="fieldLabel">${T("settings.fieldName")}</div><input class="input" data-field-edit="label" data-id="${esc(f.id)}" value="${esc(f.label)}" /></div>
        <div class="field"><div class="fieldLabel">${T("settings.type")}</div>
          <select class="input" data-field-edit="type" data-id="${esc(f.id)}">
            ${fieldTypes().map((ft) => `<option value="${ft.value}" ${f.type === ft.value ? "selected" : ""}>${esc(ft.label)}</option>`).join("")}
          </select></div>
        <div class="field"><div class="fieldLabel">${T("settings.role")}</div>
          <select class="input" data-field-edit="role" data-id="${esc(f.id)}">
            ${roleOptions().map((r) => `<option value="${r.value}" ${(f.role || "") === r.value ? "selected" : ""}>${esc(r.label)}</option>`).join("")}
          </select></div>
        ${(f.type === "select" || f.type === "multiselect") ? `
        <div class="field"><div class="fieldLabel">${T("settings.optionPool")}</div>
          <div id="optpool-${esc(f.id)}">${(f.options || []).map((o, oi) => `<span class="tagChip" draggable="true" data-opt-field="${esc(f.id)}" data-opt-idx="${oi}" style="cursor:grab;">⠿ ${esc(o)}<span data-action="remove-option" data-id="${esc(f.id)}" data-opt="${esc(o)}">${ICONS.x}</span></span>`).join("")}</div>
          <div class="addOptRow"><input class="input" id="optdraft-${esc(f.id)}" placeholder="${esc(T("settings.newOptionPlaceholder"))}" />
          <button class="btn" data-action="add-option" data-id="${esc(f.id)}">${T("common.add")}</button></div>
        </div>` : ""}
        <div class="fieldHiddenBox">
          <div class="fieldHiddenText">${esc(f.hidden ? T("settings.hiddenOnDesc") : T("settings.hiddenOffDesc"))}</div>
          <button class="btn" data-action="toggle-field-hidden" data-id="${esc(f.id)}">
            ${f.hidden ? T("settings.unhideField") : T("settings.hideField")}</button>
        </div>
        <button class="btn btn-danger" data-action="delete-field" data-id="${esc(f.id)}">${ICONS.trash} ${T("settings.deleteField")}</button>
      </div>
    </div>`;
  });
  html += `<div class="addFieldBox">
    <div class="dashLabel">${esc(T("settings.addFieldTitle"))}</div>
    <div class="field"><div class="fieldLabel">${T("settings.fieldName")}</div><input class="input" id="newFieldLabel" placeholder="${esc(T("settings.newFieldPlaceholder"))}" /></div>
    <div class="field"><div class="fieldLabel">${T("settings.type")}</div>
      <select class="input" id="newFieldType">${fieldTypes().map((ft) => `<option value="${ft.value}">${esc(ft.label)}</option>`).join("")}</select></div>
    <div class="field"><div class="fieldLabel">${T("settings.initialOptions")}</div><input class="input" id="newFieldOpts" placeholder="yes, no, maybe" /></div>
    <button class="btn btn-primary" data-action="add-field">${ICONS.plus} ${T("settings.addField")}</button>
  </div>`;
  return html;
}

/* ============================================================
   RENDER — TRADE FORM MODAL
   ============================================================ */
let formDraft = {};
function chipGroupHtml(field, valueArr, multi) {
  const arr = multi ? (valueArr || []) : null;
  const single = multi ? null : (valueArr || "");
  let html = `<div class="chipGroup" id="chipgroup-${esc(field.id)}">`;
  (field.options || []).forEach((opt) => {
    const active = multi ? arr.includes(opt) : single === opt;
    html += `<button type="button" class="chip ${active ? "active" : ""}" data-action="toggle-chip" data-field="${esc(field.id)}" data-opt="${esc(opt)}" data-multi="${multi}">${esc(opt)}</button>`;
  });
  html += `</div>`;
  return html;
}
function fieldInputHtml(field) {
  const val = formDraft[field.id];
  switch (field.type) {
    case "select": return chipGroupHtml(field, val, false);
    case "multiselect": return chipGroupHtml(field, val, true);
    case "textarea": return `<textarea class="input" rows="${field.id === "notes" ? 4 : 3}" data-form-field="${esc(field.id)}">${esc(val || "")}</textarea>`;
    case "number": return `<input type="number" step="0.01" class="input" data-form-field="${esc(field.id)}" value="${esc(val ?? "")}" />`;
    case "date": return `<input type="date" class="input" data-form-field="${esc(field.id)}" value="${esc(val || "")}" />`;
    case "time": return `<input type="time" class="input" data-form-field="${esc(field.id)}" value="${esc(val || "")}" />`;
    case "url":
      return `<input type="text" class="input" placeholder="https://…" data-form-field="${esc(field.id)}" value="${esc(val || "")}" oninput="window.__updateUrlPreview('${esc(field.id)}', this.value)" />
        <div id="urlpreview-${esc(field.id)}">${urlPreviewHtml(val)}</div>`;
    default: return `<input type="text" class="input" data-form-field="${esc(field.id)}" value="${esc(val || "")}" />`;
  }
}
function urlPreviewHtml(val) {
  if (!val || !/^https?:\/\//.test(val)) return "";
  return `<div class="thumbWrap"><img class="thumb" src="${esc(imgSrc(val))}" referrerpolicy="no-referrer" data-fallback-url="${esc(imgSrc(val))}" data-fallback-class="thumbFallback" onerror="window.__imgFallback(this)" /></div><div class="thumbHint">${T("modal.urlPreviewHint")}</div>`;
}
window.__updateUrlPreview = function (fieldId, val) {
  formDraft[fieldId] = val;
  const box = document.getElementById("urlpreview-" + fieldId);
  if (box) box.innerHTML = urlPreviewHtml(val);
};
function timeDigitsToDisplay(digits) {
  digits = digits.slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, digits.length - 2) + ":" + digits.slice(-2);
}
window.__formatTimeInput = function (el) {
  const pos = el.selectionStart;
  const before = el.value.length;
  const digits = el.value.replace(/\D/g, "").slice(0, 4);
  el.value = timeDigitsToDisplay(digits);
  const after = el.value.length;
  const newPos = Math.max(0, (pos || after) + (after - before));
  try { el.setSelectionRange(newPos, newPos); } catch (e) {}
};
function normalizeTimeValue(raw) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 4);
  if (!digits) return "";
  const h = digits.length <= 2 ? digits : digits.slice(0, digits.length - 2);
  const m = digits.length <= 2 ? "0" : digits.slice(-2);
  const hn = Math.min(23, parseInt(h, 10) || 0);
  const mn = Math.min(59, parseInt(m, 10) || 0);
  return String(hn).padStart(2, "0") + ":" + String(mn).padStart(2, "0");
}
const IMG_RETRY_DELAYS = [700, 1800]; // ms — a couple of short backoffs before giving up
window.__imgFallback = function (imgEl) {
  const url = imgEl.dataset.fallbackUrl || "";
  const retryCount = parseInt(imgEl.dataset.retryCount || "0", 10);
  if (retryCount < IMG_RETRY_DELAYS.length) {
    imgEl.dataset.retryCount = String(retryCount + 1);
    const sep = url.includes("?") ? "&" : "?";
    setTimeout(() => {
      if (!imgEl.isConnected) return;
      imgEl.src = url + sep + "_retry=" + Date.now();
    }, IMG_RETRY_DELAYS[retryCount]);
    return;
  }
  const originalImgHtml = imgEl.outerHTML;
  const wrap = document.createElement("div");
  wrap.className = imgEl.dataset.fallbackClass || "thumbFallback";
  const iconSpan = document.createElement("span");
  iconSpan.innerHTML = ICONS.camera;
  if (iconSpan.firstElementChild) { iconSpan.firstElementChild.style.width = "16px"; iconSpan.firstElementChild.style.height = "16px"; }
  wrap.appendChild(iconSpan);
  const label = document.createElement("span");
  label.textContent = T("image.loadFailed");
  wrap.appendChild(label);
  const linkRow = document.createElement("div");
  linkRow.style.display = "flex";
  linkRow.style.gap = "8px";
  const retryLink = document.createElement("a");
  retryLink.href = "#";
  retryLink.textContent = T("image.retry");
  retryLink.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const tmp = document.createElement("div");
    tmp.innerHTML = originalImgHtml;
    const freshImg = tmp.firstElementChild;
    freshImg.removeAttribute("data-retry-count");
    wrap.replaceWith(freshImg);
  });
  linkRow.appendChild(retryLink);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = T("image.openInNewTab");
  a.addEventListener("click", (e) => e.stopPropagation());
  linkRow.appendChild(a);
  wrap.appendChild(linkRow);
  imgEl.replaceWith(wrap);
};
let modalRenderedForId = null;
function renderModal(force) {
  const root = document.getElementById("modalRoot");
  if (!editingTrade) { modalRenderedForId = null; root.innerHTML = ""; return; }
  if (!force && modalRenderedForId === editingTrade.id) return; // already showing this trade — don't wipe unsaved input
  modalRenderedForId = editingTrade.id;
  formDraft = { ...editingTrade };
  const isNew = editingTrade._isNew;
  const resumedDraft = editingTrade._resumedDraft;
  const readOnly = !!viewingUserId;
  /* 停用字段在录入表单里不出现——新单在这些字段上就是留空，正是「以后不填了」要的效果。
     但改**老**交易是另一回事：那时候填过的值还在库里，表单要是一律不显示，
     这笔数据就变成只能看不能改的死值（想修个错别字都得去 Supabase 后台）。
     所以：填过的停用字段照样翻出来，只是折到底下单独一段，跟在录的字段分开摆。*/
  const activeF = activeSchema();
  const legacyF = isNew ? [] : schema.filter((f) => f.hidden && hasFieldValue(editingTrade, f));
  const fieldHtml = (f) => `<div class="field"><div class="fieldLabel">${esc(f.label)}</div>${fieldInputHtml(f)}</div>`;
  root.innerHTML = `<div class="overlay">
    <div class="modal">
      <div class="modalHead"><div class="display" style="font-size:17px;font-weight:600;">${readOnly ? T("modal.viewTrade") : isNew ? T("common.newTrade") : T("modal.editTrade")}</div>
        <button class="iconBtn" data-action="close-modal">${ICONS.x}</button></div>
      ${resumedDraft ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 22px;background:var(--accentSoft);border-bottom:1px solid var(--border);font-size:12.5px;color:var(--accent);">
        <span>${T("modal.draftRestored")}</span>
        <button class="tinyBtn" data-action="clear-draft" style="color:var(--accent);text-decoration:underline;">${T("modal.clearDraft")}</button>
      </div>` : ""}
      <div class="modalBody ${readOnly ? "readOnlyFields" : ""}" ${readOnly ? 'style="opacity:.75;"' : ""}>
        ${activeF.map(fieldHtml).join("")}
        ${legacyF.length ? `<div class="legacyFields">
          <div class="legacyFieldsHead">${esc(T("modal.legacyFieldsTitle"))}</div>
          <div class="legacyFieldsHint">${esc(T("modal.legacyFieldsHint"))}</div>
          ${legacyF.map(fieldHtml).join("")}
        </div>` : ""}
      </div>
      <div class="modalFoot"><button class="btn" data-action="close-modal">${readOnly ? T("common.close") : T("common.cancel")}</button>
        ${readOnly ? "" : `<button class="btn btn-primary" data-action="save-trade">${T("common.save")}</button>`}</div>
    </div>
  </div>`;
}


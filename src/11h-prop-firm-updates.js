/* 公司专属近期更新：保存在 prop_firms.data.recentUpdates，不使用网站 changelog。
   卡片默认显示最新一条，可按公司配置条数；公司详情显示完整时间线。编辑只改草稿，随公司一起保存。 */
const PROP_FIRM_UPDATE_TYPES = ["notice", "rules", "pricing", "payout", "platform"];
const PROP_UPDATES_PREVIEW_COUNTS = [1, 2, 3, 4, 5, "all"];
function propUpdatesPreviewValid(value) { return value == null || PROP_UPDATES_PREVIEW_COUNTS.includes(value); }
function propUpdatesPreviewCount(firm) {
  const value = firm?.updatesPreviewCount;
  return value === "all" ? Infinity : PROP_UPDATES_PREVIEW_COUNTS.includes(value) ? value : 1;
}
function propSetUpdatesPreviewCount(raw, m = propFirmEditContext()) {
  if (!propIsAdmin() || !m || m.busy || !["number", "string"].includes(typeof raw)) return false;
  const value = typeof raw === "string" && /^[1-5]$/.test(raw) ? Number(raw) : raw;
  if (!PROP_UPDATES_PREVIEW_COUNTS.includes(value)) return false;
  m.draft.updatesPreviewCount = value; propFirmEditorChanged(); return true;
}
function propUpdatesPreviewControl(m) {
  const value = m.draft.updatesPreviewCount ?? 1;
  return `<div class="propUpdatesPreviewControl"><label for="propUpdatesPreviewCount">${esc(T("prop.updates.previewLabel"))}</label>
    <select class="input" id="propUpdatesPreviewCount" data-prop-updates-preview aria-describedby="propUpdatesPreviewHint" ${m.busy ? "disabled" : ""}>
      ${!propUpdatesPreviewValid(value) ? `<option value="" selected disabled>${esc(T("prop.updates.invalidPreview"))}</option>` : ""}
      ${PROP_UPDATES_PREVIEW_COUNTS.map(n => `<option value="${n}" ${n === value ? "selected" : ""}>${esc(T(n === "all" ? "prop.updates.previewAll" : "prop.updates.previewNumber", { n }))}</option>`).join("")}
    </select><p class="propHint" id="propUpdatesPreviewHint">${esc(T("prop.updates.previewHint"))}</p></div>`;
}
document.addEventListener("change", e => {
  if (e.target.dataset?.propUpdatesPreview !== undefined) propSetUpdatesPreviewCount(e.target.value, propFirmEditContext(e.target));
});
function propFirmUpdateDateOk(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function propValidateFirmUpdates(list, previewCount) {
  const errors = propUpdatesPreviewValid(previewCount) ? [] : [T("prop.updates.invalidPreview")];
  if (list === undefined || list === null) return errors;
  if (!Array.isArray(list)) return [...errors, T("prop.updates.invalidList")];
  const ids = new Set();
  list.forEach((u, i) => {
    const object = u && typeof u === "object" && !Array.isArray(u);
    let valid = object && propFirmUpdateDateOk(u.date) && typeof u.text === "string" && !!u.text.trim();
    if (object && u.type !== undefined && u.type !== null && u.type !== "" && !PROP_FIRM_UPDATE_TYPES.includes(u.type)) valid = false;
    if (object && u.id !== undefined && u.id !== null && u.id !== "") {
      if (typeof u.id !== "string" || !u.id.trim() || ids.has(u.id)) valid = false;
      ids.add(u.id);
    }
    if (object && !propUpdatePresentationValid(u)) errors.push(T("prop.design.invalidUpdate", { n: i + 1 }));
    if (!valid) errors.push(T("prop.updates.invalidEntry", { n: i + 1 }));
  });
  return errors;
}
function propFirmUpdates(firm) {
  const list = firm && Array.isArray(firm.recentUpdates) ? firm.recentUpdates : [];
  return list.map((u, index) => ({ item: u && typeof u === "object" && !Array.isArray(u) ? u : { text: typeof u === "string" ? u : "" }, index }))
    .sort((a, b) => {
      const da = propFirmUpdateDateOk(a.item.date) ? a.item.date : "", db = propFirmUpdateDateOk(b.item.date) ? b.item.date : "";
      return db.localeCompare(da) || a.index - b.index;
    }).map((x) => x.item);
}
function propFirmUpdatesDraft(firm) {
  // 不用显示层的归一化结果覆盖原始数据；非法导入在校验处明确报错，不静默丢历史。
  const copy = JSON.parse(JSON.stringify(firm && firm.recentUpdates !== undefined && firm.recentUpdates !== null ? firm.recentUpdates : []));
  if (Array.isArray(copy)) copy.sort((a, b) => {
    const da = propFirmUpdateDateOk(a?.date) ? a.date : "", db = propFirmUpdateDateOk(b?.date) ? b.date : "";
    return db.localeCompare(da);
  });
  return copy;
}
function propFirmUpdatesHtml(firm, compact) {
  const updates = propFirmUpdates(firm), shown = compact ? updates.slice(0, propUpdatesPreviewCount(firm)) : updates;
  const edit = propIsAdmin() ? `<button type="button" class="propUpdatesLink" data-action="prop-adm-firm" data-id="${esc(firm.id)}" data-section="updates">${esc(T(updates.length ? "prop.updates.edit" : "prop.updates.add"))}</button>` : "";
  const action = compact && updates.length ? `<button type="button" class="propUpdatesLink" data-action="prop-firm-updates" data-id="${esc(firm.id)}" aria-label="${esc(T("prop.updates.openFirm", { name: firm.name }))}">${esc(T("prop.updates.viewAll", { n: updates.length }))}<span aria-hidden="true">→</span></button>` : edit;
  return `<section class="propFirmUpdates ${compact ? "propRecommendUpdates" : "propFirmUpdatesFull"}"${compact ? "" : ' id="propFirmUpdates" tabindex="-1" aria-labelledby="propFirmUpdatesTitle"'}>
    <div class="propFirmUpdatesHead"><h3${compact ? "" : ' id="propFirmUpdatesTitle"'}>${esc(T("prop.updates.title"))}${!compact && updates.length ? `<span class="propUpdateCount">${esc(T("prop.updates.count", { n: updates.length }))}</span>` : ""}</h3>${action}</div>
    ${shown.length ? `<ol class="propFirmUpdateList">${shown.map((u) => `<li class="propFirmUpdate">${propUpdateCardHtml(u, compact)}</li>`).join("")}</ol>` : `<div class="propFirmUpdatesEmpty">${esc(T("prop.updates.empty"))}</div>`}
  </section>`;
}
function propOpenFirmUpdates(id) {
  const firm = propFindFirm(id);
  if (!firm || (firm.hidden && !propEditing())) return;
  propView = "catalog"; propCatalogFirm = id; propCatalogFirmSize = "";
  render();
  const section = document.getElementById("propFirmUpdates");
  if (section) { section.scrollIntoView({ block: "start" }); section.focus({ preventScroll: true }); }
}

function propFirmUpdateRowsHtml(list) {
  if (!Array.isArray(list)) return `<div class="notice error">${esc(T("prop.updates.invalidList"))}</div>`;
  if (!list.length) return `<div class="propFirmUpdatesEmpty">${esc(T("prop.updates.empty"))}</div>`;
  return list.map((entry, i) => {
    const u = entry && typeof entry === "object" ? entry : {};
    const type = PROP_FIRM_UPDATE_TYPES.includes(u.type) ? u.type : "notice";
    return `<div class="propUpdateEditRow">
      <div class="propUpdateEditTop"><div><label for="propUpdateDate-${i}">${esc(T("prop.updates.date"))}</label><input class="input" id="propUpdateDate-${i}" type="date" value="${esc(u.date || "")}" data-prop-update-index="${i}" data-prop-update-field="date"></div>
        <div><label for="propUpdateType-${i}">${esc(T("prop.updates.type"))}</label><select class="input" id="propUpdateType-${i}" data-prop-update-index="${i}" data-prop-update-field="type">${PROP_FIRM_UPDATE_TYPES.map((value) => `<option value="${value}" ${value === type ? "selected" : ""}>${esc(T("prop.updates.type." + value))}</option>`).join("")}</select></div>
        <button type="button" class="propUpdateRemove" data-action="prop-adm-update-remove" data-index="${i}" aria-label="${esc(T("prop.updates.removeEntry", { n: i + 1 }))}">${esc(T("prop.updates.remove"))}</button>
      </div>
      ${propFirmEditor ? propContentToolbarHtml('propUpdateText-' + i, { update: i }) : ''}
      <label for="propUpdateText-${i}">${esc(T("prop.updates.text"))}</label><textarea class="input" id="propUpdateText-${i}" rows="3" data-prop-update-index="${i}" data-prop-update-field="text" aria-describedby="propFirmUpdatesHint">${esc(u.text || "")}</textarea>
      ${propFirmEditor ? propUpdateDesignEditorHtml(u, i) : ''}
    </div>`;
  }).join("");
}
function propFirmUpdatesEditorHtml(m) {
  const list = m.draft.recentUpdates ?? [];
  return `<details class="propUpdatesEditor" id="propFirmUpdatesEditor" data-prop-details="updatesOpen" ${m.updatesOpen ? "open" : ""}>
    <summary><span>${esc(T("prop.updates.title"))}</span><span class="propUpdateCount" id="propFirmUpdatesCount">${esc(T("prop.updates.count", { n: Array.isArray(list) ? list.length : 0 }))}</span></summary>
    <div class="propUpdatesEditorInner"><p class="propHint" id="propFirmUpdatesHint">${esc(T("prop.updates.editorHint"))}</p>
      ${m.page ? propUpdatesPreviewControl(m) : ""}
      <div id="propFirmUpdateRows">${propFirmUpdateRowsHtml(list)}</div>
      <button type="button" class="btn btn-sm" data-action="prop-adm-update-add" ${Array.isArray(list) ? "" : "disabled"}>${ICONS.plus}${esc(T("prop.updates.add"))}</button>
    </div></details>`;
}
function propScrollFirmUpdatesEditor() {
  const el = document.getElementById("propFirmUpdatesEditor");
  if (el) { el.open = true; el.scrollIntoView({ block: "start" }); }
}
function propRefreshFirmUpdatesEditor(focusIndex) {
  const m = propFirmEditContext();
  if (!m) return;
  const list = m.draft.recentUpdates, rows = document.getElementById("propFirmUpdateRows"), count = document.getElementById("propFirmUpdatesCount");
  if (rows) rows.innerHTML = propFirmUpdateRowsHtml(list);
  if (count) count.textContent = T("prop.updates.count", { n: Array.isArray(list) ? list.length : 0 });
  if (typeof focusIndex === "number") {
    const input = focusIndex >= 0 ? document.getElementById("propUpdateText-" + focusIndex) : document.getElementById("propFirmUpdatesEditor")?.querySelector('[data-action="prop-adm-update-add"]');
    if (input) { input.focus({ preventScroll: true }); input.scrollIntoView({ block: "nearest" }); }
  }
}
function propAddFirmUpdate() {
  const m = propFirmEditContext();
  if (!propIsAdmin() || !m || m.busy || !Array.isArray(m.draft.recentUpdates)) return;
  m.draft.recentUpdates.unshift({ id: propNewId("pu"), date: todayStr(), type: "notice", text: "" });
  m.updatesOpen = true;
  propRefreshFirmUpdatesEditor(0); propFirmEditorChanged();
}
function propRemoveFirmUpdate(index) {
  const m = propFirmEditContext();
  if (!propIsAdmin() || !m || m.busy || !Array.isArray(m.draft.recentUpdates) || !Number.isInteger(index) || index < 0 || index >= m.draft.recentUpdates.length) return;
  m.draft.recentUpdates.splice(index, 1);
  propRefreshFirmUpdatesEditor(Math.min(index, m.draft.recentUpdates.length - 1)); propFirmEditorChanged();
}
function propSetFirmUpdateField(index, field, value, m = propFirmEditContext()) {
  if (!propIsAdmin() || !m || m.busy || !Array.isArray(m.draft.recentUpdates) || !Number.isInteger(index) || index < 0 || index >= m.draft.recentUpdates.length || !["date", "type", "text"].includes(field) || typeof value !== "string") return;
  const list = m.draft.recentUpdates;
  if (!list[index] || typeof list[index] !== "object" || Array.isArray(list[index])) list[index] = { id: propNewId("pu"), date: "", type: "notice", text: "" };
  list[index][field] = value;
  propFirmEditorChanged();
}
function propHandleFirmUpdateInput(e) {
  const data = e.target && e.target.dataset;
  if (data && data.propUpdateField !== undefined) propSetFirmUpdateField(Number(data.propUpdateIndex), data.propUpdateField, e.target.value, propFirmEditContext(e.target));
}
document.addEventListener("input", propHandleFirmUpdateInput);
document.addEventListener("change", propHandleFirmUpdateInput);

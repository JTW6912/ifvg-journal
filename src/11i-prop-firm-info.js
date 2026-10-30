/* 公司信息：四组可自定义多选，仍保存为 prop_firms.data 中的文本数组。
   只翻译已知建议项的显示名，不改写已有自定义值；KYC 记录公司要求，不存用户证件。 */
const PROP_FIRM_CHOICE_FIELDS = ["platforms", "payoutMethods", "kycRequirements", "paymentMethods"];
const PROP_FIRM_CHOICE_PRESETS = {
  platforms: ["Tradovate", "Rithmic", "NinjaTrader", "TradingView", "Quantower", "Sierra Chart", "TopstepX", "dxFeed"],
  payoutMethods: ["Rise", "Wise", "PayPal", "Bank transfer", "USDT", "USDC"],
  kycRequirements: ["National ID", "Passport", "Driver's license", "Proof of address", "Selfie verification", "Video verification", "Before payout"],
  paymentMethods: ["Visa", "Mastercard", "PayPal", "Apple Pay", "Google Pay", "Bank transfer", "Cryptocurrency"],
};
const PROP_FIRM_CHOICE_LABELS = new Map([
  ["payoutMethods:Bank transfer", "bankTransfer"], ["paymentMethods:Bank transfer", "bankTransfer"],
  ["paymentMethods:Cryptocurrency", "crypto"], ["kycRequirements:National ID", "nationalId"],
  ["kycRequirements:Passport", "passport"], ["kycRequirements:Driver's license", "driversLicense"],
  ["kycRequirements:Proof of address", "address"], ["kycRequirements:Selfie verification", "selfie"],
  ["kycRequirements:Video verification", "video"], ["kycRequirements:Before payout", "beforePayout"],
]);
function propFirmChoiceValid(value) {
  return value === undefined || value === null || typeof value === "string" || (Array.isArray(value) && value.every((v) => typeof v === "string"));
}
function propFirmChoiceValues(value) {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,，、\r\n]/) : [];
  return [...new Set(list.filter((v) => typeof v === "string").map((v) => v.trim()).filter(Boolean))];
}
function propValidateFirmChoices(firm) {
  return PROP_FIRM_CHOICE_FIELDS.filter((field) => !propFirmChoiceValid(firm && firm[field]))
    .map((field) => T("prop.firmInfo.invalidChoices", { field: T("prop.firmInfo." + field) }));
}
function propFirmChoiceDraft(firm, field) {
  const value = firm && firm[field];
  return propFirmChoiceValid(value) ? propFirmChoiceValues(value) : JSON.parse(JSON.stringify(value));
}
function propFirmChoiceLabel(field, value) {
  const key = PROP_FIRM_CHOICE_LABELS.get(field + ":" + value);
  return key ? T("prop.firmInfo.option." + key) : value;
}
function propFirmChoiceOptions(field, draft = {}, extras = {}) {
  if (!PROP_FIRM_CHOICE_FIELDS.includes(field)) return [];
  const values = propFirmChoiceValues([
    ...PROP_FIRM_CHOICE_PRESETS[field], ...propFirms.flatMap((f) => propFirmChoiceValues(f[field])),
    ...propFirmChoiceValues(extras[field]), ...propFirmChoiceValues(draft[field]),
  ]);
  const known = new Set(values.map((v) => propIconKey(field, v)));
  propOptionIcons.filter((r) => r.field === field && typeof r.label === "string").forEach((r) => {
    if (!known.has(r.id)) { values.push(r.label); known.add(r.id); }
  });
  return values;
}
function propFirmChoiceOptionsHtml(field, m) {
  const selected = propFirmChoiceValues(m.draft[field]);
  const rows = m.page ? propEditorIconRows(m) : propOptionIcons;
  return propFirmChoiceOptions(field, m.draft, m.choiceExtras).map((value, i) => {
    const label = `<label class="propChoiceOption" for="propChoiceOption-${field}-${i}"><input type="checkbox" id="propChoiceOption-${field}-${i}" data-prop-firm-choice="${field}" value="${esc(value)}" ${selected.includes(value) ? "checked" : ""}><span class="propChoiceTag">${isModernLayout() ? propChoiceIconHtml(field, value, rows) : ""}${esc(propFirmChoiceLabel(field, value))}</span></label>`;
    return m.page ? `<div class="propChoiceRow" data-prop-option-label="${esc(value)}">${label}<button type="button" class="propChoiceIconEdit" data-action="prop-editor-icon-edit" data-field="${field}" data-value="${esc(value)}" aria-label="${esc(T("prop.icons.editFor", { name: propFirmChoiceLabel(field, value) }))}" title="${esc(T("prop.icons.title"))}">${ICONS.pencil}</button></div>` : label;
  }).join("");
}
function propFirmChoiceFieldHtml(field, m) {
  if (!PROP_FIRM_CHOICE_FIELDS.includes(field)) return "";
  const values = propFirmChoiceValues(m.draft[field]);
  const summary = values.length ? values.map((value) => propFirmChoiceLabel(field, value)).join(" · ") : T("prop.firmInfo.choose");
  const label = T("prop.firmInfo." + field);
  const content = !propFirmChoiceValid(m.draft[field]) ? `<div class="notice error">${esc(T("prop.firmInfo.invalidChoices", { field: label }))}</div>` : `
    <details class="propChoicePicker" data-prop-details="choices_${field}" ${m["choices_" + field] ? "open" : ""}>
      <summary><span class="propChoiceSummary">${esc(summary)}</span><span class="propChoiceCount">${esc(T("prop.firmInfo.selected", { n: values.length }))}</span></summary>
      ${m.page ? `<input class="input propChoiceSearch" type="search" data-prop-choice-search="${field}" value="${esc(m.choiceSearch[field] || "")}" placeholder="${esc(T("prop.editor.search"))}" aria-label="${esc(label + " · " + T("prop.editor.search"))}">` : ""}
      <div class="propChoiceOptions" id="propChoiceOptions-${field}">${propFirmChoiceOptionsHtml(field, m)}</div>
      ${m.page ? `<p class="propHint" id="propChoiceEmpty-${field}" hidden>${esc(T("prop.editor.noOptions"))}</p>` : ""}
      <div class="propChoiceCustom"><label class="propChoiceCustomLabel" for="propChoiceCustom-${field}">${esc(T("prop.firmInfo.custom"))}</label>
        <div><input class="input" type="text" id="propChoiceCustom-${field}" data-prop-choice-custom="${field}" value="${esc(m.customTexts?.[field] || "")}" autocomplete="off" aria-label="${esc(label + " · " + T("prop.firmInfo.custom"))}"><button type="button" class="btn btn-sm" data-action="prop-adm-choice-add" data-field="${field}">${esc(T("prop.firmInfo.add"))}</button></div>
      </div>
    </details>`;
  return `<fieldset class="propFirmChoiceField" id="propChoice-${field}" ${m.busy ? "disabled" : ""}><legend>${esc(label)}</legend>${content}
    <p class="propHint">${esc(T(field === "kycRequirements" ? "prop.firmInfo.kycHint" : "prop.firmInfo.choiceHint"))}</p></fieldset>`;
}
function propFirmChoicesEditorHtml(m) {
  return `<div class="propFirmChoicesGrid">${PROP_FIRM_CHOICE_FIELDS.map((field) => propFirmChoiceFieldHtml(field, m)).join("")}</div>`;
}
function propUpdateFirmChoiceSummary(field) {
  const root = document.getElementById("propChoice-" + field), m = propFirmEditContext();
  if (!root || !m) return;
  const values = propFirmChoiceValues(m.draft[field]);
  root.querySelector(".propChoiceSummary").textContent = values.length ? values.map((v) => propFirmChoiceLabel(field, v)).join(" · ") : T("prop.firmInfo.choose");
  root.querySelector(".propChoiceCount").textContent = T("prop.firmInfo.selected", { n: values.length });
}
function propSetFirmChoice(field, value, checked, m = propFirmEditContext()) {
  if (!propIsAdmin() || !m || m.busy || !PROP_FIRM_CHOICE_FIELDS.includes(field) || !propFirmChoiceValid(m.draft[field]) || typeof value !== "string" || typeof checked !== "boolean") return false;
  value = value.trim();
  if (!value) return false;
  const values = propFirmChoiceValues(m.draft[field]);
  m.draft[field] = checked ? propFirmChoiceValues([...values, value]) : values.filter((v) => v !== value);
  propUpdateFirmChoiceSummary(field);
  propFirmEditorChanged();
  return true;
}
function propAddFirmChoiceValue(field, raw) {
  const m = propFirmEditContext();
  if (!propIsAdmin() || !m || m.busy || !PROP_FIRM_CHOICE_FIELDS.includes(field) || !propFirmChoiceValid(m.draft[field]) || typeof raw !== "string" || !raw.trim()) return null;
  const text = raw.trim(), lower = text.toLowerCase();
  const options = [...propFirmChoiceValues(m.draft[field]), ...propFirmChoiceOptions(field, m.draft, m.choiceExtras)];
  const value = options.find((v) => v.toLowerCase() === lower || propFirmChoiceLabel(field, v).toLowerCase() === lower) || text;
  m.choiceExtras = m.choiceExtras || {};
  m.choiceExtras[field] = propFirmChoiceValues([...propFirmChoiceValues(m.choiceExtras[field]), value]);
  propSetFirmChoice(field, value, true, m);
  return value;
}
function propAddFirmChoice(field) {
  if (!PROP_FIRM_CHOICE_FIELDS.includes(field)) return;
  const input = document.getElementById("propChoiceCustom-" + field), m = propFirmEditContext();
  if (!input || !m) return;
  const added = propAddFirmChoiceValue(field, input.value);
  if (added === null) return;
  const options = document.getElementById("propChoiceOptions-" + field);
  if (options) options.innerHTML = propFirmChoiceOptionsHtml(field, m);
  if (m.page) { m.customTexts[field] = ""; m.choiceSearch[field] = ""; const search = document.querySelector(`[data-prop-choice-search="${field}"]`); if (search) search.value = ""; propFilterEditorChoices(field); }
  const addedInput = options && [...options.querySelectorAll("input")].find((el) => el.value === added);
  if (addedInput) addedInput.closest(".propChoiceRow, .propChoiceOption").scrollIntoView({ block: "nearest" });
  input.value = ""; input.focus({ preventScroll: true });
  propFirmEditorChanged();
}
document.addEventListener("change", (e) => {
  const field = e.target.dataset && e.target.dataset.propFirmChoice;
  if (field && e.target.type === "checkbox") propSetFirmChoice(field, e.target.value, e.target.checked, propFirmEditContext(e.target));
});
document.addEventListener("keydown", (e) => {
  const field = e.target.dataset && e.target.dataset.propChoiceCustom;
  if (field && e.key === "Enter" && !e.isComposing) { e.preventDefault(); propAddFirmChoice(field); }
});

function propFirmInfoHtml(firm, compact, iconRows = propOptionIcons) {
  const tags = (field) => {
    const values = propFirmChoiceValues(firm[field]);
    return values.length ? `<div class="propRecommendTags">${values.map((v) => `<span class="propRecommendTag propChoiceTag">${isModernLayout() ? propChoiceIconHtml(field, v, iconRows) : ""}${esc(propFirmChoiceLabel(field, v))}</span>`).join("")}</div>` : `<span class="propFirmInfoEmpty">${esc(T("prop.firmInfo.unknown"))}</span>`;
  };
  const item = (field, value) => `<div class="propFirmFact" data-prop-info-field="${field}"><dt>${esc(T("prop.firmInfo." + field))}</dt><dd>${value}</dd></div>`;
  const policy = propMagicPolicy(firm), notes = String(firm.notes || "");
  const notesId = "prop-notes-" + encodeURIComponent(firm.id), notesOpen = propFirmNotesExpanded.has(firm.id);
  const notesHtml = !notes.trim() ? `<span class="propFirmInfoEmpty">${esc(T("prop.firmInfo.noNotes"))}</span>` : compact
    ? `<div class="propReviewText propFirmNotesText propRichText${notesOpen ? " isExpanded" : ""}" id="${esc(notesId)}" data-prop-review-id="${esc(firm.id)}" data-prop-preview-kind="notes">${propReviewHtml(notes)}</div><button type="button" class="propReviewToggle" data-action="prop-notes-toggle" data-id="${esc(firm.id)}" aria-expanded="${notesOpen}" aria-controls="${esc(notesId)}" hidden>${esc(T(notesOpen ? "prop.firmInfo.notesCollapse" : "prop.firmInfo.notesExpand"))}</button>`
    : `<div class="propRichText">${propReviewHtml(notes)}</div>`;
  return `<div class="propFirmFacts${compact ? "" : " propFirmInfoFull"}">${compact ? "" : `<h3>${esc(T("prop.firmInfo.title"))}</h3>`}<dl class="propFirmFactsGrid">
    ${item("platforms", tags("platforms"))}
    <div class="propFirmFact"><dt>${esc(T("prop.magic.label"))}</dt><dd><span class="propMagicPolicy propMagicPolicy-${policy}">${esc(T("prop.magic." + policy))}</span></dd></div>
    ${item("payoutMethods", tags("payoutMethods"))}${item("kycRequirements", tags("kycRequirements"))}${item("paymentMethods", tags("paymentMethods"))}${item("notes", notesHtml)}
  </dl></div>`;
}

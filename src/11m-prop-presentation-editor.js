/* 推荐/优惠/近期更新的展示配置。所有修改只写隔离草稿，不直接操作目录或剪贴板。 */
function propPresentationControl(path, value, label, attrs = '') {
  return `<label class="field"><span class="fieldLabel">${esc(label)}</span><input class="input" data-prop-design="${esc(path)}" value="${esc(typeof value === 'string' ? value : '')}" ${attrs}></label>`;
}
function propContentIconSelect(path, value, fallback = 'star') {
  return `<label class="field"><span class="fieldLabel">${esc(T('prop.design.icon'))}</span><select class="input" data-prop-design="${esc(path)}">${['', ...PROP_CONTENT_ICONS].map(id => `<option value="${id}" ${(value === undefined ? fallback : value) === id ? 'selected' : ''}>${esc(T(id ? 'prop.design.icon.' + id : 'prop.design.noIcon'))}</option>`).join('')}</select></label>`;
}
function propThemeDesignColor() {
  if (typeof getComputedStyle === 'undefined') return '#808080';
  const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  if (/^#[a-f\d]{3}$/i.test(color)) return '#' + [...color.slice(1)].map(c => c + c).join('');
  return propHexColor(color) || '#808080';
}
function propStyleEditorHtml(path, style, title, button = false) {
  const s = propPresentationObject(style) ? style : {}, colors = propPresentationColors(s), fields = button ? ['border', 'fill', 'button'] : ['border', 'fill'];
  return `<fieldset class="propDesignColors" data-prop-style-editor="${esc(path)}"><legend>${esc(title)}</legend><label class="propDesignPreset"><span>${esc(T('prop.design.preset'))}</span><select class="input" data-prop-design="${esc(path)}.preset">${Object.keys(PROP_PRESENTATION_PRESETS).map(k => `<option value="${k}" ${(s.preset || 'theme') === k ? 'selected' : ''}>${esc(T('prop.design.preset.' + k))}</option>`).join('')}</select></label>
    <div class="propDesignSwatches">${fields.map(k => `<label><input type="color" data-prop-design="${esc(path)}.${k}" value="${esc(colors[k] || propThemeDesignColor())}"><span>${esc(T('prop.design.color.' + k))}</span><output data-prop-color-output="${esc(path)}.${k}">${esc(colors[k] || T('prop.design.preset.theme'))}</output></label>`).join('')}</div>
    <p class="propHint">${esc(T('prop.design.glassHint'))}</p><button type="button" class="btn btn-sm" data-action="prop-content-style-reset" data-path="${esc(path)}">${esc(T('prop.design.reset'))}</button></fieldset>`;
}
function propContentToolbarHtml(target, options = {}) {
  return `<div class="propContentToolbar" data-prop-content-tools="${esc(target)}" role="group" aria-label="${esc(T('prop.design.tools'))}">
    <label><span>${esc(T('prop.design.icon'))}</span><select data-prop-insert-icon>${PROP_CONTENT_ICONS.map(id => `<option value="${id}">${esc(T('prop.design.icon.' + id))}</option>`).join('')}</select></label>
    <button type="button" class="btn btn-sm" data-action="prop-content-insert-icon" data-target="${esc(target)}">${esc(T('prop.design.insertIcon'))}</button>
    ${options.key ? `<button type="button" class="btn btn-sm" data-action="prop-content-key-selection">${esc(T('prop.design.fromSelection'))}</button>` : ''}
    ${options.update !== undefined ? `<button type="button" class="btn btn-sm" data-action="prop-content-add-callout" data-index="${options.update}">${esc(T('prop.design.addCallout'))}</button>` : ''}
  </div>`;
}
function propKeySentenceEditorHtml(m) {
  const key = propPresentationObject(m.draft.keySentence) ? m.draft.keySentence : {};
  return `<div class="propDesignSection"><h3>${esc(T('prop.design.keyTitle'))}</h3><p class="propHint">${esc(T('prop.design.keyHint'))}</p>
    <label class="field"><span class="fieldLabel">${esc(T('prop.design.keyText'))}</span><textarea class="input" id="propKeyText" data-prop-design="keySentence.text" rows="3" maxlength="800">${esc(key.text || '')}</textarea></label>
    ${propContentIconSelect('keySentence.icon', key.icon)}${propStyleEditorHtml('keySentence.style', key.style, T('prop.design.keyStyle'))}</div>`;
}
function propPromoEditorHtml(m) {
  const p = propPresentationObject(m.draft.promoDesign) ? m.draft.promoDesign : {};
  return `<div class="propDesignSection"><h3>${esc(T('prop.design.promoTitle'))}</h3><div class="propRow">${propEditorField(T('prop.adm.promoDiscount'), propInput('promoDiscount', m.draft.promoDiscount, 'maxlength="12" placeholder="40%"'))}${propContentIconSelect('promoDesign.icon', p.icon, 'tag')}</div>
    <label class="propCheck"><input type="checkbox" data-prop-design="promoDesign.hot" ${p.hot === true ? 'checked' : ''}>${esc(T('prop.design.hot'))}</label>
    ${propContentToolbarHtml('propPromoText')}<label class="field"><span class="fieldLabel">${esc(T('prop.adm.promoText'))}</span><textarea class="input" id="propPromoText" data-prop-field="promoText" rows="4">${esc(m.draft.promoText)}</textarea></label>
    <div class="propRow">${propPresentationControl('promoDesign.code', p.code, T('prop.design.code'), 'maxlength="100" autocomplete="off"')}${propPresentationControl('promoDesign.buttonText', p.buttonText, T('prop.design.buttonText'), 'maxlength="80"')}</div>
    ${propPresentationControl('promoDesign.url', p.url, T('prop.design.offerUrl'), 'type="url" maxlength="2048" placeholder="https://"')}
    <p class="propHint">${esc(T('prop.design.offerHint'))}</p>${propStyleEditorHtml('promoDesign.style', p.style, T('prop.design.promoStyle'), true)}</div>`;
}
function propUpdateDesignEditorHtml(u, index) {
  const boxes = Array.isArray(u.callouts) ? u.callouts : [];
  return `<div class="propUpdateDesign">${propStyleEditorHtml(`updates.${index}.style`, u.style, T('prop.design.updateStyle'))}
    <div class="propCalloutEditors"><h4>${esc(T('prop.design.calloutsTitle'))}</h4><p class="propHint">${esc(T('prop.design.calloutsHint'))}</p>
    ${boxes.map((b, n) => {
      if (!propPresentationObject(b) || !/^[A-Za-z0-9_-]{1,80}$/.test(b.id || '')) return `<p class="notice error">${esc(T('prop.design.invalidCallout'))}</p>`;
      const path = `updates.${index}.callouts.${b.id}`;
      return `<details class="propCalloutEditor" open><summary>${esc(T('prop.design.calloutNumber', { n: n + 1 }))}</summary><div class="propCalloutEditorBody">
        <p class="propHint">${esc(T('prop.design.markerHint'))} <code>[[box:${esc(b.id)}]]</code></p>
        ${propContentToolbarHtml('propCalloutText-' + index + '-' + b.id)}<label class="field"><span class="fieldLabel">${esc(T('prop.design.calloutText'))}</span><textarea class="input" id="propCalloutText-${index}-${esc(b.id)}" data-prop-design="${path}.text" rows="3">${esc(b.text || '')}</textarea></label>
        ${propContentIconSelect(path + '.icon', b.icon, 'alert')}${propStyleEditorHtml(path + '.style', b.style, T('prop.design.calloutStyle'))}
        <button type="button" class="btn btn-sm" data-action="prop-content-remove-callout" data-index="${index}" data-id="${esc(b.id)}">${esc(T('prop.design.removeCallout'))}</button></div></details>`;
    }).join('')}</div></div>`;
}
function propDesignTarget(path, create = false, m = propFirmEditContext()) {
  if (!m || typeof path !== 'string') return null;
  const bits = path.split('.'); let object, keys;
  if (bits[0] === 'keySentence' || bits[0] === 'promoDesign') {
    object = m.draft[bits[0]]; keys = bits[0] === 'keySentence' ? ['text', 'icon', 'style'] : ['code', 'url', 'buttonText', 'icon', 'hot', 'style']; bits.shift();
  } else if (bits.shift() === 'updates') {
    const index = bits.shift(); if (!/^\d+$/.test(index) || !Array.isArray(m.draft.recentUpdates)) return null;
    object = m.draft.recentUpdates[Number(index)]; keys = ['style'];
    if (bits[0] === 'callouts') { bits.shift(); const id = bits.shift(); object = Array.isArray(object?.callouts) ? object.callouts.find(b => b?.id === id) : null; keys = ['text', 'icon', 'style']; }
  } else return null;
  if (!propPresentationObject(object) || !keys.includes(bits[0])) return null;
  if (bits[0] === 'style') {
    if (bits.length !== 2 || !['preset', 'border', 'fill', 'button'].includes(bits[1])) return null;
    if (create && object.style == null) object.style = {};
    return propPresentationObject(object.style) ? { object: object.style, key: bits[1] } : null;
  }
  return bits.length === 1 ? { object, key: bits[0] } : null;
}
function propSetPresentationField(path, value, m = propFirmEditContext()) {
  if (!propIsAdmin() || !m || m.busy) return false;
  if (typeof path !== 'string') return false;
  const key = path.split('.').pop();
  if (key === 'hot' ? typeof value !== 'boolean' : typeof value !== 'string') return false;
  if (key === 'icon' && value !== '' && !PROP_CONTENT_ICONS.includes(value)) return false;
  if (key === 'preset' && !Object.prototype.hasOwnProperty.call(PROP_PRESENTATION_PRESETS, value)) return false;
  if (['border', 'fill', 'button'].includes(key) && !propHexColor(value)) return false;
  const target = propDesignTarget(path, true, m); if (!target) return false;
  const { object } = target;
  if (key === 'preset') {
    if (!Object.prototype.hasOwnProperty.call(PROP_PRESENTATION_PRESETS, value)) return false;
    if (value === 'custom') Object.assign(object, propPresentationColors(object), { preset: value });
    else { ['border', 'fill', 'button'].forEach(k => { delete object[k]; }); object.preset = value; }
  } else if (['border', 'fill', 'button'].includes(key)) {
    if (!propHexColor(value)) return false;
    Object.assign(object, propPresentationColors(object), { preset: 'custom', [key]: value });
  } else object[key] = value;
  propSyncStyleControls(); propRefreshPresentationPreview();
  return true;
}
function propSyncStyleControls() {
  if (!document.querySelectorAll) return;
  document.querySelectorAll('[data-prop-style-editor]').forEach(root => {
    const target = propDesignTarget(root.dataset.propStyleEditor + '.preset');
    const s = target?.object || {}, colors = propPresentationColors(s);
    root.querySelector('select').value = s.preset || 'theme';
    root.querySelectorAll('input[type="color"]').forEach(input => {
      const key = input.dataset.propDesign.split('.').pop(); input.value = colors[key] || propThemeDesignColor();
      const output = input.parentElement.querySelector('output'); if (output) output.textContent = colors[key] || T('prop.design.preset.theme');
    });
  });
}
function propRefreshPresentationPreview() {
  const m = propFirmEditContext(); if (!m) return;
  if (m.page) propFirmEditorChanged();
  else { const preview = document.getElementById('propFirmReviewPreview'); if (preview) preview.innerHTML = propReviewHtml(m.draft.review); }
}
function propInsertContentIcon(target, icon) {
  const m = propFirmEditContext(), input = document.getElementById(target);
  if (!propIsAdmin() || !m || m.busy || !input || !PROP_CONTENT_ICONS.includes(icon)) return false;
  if (!input.matches?.('textarea[data-prop-field],textarea[data-prop-update-field],textarea[data-prop-design]')) return false;
  if (propFirmEditContext(input) !== m) return false;
  const lineStart = input.value.lastIndexOf('\n', input.selectionStart - 1) + 1, nextBreak = input.value.indexOf('\n', input.selectionStart);
  if (input.dataset.propUpdateField && input.value.slice(lineStart, nextBreak < 0 ? input.value.length : nextBreak).includes('[[box:')) { m.error = T('prop.design.cannotInsert'); propRefreshPresentationPreview(); return false; }
  input.setRangeText('[[icon:' + icon + ']]', input.selectionStart, input.selectionStart, 'end');
  input.dispatchEvent(new Event('input', { bubbles: true })); input.focus({ preventScroll: true }); return true;
}
function propAddUpdateCallout(index) {
  const m = propFirmEditContext(), input = document.getElementById('propUpdateText-' + index);
  if (!propIsAdmin() || !m || m.busy || !Number.isInteger(index) || !input || !Array.isArray(m.draft.recentUpdates)) return false;
  const u = m.draft.recentUpdates[index]; if (!propPresentationObject(u)) return false;
  const id = propNewId('pc'), next = propCalloutInsert({ ...u, text: input.value }, input.selectionStart, input.selectionEnd, id);
  if (!next) { m.error = T('prop.design.cannotInsert'); propRefreshPresentationPreview(); return false; }
  m.draft.recentUpdates[index] = next; propRefreshFirmUpdatesEditor(); propRefreshPresentationPreview();
  const field = document.getElementById('propCalloutText-' + index + '-' + id); field?.focus({ preventScroll: true }); field?.scrollIntoView({ block: 'nearest' }); return true;
}
function propRemoveUpdateCallout(index, id) {
  const m = propFirmEditContext();
  if (!propIsAdmin() || !m || m.busy || !Number.isInteger(index) || !Array.isArray(m.draft.recentUpdates) || !propPresentationObject(m.draft.recentUpdates[index])) return false;
  m.draft.recentUpdates[index] = propCalloutRemove(m.draft.recentUpdates[index], id);
  propRefreshFirmUpdatesEditor(); propRefreshPresentationPreview();
  const input = document.getElementById('propUpdateText-' + index); input?.focus({ preventScroll: true }); input?.scrollIntoView({ block: 'nearest' }); return true;
}
function propPresentationInput(e) {
  const field = e.target?.dataset?.propDesign;
  if (field) propSetPresentationField(field, e.target.type === 'checkbox' ? e.target.checked : e.target.value, propFirmEditContext(e.target));
}
document.addEventListener('input', propPresentationInput);
document.addEventListener('change', propPresentationInput);
document.addEventListener('mousedown', e => {
  if (e.target.closest?.('[data-action="prop-content-insert-icon"],[data-action="prop-content-key-selection"],[data-action="prop-content-add-callout"]')) e.preventDefault();
});
document.addEventListener('click', e => {
  const el = e.target.closest?.('[data-action]'), m = propFirmEditContext();
  if (!el || !el.dataset.action.startsWith('prop-content-') || !propIsAdmin() || !m || m.busy) return;
  const a = el.dataset.action;
  if (a === 'prop-content-insert-icon') propInsertContentIcon(el.dataset.target, el.closest('[data-prop-content-tools]').querySelector('select').value);
  else if (a === 'prop-content-style-reset') propSetPresentationField(el.dataset.path + '.preset', 'theme');
  else if (a === 'prop-content-add-callout') propAddUpdateCallout(Number(el.dataset.index));
  else if (a === 'prop-content-remove-callout') propRemoveUpdateCallout(Number(el.dataset.index), el.dataset.id);
  else if (a === 'prop-content-key-selection') {
    const input = document.getElementById('propFirmReview'), text = input?.value.slice(input.selectionStart, input.selectionEnd);
    if (!text?.trim()) { m.error = T('prop.design.selectFirst'); propRefreshPresentationPreview(); return; }
    if (propSetPresentationField('keySentence.text', text)) { const key = document.getElementById('propKeyText'); if (key) { key.value = text; key.focus({ preventScroll: true }); key.scrollIntoView({ block: 'nearest' }); } }
  }
});

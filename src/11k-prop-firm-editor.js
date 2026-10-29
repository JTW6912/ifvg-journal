/* modern 公司编辑页：子渲染根由本模块拥有，主shell重绘不能拆掉编辑中的DOM。
   草稿与propModal分离；共享图标只记录本次差异，随公司事务一起发布。 */
const PROP_EDITOR_SECTIONS = ['basic', 'choices', 'review', 'updates', 'notes'];
const PROP_EDITOR_FIELDS = ['name', 'logo', 'website', 'tier', 'review', 'promoDiscount', 'promoText', 'notes', 'hidden', 'magicPolicy'];
function propFirmEditContext(target) {
  propCheckFirmEditorSession();
  if (target?.closest?.('#propFirmEditorMount')) return propFirmEditor;
  if (target?.closest?.('.propModal')) return propModal?.type === 'admFirm' ? propModal : null;
  return propFirmEditor || (propModal?.type === 'admFirm' ? propModal : null);
}
function propCheckFirmEditorSession() {
  if (propFirmEditor && (!propIsAdmin() || propFirmEditor.owner !== session?.user?.id)) propFirmEditor = null;
}
function propOpenFirmEditor(id, section = 'basic') {
  if (!propIsAdmin() || !session) return false;
  const firm = id ? propFindFirm(id) : null;
  if (id && !firm) return false;
  if (propFirmEditor) return propRequestEditorLeave(() => propOpenFirmEditor(id, section));
  const draft = propAdmFirmDraft(firm);
  propFirmEditor = { type: 'admFirm', page: true, key: propNewId('firmEditor'), owner: session.user.id,
    id: firm?.id || '', isNew: !firm, draft, original: propStableJson(draft), section: PROP_EDITOR_SECTIONS.includes(section) ? section : 'basic',
    iconBase: JSON.parse(JSON.stringify(propOptionIcons)), iconEdits: [], iconForm: null, customTexts: {}, choiceSearch: {},
    previewOpen: typeof window.innerWidth !== 'number' || window.innerWidth > 900,
    updatesOpen: true, choices_platforms: true, choices_payoutMethods: true, choices_kycRequirements: true, choices_paymentMethods: true,
    returnScroll: window.scrollY || 0, origin: { view: propView, firm: propCatalogFirm, size: propCatalogFirmSize } };
  propModal = null; propRenderModal(); tab = 'prop'; propView = 'catalog';
  render(); window.scrollTo?.({ top: 0 });
  return true;
}
function propEditorIconRows(m = propFirmEditor) { return m ? propMergeIconRows(m.iconBase, m.iconEdits) : propOptionIcons; }
function propIconFormDirty(m = propFirmEditor) {
  return !!(m?.iconForm && propStableJson({ kind: m.iconForm.kind, value: m.iconForm.value }) !== m.iconForm.original);
}
function propFirmEditorDirty(m = propFirmEditor) {
  return !!(m && (propStableJson(m.draft) !== m.original || m.iconEdits.length || propIconFormDirty(m) || Object.values(m.customTexts).some(v => v.trim())));
}
function propEditorField(label, control, hint = '') {
  return `<label class="field"><span class="fieldLabel">${esc(label)}</span>${control}${hint ? `<span class="propHint">${esc(hint)}</span>` : ''}</label>`;
}
function propFirmEditorHtml(m) {
  const d = m.draft;
  const section = (id, html) => `<section class="propEditorSection" id="propEditor-${id}" data-prop-editor-section="${id}" aria-labelledby="propEditorTab-${id}" ${m.section === id ? '' : 'hidden'}>${html}</section>`;
  return `<div class="propFirmEditorPage">
    <header class="propEditorTop"><div><button type="button" class="propEditorBack" data-action="prop-editor-back">← ${esc(T('prop.editor.back'))}</button><h2>${esc(T(m.isNew ? 'prop.adm.newFirm' : 'prop.editor.title'))}<span id="propEditorFirmName">${esc(d.name)}</span></h2></div>
      <div class="propEditorSave"><span id="propEditorSaveState" role="status" aria-live="polite"></span><button type="button" class="btn btn-primary" data-action="prop-editor-save">${esc(T('prop.editor.save'))}</button></div></header>
    <div id="propEditorAlert" role="alert"></div><div id="propEditorConfirm"></div>
    <nav class="propEditorTabs" aria-label="${esc(T('prop.editor.sections'))}">${PROP_EDITOR_SECTIONS.map(id => `<button type="button" class="btn ${m.section === id ? 'active' : ''}" id="propEditorTab-${id}" data-action="prop-editor-section" data-section="${id}" aria-controls="propEditor-${id}" aria-pressed="${m.section === id}">${esc(T('prop.editor.' + id))}</button>`).join('')}</nav>
    <div class="propEditorLayout"><fieldset class="propEditorControls" id="propEditorControls" ${m.busy ? 'disabled' : ''}>
      ${section('basic', `<h3>${esc(T('prop.editor.basic'))}</h3><div class="propRow">${propEditorField(T('prop.adm.firmName'), propInput('name', d.name, 'maxlength="60"'))}${propEditorField(T('prop.adm.tier'), propSelect('tier', d.tier, PROP_TIERS.map(v => [v, v ? T('prop.tier.' + v) : T('prop.adm.noTier')])) )}</div>
        ${propEditorField(T('prop.cat.website'), propInput('website', d.website, 'placeholder="https://"'))}${propEditorField(T('prop.adm.logo'), propInput('logo', d.logo, 'placeholder="/img/prop/example.webp"'), T('prop.adm.logoHint'))}
        <div class="propEditorVisibility">${propCheck('hidden', d.hidden, T('prop.adm.hide'))}<p class="propHint">${esc(T('prop.adm.hideHint'))}</p></div>`)}
      ${section('choices', `<div class="propEditorSectionHead"><h3>${esc(T('prop.editor.choices'))}</h3><button type="button" class="btn btn-sm" data-action="prop-editor-refresh-icons">${esc(T('prop.icons.refresh'))}</button></div>
        <p class="propEditorScope">${ICONS.globe || ICONS.layers}${esc(T('prop.icons.scope'))}</p><p class="propHint">${esc(T('prop.icons.brandHint'))}</p>
        <div id="propEditorIconPanel"></div>${propFirmChoicesEditorHtml(m)}`)}
      ${section('review', `${propReviewEditorHtml(d.review)}${propKeySentenceEditorHtml(m)}${propPromoEditorHtml(m)}`)}
      ${section('updates', `<h3>${esc(T('prop.editor.updates'))}</h3>${propFirmUpdatesEditorHtml(m)}`)}
      ${section('notes', `<h3>${esc(T('prop.editor.notes'))}</h3>${propEditorField(T('prop.magic.label'), propSelect('magicPolicy', d.magicPolicy, PROP_MAGIC_POLICIES.map(v => [v, T('prop.magic.' + v)])), T('prop.magic.hint'))}
        ${propEditorField(T('prop.firmInfo.notes'), `<textarea class="input" data-prop-field="notes" rows="9">${esc(d.notes)}</textarea>`)}`)}
    </fieldset><aside class="propEditorPreview"><details ${m.previewOpen ? 'open' : ''} data-prop-editor-preview><summary>${esc(T('prop.editor.preview'))}</summary><p class="propHint">${esc(T('prop.editor.previewHint'))}</p><div id="propEditorPreviewBody" tabindex="0" role="region" aria-label="${esc(T('prop.editor.preview'))}"></div></details></aside></div>
  </div>`;
}
function propRenderFirmEditor(force = false) {
  propCheckFirmEditorSession();
  const m = propFirmEditor, root = document.getElementById('propFirmEditorMount');
  if (!m || !root) return;
  const key = m.key + ':' + lang;
  if (force || root.dataset.rendered !== key) {
    const active = document.activeElement;
    const field = active?.dataset?.propField;
    const activeId = active && root.contains(active) ? active.id : '';
    const designField = active && root.contains(active) ? active.dataset?.propDesign : '';
    const selection = typeof active?.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    root.innerHTML = propFirmEditorHtml(m); root.dataset.rendered = key;
    propRenderIconPanel();
    PROP_FIRM_CHOICE_FIELDS.forEach(propFilterEditorChoices);
    let next = activeId ? document.getElementById(activeId) : null;
    if (!next && designField && /^[A-Za-z0-9_.-]+$/.test(designField)) next = root.querySelector(`[data-prop-design="${designField}"]`);
    if (!next && field && PROP_EDITOR_FIELDS.includes(field)) next = root.querySelector(`[data-prop-field="${field}"]`);
    if (next && root.contains(next)) {
      next.focus({ preventScroll: true });
      if (selection) { try { next.setSelectionRange(...selection); } catch (_) {} }
    }
  }
  propFirmEditorChanged();
}
function propFirmEditorPreviewHtml(m) {
  const d = m.draft;
  const identity = `<div class="propEditorPreviewIdentity">${propFirmLogo(d, true)}<b>${esc(d.name || T('prop.adm.newFirm'))}</b></div>`;
  if (m.section === 'review') return identity + propKeySentenceHtml(d) + `<div class="propRichText propEditorPreviewReview" data-prop-copy-protected>${propReviewHtml(d.review) || esc(T('prop.cat.noReview'))}</div>` + propCouponHtml(propDraftPresentation(d));
  if (m.section === 'updates') return identity + `<h3>${esc(T('prop.updates.title'))}</h3>` + (propFirmUpdates(d).length ? propFirmUpdates(d).map(u => propUpdateCardHtml(u)).join('') : `<p class="propHint">${esc(T('prop.updates.empty'))}</p>`);
  return identity + `<div class="propEditorFactsPreview ${m.section === 'notes' ? 'notesOnly' : 'choicesOnly'}">${propFirmInfoHtml(d, false, propEditorIconRows(m))}</div>`;
}
function propFirmEditorChanged() {
  const m = propFirmEditor;
  if (!m) return;
  const status = document.getElementById('propEditorSaveState');
  if (status) status.textContent = T(m.busy ? 'common.saving' : m.isNew || propFirmEditorDirty(m) ? 'prop.editor.dirty' : 'prop.editor.saved') + (m.iconEdits.length ? ' · ' + T('prop.icons.changed', { n: m.iconEdits.length }) : '');
  const title = document.getElementById('propEditorFirmName'); if (title) title.textContent = m.draft.name;
  const alert = document.getElementById('propEditorAlert');
  if (alert) {
    const changed = alert.textContent !== (m.error || '');
    alert.textContent = m.error || '';
    if (changed && m.error) alert.scrollIntoView?.({ block: 'center' });
  }
  const root = document.getElementById('propFirmEditorMount');
  root?.querySelectorAll('[data-action="prop-editor-save"], [data-action="prop-editor-back"], [data-action="prop-editor-section"]').forEach(b => { b.disabled = !!m.busy; });
  const controls = document.getElementById('propEditorControls'); if (controls) controls.disabled = !!m.busy;
  const preview = document.getElementById('propEditorPreviewBody');
  if (preview) {
    const html = propFirmEditorPreviewHtml(m);
    if (preview.__html !== html) {
      const top = preview.__section === m.section ? preview.scrollTop : 0;
      preview.innerHTML = html; preview.__html = html; preview.__section = m.section; preview.scrollTop = top;
    }
  }
  propRenderEditorConfirm();
}
function propSelectEditorSection(section) {
  const m = propFirmEditor;
  if (!m || m.busy || !PROP_EDITOR_SECTIONS.includes(section)) return;
  m.section = section;
  document.getElementById('propFirmEditorMount')?.querySelectorAll('[data-prop-editor-section]').forEach(el => { el.hidden = el.dataset.propEditorSection !== section; });
  document.getElementById('propFirmEditorMount')?.querySelectorAll('[data-action="prop-editor-section"]').forEach(el => {
    const active = el.dataset.section === section; el.classList.toggle('active', active); el.setAttribute('aria-pressed', String(active));
  });
  propFirmEditorChanged();
}
function propEditOptionIcon(field, value) {
  const m = propFirmEditor;
  if (!m || m.busy || !propIsAdmin() || m.owner !== session?.user?.id || !propIconKey(field, value)) return false;
  if (propIconFormDirty(m)) { m.error = T('prop.icons.unapplied'); propFirmEditorChanged(); return false; }
  const row = propEditorIconRows(m).find(r => r.id === propIconKey(field, value));
  const data = { kind: row?.kind || 'default', value: row?.value || '' };
  m.iconForm = { field, label: value, ...data, original: propStableJson(data) }; m.error = null;
  propRenderIconPanel(); propFirmEditorChanged();
  document.getElementById('propEditorIconPanel')?.scrollIntoView?.({ block: 'nearest' });
  document.getElementById('propIconSource')?.focus({ preventScroll: true });
  return true;
}
function propRenderIconPanel() {
  const m = propFirmEditor, root = document.getElementById('propEditorIconPanel');
  if (!m || !root) return;
  const f = m.iconForm;
  if (!f) { root.innerHTML = `<p class="propHint">${esc(T('prop.icons.choose'))}</p>`; return; }
  root.innerHTML = `<div class="propIconManager"><div class="propEditorSectionHead"><h4>${esc(T('prop.icons.editFor', { name: propFirmChoiceLabel(f.field, f.label) }))}</h4><button type="button" class="btn btn-sm" data-action="prop-editor-icon-close">${esc(T('common.cancel'))}</button></div>
    <p class="propHint">${esc(T('prop.icons.publishHint'))}</p><label class="field"><span class="fieldLabel">${esc(T('prop.icons.source'))}</span><select class="input" id="propIconSource" data-prop-icon-source>${['default', 'builtin', 'url', 'none'].map(k => `<option value="${k}" ${f.kind === k ? 'selected' : ''}>${esc(T('prop.icons.' + k))}</option>`).join('')}</select></label>
    ${f.kind === 'builtin' ? `<div class="propIconLibrary" role="group" aria-label="${esc(T('prop.icons.builtin'))}">${Object.keys(PROP_OPTION_GLYPHS).map(id => `<button type="button" class="propIconPick ${f.value === id ? 'active' : ''}" data-action="prop-editor-icon-pick" data-icon="${id}" aria-pressed="${f.value === id}" title="${esc(T('prop.icons.glyph.' + id))}">${propBuiltinIconHtml(id)}<span>${esc(T('prop.icons.glyph.' + id))}</span></button>`).join('')}</div>` : ''}
    ${f.kind === 'url' ? `<label class="field"><span class="fieldLabel">${esc(T('prop.icons.url'))}</span><input class="input" id="propIconUrl" data-prop-icon-url value="${esc(f.value)}" maxlength="2048" placeholder="https://…/icon.svg" autocomplete="off"><span class="propHint">${esc(T('prop.icons.urlHint'))}</span></label>` : ''}
    <button type="button" class="btn btn-primary btn-sm" data-action="prop-editor-icon-apply">${esc(T('prop.icons.apply'))}</button></div>`;
}
function propApplyIconDraft() {
  const m = propFirmEditor, f = m?.iconForm;
  if (!f || m.busy || !propIsAdmin() || m.owner !== session?.user?.id) return false;
  const row = propIconRow(f.field, f.label, f.kind, f.value);
  if (!row) { m.error = T(f.kind === 'url' ? 'prop.icons.invalidUrl' : 'prop.icons.invalidConfig'); propFirmEditorChanged(); return false; }
  const base = m.iconBase.find(r => r.id === row.id);
  m.iconEdits = m.iconEdits.filter(r => r.id !== row.id);
  if (row.kind !== (base?.kind || 'default') || row.value !== (base?.value || '')) m.iconEdits.push({ ...row, expected_revision: base?.revision || 0 });
  m.iconForm = null; m.error = null;
  propRenderIconPanel(); propRefreshEditorChoices(); propFirmEditorChanged();
  return true;
}
function propRefreshEditorChoices() {
  const m = propFirmEditor; if (!m) return;
  PROP_FIRM_CHOICE_FIELDS.forEach(field => {
    const root = document.getElementById('propChoiceOptions-' + field);
    if (root) root.innerHTML = propFirmChoiceOptionsHtml(field, m);
    propFilterEditorChoices(field);
  });
}
function propFilterEditorChoices(field) {
  const m = propFirmEditor, root = document.getElementById('propChoiceOptions-' + field);
  if (!m || !root) return;
  const needle = (m.choiceSearch[field] || '').trim().toLowerCase(); let count = 0;
  root.querySelectorAll('.propChoiceRow').forEach(el => { el.hidden = !(el.textContent + ' ' + el.dataset.propOptionLabel).toLowerCase().includes(needle); if (!el.hidden) count++; });
  const empty = document.getElementById('propChoiceEmpty-' + field); if (empty) empty.hidden = count > 0;
}
function propRequestEditorLeave(next) {
  const m = propFirmEditor;
  if (!m) { next(); return true; }
  if (m.busy) return false;
  if (propFirmEditorDirty(m)) { m.pendingLeave = next; propRenderEditorConfirm(); document.getElementById('propEditorStay')?.focus({ preventScroll: true }); return false; }
  propFirmEditor = null; next(); return true;
}
function propDiscardFirmEditor() {
  const m = propFirmEditor;
  if (!m || m.busy || !m.pendingLeave) return;
  const next = m.pendingLeave; propFirmEditor = null; next();
}
function propRenderEditorConfirm() {
  const m = propFirmEditor, root = document.getElementById('propEditorConfirm'); if (!m || !root) return;
  const refresh = m.refreshConfirm;
  const html = !m.pendingLeave && !refresh ? '' : `<div class="propEditorConfirm" role="alertdialog" aria-labelledby="propEditorConfirmTitle" aria-describedby="propEditorConfirmHint"><h3 id="propEditorConfirmTitle">${esc(T(refresh ? 'prop.editor.refreshIconsTitle' : 'prop.editor.unsavedTitle'))}</h3><p id="propEditorConfirmHint">${esc(T(refresh ? 'prop.icons.refreshHint' : 'prop.editor.unsavedHint'))}</p><div><button type="button" class="btn" id="propEditorStay" data-action="prop-editor-stay">${esc(T('prop.editor.stay'))}</button><button type="button" class="btn" data-action="${refresh ? 'prop-editor-confirm-refresh' : 'prop-editor-discard'}">${esc(T(refresh ? 'prop.editor.refreshIconsConfirm' : 'prop.editor.discard'))}</button></div></div>`;
  if (root.__html !== html) { root.innerHTML = html; root.__html = html; }
}
async function propRefreshSharedIcons() {
  const m = propFirmEditor; if (!m || m.busy || !propIsAdmin() || m.owner !== session?.user?.id) return false;
  m.busy = true; m.refreshConfirm = false; propFirmEditorChanged();
  try {
    const { data, error } = await fetchAllRows(() => sb.from('prop_option_icons').select('*', { count: 'exact' }).order('id', { ascending: true }));
    if (error) throw error;
    if (propFirmEditor !== m || session?.user?.id !== m.owner) return false;
    propOptionIcons = data || []; m.iconBase = JSON.parse(JSON.stringify(propOptionIcons)); m.iconEdits = []; m.iconForm = null; m.error = null;
    propRenderIconPanel(); propRefreshEditorChoices(); return true;
  } catch (error) { m.error = noteDbError(error) ? T('error.dbOutdated') : T('prop.loadFailed', { msg: error?.message || String(error) }); return false; }
  finally { m.busy = false; propFirmEditorChanged(); }
}
async function propSaveFirmEditor() {
  const m = propFirmEditor;
  if (!m || m.busy || !propIsAdmin() || m.owner !== session?.user?.id) return false;
  m.error = null;
  if (!String(m.draft.name || '').trim()) { m.error = T('prop.form.needFirm'); propSelectEditorSection('basic'); }
  else if (!m.isNew && !propFindFirm(m.id)) m.error = T('prop.editor.missingFirm');
  else if (Object.values(m.customTexts).some(v => v.trim())) { m.error = T('prop.editor.pendingCustom'); propSelectEditorSection('choices'); }
  else if (propIconFormDirty(m)) { m.error = T('prop.icons.unapplied'); propSelectEditorSection('choices'); }
  else {
    const choices = propValidateFirmChoices(m.draft), updates = propValidateFirmUpdates(m.draft.recentUpdates, m.draft.updatesPreviewCount);
    if (choices.length) { m.error = choices[0]; propSelectEditorSection('choices'); }
    else if (updates.length) { m.error = updates[0]; propSelectEditorSection('updates'); }
    else { const designErrors = propValidatePresentation(propDraftPresentation(m.draft)); if (designErrors.length) { m.error = designErrors[0]; propSelectEditorSection('review'); } }
  }
  if (m.error) { propFirmEditorChanged(); return false; }
  const firm = propAdmFirmValue(m);
  m.busy = true; propFirmEditorChanged();
  const ok = await propSaveFirmWithIcons(firm, m.iconEdits, m.isNew);
  if (propFirmEditor !== m || m.owner !== session?.user?.id) return false;
  m.busy = false;
  if (!ok) { m.error = propError || T('prop.icons.invalidConfig'); propFirmEditorChanged(); return false; }
  const index = propFirms.findIndex(f => f.id === firm.id);
  if (index < 0) propFirms.push(firm); else propFirms[index] = firm;
  m.id = firm.id; m.isNew = false; m.draft = propAdmFirmDraft(firm); m.original = propStableJson(m.draft);
  m.iconBase = JSON.parse(JSON.stringify(propOptionIcons)); m.iconEdits = []; m.iconForm = null; m.pendingLeave = null; m.error = null; propError = null;
  propRenderFirmEditor(true); return true;
}
function propEditorHandleInput(e) {
  const t = e.target, m = propFirmEditor;
  if (!m || m.busy || !propIsAdmin() || m.owner !== session?.user?.id || !t.closest?.('#propFirmEditorMount')) return;
  if (PROP_EDITOR_FIELDS.includes(t.dataset.propField)) {
    const field = t.dataset.propField;
    m.draft[field] = field === 'hidden' ? !!t.checked : field === 'magicPolicy' ? propMagicPolicy({ magicPolicy: t.value }) : t.value;
  } else if (PROP_FIRM_CHOICE_FIELDS.includes(t.dataset.propChoiceCustom)) m.customTexts[t.dataset.propChoiceCustom] = t.value;
  else if (PROP_FIRM_CHOICE_FIELDS.includes(t.dataset.propChoiceSearch)) { m.choiceSearch[t.dataset.propChoiceSearch] = t.value; propFilterEditorChoices(t.dataset.propChoiceSearch); }
  else if (t.dataset.propIconUrl !== undefined && m.iconForm) m.iconForm.value = t.value;
  else if (t.dataset.propIconSource !== undefined && m.iconForm && ['default', 'builtin', 'url', 'none'].includes(t.value)) {
    m.iconForm.kind = t.value; m.iconForm.value = t.value === 'builtin' ? 'tag' : ''; propRenderIconPanel(); document.getElementById('propIconSource')?.focus({ preventScroll: true });
  }
  propFirmEditorChanged();
}
document.addEventListener('toggle', e => {
  if (propFirmEditor && e.target?.dataset?.propEditorPreview !== undefined && e.target.closest?.('#propFirmEditorMount')) propFirmEditor.previewOpen = e.target.open;
}, true);
document.addEventListener('input', propEditorHandleInput);
document.addEventListener('change', propEditorHandleInput);
document.addEventListener('click', async e => {
  const el = e.target.closest?.('[data-action]'), m = propFirmEditor;
  if (!m || !propIsAdmin() || m.owner !== session?.user?.id || !el || !el.dataset.action.startsWith('prop-editor-') || m.busy) return;
  const a = el.dataset.action;
  if (a === 'prop-editor-section') propSelectEditorSection(el.dataset.section);
  else if (a === 'prop-editor-save') await propSaveFirmEditor();
  else if (a === 'prop-editor-icon-edit') propEditOptionIcon(el.dataset.field, el.dataset.value);
  else if (a === 'prop-editor-icon-pick' && m.iconForm && Object.prototype.hasOwnProperty.call(PROP_OPTION_GLYPHS, el.dataset.icon)) {
    m.iconForm.value = el.dataset.icon; propRenderIconPanel(); propFirmEditorChanged();
    document.querySelector(`[data-action="prop-editor-icon-pick"][data-icon="${el.dataset.icon}"]`)?.focus({ preventScroll: true });
  } else if (a === 'prop-editor-icon-apply') propApplyIconDraft();
  else if (a === 'prop-editor-icon-close') { m.iconForm = null; m.error = null; propRenderIconPanel(); propFirmEditorChanged(); }
  else if (a === 'prop-editor-back') propRequestEditorLeave(() => { propView = m.origin.view; propCatalogFirm = m.origin.firm; propCatalogFirmSize = m.origin.size; render(); window.scrollTo?.({ top: m.returnScroll }); });
  else if (a === 'prop-editor-stay') { m.pendingLeave = null; m.refreshConfirm = false; propRenderEditorConfirm(); }
  else if (a === 'prop-editor-discard') propDiscardFirmEditor();
  else if (a === 'prop-editor-refresh-icons') { m.refreshConfirm = true; m.pendingLeave = null; propRenderEditorConfirm(); document.getElementById('propEditorStay')?.focus({ preventScroll: true }); }
  else if (a === 'prop-editor-confirm-refresh') await propRefreshSharedIcons();
});
// 确认期间语言/账号菜单可能重绘；保存动作数据，不保留会失效的按钮节点。
function propReplayEditorNavigation(data) {
  render();
  const button = document.createElement('button');
  button.type = 'button'; button.hidden = true;
  Object.entries(data).forEach(([key, value]) => { button.dataset[key] = value; });
  document.body.appendChild(button);
  try { button.click(); } finally { button.remove(); }
}
// 只拦真正离开编辑页的动作，不阻断编辑器容器的事件冒泡。
document.addEventListener('click', e => {
  const m = propFirmEditor, el = e.target.closest?.('[data-action]');
  if (!m || !el) return;
  const a = el.dataset.action;
  const leaves = ['switch-tab', 'logout', 'switch-account', 'add-account', 'prop-view', 'prop-cat-firm', 'prop-adm-firm', 'prop-open-import'].includes(a);
  if (!leaves) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const intent = { ...el.dataset };
  propRequestEditorLeave(() => propReplayEditorNavigation(intent));
}, true);
function propFirmEditorBeforeUnload(e) {
  if (propFirmEditor && (propFirmEditor.busy || propFirmEditorDirty())) { e.preventDefault(); e.returnValue = ''; }
}
window.addEventListener('beforeunload', propFirmEditorBeforeUnload);
document.addEventListener('keydown', e => {
  if (!propFirmEditor || e.isComposing) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && e.target.closest?.('#propFirmEditorMount')) { e.preventDefault(); propSaveFirmEditor(); }
});

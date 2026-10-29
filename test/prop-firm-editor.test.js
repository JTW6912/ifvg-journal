const test = require('node:test');
const assert = require('node:assert/strict');
const { makeContext, ENGINE_FILES } = require('./load');
const plain = v => JSON.parse(JSON.stringify(v));
const firm = { id: 'a', name: 'Firm A', platforms: ['Rithmic', 'Shared'], paymentMethods: ['Visa'], payoutMethods: ['Rise'], kycRequirements: ['Passport'], review: '**Keep**', notes: 'Original', recentUpdates: [], faq: [{ topic: 'Keep me' }], promo: { discount: '20%', text: 'Offer', extra: 'Keep metadata' } };
function setup() {
  const c = makeContext(ENGINE_FILES, { URL });
  c.set('session', { user: { id: 'admin-test' } }); c.set('currentProfile', { role: 'admin', active: true });
  c.set('propFirms', [firm, { id: 'b', name: 'Firm B', platforms: ['Shared'] }]);
  c.sandbox.document.documentElement.dataset.layout = 'modern';
  c.run('render = () => {}; propRenderModal = () => {}; tab = "prop";');
  return c;
}
function call(c, fn, ...args) { c.sandbox.__args = args; return c.run(`${fn}(...__args)`); }

test('独立编辑页使用隔离草稿；既有弹窗仍使用自身上下文', () => {
  const c = setup();
  assert.equal(call(c, 'propOpenFirmEditor', 'a'), true);
  assert.equal(c.run('propModal'), null);
  assert.equal(c.run('propFirmEditorDirty()'), false);
  c.run('propSetFirmChoice("platforms", "Custom, Suite", true); propAddFirmUpdate();');
  assert.equal(c.run('propFirmEditorDirty()'), true);
  assert.equal(c.run('propFirmEditor.draft.platforms.includes("Custom, Suite")'), true);
  assert.deepEqual(plain(c.run('propFirms[0]')), firm);
  c.run('propModal = { type: "account", draft: { name: "Account" } };');
  assert.equal(c.run('propFirmEditContext().id'), 'a');
  assert.equal(c.run('propModal.draft.name'), 'Account');
});

test('选择图标先应用草稿，再统一保存；同名配置不即时发布', () => {
  const c = setup(); call(c, 'propOpenFirmEditor', 'a');
  call(c, 'propEditOptionIcon', 'platforms', 'Shared');
  c.run('propFirmEditor.iconForm.kind = "builtin"; propFirmEditor.iconForm.value = "globe";');
  assert.equal(c.run('propFirmEditorDirty()'), true);
  assert.equal(c.run('propOptionIcons.length'), 0);
  assert.equal(c.run('propApplyIconDraft()'), true);
  assert.equal(c.run('propFirmEditor.iconEdits[0].expected_revision'), 0);
  assert.equal(c.run('propOptionIcons.length'), 0);
  assert.match(c.run('propChoiceIconHtml("platforms", "Shared", propEditorIconRows())'), /<svg/);
});

test('离开保护保留草稿，只有显式放弃后才执行待定导航', () => {
  const c = setup(); call(c, 'propOpenFirmEditor', 'a');
  c.run('propFirmEditor.draft.notes = "Draft"; var navigated = false; propRequestEditorLeave(() => { navigated = true; });');
  assert.equal(c.run('navigated'), false);
  assert.equal(c.run('propFirmEditor.draft.notes'), 'Draft');
  c.run('propFirmEditor.pendingLeave = null; propRequestEditorLeave(() => { navigated = true; }); propDiscardFirmEditor();');
  assert.equal(c.run('navigated'), true);
  assert.equal(c.run('propFirmEditor'), null);
  assert.equal(c.run('propFirms[0].notes'), 'Original');
});

test('未添加自定义文本、未应用图标及保存中状态均受保护', async () => {
  const c = setup(); call(c, 'propOpenFirmEditor', 'a');
  c.run('propFirmEditor.customTexts.platforms = "Pending";');
  assert.equal(c.run('propFirmEditorDirty()'), true);
  await c.run('propSaveFirmEditor()');
  assert.ok(c.run('propFirmEditor.error'));
  c.run('propFirmEditor.customTexts.platforms = ""; propFirmEditor.busy = true; var navigated = false;');
  assert.equal(c.run('propRequestEditorLeave(() => { navigated = true; })'), false);
  c.run('propSetFirmChoice("platforms", "Forbidden", true); propAddFirmUpdate();');
  assert.equal(c.run('propFirmEditor.draft.platforms.includes("Forbidden")'), false);
  assert.equal(c.run('propFirmEditor.draft.recentUpdates.length'), 0);
});

test('保存成功留在编辑页，保留未知字段、共享图标及其它公司选择', async () => {
  const c = setup(); call(c, 'propOpenFirmEditor', 'a');
  let sent;
  c.sandbox.__client = { rpc: async (_, args) => { sent = plain(args); return { data: { icons: args.icon_changes.map(r => ({ ...r, revision: 1 })) }, error: null }; } };
  c.run('sb = __client; propFirmEditor.draft.notes = "Changed";');
  call(c, 'propEditOptionIcon', 'platforms', 'Shared');
  c.run('propFirmEditor.iconForm.kind = "builtin"; propFirmEditor.iconForm.value = "globe"; propApplyIconDraft();');
  assert.equal(await c.run('propSaveFirmEditor()'), true);
  assert.equal(c.run('propFirmEditor.id'), 'a');
  assert.equal(c.run('propFirmEditorDirty()'), false);
  assert.equal(c.run('propFirms[0].notes'), 'Changed');
  assert.equal(sent.firm.data.promo.extra, 'Keep metadata');
  assert.deepEqual(sent.firm.data.faq, firm.faq);
  assert.deepEqual(plain(c.run('propFirms[1].platforms')), ['Shared']);
  assert.equal(c.run('propOptionIcons[0].value'), 'globe');
});

test('返回错误和拒绝Promise均不发布公司或图标，草稿可继续保存', async () => {
  for (const rejects of [false, true]) {
    const c = setup(); call(c, 'propOpenFirmEditor', 'a');
    const before = c.run('JSON.stringify(propFirms)');
    c.sandbox.__client = { rpc: async () => { if (rejects) throw new Error('offline'); return { error: { message: 'offline' } }; } };
    c.run('sb = __client; propFirmEditor.draft.notes = "Unsaved";');
    assert.equal(await c.run('propSaveFirmEditor()'), false);
    assert.equal(c.run('JSON.stringify(propFirms)'), before);
    assert.equal(c.run('propFirmEditor.draft.notes'), 'Unsaved');
    assert.equal(c.run('propFirmEditor.busy'), false);
    assert.ok(c.run('propFirmEditor.error'));
  }
});

test('权限变化/切换账号后不能继续编辑，普通用户打不开编辑页', () => {
  const c = setup(); call(c, 'propOpenFirmEditor', 'a');
  c.set('session', { user: { id: 'other' } }); c.run('propCheckFirmEditorSession();');
  assert.equal(c.run('propFirmEditor'), null);
  c.set('currentProfile', { role: 'user' });
  assert.equal(call(c, 'propOpenFirmEditor', 'a'), false);
  c.set('currentProfile', { role: 'admin', active: false });
  assert.equal(call(c, 'propOpenFirmEditor', 'a'), false);
});

test('页面有分区、固定保存入口、预览和共享影响提示，不生成模态遮罩', () => {
  const c = setup(); call(c, 'propOpenFirmEditor', 'a');
  const html = c.run('propFirmEditorHtml(propFirmEditor)');
  for (const section of ['basic', 'choices', 'review', 'updates', 'notes']) assert.ok(html.includes(`data-prop-editor-section="${section}"`));
  assert.match(html, /data-action="prop-editor-save"/);
  assert.match(html, /id="propEditorPreviewBody"/);
  assert.match(html, /同一类中/);
  assert.doesNotMatch(html, /class="overlay|propModal/);
});

test('刷新或关闭时，未提交输入与保存中的请求会触发保护，干净草稿不会', () => {
  const c = setup(); call(c, 'propOpenFirmEditor', 'a');
  let prevented = 0;
  c.sandbox.__event = { preventDefault() { prevented++; } };
  c.run('propFirmEditorBeforeUnload(__event)'); assert.equal(prevented, 0);
  c.run('propFirmEditor.customTexts.platforms = "Pending option"; propFirmEditorBeforeUnload(__event)');
  assert.equal(prevented, 1); assert.equal(c.sandbox.__event.returnValue, '');
  c.run('propFirmEditor.customTexts.platforms = ""; propFirmEditor.busy = true; propFirmEditorBeforeUnload(__event)');
  assert.equal(prevented, 2);
});

test('编辑页与内置图标的中英文文案齐全，预览按当前分区显示', () => {
  const c = setup(); call(c, 'propOpenFirmEditor', 'a');
  const keys = c.run('Object.keys(I18N.zh).filter(k => /^prop\\.(icons|editor)\\./.test(k))');
  for (const key of keys) assert.equal(c.run(`typeof I18N.en[${JSON.stringify(key)}]`), 'string', key);
  c.run('propFirmEditor.section = "review"');
  assert.match(c.run('propFirmEditorPreviewHtml(propFirmEditor)'), /<strong>Keep<\/strong>/);
  c.run('propFirmEditor.section = "choices"');
  assert.doesNotMatch(c.run('propFirmEditorPreviewHtml(propFirmEditor)'), /<strong>Keep<\/strong>/);
});

test('离开动作通过数据重放，不依赖确认期间可能被重绘移除的旧导航节点', () => {
  const c = setup();
  const events = [], button = { dataset: {}, click() { events.push({ ...this.dataset }); }, remove() { events.push('removed'); } };
  c.sandbox.document.createElement = () => button;
  c.sandbox.document.body.appendChild = el => { assert.equal(el, button); events.push('attached'); };
  call(c, 'propReplayEditorNavigation', { action: 'switch-tab', tab: 'analytics' });
  assert.equal(button.hidden, true); assert.equal(button.type, 'button');
  assert.deepEqual(events, ['attached', { action: 'switch-tab', tab: 'analytics' }, 'removed']);
});

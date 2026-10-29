const test = require('node:test');
const assert = require('node:assert/strict');
const { makeContext, ENGINE_FILES } = require('./load');
function setup() {
  const c = makeContext(ENGINE_FILES, { URL });
  c.run('lang = "zh"; render = () => {}; propRenderModal = () => {};');
  c.set('currentProfile', { role: 'admin', active: true });
  c.set('session', { user: { id: 'admin' } });
  c.sandbox.document.documentElement.dataset.layout = 'modern';
  return c;
}
function call(c, fn, ...args) { c.sandbox.__args = args; return c.run(`${fn}(...__args)`); }
const plain = v => JSON.parse(JSON.stringify(v));
const styled = { id: 'sample', name: 'Sample', review: 'Read [[icon:star]] **carefully**', keySentence: { text: 'Check the **rules**', icon: 'star', style: { preset: 'custom', border: '#cc9900', fill: '#fff0c0' } }, promo: { discount: '40%', text: 'A real offer description', code: 'EXAMPLE', url: 'https://offers.example.com/plan', buttonText: 'Offer details', icon: 'tag', hot: true, style: { preset: 'gold', button: '#926000' }, extra: 'preserved' }, recentUpdates: [{ id: 'u', date: '2026-10-28', type: 'rules', text: 'Ordinary paragraph\n\n[[box:pc_one]]\n\nEnding', style: { preset: 'sky' }, callouts: [{ id: 'pc_one', text: '**Important**\nSecond line', icon: 'alert', style: { preset: 'custom', border: '#ab1234', fill: '#ffeeee' } }] }] };

test('安全图标语法仅渲染可信图标，不接受任意SVG/属性，纯文本显示去掉标记', () => {
  const c = setup();
  const html = call(c, 'propReviewHtml', 'Before [[icon:star]] **after**');
  assert.match(html, /propInlineIcon/); assert.match(html, /<strong>after<\/strong>/);
  const bad = call(c, 'propReviewHtml', '[[icon:<img src=x onerror=bad>]] <svg onload=bad>');
  assert.doesNotMatch(bad, /<img|onload=bad>|<svg/); assert.match(bad, /&lt;svg/);
  assert.equal(call(c, 'propReviewPlainText', 'Before [[icon:star]] after'), 'Before  after');
  assert.match(call(c, 'propReviewHtml', '[[icon:not-real]]'), /\[\[icon:not-real\]\]/);
});

test('颜色白名单不允许CSS注入，主题/预设/自定义保留各自值', () => {
  const c = setup();
  assert.equal(call(c, 'propPresentationStyleValid', { preset: 'custom', border: '#FFAA00', fill: '#010203', button: '#abcdef' }), true);
  for (const style of [{ fill: 'red;position:fixed' }, { border: 'url(https://evil.example.com)' }, { preset: '__proto__' }, [], 'red']) assert.equal(call(c, 'propPresentationStyleValid', style), false);
  const css = call(c, 'propPresentationStyleAttr', { preset: 'custom', border: '#123456', fill: 'red;position:fixed' });
  assert.doesNotMatch(css, /position|url\(/); assert.match(css, /#123456/);
});

test('关键句始终在推荐语折叠正文之外，优惠卡包含图标/标记/复制按钮和安全链接', () => {
  const c = setup();
  const html = call(c, 'propRecommendationCard', styled, 1);
  assert.match(html, /propKeySentence/); assert.match(html, /Check the <strong>rules<\/strong>/);
  assert.ok(html.indexOf('propKeySentence') < html.indexOf('data-prop-review-id'));
  assert.match(html, /data-action="prop-copy-coupon"/); assert.match(html, /EXAMPLE/);
  assert.match(html, /rel="noopener noreferrer"/); assert.match(html, /propCouponHot/);
  assert.match(html, /data-prop-copy-protected/);
  assert.doesNotMatch(call(c, 'propCouponHtml', { ...styled, promo: { url: 'javascript:bad', text: '<script>bad</script>' } }), /href=|<script>/);
  assert.doesNotMatch(call(c, 'propCouponHtml', { id: 'empty' }), /data-action="prop-copy-coupon"|href=|HOT/);
});

test('近期更新整条颜色与正文局部框独立，原文/顺序/折叠不会抹掉框内容', () => {
  const c = setup();
  const html = call(c, 'propFirmUpdatesHtml', styled, false);
  assert.match(html, /propUpdateGlass/); assert.match(html, /propCallout/);
  assert.match(html, /#ab1234/); assert.match(html, /#ffeeee/);
  assert.ok(html.indexOf('Ordinary paragraph') < html.indexOf('<strong>Important</strong>'));
  assert.ok(html.indexOf('Second line') < html.indexOf('Ending'));
  const compact = call(c, 'propFirmUpdatesHtml', styled, true);
  assert.match(compact, /propCallout/);
  assert.equal(call(c, 'propValidateFirmUpdates', styled.recentUpdates).length, 0);
});

test('强调框插入/删除保持选区外文本，未知/重复/悬空引用拒绝保存', () => {
  const c = setup();
  const edit = call(c, 'propCalloutInsert', { text: 'Before selected after', callouts: [] }, 7, 15, 'pc_test');
  assert.equal(edit.callouts[0].text, 'selected');
  assert.match(edit.text, /^Before /); assert.match(edit.text, / after$/);
  const removed = call(c, 'propCalloutRemove', edit, 'pc_test');
  assert.match(removed.text, /selected/); assert.equal(removed.callouts.length, 0);
  const base = { id: 'u', date: '2026-10-28', type: 'rules', text: '[[box:missing]]' };
  assert.ok(call(c, 'propValidateFirmUpdates', [base]).length);
  assert.ok(call(c, 'propValidateFirmUpdates', [{ ...styled.recentUpdates[0], callouts: [] }]).length);
  assert.ok(call(c, 'propValidateFirmUpdates', [{ ...base, text: 'plain', callouts: [{ id: 'unused', text: 'must not disappear' }] }]).length);
});

test('新增配置保存/导出/导入往返且不覆盖未知公司字段或优惠字段', async () => {
  const c = setup(); c.set('propFirms', [{ ...styled, customData: 'Keep' }]);
  let saved;
  c.sandbox.__client = { from: () => ({ upsert: async rows => { saved = plain(rows[0]); return { error: null }; } }) };
  c.run('sb=__client; propModal={type:"admFirm",id:"sample",isNew:false,draft:propAdmFirmDraft(propFirms[0])};');
  await c.run('propAdmSaveFirm()');
  assert.deepEqual(saved.data.keySentence, styled.keySentence);
  assert.deepEqual(saved.data.promo, styled.promo);
  assert.deepEqual(saved.data.recentUpdates, styled.recentUpdates);
  assert.equal(saved.data.customData, 'Keep');
  assert.equal(c.run('propValidateCatalog(propCatalogExport()).errors.length'), 0);
});

test('非法样式/链接阻止保存且保留草稿，不污染其它公司', async () => {
  const c = setup(); c.set('propFirms', [styled]);
  c.sandbox.__client = { rpc() { throw new Error('must not save invalid input'); } };
  c.run('sb=__client; propOpenFirmEditor("sample","review"); propFirmEditor.draft.promoDesign.url="javascript:bad";');
  assert.equal(await c.run('propSaveFirmEditor()'), false);
  assert.ok(c.run('propFirmEditor.error'));
  assert.equal(c.run('propFirmEditor.draft.promoDesign.url'), 'javascript:bad');
  assert.equal(c.run('propFirms[0].promo.url'), styled.promo.url);
  c.set('currentProfile', { role: 'user' });
  assert.equal(call(c, 'propSetPresentationField', 'keySentence.text', 'Unauthorized'), false);
});

test('优惠码复制仅写对应码，失败不能报成功，按钮与编辑框不拦常规操作', async () => {
  const c = setup(); let copied = '', messages = [];
  c.sandbox.navigator.clipboard = { writeText: async text => { copied = text; } };
  c.sandbox.__toast = text => messages.push(text); c.run('propToast = __toast');
  assert.equal(await call(c, 'propCopyCoupon', 'EXAMPLE'), true); assert.equal(copied, 'EXAMPLE');
  c.sandbox.navigator.clipboard.writeText = async () => { throw new Error('denied'); };
  assert.equal(await call(c, 'propCopyCoupon', 'SECOND'), false);
  assert.equal(copied, 'EXAMPLE'); assert.equal(messages.length, 2); assert.notEqual(messages[0], messages[1]);
});

test('局部框插入保护已有标记，完整格式选区会保留加粗，移除悬空框也保留文字', () => {
  const c = setup();
  assert.equal(call(c, 'propCalloutInsert', styled.recentUpdates[0], 30, 30, 'new_box'), null);
  const marked = call(c, 'propCalloutInsert', { text: 'A **selected** Z' }, 4, 12, 'new_box');
  assert.equal(marked.callouts[0].text, '**selected**');
  const orphan = call(c, 'propCalloutRemove', { text: 'Body', callouts: [{ id: 'lost', text: 'Preserve this' }] }, 'lost');
  assert.match(orphan.text, /Preserve this/);
});

test('同名局部框可属于不同更新，但DOM输入目标必须隔离', () => {
  const c = setup();
  const a = call(c, 'propUpdateDesignEditorHtml', styled.recentUpdates[0], 0);
  const b = call(c, 'propUpdateDesignEditorHtml', styled.recentUpdates[0], 1);
  assert.match(a, /id="propCalloutText-0-pc_one"/); assert.match(b, /id="propCalloutText-1-pc_one"/);
});

test('配色操作只改对应草稿，非法路径/颜色/权限不能污染数据', () => {
  const c = setup(); c.set('propFirms', [styled]); c.run('propOpenFirmEditor("sample")');
  const before = c.run('JSON.stringify(propFirms)');
  assert.equal(call(c, 'propSetPresentationField', 'updates.0.style.preset', 'rose'), true);
  assert.equal(call(c, 'propSetPresentationField', 'updates.0.callouts.pc_one.style.border', '#112233'), true);
  assert.equal(c.run('propFirmEditor.draft.recentUpdates[0].style.preset'), 'rose');
  assert.equal(c.run('propFirmEditor.draft.recentUpdates[0].callouts[0].style.border'), '#112233');
  assert.equal(c.run('JSON.stringify(propFirms)'), before);
  call(c, 'propSetPresentationField', 'keySentence.style.preset', 'gold');
  call(c, 'propSetPresentationField', 'keySentence.style.preset', 'custom');
  assert.equal(c.run('propFirmEditor.draft.keySentence.style.fill'), '#ffe2a1');
  const draft = c.run('JSON.stringify(propFirmEditor.draft)');
  for (const [path, value] of [['keySentence.style.preset','__proto__'],['keySentence.style.fill','url(x)'],['promoDesign.__proto__.role','admin'],['updates.999.style.preset','gold']]) assert.equal(call(c, 'propSetPresentationField', path, value), false);
  assert.equal(c.run('JSON.stringify(propFirmEditor.draft)'), draft);
  c.run('propFirmEditor.busy = true'); assert.equal(call(c, 'propSetPresentationField', 'keySentence.text', 'Busy'), false);
});

test('复制保护只拦展示区和跨区选中，输入控件与非相关区域保持正常', () => {
  const c = setup();
  const protectedNode = { closest: s => s === '[data-prop-copy-protected]' ? protectedNode : null };
  const outside = { closest: () => null };
  const input = { closest: s => s.startsWith('input,') ? input : null };
  c.sandbox.__event = { target: protectedNode }; assert.equal(c.run('propCopyProtected(__event)'), true);
  c.sandbox.__event.target = input; assert.equal(c.run('propCopyProtected(__event)'), false);
  c.sandbox.__event.target = outside; c.sandbox.document.activeElement = outside;
  c.sandbox.window.getSelection = () => ({ isCollapsed: false, rangeCount: 1, anchorNode: outside, focusNode: outside, getRangeAt: () => ({ intersectsNode: () => true }) });
  c.sandbox.document.querySelectorAll = () => [{ getClientRects: () => [1] }];
  assert.equal(c.run('propCopyProtected(__event)'), true);
  c.sandbox.document.querySelectorAll = () => [{ getClientRects: () => [] }];
  assert.equal(c.run('propCopyProtected(__event)'), false);
  c.sandbox.window.getSelection = () => ({ isCollapsed: true, anchorNode: protectedNode });
  assert.equal(c.run('propCopyProtected(__event)'), false);
});

test('展示配置新文案中英完整且渲染不产生未翻译键', () => {
  const c = setup(); const keys = c.run('Object.keys(I18N.zh).filter(k => k.startsWith("prop.design."))');
  assert.ok(keys.length > 40);
  for (const key of keys) assert.equal(c.run(`typeof I18N.en[${JSON.stringify(key)}]`), 'string');
  c.run('lang = "en"'); assert.doesNotMatch(call(c, 'propCouponHtml', styled), /prop\.design\./);
});

test('classic 继续用原卡片外壳，新增图标语法回退为纯文本而不泄露标记', () => {
  const c = setup(); c.sandbox.document.documentElement.dataset.layout = 'classic';
  c.set('propFirms', [{ ...styled, promo: { text: '[[icon:tag]] **Benefit**' } }]);
  const html = c.run('renderPropBoard()');
  assert.match(html, /propBoardCard/); assert.match(html, /Benefit/);
  assert.doesNotMatch(html, /\[\[icon:|propGlassSurface|propCoupon/);
});

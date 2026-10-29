const test = require('node:test');
const assert = require('node:assert/strict');
const { makeContext, ENGINE_FILES } = require('./load');
function setup(admin = true) {
  const c = makeContext(ENGINE_FILES, { URL });
  c.sandbox.document.documentElement.dataset.layout = 'modern';
  c.set('currentProfile', { role: admin ? 'admin' : 'user', active: true });
  c.set('session', { user: { id: 'test-admin' } });
  c.run('lang="zh"; render=()=>{}; propRenderModal=()=>{};');
  return c;
}
function call(c, fn, ...args) { c.sandbox.__args = args; return c.run(`${fn}(...__args)`); }
const updates = [1, 3, 2, 4, 5, 6].map(n => ({ id: 'u' + n, date: `2026-10-2${n}`, type: 'rules', text: 'Update ' + n }));
const firm = { id: 'a', name: 'A', review: 'Recommendation', keySentence: { text: 'Key sentence', icon: 'star' }, recentUpdates: updates };
const countRows = html => (html.match(/class="propFirmUpdate"/g) || []).length;

test('排行默认一条且取最新记录，配置数量不删除历史，详情总是完整', () => {
  const c = setup();
  const html = call(c, 'propFirmUpdatesHtml', firm, true);
  assert.equal(countRows(html), 1); assert.match(html, /Update 6/); assert.doesNotMatch(html, /Update 5/);
  for (const n of [1, 2, 3, 4, 5]) assert.equal(countRows(call(c, 'propFirmUpdatesHtml', { ...firm, updatesPreviewCount: n }, true)), n);
  assert.equal(countRows(call(c, 'propFirmUpdatesHtml', { ...firm, updatesPreviewCount: 'all' }, true)), 6);
  assert.equal(countRows(call(c, 'propFirmUpdatesHtml', { ...firm, updatesPreviewCount: 1 }, false)), 6);
  assert.deepEqual(firm.recentUpdates, updates);
});

test('配置值白名单与导入校验，缺省/空值兼容旧目录但非法值不被静默保存', () => {
  const c = setup();
  for (const value of [undefined, null, 1, 2, 3, 4, 5, 'all']) assert.equal(call(c, 'propValidateFirmUpdates', updates, value).length, 0);
  for (const value of [0, -1, 6, 1.2, '2', true, {}, 'constructor']) {
    assert.ok(call(c, 'propValidateFirmUpdates', updates, value).length > 0);
    assert.equal(call(c, 'propValidateCatalog', { firms: [{ ...firm, updatesPreviewCount: value }], plans: [] }).catalog, null);
    assert.equal(countRows(call(c, 'propFirmUpdatesHtml', { ...firm, updatesPreviewCount: value }, true)), 1);
  }
});

test('条数选择只改当前草稿，忙状态和非管理员拒绝修改', () => {
  const c = setup(); c.set('propFirms', [firm]); c.run('propOpenFirmEditor("a","updates")');
  assert.equal(c.run('propFirmEditor.draft.updatesPreviewCount'), 1);
  assert.equal(call(c, 'propSetUpdatesPreviewCount', '3'), true);
  assert.equal(c.run('propFirmEditor.draft.updatesPreviewCount'), 3);
  assert.equal(c.run('propFirms[0].updatesPreviewCount'), undefined);
  c.run('propFirmEditor.busy=true'); assert.equal(call(c, 'propSetUpdatesPreviewCount', 'all'), false);
  c.run('propFirmEditor.busy=false');
  for (const v of [0, '03', true, [1], null]) assert.equal(call(c, 'propSetUpdatesPreviewCount', v), false);
  c.set('currentProfile', { role: 'user' }); assert.equal(call(c, 'propSetUpdatesPreviewCount', 'all'), false);
});

test('条数配置与全部历史保存/导出/读回，不影响其他公司', async () => {
  const c = setup(); c.set('propFirms', [firm, { id: 'b', name: 'B', recentUpdates: updates }]);
  let saved;
  c.sandbox.__client = { rpc: async (_, args) => { saved = JSON.parse(JSON.stringify(args.firm)); return { data: { icons: [] }, error: null }; } };
  c.run('sb=__client; propOpenFirmEditor("a","updates"); propSetUpdatesPreviewCount("2");');
  assert.equal(await c.run('propSaveFirmEditor()'), true);
  assert.equal(saved.data.updatesPreviewCount, 2); assert.equal(saved.data.recentUpdates.length, 6);
  c.sandbox.__row = saved;
  assert.equal(c.run('propFirmFromRow(__row).updatesPreviewCount'), 2);
  assert.equal(c.run('propCatalogExport().firms[0].updatesPreviewCount'), 2);
  assert.equal(c.run('propFirms[1].updatesPreviewCount'), undefined);
});

test('关键句与正文位于独立左右列，没有关键句时不留空列', () => {
  const c = setup();
  const html = call(c, 'propRecommendationCard', firm, 0);
  assert.match(html, /propRecommendReading hasKey/);
  assert.match(html, /propRecommendKeyColumn/); assert.match(html, /propRecommendTextColumn/);
  assert.ok(html.indexOf('propRecommendKeyColumn') < html.indexOf('propRecommendTextColumn'));
  const textColumn = html.split('propRecommendTextColumn')[1];
  assert.match(textColumn, /propReviewText/); assert.match(textColumn, /prop-review-toggle/);
  const empty = call(c, 'propRecommendationCard', { ...firm, keySentence: { text: '  ' } }, 0);
  assert.doesNotMatch(empty, /propRecommendKeyColumn|hasKey/);
});

test('优惠码整块是单一原生按钮，图标/文字不嵌套按钮，领取链接是独立兄弟元素', () => {
  const c = setup();
  const html = call(c, 'propCouponHtml', { id: 'a', promo: { code: 'CODE<&"', url: 'https://example.com/deal' } });
  const button = html.match(/<button\b[^>]*class="propCouponCode"[\s\S]*?<\/button>/)?.[0];
  assert.ok(button); assert.equal((button.match(/<button\b/g) || []).length, 1);
  assert.equal((html.match(/data-action="prop-copy-coupon"/g) || []).length, 1);
  assert.match(button, /type="button"/); assert.match(button, /data-code="CODE&lt;&amp;&quot;"/);
  assert.match(button, /<code>/); assert.match(button, /propCouponCopyMark/);
  assert.doesNotMatch(button, /<a\b/); assert.match(html.slice(html.indexOf('</button>')), /class="propCouponLink"/);
});

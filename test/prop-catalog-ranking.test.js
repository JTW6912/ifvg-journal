const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { makeContext, ENGINE_FILES } = require('./load');

function setup({ modern = true, count = 8, locale = 'zh', admin = false, editing = false } = {}) {
  const ctx = makeContext(ENGINE_FILES);
  ctx.sandbox.document.documentElement.dataset.layout = modern ? 'modern' : 'classic';
  ctx.set('lang', locale);
  ctx.set('currentProfile', { role: admin ? 'admin' : 'user', active: true });
  ctx.set('propEditMode', editing);
  const firms = Array.from({ length: count }, (_, i) => ({ id: `demo-${i + 1}`, name: `Demo Firm ${i + 1}`, rank: i + 1, tier: 'good', review: `**Demo ${i + 1}**\n\n- Synthetic review`, logo: '' }));
  firms.reverse();
  firms.push({ id: 'demo-hidden', name: 'Hidden Demo', rank: 0, hidden: true });
  ctx.set('propFirms', firms);
  ctx.set('propPlans', firms.map(f => ({ id: `${f.id}-50k`, firm: f.id, series: 'Demo Evaluation', family: 'Demo', size: 50000, status: 'current', type: 'evaluation', price: { list: 50, billing: 'one_time', activation: 0 }, eval: { target: 3000, drawdown: 2000, drawdownType: 'eod' }, funded: {}, payout: {} })));
  ctx.run('propCatalogFirm = ""; propBoardAll = false;');
  return ctx;
}
const hash = html => createHash('sha256').update(html).digest('hex');
const ids = html => [...html.matchAll(/<article class="propRecommendCard" data-prop-firm="([^"]+)"/g)].map(m => m[1]);
// Captured from 7c63118 before the renderer change; synthetic fixture above only.
const BASELINE = {
  'classic-zh-false': 'f11bac4bc80aff25875b16ceb804a943d2f575108e56e741a4923c6f57e8a885',
  'classic-zh-true': '1ce64f7c8a8cd6a37991ab4037e07ea1019f44a6573ab445d1300fb6fa41b082',
  'detail-false-zh': '129558b91f52b08a4504e92a5af3a71896bafd1511ceb27380aba13177b6ff49',
  'detail-true-zh': 'edd1b6fafcaa746b2d5114c98df9150d423d1fbd7dc7633ae538edf1d9f7cd70',
  'classic-en-false': '94293140673735606301f61748df8622e99bd34ac4b697f73fb5747c21c5657b',
  'classic-en-true': '3ffb495b471b2333bfe896419b836a928083e2bd62227ea1af894ed9de58be33',
  'detail-false-en': 'ce8dee4db475fbbc33411e646556ea701947684dfac91018b3a12c6ff306482b',
  'detail-true-en': '3ca49faf5459be2335884d936f1e2943de39df673abca430b763eb585d09f947',
};

test('modern catalog shows every visible firm with no comparison panel or whole-board toggle', () => {
  for (const count of [1, 6, 8, 12]) for (const locale of ['zh', 'en']) {
    const ctx = setup({ count, locale });
    const before = ctx.run('JSON.stringify([propFirms,propPlans,propAccounts,propEntries])');
    for (const all of [false, true]) {
      ctx.set('propBoardAll', all);
      const html = ctx.run('renderPropCatalog()');
      assert.deepEqual(ids(html), Array.from({ length: count }, (_, i) => `demo-${i + 1}`));
      assert.doesNotMatch(html, /propCmpPanel|data-action="prop-board-all"/);
      assert.ok(html.includes('data-action="prop-review-toggle"'), 'card-local fold control remains');
    }
    assert.equal(ctx.run('JSON.stringify([propFirms,propPlans,propAccounts,propEntries])'), before);
  }
});

test('modern does not invoke the price-comparison renderer; classic still does', () => {
  const ctx = setup();
  ctx.run('renderPropCompare = () => { throw new Error("comparison invoked"); };');
  assert.doesNotThrow(() => ctx.run('renderPropCatalog()'));
  ctx.sandbox.document.documentElement.dataset.layout = 'classic';
  assert.throws(() => ctx.run('renderPropCatalog()'), /comparison invoked/);
});

test('classic collapsed and expanded home output remains byte-identical in both languages', () => {
  for (const locale of ['zh', 'en']) for (const all of [false, true]) {
    const ctx = setup({ modern: false, locale }); ctx.set('propBoardAll', all);
    const html = ctx.run('renderPropCatalog()');
    assert.equal(hash(html), BASELINE[`classic-${locale}-${all}`]);
    assert.equal((html.match(/class="propCard propBoardCard/g) || []).length, all ? 8 : 6);
    assert.match(html, /propCmpPanel/); assert.match(html, /data-action="prop-board-all"/);
  }
});

test('firm details retain exact output, plan buying, comparison and back navigation', () => {
  for (const modern of [false, true]) for (const locale of ['zh', 'en']) {
    const ctx = setup({ modern, locale }); ctx.set('propCatalogFirm', 'demo-8');
    const html = ctx.run('renderPropCatalog()');
    assert.equal(hash(html), BASELINE[`detail-${modern}-${locale}`]);
    for (const action of ['prop-cat-firm', 'prop-buy-plan', 'prop-toggle-compare']) assert.ok(html.includes(`data-action="${action}"`));
    ctx.set('propCatalogFirm', '');
    if (modern) assert.equal(ids(ctx.run('renderPropCatalog()')).length, 8);
  }
});

test('admin home keeps full management including hidden firms and catalog tools without comparison', () => {
  const ctx = setup({ admin: true, editing: true });
  const html = ctx.run('renderPropCatalog()');
  for (const action of ['prop-adm-toggle', 'prop-open-import', 'prop-export-catalog', 'prop-adm-move', 'prop-adm-hide', 'prop-adm-firm', 'prop-cat-firm']) assert.ok(html.includes(`data-action="${action}"`));
  assert.match(html, /Hidden Demo/); assert.doesNotMatch(html, /propCmpPanel|data-action="prop-board-all"/);
  ctx.set('propCatalogFirm', 'demo-8');
  assert.match(ctx.run('renderPropCatalog()'), /data-action="prop-adm-plan"/);
});

test('empty, all-hidden, invalid selection and readonly catalog retain safe presentation', () => {
  const ctx = setup({ count: 0 });
  assert.deepEqual(ids(ctx.run('renderPropCatalog()')), []);
  assert.doesNotMatch(ctx.run('renderPropCatalog()'), /propCmpPanel/);
  ctx.set('propFirms', []); ctx.set('propPlans', []);
  assert.match(ctx.run('renderPropCatalog()'), /propEmptyState/);
  const normal = setup();
  for (const id of ['missing', 'demo-hidden']) { normal.set('propCatalogFirm', id); assert.equal(ids(normal.run('renderPropCatalog()')).length, 8); }
  normal.set('viewingUserId', 'synthetic-viewed-owner'); normal.set('propCatalogFirm', 'demo-8');
  const html = normal.run('renderPropCatalog()');
  assert.doesNotMatch(html, /data-action="prop-buy-plan"|data-action="prop-adm-toggle"/);
});

test('ranking reuses exact card markup and escaping, without new network or storage access', () => {
  const ctx = setup();
  ctx.run('propFirms.find(f => f.id === "demo-8").name = "<img src=x onerror=bad>";');
  ctx.sandbox.localStorage.setItem = () => { throw new Error('write'); };
  ctx.sandbox.fetch = () => { throw new Error('network'); };
  ctx.run('sb = { from: () => { throw new Error("database"); } };');
  const card = ctx.run('propRecommendationCard(propFirms.find(f => f.id === "demo-8"), propFamilies("demo-8").length)');
  const html = ctx.run('renderPropCatalog()');
  assert.ok(html.includes(card)); assert.match(html, /&lt;img/); assert.doesNotMatch(html, /<img src=x/);
});

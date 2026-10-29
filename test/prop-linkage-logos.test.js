const test = require('node:test');
const assert = require('node:assert/strict');
const { makeContext, ENGINE_FILES } = require('./load');

const RANGE = { preset: 'custom', from: '2026-10-01', to: '2026-10-31' };
function setup() {
  const listeners = [];
  const ctx = makeContext(ENGINE_FILES, { document: {
    documentElement: { dataset: { layout: 'modern' }, lang: 'zh' },
    addEventListener: (type, handler, capture) => listeners.push({ type, handler, capture }),
    getElementById: () => null, createElement: () => ({ addEventListener() {}, style: {}, dataset: {} }), body: {},
  } });
  ctx.set('lang', 'zh');
  ctx.run('todayStr = () => "2026-10-31"');
  ctx.set('propFirms', [
    { id: 'demo-brand', name: 'Demo Brand', logo: 'img/prop/topstep.webp' },
    { id: 'unsafe', name: 'Unsafe Brand', logo: 'https://example.invalid/remote.svg' },
  ]);
  const fullHistory = [{ to: 'eval', day: '2026-10-01' }, { to: 'passed', day: '2026-10-03' }, { to: 'funded', day: '2026-10-04' }];
  const accounts = [
    { id: 'demo-logo', firm_id: 'demo-brand', firm_name: 'Demo Brand', events: fullHistory },
    { id: 'demo-letters', firm_name: 'Alpha Futures', events: fullHistory },
    { id: 'demo-unsafe', firm_id: 'unsafe', firm_name: 'Unsafe Brand', events: fullHistory },
    { id: 'demo-escaped', firm_name: '<script>unsafe</script>', events: [] },
    { id: 'demo-missing-id', firm_id: 'missing', firm_name: 'Demo Brand', events: [] },
  ].map(a => ({ bought_on: '2026-10-01', nickname: a.id, status: a.events.length ? 'funded' : 'eval', plan_snapshot: { type: 'evaluation' }, ...a }));
  ctx.set('propAccounts', accounts);
  ctx.set('propEntries', [{ id: 'demo-payout', account_id: 'demo-logo', kind: 'payout', amount: 200, day: '2026-10-06', pending: false }]);
  const call = (name, ...args) => { ctx.sandbox.__args = args; return ctx.run(`${name}(...__args)`); };
  const list = (kind, key, partition = 'converted') => call('propLinkageListContent', { kind, key, partition, range: RANGE });
  return { ctx, listeners, call, list };
}
const rowButtons = html => html.match(/<button\b[^>]*class="propLinkageAccount"[\s\S]*?<\/button>/g) || [];

test('funnel account rows reuse the existing local logo and letter fallback, not the generic account icon', () => {
  const { list } = setup();
  const rows = rowButtons(list('stage', 'bought').body);
  assert.equal(rows.length, 5);
  const row = id => rows.find(s => s.includes(`data-id="${id}"`));
  assert.match(row('demo-logo'), /class="propHistoryLogo"/);
  assert.match(row('demo-logo'), /<img src="img\/prop\/topstep.webp" alt="" width="38" height="38">/);
  assert.match(row('demo-logo'), /<span hidden>D<\/span>/);
  for (const [id, initial] of [['demo-letters', 'A'], ['demo-unsafe', 'U'], ['demo-missing-id', 'D']]) {
    assert.match(row(id), new RegExp(`<span class="propHistoryLogo"><span>${initial}</span></span>`));
    assert.doesNotMatch(row(id), /<img\b/);
  }
  assert.match(row('demo-escaped'), /<span>&lt;<\/span>/);
  assert.doesNotMatch(list('stage', 'bought').body, /<script>|https:\/\/example\.invalid|class="propOverviewIcon"/);
});

test('all stage and converted/unconverted lists preserve the report rows, counts and detail actions', () => {
  const { ctx, call, list } = setup();
  ctx.sandbox.__range = RANGE;
  const report = ctx.run('propLinkageReport(propAccounts, propEntries, __range, todayStr())');
  const cases = Object.keys(report.stages).map(key => ['stage', key, 'converted', report.stages[key]]);
  report.edges.forEach((edge, index) => ['converted', 'unconverted'].forEach(partition => cases.push(['edge', index, partition, edge[partition]])));
  for (const [kind, key, partition, expected] of cases) {
    const result = list(kind, key, partition), rows = rowButtons(result.body);
    assert.equal(result.count, expected.length);
    assert.deepEqual(rows.map(row => /data-id="([^"]+)"/.exec(row)[1]), Array.from(expected, row => row.id));
    for (const row of rows) {
      assert.match(row, /type="button" class="propLinkageAccount" data-action="prop-linkage-detail"/);
      assert.match(row, /class="propHistoryLogo"/);
      assert.match(row, /class="propLinkageAccountText"/);
      assert.match(row, /2026-10-/);
      assert.match(row, /<svg\b/); // Existing trailing navigation arrow stays.
    }
  }
  assert.match(call('renderPropProgress', report), /class="propProgressCaption"><svg/); // Main funnel symbols stay.
});

test('list logo rendering is read-only and does not change the company summary or placeholders', () => {
  const { ctx, list } = setup();
  ctx.sandbox.__range = RANGE;
  const data = () => ctx.run('JSON.stringify([propAccounts, propEntries, propFirms])');
  const table = () => ctx.run('renderPropByFirm(propAccounts, propEntries, __range, propEntries)');
  const before = data(), beforeTable = table();
  for (const lang of ['zh', 'en']) {
    ctx.set('lang', lang);
    const priorTable = table();
    for (const stage of ['bought', 'passed', 'funded', 'paid']) list('stage', stage);
    for (let edge = 0; edge < 3; edge++) for (const partition of ['converted', 'unconverted']) list('edge', edge, partition);
    assert.equal(table(), priorTable);
    assert.equal(data(), before);
  }
  ctx.set('lang', 'zh');
  assert.equal(table(), beforeTable);
  assert.match(beforeTable, /class="propCompanyInitials">AF<\/span>/);
});

test('the reused capture error handler restores the letter when a funnel logo image fails', () => {
  const { listeners, list } = setup();
  assert.match(list('stage', 'paid').body, /class="propHistoryLogo"/);
  const initial = { hidden: true };
  const wrapper = { querySelector: selector => selector === 'span' ? initial : null };
  const image = { tagName: 'IMG', hidden: false, parentElement: wrapper, closest: selector => selector === '.propHistoryLogo' ? wrapper : null };
  const handlers = listeners.filter(l => l.type === 'error');
  assert.ok(handlers.some(l => l.capture === true));
  for (const l of handlers) l.handler({ target: image });
  assert.equal(image.hidden, true);
  assert.equal(initial.hidden, false);
  const unrelated = { tagName: 'IMG', hidden: false, closest: () => null };
  for (const l of handlers) l.handler({ target: unrelated });
  assert.equal(unrelated.hidden, false);
});

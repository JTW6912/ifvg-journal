const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { makeContext, ENGINE_FILES } = require('./load');

const TODAY = '2026-10-26';
const entry = (kind, amount, day, pending = false) => ({ account_id: 'a', kind, amount, day, pending });
function setup() {
  const ctx = makeContext(ENGINE_FILES);
  ctx.set('lang', 'zh');
  const call = (name, ...args) => {
    ctx.sandbox.__args = JSON.parse(JSON.stringify(args));
    return JSON.parse(JSON.stringify(ctx.run(`${name}(...__args)`)));
  };
  return { ctx, call };
}
const range = (from, to) => ({ preset: 'custom', from, to });

test('overview dates validate calendar days without local-time rollover', () => {
  const { call } = setup();
  assert.equal(call('propOverviewDay', '2024-02-29'), Date.parse('2024-02-29T00:00:00Z'));
  for (const bad of ['2026-02-29', '2026-04-31', '2026-1-01', '2026-10-01T12:00:00Z', '0000-01-01', '<img>', null]) {
    assert.equal(call('propOverviewDay', bad), null);
  }
  assert.equal(call('propOverviewShiftDay', '2026-03-08', 1), '2026-03-09');
  assert.equal(call('propOverviewShiftMonth', '2024-01-31', 1), '2024-02-29');
  assert.equal(call('propOverviewShiftMonth', '2026-01-31', 1), '2026-02-28');
  assert.equal(call('propOverviewShiftMonth', '0001-01-01', -1), null);
});

test('overview presets include today and use full prior calendar month', () => {
  const { call } = setup();
  assert.deepEqual(call('propOverviewResolveRange', { preset: 'last7' }, '2026-03-03'), { preset: 'last7', from: '2026-02-25', to: '2026-03-03' });
  assert.deepEqual(call('propOverviewResolveRange', { preset: 'last30' }, '2026-03-03'), { preset: 'last30', from: '2026-02-02', to: '2026-03-03' });
  assert.deepEqual(call('propOverviewResolveRange', { preset: 'lastMonth' }, '2024-03-20'), { preset: 'lastMonth', from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(call('propOverviewResolveRange', { preset: 'thisMonth' }, TODAY), { preset: 'thisMonth', from: '2026-10-01', to: TODAY });
  assert.deepEqual(call('propOverviewResolveRange', range(TODAY, '2026-10-01'), TODAY), range('2026-10-01', TODAY));
  assert.equal(call('propOverviewResolveRange', { preset: 'unknown' }, TODAY), null);
  assert.equal(call('propOverviewResolveRange', range('bad', TODAY), TODAY), null);
});

test('overview uses inclusive dates, refunds and only received payouts', () => {
  const { call } = setup();
  const list = [entry('purchase', 999, '2026-09-30'), entry('purchase', 100, '2026-10-01'), entry('refund', 20, TODAY), entry('payout', 300, TODAY), entry('payout', 80, TODAY, true), entry('other', 400, '2026-10-27')];
  const result = call('propOverviewSnapshot', list, range('2026-10-01', TODAY), TODAY);
  assert.equal(result.available, true);
  assert.deepEqual(result.sum, { spent: 80, received: 300, pending: 80, refund: 20, net: 220, roi: 275 });
  assert.equal(result.points[0].net, 0);
  assert.equal(result.points.at(-1).net, 220);
  assert.equal(result.from, '2026-10-01');
  assert.equal(result.to, TODAY);
});

test('overview daily steps are sorted, merged and exact to a cent', () => {
  const { call } = setup();
  const list = [entry('payout', 0.3, '2026-10-04'), entry('purchase', 0.1, '2026-10-02'), entry('purchase', 0.2, '2026-10-02'), entry('refund', 0.01, '2026-10-03')];
  const before = JSON.stringify(list);
  const result = call('propOverviewSnapshot', list, range('2026-10-01', '2026-10-05'), TODAY);
  assert.deepEqual(result.points.map(p => p.net), [0, -0.3, -0.29, 0.01, 0.01]);
  assert.equal(result.sum.net, 0.01);
  assert.ok(result.points.every((p, i, ps) => !i || p.at > ps[i - 1].at));
  assert.equal(JSON.stringify(list), before);
});

test('overview does not mutate the actual VM input objects', () => {
  const { ctx } = setup();
  ctx.set('__entries', [entry('purchase', 2, TODAY), entry('payout', 4, '2026-10-20')]);
  assert.equal(ctx.run(`(()=>{const before=JSON.stringify(__entries);__entries.forEach(Object.freeze);Object.freeze(__entries);propOverviewSnapshot(__entries,{preset:'all'},'${TODAY}');return JSON.stringify(__entries)===before})()`), true);
});

test('overview refunds can make investment negative, never fake ROI or clamp totals', () => {
  const { call } = setup();
  const result = call('propOverviewSnapshot', [entry('refund', 100, TODAY), entry('payout', 50, TODAY)], range(TODAY, TODAY), TODAY);
  assert.equal(result.sum.spent, -100);
  assert.equal(result.sum.net, 150);
  assert.equal(result.sum.roi, null);
  assert.equal(result.points.at(-1).net, 150);
  const bars = call('propOverviewBarModel', result.sum);
  assert.equal(bars.refundMode, true);
  assert.equal(bars.spent, 100);
  assert.equal(bars.covered, 0);
  assert.equal(bars.income, 50);
});

test('overview empty and pending-only ranges have no fabricated trend', () => {
  const { call } = setup();
  for (const list of [[], [entry('payout', 400, TODAY, true)], [entry('unexpected', 100, TODAY)]]) {
    const result = call('propOverviewSnapshot', list, { preset: 'all' }, TODAY);
    assert.equal(result.available, true);
    assert.equal(result.sum.net, 0);
    assert.equal(result.sum.roi, null);
    assert.deepEqual(result.points, []);
  }
});

test('overview invalid financial dates cannot silently become a zero range', () => {
  const { call } = setup();
  const entries = [entry('purchase', 100, 'invalid'), entry('payout', 150, TODAY)];
  const all = call('propOverviewSnapshot', entries, { preset: 'all' }, TODAY);
  assert.equal(all.sum.net, 50);
  assert.equal(all.trendUnavailable, true);
  assert.deepEqual(all.points, []);
  const bounded = call('propOverviewSnapshot', entries, range(TODAY, TODAY), TODAY);
  assert.equal(bounded.available, false);
  assert.equal(bounded.sum, null);
});

test('overview all-time includes full loaded history and sparse long intervals', () => {
  const { call } = setup();
  const list = [entry('purchase', 100, '2001-01-01'), entry('payout', 300, '2027-01-01')];
  const all = call('propOverviewSnapshot', list, { preset: 'all' }, TODAY);
  assert.equal(all.sum.net, 200);
  assert.equal(all.from, '2001-01-01');
  assert.equal(all.to, '2027-01-01');
  const long = call('propOverviewSnapshot', list, range('0001-01-01', '9999-12-31'), TODAY);
  assert.ok(long.points.length <= list.length + 2);
  assert.equal(long.points.at(-1).net, 200);
});

test('overview malformed amounts never turn into a zero balance', () => {
  const { call } = setup();
  for (const amount of ['NaN', '', -10, null, {}, true]) {
    const result = call('propOverviewSnapshot', [entry('purchase', amount, TODAY)], { preset: 'all' }, TODAY);
    assert.equal(result.available, false);
    assert.equal(result.sum, null);
  }
});

test('overview unsafe cent totals are unavailable, not rounded into apparent accuracy', () => {
  const { call } = setup();
  const result = call('propOverviewSnapshot', [entry('payout', Number.MAX_SAFE_INTEGER, TODAY)], { preset: 'all' }, TODAY);
  assert.equal(result.available, false);
  assert.equal(result.sum, null);
});

function setRenderFixture(ctx) {
  ctx.set('propAccounts', [{ id: 'a', firm_name: 'Demo A', group_name: '', status: 'eval', events: [] }, { id: 'b', firm_name: 'Demo B', group_name: '', status: 'funded', events: [] }]);
  ctx.set('propEntries', [
    { account_id: 'a', kind: 'purchase', amount: 100, day: '2026-10-02' },
    { account_id: 'b', kind: 'purchase', amount: 40, day: '2026-10-03' },
    { account_id: 'a', kind: 'refund', amount: 20, day: '2026-10-04' },
    { account_id: 'b', kind: 'payout', amount: 400, day: '2026-10-20' },
    { account_id: 'b', kind: 'payout', amount: 50, day: '2026-10-21', pending: true },
  ]);
  ctx.run('propYear=2026;propMonth=10;propYearTouched=true;');
}

test('classic metric strip remains byte-for-byte identical in both languages', () => {
  const { ctx } = setup();
  setRenderFixture(ctx);
  // Captured from the pre-implementation renderer at 6342a80 using exactly this synthetic fixture.
  const expected = { zh: 'da6a550f9598ac980cd18f539c022471607e6b35fbe3573cbb1eecba5126d724', en: '3ab0f6e6f5938abde4165fe313a1298ce43e950638bd329f67ded17aae4fa097' };
  for (const lang of ['zh', 'en']) {
    ctx.set('lang', lang);
    const html = ctx.run('renderPropOverview()').split('<div class="calendarPanel propPanel">')[0];
    assert.equal(createHash('sha256').update(html).digest('hex'), expected[lang]);
  }
});

test('overview lifecycle resets identity/page/layout range and removes portals without touching forms', () => {
  const { ctx } = setup();
  ctx.sandbox.document.documentElement.dataset.layout = 'modern';
  ctx.run(`session={user:{id:'owner-a'}};authLoading=false;tab='prop';propView='overview';
    propOverviewBeforeRender();propOverviewRange={preset:'last7'};
    propOverviewBeforeRender();`);
  assert.equal(ctx.run('propOverviewRange.preset'), 'last7');
  ctx.run(`propModal={type:'entry',draft:{amount:'123'}};
    propOverviewPicker={start:'2026-10-01'};
    propOverviewUI.panel={remove(){globalThis.__removed=true}};
    propOverviewBeforeRender();`);
  assert.equal(ctx.run('__removed'), true);
  assert.equal(ctx.run('propOverviewPicker'), null);
  assert.equal(ctx.run('propModal.draft.amount'), '123');
  assert.equal(ctx.run('propOverviewRange.preset'), 'last7');
  ctx.run(`propModal=null;session={user:{id:'owner-b'}};propOverviewBeforeRender()`);
  assert.equal(ctx.run('propOverviewRange.preset'), 'all');
  ctx.run(`propOverviewRange={preset:'last30'};tab='grid';propOverviewBeforeRender()`);
  assert.equal(ctx.run('propOverviewRange.preset'), 'all');
  ctx.run(`tab='prop';propOverviewRange={preset:'thisMonth'}`);
  delete ctx.sandbox.document.documentElement.dataset.layout;
  ctx.run('propOverviewBeforeRender()');
  assert.equal(ctx.run('propOverviewRange.preset'), 'all');
  ctx.run(`propOverviewRange={preset:'last7'};session=null;propOverviewBeforeRender()`);
  assert.equal(ctx.run('propOverviewOwner'), null);
  assert.equal(ctx.run('propOverviewRange.preset'), 'all');
});

test('overview keyboard only consumes active overlays and preserves applied range on Escape', () => {
  const { ctx } = setup();
  ctx.run(`globalThis.__key={key:'Escape',target:{closest(){return null}},preventDefault(){this.prevented=true}}`);
  assert.equal(ctx.run('propOverviewKeydown(__key)'), false);
  ctx.run(`propOverviewRange={preset:'last7'};propOverviewPicker={start:'2026-10-01'};`);
  assert.equal(ctx.run('propOverviewKeydown(__key)'), true);
  assert.equal(ctx.run('propOverviewRange.preset'), 'last7');
  assert.equal(ctx.run('propOverviewPicker'), null);
  ctx.run(`__key.key='j';propOverviewPicker={start:'2026-10-01'}`);
  assert.equal(ctx.run('propOverviewKeydown(__key)'), false);
  ctx.run(`__key.key='Escape';propModal={type:'entry',draft:{}}`);
  assert.equal(ctx.run('propOverviewKeydown(__key)'), false);
  assert.equal(ctx.run('propModal.type'), 'entry');
  assert.equal(ctx.run('propOverviewPicker'), null);
});

test('restored help focus suppresses reopening once, not the next hover', () => {
  const { ctx } = setup();
  ctx.sandbox.document.documentElement.dataset.layout = 'modern';
  ctx.run(`session={user:{id:'owner'}};authLoading=false;tab='prop';propView='overview';
    globalThis.__button={focus(){globalThis.__suppressed=propOverviewUI.dismissed===this}};
    document.querySelector=()=>__button;propOverviewUI.restore='net';propOverviewAfterRender();`);
  assert.equal(ctx.run('__suppressed'), true);
  assert.equal(ctx.run('propOverviewUI.dismissed'), null);
});

test('modern renders a unified summary and six field-local explanations', () => {
  const { ctx } = setup();
  setRenderFixture(ctx);
  ctx.sandbox.document.documentElement.dataset.layout = 'modern';
  const html = ctx.run('renderPropOverview()');
  assert.match(html, /class="propOverview/);
  assert.equal((html.match(/data-prop-overview-tip=/g) || []).length, 6);
  assert.doesNotMatch(html, /class="statRow propStats"/);
  assert.match(html, /data-action="prop-overview-range"/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { makeContext, ENGINE_FILES } = require('./load');
const TODAY = '2026-10-31';
const RANGE = { preset: 'custom', from: '2026-10-01', to: TODAY };
const account = (id, bought_on = '2026-10-01', events = [], status = 'eval') => ({ id, bought_on, events, status, firm_name: 'Demo', group_name: 'A' });
const event = (to, day) => ({ to, day });
const entry = (account_id, kind, amount, day, pending = false) => ({ account_id, kind, amount, day, pending });
function setup() {
  const ctx = makeContext(ENGINE_FILES); ctx.set('lang', 'zh');
  const call = (name, ...args) => { ctx.sandbox.__args = JSON.parse(JSON.stringify(args)); return JSON.parse(JSON.stringify(ctx.run(`${name}(...__args)`))); };
  return { ctx, call };
}
function fixture() {
  const accounts = Array.from({ length: 18 }, (_, i) => account('a' + (i + 1), i < 10 ? '2026-10-01' : '2026-09-01'));
  [1, 2, 3, 11, 12, 13, 14, 15].forEach(n => accounts[n - 1].events.push(event('passed', '2026-10-12')));
  [16, 17, 18].forEach(n => accounts[n - 1].events.push(event('passed', '2026-09-20')));
  [1, 2, 11, 12, 16, 17].forEach(n => accounts[n - 1].events.push(event('funded', '2026-10-20')));
  accounts[17].events.push(event('funded', '2026-09-22'));
  accounts[3].events.push(event('failed', '2026-10-11'));
  accounts[4].events.push(event('failed', '2026-10-15'), event('eval', '2026-10-16'), event('failed', '2026-10-18'));
  accounts.forEach(a => { a.status = a.events.at(-1)?.to || 'eval'; });
  const entries = [1, 11, 16, 18].map(n => entry('a' + n, 'payout', 500, '2026-10-26'));
  accounts.forEach(a => entries.push(entry(a.id, 'purchase', 100, a.bought_on)));
  return { accounts, entries };
}
const ids = rows => rows.map(r => r.id).sort();

test('linkage stages and conversion lists track different cohorts correctly', () => {
  const { call } = setup(), f = fixture();
  const r = call('propLinkageReport', f.accounts, f.entries, RANGE, TODAY);
  assert.deepEqual(Object.values(r.stages).map(rows => rows.length), [10, 8, 6, 4]);
  assert.deepEqual(r.edges.map(e => [e.converted.length, e.rows.length, e.rate]), [[3, 10, 30], [4, 8, 50], [3, 6, 50]]);
  assert.deepEqual(ids(r.edges[0].converted), ['a1', 'a2', 'a3']);
  for (const e of r.edges) {
    assert.deepEqual([...ids(e.converted), ...ids(e.unconverted)].sort(), ids(e.rows));
    assert.equal(new Set([...ids(e.converted), ...ids(e.unconverted)]).size, e.rows.length);
  }
  assert.equal(r.summary.decided, 11);
  assert.equal(r.summary.passRate, 8 / 11 * 100);
  assert.equal(r.summary.costPerFunded, 166.67);
});

test('linkage uses inclusive actual dates, unique stages and chronological cutoff', () => {
  const { call } = setup();
  const a = account('a', RANGE.from, [event('passed', '2026-09-30'), event('passed', '2026-10-01'), event('passed', '2026-10-02'), event('funded', '2026-11-01')]);
  const b = account('b', TODAY, [event('passed', '2026-10-30')]);
  const entries = [entry('a', 'payout', 100, TODAY), entry('a', 'payout', 200, TODAY), entry('b', 'payout', 200, '2026-11-01')];
  const r = call('propLinkageReport', [a, b], entries, RANGE, TODAY);
  assert.equal(r.stages.passed.length, 2); assert.equal(r.stages.paid.length, 1);
  assert.deepEqual(r.edges[0].converted, [{ id: 'a', day: RANGE.from, next: RANGE.from }]);
  assert.deepEqual(ids(r.edges[0].unconverted), ['b']);
  assert.equal(r.edges[1].converted.length, 0);
});

test('linkage ignores pending/zero/negative payouts and foreign-account entries', () => {
  const { call } = setup();
  const r = call('propLinkageReport', [account('a')], [entry('a', 'payout', 100, TODAY, true), entry('a', 'payout', 0, TODAY), entry('foreign', 'payout', 999, TODAY)], RANGE, TODAY);
  assert.equal(r.stages.paid.length, 0); assert.equal(r.finance.sum.received, 0); assert.equal(r.finance.sum.pending, 100);
  const invalid = call('propLinkageReport', [account('a')], [entry('a', 'payout', -100, TODAY)], RANGE, TODAY);
  assert.equal(invalid.stages.paid.length, 0); assert.equal(invalid.finance.available, false);
});

test('linkage retains all-time actual records without faking skipped passes', () => {
  const { call } = setup();
  const a = { ...account('instant', '2026-09-01', [event('funded', '2026-09-01')], 'funded'), plan_snapshot: { type: 'instant' } };
  const b = account('direct', '2026-09-02', [event('funded', '2026-10-01')], 'funded');
  const r = call('propLinkageReport', [a, b], [], { preset: 'all' }, TODAY);
  assert.equal(r.stages.bought.length, 2); assert.equal(r.stages.passed.length, 0); assert.equal(r.stages.funded.length, 2);
  assert.equal(r.summary.passRate, null); assert.equal(r.edges[1].rate, null);
  assert.ok(r.incompleteIds.includes('direct')); assert.ok(!r.incompleteIds.includes('instant'));
});

test('linkage discloses invalid and missing history and never uses current status as a dated event', () => {
  const { call } = setup();
  const a = account('a', 'invalid', [event('passed', '2026-02-30'), event('funded', TODAY)], 'funded');
  const b = account('b', RANGE.from, [], 'passed');
  const r = call('propLinkageReport', [a, b], [], RANGE, TODAY);
  assert.equal(r.stages.bought.length, 1); assert.equal(r.stages.passed.length, 0); assert.equal(r.stages.funded.length, 1);
  assert.deepEqual(r.incompleteIds.sort(), ['a', 'b']);
});

test('linkage auxiliary metrics count interval failed attempts and signed investment', () => {
  const { call } = setup();
  const a = account('a', RANGE.from, [event('failed', '2026-09-30'), event('failed', '2026-10-02'), event('failed', '2026-10-03'), event('passed', '2026-10-04'), event('funded', '2026-10-05')], 'funded');
  const r = call('propLinkageReport', [a], [entry('a', 'purchase', 50, RANGE.from), entry('a', 'refund', 70, TODAY)], RANGE, TODAY);
  assert.equal(r.summary.fails, 2); assert.equal(r.summary.decided, 3); assert.equal(r.summary.costPerFunded, -20);
  assert.equal(r.finance.sum.roi, null);
  const empty = call('propLinkageReport', [a], [], { preset: 'custom', from: '2027-01-01', to: '2027-01-31' }, TODAY);
  assert.equal(empty.summary.passRate, null); assert.equal(empty.summary.costPerFunded, null);
  assert.ok(empty.edges.every(e => e.rate === null));
});

test('linkage model does not mutate frozen inputs', () => {
  const { ctx } = setup(), f = fixture(); ctx.set('__accounts', f.accounts); ctx.set('__entries', f.entries);
  assert.equal(ctx.run(`(()=>{const freeze=x=>{Object.values(x).forEach(v=>{if(v&&typeof v==='object')freeze(v)});Object.freeze(x)};freeze(__accounts);freeze(__entries);const before=JSON.stringify([__accounts,__entries]);propLinkageReport(__accounts,__entries,${JSON.stringify(RANGE)},'${TODAY}');return before===JSON.stringify([__accounts,__entries])})()`), true);
});

test('linkage month bounds clamp old selection into partial cross-year range', () => {
  const { call } = setup(), r = { preset: 'custom', from: '2025-12-20', to: '2026-01-10' };
  assert.deepEqual(call('propLinkageMonth', r, 2026, 10), { year: 2026, month: 1 });
  assert.deepEqual(call('propLinkageMonth', r, 2025, 1), { year: 2025, month: 12 });
  assert.equal(call('propLinkageMonthAllowed', r, 2025, 11), false);
  assert.equal(call('propLinkageMonthAllowed', r, 2025, 12), true);
  assert.equal(call('propLinkageMonthAllowed', r, 2026, 2), false);
  assert.deepEqual(call('propLinkageMonth', { preset: 'all', from: null, to: null }, 2024, 4), { year: 2024, month: 4 });
});

test('exact current-status predicate does not confuse active and historical cohorts', () => {
  const { call } = setup();
  for (const s of ['eval', 'passed', 'funded', 'failed', 'blown', 'closed']) {
    const a = account('a', '2020-01-01', [event('funded', '2020-02-01')], s);
    assert.equal(call('propAccountMatchesStatus', a, 'funded'), s === 'funded');
    assert.equal(call('propAccountMatchesStatus', a, 'active'), ['eval', 'passed', 'funded'].includes(s));
    assert.equal(call('propAccountMatchesStatus', a, 'ended'), !['eval', 'passed', 'funded'].includes(s));
    assert.equal(call('propAccountMatchesStatus', a, 'all'), true);
    assert.equal(call('propAccountMatchesStatus', a, 'invalid'), false);
  }
});

test('modern overview links lower cash flows and dates while classic retains its old funnel', () => {
  const { ctx } = setup(); const a = account('a', '2025-12-01', [event('passed', '2025-12-22'), event('funded', '2026-01-05')], 'funded');
  ctx.set('propAccounts', [a]); ctx.set('propEntries', [entry('a', 'purchase', 999, '2025-12-01'), entry('a', 'monthly', 20, '2025-12-21'), entry('a', 'payout', 100, '2026-01-09')]);
  ctx.sandbox.document.documentElement.dataset.layout = 'modern';
  ctx.run(`propFirmFilter='Demo';propYear=2026;propMonth=10;propYearTouched=true;propOverviewRange={preset:'custom',from:'2025-12-20',to:'2026-01-10'};`);
  const html = ctx.run('renderPropOverview()');
  assert.match(html, /propProgress/); assert.doesNotMatch(html, /\$999/); assert.match(html, /2025-12-20/);
  assert.equal(ctx.run('propMonth'), 1);
  delete ctx.sandbox.document.documentElement.dataset.layout;
  const classic = ctx.run('renderPropOverview()'); assert.match(classic, /class="propFunnel"/); assert.doesNotMatch(classic, /propProgress/);
});

test('linkage list rendering escapes names and partitions the same model rows', () => {
  const { ctx } = setup(), f = fixture(); f.accounts[0].nickname = '<img src=x onerror=bad()>';
  ctx.set('propAccounts', f.accounts); ctx.set('propEntries', f.entries);
  const result = ctx.run(`propLinkageListContent({type:'overview-list',kind:'edge',key:0,partition:'converted',range:${JSON.stringify(RANGE)}})`);
  assert.equal((result.body.match(/data-action="prop-linkage-detail"/g) || []).length, 3);
  assert.match(result.body, /&lt;img/); assert.doesNotMatch(result.body, /<img src=x/);
  assert.match(result.body, /2026-10-12/);
});

test('invalid ranges and dates stay explicit and do not fabricate financial totals', () => {
  const { call } = setup(), f = fixture();
  const invalid = call('propLinkageReport', f.accounts, f.entries, { preset: 'custom', from: 'bad', to: TODAY }, TODAY);
  assert.equal(invalid.finance.available, false); assert.equal(invalid.finance.reason, 'invalidRange');
  assert.ok(Object.values(invalid.stages).every(rows => rows.length === 0));
  assert.ok(invalid.edges.every(e => e.rate === null));
  f.entries[0].day = 'bad';
  const r = call('propLinkageReport', f.accounts, f.entries, RANGE, TODAY);
  assert.equal(r.finance.available, false); assert.ok(r.incompleteIds.includes('a1'));
  assert.equal(r.stages.paid.length, 3);
});

test('firm summaries reconcile interval cash flow with the same period pass-rate', () => {
  const { ctx, call } = setup(), f = fixture();
  f.accounts.forEach((a,i) => a.firm_name = i < 10 ? 'A' : 'B');
  const a = call('propLinkageReport', f.accounts.slice(0,10), f.entries, RANGE, TODAY);
  const b = call('propLinkageReport', f.accounts.slice(10), f.entries, RANGE, TODAY);
  const all = call('propLinkageReport', f.accounts, f.entries, RANGE, TODAY);
  for (const key of ['spent','received','net']) assert.equal(a.finance.sum[key] + b.finance.sum[key], all.finance.sum[key]);
  assert.equal(a.summary.passRate, 50); assert.equal(b.summary.passRate, 100); assert.equal(b.finance.sum.roi, null);
  ctx.set('__f', f); ctx.set('__r', RANGE);
  const html = ctx.run('renderPropByFirm(__f.accounts,propLinkageReport(__f.accounts,__f.entries,__r,"2026-10-31").entries,__r,__f.entries)');
  assert.match(html, /当前账号数/); assert.match(html, /50%/); assert.doesNotMatch(html, /进行中/);
});

function interactive(ctx) {
  ctx.sandbox.document.documentElement.dataset.layout = 'modern';
  ctx.run(`session={user:{id:'test-owner'}};authLoading=false;currentProfile={active:true};tab='prop';propView='overview';propModal=null;render=()=>{};propRenderModal=()=>{};`);
}
test('current-state navigation retains company/group, clears batch selection and protects other forms', () => {
  const { ctx } = setup(); interactive(ctx);
  ctx.run(`propFirmFilter='A';propGroupFilter='B';propBatch=true;propSelected=['old'];propCardMenu='old';propOverviewRange={preset:'custom',from:'2020-01-01',to:'2020-01-02'};propLinkageCurrent('funded')`);
  assert.equal(ctx.run('propView'), 'accounts'); assert.equal(ctx.run('propStatusFilter'), 'funded');
  assert.equal(ctx.run('propFirmFilter'), 'A'); assert.equal(ctx.run('propGroupFilter'), 'B');
  assert.equal(ctx.run('propBatch'), false); assert.equal(ctx.run('propSelected.length'), 0); assert.equal(ctx.run('propCardMenu'), null);
  ctx.run(`propView='overview';propModal={type:'account',draft:{nickname:'unsaved'}};propLinkageCurrent('eval');propLinkageOpen('stage','passed','trigger')`);
  assert.equal(ctx.run('propStatusFilter'), 'funded'); assert.equal(ctx.run('propModal.draft.nickname'), 'unsaved');
});

test('stale scope/date/identity/layout/page clears only linkage-owned modal state', () => {
  const { ctx } = setup(); interactive(ctx);
  for (const mutation of ["propFirmFilter='changed'", "propGroupFilter='changed'", "propOverviewRange={preset:'custom',from:'2020-01-01',to:'2020-01-02'}", "session={user:{id:'other'}}", "propView='accounts'", "tab='analysis'", "document.documentElement.dataset.layout='classic'", "authLoading=true"]) {
    interactive(ctx);
    ctx.run(`propFirmFilter='';propGroupFilter='';propOverviewRange={preset:'all'};propModal={type:'overview-list',context:propLinkageContext()};${mutation};propLinkageBeforeRender()`);
    assert.equal(ctx.run('propModal'), null, mutation);
  }
  ctx.run(`propModal={type:'entry',draft:{note:'unchanged'}};propLinkageBeforeRender()`);
  assert.equal(ctx.run('propModal.draft.note'), 'unchanged');
});

test('linked detail remains a labelled dialog and back protects an unsaved detail draft', () => {
  const { ctx } = setup(); interactive(ctx); const f = fixture(); ctx.set('propAccounts', f.accounts); ctx.set('propEntries', f.entries);
  ctx.run(`propModal={type:'detail',id:'a1',linkageBack:{type:'overview-list',context:propLinkageContext(),kind:'stage',key:'passed',range:${JSON.stringify(RANGE)}}}`);
  const html = ctx.run('propModalHtml()');
  assert.match(html, /role="dialog"/); assert.match(html, /aria-modal="true"/); assert.match(html, /aria-label="账号详情"/);
  ctx.run(`propModal.draft.nickname='Unsaved';propLinkageBack()`);
  assert.equal(ctx.run('propModal.type'), 'detail'); assert.equal(ctx.run('propModal.draft.nickname'), 'Unsaved');
  assert.match(ctx.run('propModal.error'), /保存或撤销/);
});

test('stale linkage sheets clear their rendered DOM before authentication early returns', () => {
  const { ctx } = setup(); interactive(ctx);
  assert.equal(ctx.run(`(()=>{let clears=0;renderSecondaryModals=(force)=>{if(force)throw Error('must preserve other forms');clears++};propModal={type:'overview-list',context:propLinkageContext()};authLoading=true;propLinkageBeforeRender();if(propModal!==null)throw Error('stale state');propModal={type:'entry',draft:{note:'keep'}};propLinkageBeforeRender();if(propModal.draft.note!=='keep')throw Error('unrelated draft');return clears})()`), 1);
});

test('blown status or history discloses missing funding dates without inventing stage events', () => {
  const { call } = setup();
  const list = [account('blown', RANGE.from, [], 'blown'), account('ended', RANGE.from, [event('blown', TODAY)], 'closed'), {...account('instant', RANGE.from, [event('funded', RANGE.from)], 'blown'), plan_snapshot:{type:'instant'}}];
  const r = call('propLinkageReport', list, [], RANGE, TODAY);
  assert.deepEqual(r.incompleteIds.sort(), ['blown','ended']);
  assert.deepEqual(ids(r.stages.funded), ['instant']); assert.equal(r.stages.passed.length, 0);
});

test('nested entry, status and balance saves retain list origin without changing persistence', async () => {
  const { ctx } = setup(); interactive(ctx); ctx.set('propAccounts', [account('a')]);
  const result = await ctx.run(`(async()=>{let writes=0;propSaveEntries=async()=>{writes++;return true};propChangeStatus=async()=>{writes++;return true};propSaveAccount=async()=>{writes++;return true};const origin={type:'overview-list',context:propLinkageContext(),triggerId:'source'};for(const [type,save,draft] of [['entry',propSaveEntry,{amount:10,day:'${TODAY}',kind:'other'}],['status',propSaveStatus,{day:'${TODAY}',fee:0}],['balance',propSaveBalance,{balance:50000,day:'${TODAY}'}]]){const detail={type:'detail',id:'a',linkageBack:origin};propModal={type,accountId:'a',to:'passed',draft,back:propLinkageDetailBack(detail,'a')};if(propLinkageOrigin(propModal)!==origin)throw Error('nested origin');await save();if(propModal.type!=='detail'||propModal.linkageBack!==origin)throw Error('lost origin after '+type);const saved=propModal;propLinkageFocusList=()=>{};propLinkageBack();if(propModal!==origin)throw Error('lost list after save '+type);propModal=saved}return writes})()`);
  assert.equal(result, 3);
  assert.deepEqual(JSON.parse(ctx.run(`JSON.stringify(propLinkageDetailBack({type:'detail',id:'a'},'a'))`)), {type:'detail',id:'a'});
  ctx.run(`propModal={type:'entry',draft:{note:'synthetic'},back:propLinkageDetailBack(propModal,'a')};authLoading=true;propLinkageBeforeRender()`);
  assert.equal(ctx.run('propModal'), null);
});

test('linked Back preserves its click through input blur without intercepting other actions', () => {
  const { ctx } = setup();
  assert.equal(ctx.run(`(()=>{let prevented=0;const e={button:0,target:{closest:()=>({})},preventDefault:()=>prevented++};propModal={type:'detail',linkageBack:{}};propLinkagePointerDown(e);e.button=2;propLinkagePointerDown(e);e.button=0;e.target.closest=()=>null;propLinkagePointerDown(e);propModal={type:'entry'};e.target.closest=()=>({});propLinkagePointerDown(e);return prevented})()`), 1);
});

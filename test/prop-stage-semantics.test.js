const test = require('node:test');
const assert = require('node:assert/strict');
const { makeContext, ENGINE_FILES } = require('./load');
const DAY = '2026-10-15', TODAY = '2026-10-31';
const event = (to, day = DAY) => ({ to, day });
const account = (id, events, type = 'evaluation') => ({ id, user_id: 'demo-owner', bought_on: DAY,
  firm_name: 'Synthetic Firm', status: events.at(-1)?.to || 'eval', plan_snapshot: { type }, events });
const range = (from = DAY, to = from) => ({ preset: 'custom', from, to });
const all = { preset: 'all' };
function setup() {
  const ctx = makeContext(ENGINE_FILES); ctx.set('lang', 'zh');
  const call = (name, ...args) => { ctx.sandbox.__args = JSON.parse(JSON.stringify(args)); return JSON.parse(JSON.stringify(ctx.run(`${name}(...__args)`))); };
  return { ctx, call };
}
const codes = issues => issues.map(i => i.code);

test('same-day purchase and failure are valid and count one failed attempt', () => {
  const { call } = setup(), a = account('failed', [event('eval'), event('failed')]);
  assert.deepEqual(call('propHistoryIssues', a), []);
  const r = call('propLinkageReport', [a], [], range(), TODAY);
  assert.equal(r.summary.fails, 1); assert.equal(r.summary.passed, 0); assert.equal(r.summary.passRate, 0);
});

test('same-day explicit pass, funding and blown retain every stage and current status', () => {
  const { call } = setup(), a = account('explicit', [event('eval'), event('passed'), event('funded'), event('blown')]);
  assert.deepEqual(call('propHistoryIssues', a), []);
  const r = call('propLinkageReport', [a], [], range(), TODAY);
  assert.deepEqual(r.stages.passed, [{ id: a.id, day: DAY }]);
  assert.deepEqual(r.edges.slice(0, 2).map(e => e.rate), [100, 100]);
  assert.equal(a.status, 'blown'); assert.equal(r.incompleteIds.length, 0);
});

test('same-day eval to funded to blown supplies a statistical pass, not a missing stage', () => {
  const { call } = setup(), a = account('implicit', [event('eval'), event('funded'), event('blown')]);
  assert.deepEqual(call('propHistoryIssues', a), []);
  assert.deepEqual(call('propPassEvidence', a), { days: [DAY], source: 'funded' });
  const r = call('propLinkageReport', [a], [], range(), TODAY);
  assert.deepEqual(r.stages.passed, [{ id: a.id, day: DAY, passSource: 'funded' }]);
  assert.equal(r.edges[0].converted[0].next, DAY); assert.equal(r.edges[0].converted[0].nextPassSource, 'funded');
  assert.equal(r.edges[1].converted[0].passSource, 'funded'); assert.equal(r.edges[1].converted[0].next, DAY);
  assert.equal(r.summary.passRate, 100); assert.deepEqual(r.incompleteIds, []);
});

test('same-day resets preserve repeated attempts without false duplicate warnings', () => {
  const { call } = setup(), a = account('retry', [event('eval'), event('failed'), event('eval'), event('failed'), event('eval'), event('funded')]);
  assert.deepEqual(call('propHistoryIssues', a), []);
  const r = call('propLinkageReport', [a], [], range(), TODAY);
  assert.equal(r.summary.fails, 2); assert.equal(r.summary.passed, 1); assert.equal(r.summary.decided, 3);
  assert.equal(r.summary.passRate, 1 / 3 * 100);
  const duplicate = account('duplicate', [event('eval'), event('failed'), event('failed')]);
  assert.equal(call('propHistoryIssues', duplicate).filter(i => i.code === 'duplicate').length, 1);
  assert.equal(call('propLinkageReport', [duplicate], [], range(), TODAY).summary.fails, 2);
});

test('instant funding alone is not a pass in dated or classic statistics', () => {
  const { call } = setup(), a = account('instant', [event('funded'), event('blown')], 'instant');
  assert.deepEqual(call('propHistoryIssues', a), []);
  assert.deepEqual(call('propPassEvidence', a), { days: [], source: null });
  assert.equal(call('propLinkageReport', [a], [], all, TODAY).stages.passed.length, 0);
  assert.equal(call('propFunnel', [a], []).passed, 0);
  assert.equal(call('propFunnel', [a], []).funded, 1);
});

test('explicit pass takes priority before filtering, not reassigned to the funded month', () => {
  const { call } = setup(), a = { ...account('explicit', [event('eval', '2026-09-01'), event('passed', '2026-09-30'), event('funded')]), bought_on: '2026-09-01' };
  assert.deepEqual(call('propPassEvidence', a), { days: ['2026-09-30'], source: 'passed' });
  const r = call('propLinkageReport', [a], [], range(), TODAY);
  assert.equal(r.stages.passed.length, 0); assert.equal(r.stages.funded.length, 1);
  assert.equal(r.summary.passRate, null); assert.deepEqual(r.incompleteIds, []);
});

test('invalid explicit pass cannot be hidden by valid funding fallback', () => {
  const { call } = setup(), a = account('invalid-pass', [event('eval'), event('passed', '2026-02-30'), event('funded')]);
  assert.deepEqual(call('propPassEvidence', a), { days: [], source: 'passed' });
  assert.ok(codes(call('propHistoryIssues', a)).includes('invalidDate'));
  assert.ok(codes(call('propHistoryIssues', a)).includes('missingPassed'));
  const r = call('propLinkageReport', [a], [], all, TODAY);
  assert.equal(r.stages.passed.length, 0); assert.ok(r.incompleteIds.includes(a.id));
});

test('no pass date from status, blown, payout, purchase or an invalid funding date', () => {
  const { call } = setup();
  for (const events of [[], [event('blown')], [event('funded', '')], [event('funded', '2026-02-30')]]) {
    const a = { ...account('missing', events), status: 'blown' };
    const entries = [{ account_id: a.id, day: DAY, kind: 'payout', amount: 10 }];
    assert.deepEqual(call('propPassEvidence', a).days, []);
    assert.equal(call('propLinkageReport', [a], entries, range(), TODAY).stages.passed.length, 0);
    assert.ok(codes(call('propHistoryIssues', a, entries)).includes('missingPassed'));
    assert.ok(codes(call('propHistoryIssues', a, entries)).includes('missingFunded'));
  }
});

test('derived pass follows inclusive funded-day boundaries and cohort cutoff', () => {
  const { call } = setup(), a = account('later', [event('eval'), event('funded', '2026-10-16')]);
  const before = call('propLinkageReport', [a], [], range(), TODAY);
  assert.equal(before.stages.passed.length, 0); assert.equal(before.edges[0].converted.length, 0);
  assert.deepEqual(before.incompleteIds, []); assert.deepEqual(call('propHistoryIssues', a), []);
  const day = call('propLinkageReport', [a], [], range('2026-10-16'), TODAY);
  assert.equal(day.stages.bought.length, 0); assert.equal(day.stages.passed.length, 1); assert.equal(day.edges[1].rate, 100);
  assert.equal(call('propLinkageReport', [a], [], range(DAY, '2026-10-16'), TODAY).edges[0].rate, 100);
  assert.equal(call('propLinkageReport', [a], [], range('2026-10-17'), TODAY).stages.passed.length, 0);
});

test('multiple recorded funding dates remain range-selectable, account counts stay unique', () => {
  const { call } = setup(), a = account('repeat', [event('eval'), event('funded'), event('funded'), event('eval', '2026-10-16'), event('funded', '2026-10-16')]);
  assert.deepEqual(call('propPassEvidence', a), { days: [DAY, '2026-10-16'], source: 'funded' });
  assert.equal(call('propLinkageReport', [a], [], all, TODAY).summary.passed, 1);
  assert.equal(call('propLinkageReport', [a], [], range('2026-10-16'), TODAY).stages.passed[0].day, '2026-10-16');
});

test('legacy default evaluation and diagnostic date bounds remain explicit', () => {
  const { ctx, call } = setup(), a = account('legacy', [event('funded')]); delete a.plan_snapshot;
  assert.equal(call('propPassEvidence', a).source, 'funded');
  assert.equal(call('propFunnel', [a], []).passed, 1);
  ctx.set('__future', account('future', [event('funded', '2100-01-01')]));
  assert.equal(ctx.run('propPassEvidence(__future, propHistoryDay).days.length'), 0);
  assert.ok(codes(call('propHistoryIssues', account('future', [event('funded', '2100-01-01')]))).includes('invalidDate'));
});

test('derived lists identify the date source in both languages without altering the saved timeline', () => {
  const { ctx } = setup(), a = account('implicit', [event('eval'), event('funded')]);
  ctx.set('propAccounts', [a]); ctx.set('propEntries', []);
  for (const language of ['zh', 'en']) {
    ctx.set('lang', language);
    for (const query of [{ kind: 'stage', key: 'passed' }, { kind: 'edge', key: 0 }, { kind: 'edge', key: 1 }]) {
      ctx.set('__list', { ...query, partition: 'converted', range: all });
      const html = ctx.run('propLinkageListContent(__list).body');
      assert.match(html, language === 'zh' ? /按资金阶段日期计为通过/ : /Pass counted on the funding date/);
      assert.ok(html.includes(DAY));
    }
    ctx.set('__list', { kind: 'stage', key: 'funded', range: all });
    assert.doesNotMatch(ctx.run('propLinkageListContent(__list).body'), /按资金阶段日期计为通过|Pass counted on the funding date/);
  }
  assert.equal(ctx.run('propAccounts[0].events.some(e=>e.to==="passed")'), false);
});

test('company statistics share derived passes while their cash values stay unchanged', () => {
  const { ctx, call } = setup(), a = account('company', [event('eval'), event('funded')]);
  const entries = [{ account_id: a.id, day: DAY, kind: 'purchase', amount: 50 }];
  ctx.run('localStorage.setItem("journal_layout","modern")'); ctx.set('propFirmFilter', a.firm_name);
  ctx.set('__accounts', [a]); ctx.set('__entries', entries);
  assert.match(ctx.run(`renderPropByFirm(__accounts,__entries,${JSON.stringify(range())},__entries)`), /100%/);
  assert.deepEqual(call('propLinkageReport', [a], entries, range(), TODAY).finance.sum, call('propSum', entries));
});

test('diagnosis, derived statistics and drafts never backfill events or invoke a writer', () => {
  const { ctx } = setup(); ctx.set('propAccounts', [account('immutable', [event('eval'), event('funded'), event('blown')])]); ctx.set('propEntries', []);
  assert.equal(ctx.run(`(()=>{const deny=()=>{throw Error('unexpected side effect')};sb={from:deny};propSaveAccount=propSaveEntries=propChangeStatus=propApplyRenewals=deny;
    const freeze=x=>{Object.values(x).forEach(v=>{if(v&&typeof v==='object')freeze(v)});Object.freeze(x)};
    freeze(propAccounts);freeze(propEntries);const before=JSON.stringify([propAccounts,propEntries]);
    const a=propAccounts[0];propHistoryIssues(a,propEntries);propLinkageReport(propAccounts,propEntries,{preset:'all'},'${TODAY}');propFunnel(propAccounts,propEntries);
    const d=propHistoryDraft(a);d.bought_on='2026-10-14';const p=propHistoryPatch(d);
    return p.ok&&!p.events.some(e=>e.to==='passed')&&before===JSON.stringify([propAccounts,propEntries]);})()`), true);
});

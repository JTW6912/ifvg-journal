const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { makeContext, ENGINE_FILES } = require('./load');

// Synthetic fixtures only; the real init and configuration are excluded by test/load.
function setup(layout = 'modern', language = 'zh') {
  const listeners = new Map(), noop = () => {};
  const doc = { documentElement: { dataset: {}, lang: '', style: { getPropertyValue: () => '' } },
    activeElement: null, body: { appendChild: noop },
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => ({ style: {}, dataset: {}, addEventListener: noop, classList: { add: noop, remove: noop } }) };
  const c = makeContext(ENGINE_FILES, { document: doc, URL });
  c.set('lang', language);
  c.run(`applyLayout('${layout}'); session={user:{id:'glass-demo-owner'}}; currentProfile={active:true,role:'admin'};
    authLoading=false; tab='prop'; propView='overview'; propYear=2026; propMonth=10; propYearTouched=true;
    todayStr=()=> '2026-10-30'; render=()=>{}; propRenderModal=()=>{}; renderSecondaryModals=()=>{};
    sb={from(){throw Error('database forbidden')},rpc(){throw Error('database forbidden')}};
    fetch=()=>{throw Error('network forbidden')}; localStorage.setItem=()=>{throw Error('storage forbidden')};`);
  const firms = Array.from({ length: 8 }, (_, i) => ({ id: `glass-firm-${i}`, name: `Demo Firm ${i}`, rank: 8-i,
    review: '**Synthetic review**', notes: 'Synthetic notes', platforms: ['Rithmic'], payoutMethods: ['Rise'],
    kycRequirements: ['Passport'], paymentMethods: ['Visa'], keySentence: { text: 'Synthetic recommendation' },
    promo: { discount: '10%', text: 'Synthetic offer' }, recentUpdates: [] }));
  firms.push({ id: 'hidden', name: 'Hidden Demo', rank: 0, hidden: true });
  c.set('propFirms', firms);
  c.set('propPlans', firms.map(f => ({ id: f.id + '-plan', firm: f.id, series: 'Demo', family: 'Demo', size: 50000,
    status: 'current', type: 'evaluation', price: { list: 100, activation: 0, billing: 'one_time' },
    eval: { target: 3000, drawdown: 2000 }, funded: {}, payout: {} })));
  c.set('propAccounts', ['funded','eval','passed','closed'].map((status,i) => ({
    id: `glass-account-${i}`, user_id: 'glass-demo-owner', firm_id: `glass-firm-${i%2}`, firm_name: `Demo Firm ${i%2}`,
    plan_name: 'Synthetic evaluation', plan_snapshot: { type: 'evaluation' }, nickname: `Demo ${i}`,
    group_name: 'Synthetic group', size: 50000, status, billing: 'one_time', renewing: false, bought_on: '2026-10-01',
    events: [{ to:'eval',day:'2026-10-01' }, ...(i === 0 ? [{to:'passed',day:'2026-10-02'},{to:'funded',day:'2026-10-03'}] : [])]
  })));
  c.set('propEntries', [
    { id:'cash-a',account_id:'glass-account-0',kind:'purchase',day:'2026-10-01',amount:100 },
    { id:'cash-b',account_id:'glass-account-1',kind:'purchase',day:'2026-10-02',amount:200 },
    { id:'cash-c',account_id:'glass-account-0',kind:'payout',day:'2026-10-05',amount:450 },
    { id:'cash-d',account_id:'glass-account-0',kind:'payout',day:'2026-10-06',amount:900,pending:true },
  ]);
  return { c, doc, listeners };
}
const hash = value => createHash('sha256').update(value).digest('hex');
function screenHashes(layout, language) {
  const {c} = setup(layout, language);
  return {
    overview: hash(c.run('renderPropOverview()')),
    catalog: hash(c.run('renderPropCatalog()')),
    firm: hash(c.run('renderPropFirm(propFirms[0],propPlans.filter(p=>p.firm===propFirms[0].id))')),
    accounts: hash(c.run('renderPropAccounts()')),
    detail: hash(c.run('JSON.stringify(propDetail({type:"detail",id:"glass-account-0"}))')),
  };
}
// Captured before structural-guard changes from 9228f59 + pending ranking-only change.
const BASELINE = {
  'modern-zh': { overview:'9108237c1dece5a628a7e13d8b2766f3e0c508da8e2fd7f022033f0518251965', catalog:'ac171e4e7a2b938490cb1f24b875e96a3bd03d2842d43ae779c71bc31daa102c', firm:'a3684673041157ebf9299edcc1c7d287e568cf965bfec09e31ed544e8a0bd78b', accounts:'823b89a4c9ff58f7c2ae2db5505314a7ca90140afed61618011bf4d4806cec3f', detail:'57baa33c0be4a03091314dbd1842c50d34bb55fea33ae3ec74b8aef33eed4542' },
  'modern-en': { overview:'49170a1ef15fdca09ab18d794d323a3548674106db186b46c0380bd235eb13de', catalog:'e899b0a169ca69a45d78780641024a3577fa4acab964b6bc0f5c717609546225', firm:'bc69577081ecbf5cf80a1c98ba74fe93e719d63d5940c1dd4f5c488d7acd89a0', accounts:'ca72639164735a7711b078492e42ccc5b73cb7f2ae8efe491c2be9398a8cc86c', detail:'a2cb654c0f5d7f9ea1f08bfe3dcfb961382f309257f72c797c46599577221903' },
  'classic-zh': { overview:'b8d6aabf86dab2153ea914b624700534278f303548b133a98801be3a449d4b5d', catalog:'6a26f1f3551eb2915fd00bb9de6c07676324c77e39751b5501b970c373399362', firm:'df1a243731a1cfeb277c4fb641ea4f35174606688ccd5286bb74603819991d88', accounts:'823b89a4c9ff58f7c2ae2db5505314a7ca90140afed61618011bf4d4806cec3f', detail:'c5e4ce0095bc45136b5a9b6a457e0767b0ce6ce75c5c61375eb1537e14ed0c15' },
  'classic-en': { overview:'9df51d333f95c7fbe1c6ac5608cac575a8b6562570f839bcb7c941684981eb43', catalog:'0afef45a7518aadf2cde4af5872e04a1c9dea2ed5a29a2ed5ff71a4c449de4e3', firm:'16a6f6df11f7665c05ef64472e10d1827d2a4a9c08c8912e3fce515d25433bec', accounts:'ca72639164735a7711b078492e42ccc5b73cb7f2ae8efe491c2be9398a8cc86c', detail:'71b2a291d75f932bbf0c64950c6f9ba4f65eb8b9fc62b12a884829728601651c' },
};

test('ordinary modern and classic keep exact pre-fix markup in both languages', () => {
  for (const layout of ['modern','classic']) for (const language of ['zh','en']) {
    assert.deepEqual(screenHashes(layout, language), BASELINE[`${layout}-${language}`]);
  }
});

test('Glass retains real layout identity while producing the same modern Prop screens', () => {
  for (const language of ['zh','en']) {
    assert.deepEqual(screenHashes('glass', language), screenHashes('modern', language));
    const {c} = setup('glass', language);
    assert.equal(c.run('currentLayout()'), 'glass');
    assert.equal(c.run('isModernLayout()'), true);
    assert.equal(c.run('currentAppearance().layout'), 'glass');
    const html = c.run('renderPropOverview()');
    for (const token of ['class="propOverview"','class="propProgress"','id="propMonthsPanel"','id="propCompanyPanel"','id="propHistoryEntry"']) assert.ok(html.includes(token), token);
  }
});

test('Glass shares complete catalog, detail actions, admin board and safe empty states', () => {
  for (const language of ['zh','en']) {
    const {c} = setup('glass', language);
    const before=c.run('JSON.stringify([propFirms,propPlans,propAccounts,propEntries])');
    for (const all of [false,true]) {
      c.set('propBoardAll', all);
      const html=c.run('renderPropCatalog()');
      assert.deepEqual([...html.matchAll(/<article class="propRecommendCard" data-prop-firm="([^"]+)"/g)].map(m=>m[1]),Array.from({length:8},(_,i)=>`glass-firm-${7-i}`));
      assert.doesNotMatch(html,/propCmpPanel|data-action="prop-board-all"/);
    }
    c.run('propEditMode=true');
    assert.match(c.run('renderPropCatalog()'),/data-action="prop-adm-firm"/);
    assert.doesNotMatch(c.run('renderPropCatalog()'),/propCmpPanel/);
    c.run('propEditMode=false;propCatalogFirm="glass-firm-7"');
    for (const action of ['prop-cat-firm','prop-buy-plan','prop-toggle-compare']) assert.ok(c.run('renderPropCatalog()').includes(`data-action="${action}"`));
    c.run('viewingUserId="synthetic-viewed"');
    assert.doesNotMatch(c.run('renderPropCatalog()'),/data-action="prop-buy-plan"|data-action="prop-adm-toggle"/);
    assert.equal(c.run('JSON.stringify([propFirms,propPlans,propAccounts,propEntries])'),before);
    c.run('propCatalogFirm="";propFirms=[];propPlans=[]');
    assert.match(c.run('renderPropCatalog()'),/propEmptyState/);
  }
});

test('Glass uses the same recommendation toolbar, copy protection and company option icons', () => {
  const outputs=[];
  for (const layout of ['modern','glass']) {
    const {c}=setup(layout);
    outputs.push(c.run(`propReviewEditorHtml('**Demo**') + propFirmInfoHtml(propFirms[0],false) + propFirmChoiceOptionsHtml('platforms',{draft:{platforms:['Rithmic']},choiceExtras:{}})`));
  }
  assert.match(outputs[0],/data-prop-copy-protected/);
  assert.equal(outputs[1],outputs[0]);
});

test('material switching preserves applied range, monthly lines and company sort; classic and owner exit reset them', () => {
  const {c}=setup(); c.run('propOverviewBeforeRender()');
  const range={preset:'custom',from:'2026-10-01',to:'2026-10-28'};
  c.set('propOverviewRange',range);c.run('propMonthLines=true;propCompanySort="roi"');
  for (const layout of ['glass','modern','glass']) {
    c.run(`applyLayout('${layout}');propOverviewBeforeRender()`);
    assert.deepEqual(JSON.parse(c.run('JSON.stringify(propOverviewRange)')),range);
    assert.equal(c.run('propMonthLines'),true);assert.equal(c.run('propCompanySort'),'roi');
    assert.equal(c.run('propOverviewCanInteract()'),true);assert.equal(c.run('propMonthsViewActive()'),true);assert.equal(c.run('propCompanyCanSort()'),true);
  }
  for (const action of ['applyLayout("classic")','session={user:{id:"other-owner"}}','propView="accounts"']) {
    c.run('applyLayout("glass");propView="overview";propOverviewBeforeRender()');
    c.set('propOverviewRange',range);c.run(`propMonthLines=true;propCompanySort='roi';${action};propOverviewBeforeRender()`);
    assert.equal(c.run('propOverviewRange.preset'),'all');assert.equal(c.run('propMonthLines'),false);assert.equal(c.run('propCompanySort'),'net');
  }
});

test('Glass applies date choices and keeps existing modal, loading and disabled-user guards', () => {
  const range={preset:'custom',from:'2026-10-01',to:'2026-10-15'};
  const {c}=setup('glass'); c.set('choice',range);c.run('propOverviewApply(choice)');
  assert.deepEqual(JSON.parse(c.run('JSON.stringify(propOverviewRange)')),range);
  for (const guard of ['propModal={busy:true,draft:{note:"keep"}}','authLoading=true','currentProfile.active=false','editingTrade={id:"draft"}']) {
    c.run('propModal=null;editingTrade=null;authLoading=false;currentProfile.active=true;propOverviewRange={preset:"all"};'+guard);
    c.run('propOverviewApply(choice)');assert.equal(c.run('propOverviewRange.preset'),'all');assert.equal(c.run('propOverviewCanInteract()'),false);
  }
});

test('Glass can open help with a description and dismiss it without business calls', () => {
  const {c,doc}=setup('glass'), attrs={};
  const button={dataset:{propOverviewTip:'net'},isConnected:true,classList:{add(){},remove(){}},setAttribute(k,v){attrs[k]=v;},removeAttribute(k){delete attrs[k]},getBoundingClientRect:()=>({left:10,right:30,top:20,bottom:40,width:20})};
  doc.createElement=()=>({style:{},setAttribute(){},remove(){},offsetWidth:200,offsetHeight:80});
  c.sandbox.window.innerWidth=1200;c.sandbox.window.innerHeight=800;c.sandbox.button=button;
  c.run('propOverviewShowHelp(button,true)');assert.equal(attrs['aria-describedby'],'propOverviewTooltip');
  assert.ok(c.run('propOverviewUI.tip.textContent.length > 0'));
  c.run('propOverviewHideHelp()');assert.equal(attrs['aria-describedby'],undefined);assert.equal(c.run('propOverviewUI.tip'),null);
});

test('Glass monthly line toggle updates controls without rebuilding the page', () => {
  const {c,doc}=setup('glass'), legend={hidden:true},label={textContent:''},attrs={};
  const panel={classList:{toggle(){}},querySelector:()=>legend};
  const button={setAttribute(k,v){attrs[k]=v;},querySelector:()=>label};
  doc.getElementById=id=>({propMonthsPanel:panel,propMonthLinesToggle:button})[id]||null;
  c.run('render=()=>{throw Error("full render forbidden")}');
  c.run('propMonthsToggle()');assert.equal(c.run('propMonthLines'),true);assert.equal(legend.hidden,false);assert.equal(attrs['aria-pressed'],'true');
  c.run('propMonthsToggle()');assert.equal(c.run('propMonthLines'),false);assert.equal(legend.hidden,true);assert.equal(attrs['aria-pressed'],'false');
});

test('Glass sorts existing company rows locally and retains scroll', () => {
  const {c,doc}=setup('glass');
  const rows=[{dataset:{companyIndex:'0',companyNet:'20',companySpent:'10',companyReceived:'30',companyRoi:'200'}},{dataset:{companyIndex:'1',companyNet:'10',companySpent:'50',companyReceived:'60',companyRoi:'20'}}];
  const body={children:rows.slice(),appendChild(node){this.children=this.children.filter(n=>n!==node);this.children.push(node);}};
  const select={disabled:false,value:'net'},wrap={scrollLeft:91},panel={querySelector:()=>body,querySelectorAll:()=>[]};
  doc.getElementById=id=>({propCompanyPanel:panel,propCompanySort:select,propCompanyScroll:wrap})[id]||null;
  c.run('render=()=>{throw Error("full render forbidden")};propCompanyChangeSort("spent")');
  assert.deepEqual(body.children,[rows[1],rows[0]]);assert.equal(wrap.scrollLeft,91);assert.equal(select.value,'spent');
});

test('Glass funnel opens list/detail/history and returns; exact current status uses the modern account filter', () => {
  const {c}=setup('glass');const before=c.run('JSON.stringify([propAccounts,propEntries])');
  c.run('propLinkageOpen("stage","funded","propProgressStage-funded")');assert.equal(c.run('propModal?.type'),'overview-list');
  c.run('propLinkageBeforeRender()');assert.equal(c.run('propModal?.type'),'overview-list');
  c.run('propLinkageOpenDetail("glass-account-0")');assert.equal(c.run('propModal.type'),'detail');
  assert.match(c.run('propDetail(propModal).body'),/id="propHistoryDetailEntry"/);
  c.run('propHistoryOpen("glass-account-0")');assert.equal(c.run('propModal.type'),'history');assert.equal(c.run('propHistoryActive()'),true);
  c.run('propHistoryBack();propLinkageBack()');assert.equal(c.run('propModal.type'),'overview-list');
  c.run('propModal=null;propLinkageCurrent("funded")');assert.equal(c.run('propView'),'accounts');
  assert.match(c.run('renderPropAccounts()'),/id="propExactStatus"/);
  assert.doesNotMatch(c.run('renderPropAccounts()'),/data-id="glass-account-1"/);
  assert.equal(c.run('JSON.stringify([propAccounts,propEntries])'),before);
});

test('Glass keeps a newly opened cohort sheet across redraw, but classic/identity exit clears it', () => {
  for (const exit of ['applyLayout("classic")','session={user:{id:"different"}}']) {
    const {c}=setup('glass');c.run('propOverviewBeforeRender();propLinkageOpen("stage","bought","propProgressStage-bought");propOverviewBeforeRender()');
    assert.equal(c.run('propModal?.type'),'overview-list');
    c.run(exit+';propOverviewBeforeRender()');assert.equal(c.run('propModal'),null);
  }
});

test('admin firm action uses the modern editor under Glass without weakening permission checks', async () => {
  for (const layout of ['glass','modern','classic']) {
    const {c,listeners}=setup(layout);
    const handler=listeners.get('click').find(fn=>fn.toString().includes('a === "prop-adm-firm"'));
    assert.ok(handler);
    const element={dataset:{action:'prop-adm-firm',id:'glass-firm-0'}};
    await handler({target:{closest:()=>element}});
    assert.equal(c.run('!!propFirmEditor'),layout!=='classic');
    if(layout==='classic')assert.equal(c.run('propModal.type'),'admFirm');
    for (const guard of ['currentProfile.role="user"','viewingUserId="synthetic-viewed"','currentProfile.active=false']) {
      c.run('propFirmEditor=null;propModal=null;currentProfile={role:"admin",active:true};viewingUserId=null;'+guard);
      await handler({target:{closest:()=>element}});assert.equal(c.run('propFirmEditor'),null);assert.equal(c.run('propModal'),null);
    }
  }
});

test('history context retains material identity; dirty account drafts and ordinary caches stay protected', () => {
  const {c}=setup('glass');const context=c.run('propHistoryContext()');
  c.run('propModal={type:"detail",id:"glass-account-0",draft:propDetailDraft(propAccounts[0])};propModal.draft.note="unsaved";propHistoryOpen("glass-account-0")');
  assert.equal(c.run('propModal.type'),'detail');assert.equal(c.run('propModal.draft.note'),'unsaved');
  c.run('applyLayout("modern")');assert.notEqual(c.run('propHistoryContext()'),context);
});

test('existing history context invalidation still clears an open draft on actual layout change', () => {
  const {c}=setup('glass');const before=c.run('JSON.stringify([propAccounts,propEntries])');
  c.run('propOverviewBeforeRender();propHistoryOpen();propHistorySelect("glass-account-0");propModal.draft.rows[0].value.day="2026-09-30"');
  assert.equal(c.run('propModal.type'),'history');assert.equal(c.run('propHistoryDirty(propModal)'),true);
  c.run('propOverviewBeforeRender()');assert.equal(c.run('propModal.type'),'history');
  c.run('applyLayout("modern");propOverviewBeforeRender()');assert.equal(c.run('propModal'),null);
  assert.equal(c.run('JSON.stringify([propAccounts,propEntries])'),before);
});

test('appearance roundtrip stores Glass identity in memory-only storage, not modern', () => {
  const {c,doc}=setup('glass'), storage=new Map(), styles=new Map();
  c.sandbox.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
  doc.documentElement.style={getPropertyValue:k=>styles.get(k)||'',setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)};
  c.run('applyAppearance({layout:"glass",palette:"sky",theme:"dark",calPos:"#123456",calNeg:"#987654"})');
  assert.equal(storage.get('journal_layout'),'glass');assert.equal(c.run('currentAppearance().layout'),'glass');
  c.run('applyLayout("classic");loadAppearance()');
  assert.equal(c.run('currentLayout()'),'glass');assert.equal(c.run('isModernLayout()'),true);
  assert.equal(c.run('currentPalette()'),'sky');assert.equal(c.run('currentAppearance().calPos'),'#123456');
});

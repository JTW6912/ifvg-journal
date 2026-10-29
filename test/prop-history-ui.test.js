const test = require('node:test');
const assert = require('node:assert/strict');
const { makeContext, ENGINE_FILES } = require('./load');
const copy = v => JSON.parse(JSON.stringify(v));
const account = (extra = {}) => ({id:'ha',user_id:'u',firm_id:'demo',firm_name:'Demo',nickname:'Synthetic',plan_name:'Evaluation',group_name:'G',
  bought_on:'2026-10-01',updated_at:'2026-10-20T00:00:00Z',status:'funded',billing:'one_time',renewing:false,
  events:[{to:'eval',day:'2026-10-01'},{to:'passed',day:'2026-10-03'},{to:'funded',day:'2026-10-05'}],...extra});
function setup(a=account()) {
  const c=makeContext(ENGINE_FILES);c.sandbox.document.querySelector=()=>null;c.sandbox.document.querySelectorAll=()=>[];
  c.sandbox.document.documentElement.dataset.layout='modern';
  c.set('session',{user:{id:'u'}});c.set('currentProfile',{active:true});c.set('authLoading',false);c.set('tab','prop');c.set('propView','overview');
  c.set('propAccounts',[a]);c.set('propEntries',[{id:'cash',account_id:'ha',kind:'purchase',amount:100,day:'2026-10-01'}]);
  c.set('propFirms',[{id:'demo',name:'Demo',logo:'img/prop/topstep.webp'}]);
  c.run('sb={}; propRenderModal=()=>{}; render=()=>{}; renderSecondaryModals=()=>{};');return c;
}
function open(c){c.run('propHistoryOpen(); propHistorySelect("ha");');}
test('history UI: open/search/render is cached, scoped, date-independent and safe',()=>{
  const c=setup(account({events:[],nickname:'<img onerror=evil>'}));
  c.run('sb={from(){throw Error("unexpected request")}}');c.set('propOverviewRange',{preset:'custom',from:'2025-01-01',to:'2025-01-02'});
  c.run('propHistoryOpen()');assert.equal(c.run('propModal.mode'),'list');assert.equal(c.run('propModal.listTab'),'pending');
  const html=c.run('propHistoryModalHtml(propModal)');assert.match(html,/&lt;img onerror=evil&gt;/);assert.match(html,/img\/prop\/topstep.webp/);assert.doesNotMatch(html,/<img onerror=evil>/);
  assert.match(html,/prop-history-account/);c.set('propFirmFilter','Other');c.run('propHistoryBeforeRender()');assert.equal(c.run('propModal'),null);
});
test('history UI: malformed roots retained by normal serialization and history mutation blocked before write',async()=>{
  const c=setup();c.run('propAccounts=[propHistoryAccountFromRow({...propAccounts[0],events:{original:"keep"}})]');
  assert.deepEqual(copy(c.run('propAccountRow(propAccounts[0]).events')),{original:'keep'});
  assert.equal(Object.keys(c.run('propAccountRow(propAccounts[0])')).some(k=>k.startsWith('_history')),false);
  c.run('sb={from(){throw Error("must not request")}}');assert.equal(await c.run('propSaveAccount({...propAccounts[0],events:[{to:"eval",day:"2026-10-01"}]})'),false);
  assert.doesNotThrow(()=>c.run('propFunnel([{...propAccounts[0],events:[null]}],[])'));
  assert.doesNotThrow(()=>c.run('propDetail({type:"detail",id:"ha"})'));
});
test('history UI: dirty parent blocks repair and legacy date changes without losing its draft',async()=>{
  const c=setup();c.run('propModal={type:"detail",id:"ha",draft:propDetailDraft(propAccounts[0])};propModal.draft.nickname="unsaved"');
  for(const i of [0,1]){
    await c.run(`propSaveEventDay('ha',${i},'2026-10-02')`);
    assert.equal(c.run('propModal.type'),'detail');assert.equal(c.run('propModal.draft.nickname'),'unsaved');
    assert.equal(c.run('propAccounts[0].events[0].day'),'2026-10-01');
  }
});
test('history UI: legacy first and nonfirst dates enter isolated review, never purchase/ledger writers',async()=>{
  for(const index of [0,1]){
    const c=setup(account({events:[{to:'passed',day:'2026-10-03'},{to:'funded',day:'2026-10-05'}]}));
    c.run('propModal={type:"detail",id:"ha",draft:propDetailDraft(propAccounts[0])}; propSaveAccount=propSaveEntries=propMoveBoughtOn=()=>{throw Error("forbidden")}');
    await c.run(`propSaveEventDay('ha',${index},'2026-10-04')`);
    assert.equal(c.run('propModal.type'),'history');assert.equal(c.run('propModal.draft.rows['+index+'].value.day'),'2026-10-04');
    assert.equal(c.run('propModal.draft.bought_on'),'2026-10-01');assert.equal(c.run('propEntries[0].day'),'2026-10-01');
  }
});
test('history UI: stable insertion/removal/restore stays draft-only, discard keeps or abandons',()=>{
  const c=setup();open(c);c.run('propHistoryInsert(1)');assert.equal(c.run('propModal.draft.rows[1].source'),null);assert.equal(c.run('propModal.draft.rows[1].value.day'),'');
  c.run('propHistoryRemove("original-0")');assert.equal(c.run('propModal.draft.rows[0].removed'),true);
  c.run('propHistoryRemove("original-0")');assert.equal(c.run('propModal.draft.rows[0].removed'),false);
  c.run('propCloseModal()');assert.equal(c.run('propModal.type'),'history');assert.equal(c.run('propModal.confirm.kind'),'close');
  c.run('propHistoryKeep()');assert.equal(c.run('propModal.confirm'),null);
  assert.equal(c.run('propAccounts[0].events.length'),3);c.run('propCloseModal();propHistoryConfirm()');assert.equal(c.run('propModal'),null);
});
test('history UI: deletion requires acknowledgement and busy guards close/back/repeated save',async()=>{
  const c=setup();open(c);c.run('propHistoryRemove("original-0");propHistoryReview()');assert.equal(c.run('propModal.mode'),'review');
  let calls=0,release;c.sandbox.historyReply=()=>{calls++;return new Promise(r=>release=r)};c.run('propHistorySave=historyReply');
  await c.run('propHistorySubmit()');assert.equal(calls,0);
  c.run('propModal.acknowledged=true');const waiting=c.run('propHistorySubmit()');
  assert.equal(c.run('propModal.busy'),true);c.run('propCloseModal();propHistoryBack()');assert.equal(c.run('propModal.mode'),'review');
  await c.run('propHistorySubmit()');assert.equal(calls,1);release({ok:false,reason:'error'});await waiting;
  assert.equal(c.run('propModal.busy'),false);assert.equal(c.run('propModal.draft.rows[0].removed'),true);
});
test('history UI: verified save recomputes and clean parent returns with fresh purchase date',async()=>{
  const c=setup();c.run('propModal={type:"detail",id:"ha",draft:propDetailDraft(propAccounts[0])};propHistoryOpen("ha");propModal.draft.bought_on="2026-09-30";propHistoryReview()');
  c.run('propHistorySave=async(d)=>{propAccounts[0]={...propAccounts[0],bought_on:d.bought_on};return {ok:true,id:"ha",remaining:[]}}');
  await c.run('propHistorySubmit()');assert.equal(c.run('propModal.mode'),'saved');c.run('propHistoryBack()');
  assert.equal(c.run('propModal.type'),'detail');assert.equal(c.run('propModal.draft'),null);
  c.run('propDetail(propModal)');assert.equal(c.run('propModal.draft.bought_on'),'2026-09-30');assert.equal(c.run('propDetailDirty(propAccounts[0],propModal.draft)'),false);
  assert.equal(c.run('propEntries[0].day'),'2026-10-01');
});
test('history UI: conflict/reload keeps draft until explicit confirmed reload and late results cannot repaint',async()=>{
  const c=setup();open(c);c.run('propModal.draft.bought_on="2026-09-30";propHistoryReview();propHistorySave=async()=>({ok:false,reason:"conflict"})');
  await c.run('propHistorySubmit()');assert.equal(c.run('propModal.error'),'conflict');assert.equal(c.run('propModal.draft.bought_on'),'2026-09-30');
  c.run('propHistoryRequestReload()');assert.equal(c.run('propModal.confirm.kind'),'reload');c.run('propHistoryKeep()');assert.equal(c.run('propModal.draft.bought_on'),'2026-09-30');
  c.run('propModal.busy=true');c.set('session',{user:{id:'different'}});c.run('propHistoryBeforeRender()');assert.equal(c.run('propModal'),null);
});
test('history UI: pending keyboard legacy event is carried into explicit editor',()=>{
  const c=setup();c.run('propModal={type:"detail",id:"ha",draft:propDetailDraft(propAccounts[0])}');
  c.sandbox.document.activeElement={type:'date',dataset:{propEvent:'1',id:'ha',propPending:'1',propKeying:'1'},value:'2026-10-04'};
  c.run('propHistoryOpen("ha")');assert.equal(c.run('propModal.draft.rows[1].value.day'),'2026-10-04');
  assert.equal(c.run('propAccounts[0].events[1].day'),'2026-10-03');
});
test('history UI: normal purchase-date edit never guesses stage identity after first-record removal',()=>{
  const a=account({events:[{to:'passed',day:'2026-10-01'},{to:'funded',day:'2026-10-05'}]}),c=setup(a);
  c.run('next={...propAccounts[0]};moved=propMoveBoughtOn(propAccounts[0],next,"2026-09-30")');
  assert.equal(c.run('next.bought_on'),'2026-09-30');assert.deepEqual(copy(c.run('next.events')),a.events);
  assert.equal(c.run('moved[0].day'),'2026-09-30');assert.equal(c.run('propEntries[0].day'),'2026-10-01');
});
test('history UI: ordinary saves and renewal retain malformed raw root and normalized cache',async()=>{
  const c=setup(account({status:'eval',billing:'monthly',monthly_fee:50,renewing:true,renewed_through:'2026-10-01'}));
  c.run('propAccounts=[propHistoryAccountFromRow({...propAccounts[0],events:{keep:"raw"}})];todayStr=()=>"2026-11-02"');
  const calls=[];c.sandbox.normalAPI={from(table){return{async upsert(payload){calls.push({table,payload:copy(payload)});return {error:null}}}}};c.run('sb=normalAPI');
  assert.equal(await c.run('propSaveAccount({...propAccounts[0],nickname:"renamed"})'),true);
  await c.run('propApplyRenewals()');
  const writes=calls.filter(x=>x.table==='prop_accounts');assert.equal(writes.length,2);
  for(const w of writes){assert.deepEqual(w.payload.events,{keep:'raw'});assert.ok(!Object.keys(w.payload).some(k=>k.startsWith('_history')))}
  assert.deepEqual(copy(c.run('propAccounts[0].events')),[]);assert.deepEqual(copy(c.run('propAccounts[0]._historyRawEvents')),{keep:'raw'});
});
test('history UI: delayed save/reload results after scope invalidation cannot restore disposed modal',async()=>{
  for(const op of ['save','reload']) {
    const c=setup();open(c);c.run('propModal.draft.bought_on="2026-09-30";propHistoryReview()');
    let release;const wait=new Promise(r=>release=r);c.sandbox.late=()=>wait;
    c.run(op==='save'?'propHistorySave=late':'propHistoryReload=late');
    if(op==='reload')c.run('propHistoryRequestReload()');
    const p=c.run(op==='save'?'propHistorySubmit()':'propHistoryConfirm()');c.set('propGroupFilter','Other');c.run('propHistoryBeforeRender()');
    assert.equal(c.run('propModal'),null);release({ok:true,id:'ha',account:account(),remaining:[]});await p;assert.equal(c.run('propModal'),null);
  }
});
test('history UI: busy dialog with no enabled controls keeps keyboard focus on its heading',()=>{
  const c=setup();open(c);let prevented=0,focused=0;
  c.sandbox.document.querySelector=()=>({querySelectorAll:()=>[],contains:()=>false});
  c.sandbox.document.getElementById=id=>id==='propHistoryTitle'?{focus(){focused++}}:null;
  c.sandbox.historyKey={key:'Tab',target:{type:'button',closest:()=>null},preventDefault(){prevented++}};
  c.run('propModal.busy=true;propHistoryKeydown(historyKey)');assert.equal(prevented,1);assert.equal(focused,1);
});
test('history UI: Shift+Tab from the programmatically focused heading wraps inside the drawer',()=>{
  const c=setup();open(c);let lastFocused=0,prevented=0;
  const first={tabIndex:0,matches:()=>false,getClientRects:()=>[{}],focus(){throw Error('wrong target')}};
  const last={...first,focus(){lastFocused++}};
  c.sandbox.document.querySelector=()=>({querySelectorAll:()=>[first,last],contains:()=>true});
  c.sandbox.document.activeElement={id:'propHistoryTitle'};c.sandbox.getComputedStyle=()=>({visibility:'visible'});
  c.sandbox.historyKey={key:'Tab',shiftKey:true,target:{type:'heading',closest:()=>null},preventDefault(){prevented++}};
  c.run('propHistoryKeydown(historyKey)');assert.equal(prevented,1);assert.equal(lastFocused,1);
});
test('history UI: account moving outside the selected company/group disposes the stale editor',()=>{
  const c=setup();c.set('propGroupFilter','G');open(c);c.run('propAccounts[0].group_name="Other";propHistoryBeforeRender()');assert.equal(c.run('propModal'),null);
});
test('history UI: saved first-record removal followed by explicit normal purchase edit leaves stage dates intact',async()=>{
  const a=account({events:[{to:'eval',day:'2026-10-01'},{to:'passed',day:'2026-10-01'},{to:'funded',day:'2026-10-05'}]}),c=setup(a),writes=[];
  c.sandbox.recordAPI={from(table){let payload;const q={
    update(p){payload=copy(p);writes.push({table,operation:'update',payload});return q},eq(){return q},is(){return q},
    async select(){return {data:[{...a,...payload}],error:null}},
    async upsert(p){writes.push({table,operation:'upsert',payload:copy(p)});return {error:null}}
  };return q}};c.run('sb=recordAPI');
  open(c);c.run('propHistoryRemove("original-0");propHistoryReview();propModal.acknowledged=true');await c.run('propHistorySubmit()');
  assert.equal(c.run('propModal.mode'),'saved');assert.equal(c.run('propEntries[0].day'),'2026-10-01');
  c.run('propModal={type:"detail",id:"ha",draft:propDetailDraft(propAccounts[0])};propModal.draft.bought_on="2026-09-30"');await c.run('propSaveEdit()');
  assert.deepEqual(copy(c.run('propAccounts[0].events')),a.events.slice(1));assert.equal(c.run('propAccounts[0].bought_on'),'2026-09-30');
  assert.equal(c.run('propEntries[0].day'),'2026-09-30');assert.deepEqual(writes.map(x=>[x.table,x.operation]),[['prop_accounts','update'],['prop_accounts','upsert'],['prop_entries','upsert']]);
});
test('history UI: classic detail keeps its entry layout but legacy date edits still use safe review',async()=>{
  const c=setup();c.sandbox.document.documentElement.dataset.layout='classic';
  c.run('propModal={type:"detail",id:"ha",draft:propDetailDraft(propAccounts[0])}');
  assert.doesNotMatch(c.run('propDetail(propModal).body'),/propHistoryDetailEntry/);
  await c.run('propSaveEventDay("ha",0,"2026-10-02")');assert.equal(c.run('propModal.type'),'history');assert.equal(c.run('propAccounts[0].bought_on'),'2026-10-01');
});
test('history UI: readonly/busy/invalid root prevent mutations; all strings translate in both languages',()=>{
  const c=setup();open(c);c.set('viewingUserId','other');c.run('propHistoryInsert(0)');assert.equal(c.run('propModal.draft.rows.length'),3);
  c.set('viewingUserId',null);
  for(const lang of ['zh','en']){c.set('lang',lang);for(const mode of ['list','edit','review','saved']){c.run(`propModal.mode=${JSON.stringify(mode)}`);const html=c.run('propHistoryModalHtml(propModal)');assert.doesNotMatch(html,/prop\.history\.[A-Za-z]/);}}
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { makeContext, ENGINE_FILES } = require('./load');
const copy = x => JSON.parse(JSON.stringify(x));
const account = (extra = {}) => ({ id:'history-a', user_id:'owner-a', bought_on:'2026-10-01',
  updated_at:'2026-10-20T01:00:00.000Z', status:'funded', renewing:false, renewed_through:'2026-10-01',
  balance:51000, balance_peak:52000, balance_on:'2026-10-18', nickname:'Synthetic A', note:'keep',
  firm_name:'Synthetic firm', plan_snapshot:{type:'evaluation'},
  events:[{to:'eval',day:'2026-10-01',extra:{keep:true}},{to:'passed',day:'2026-10-03'},{to:'funded',day:'2026-10-05'}], ...extra });
function setup(a = account()) {
  const c = makeContext(ENGINE_FILES); c.set('session',{user:{id:'owner-a'}}); c.set('currentProfile',{active:true});
  c.set('authLoading',false); c.set('propAccounts',[a]); c.set('propEntries',[{id:'cash-a',account_id:a.id,kind:'purchase',amount:100,day:a.bought_on}]);
  return c;
}
function call(c,name,...args) { return copy(c.run(`${name}(...${JSON.stringify(args)})`)); }
function draft(c,a=account()) { return call(c,'propHistoryDraft',a); }
function fake(c, reply) {
  const calls=[]; let payload;
  const q={update(p){payload=copy(p);calls.push(['update',payload]);return q;},
    eq(k,v){calls.push(['eq',k,copy(v)]);return q;},is(k,v){calls.push(['is',k,v]);return q;},
    async select(columns){calls.push(['select',columns]); return reply ? reply(payload) : {data:[{id:'history-a',user_id:'owner-a',...copy(c.run('propAccounts[0]')),...payload}],error:null};}};
  c.sandbox.historyAPI={from(t){calls.push(['from',t]); return q;}};c.run('sb=historyAPI');
  return calls;
}
async function save(c,d,ack=true) { c.sandbox.historyDraft=d;return copy(await c.run(`propHistorySave(historyDraft, {acknowledged:${ack}})`)); }

test('history: invalid root evidence survives normalization and cannot become empty history',()=>{
  const c=setup(), raw=account({events:{unexpected:'preserve'}}), normalized=call(c,'propHistoryAccountFromRow',raw);
  assert.deepEqual(normalized.events,[]); assert.equal(normalized._historyInvalidRoot,true);assert.equal(normalized.updated_at,raw.updated_at);
  assert.ok(call(c,'propHistoryIssues',normalized,[]).some(i=>i.code==='invalidRoot'));
  assert.equal(call(c,'propHistoryPatch',draft(c,normalized)).reason,'invalidRoot');
  assert.deepEqual(raw.events,{unexpected:'preserve'});
});
test('history: real ISO days and known stages, including leap/boundary years',()=>{
  const c=setup(); for(const day of ['1990-01-01','2000-02-29','2099-12-31']) assert.equal(call(c,'propHistoryDay',day),true);
  for(const day of ['1989-12-31','2100-01-01','2026-02-29','2026-2-01','',null]) assert.equal(call(c,'propHistoryDay',day),false);
});
test('history: missing stages, instant exemption, attempts and external ledger errors',()=>{
  const c=setup(), a=account({events:[{to:'eval',day:'2026-10-01'},{to:'failed',day:'2026-10-02'},{to:'eval',day:'2026-10-03'},{to:'failed',day:'2026-10-04'}]});
  const before=copy(a), reasons=call(c,'propHistoryIssues',a,[{id:'e',account_id:a.id,kind:'purchase',day:'bad'}]);
  assert.ok(reasons.some(i=>i.code==='missingPassed'));assert.ok(reasons.some(i=>i.code==='missingFunded'));
  assert.ok(reasons.some(i=>i.code==='ledgerDate'&&i.level==='external'));
  assert.equal(reasons.filter(i=>i.code==='duplicate').length,0);assert.deepEqual(a,before);
  assert.equal(call(c,'propHistoryIssues',{...a,plan_snapshot:{type:'instant'}},[]).some(i=>i.code==='missingPassed'),false);
  assert.ok(call(c,'propHistoryIssues',account({status:'failed',events:[]}),[]).some(i=>i.code==='missingFailed'));
});
test('history: suspicious chronology and repeats are reasons, not destructive normalization',()=>{
  const c=setup(), a=account({events:[null,{to:'alien',day:'bad'},{to:'failed',day:'2026-09-30'},{to:'failed',day:'2026-09-30'},{to:'eval',day:'2026-09-29'}]});
  const codes=call(c,'propHistoryIssues',a,[]).map(i=>i.code);
  for(const k of ['invalidType','invalidDate','beforePurchase','duplicate','dateOrder']) assert.ok(codes.includes(k));
  const d=draft(c,a), p=call(c,'propHistoryPatch',d);assert.equal(p.ok,true);assert.equal(p.changed,false);assert.deepEqual(p.events,a.events);
});
test('history: pending/all search uses full provided scope without mutating or financial-range filtering',()=>{
  const c=setup(), good=account(), bad=account({id:'b',nickname:'Manual target',events:[]});
  assert.equal(call(c,'propHistoryList',[good,bad],[],'pending','').length,1);
  assert.equal(call(c,'propHistoryList',[good,bad],[],'all','synthetic a').length,1);
  assert.equal(call(c,'propHistoryList',[good,bad],[],'all','<missing>').length,0);
});
test('history: stable identities, explicit insertion/removal, diff and unknown metadata preservation',()=>{
  const c=setup(), a=account(), d=draft(c,a), original=copy(d.base);
  d.rows[0].removed=true; d.rows[1].value.day='2026-10-04';
  d.rows.splice(2,0,{key:'new-1',source:null,value:{to:'eval',day:'2026-10-04'},removed:false});
  const p=call(c,'propHistoryPatch',d);
  assert.equal(p.ok,true);assert.equal(p.removed,1);assert.deepEqual(p.events.map(e=>e.to),['passed','eval','funded']);
  assert.deepEqual(p.changes.map(e=>e.kind),['remove','edit','add']); assert.deepEqual(d.base,original);assert.deepEqual(a,account());
  d.rows[0].removed=false;assert.deepEqual(call(c,'propHistoryPatch',d).events[0].extra,{keep:true});
});
test('history: partial repair retains untouched malformed rows; edited rows must become valid',()=>{
  const c=setup(), d=draft(c,account({events:[null,{to:'passed',day:''},{to:'funded',day:'2026-10-05',unknown:'keep'}]}));
  d.bought_on='2026-09-30';assert.equal(call(c,'propHistoryPatch',d).ok,true);
  d.rows[1].value.day='2026-02-29';assert.equal(call(c,'propHistoryPatch',d).ok,false);
  d.rows[1].value.day='2026-10-03';const p=call(c,'propHistoryPatch',d);assert.equal(p.ok,true);assert.equal(p.events[0],null);assert.equal(p.events[2].unknown,'keep');
});
test('history: reject reordered, missing/duplicate identities and changes to unknown metadata',()=>{
  const c=setup(); let d=draft(c);d.rows.reverse();assert.equal(call(c,'propHistoryPatch',d).ok,false);
  d=draft(c);d.rows.pop();assert.equal(call(c,'propHistoryPatch',d).ok,false);
  d=draft(c);d.rows[1].key=d.rows[0].key;assert.equal(call(c,'propHistoryPatch',d).ok,false);
  d=draft(c);d.rows[0].value.extra.keep=false;assert.equal(call(c,'propHistoryPatch',d).ok,false);
});
test('history: precise account-only update with original owner/version/date/history and verified cache merge',async()=>{
  const c=setup(), d=draft(c), before=copy(c.run('propAccounts[0]')), cash=copy(c.run('propEntries'));d.bought_on='2026-09-30';d.rows[0].removed=true;
  const calls=fake(c), result=await save(c,d);assert.equal(result.ok,true);
  assert.deepEqual(Object.keys(calls.find(x=>x[0]==='update')[1]).sort(),['bought_on','events','updated_at']);
  for(const [k,v] of [['id',before.id],['user_id',before.user_id],['updated_at',before.updated_at],['bought_on',before.bought_on],['events',JSON.stringify(before.events)]]) assert.ok(calls.some(x=>x[0]==='eq'&&x[1]===k&&x[2]===v),k);
  const after=copy(c.run('propAccounts[0]'));for(const k of Object.keys(before).filter(k=>!['bought_on','events','updated_at'].includes(k))) assert.deepEqual(after[k],before[k],k);
  assert.deepEqual(copy(c.run('propEntries')),cash);assert.deepEqual(d.base,before);assert.equal(after.events[0].to,'passed');
  assert.equal(calls.filter(x=>x[0]==='from').length,1);assert.equal(calls[0][1],'prop_accounts');
});
test('history: null version and purchase day use IS NULL, never omitted compare guards',async()=>{
  const a=account({updated_at:null,bought_on:null}), c=setup(a), d=draft(c,a);d.bought_on='2026-09-30';const calls=fake(c);
  assert.equal((await save(c,d)).ok,true);
  for(const key of ['updated_at','bought_on']) assert.ok(calls.some(x=>x[0]==='is'&&x[1]===key&&x[2]===null));
});
test('history: conflict, errors, malformed/multiple/unverified results retain cache and draft',async()=>{
  for(const mode of ['zero','error','throw','multiple','wrongHistory','wrongOwner','invalidVersion','oldVersion']){
    const c=setup(), d=draft(c);d.bought_on='2026-09-30';const before=copy(c.run('propAccounts')), prior=copy(d);
    fake(c,p=>{if(mode==='throw') throw Error('Synthetic transport error');if(mode==='error')return{error:{message:'Synthetic failure'}};
      if(mode==='zero')return{data:[],error:null};const row={...account(),...p};
      if(mode==='wrongHistory')row.events=[];if(mode==='wrongOwner')row.user_id='other';if(mode==='invalidVersion')row.updated_at='bad';if(mode==='oldVersion')row.updated_at=account().updated_at;
      return{data:mode==='multiple'?[row,row]:[row],error:null};});
    const r=await save(c,d);assert.equal(r.ok,false,mode);assert.deepEqual(copy(c.run('propAccounts')),before,mode);assert.deepEqual(d,prior,mode);
    if(mode==='zero')assert.equal(r.reason,'conflict');
  }
});
test('history: no write without changes, deletion acknowledgement, owner, active session or valid baseline',async()=>{
  for(const mode of ['unchanged','ack','readonly','inactive','loading','foreign','gone','missingVersion','cacheChanged','root']){
    const a=account(), c=setup(a), d=draft(c,a);if(mode!=='unchanged')d.bought_on='2026-09-30';
    if(mode==='ack')d.rows[0].removed=true;if(mode==='readonly')c.set('viewingUserId','other');if(mode==='inactive')c.set('currentProfile',{active:false});
    if(mode==='loading')c.set('authLoading',true);if(mode==='foreign')d.base.user_id='other';if(mode==='gone')c.set('propAccounts',[]);
    if(mode==='missingVersion')delete d.base.updated_at;if(mode==='cacheChanged')c.run("propAccounts[0].updated_at='2026-10-21T00:00:00Z'");
    if(mode==='root')d.base._historyInvalidRoot=true;const calls=fake(c);assert.equal((await save(c,d,mode!=='ack')).ok,false,mode);assert.equal(calls.length,0,mode);
  }
});
test('history: saved partial correction reports untouched remaining issues without altering ledger',async()=>{
  const a=account({events:[null,...account().events]}), c=setup(a), d=draft(c,a);d.bought_on='2026-09-30';
  const cash=copy(c.run('propEntries'));fake(c);const r=await save(c,d);
  assert.equal(r.ok,true);assert.equal(c.run('propAccounts[0].events[0]'),null);
  assert.ok(r.remaining.some(i=>i.code==='invalidType'));assert.ok(r.remaining.some(i=>i.code==='invalidDate'));
  assert.deepEqual(copy(c.run('propEntries')),cash);
});
test('history: late response after UI context invalidation cannot update cache',async()=>{
  const c=setup(), d=draft(c);d.bought_on='2026-09-30';let release,alive=true;const waiting=new Promise(r=>release=r);
  fake(c,async p=>{await waiting;return {data:[{...account(),...p}],error:null};});
  c.sandbox.historyDraft=d;c.sandbox.historyAlive=()=>alive;
  const pending=c.run('propHistorySave(historyDraft,{current:historyAlive})');alive=false;release();
  const r=await pending;assert.equal(r.reason,'stale');assert.equal(r.mayHaveSaved,true);
  assert.equal(c.run('propAccounts[0].bought_on'),'2026-10-01');
});
test('history: same session object with mutated owner cannot accept save or reload completion',async()=>{
  for(const operation of ['save','reload']) {
    const c=setup(),d=draft(c);d.bought_on='2026-09-30';let release;const wait=new Promise(r=>release=r);const before=copy(c.run('propAccounts'));
    if(operation==='save')fake(c,async p=>{await wait;return {data:[{...account(),...p}],error:null}});
    else {c.sandbox.reloadAPI={from(){const q={select(){return q},eq(){return q},then(resolve,reject){return wait.then(()=>({data:[{...account(),nickname:'server'}],error:null})).then(resolve,reject)}};return q}};c.run('sb=reloadAPI')}
    const pending=operation==='save'?save(c,d):c.run('propHistoryReload("history-a")');c.run('session.user.id="other"');release();
    assert.equal((await pending).reason,'stale',operation);assert.deepEqual(copy(c.run('propAccounts')),before,operation);
  }
});
test('history: reload cannot overwrite a same-scope cache update while its response is pending',async()=>{
  for(const field of ['updated_at','nickname']) {
    const c=setup();let release;const wait=new Promise(r=>release=r);
    c.sandbox.reloadAPI={from(){const q={select(){return q},eq(){return q},then(resolve,reject){return wait.then(()=>({data:[account()],error:null})).then(resolve,reject)}};return q}};
    c.run('sb=reloadAPI');const pending=c.run('propHistoryReload("history-a")');
    c.run(field==='updated_at'?'propAccounts[0].updated_at="2026-10-25T00:00:00Z"':'propAccounts[0].nickname="newer cache"');
    const fresh=copy(c.run('propAccounts'));release();assert.equal((await pending).reason,'conflict');assert.deepEqual(copy(c.run('propAccounts')),fresh);
  }
});
test('history: duplicate submission blocked and late response after session change cannot update cache',async()=>{
  const c=setup(),d=draft(c);d.bought_on='2026-09-30';let release;const waiting=new Promise(r=>release=r);
  const calls=fake(c,async p=>{await waiting;return{data:[{...account(),...p}],error:null};});
  const first=save(c,d);assert.equal((await save(c,d)).reason,'busy');c.set('session',{user:{id:'other'}});release();
  assert.equal((await first).reason,'stale');assert.equal(c.run('propAccounts[0].bought_on'),'2026-10-01');assert.equal(calls.filter(x=>x[0]==='update').length,1);
});

test('history merge: only changed history columns enter UPDATE; all original compare guards remain', async () => {
  for (const mode of ['purchase', 'events']) {
    const a = account(), c = setup(a), d = draft(c, a);
    if (mode === 'purchase') d.bought_on = '2026-09-30';
    else d.rows[1].value.day = '2026-10-04';
    const calls = fake(c); assert.equal((await save(c, d)).ok, true);
    const payload = calls.find(x => x[0] === 'update')[1];
    assert.deepEqual(Object.keys(payload).sort(), [mode === 'purchase' ? 'bought_on' : 'events', 'updated_at']);
    for (const key of ['bought_on', 'events', 'updated_at', 'user_id', 'id']) assert.ok(calls.some(x => x[0] === 'eq' && x[1] === key));
  }
});

test('history merge: events-only repair does not resubmit an untouched legacy unknown purchase date', async () => {
  const a = account({ bought_on: null }), c = setup(a), d = draft(c, a);
  d.rows[1].value.day = '2026-10-04';
  const calls = fake(c), result = await save(c, d);
  assert.equal(result.ok, true);
  assert.equal(Object.hasOwn(calls.find(x => x[0] === 'update')[1], 'bought_on'), false);
  assert.ok(calls.some(x => x[0] === 'is' && x[1] === 'bought_on' && x[2] === null));
  assert.equal(c.run('propAccounts[0].bought_on'), null);
  assert.ok(result.remaining.some(i => i.code === 'purchaseDate'));
});

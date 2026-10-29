const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeContext, ENGINE_FILES } = require('./load');
function setup() {
  const c = makeContext(ENGINE_FILES, { URL });
  c.set('session', { user: { id: 'owner' } }); c.set('currentProfile', { role: 'admin', active: true });
  c.set('authLoading', false); c.sandbox.document.querySelector = () => null;
  c.run('render=()=>{}; propRenderModal=()=>{};');
  return c;
}
async function authHook(c) {
  const source = fs.readFileSync(path.join(__dirname, '../src/16-init.js'), 'utf8');
  c.run(source.slice(source.indexOf('async function bootstrapAuth()'), source.indexOf('(async function init()')));
  c.run('var onAuth; sb.auth={getSession:async()=>({data:{session}}),onAuthStateChange:f=>{onAuth=f}};loadProfile=async()=>{};loadAll=async()=>{};restoreNav=()=>{};');
  await c.run('bootstrapAuth()');
}
function pendingClient() {
  let release; const wait = new Promise(resolve => { release = resolve; });
  const client = { from() {
    const q = { select(){return q;},order(){return q;},eq(){return q;},limit(){return q;},range(){return q;},
      upsert(){return q;},delete(){return q;},then(a,b){return wait.then(a,b);} };
    return q;
  } };
  return { client, release };
}

test('auth identity change clears private Prop caches, drafts, selection and undo while token refresh preserves them', async () => {
  const c = setup(); c.run('sb={};'); await authHook(c);
  c.run('propAccounts=[{id:"old"}];propEntries=[{id:"entry"}];propModal={type:"history",draft:{secret:true}};propSelected=["old"];propGroupFilter="private group";propToastUndo=()=>{};propFirms=[{id:"public"}];propFirmEditor={draft:{notes:"draft"}};');
  await c.run('onAuth("TOKEN_REFRESHED",{user:{id:"owner"}})');
  await c.run('onAuth("USER_UPDATED",{user:{id:"owner"}})');
  assert.equal(c.run('propAccounts.length'), 1); assert.ok(c.run('propFirmEditor'));
  await c.run('onAuth("SIGNED_OUT",null)');
  for (const key of ['propAccounts', 'propEntries', 'propSelected']) assert.equal(c.run(key + '.length'), 0, key);
  for (const key of ['propModal', 'propToastUndo', 'propFirmEditor']) assert.equal(c.run(key), null, key);
  assert.equal(c.run('propGroupFilter'), ''); assert.equal(c.run('propFirms[0].id'), 'public');
});

for (const sameOwner of [false, true]) test('late Prop load cannot refill or renew after ' + (sameOwner ? 'logout/relogin to same owner' : 'owner switch'), async () => {
  const c = setup(), p = pendingClient(); c.sandbox.client = p.client;
  c.run('sb=client;var renewals=0;propApplyRenewals=async()=>{renewals++};'); await authHook(c);
  const loading = c.run('loadPropData()');
  await c.run('onAuth("SIGNED_OUT",null)');
  await c.run('onAuth("SIGNED_IN",{user:{id:' + JSON.stringify(sameOwner ? 'owner' : 'next') + '}})');
  p.release({data:[{id:'late',user_id:'owner',events:[]}],count:1,error:null}); await loading;
  assert.equal(c.run('propAccounts.length'),0); assert.equal(c.run('propEntries.length'),0); assert.equal(c.run('renewals'),0);
});

for (const [name, expression] of [
  ['account save', 'propSaveAccount({id:"a",events:[],bought_on:"2026-10-01"})'],
  ['entry save', 'propSaveEntries([{id:"e",account_id:"a",kind:"purchase",amount:100,day:"2026-10-01"}])'],
  ['account delete', 'propDeleteAccount("a")'],
  ['entry delete', 'propDeleteEntry("e")'],
]) test('late ' + name + ' does not mutate the next owner cache', async () => {
  const c=setup(),p=pendingClient();c.sandbox.client=p.client;c.run('sb=client;');await authHook(c);
  const saving=c.run(expression);
  await c.run('onAuth("SIGNED_OUT",null)'); await c.run('onAuth("SIGNED_IN",{user:{id:"next"}})');
  c.run('propAccounts=[{id:"a",user_id:"next",nickname:"keep"}];propEntries=[{id:"e",user_id:"next",amount:999}];');
  p.release({error:null}); assert.equal(await saving,false);
  assert.equal(c.run('propAccounts[0].nickname'),'keep');assert.equal(c.run('propEntries[0].amount'),999);
});

test('late renewal response cannot append entries or start another account write for a new identity', async () => {
  const c=setup(),p=pendingClient();c.sandbox.client=p.client;c.run('sb=client;');await authHook(c);
  c.run('propAccounts=[{id:"a",user_id:"owner",monthly_fee:50}];propDueRenewals=()=>["2026-10-01"];var accountSaves=0;propSaveAccount=async()=>{accountSaves++};');
  const renewing=c.run('propApplyRenewals()');
  await c.run('onAuth("SIGNED_OUT",null)'); await c.run('onAuth("SIGNED_IN",{user:{id:"next"}})');
  p.release({error:null});await renewing;
  assert.equal(c.run('propEntries.length'),0);assert.equal(c.run('accountSaves'),0);
});

test('overlapping same-owner loads only publish and renew the latest result', async () => {
  const c=setup(), first=pendingClient(), second=pendingClient();c.sandbox.client=first.client;
  c.run('sb=client;var renewals=0;propApplyRenewals=async()=>{renewals++};');
  const old=c.run('loadPropData()'); first.client.from=second.client.from; const latest=c.run('loadPropData()');
  second.release({data:[{id:'latest',events:[]}],count:1,error:null});await latest;
  first.release({data:[{id:'older',events:[]}],count:1,error:null});await old;
  assert.equal(c.run('propAccounts[0].id'),'latest');assert.equal(c.run('renewals'),1);
});

test('an in-flight multi-delete cannot recreate an old-owner undo action after logout', async () => {
  const c=setup();c.run('sb={};');await authHook(c);
  let release; c.sandbox.pending=new Promise(r=>{release=r;});
  c.run('propAccounts=[{id:"a"},{id:"b"}];var calls=0,toasts=0;propDeleteAccount=async()=>++calls===1?true:pending;propToast=()=>{toasts++};');
  const deleting=c.run('propDeleteAccounts(["a","b"])');await new Promise(setImmediate);
  await c.run('onAuth("SIGNED_OUT",null)'); await c.run('onAuth("SIGNED_IN",{user:{id:"next"}})');
  release(false);await deleting;assert.equal(c.run('toasts'),0);
});

test('a captured account-delete undo cannot write its snapshot under another identity', async () => {
  const c=setup();c.run('sb={};');await authHook(c);
  c.run('propAccounts=[{id:"a"}];var captured,writes=0;propDeleteAccount=async()=>true;propToast=(_m,undo)=>{if(undo)captured=undo};propSaveAccount=async()=>{writes++;return true};propSaveEntries=async()=>{writes++;return true};');
  await c.run('propDeleteAccounts(["a"])');
  await c.run('onAuth("SIGNED_OUT",null)'); await c.run('onAuth("SIGNED_IN",{user:{id:"next"}})');
  await c.run('captured()');assert.equal(c.run('writes'),0);
});

test('direct A-to-B auth change clears private state and resets overview scopes on render', async () => {
  const c=setup();c.run('sb={};');await authHook(c);
  c.sandbox.document.documentElement.dataset.layout='modern';
  c.run('tab="prop";propView="overview";propOverviewBeforeRender();propMonthLines=true;propCompanySort="spent";propAccounts=[{id:"old"}];propEntries=[{id:"old-entry"}];');
  await c.run('onAuth("SIGNED_IN",{user:{id:"next"}})');
  assert.equal(c.run('propAccounts.length'),0);assert.equal(c.run('propEntries.length'),0);
  c.run('propOverviewBeforeRender()');assert.equal(c.run('propMonthLines'),false);assert.equal(c.run('propCompanySort'),'net');
});

test('same-owner token refresh permits an already started save and renewal to finish', async () => {
  for (const renewal of [false,true]) {
    const c=setup(),p=pendingClient();c.sandbox.client=p.client;c.run('sb=client;');await authHook(c);
    if (renewal) c.run('propAccounts=[{id:"a",user_id:"owner",monthly_fee:50}];propDueRenewals=()=>["2026-10-01"];var accountSaves=0;propSaveAccount=async()=>{accountSaves++};');
    const operation=c.run(renewal?'propApplyRenewals()':'propSaveAccount({id:"a",events:[],bought_on:"2026-10-01"})');
    await c.run('onAuth("TOKEN_REFRESHED",{user:{id:"owner"}})');p.release({error:null});
    const result=await operation;
    if (renewal) { assert.equal(c.run('accountSaves'),1);assert.equal(c.run('propEntries[0].user_id'),'owner'); }
    else { assert.equal(result,true);assert.equal(c.run('propAccounts[0].user_id'),'owner'); }
  }
});

test('late write completion is ignored when a legacy readonly viewing context changes', async () => {
  const c=setup(),p=pendingClient();c.sandbox.client=p.client;c.run('sb=client;');
  const operation=c.run('propSaveAccount({id:"a",events:[],bought_on:"2026-10-01"})');
  c.set('viewingUserId','readonly-context');p.release({error:null});
  assert.equal(await operation,false);assert.equal(c.run('propAccounts.length'),0);
});

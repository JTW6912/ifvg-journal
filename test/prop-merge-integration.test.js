const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeContext, ENGINE_FILES } = require('./load');
function setup() {
  const c = makeContext(ENGINE_FILES, { URL });
  c.sandbox.document.documentElement.dataset.layout = 'modern';
  c.set('session', { user: { id: 'owner' } }); c.set('currentProfile', { role: 'admin', active: true });
  c.set('authLoading', false); c.set('tab', 'prop'); c.set('propView', 'catalog');
  c.sandbox.document.querySelector = () => null;
  c.run('render=()=>{}; propRenderModal=()=>{};');
  return c;
}
function client(tables, errorTable) {
  return { from(table) {
    let start = 0, end = Infinity; const filters = [];
    const q = { select() { return q; }, order() { return q; }, eq(k,v) { filters.push(r => r[k]===v); return q; },
      limit(n) { end=n; return q; }, range(a,b) { start=a;end=b+1;return q; },
      then(resolve,reject) {
        const rows=(tables[table]||[]).filter(r => filters.every(f=>f(r)));
        return Promise.resolve(table===errorTable ? {error:{code:'42P01',message:'missing shared icon table'}} : {data:rows.slice(start,end),count:rows.length,error:null}).then(resolve,reject);
      } }; return q;
  } };
}

test('merge load keeps shared icons and malformed-history evidence in one successful cache refresh', async () => {
  const c=setup();
  const tables={ prop_firms:[{id:'f',name:'F',data:{keySentence:{text:'Important'},updatesPreviewCount:1}}],prop_plans:[],prop_catalog_imports:[],
    prop_option_icons:[{id:'platforms:shared',field:'platforms',option_key:'shared',label:'Shared',kind:'builtin',value:'globe',revision:1}],
    prop_accounts:[{id:'a',user_id:'owner',events:{bad:'preserve'},bought_on:'2026-10-01',renewing:false}],prop_entries:[] };
  c.sandbox.client=client(tables);c.run('sb=client; var renewals=0; propApplyRenewals=async()=>{renewals++};');
  await c.run('loadPropData()');
  assert.equal(c.run('propOptionIcons.length'),1);
  assert.equal(c.run('propFirms[0].keySentence.text'),'Important');
  assert.equal(c.run('propAccounts[0]._historyInvalidRoot'),true);
  assert.equal(c.run('propAccounts[0]._historyRawEvents.bad'),'preserve');
  assert.equal(c.run('renewals'),1);
});

test('merge missing icon migration reports outdated schema without half-loading accounts or invoking renewal writes', async () => {
  const c=setup();c.sandbox.console={...console,error(){}};
  c.set('propAccounts',[{id:'unchanged'}]);c.set('propOptionIcons',[{id:'unchanged-icon'}]);
  c.sandbox.client=client({},'prop_option_icons');c.run('sb=client;var renewals=0;propApplyRenewals=async()=>{renewals++};');
  await c.run('loadPropData()');
  assert.equal(c.run('dbOutdated'),true);assert.equal(c.run('propAccounts[0].id'),'unchanged');
  assert.equal(c.run('propOptionIcons[0].id'),'unchanged-icon');assert.equal(c.run('renewals'),0);
});

test('merge overview cleanup never erases a standalone firm draft or its choice/icon edits', () => {
  const c=setup();c.set('propFirms',[{id:'f',name:'F'}]);c.run('propOpenFirmEditor("f");propFirmEditor.draft.notes="Unsaved company note";propSetFirmChoice("platforms","Shared",true);');
  const before=c.run('propStableJson(propFirmEditor.draft)');
  c.run('propOverviewBeforeRender(); propOverviewAfterRender();');
  assert.equal(c.run('propStableJson(propFirmEditor.draft)'),before);
  assert.equal(c.run('propFirmEditorDirty()'),true);
  assert.equal(c.run('propOverviewCanInteract()'),false);
  c.run('propModal={type:"entry",draft:{amount:"123"}};propOverviewBeforeRender();');
  assert.equal(c.run('propModal.draft.amount'),'123');
  assert.equal(c.run('propStableJson(propFirmEditor.draft)'),before);
  c.set('session',{user:{id:'another-owner'}});c.run('propCheckFirmEditorSession();propOverviewBeforeRender();');
  assert.equal(c.run('propFirmEditor'),null);
});

test('merge entry and rendering seams retain both lifecycle families and both modal types', () => {
  const c=setup();
  const main=fs.readFileSync(path.join(__dirname,'../src/14-main-render.js'),'utf8');
  assert.match(main,/propCheckFirmEditorSession\(\);\s+propOverviewBeforeRender\(\);/);
  assert.match(main,/propRenderFirmEditor\(\);\s+propSyncReviewCards\(\);/);
  assert.match(main,/propOverviewAfterRender\(\);/);
  c.set('propFirms',[{id:'f',name:'F'}]);c.run('propOpenFirmEditor("f")');
  assert.match(c.run('renderProp()'),/propFirmEditorMount/);
  c.run('propFirmEditor=null;propModal={type:"admFirm",draft:propAdmFirmDraft(propFirms[0])}');
  assert.match(c.run('propModalHtml()'),/propFirmReview/);
  c.run('propModal={type:"history",mode:"list",listTab:"all",search:""}');
  assert.match(c.run('propModalHtml()'),/propHistoryModal/);
});

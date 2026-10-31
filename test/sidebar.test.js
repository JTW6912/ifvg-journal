const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {makeContext,ENGINE_FILES}=require('./load');
function setup(layout='glass',width=1440){
 const listeners=[];
 const doc={documentElement:{dataset:{},style:{getPropertyValue:()=>''}},activeElement:null,
  body:{style:{overflow:''},children:[],appendChild(){}},
  addEventListener:(type,fn,capture)=>listeners.push({type,fn,capture}),getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],
  createElement:()=>({style:{},dataset:{},addEventListener(){},classList:{add(){},remove(){}}})};
 const c=makeContext(ENGINE_FILES,{innerWidth:width,innerHeight:900,document:doc});
 c.listeners=listeners;
 c.run(`session={user:{id:'demo-sidebar-owner',email:'preview@example.invalid'}};currentProfile={active:true,role:'admin',display_name:'Demo'};authLoading=false;applyLayout('${layout}');tab='grid';`);
 return c;
}
const tabs=[{id:'grid',label:'Records',icon:'<svg></svg>'},{id:'analytics',label:'Analytics',icon:'<svg></svg>'},{id:'calendar',label:'Calendar',icon:'<svg></svg>'},{id:'reviews',label:'Reviews',icon:'<svg></svg>'},{id:'playbook',label:'Playbook',icon:'<svg></svg>'},{id:'prop',label:'Prop',icon:'<svg></svg>'},{id:'settings',label:'Settings',icon:'<svg></svg>'}];
test('sidebar respects a manual desktop choice instead of forcing the medium-width rail',()=>{
 const c=setup();
 for(const [pref,width,expected] of [[null,1440,false],[null,1050,true],[false,1050,false],[true,1440,true]]){
  c.sandbox.args=[pref,width];assert.equal(c.run('appSidebarResolveCollapsed(...args)'),expected);
 }
});
test('sidebar Dock keeps quick routes and indicates More for another active destination',()=>{
 const c=setup();c.sandbox.tabs=tabs;
 assert.deepEqual(Array.from(c.run('appSidebarDockTabs(tabs)'),x=>x.id),['grid','analytics','prop']);
 c.run('tab="settings"');assert.equal(c.run('appSidebarMoreActive(tabs)'),true);
 c.run('tab="grid"');assert.equal(c.run('appSidebarMoreActive(tabs)'),false);
});
test('sidebar preserves navigation actions and escapes labels without inventing admin entries',()=>{
 const c=setup();c.sandbox.tabs=[...tabs,{id:'unsafe',label:'<img onerror=alert(1)>',icon:'<svg></svg>'}];
 const html=c.run('appSidebarNavigationHtml(tabs)');
 assert.match(html,/data-action="switch-tab" data-tab="grid"/);assert.match(html,/aria-current="page"/);
 assert.match(html,/&lt;img onerror=alert\(1\)&gt;/);assert.doesNotMatch(html,/<img onerror|data-tab="admin"/);
});
test('classic header and navigation keep their pre-sidebar normalized markup',()=>{
 const c=setup('classic');
 // Time-dependent greeting is hidden in classic but still in markup. Freeze it;
 // the baseline below was captured from 1dee2c6's original renderer with this stub.
 c.run("greetingText=()=> 'Fixture greeting'");
 c.run(`userMenuOpen=true;var captured;patchAppShell=r=>{captured=r};headerStats=()=>({n:3,wr:.5,hasR:false});renderGrid=()=>'<p>fixture</p>';dataScopePillHtml=()=>'';accountRowsHtml=()=>'<span>Demo account</span>';effectiveCalColor=()=> '#123456';customCalColor=()=>null;
 propCheckFirmEditorSession=propOverviewBeforeRender=propOverviewAfterRender=propRenderFirmEditor=propSyncReviewCards=applyFocusHeight=renderModal=renderSecondaryModals=renderReviewEditor=renderExportCenter=renderAcctPop=()=>{};saveNav=()=>{};lastRenderedTab='grid';render();`);
 const expected={appHeader:'608a6e45b64eb1ba8ebd8da5da81fd66ce1c7fc85027897c46af5b1af140dead',appNav:'9a0d575aa3ef55354fa433863d4a086c17f2a39ce4b046227d2ef724ce169066'};
 for(const [key,hash] of Object.entries(expected))assert.equal(createHash('sha256').update(c.run('captured.'+key).replace(/>\s+</g,'><').trim()).digest('hex'),hash,key);
});

test('sidebar persistence accepts only explicit enum values',()=>{
 const c=setup();
 for(const value of ['__proto__','constructor','false','true','',null]){c.sandbox.value=value;assert.equal(c.run('appSidebarPreference(value)'),null);}
 assert.equal(c.run('appSidebarPreference("collapsed")'),true);assert.equal(c.run('appSidebarPreference("expanded")'),false);
});

test('collapse and summary toggles do not render the app, call the backend or mutate drafts',()=>{
 const c=setup();
 c.run('render=()=>{throw Error("full render forbidden")};sb={rpc(){throw Error("backend forbidden")}};propFirmEditor={draft:{notes:"keep"}};');
 c.run('appSidebarToggle();appSidebarToggleSummary()');
 assert.equal(c.run('appSidebar.preference'),true);assert.equal(c.run('appSidebar.summaryOpen'),false);
 assert.equal(c.run('localStorage.getItem("journal_sidebar")'),'collapsed');assert.equal(c.run('localStorage.getItem("journal_sidebar_summary")'),'closed');
 assert.equal(c.run('propFirmEditor.draft.notes'),'keep');
 c.sandbox.innerWidth=1050;c.run('appSidebarToggle()');assert.equal(c.run('appSidebarCollapsed()'),false);
 c.sandbox.innerWidth=1440;assert.equal(c.run('appSidebarCollapsed()'),false);
});

test('local storage failure does not prevent folding',()=>{
 const c=setup();c.sandbox.localStorage.setItem=()=>{throw Error('blocked')};
 c.run('appSidebarToggle()');assert.equal(c.run('appSidebarCollapsed()'),true);
});

test('modern and Glass share navigation markup without changing material identity',()=>{
 const results=[];
 for(const layout of ['modern','glass']){const c=setup(layout);c.sandbox.tabs=tabs;results.push(c.run('appSidebarNavHtml(tabs,"<div class=navFoot>summary</div>")'));assert.equal(c.run('currentLayout()'),layout);}
 assert.equal(results[0],results[1]);assert.match(results[0],/appSidebarHead/);assert.match(results[0],/appSidebarScroll/);assert.match(results[0],/appSidebarFoot/);
 assert.match(results[0],/aria-controls="appSidebarDesktopSummary"/);
});

function mobileHarness(){
 const c=setup('glass',390),doc=c.sandbox.document;
 const app={id:'app',tagName:'DIV',inert:false},alreadyInert={id:'other',tagName:'DIV',inert:true};
 const portal={id:'appSidebarDialogRoot',tagName:'DIV',inert:false,innerHTML:'',hidden:false};
 doc.body.children=[app,alreadyInert,portal];doc.getElementById=id=>id===portal.id?portal:null;
 c.run('appSidebar.model={tabs:[],summary:"private summary",owner:session.user.id};appSidebarRenderMobile=()=>{};appSidebarSyncDom=()=>{};propOverviewCleanup=()=>{};');
 return {c,doc,app,alreadyInert,portal};
}

test('mobile open/close restores prior inert and overflow state without remembering open state',()=>{
 const {c,doc,app,alreadyInert,portal}=mobileHarness();doc.body.style.overflow='auto';
 c.run('appSidebarOpenMobile({dataset:{sidebarLaunch:"dock"}})');
 assert.equal(app.inert,true);assert.equal(portal.inert,false);assert.equal(doc.body.style.overflow,'hidden');
 c.run('appSidebarCloseMobile(false)');
 assert.equal(app.inert,false);assert.equal(alreadyInert.inert,true);assert.equal(doc.body.style.overflow,'auto');assert.equal(portal.hidden,true);
 assert.equal(c.run('localStorage.getItem("journal_sidebar_mobile")'),null);
});

test('mobile sidebar refuses stale owner, disabled user, loading and existing editor overlays',()=>{
 for(const guard of ['appSidebar.model.owner="another"','currentProfile.active=false','currentProfile.id="another"','authLoading=true','editingTrade={id:"draft"}','editingReview={id:"draft"}','propModal={type:"history"}']){
  const {c,app}=mobileHarness();c.run(guard+';appSidebarOpenMobile()');assert.equal(c.run('appSidebar.mobileOpen'),false,guard);assert.equal(app.inert,false);
 }
});

test('session reset releases mobile lock and clears private summaries and account menus, not device preferences',()=>{
 const {c,app}=mobileHarness();c.run('appSidebar.preference=true;appSidebarOpenMobile();userMenuOpen=true;appSidebar.accountHTML="private";appSidebarResetSession()');
 assert.equal(c.run('appSidebar.mobileOpen'),false);assert.equal(app.inert,false);assert.equal(c.run('appSidebar.model'),null);assert.equal(c.run('appSidebar.accountHTML'),'');
 assert.equal(c.run('userMenuOpen'),false);assert.equal(c.run('appSidebar.preference'),true);
});

test('sidebar navigation releases inert before the existing dirty-company capture guard',()=>{
 const {c,app}=mobileHarness();
 c.run('sb={};propFirms=[{id:"f",name:"F"}];render=()=>{};propRenderFirmEditor=()=>{};propOpenFirmEditor("f");propFirmEditor.draft.notes="keep dirty";appSidebarOpenMobile();');
 const capture=c.listeners.filter(l=>l.type==='click'&&l.capture);
 const side=capture.findIndex(l=>l.fn.toString().includes('const wasMobile'));
 const editor=capture.findIndex(l=>l.fn.toString().includes('const leaves'));assert.ok(side>=0&&side<editor);
 const el={dataset:{action:'switch-tab',tab:'analytics'},closest:selector=>selector==='[data-action]'?el:selector.startsWith('#appNav,')?{}:null};
 let prevented=false,stopped=false;const e={target:el,preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}};
 capture[side].fn(e);assert.equal(app.inert,false);assert.equal(stopped,false);assert.equal(prevented,false);
 capture[editor].fn(e);assert.equal(stopped,true);assert.equal(prevented,true);
 assert.equal(c.run('propFirmEditor.draft.notes'),'keep dirty');assert.equal(c.run('!!propFirmEditor.pendingLeave'),true);assert.equal(c.run('tab'),'prop');
});

test('Tab traps the mobile dialog and account popup while Ctrl+B and composing Escape remain untouched',()=>{
 const c=setup('glass',390),doc=c.sandbox.document;
 const first={getClientRects:()=>[1],focus(){doc.activeElement=this}},last={getClientRects:()=>[1],focus(){doc.activeElement=this}};
 doc.getElementById=id=>id==='appSidebarMobilePanel'?{querySelectorAll:()=>[first,last]}:null;
 c.run('appSidebar.mobileOpen=true');
 let prevented=0,stopped=0;const e={key:'Tab',preventDefault(){prevented++},stopImmediatePropagation(){stopped++}};
 doc.activeElement=last;c.sandbox.event=e;c.run('appSidebarKeydown(event)');assert.equal(doc.activeElement,first);
 e.shiftKey=true;c.run('appSidebarKeydown(event)');assert.equal(doc.activeElement,last);
 e.key='b';e.ctrlKey=true;c.run('appSidebarKeydown(event)');assert.equal(prevented,2);
 e.key='Escape';e.isComposing=true;c.run('appSidebarKeydown(event)');assert.equal(stopped,0);assert.equal(c.run('appSidebar.mobileOpen'),true);
});

test('Escape closes account popup before closing its mobile sidebar',()=>{
 const {c}=mobileHarness();c.run('appSidebarOpenMobile();userMenuOpen=true;appSidebar.accountHTML="menu";');
 const e={key:'Escape',preventDefault(){},stopImmediatePropagation(){}};c.sandbox.event=e;
 c.run('appSidebarKeydown(event)');assert.equal(c.run('userMenuOpen'),false);assert.equal(c.run('appSidebar.mobileOpen'),true);
 c.run('appSidebarKeydown(event)');assert.equal(c.run('appSidebar.mobileOpen'),false);
});

test('Glass animation ignores hidden desktop/mobile duplicates',()=>{
 const c=setup(),hidden={getClientRects:()=>[]},visible={getClientRects:()=>[1]};
 c.sandbox.group={querySelectorAll:()=>[hidden,visible]};assert.equal(c.run('lgVisibleActive(group)'),visible);
});

test('sidebar strings are provided in both languages and user identity is escaped',()=>{
 const c=setup();for(const lang of ['zh','en']){c.set('lang',lang);for(const key of ['navigation','workspace','expand','collapse','close','summary','account','quick','more','moreCurrent']){c.sandbox.key='sidebar.'+key;assert.notEqual(c.run('T(key)'),c.sandbox.key);}}
 c.run('currentProfile.display_name="<img onerror=alert(1)>"');c.sandbox.tabs=tabs;
 const html=c.run('appSidebarNavHtml(tabs,"")');assert.doesNotMatch(html,/<img onerror/);assert.match(html,/&lt;img onerror/);
});

test('account focus waits until the original click handler has opened the popup',()=>{
 const c=setup(),queue=[];c.sandbox.setTimeout=fn=>{queue.push(fn);return queue.length};
 let focused=false;const first={getClientRects:()=>[1],focus(){focused=true}};
 c.sandbox.document.getElementById=id=>id==='appSidebarAccountRoot'?{querySelectorAll:()=>[first]}:null;
 const handler=c.listeners.find(l=>l.type==='click'&&!l.capture&&l.fn.toString().includes("a === 'sidebar-toggle'"));
 const el={dataset:{action:'toggle-user-menu'},hasAttribute:()=>true,closest:()=>el};
 handler.fn({target:el});assert.equal(focused,false);assert.equal(queue.length,1);
 c.run('userMenuOpen=true');queue[0]();assert.equal(focused,true);
});

test('deferred focus cannot survive logout/relogin to the same identity',()=>{
 const c=setup(),queue=[];c.sandbox.setTimeout=fn=>{queue.push(fn);return queue.length};
 c.run('var lateFocus=0;appSidebarAfterClick(()=>{lateFocus++});appSidebarResetSession()');
 queue.forEach(fn=>fn());assert.equal(c.run('lateFocus'),0);
});

test('mobile navigation focuses content when the desktop page title is hidden',()=>{
 const {c,doc,portal}=mobileHarness(),queue=[];c.sandbox.setTimeout=fn=>{queue.push(fn);return queue.length};
 let focused=false;const content={focus(){focused=true}},heading={getClientRects:()=>[]};
 doc.querySelector=sel=>sel==='.pageTitle'?heading:null;doc.getElementById=id=>id==='tabBody'?content:id===portal.id?portal:null;
 c.run('appSidebarOpenMobile()');
 const handler=c.listeners.find(l=>l.type==='click'&&l.capture&&l.fn.toString().includes('const wasMobile'));
 const el={dataset:{action:'switch-tab',tab:'analytics'},closest:selector=>selector==='[data-action]'?el:selector.startsWith('#appNav,')?{}:null};
 handler.fn({target:el});assert.equal(focused,false);c.run('tab="analytics"');queue.forEach(fn=>fn());
 assert.equal(focused,true);assert.equal(content.tabIndex,-1);
});

test('mobile account popup traps focus in the visible popup instead of covered navigation',()=>{
 const c=setup('glass',390),doc=c.sandbox.document;
 const first={getClientRects:()=>[1],focus(){doc.activeElement=this}},last={getClientRects:()=>[1],focus(){doc.activeElement=this}};
 const covered={getClientRects:()=>[1],focus(){throw Error('covered navigation focused')}};
 doc.getElementById=id=>({querySelectorAll:()=>id==='appSidebarAccountRoot'?[first,last]:[covered]});
 c.run('appSidebar.mobileOpen=true;appSidebar.accountHTML="menu"');doc.activeElement=last;
 c.sandbox.event={key:'Tab',preventDefault(){}};c.run('appSidebarKeydown(event)');assert.equal(doc.activeElement,first);
});

test('an account popup cannot silently reopen after its anchor disappears at a breakpoint',()=>{
 const c=setup();c.run('userMenuOpen=true;appSidebar.accountHTML="old popup";appSidebarRenderAccount()');
 assert.equal(c.run('userMenuOpen'),false);assert.equal(c.run('appSidebar.accountHTML'),'');
});

test('automatic rail breakpoint closes the popup before the animated width changes',()=>{
 const c=setup('glass',1050);c.sandbox.document.documentElement.dataset.sidebarState='expanded';
 c.run('userMenuOpen=true;appSidebar.preference=null;render=()=>{throw Error("full render forbidden")};appSidebarResize()');
 assert.equal(c.run('userMenuOpen'),false);assert.equal(c.sandbox.document.documentElement.dataset.sidebarState,'collapsed');
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { makeContext, ENGINE_FILES } = require('./load');

function setup(modern = true) {
  const c = makeContext(ENGINE_FILES);
  c.run(`lang='zh'; session={user:{id:'synthetic-owner'}}; currentProfile={active:true}; authLoading=false; tab='prop'; propView='overview'; document.documentElement.dataset.layout='${modern ? 'modern' : 'classic'}'; todayStr=()=> '2026-10-28';`);
  const accounts = [
    { id:'a', firm_name:'Alpha', firm_id:'alpha', status:'funded', bought_on:'2026-09-02', events:[{to:'passed',day:'2026-10-05'},{to:'passed',day:'2026-10-06'},{to:'funded',day:'2026-10-07'}] },
    { id:'b', firm_name:'Beta', status:'eval', bought_on:'2026-10-01', events:[{to:'failed',day:'2026-10-02'},{to:'failed',day:'2026-10-03'}] },
    { id:'c', firm_name:'Alpha', status:'closed', bought_on:'2026-09-02', events:[] },
    { id:'d', firm_name:'Gamma', status:'eval', bought_on:'2026-10-01', events:[] },
  ];
  const entries = [
    {account_id:'a',kind:'purchase',amount:80,day:'2026-09-02'},
    {account_id:'a',kind:'activation',amount:100,day:'2026-10-07'},
    {account_id:'a',kind:'payout',amount:300,day:'2026-10-09'},
    {account_id:'a',kind:'payout',amount:900,pending:true,day:'2026-10-10'},
    {account_id:'b',kind:'purchase',amount:100,day:'2026-10-01'},
    {account_id:'b',kind:'reset',amount:20,day:'2026-10-03'},
    {account_id:'d',kind:'refund',amount:40,day:'2026-10-08'},
  ];
  c.set('propAccounts',accounts); c.set('propEntries',entries);
  c.set('propFirms',[{id:'alpha',name:'Alpha',logo:'img/prop/topstep.webp'}]);
  c.run(`propOverviewRange={preset:'custom',from:'2026-10-01',to:'2026-10-31'};`);
  return c;
}
const json = (c, code) => JSON.parse(c.run(`JSON.stringify(${code})`));
function output(c, ranged=true) { return c.run(ranged ? `(()=>{const {accounts,entries}=propScoped();const r=propLinkageReport(accounts,entries,propOverviewRange,todayStr());return renderPropByFirm(accounts,r.entries,r.range,entries)})()` : 'renderPropByFirm(propAccounts,propEntries)'); }
function cells(html) { return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].slice(1).map(m=>[...m[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/g)].map(x=>x[1].replace(/<span class="propCompanyInitials"[^>]*>[\s\S]*?<\/span>/g,'').replace(/<[^>]+>/g,'').trim())); }

test('classic company renderer remains byte-identical in zh/en',()=>{
 const c=setup(false); const hashes=[];
 for(const language of ['zh','en']) {c.set('lang',language); hashes.push(createHash('sha256').update(output(c,false)).digest('hex'));}
 assert.deepEqual(hashes, CLASSIC_HASHES);
});

test('modern seven values exactly match old renderer at the same scoped range',()=>{
 const c=setup(false), before=JSON.stringify(json(c,'[propAccounts,propEntries]'));
 for(const range of [{preset:'all'}, {preset:'custom',from:'2026-10-01',to:'2026-10-31'}, {preset:'custom',from:'2027-01-01',to:'2027-01-31'}]) {
  c.set('propOverviewRange',range);
  for(const language of ['zh','en']) {
   c.set('lang',language); c.run(`document.documentElement.dataset.layout='classic'`); const old=cells(output(c));
   c.run(`document.documentElement.dataset.layout='modern'`); const html=output(c);
   assert.match(html,/id="propCompanyPanel"/); assert.deepEqual(cells(html),old);
   assert.equal((html.match(/data-prop-company-tip=/g)||[]).length,6); assert.equal((html.match(/<th scope="col"/g)||[]).length,7);
  }
 }
 assert.equal(JSON.stringify(json(c,'[propAccounts,propEntries]')),before);
});

test('grouping, current counts, filtered single company and hidden empty behavior stay unchanged',()=>{
 const c=setup(); c.run(`propFirmFilter='Alpha'`); let html=output(c);
 assert.match(html,/id="propCompanySort"[^>]*disabled/); assert.deepEqual(cells(html).map(r=>r[1]),['2']);
 c.run(`propAccounts=propAccounts.filter(a=>a.firm_name==='Alpha');propFirmFilter=''`); assert.equal(output(c),'');
 c.run(`propAccounts=[]`); assert.equal(output(c),'');
 c.run(`propFirmFilter='Alpha'`); assert.equal(cells(output(c)).length,0);
});

test('sort copies rows, keeps unknown last and ties stable with invalid-key fallback',()=>{
 const c=setup(); const rows=[{name:'a',s:{net:1,spent:2,received:3,roi:null}},{name:'b',s:{net:1,spent:1,received:2,roi:-5}},{name:'c',s:{net:-2,spent:1,received:0,roi:-5}},{name:'d',s:{net:0,spent:0,received:0,roi:0}}];
 c.sandbox.rows=rows; const before=JSON.stringify(rows);
 assert.deepEqual(json(c,`propCompanySorted(rows,'roi').map(r=>r.name)`),['d','b','c','a']);
 assert.deepEqual(json(c,`propCompanySorted(rows,'net').map(r=>r.name)`),['a','b','d','c']);
 assert.deepEqual(json(c,`propCompanySorted(rows,'spent').map(r=>r.name)`),['a','b','c','d']);
 assert.deepEqual(json(c,`propCompanySorted(rows,'received').map(r=>r.name)`),['a','b','c','d']);
 assert.deepEqual(json(c,`propCompanySorted(rows,'__proto__').map(r=>r.name)`),['a','b','d','c']);
 assert.equal(JSON.stringify(rows),before);
});

test('symmetric net geometry uses one finite common scale independent of sort',()=>{
 const c=setup(); assert.deepEqual(json(c,`[-120,0,240].map(n=>propCompanyBar(n,240))`),[{tone:'neg',width:25},{tone:'neutral',width:0},{tone:'pos',width:50}]);
 for(const input of ['NaN','Infinity',`'\" onmouseover=\"bad'`,'null','undefined']) assert.equal(c.run(`propCompanyBar(${input},240).width`),0);
 assert.equal(c.run('propCompanyBar(1,0).width'),0); assert.equal(c.run('propCompanyBar(1,Infinity).width'),0);
 assert.equal(c.run('propCompanyBar(1e300,1e300).width'),50);
 const html=output(c); const scale=[...html.matchAll(/data-scale="([^"]+)"/g)].map(x=>x[1]); assert.equal(new Set(scale).size,1);
 c.run(`propCompanySort='roi'`); assert.deepEqual([...output(c).matchAll(/data-scale="([^"]+)"/g)].map(x=>x[1]),scale);
});

test('actual stats retain pending/refund and dated failed-attempt semantics',()=>{
 const c=setup(); const rows=cells(output(c));
 assert.deepEqual(rows,[['Alpha','2','100%','$100','$300','+$200','+200.0%'],['Gamma','1','—','−$40','$0','+$40','—'],['Beta','1','0%','$120','$0','−$120','-100.0%']]);
 const html=output(c); assert.match(html,/data-pass="0"/); assert.match(html,/data-pass=""/);
 c.run(`propOverviewRange={preset:'custom',from:'2026-10-10',to:'2026-10-10'}`);
 assert.ok(cells(output(c)).every(r=>r.slice(3).join('|')==='$0|$0|$0|—'));
});

test('logos use safe local assets and never invent identity for mixed stored names',()=>{
 const c=setup(); assert.equal(c.run(`propCompanyLogo('Alpha',propAccounts,propFirms)`),'img/prop/topstep.webp');
 for(const logo of ['javascript:alert(1)','//evil.invalid/a.svg','https://evil.invalid/a.png','img/prop/../evil.svg','img/prop/a.svg?x=1','data:image/svg+xml,x','img/prop/a.png\" onerror=\"x']) { c.set('propFirms',[{id:'alpha',name:'Alpha',logo}]); assert.equal(c.run(`propCompanyLogo('Alpha',propAccounts,propFirms)`),''); }
 c.set('propFirms',[{id:'alpha',name:'renamed',logo:'/img/prop/topstep.webp'},{id:'other',name:'Alpha',logo:'img/prop/lucid.webp'}]);
 assert.equal(c.run(`propCompanyLogo('Alpha',propAccounts,propFirms)`),'/img/prop/topstep.webp');
 c.run(`propAccounts[2].firm_id='other'`); assert.equal(c.run(`propCompanyLogo('Alpha',propAccounts,propFirms)`),'');
});

test('company names and hints are escaped, nonfinite CSS cannot be emitted',()=>{
 const c=setup(); c.run(`propAccounts[0].firm_name='<img src=x onerror=bad>\"';propAccounts[2].firm_name=propAccounts[0].firm_name;propFirms=[]`);
 const html=output(c); assert.ok(!html.includes('<img src=x')); assert.match(html,/&lt;img/); assert.ok(!html.includes('onclick=')); assert.ok(!/width:(NaN|Infinity)/.test(html));
 assert.equal(c.run(`propCompanyHelpField({dataset:{propCompanyTip:'__proto__'}})`),null);
 assert.equal(c.run(`propCompanyHelpField({dataset:{propCompanyTip:'net'}})`),'company-net');
 assert.equal(c.run(`propOverviewHelpField({dataset:{propOverviewTip:'net'}})`),'net');
 assert.equal(c.run(`propOverviewHelpField({dataset:{propMonthTip:'recovery'}})`),'recovery');
});

test('sort retains in-view redraw and resets at identity/layout/overview exit without touching drafts',()=>{
 const c=setup();c.run(`propCompanyBeforeRender('owner');propCompanySort='roi';propMonthLines=true;propModal={type:'account',draft:{nickname:'unsaved'},busy:true}`);
 c.run(`propOverviewRange={preset:'all'};propFirmFilter='Alpha';lang='en';propCompanyBeforeRender('owner')`);
 assert.equal(c.run('propCompanySort'),'roi');assert.equal(c.run('propModal.draft.nickname'),'unsaved');assert.equal(c.run('propMonthLines'),true);
 for(const change of [`propCompanyBeforeRender('other')`,`tab='grid';propCompanyBeforeRender('owner')`,`propView='accounts';propCompanyBeforeRender('owner')`,`document.documentElement.dataset.layout='classic';propCompanyBeforeRender('owner')`,`propCompanyBeforeRender(null)`]) {c.run(`tab='prop';propView='overview';document.documentElement.dataset.layout='modern';propCompanySort='spent';${change}`);assert.equal(c.run('propCompanySort'),'net');}
});

test('local sorting rejects modal/loading/picker and invalid values without rendering or persistence',()=>{
 const c=setup(); c.run(`render=()=>{throw Error('whole render forbidden')};localStorage.setItem=()=>{throw Error('storage forbidden')};propCompanySort='net'`);
 for(const state of [`propModal={busy:true}`,`authLoading=true`,`propOverviewPicker={}`,`currentProfile.active=false`]) {c.run(`propModal=null;authLoading=false;propOverviewPicker=null;currentProfile.active=true;${state};propCompanyChangeSort('roi')`);assert.equal(c.run('propCompanySort'),'net');}
 c.run(`propModal=null;authLoading=false;propOverviewPicker=null;currentProfile.active=true;propCompanyChangeSort('__proto__')`);assert.equal(c.run('propCompanySort'),'net');
});

test('accepted local sort reuses DOM rows, retains scroll and stable ties across repeated choices',()=>{
 const c=setup(); const rows=[
  {dataset:{companyIndex:'0',companyNet:'30',companySpent:'10',companyReceived:'40',companyRoi:'300'}},
  {dataset:{companyIndex:'1',companyNet:'20',companySpent:'50',companyReceived:'70',companyRoi:'140'}},
  {dataset:{companyIndex:'2',companyNet:'10',companySpent:'0',companyReceived:'10',companyRoi:''}},
 ];
 const body={children:rows.slice(),appendChild(node){this.children=this.children.filter(n=>n!==node);this.children.push(node);}};
 const headings=['net','spent','received','roi'].map(key=>({dataset:{companyColumn:key},attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}}));
 const select={disabled:false,value:'net'},wrap={scrollLeft:123};
 const panel={querySelector:()=>body,querySelectorAll:()=>headings};
 c.sandbox.document.getElementById=id=>({propCompanyPanel:panel,propCompanySort:select,propCompanyScroll:wrap})[id]||null;
 c.sandbox.document.activeElement=select;
 c.run(`render=()=>{throw Error('whole render forbidden')};localStorage.setItem=()=>{throw Error('storage forbidden')}`);
 for(const key of ['roi','spent','received','net']){
  c.run(`propCompanyChangeSort('${key}')`);
  assert.deepEqual(body.children,['spent','received'].includes(key)?[rows[1],rows[0],rows[2]]:rows);assert.equal(wrap.scrollLeft,123);assert.equal(select.value,key);
  assert.equal(c.sandbox.document.activeElement,select);assert.equal(headings.filter(h=>h.attrs['aria-sort']==='descending')[0].dataset.companyColumn,key);
 }
 // Starting DOM order differs; equal ROI rows still follow the original stable index.
 rows[0].dataset.companyRoi='140';body.children.reverse();c.run(`propCompanyChangeSort('roi')`);assert.deepEqual(body.children,rows);
});

test('company help reveals behind sticky column and closes when horizontally clipped',()=>{
 const c=setup();const wrap={scrollLeft:100,getBoundingClientRect:()=>({left:30,right:350}),querySelector:()=>first};
 const first={getBoundingClientRect:()=>({right:184})};
 const button={closest:()=>wrap,getBoundingClientRect:()=>({left:270-wrap.scrollLeft,right:314-wrap.scrollLeft})};
 c.sandbox.window.innerWidth=390;c.sandbox.window.getComputedStyle=()=>({position:'sticky'});c.sandbox.button=button;
 assert.equal(c.run('propCompanyHelpVisible(button)'),false);c.run('propCompanyRevealHelp(button)');assert.equal(wrap.scrollLeft,82);assert.equal(c.run('propCompanyHelpVisible(button)'),true);
 wrap.scrollLeft=0;c.run('propCompanyRevealHelp(button)');assert.equal(wrap.scrollLeft,0);
 button.getBoundingClientRect=()=>({left:530-wrap.scrollLeft,right:574-wrap.scrollLeft});
 c.run('propCompanyRevealHelp(button)');assert.equal(wrap.scrollLeft,228);assert.equal(c.run('propCompanyHelpVisible(button)'),true);
 assert.equal(c.run('propCompanyHelpVisible(null)'),true);c.run('propCompanyRevealHelp(null)');
});

test('company help resolves translated plain text without hijacking overview or monthly fields',()=>{
 const c=setup();const button={};c.sandbox.document.getElementById=id=>id==='propCompanyHelp-net'?button:null;
 for(const language of ['zh','en']){c.set('lang',language);for(const field of ['n','pass','spent','received','net','roi'])assert.ok(!c.run(`propCompanyHelpText('company-${field}')`).startsWith('prop.company.'));}
 assert.equal(c.run(`propOverviewHelpButton('company-net')`),button);
 for(const key of ['net','recovery','company-__proto__','company-','other-company-net'])assert.equal(c.run(`propCompanyHelpText('${key}')`),null);
});

test('all existing company and group filters preserve seven values across range changes',()=>{
 const c=setup();c.run(`propAccounts.forEach((a,i)=>a.group_name=i%2?'A':'B')`);
 for(const company of ['', 'Alpha', 'Beta'])for(const group of ['', 'A', 'B'])for(const ranged of [true,false]){
  c.set('propFirmFilter',company);c.set('propGroupFilter',group);
  const expr=`(()=>{const {accounts,entries}=propScoped();const r=propLinkageReport(accounts,entries,propOverviewRange,todayStr());return renderPropByFirm(accounts,${ranged?'r.entries,r.range,entries':'entries'})})()`;
  // Compare period values; classic all-time intentionally retains its legacy in-progress label.
  c.run(`document.documentElement.dataset.layout='classic'`);const old=cells(c.run(expr));
  c.run(`document.documentElement.dataset.layout='modern'`);const next=cells(c.run(expr));
  assert.deepEqual(next.map(r=>r.slice(0,6)),old.map(r=>r.slice(0,6)));
  if(ranged)assert.deepEqual(next,old);
 }
});

// Captured from the unchanged renderer at 727962c before implementing the new seam.
const CLASSIC_HASHES = ['485e508f4c007a23c4d557f17d5d4a2e7428a415a9682e5c4e466cbeedbdc130', 'f25d1884f30d366fc8684787b2cf6a8bc517d2e1fda3515f360c159ed881d8b2'];

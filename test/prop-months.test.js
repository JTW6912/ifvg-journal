const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { makeContext, ENGINE_FILES } = require('./load');

function setup(modern = true) {
  const c = makeContext(ENGINE_FILES);
  if (modern) c.sandbox.document.documentElement.dataset.layout = 'modern';
  c.set('lang', 'zh');
  c.set('propAccounts', [{id:'a',firm_name:'Demo',plan_name:'Standard',status:'eval'}, {id:'b',firm_name:'Demo',plan_name:'Standard',status:'funded'}]);
  c.set('propEntries', [['purchase',80,'2025-12-02'],['purchase',100,'2026-01-03'],['payout',250,'2026-03-04'],['refund',40,'2026-04-02'],['purchase',25,'2026-10-04'],['payout',75,'2026-10-05',true],['purchase',25,'2026-10-04',false,'b']].map(([kind,amount,day,pending=false,account_id='a'],i)=>({id:'e'+i,kind,amount,day,pending,account_id})));
  c.run("propYear=2026;propMonth=10;propYearTouched=true;session={user:{id:'owner'}};tab='prop';propView='overview';authLoading=false;");
  return c;
}
const html = c => c.run('renderPropMonths(propAccounts,propEntries,{preset:"all",from:null,to:null})');
const plain = (c, expression) => JSON.parse(JSON.stringify(c.run(expression)));

test('classic monthly chart, summary and ledger stay byte-identical in both languages', () => {
  const c=setup(false);
  // Captured from a7b2def before implementation using the exact fixture above.
  const hashes={zh:'479bc41012f5edbf0f97db2a33c174e6daceb83e25a9c6fdfaf34021abc0b1a7',en:'a2ce4a6639a047384ea1ddc767227a4fe4dc9f214c32da214caaf874b5ad6017'};
  for(const lang of ['zh','en']){c.set('lang',lang);assert.equal(createHash('sha256').update(c.run('renderPropMonths(propAccounts,propEntries)')).digest('hex'),hashes[lang]);}
});

test('modern defaults to original bars with an accessible default-off toggle', () => {
  const c=setup(), h=html(c);
  assert.equal(c.run('propMonthLines'),false);
  assert.match(h,/id="propMonthLinesToggle"[^>]*aria-pressed="false"/);
  assert.equal((h.match(/data-action="prop-month"/g)||[]).length,12);
  assert.doesNotMatch(h,/propMonthsLinesOn/);
  assert.match(h,/class="up"><i style="height:100%"/);
  c.run('propMonthLines=true');const on=html(c);
  assert.match(on,/propMonthsLinesOn/);assert.match(on,/aria-pressed="true"/);
  assert.match(on,/propMonthsLegend/);
  assert.equal((on.match(/class="propMoBars"/g)||[]).length,12);
});

test('recovery uses whole reporting range, not displayed year or ROI; cap stays 100%', () => {
  const c=setup(), h=html(c);
  assert.match(h,/投入回收率/);assert.match(h,/132%/);
  assert.match(h,/data-prop-month-tip="recovery"/);
  assert.match(h,/净投入 \$190/);assert.match(h,/到账 \$250/);
  assert.match(h,/class="propMoBackBar"[^>]*aria-valuenow="100"/);
  assert.doesNotMatch(h,/已回本|prop.mo\.|prop.monthly\./);
  c.set('propEntries',[{account_id:'a',kind:'refund',amount:50,day:'2026-10-01'}]);
  assert.doesNotMatch(html(c),/data-prop-month-tip="recovery"|NaN|Infinity/);
});

test('month header and native grouping/detail entries retain totals and escaping', () => {
  const c=setup(), h=html(c);
  assert.match(h,/propMonthsHeading/);assert.match(h,/propMonthsMetrics/);
  assert.ok(h.indexOf('propMonthsHeading')<h.indexOf('propMonthsMetrics'));
  assert.match(h,/2026年10月/);assert.match(h,/10\/01 – 10\/31/);
  assert.match(h,/data-month-amount="spent">\$50/);
  assert.match(h,/data-month-amount="received">\$0/);
  assert.match(h,/data-month-amount="net">−\$50/);
  assert.match(h,/<details class="propLedRow propLedGroup">/);
  assert.equal((h.match(/data-action="prop-open-detail"/g)||[]).length,3);
  assert.match(h,/待到账/);
  c.run(`propAccounts[0].nickname='<img src=x onerror=alert(1)>'`);
  assert.doesNotMatch(html(c),/<img src=x/);
  assert.match(html(c),/&lt;img src=x/);
});

test('all seven kinds have static SVGs and unknown kinds cannot inject markup', () => {
  const c=setup();
  for(const name of ['purchase','monthly','reset','activation','payout','refund','other','constructor','<script>']) {
    c.set('__name',name);const svg=c.run('propMonthsIcon(__name)');
    assert.match(svg,/<svg[^>]*aria-hidden="true"/);assert.doesNotMatch(svg,/<script>|🛒|native code/);
  }
});

test('line eligibility excludes range gaps and unrecorded future months, not in-range zeros', () => {
  const c=setup();c.run('globalThis.__months=propMonthly(propEntries,2026)');
  assert.deepEqual(plain(c,`propMonthsLineMask(__months,2026,{preset:'all'},'2026-10-26')`),[true,true,true,true,true,true,true,true,true,true,false,false]);
  assert.deepEqual(plain(c,`propMonthsLineMask(__months,2026,{preset:'custom',from:'2026-07-13',to:'2026-09-06'},'2026-10-26')`),[false,false,false,false,false,false,true,true,true,false,false,false]);
  c.run('__months[11].n=1;__months[11].spent=10');
  assert.equal(c.run(`propMonthsLineMask(__months,2026,{preset:'all'},'2026-10-26')[11]`),true);
  assert.ok(plain(c,`propMonthsLineMask(propMonthly([],2027),2027,{preset:'all'},'2026-10-26')`).every(v=>!v));
  assert.equal(c.run(`propMonthsLineMask(propMonthly([{kind:'payout',amount:80,pending:true,day:'2026-12-01'}],2026),2026,{preset:'all'},'2026-10-26')[11]`),false);
  assert.deepEqual(plain(c,`propMonthsLineMask(__months,2026,{preset:'custom',from:'2025-12-15',to:'2026-02-05'},'2026-10-26')`),[true,true,false,false,false,false,false,false,false,false,false,false]);
});

test('overlay geometry emits exactly two series, no smoothing, no segment across a gap', () => {
  const c=setup();
  c.set('__points',[{month:1,received:{x:10,y:20},invested:{x:10,y:70}},{month:2,received:{x:40,y:30},invested:{x:40,y:40}},{month:4,received:{x:90,y:10},invested:{x:90,y:50}}]);
  const out=c.run('propMonthsSeries(__points)');
  assert.equal((out.match(/data-series=/g)||[]).length,2);
  assert.equal((out.match(/<line /g)||[]).length,2);
  assert.equal((out.match(/<circle /g)||[]).length,6);
  assert.match(out,/<line x1="10" y1="20" x2="40" y2="30"/);
  assert.match(out,/<line x1="10" y1="70" x2="40" y2="40"/);
  assert.doesNotMatch(out,/<line[^>]*x1="40"[^>]*x2="90"/);
  assert.doesNotMatch(out,/<path|NaN|Infinity/);
  c.run('__points[0].received.x=NaN');assert.doesNotMatch(c.run('propMonthsSeries(__points)'),/NaN/);
});

test('partial dates, refunds and pending remain derived from unchanged monthly helper', () => {
  const c=setup();c.set('propEntries',[{account_id:'a',kind:'refund',amount:20,day:'2026-10-10'},{account_id:'a',kind:'payout',amount:80,day:'2026-10-10',pending:true}]);
  const before=c.run('JSON.stringify(propEntries)');
  const h=c.run(`renderPropMonths(propAccounts,propEntries,{preset:'custom',from:'2026-10-09',to:'2026-10-12'})`);
  assert.match(h,/10\/09 – 10\/12/);assert.match(h,/propMoRefund/);
  assert.match(h,/data-month-amount="spent">−\$20/);assert.match(h,/data-month-amount="received">\$0/);
  assert.equal(c.run('JSON.stringify(propEntries)'),before);
});

test('monthly state persists only within the same modern overview and protects drafts', () => {
  const c=setup();c.run(`propOverviewBeforeRender();propMonthLines=true;propMonth=3;propOverviewRange={preset:'last7'};propOverviewBeforeRender()`);
  assert.equal(c.run('propMonthLines'),true);
  c.run(`propModal={type:'entry',draft:{amount:'123'}};propOverviewBeforeRender()`);
  assert.equal(c.run('propMonthLines'),true);assert.equal(c.run('propModal.draft.amount'),'123');
  c.run(`propModal=null;session={user:{id:'other'}};propOverviewBeforeRender()`);assert.equal(c.run('propMonthLines'),false);
  c.run(`propMonthLines=true;propView='accounts';propOverviewBeforeRender()`);assert.equal(c.run('propMonthLines'),false);
  c.run(`propView='overview';propMonthLines=true`);delete c.sandbox.document.documentElement.dataset.layout;c.run('propOverviewBeforeRender()');assert.equal(c.run('propMonthLines'),false);
});

test('localized monthly additions have no missing keys and empty amounts do not invent lines', () => {
  const c=setup();
  for(const lang of ['zh','en']) for(const on of [true,false]) {
    c.set('lang',lang);c.set('propMonthLines',on);assert.doesNotMatch(html(c),/prop\.monthly\./);
  }
  c.set('lang','en');c.set('propMonthLines',false);c.set('propEntries',[]);
  const h=html(c);assert.match(h,/Show lines/);assert.doesNotMatch(h,/prop\.monthly\.|投入回收率|data-has-cash="true"/);
});

test('redraw disconnects observers, cancels queued drawing and drops detached chart references', () => {
  const c=setup();c.run(`propOverviewBeforeRender();propMonthLines=true;
    window.cancelAnimationFrame=id=>globalThis.__cancelled=id;
    propMonthsUI.frame=7;propMonthsUI.observer={disconnect(){globalThis.__disconnected=true}};
    propMonthsUI.chart={querySelector(){return {remove(){globalThis.__removed=true}}}};
    propOverviewBeforeRender();`);
  assert.equal(c.run('__cancelled'),7);assert.equal(c.run('__disconnected'),true);assert.equal(c.run('__removed'),true);
  assert.equal(c.run('propMonthsUI.chart'),null);assert.equal(c.run('propMonthsUI.observer'),null);assert.equal(c.run('propMonthsUI.frame'),0);
  assert.equal(c.run('propMonthLines'),true);
});

test('disabled year-arrow focus falls back to the selected month, never an open form', () => {
  const c=setup();c.run(`globalThis.__focusCount=0;
    globalThis.__picked={focus(){__focusCount++}};
    globalThis.__panel={querySelector(s){return s==='.propMoCol.on:not(:disabled)'?__picked:null}};
    document.getElementById=id=>id==='propMonthsPanel'?__panel:null;
    propMonthsUI.restore={action:'prop-year',value:'1'};propMonthsAfterRender();`);
  assert.equal(c.run('__focusCount'),1);
  c.run(`propModal={type:'entry',draft:{amount:'12'}};propMonthsUI.restore={action:'prop-year',value:'1'};propMonthsAfterRender()`);
  assert.equal(c.run('__focusCount'),1);assert.equal(c.run('propModal.draft.amount'),'12');
});

test('very long amounts use a readable narrow-screen layout without shortening money', () => {
  const c=setup();c.run('propEntries=propEntries.map(e=>({...e,amount:e.amount*100000000}))');
  const h=html(c);assert.match(h,/propMonthsMetrics propMonthsMetricsLong/);assert.match(h,/data-month-amount="spent">\$5,000,000,000/);
});

test('toggle does not write preferences, fetch data or mutate financial caches', () => {
  const c=setup();c.run(`globalThis.__before=JSON.stringify([propAccounts,propEntries]);
    const forbid=()=>{throw Error('unexpected external side effect')};localStorage.setItem=forbid;sessionStorage.setItem=forbid;globalThis.fetch=forbid;
    globalThis.__legend={hidden:true};globalThis.__caption={};
    globalThis.__toggle={setAttribute(k,v){this[k]=v},querySelector(){return __caption}};
    globalThis.__panel={classList:{toggle(){}},querySelector(){return __legend}};
    document.getElementById=id=>id==='propMonthsPanel'?__panel:id==='propMonthLinesToggle'?__toggle:null;
    propMonthsToggle();`);
  assert.equal(c.run('propMonthLines'),true);assert.equal(c.run('__legend.hidden'),false);
  c.run('propMonthsToggle()');assert.equal(c.run('propMonthLines'),false);assert.equal(c.run('__legend.hidden'),true);
  assert.equal(c.run('JSON.stringify([propAccounts,propEntries])===__before'),true);
});

test('monthly keyboard ignores modified keys before inspecting or activating a month', () => {
  const c=setup();
  for(const modifier of ['shiftKey','altKey','ctrlKey','metaKey','isComposing']) {
    c.set('__modifier',modifier);
    assert.equal(c.run(`propMonthsKeydown({key:'ArrowRight',[__modifier]:true,target:{closest(){throw Error('must not inspect')}}})`),false);
  }
});

test('recovery tooltip uses textContent and common Escape/aria cleanup', () => {
  const c=setup();c.run(`globalThis.__tip={style:{},offsetWidth:250,offsetHeight:180,setAttribute(){},remove(){globalThis.__tipRemoved=true}};
    Object.defineProperty(__tip,'innerHTML',{set(){throw Error('unsafe HTML')}});
    document.createElement=()=>__tip;document.body.appendChild=()=>{};window.innerWidth=1000;window.innerHeight=800;
    globalThis.__button={isConnected:true,dataset:{propMonthTip:'recovery',propMonthHelpText:'<img src=x onerror=alert(1)>'},classList:{add(){},remove(){}},setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]},getBoundingClientRect(){return {left:700,right:720,top:400,bottom:420,width:20}}};
    propOverviewShowHelp(__button);`);
  assert.equal(c.run('__tip.textContent'),'<img src=x onerror=alert(1)>');
  assert.equal(c.run(`__button['aria-describedby']`),'propOverviewTooltip');
  assert.equal(c.run(`propOverviewKeydown({key:'Escape',preventDefault(){},target:{closest(){return null}}})`),true);
  assert.equal(c.run('propOverviewUI.tip'),null);assert.equal(c.run('__tipRemoved'),true);
  assert.equal(c.run(`__button['aria-describedby']`),undefined);
});

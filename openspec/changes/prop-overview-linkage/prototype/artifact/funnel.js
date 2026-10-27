// Synthetic interaction prototype only. No authentication, API or persistence.
(() => {
  const $=id=>document.getElementById(id), root=document.documentElement;
  const state={locale:'zh',theme:'light',palette:'graphite',sample:'period',firm:'',group:'',view:'overview',status:'all',sheet:null,tab:'converted',detail:null};
  const words={
    zh:{demo:'合成数据 · 漏斗交互预览',palette:'配色',theme:'模式',language:'语言',sample:'样例范围',light:'浅色',dark:'深色',allTime:'全部时间',allFirms:'全部公司',allGroups:'全部分组',firm:'公司',group:'分组',funnel:'账号漏斗',hint:'阶段数量与转化率都可以点击查看账号',period:'区间进展',all:'全部记录',bought:'买入',passed:'通过考核',funded:'资金账号',paid:'出金到账',unit:'个账号',viewList:'查看账号',into:'转到',paidNote:'仅计已到账出金',unique:'每个账号计一次',current:'当前账号状态',currentHint:'点击阶段，前往“我的账号”查看',active:'进行中',eval:'考核中',waiting:'待激活',myAccounts:'我的账号',back:'返回总览',clear:'全部状态',filtered:'当前筛选',empty:'这个范围内没有对应账号',close:'关闭',stageList:'阶段账号',conversion:'同批账号转化',converted:'已转化',unconverted:'期内未转化',rangeEnd:'以区间结束日为截止，仅跟踪起点阶段的同一批账号。',scope:'日期范围',boughtOn:'购买日期',now:'当前状态',details:'账号详情',returnList:'返回名单',missing:'期内未记录',readonly:'预览详情 · 不提供修改或保存',foot:'仅使用合成账号，不连接数据库。当前状态单独展示只为演示跳转，正式仍放在资金概览右侧；正式日期选择沿用双月日历。',after:'查看对应账号与相关日期',count:'{n} 个账号',rate:'{n} / {d} 个账号 · 转化率 {p}',first:'本期发生的阶段进展；每个账号在每个阶段仅计一次。',examRate:'通过率',examBasis:'按 {n} 次有结果的考核算',costPerFunded:'平均每个资金账号成本',costBasis:'区间投入 ÷ 区间内获得的资金账号数',costBasisAll:'全部投入 ÷ 拿到的资金账号数',shapeNote:'形状表示阶段递进，不代表数量比例；转化率按同批账号计算。',flowLabel:'从左向右的账号漏斗，可横向滚动',swipe:'横向滑动查看全部阶段 →'},
    en:{demo:'Synthetic data · Funnel preview',palette:'Palette',theme:'Mode',language:'Language',sample:'Sample range',light:'Light',dark:'Dark',allTime:'All time',allFirms:'All firms',allGroups:'All groups',firm:'Firm',group:'Group',funnel:'Account funnel',hint:'Select a stage or conversion rate to inspect its accounts',period:'Period activity',all:'All records',bought:'Purchased',passed:'Passed',funded:'Funded',paid:'Paid out',unit:'accounts',viewList:'View accounts',into:'To',paidNote:'Received payouts only',unique:'Each account counted once',current:'Current account status',currentHint:'Select a stage to open My accounts',active:'Active',eval:'Evaluation',waiting:'To activate',myAccounts:'My accounts',back:'Back to overview',clear:'All stages',filtered:'Current filter',empty:'No matching accounts in this range',close:'Close',stageList:'Stage accounts',conversion:'Same-cohort conversion',converted:'Converted',unconverted:'Not converted in range',rangeEnd:'Track the same starting cohort, with the range end as the cutoff.',scope:'Date range',boughtOn:'Purchase date',now:'Current stage',details:'Account details',returnList:'Back to list',missing:'Not recorded in range',readonly:'Preview details · No editing or saving',foot:'Synthetic accounts only; no database connection. The separate current-status card demonstrates navigation only; production keeps it inside the financial panel and retains the two-month date picker.',after:'Inspect the accounts and their event dates',count:'{n} accounts',rate:'{n} / {d} accounts · {p} conversion',first:'Stage events inside the selected range; each account counts once per stage.',examRate:'Exam pass rate',examBasis:'Based on {n} completed attempts',costPerFunded:'Average cost per funded account',costBasis:'Period investment ÷ accounts funded in the period',costBasisAll:'Total investment ÷ funded accounts',shapeNote:'Shapes show progression, not count ratios. Rates track the same starting cohort.',flowLabel:'Left-to-right account funnel; scroll horizontally',swipe:'Swipe to see all stages →'}
  };
  const t=(key,params={})=>Object.entries(params).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),words[state.locale][key]||key);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths={bought:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-6 5h3"/>',passed:'<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z"/><path d="m8 12 3 3 5-6"/>',funded:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M6 16c0-3 6-3 6 0m3-7h3m-3 4h3"/>',paid:'<circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',open:'<path d="M7 17 17 7M7 7h10v10"/>',funnel:'<path d="M3 4h18M6 9h12M9 14h6M11 19h2"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>',check:'<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>'};
  const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.funded}</svg>`;
  const keys=['bought','passed','funded','paid'];
  const accounts=Array.from({length:18},(_,i)=>{const n=i+1;return{id:'SIM-'+String(n).padStart(3,'0'),name:'Demo '+String(n).padStart(2,'0')+' · 50K',firm:n<=10?'Demo Firm A':'Demo Firm B',group:n<=10?'Batch A':'Batch B',days:{bought:[`2026-${n<=10?'10':'09'}-${String(n).padStart(2,'0')}`],passed:[],funded:[],paid:[]}};});
  [1,2,3,11,12,13,14,15].forEach((n,i)=>accounts[n-1].days.passed.push('2026-10-'+(12+i)));
  [16,17,18].forEach(n=>accounts[n-1].days.passed.push('2026-09-20'));
  [1,2,11,12,16,17].forEach((n,i)=>accounts[n-1].days.funded.push('2026-10-'+(20+i)));
  accounts[17].days.funded.push('2026-09-22');
  [1,11,16,18].forEach((n,i)=>accounts[n-1].days.paid.push('2026-10-'+(26+i)));
  // Synthetic attempts and fees restore the existing summary without copying private screenshot values.
  const failedAttempts=[{id:'SIM-004',day:'2026-10-11'},{id:'SIM-005',day:'2026-10-15'},{id:'SIM-005',day:'2026-10-18'}];
  const fees=accounts.flatMap(a=>[{id:a.id,day:a.days.bought[0],cents:10000},...a.days.funded.map(day=>({id:a.id,day,cents:6000}))]);
  failedAttempts.forEach(a=>fees.push({id:a.id,day:a.day.slice(0,8)+String(Number(a.day.slice(8))+1).padStart(2,'0'),cents:4000}));
  const current=a=>a.days.funded.length?'funded':a.days.passed.length?'passed':'eval';
  const stageName=s=>t(s==='eval'?'eval':s==='passed'?'waiting':s==='funded'?'funded':'clear');
  const bounds=()=>state.sample==='all'?{from:'0001-01-01',to:'9999-12-31'}:state.sample==='empty'?{from:'2026-12-01',to:'2026-12-31'}:{from:'2026-10-01',to:'2026-10-31'};
  const rangeText=()=>state.sample==='all'?t('allTime'):`${bounds().from.replaceAll('-','.')} – ${bounds().to.slice(5).replace('-','.')}`;
  const scoped=()=>accounts.filter(a=>(!state.firm||a.firm===state.firm)&&(!state.group||a.group===state.group));
  function activity(stage){const {from,to}=bounds();return scoped().flatMap(a=>{const day=a.days[stage].find(d=>d>=from&&d<=to);return day?[{a,day}]:[];});}
  function conversion(index){const {to}=bounds(),from=keys[index],target=keys[index+1],rows=activity(from).map(row=>({...row,next:row.a.days[target].find(day=>day>=row.day&&day<=to)||null}));return{from,target,rows,converted:rows.filter(r=>r.next),unconverted:rows.filter(r=>!r.next)};}
  const pct=c=>c.rows.length?Math.round(c.converted.length/c.rows.length*100)+'%':'—';
  function summary(){const ids=new Set(scoped().map(a=>a.id)),{from,to}=bounds(),inScope=r=>ids.has(r.id)&&r.day>=from&&r.day<=to;
    const passed=activity('passed').length,fails=failedAttempts.filter(inScope).length,decided=passed+fails,funded=activity('funded').length,spentCents=fees.filter(inScope).reduce((sum,r)=>sum+r.cents,0);
    return {passed,fails,decided,funded,spentCents,passRate:decided?passed/decided*100:null,costPerFunded:funded?spentCents/100/funded:null};
  }
  const usd=value=>value===null?'—':'$'+value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  function connection(i){const c=conversion(i);return `<button type="button" class="conversion" data-edge="${i}"${!c.rows.length?' disabled':''} aria-label="${esc(t(c.from)+' → '+t(c.target)+' · '+pct(c)+' · '+c.converted.length+'/'+c.rows.length)}"><span class="conversion-row"><strong>${pct(c)}</strong>${icon('arrow')}</span><span class="conversion-meta">${c.converted.length} / ${c.rows.length}</span></button>`;}
  function frame(){
    const shell=window.PROTOTYPE_SHELL[state.locale][state.theme];$('appHeader').innerHTML=shell.header;$('appNav').innerHTML=shell.nav;$('propTabs').innerHTML=shell.tabs;
    for(const b of document.querySelectorAll('#appHeader button,#appNav button,#propTabs button')){
      const allowed=b.dataset.action==='toggle-theme'||(b.dataset.action==='prop-view'&&['overview','accounts'].includes(b.dataset.view));
      if(!allowed){b.disabled=true;b.setAttribute('aria-disabled','true');}
      if(b.dataset.action==='prop-view')b.classList.toggle('active',b.dataset.view===state.view);
    }
    root.dataset.theme=state.theme;root.dataset.palette=state.palette;root.lang=state.locale==='zh'?'zh-CN':'en';
    ['palette','theme','language','sample'].forEach(k=>$(k+'Label').textContent=t(k));$('demoNote').textContent=t('demo');$('footnote').textContent=t('foot');
    $('theme').options[0].text=t('light');$('theme').options[1].text=t('dark');$('sample').options[1].text=t('allTime');
    const names=state.locale==='zh'?['石墨','黑金','晴空','紫罗兰','樱花粉','落日橙','深海青']:['Graphite','Gold','Sky','Violet','Rose','Sunset','Ocean'];Array.from($('palette').options).forEach((o,i)=>o.text=names[i]);
    $('filters').innerHTML=`<label>${esc(t('firm'))}<select id="firm"><option value="">${esc(t('allFirms'))}</option>${['Demo Firm A','Demo Firm B'].map(x=>`<option${state.firm===x?' selected':''}>${x}</option>`).join('')}</select></label><label>${esc(t('group'))}<select id="group"><option value="">${esc(t('allGroups'))}</option>${['Batch A','Batch B'].map(x=>`<option${state.group===x?' selected':''}>${x}</option>`).join('')}</select></label>${state.view==='overview'?`<span class="range-badge">${icon('calendar')}${esc(rangeText())}</span>`:''}`;
  }
  function overview(){
    const totals=summary(),edges=[2,20,38,56,74];
    return `<section class="funnel-panel" data-slot="card" data-node="funnel/panel"><header class="panel-heading"><div class="panel-title"><span class="title-icon">${icon('funnel')}</span><div><h2>${esc(t('funnel'))}</h2><p>${esc(t('hint'))}</p></div></div><span class="badge">${esc(t(state.sample==='all'?'all':'period'))}</span></header>
      <div class="funnel-scroll" role="region" tabindex="0" aria-label="${esc(t('flowLabel'))}" aria-describedby="funnelShapeNote"><div class="funnel-track" data-node="funnel/directional-flow"><div class="funnel-stages">${keys.map((key,i)=>{const rows=activity(key);return `<div class="funnel-step" data-node="funnel/stage-${key}"><button type="button" class="stage-main" data-stage="${key}" style="--shape-tint:${6+i*5}%" aria-label="${esc(t(key)+' · '+t('count',{n:rows.length})+' · '+t('viewList'))}"><span class="stage-caption"><span class="stage-glyph">${icon(key)}</span><span>${esc(t(key))}</span></span><span class="stage-body"><svg class="stage-silhouette" viewBox="0 0 300 240" preserveAspectRatio="none" aria-hidden="true"><polygon points="2,${edges[i]} 298,${edges[i+1]} 298,${240-edges[i+1]} 2,${240-edges[i]}" vector-effect="non-scaling-stroke"/></svg><span class="stage-data"><span class="stage-value"><strong>${rows.length}</strong><span>${esc(t('unit'))}</span></span><span class="stage-action">${esc(t('viewList'))}${icon('open')}</span></span></span></button>${i<3?connection(i):''}</div>`;}).join('')}</div></div></div>
      <p class="diagram-caption" id="funnelShapeNote"><span>${esc(t('shapeNote'))}</span><span class="flow-swipe">${esc(t('swipe'))}</span></p>
      <div class="funnel-summary" data-node="funnel/summary"><div class="summary-metric" data-metric="exam-rate"><span>${esc(t('examRate'))}</span><strong>${totals.passRate===null?'—':Math.round(totals.passRate)+'%'}</strong><small>${esc(t('examBasis',{n:totals.decided}))}</small></div><div class="summary-metric" data-metric="funded-cost"><span>${esc(t('costPerFunded'))}</span><strong>${usd(totals.costPerFunded)}</strong><small>${esc(t(state.sample==='all'?'costBasisAll':'costBasis'))}</small></div></div></section>
      <section class="current-panel" data-slot="card" data-node="funnel/current-status"><header class="panel-heading"><div class="panel-title"><span class="title-icon">${icon('funded')}</span><div><h2>${esc(t('current'))}</h2><p>${esc(t('currentHint'))}</p></div></div></header><div class="current-content"><div class="current-total"><strong>${scoped().length}</strong><span>${esc(t('active'))}</span></div><div class="current-stages">${['eval','passed','funded'].map(s=>`<button type="button" class="status-link" data-status="${s}" aria-label="${esc(t('myAccounts')+' · '+stageName(s))}"><span>${esc(stageName(s))}</span><span><b>${scoped().filter(a=>current(a)===s).length}</b>${icon('arrow')}</span></button>`).join('')}</div></div></section>`;
  }
  function accountItem(row,detail=true){const a=row.a||row,dates=row.day?`<span class="date-badge">${esc(row.sourceLabel||t(state.sheet?.stage||'bought'))} · ${row.day.slice(5).replace('-','/')}</span>${row.targetLabel?`<span class="date-badge">${esc(row.targetLabel)} · ${row.next?row.next.slice(5).replace('-','/'):esc(t('missing'))}</span>`:''}`:'';return `<button type="button" class="account-item" data-account="${a.id}"><span class="account-avatar">${icon('funded')}</span><span class="account-main"><span class="account-title">${esc(a.name)}</span><span class="account-sub">${esc(a.firm)} · ${esc(a.group)}</span><span class="account-meta"><span class="badge">${esc(stageName(current(a)))}</span>${dates}</span></span><span class="open-arrow">${icon('arrow')}</span></button>`;}
  function accountPage(){const list=scoped().filter(a=>state.status==='all'||current(a)===state.status);return `<section class="accounts-panel" data-node="funnel/accounts-view"><header class="panel-heading"><div class="panel-title"><div><h2>${esc(t('myAccounts'))}</h2><p>${esc(t('count',{n:list.length}))}</p></div></div><button type="button" class="outline-button" data-back-overview>${esc(t('back'))}</button></header><div class="sheet-toolbar"><div class="list-tools"><span>${esc(t('filtered'))}</span><span class="badge">${esc(stageName(state.status))}</span><button type="button" class="outline-button" data-all-status>${esc(t('clear'))}</button></div></div><div class="account-grid">${list.length?list.map(a=>accountItem(a)).join(''):`<div class="empty-state">${esc(t('empty'))}</div>`}</div></section>`;}
  function render(){frame();$('demoBody').innerHTML=state.view==='overview'?overview():accountPage();}
  function sheetContent(){
    const s=state.sheet,detail=state.detail&&accounts.find(a=>a.id===state.detail);let rows=[];
    $('sheetDone').textContent=t('close');$('sheetClose').setAttribute('aria-label',t('close'));
    if(detail){
      $('sheetKicker').textContent=t('details');$('sheetTitle').textContent=detail.name;$('sheetDescription').textContent=t('readonly');
      $('sheetToolbar').innerHTML=s?`<button type="button" class="outline-button" data-back-list>← ${esc(t('returnList'))}</button>`:'';
      $('sheetContent').innerHTML=`<dl class="details-grid"><div><dt>${esc(t('firm'))}</dt><dd>${esc(detail.firm)}</dd></div><div><dt>${esc(t('group'))}</dt><dd>${esc(detail.group)}</dd></div><div><dt>${esc(t('now'))}</dt><dd>${esc(stageName(current(detail)))}</dd></div><div><dt>${esc(t('boughtOn'))}</dt><dd>${detail.days.bought[0]}</dd></div></dl><ul class="timeline">${keys.flatMap(k=>detail.days[k].map(day=>({k,day}))).sort((a,b)=>a.day.localeCompare(b.day)).map(r=>`<li><span>${esc(t(r.k))}</span><time>${r.day}</time></li>`).join('')}</ul>`;$('sheetCount').textContent=detail.id;return;
    }
    $('sheetKicker').textContent=s.type==='edge'?t('conversion'):t('stageList');
    if(s.type==='edge'){
      const c=conversion(s.edge);rows=c[state.tab].map(r=>({...r,sourceLabel:t(c.from),targetLabel:t(c.target)}));
      $('sheetTitle').textContent=t(c.from)+' → '+t(c.target);$('sheetDescription').textContent=t('rate',{n:c.converted.length,d:c.rows.length,p:pct(c)})+' · '+rangeText()+'. '+t('rangeEnd');
      $('sheetToolbar').innerHTML=`<div class="segmented" role="tablist" aria-label="${esc(t('conversion'))}">${['converted','unconverted'].map(k=>`<button type="button" role="tab" data-sheet-tab="${k}" aria-selected="${state.tab===k}" tabindex="${state.tab===k?'0':'-1'}">${esc(t(k))} ${c[k].length}</button>`).join('')}</div>`;
    }else{rows=activity(s.stage);$('sheetTitle').textContent=t(s.stage)+' · '+t('count',{n:rows.length});$('sheetDescription').textContent=rangeText()+' · '+t('first');$('sheetToolbar').innerHTML='';}
    $('sheetContent').innerHTML=rows.length?rows.map(row=>accountItem(row)).join(''):`<div class="empty-state">${esc(t('empty'))}</div>`;$('sheetCount').textContent=t('count',{n:rows.length});
  }
  function openSheet(s,detail=null){state.sheet=s;state.detail=detail;state.tab='converted';sheetContent();if(!$('accountSheet').open)$('accountSheet').showModal();}
  function closeSheet(){$('accountSheet').close();state.detail=null;}
  document.addEventListener('change',e=>{
    const map={locale:'locale',theme:'theme',palette:'palette',sample:'sample',firm:'firm',group:'group'},key=map[e.target.id];if(!key)return;state[key]=e.target.value;render();
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.stage)openSheet({type:'stage',stage:b.dataset.stage});
    else if(b.dataset.edge!==undefined)openSheet({type:'edge',edge:Number(b.dataset.edge)});
    else if(b.dataset.status){state.view='accounts';state.status=b.dataset.status;render();$('demoBody').scrollIntoView({block:'start'});}
    else if(b.hasAttribute('data-back-overview')){state.view='overview';render();}
    else if(b.hasAttribute('data-all-status')){state.status='all';render();}
    else if(b.dataset.account){if($('accountSheet').open){state.detail=b.dataset.account;sheetContent();}else openSheet(null,b.dataset.account);}
    else if(b.hasAttribute('data-back-list')){state.detail=null;sheetContent();}
    else if(b.dataset.sheetTab){state.tab=b.dataset.sheetTab;sheetContent();$('sheetToolbar').querySelector(`[data-sheet-tab="${state.tab}"]`)?.focus();}
    else if(b.id==='sheetClose'||b.id==='sheetDone')closeSheet();
    else if(b.dataset.action==='toggle-theme'){state.theme=state.theme==='light'?'dark':'light';$('theme').value=state.theme;render();}
    else if(b.dataset.action==='prop-view'){state.view=b.dataset.view;render();}
  });
  $('sheetToolbar').addEventListener('keydown',e=>{const b=e.target.closest('[data-sheet-tab]');if(!b||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();state.tab=e.key==='Home'?'converted':e.key==='End'?'unconverted':state.tab==='converted'?'unconverted':'converted';sheetContent();$('sheetToolbar').querySelector(`[data-sheet-tab="${state.tab}"]`)?.focus();});
  $('accountSheet').addEventListener('click',e=>{if(e.target===$('accountSheet')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right)closeSheet();}});
  window.funnelDemo={inspect:()=>({view:state.view,status:state.status,firm:state.firm,group:state.group,summary:summary(),stages:Object.fromEntries(keys.map(k=>[k,activity(k).length])),conversions:[0,1,2].map(i=>{const c=conversion(i);return{n:c.converted.length,d:c.rows.length,ids:c.converted.map(r=>r.a.id)}})}),reset:()=>{Object.assign(state,{sample:'period',firm:'',group:'',view:'overview',status:'all'});render();}};
  render();
})();

// Restored native picker. Local UI only: no requests, user data writes, or cookies.
(() => {
  const data=window.PROP_RANGE_SNAPSHOT,engine=window.PROP_RANGE_PREVIEW,$=id=>document.getElementById(id),DAY=86400000;
  const trigger=$('rangeTrigger'),picker=$('rangePicker');
  const stamp=day=>Date.parse(day+'T00:00:00Z'),iso=t=>new Date(t).toISOString().slice(0,10);
  const today=new Date(stamp(data.asOf)),year=today.getUTCFullYear(),month=today.getUTCMonth();
  const monthIndex=day=>{const d=new Date(stamp(day));return d.getUTCFullYear()*12+d.getUTCMonth();};
  const covered=(from,to=from)=>from>=data.from&&to<=data.to&&from<=to;
  const presets=[
    {key:'custom',label:'自定义'}, {key:'all',label:'全部时间'},
    {key:'last7',label:'最近7天',from:iso(stamp(data.asOf)-6*DAY),to:data.asOf},
    {key:'last30',label:'最近30天',from:iso(stamp(data.asOf)-29*DAY),to:data.asOf},
    {key:'thisMonth',label:'本月',from:iso(Date.UTC(year,month,1)),to:data.asOf},
    {key:'lastMonth',label:'上月',from:iso(Date.UTC(year,month-1,1)),to:iso(Date.UTC(year,month,0))},
  ];
  let appliedKey='all',draftKey='all',start=null,end=null,hover=null,choosingEnd=false,firstMonth=monthIndex(data.from);
  const rangeLabel=(from,to)=>from.replaceAll('-','.')+' – '+(from.slice(0,4)===to.slice(0,4)?to.slice(5).replace('-','.'):to.replaceAll('-','.'));
  function position(panel,anchor) {
    if(panel.hidden)return;
    const r=anchor.getBoundingClientRect(),w=panel.offsetWidth,h=panel.offsetHeight;
    const left=Math.max(12,Math.min(r.right-w,innerWidth-w-12));
    let top=r.bottom+4;
    if(top+h>innerHeight-12&&r.top-h-4>=12)top=r.top-h-4;
    panel.style.left=left+'px';panel.style.top=Math.max(12,Math.min(top,innerHeight-h-12))+'px';
  }
  function close(restore=true) {
    picker.hidden=true;trigger.setAttribute('aria-expanded','false');choosingEnd=false;hover=null;
    if(restore)trigger.focus({preventScroll:true});
  }
  function updateTrigger() {
    const state=engine.getState();
    $('rangeButtonLabel').textContent=appliedKey==='custom'?rangeLabel(state.from,state.to):presets.find(p=>p.key===appliedKey).label;
    trigger.title=state.mode==='all'?'全部时间：合成数据':rangeLabel(state.from,state.to);
  }
  function renderPresets() {
    $('rangePresets').innerHTML=presets.map(p=>{
      const enabled=p.key==='custom'||p.key==='all'||covered(p.from,p.to);
      return `<button type="button" class="range-preset ${draftKey===p.key?'active':''}" data-range-preset="${p.key}" aria-pressed="${draftKey===p.key}" ${enabled?'':'disabled title="离线快照缺少此范围的明细"'}>${p.label}</button>`;
    }).join('');
  }
  function renderMonth(index) {
    const y=Math.floor(index/12),m=((index%12)+12)%12,first=Date.UTC(y,m,1),offset=new Date(first).getUTCDay();
    const preferred=start&&covered(start)?start:data.asOf;
    const days=Array.from({length:42},(_,i)=>{
      const t=first+(i-offset)*DAY,d=new Date(t),day=iso(t),inMonth=d.getUTCMonth()===m&&d.getUTCFullYear()===y,enabled=inMonth&&covered(day);
      return `<div class="date-cell ${inMonth?'':'adjacent'}" role="gridcell" data-cell-day="${day}" aria-selected="false"><button type="button" data-range-day="${day}" aria-label="${d.getUTCFullYear()}年${d.getUTCMonth()+1}月${d.getUTCDate()}日" ${day===data.asOf?'aria-current="date"':''} tabindex="${enabled&&day===preferred?'0':'-1'}" ${enabled?'':'disabled'}>${d.getUTCDate()}</button></div>`;
    });
    let grid='<div class="calendar-weekdays" role="row">'+['日','一','二','三','四','五','六'].map(v=>`<span role="columnheader">${v}</span>`).join('')+'</div>';
    for(let r=0;r<6;r++)grid+=`<div class="calendar-week" role="row">${days.slice(r*7,r*7+7).join('')}</div>`;
    return `<section class="range-month" aria-label="${y}年${m+1}月"><h3>${y}年 ${m+1}月</h3><div class="calendar-grid" role="grid" aria-label="${y}年${m+1}月日期">${grid}</div></section>`;
  }
  function updateHighlights() {
    const target=choosingEnd?hover||start:end,lo=start&&target?(start<target?start:target):start,hi=start&&target?(start>target?start:target):start;
    picker.querySelectorAll('[data-cell-day]').forEach(cell=>{
      const day=cell.dataset.cellDay,button=cell.firstElementChild,selected=!button.disabled&&!!lo&&day>=lo&&day<=hi;
      cell.classList.toggle('in-range',selected);cell.classList.toggle('range-start',selected&&day===lo);cell.classList.toggle('range-end',selected&&day===hi);cell.classList.toggle('today',day===data.asOf&&!button.disabled);cell.setAttribute('aria-selected',String(selected));
    });
    $('rangeSelectionStatus').textContent=choosingEnd?`${start.replaceAll('-','/')} 已选，请选择结束日期`:start&&end?rangeLabel(start,end):'点击起始日期，再点击结束日期';
  }
  function renderCalendars() {$('rangeMonths').innerHTML=renderMonth(firstMonth)+renderMonth(firstMonth+1);updateHighlights();}
  function open() {
    document.dispatchEvent(new Event('preview:overlay-open'));
    const state=engine.getState();start=state.from;end=state.to;draftKey=appliedKey;choosingEnd=false;hover=null;firstMonth=monthIndex(start||data.asOf);
    renderPresets();renderCalendars();picker.hidden=false;trigger.setAttribute('aria-expanded','true');position(picker,trigger);
    picker.querySelector(`[data-range-preset="${draftKey}"]`)?.focus({preventScroll:true});
  }
  function apply(from,to,key) {if(engine.setRange(from,to)){appliedKey=key;updateTrigger();close();}}
  trigger.addEventListener('click',()=>picker.hidden?open():close());
  picker.addEventListener('click',event=>{
    const preset=event.target.closest('[data-range-preset]');
    if(preset&&!preset.disabled){
      const p=presets.find(v=>v.key===preset.dataset.rangePreset);
      if(p.key==='custom'){
        draftKey='custom';renderPresets();
        if(!picker.querySelector('[data-range-day]:not(:disabled)')){firstMonth=monthIndex(data.from);renderCalendars();}
        picker.querySelector('[data-range-day]:not(:disabled)')?.focus({preventScroll:true});
      }else if(p.key==='all'){if(engine.setAllTime()){appliedKey='all';updateTrigger();close();}}
      else apply(p.from,p.to,p.key);
      return;
    }
    const nav=event.target.closest('[data-calendar-nav]');
    if(nav){firstMonth+=Number(nav.dataset.calendarNav);renderCalendars();position(picker,trigger);return;}
    const button=event.target.closest('[data-range-day]');if(!button||button.disabled)return;
    const day=button.dataset.rangeDay;
    if(!choosingEnd){start=day;end=null;hover=null;choosingEnd=true;draftKey='custom';renderPresets();updateHighlights();}
    else apply(start<day?start:day,start<day?day:start,'custom');
  });
  picker.addEventListener('pointerover',event=>{
    if(!choosingEnd)return;const b=event.target.closest('[data-range-day]');
    if(b&&!b.disabled&&hover!==b.dataset.rangeDay){hover=b.dataset.rangeDay;updateHighlights();}
  });
  $('rangeMonths').addEventListener('pointerleave',()=>{if(choosingEnd){hover=null;updateHighlights();}});
  picker.addEventListener('keydown',event=>{
    const button=event.target.closest('[data-range-day]');if(!button)return;
    const shifts={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};if(!(event.key in shifts))return;
    event.preventDefault();const next=iso(stamp(button.dataset.rangeDay)+shifts[event.key]*DAY);if(!covered(next))return;
    const mi=monthIndex(next);if(mi<firstMonth||mi>firstMonth+(innerWidth<=640?0:1)){firstMonth=mi;renderCalendars();}
    picker.querySelectorAll('[data-range-day]').forEach(b=>{b.tabIndex=-1;});
    const target=picker.querySelector(`[data-range-day="${next}"]:not(:disabled)`);
    if(target){target.tabIndex=0;target.focus({preventScroll:true});if(choosingEnd){hover=next;updateHighlights();}}
  });
  document.addEventListener('pointerdown',event=>{
    if(!picker.hidden&&!picker.contains(event.target)&&!trigger.contains(event.target))close(false);
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(!picker.hidden){event.preventDefault();close();}
  });
  document.addEventListener('focusin',event=>{
    if(!picker.hidden&&!picker.contains(event.target)&&!trigger.contains(event.target))close(false);
  });
  const reposition=()=>position(picker,trigger);
  addEventListener('resize',reposition);
  addEventListener('scroll',event=>{if(!(event.target instanceof Node)||!picker.contains(event.target))reposition();},true);
  updateTrigger();
})();

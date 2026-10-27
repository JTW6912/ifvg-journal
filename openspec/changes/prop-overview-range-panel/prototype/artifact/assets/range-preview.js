// Restored offline aggregates and chart. No API, authentication, or persistence.
(() => {
  const data=window.PROP_RANGE_SNAPSHOT, $=id=>document.getElementById(id), DAY=86400000;
  let appliedState={mode:'range',from:data.from,to:data.to};
  const parseDay=value=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN;
    const t=Date.parse(value+'T00:00:00Z');
    return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===value?t:NaN;
  };
  const asDay=t=>new Date(t).toISOString().slice(0,10);
  const shortDay=s=>s.slice(5).replace('-','.');
  const money=(cents,signed=false)=>(cents<0?'−':signed&&cents>0?'+':'')+'$'+(Math.abs(cents)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const width=(id,cents,scale)=>{$(id).style.width=Math.max(0,cents)/scale*100+'%';};
  const node=(name,attrs={})=>{
    const e=document.createElementNS('http://www.w3.org/2000/svg',name);
    Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));return e;
  };
  function drawTrend(from,to,rows,net) {
    const plot=$('rangeTrend'), empty=$('rangeTrendEmpty');
    $('trendDates').hidden=false;
    $('trendStart').textContent=shortDay(from);$('trendEnd').textContent=shortDay(to);
    plot.replaceChildren();plot.dataset.endCents=String(net);
    plot.toggleAttribute('hidden',!rows.length);empty.hidden=!!rows.length;
    empty.textContent='该区间暂无收支';
    if(!rows.length)return;
    const daily=new Map(rows.map(r=>[r.day,r.received-r.spent]));
    const values=[0];let total=0;
    for(let t=parseDay(from);t<=parseDay(to);t+=DAY){total+=daily.get(asDay(t))||0;values.push(total);}
    const low=Math.min(0,...values),high=Math.max(0,...values),span=high-low||1;
    const x=i=>7+i/(values.length-1)*166, y=v=>high===low?45:9+(high-v)/span*72, f=n=>n.toFixed(2), zero=y(0);
    let path=`M${f(x(0))},${f(y(0))}`;
    values.slice(1).forEach((v,i)=>{path+=`H${f(x(i+1))}V${f(y(v))}`;});
    const area=path+`V${f(zero)}H${f(x(0))}Z`,defs=node('defs');
    const positive=node('clipPath',{id:'rangeAboveZero'}),negative=node('clipPath',{id:'rangeBelowZero'});
    positive.append(node('rect',{x:0,y:0,width:180,height:zero}));
    negative.append(node('rect',{x:0,y:zero,width:180,height:100-zero}));
    defs.append(positive,negative);plot.append(defs,node('line',{x1:7,y1:zero,x2:173,y2:zero,class:'trend-zero'}));
    for(const [tone,clip] of [['positive','rangeAboveZero'],['negative','rangeBelowZero']]){
      plot.append(node('path',{d:area,class:'trend-area '+tone,'clip-path':`url(#${clip})`}));
      plot.append(node('path',{d:path,class:'trend-line '+tone,'clip-path':`url(#${clip})`}));
    }
    plot.append(node('circle',{cx:x(values.length-1),cy:y(net),r:3,class:'trend-last'}));
    const description=`${from}至${to}，从区间起点0按日累计到账减投入，终点${money(net,true)}。`;
    const desc=node('desc');desc.textContent=description;plot.prepend(desc);plot.setAttribute('aria-label',description);
  }
  function renderNumbers(spent,received,allTime=false) {
    const net=received-spent,roi=spent>0?net/spent*100:null;
    $('netTitleText').textContent=allTime?'累计净收益':'区间净收益';
    $('spendTitleText').textContent=allTime?'累计投入':'区间投入';
    $('trendHeading').textContent=allTime?'累计走势':'区间走势';
    const [integer,fraction]=(Math.abs(net)/100).toFixed(2).split('.');
    $('netPrefix').textContent=(net<0?'−':net>0?'+':'')+'$';
    $('netInteger').textContent=Number(integer).toLocaleString('en-US');$('netFraction').textContent='.'+fraction;
    $('netValue').dataset.cents=String(net);$('netValue').setAttribute('aria-label',(allTime?'累计净收益 ':'区间净收益 ')+money(net,true));
    $('netZone').dataset.tone=net<0?'negative':net>0?'positive':'neutral';
    $('roiValue').textContent=roi===null?'—':(roi>0?'+':'')+roi.toFixed(1)+'%';
    $('roiDirection').setAttribute('href',net<0?'#trendDown':net>0?'#trend':'#trendFlat');
    $('rangeSpent').textContent=money(spent);$('rangeReceived').textContent=money(received);
    const scale=Math.max(spent,received,1);
    width('spentBar',spent,scale);width('coveredBar',Math.min(spent,received),scale);width('rangeProfitBar',Math.max(0,net),scale);
    $('profitLegend').hidden=net<=0;$('coveredLegend').hidden=Math.min(spent,received)===0;
    $('cashFigure').setAttribute('aria-label',`${allTime?'累计':'区间'}投入${money(spent)}，出金到账${money(received)}，净收益${money(net,true)}，金额条使用相同刻度。`);
    return net;
  }
  function setRange(from,to) {
    if(!Number.isFinite(parseDay(from))||!Number.isFinite(parseDay(to))||from>to||from<data.from||to>data.to){
      $('rangeError').textContent='离线快照未覆盖这个日期范围，缺失明细不能按零计算。';$('rangeError').hidden=false;return false;
    }
    $('rangeError').hidden=true;
    const rows=data.days.filter(r=>r.day>=from&&r.day<=to);
    const spent=rows.reduce((n,r)=>n+r.spent,0),received=rows.reduce((n,r)=>n+r.received,0);
    const net=renderNumbers(spent,received);drawTrend(from,to,rows,net);
    appliedState={mode:'range',from,to};
    $('rangeDatasetNote').textContent=`离线设计快照 · 收支范围 ${from.replaceAll('-','/')} – ${to.replaceAll('-','/')} · 账号状态截至 ${data.asOf.replaceAll('-','/')}`;
    return true;
  }
  function setAllTime() {
    $('rangeError').hidden=true;
    const net=renderNumbers(data.allTime.spent,data.allTime.received,true);
    drawTrend(data.from,data.to,data.days,net);
    appliedState={mode:'all',from:null,to:null};
    $('rangeDatasetNote').textContent='合成数据 · 全部时间 · 不连接数据库';
    return true;
  }
  window.PROP_RANGE_PREVIEW=Object.freeze({setRange,setAllTime,getState:()=>({...appliedState})});
  setAllTime();
})();

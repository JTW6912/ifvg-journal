// Theme controls for this isolated draft only. No storage or profile writes.
(() => {
  const root = document.documentElement;
  const palette = document.getElementById('previewPalette');
  const mode = document.getElementById('previewTheme');
  const gain = document.getElementById('previewGainColor');
  const loss = document.getElementById('previewLossColor');
  const rgb = (hex) => /^#[0-9a-f]{6}$/i.test(hex) ? [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)) : null;
  const luminance = (v) => v.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
  const contrast = (a,b) => (Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
  function readable(color, background, text, minimum) {
    const raw=rgb(color), bg=rgb(background), ink=rgb(text);
    if(!raw||!bg||!ink)return color;
    let result=raw;
    for(let i=0;i<=20;i++){
      result=raw.map((v,k)=>Math.round(v*(1-i/20)+ink[k]*(i/20)));
      if(contrast(result,bg)>=minimum)break;
    }
    return '#'+result.map(n=>n.toString(16).padStart(2,'0')).join('');
  }
  function sync() {
    const s=getComputedStyle(root), token=k=>s.getPropertyValue(k).trim();
    const surface=token('--surface'), text=token('--text');
    const positive=token('--pnlPos'), negative=token('--pnlNeg');
    if(rgb(positive))gain.value=positive;
    if(rgb(negative))loss.value=negative;
    root.style.setProperty('--positive-ink',readable(positive,surface,text,3));
    root.style.setProperty('--negative-ink',readable(negative,surface,text,3));
    root.style.setProperty('--ui-primary',readable(token('--accent'),surface,text,4.5));
    root.style.setProperty('--ui-primary-foreground',surface);
  }
  palette.addEventListener('change',()=>{if(palette.value==='gold')delete root.dataset.palette;else root.dataset.palette=palette.value;sync();});
  mode.addEventListener('change',()=>{root.dataset.theme=mode.value;sync();});
  gain.addEventListener('input',()=>{root.style.setProperty('--pnlPos',gain.value);sync();});
  loss.addEventListener('input',()=>{root.style.setProperty('--pnlNeg',loss.value);sync();});
  document.getElementById('previewResetGain').addEventListener('click',()=>{root.style.removeProperty('--pnlPos');root.style.removeProperty('--pnlNeg');sync();});
  sync();
})();

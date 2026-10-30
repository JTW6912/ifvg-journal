/* ============================================================
   Liquid Glass（苹果 iOS 26 / macOS 26 的玻璃材质），只在“玻璃”布局（data-glass，见 04-helpers 的 LAYOUTS）生效。
   材质的“皮”——极轻的磨砂、边缘高光、阴影、按压回弹、指针光——都在 theme-modern.css 的 Liquid Glass 区块。
   这里只做 CSS 做不到的那一层：边缘折射（lensing）。玻璃中间几乎不变形，越靠近圆角边缘，
   背后的内容被弯折得越厉害，这才是 Liquid Glass 和“毛玻璃”真正的区别。
   做法：按元素的宽高、圆角算一张位移贴图（R=横向、G=纵向，128=不动），放进 SVG 滤镜的 feDisplacementMap，
   再由 CSS 的 backdrop-filter:var(--lgRefract) 引用。只有 Chromium 支持 backdrop-filter 引用 SVG 滤镜，
   Safari / Firefox 不挂这个变量，自动退回纯 CSS 的玻璃，不会报错。
   ============================================================ */
// 和 theme-modern.css 里带 --lgRefract 的选择器保持一致：只给“浮在内容上面的那一层”（导航、工具栏、菜单、浮动条）
const LG_SELECTOR = [
  "#appNav", "#appHeader .headerActions .modeToggle", "#appHeader .headerTools", "#appHeader .headerActions .btn-primary",
  ".exportMenu.open", ".acctPop", ".reviewBubble", ".reviewPop", ".slashMenu", ".propOverviewPicker", ".propToast",
  ".analyticsSticky", ".propCompareBar", ".propEditorTop", ".propGlassSurface", ".lgSurface",
].join(",");
const LG_MAX_AREA = 700 * 900; // 再大的面板就不折射了（算贴图太慢、边缘也看不出来），只保留 CSS 玻璃
const lg = { svg: null, filters: new Map(), tracked: new Set(), sized: new WeakSet(), ready: new Set(), pending: new Map(), ro: null, raf: 0, profile: null, morph: null, floatAt: 0 };

function lgRefractionSupported() {
  const brands = navigator.userAgentData && navigator.userAgentData.brands;
  if (!brands || !brands.some((b) => /Chromium/.test(b.brand))) return false;
  const mq = (q) => window.matchMedia && matchMedia(q).matches;
  return !mq("(prefers-reduced-transparency: reduce)");
}

// 凸面“超椭圆”斜边：h(t) = (1-(1-t)^4)^(1/4)，t 从玻璃外沿(0)到斜面内沿(1)。
// 每一点的斜率按斯涅尔定律（玻璃折射率 1.5）换算成光线的横向偏移，再归一化到 0..1。
function lgProfile() {
  if (lg.profile) return lg.profile;
  const n = 128, out = new Float32Array(n + 1);
  let max = 0;
  for (let i = 0; i <= n; i++) {
    const u = 1 - Math.max(i / n, 1e-3);
    const slope = u ** 3 * Math.pow(1 - u ** 4, -0.75);
    const theta = Math.atan(slope);
    out[i] = Math.tan(theta - Math.asin(Math.sin(theta) / 1.5));
    max = Math.max(max, out[i]);
  }
  for (let i = 0; i <= n; i++) out[i] /= max;
  return (lg.profile = out);
}

// 圆角矩形的位移贴图。距离边缘 bezel 以内才有位移，方向沿边缘法线朝外：
// 玻璃边上看到的是边外一点点的内容被“吸”进来、压扁——和真实的厚玻璃边缘一样
function lgMapUrl(w, h, r, bezel) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d"), img = ctx.createImageData(w, h), d = img.data, prof = lgProfile();
  const hw = w / 2, hh = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw, py = y + 0.5 - hh, qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
      let dist, nx, ny;
      if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy); dist = r - l; nx = qx / l; ny = qy / l; }
      else if (qx > qy) { dist = r - qx; nx = 1; ny = 0; }
      else { dist = r - qy; nx = 0; ny = 1; }
      let dx = 0, dy = 0;
      if (dist >= 0 && dist < bezel) {
        const v = prof[Math.round((dist / bezel) * 128)];
        dx = Math.sign(px) * nx * v;
        dy = Math.sign(py) * ny * v;
      }
      const i = (y * w + x) * 4;
      d[i] = 128 + dx * 127;
      d[i + 1] = 128 + dy * 127;
      d[i + 2] = 128;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

function lgFilterId(w, h, r) {
  const id = `lg-${w}x${h}r${r}`;
  if (lg.filters.has(id)) return id;
  if (!lg.svg) {
    lg.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    lg.svg.setAttribute("aria-hidden", "true");
    lg.svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    document.body.appendChild(lg.svg);
  }
  // 斜面宽度跟着短边走：小按钮整个半高都是弧面，大面板只有边缘一圈。最大位移约为斜面的一半
  const bezel = Math.max(6, Math.min(Math.min(w, h) / 2, Math.max(r, 14), 30));
  const scale = bezel * 1.1;
  const f = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  f.id = id;
  f.setAttribute("x", "0");
  f.setAttribute("y", "0");
  f.setAttribute("width", w);
  f.setAttribute("height", h);
  f.setAttribute("filterUnits", "userSpaceOnUse");
  f.setAttribute("primitiveUnits", "userSpaceOnUse");
  f.setAttribute("color-interpolation-filters", "sRGB");
  f.innerHTML = `<feImage href="${lgMapUrl(w, h, r, bezel)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>
    <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale.toFixed(1)}" xChannelSelector="R" yChannelSelector="G"/>`;
  lg.svg.appendChild(f);
  lg.filters.set(id, f);
  return id;
}

function lgRadius(el, w, h) {
  const raw = getComputedStyle(el).borderTopLeftRadius;
  const r = raw.endsWith("%") ? (parseFloat(raw) / 100) * Math.min(w, h) : parseFloat(raw) || 0;
  return Math.round(Math.min(r, w / 2, h / 2));
}

// 尺寸变了：已有这个尺寸的滤镜就直接换；没有就先退回不折射的玻璃，停下来 150ms 再算贴图，
// 拖窗口时侧边栏每帧都在变高，不能每帧都画一张新贴图
function lgApply(el) {
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h || w * h > LG_MAX_AREA || currentLayout() !== "glass") { el.style.removeProperty("--lgRefract"); return; }
  const r = lgRadius(el, w, h);
  if (lg.filters.has(`lg-${w}x${h}r${r}`) || !lg.sized.has(el) || lg.ready.has(el)) {
    lg.sized.add(el);
    lg.ready.delete(el);
    el.style.setProperty("--lgRefract", `url(#${lgFilterId(w, h, r)})`);
    return;
  }
  el.style.removeProperty("--lgRefract");
  clearTimeout(lg.pending.get(el));
  lg.pending.set(el, setTimeout(() => { lg.pending.delete(el); if (lg.tracked.has(el)) { lg.ready.add(el); lgApply(el); } }, 150));
}

// 不再被任何玻璃用到的滤镜清掉，免得窗口拖来拖去攒下一堆不同尺寸的贴图
function lgPrune() {
  if (lg.filters.size < 120) return;
  const used = new Set();
  lg.tracked.forEach((el) => { const m = /#(lg-[^)]+)/.exec(el.style.getPropertyValue("--lgRefract")); if (m) used.add(m[1]); });
  lg.filters.forEach((f, id) => { if (!used.has(id)) { f.remove(); lg.filters.delete(id); } });
}

function lgScan() {
  if (lg.raf) cancelAnimationFrame(lg.raf);
  lg.raf = 0;
  const on = currentLayout() === "glass";
  lg.tracked.forEach((el) => { if (!on || !el.isConnected || !el.matches(LG_SELECTOR)) { lg.ro.unobserve(el); lg.tracked.delete(el); el.style.removeProperty("--lgRefract"); } });
  if (!on) return;
  document.querySelectorAll(LG_SELECTOR).forEach((el) => {
    if (lg.tracked.has(el)) return;
    lg.tracked.add(el);
    lg.ro.observe(el); // observe 会立刻回调一次，第一次的贴图就在那里算
  });
  lgPrune();
}

function lgSchedule() { if (!lg.raf) lg.raf = requestAnimationFrame(lgScan); }

// 选中片“流”过去：点侧边栏 / 分段控件时记下当前选中片的位置；重新渲染出新的选中片后，在组里垫一块“影子”玻璃，
// 从旧位置滑到新位置——半路顺着移动方向拉长、另一个方向收窄，像一滴液体被拖过去，最后弹簧落定，再换回真正的选中片。
// 影子垫在组的最底层（z-index:-1），所以途经的每个页签文字都浮在它上面；半路影子变淡（像 iOS 26 拖动时选中块变成一块透镜），
// 经过的文字不会被底色吃掉；目标页签的文字颜色也跟着从普通色渐变到选中色
const LG_MORPH_GROUP = "#appNav, .modeToggle, .viewToggle";
const LG_MORPH_ITEM = "#appNav .tab, .modeToggle .modeBtn, .viewToggle .viewBtn";
function lgMorphStart(e) {
  const item = e.target.closest && e.target.closest(LG_MORPH_ITEM);
  if (!item || currentLayout() !== "glass") return;
  const group = item.closest(LG_MORPH_GROUP), from = group && group.querySelector(".active");
  if (!from || from === item) return;
  lg.morph = { group: group.id ? "#" + group.id : "." + [...group.classList].join("."), rect: from.getBoundingClientRect(), t: performance.now() };
}
function lgMorphFinish() {
  const m = lg.morph;
  if (!m) return;
  if (performance.now() - m.t > 1200) { lg.morph = null; return; }
  const cx = m.rect.left + m.rect.width / 2, cy = m.rect.top + m.rect.height / 2;
  const group = [...document.querySelectorAll(m.group)].find((g) => {
    const r = g.getBoundingClientRect();
    return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
  });
  const to = group && group.querySelector(".active");
  if (!to) return;
  const r = to.getBoundingClientRect(), dx = m.rect.left - r.left, dy = m.rect.top - r.top;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return; // 还没重新渲染，等下一次
  lg.morph = null;
  const g = group.getBoundingClientRect();
  const ghost = document.createElement("span");
  ghost.className = "lgGhost";
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.cssText = `left:${r.left - g.left - group.clientLeft + group.scrollLeft}px;top:${r.top - g.top - group.clientTop + group.scrollTop}px;width:${r.width}px;height:${r.height}px;border-radius:${getComputedStyle(to).borderTopLeftRadius}`;
  group.appendChild(ghost);
  to.classList.add("lgArriving");
  const sx = m.rect.width / r.width, sy = m.rect.height / r.height, vertical = Math.abs(dy) > Math.abs(dx);
  const mid = vertical ? `scale(${((sx + 1) / 2) * 0.9},${((sy + 1) / 2) * 1.18})` : `scale(${((sx + 1) / 2) * 1.14},${((sy + 1) / 2) * 0.9})`;
  const idle = [...group.querySelectorAll(LG_MORPH_ITEM)].find((el) => el !== to && el.closest(LG_MORPH_GROUP) === group);
  const done = () => { ghost.remove(); to.classList.remove("lgArriving"); };
  try {
    const spring = getComputedStyle(document.documentElement).getPropertyValue("--lgSpring").trim() || "ease-out";
    ghost.animate([
      { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity: 1 },
      { transform: `translate(${dx * 0.4}px,${dy * 0.4}px) ${mid}`, opacity: 0.45, offset: 0.4 },
      { transform: "none", opacity: 1 },
    ], { duration: 560, easing: spring }).finished.then(done, done);
    if (idle) to.animate([{ color: getComputedStyle(idle).color }, { color: getComputedStyle(to).color }], { duration: 260, easing: "ease-in" });
  } catch (err) { done(); } // 不支持 linear() 的浏览器直接跳到新位置
}

// 宽屏的玻璃布局往下滚时，顶栏按钮组停在右上角浮着，内容从它下面滚过去（边缘折射就在这里看得最清楚）；
// 页面大标题收成左上角一行小字，顶上一条渐隐带把滚上来的内容压暗一点。
// 切换点取“按钮组刚好滚到浮动位置”的那一刻，所以按钮看起来只是停住了，没有跳一下
function lgOnScroll() {
  const d = document.documentElement.dataset, hdr = document.getElementById("appHeader");
  const actions = hdr && hdr.querySelector(".headerActions");
  const floating = "lgScrolled" in d;
  if (currentLayout() !== "glass" || innerWidth < 900 || !actions) {
    if (floating) { delete d.lgScrolled; if (hdr) hdr.style.minHeight = ""; }
    return;
  }
  if (!floating) lg.floatAt = actions.getBoundingClientRect().top + scrollY - 12;
  const on = scrollY > lg.floatAt;
  if (on === floating) return;
  if (on) { hdr.style.minHeight = hdr.offsetHeight + "px"; d.lgScrolled = ""; } // 按钮组离开文档流后顶栏高度不变，下面的内容不跳
  else { delete d.lgScrolled; hdr.style.minHeight = ""; }
}

// 指针光：鼠标在玻璃控件上移动时，记下相对位置给 CSS 画一团跟着走的柔光（苹果叫 illumination）
function lgPointer(e) {
  const el = e.target.closest && e.target.closest("[data-glass] :is(.lgInteractive, #appHeader .headerActions :is(.btn,.themeToggle,.modeBtn), #appNav .tab, #tabBody .btn, .overlay .btn)");
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--lgX", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
  el.style.setProperty("--lgY", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
}

function initLiquidGlass() {
  document.addEventListener("pointermove", lgPointer, { passive: true });
  window.addEventListener("scroll", lgOnScroll, { passive: true });
  window.addEventListener("resize", lgOnScroll, { passive: true });
  new MutationObserver(lgOnScroll).observe(document.documentElement, { attributes: true, attributeFilter: ["data-layout", "data-glass"] });
  if (!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    document.addEventListener("pointerdown", lgMorphStart, true);
    document.addEventListener("click", () => requestAnimationFrame(lgMorphFinish));
    new MutationObserver(lgMorphFinish).observe(document.body, { childList: true, subtree: true });
  }
  if (!lgRefractionSupported() || typeof ResizeObserver === "undefined") return;
  lg.ro = new ResizeObserver((entries) => entries.forEach((en) => lgApply(en.target)));
  new MutationObserver(lgSchedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  // 换布局时立刻扫一遍，不等下一帧：切走玻璃的那一刻就把折射摘干净
  new MutationObserver(lgScan).observe(document.documentElement, { attributes: true, attributeFilter: ["data-layout", "data-glass"] });
  lgSchedule();
}

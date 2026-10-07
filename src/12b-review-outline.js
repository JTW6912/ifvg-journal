/* ============================================================
   复盘正文的「目录」和「折叠章节」

   目录：直接从正文 DOM 里读顶层的 h1–h6。编辑态读的是 Tiptap 的 DOM，只读态和编辑器
   加载中读的是 renderMarkdown 出来的静态 HTML——两边都是 .reviewDoc 下面一排块元素，
   读法一样，所以三种情况共用这一套。
   - 宽屏（≥1240px）钉在正文右边，可以收起，收没收记在 localStorage；
     窄屏放不下，收进顶栏的按钮，点开是下拉面板，点完一项自动收起。
   - 目录画进 #reviewOutline 原地更新，不走 render()——跟编辑器其它浮层同一个规矩。
   - 缩进按相对层级算：整篇最高只用到 H2，H2 就顶格。

   折叠：纯显示层，不进文档、不进撤销栈、更不写进 markdown。折了哪几节单独存在
   journal_reviews.folded_headings 上，下次打开还是折着（见下面 writeReviewFolds）。
   ProseMirror 插件状态里记着「哪几个标题折起来了」（位置，随编辑映射），再用 node
   decoration 给它下面、直到同级或更高级标题之前的块挂上 foldHidden。
   光标一旦落进被藏起来的地方（撤销、方向键、目录跳转），就自动展开那一节，
   免得在看不见的地方打字。所以在折起来的标题末尾按回车，新行开在标题正下方、这一节随之展开——
   markdown 里标题下面到下一个同级标题之前都算这一节，没法像 Notion 那样把新行开在节外面。
   ⚠️ 别直接改编辑器 DOM 的 class：ProseMirror 的 MutationObserver 会当成用户改了内容、
   重新解析那个节点。所以目录跳转后「闪一下」是另画一层高亮，不碰标题元素本身。
   ============================================================ */
const OUTLINE_WIDE_MQ = "(min-width: 1240px)";   // 跟 style.css 里 .reviewOutline 的断点对齐
const OUTLINE_PIN_KEY = "journal_review_outline";
const OUTLINE_SCROLL_GAP = 72;                     // 跳过去时标题上面留多少：让出 48px 的 sticky 顶栏再多一点

let reviewOutlinePinned = (function () {
  try { return localStorage.getItem(OUTLINE_PIN_KEY) !== "off"; } catch (e) { return true; }
})();
let reviewOutlinePopOpen = false;   // 窄屏的下拉面板
let reviewOutlineHeads = [];        // [{ el, level, text, hidden }]
let reviewOutlineKey = null;        // 目录内容没变就不重画（保住 hover 和目录自己的滚动位置）
let reviewOutlineActive = -2;
let reviewOutlineTimer = null;
let reviewOutlineRaf = 0;
/* 点目录跳过去的那一项：一直亮着，直到页面被别的原因滚走（用户自己滚、关掉大图时把图对齐到屏幕中间）。
   { idx, target, t0, arrived }。没有它的话，一节很短时下一节的标题也越过了中线，刚点的那项反而不亮 */
let reviewOutlineJump = null;
let reviewFlashTimer = null;

function outlineIsWide() { return !!(window.matchMedia && window.matchMedia(OUTLINE_WIDE_MQ).matches); }
function outlinePrefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function resetReviewOutline() {
  reviewOutlineJump = null;
  clearTimeout(reviewOutlineTimer);
  reviewOutlineTimer = null;
  reviewOutlinePopOpen = false;
  reviewOutlineHeads = [];
  reviewOutlineKey = null;
  reviewOutlineActive = -2;
}

function collectReviewHeadings() {
  const doc = document.querySelector("#reviewScroller .reviewDoc");
  if (!doc) return [];
  const out = [];
  for (const el of doc.children) {
    if (!/^H[1-6]$/.test(el.tagName)) continue;
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) continue;   // 刚打了 # 还没写字的空标题
    out.push({ el, level: +el.tagName[1], text, hidden: el.classList.contains("foldHidden") });
  }
  return out;
}

/* 打字时停手 150ms 再刷新目录，不是每敲一个键都重算 */
function scheduleReviewOutline(ms) {
  clearTimeout(reviewOutlineTimer);
  reviewOutlineTimer = setTimeout(refreshReviewOutline, ms == null ? 150 : ms);
}

function refreshReviewOutline() {
  clearTimeout(reviewOutlineTimer);
  reviewOutlineTimer = null;
  const nav = document.getElementById("reviewOutline");
  const btn = document.getElementById("reviewOutlineBtn");
  if (!nav || !editingReview) return;
  const heads = collectReviewHeadings();
  reviewOutlineHeads = heads;
  const has = heads.length > 0;
  if (!has) reviewOutlinePopOpen = false;
  const wide = outlineIsWide();
  const show = has && (wide ? reviewOutlinePinned : reviewOutlinePopOpen);
  if (btn) {
    btn.hidden = !has;
    btn.classList.toggle("on", show);
    btn.title = T(show ? "review.outline.hide" : "review.outline.show");
  }
  nav.hidden = !show;
  nav.classList.toggle("isPop", !wide);
  if (!show) { reviewOutlineKey = null; return; }

  const title = reviewTitleOf(editingReview);
  const key = [wide, title, ...heads.map((h) => h.level + (h.hidden ? "h" : "") + ":" + h.text)].join("\u0000");
  if (key !== reviewOutlineKey) {
    reviewOutlineKey = key;
    reviewOutlineActive = -2;
    const min = Math.min(...heads.map((h) => h.level));
    nav.innerHTML = `<div class="outlineHead">
        <span>${esc(T("review.outline.title"))}</span>
        <button class="outlineClose" data-action="review-outline-toggle" title="${esc(T("review.outline.hide"))}">${ICONS.x}</button>
      </div>
      <div class="outlineList" id="reviewOutlineList">
        <button class="outlineItem outlineTop" data-action="review-outline-go" data-idx="-1" title="${esc(T("review.outline.top"))}">${ICONS.up}<span>${esc(title)}</span></button>
        ${heads.map((h, i) => `<button class="outlineItem d${Math.min(h.level - min, 3)}${h.hidden ? " isHidden" : ""}" data-action="review-outline-go" data-idx="${i}"
            title="${esc(h.hidden ? T("review.outline.inFold", { text: h.text }) : h.text)}"><span>${esc(h.text)}</span></button>`).join("")}
      </div>`;
  }
  updateReviewOutlineActive();
}

/* 点目录跳过去之后还算不算「刚跳过去」：滚到目标位置之前一直算；到了之后再被滚走（偏开几像素以上）就不算了。
   平滑滚动被打断、迟迟到不了的，1.2 秒后也当作已经到了，免得一直钉着 */
function reviewOutlineJumpIdx(sc) {
  const j = reviewOutlineJump;
  if (!j) return null;
  const target = Math.min(j.target, Math.max(0, sc.scrollHeight - sc.clientHeight));
  const near = Math.abs(sc.scrollTop - target) <= 3;
  if (near) j.arrived = true;
  else if (j.arrived || Date.now() - j.t0 > 1200) { reviewOutlineJump = null; return null; }
  return j.idx;
}

/* 滚动时高亮「现在在哪一节」：屏幕正中间那块内容属于哪一节。
   以前看的是「最后一个越过顶栏下面那条线的标题」，但关掉大图时页面会把那张图对齐到屏幕中间，
   图上面的标题落到了下半屏、没过线，目录就亮成了上一节（用户反馈）。看中线就跟「正在看的东西」对得上 */
function updateReviewOutlineActive() {
  const nav = document.getElementById("reviewOutline");
  const sc = document.getElementById("reviewScroller");
  if (!nav || nav.hidden || !sc || !reviewOutlineHeads.length) return;
  const scRect = sc.getBoundingClientRect();
  const line = scRect.top + Math.max(OUTLINE_SCROLL_GAP + 16, sc.clientHeight / 2);
  let idx = -1;
  const atBottom = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4;
  reviewOutlineHeads.forEach((h, i) => {
    if (h.hidden || !h.el.isConnected) return;
    const top = h.el.getBoundingClientRect().top;
    // 滚到底了，最后几节可能永远到不了中线——那就算屏幕里能看到的最后一个
    if (top <= line || (atBottom && top < scRect.bottom - 40)) idx = i;
  });
  const jumped = reviewOutlineJumpIdx(sc);
  if (jumped !== null) idx = jumped;
  if (idx === reviewOutlineActive) return;
  reviewOutlineActive = idx;
  nav.querySelectorAll(".outlineItem").forEach((b) => b.classList.toggle("active", +b.dataset.idx === idx));
  // 目录太长自己出滚动条时，让高亮那项留在可视范围里。不用 scrollIntoView：它会连外层一起滚
  const list = document.getElementById("reviewOutlineList");
  const act = nav.querySelector(".outlineItem.active");
  if (!list || !act) return;
  const top = act.offsetTop, bottom = top + act.offsetHeight;
  if (top < list.scrollTop) list.scrollTop = top - 8;
  else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 8;
}
function onReviewOutlineScroll() {
  if (reviewOutlineRaf) return;
  reviewOutlineRaf = requestAnimationFrame(() => { reviewOutlineRaf = 0; updateReviewOutlineActive(); });
}

function toggleReviewOutline() {
  if (outlineIsWide()) {
    reviewOutlinePinned = !reviewOutlinePinned;
    try { localStorage.setItem(OUTLINE_PIN_KEY, reviewOutlinePinned ? "on" : "off"); } catch (e) {}
  } else {
    reviewOutlinePopOpen = !reviewOutlinePopOpen;
  }
  refreshReviewOutline();
}
function closeReviewOutlinePop() {
  if (!reviewOutlinePopOpen) return false;
  reviewOutlinePopOpen = false;
  refreshReviewOutline();
  return true;
}

/* 点目录里的一项：平滑滚过去，再让那个标题闪一下，方便眼睛找到 */
function reviewOutlineGo(idx) {
  const sc = document.getElementById("reviewScroller");
  if (!sc) return;
  const behavior = outlinePrefersReducedMotion() ? "auto" : "smooth";
  if (idx < 0) {
    reviewOutlineJump = { idx: -1, target: 0, t0: Date.now(), arrived: false };
    sc.scrollTo({ top: 0, behavior });
    updateReviewOutlineActive();
    closeReviewOutlinePop();
    return;
  }
  const h = reviewOutlineHeads[idx];
  if (!h) return;
  let el = h.el;
  if (h.hidden) {
    // 藏在折起来的章节里：先把外面那层展开，不然 display:none 的元素没有位置可滚
    revealReviewFold(el);
    refreshReviewOutline();
    if (!el.isConnected) {
      const again = reviewOutlineHeads.find((x) => x.text === h.text && x.level === h.level);
      if (!again) return;
      el = again.el;
    }
  }
  const top = Math.max(0, el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - OUTLINE_SCROLL_GAP);
  reviewOutlineJump = { idx: reviewOutlineHeads.findIndex((x) => x.el === el), target: top, t0: Date.now(), arrived: false };
  if (reviewOutlineJump.idx < 0) reviewOutlineJump = null;
  sc.scrollTo({ top, behavior });
  updateReviewOutlineActive();
  flashReviewHeading(el);
  closeReviewOutlinePop();
}

function flashReviewHeading(el) {
  const page = document.querySelector("#reviewScroller .reviewPage");
  if (!page || !el) return;
  let fl = document.getElementById("reviewOutlineFlash");
  if (!fl) {
    fl = document.createElement("div");
    fl.id = "reviewOutlineFlash";
    fl.className = "outlineFlash";
    page.appendChild(fl);
  }
  const pr = page.getBoundingClientRect(), r = el.getBoundingClientRect();
  fl.style.top = Math.round(r.top - pr.top - 4) + "px";
  fl.style.height = Math.round(r.height + 8) + "px";
  fl.classList.remove("on");
  void fl.offsetWidth;   // 连点同一项也要重新播一遍动画
  fl.classList.add("on");
  clearTimeout(reviewFlashTimer);
  reviewFlashTimer = setTimeout(() => fl.classList.remove("on"), 1400);
}

/* 窄屏的下拉面板：点外面就收起 */
document.addEventListener("mousedown", (e) => {
  if (!reviewOutlinePopOpen) return;
  const t = e.target;
  if (t && t.closest && (t.closest("#reviewOutline") || t.closest("#reviewOutlineBtn"))) return;
  closeReviewOutlinePop();
});
/* 拖窗口宽窄会在「侧栏」和「下拉」之间切换 */
window.addEventListener("resize", () => { if (editingReview) scheduleReviewOutline(80); });

/* ============================================================
   折叠章节（ProseMirror 插件）
   ============================================================ */
let reviewFoldKey = null;

/* 算出每个顶层标题管到哪儿：从它后面一直到下一个同级或更高级的标题 */
function foldLayout(doc, folds) {
  const blocks = [];
  doc.forEach((node, offset) => blocks.push({ node, pos: offset }));
  const want = new Set(folds);
  const heads = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.node.type.name !== "heading") continue;
    const lv = b.node.attrs.level || 1;
    let j = i + 1;
    while (j < blocks.length && !(blocks[j].node.type.name === "heading" && (blocks[j].node.attrs.level || 1) <= lv)) j++;
    const start = b.pos + b.node.nodeSize;
    const end = j < blocks.length ? blocks[j].pos : doc.content.size;
    // 空标题、或者下面什么都没有的标题，没东西可折
    const foldable = end > start && !!b.node.textContent.trim();
    heads.push({
      pos: b.pos, start, end, foldable, folded: foldable && want.has(b.pos),
      level: lv, text: b.node.textContent.replace(/\s+/g, " ").trim(),
    });
  }
  return { blocks, heads };
}

/* 存库用的「标题身份」：级别 + 文字 + 同级同名标题里的第几个。不存位置——
   前面多写一段，位置全变，文字不变。heads: [{ pos, level, text, folded }] */
function foldKeysOf(heads) {
  const seen = {};
  const out = [];
  heads.forEach((h) => {
    const k = h.level + ":" + h.text;
    const n = seen[k] = seen[k] === undefined ? 0 : seen[k] + 1;
    if (h.folded) out.push({ l: h.level, t: h.text, n });
  });
  return out;
}
/* 反过来：库里那份 → 现在这篇文档里对应标题的位置。对不上的（标题改了字、删了）直接忽略 */
function foldPositionsFromKeys(heads, keys) {
  const want = new Set((Array.isArray(keys) ? keys : [])
    .filter((k) => k && Number.isInteger(k.l) && typeof k.t === "string" && Number.isInteger(k.n))
    .map((k) => k.l + ":" + k.n + ":" + k.t));
  if (!want.size) return [];
  const seen = {};
  const out = [];
  heads.forEach((h) => {
    const k = h.level + ":" + h.text;
    const n = seen[k] = seen[k] === undefined ? 0 : seen[k] + 1;
    if (want.has(h.level + ":" + n + ":" + h.text)) out.push(h.pos);
  });
  return out;
}

function reviewFoldExtension(L) {
  const key = new L.PluginKey("reviewFold");
  reviewFoldKey = key;
  const build = (doc, folds) => {
    const { blocks, heads } = foldLayout(doc, folds);
    const decos = [];
    const hidden = heads.filter((h) => h.folded).map((h) => [h.start, h.end]);
    heads.forEach((h) => {
      if (h.foldable) decos.push(L.Decoration.node(h.pos, h.start, { class: h.folded ? "hasFold isFolded" : "hasFold" }));
    });
    if (hidden.length) {
      blocks.forEach((b) => {
        if (hidden.some(([s, e]) => b.pos >= s && b.pos < e)) {
          decos.push(L.Decoration.node(b.pos, b.pos + b.node.nodeSize, { class: "foldHidden" }));
        }
      });
    }
    return { folds: heads.filter((h) => h.folded).map((h) => h.pos), heads, deco: L.DecorationSet.create(doc, decos) };
  };
  return L.Extension.create({
    name: "reviewFold",
    addProseMirrorPlugins() {
      return [new L.Plugin({
        key,
        state: {
          // 打开时按库里存的折叠状态折好（editingReview 在创建编辑器之前就已经是这一篇了）
          init: (_, state) => build(state.doc,
            foldPositionsFromKeys(foldLayout(state.doc, []).heads, editingReview && editingReview.folded_headings)),
          apply: (tr, prev, _old, state) => {
            const meta = tr.getMeta(key);
            if (!tr.docChanged && !meta && !tr.selectionSet) return prev;
            let folds = prev.folds;
            if (tr.docChanged) folds = folds.map((p) => tr.mapping.map(p));
            if (meta && meta.toggle != null) {
              folds = folds.includes(meta.toggle) ? folds.filter((p) => p !== meta.toggle) : folds.concat(meta.toggle);
            }
            let next = tr.docChanged || meta ? build(state.doc, [...new Set(folds)]) : prev;
            // 光标（或目录要跳去的位置）落在藏起来的地方：把包着它的那几层全展开
            const targets = [state.selection.from];
            if (meta && meta.reveal != null) targets.push(meta.reveal);
            const drop = next.heads.filter((h) => h.folded && targets.some((p) => p >= h.start && p < h.end)).map((h) => h.pos);
            if (drop.length) next = build(state.doc, next.folds.filter((p) => !drop.includes(p)));
            return next;
          },
        },
        props: { decorations: (state) => key.getState(state).deco },
      })];
    },
  });
}

function reviewFoldState() {
  const ed = reviewTiptap;
  return ed && reviewFoldKey ? reviewFoldKey.getState(ed.state) : null;
}

function toggleReviewFold(headPos) {
  const ed = reviewTiptap;
  const st = reviewFoldState();
  if (!ed || !st || !tiptapLib) return;
  const h = st.heads.find((x) => x.pos === headPos);
  if (!h || !h.foldable) return;
  const tr = ed.state.tr.setMeta(reviewFoldKey, { toggle: headPos });
  if (!h.folded) {
    // 光标在要折起来的那一段里：先挪到标题末尾，不然马上又会被「光标进了折叠区就展开」弹开
    const sel = ed.state.selection;
    if (sel.to > h.start && sel.from < h.end) tr.setSelection(tiptapLib.TextSelection.create(tr.doc, h.start - 1));
  }
  ed.view.dispatch(tr);
}

function revealReviewFold(el) {
  const ed = reviewTiptap;
  if (!ed || !reviewFoldKey) return;
  try { ed.view.dispatch(ed.state.tr.setMeta(reviewFoldKey, { reveal: ed.view.posAtDOM(el, 0) })); } catch (e) {}
}

/* 标题左边的小箭头是 ::after 画的、挂在标题元素上，点它时 target 就是标题本身；
   点在标题文字的左边界外面 = 点的是箭头 */
function reviewFoldMouseDown(view, e) {
  if (e.button !== 0) return false;
  const h = e.target && e.target.closest && e.target.closest(".hasFold");
  if (!h || h.parentElement !== view.dom) return false;
  if (e.clientX >= h.getBoundingClientRect().left) return false;
  e.preventDefault();
  try { toggleReviewFold(view.posAtDOM(h, 0) - 1); } catch (err) {}
  return true;
}

/* ---------- 折叠状态存库 ----------
   单独 update 这一列，不走 persistReview：不碰 updated_at（折一下不算「编辑过」，列表里的
   「编辑于」不该跳），也不跟正文保存绑在一起。停手 800ms 写一次，内容和库里一样就不写。
   新帖还没插进库时先只记在 editingReview 上，第一次保存成功后 flushReviewSave 会补写。 */
let reviewFoldSaveTimer = null;
let reviewFoldFor = null;        // 排这次保存时是哪一篇——跟 reviewBodyFor 同一个道理
let reviewFoldsInDb = "[]";      // 库里现在那份（JSON），打开编辑器时设

function scheduleReviewFoldSave() {
  if (!editingReview || viewingUserId) return;
  reviewFoldFor = editingReview;
  clearTimeout(reviewFoldSaveTimer);
  reviewFoldSaveTimer = setTimeout(writeReviewFolds, 800);
}
function flushReviewFolds() {
  return reviewFoldSaveTimer ? writeReviewFolds() : Promise.resolve();
}
async function writeReviewFolds() {
  clearTimeout(reviewFoldSaveTimer);
  reviewFoldSaveTimer = null;
  const rev = reviewFoldFor || editingReview;
  reviewFoldFor = null;
  const st = reviewFoldState();
  if (!rev || !st || viewingUserId || !sb || !session) return;
  const keys = foldKeysOf(st.heads);   // 同步取，取完编辑器被销毁也不要紧
  rev.folded_headings = keys;
  const json = JSON.stringify(keys);
  if (json === reviewFoldsInDb || rev._isNew) return;
  const table = isPbDoc(rev) ? "journal_playbook" : "journal_reviews";   // 模型库页面也用这个编辑器
  const { error } = await sb.from(table).update({ folded_headings: keys }).eq("id", rev.id).eq("user_id", session.user.id);
  if (error) {
    console.error(error);
    if (rev === editingReview) {
      reviewSaveError = noteDbError(error) ? T("error.dbOutdated") : T("review.saveFailed", { msg: error.message });
      updateReviewSaveBadge();
    }
    return;
  }
  if (rev === editingReview) reviewFoldsInDb = json;
  const r = reviews.find((x) => x.id === rev.id) || pbFind(rev.id);
  if (r) r.folded_headings = keys;
}

/* 笔记页下面的交易区比正文里那一长串胶囊好用，第一次打开一条笔记时把「涉及的交易」那一节折起来，
   正文就只剩用户自己写的「想验证什么 / 结论」。只折一次（记在 localStorage）：用户展开之后不再替他折；
   已经存过折叠状态的笔记也不动 */
const PB_AUTOFOLD_KEY = "journal_pb_autofold";
function pbMaybeAutoFoldTrades() {
  const d = editingReview;
  if (!d || !pbIsNote(d) || reviewIsReadOnly() || !reviewFoldKey) return;
  let done;
  try { done = JSON.parse(localStorage.getItem(PB_AUTOFOLD_KEY) || "[]"); } catch (e) { done = []; }
  if (!Array.isArray(done)) done = [];
  if (done.includes(d.id)) return;
  const remember = () => { done.push(d.id); try { localStorage.setItem(PB_AUTOFOLD_KEY, JSON.stringify(done.slice(-500))); } catch (e) {} };
  if ((d.folded_headings || []).length) { remember(); return; }
  const st = reviewFoldState();
  const names = pbHeadingNames("pb.tpl.mistakeTrades").map((n) => n.toLowerCase());
  const h = st && st.heads.find((x) => x.foldable && !x.folded && names.includes(String(x.text || "").toLowerCase()));
  if (!h || extractTradeRefs(d.body).length < 3) return;   // 只有一两笔时折起来反而看不到
  toggleReviewFold(h.pos);
  remember();
}

/* ============================================================
   复盘编辑器 —— Notion 式所见即所得（Tiptap / ProseMirror）

   以前是「左边 textarea 写 markdown、右边实时预览」，外加只读/编辑两种模式。
   现在只有一张纸：打 `# ` 就变标题、`- [ ] ` 就变待办、选中文字浮出格式栏、
   打 / 调出插入菜单。只读只留给管理员查看别人数据的时候。

   几条关键约定：
   - **库里存的还是 markdown**（journal_reviews.body 一个字都不用迁移）。
     打开时 markdown → renderMarkdown(src, true) → Tiptap 解析；
     每次编辑后 getJSON() → docToMarkdown() → 存回去。两个方向共用 renderMarkdown
     那一套规则，所以卡片摘要、搜索、extractTradeRefs、管理员只读视图全都不用改。
   - **安全防线不变**：喂给 Tiptap 的 HTML 来自 renderMarkdown（先 esc() 再排版），
     Tiptap 本身又只认 schema 里定义过的节点——两道白名单。链接和图片只放行 http(s)。
   - **编辑器有自己的根节点 #reviewEditorRoot**，reviewEditorRenderedFor 守卫防止后台
     render() 把它重建。编辑器开着的时候任何状态变化都不许走 render() 重建它，
     浮层（格式栏、插入菜单、小弹框）都画进 #reviewFloatRoot 里定点更新。
   - **中文输入法**：交给 ProseMirror 处理组字（这正是用成熟库而不是自己写
     contenteditable 的理由）。我们自己的 keydown 分支一律先看 isComposing / view.composing。
   - 撤销/重做是 ProseMirror 自己的历史栈，Ctrl+Z 天然可用。
   - Tiptap 打成了同源的 vendor/tiptap.js，第一次打开编辑器时才 import()；
     加载失败就退回纯文本框写 markdown，内容照常保存，不会把人卡住。
   ============================================================ */
const TIPTAP_URL = "./vendor/tiptap.js?v=3.31.3-2";   // -2：多导出了 Decoration / DecorationSet（折叠章节要用）
let tiptapLib = null;
let tiptapLoading = null;
function loadTiptap() {
  if (tiptapLib) return Promise.resolve(tiptapLib);
  if (!tiptapLoading) {
    tiptapLoading = import(TIPTAP_URL)
      .then((m) => { tiptapLib = m; return m; })
      .catch((err) => { tiptapLoading = null; throw err; });   // 失败了下次还能重试
  }
  return tiptapLoading;
}

const SLASH_ITEMS = [
  { cmd: "text",  labelKey: "review.slash.text",  keys: ["text", "p", "paragraph", "正文", "zhengwen", "wenzi"] },
  { cmd: "h1",    labelKey: "review.slash.h1",    keys: ["h1", "heading", "title", "标题", "biaoti"] },
  { cmd: "h2",    labelKey: "review.slash.h2",    keys: ["h2", "subheading", "小标题"] },
  { cmd: "h3",    labelKey: "review.slash.h3",    keys: ["h3", "小小标题"] },
  { cmd: "ul",    labelKey: "review.slash.ul",    keys: ["ul", "list", "bullet", "列表", "liebiao"] },
  { cmd: "ol",    labelKey: "review.slash.ol",    keys: ["ol", "number", "ordered", "编号", "有序"] },
  { cmd: "task",  labelKey: "review.slash.task",  keys: ["task", "todo", "check", "待办", "daiban"] },
  { cmd: "quote", labelKey: "review.slash.quote", keys: ["quote", "引用", "yinyong"] },
  { cmd: "code",  labelKey: "review.slash.code",  keys: ["code", "代码", "daima"] },
  { cmd: "hr",    labelKey: "review.slash.hr",    keys: ["hr", "divider", "line", "分割线", "fenge"] },
  { cmd: "table", labelKey: "review.slash.table", keys: ["table", "表格", "biaoge"] },
  { cmd: "image", labelKey: "review.slash.image", keys: ["image", "img", "photo", "pic", "图片", "tupian"] },
  { cmd: "link",  labelKey: "review.slash.link",  keys: ["link", "url", "链接", "lianjie"] },
  { cmd: "color", labelKey: "review.slash.color", keys: ["color", "颜色", "yanse", "红", "绿", "highlight", "高亮"] },
  { cmd: "trade", labelKey: "review.slash.trade", keys: ["trade", "交易", "jiaoyi", "复盘", "关联"] },
];
const SLASH_MENU_WIDTH = 230;   // 跟 style.css 里 .slashMenu 的 width / max-height 对齐
const SLASH_MENU_MAX_H = 300;
const SLASH_ICONS = {
  text: "pencil", h1: "tbHeading", h2: "tbHeading", h3: "tbHeading", ul: "tbUl", ol: "tbOl", task: "tbTask",
  quote: "tbQuote", code: "tbCode", hr: "tbHr", table: "tbTable", image: "tbImage", link: "tbLink",
  color: "tbColor", trade: "grid",
};

/* 只有「有没有编辑权」一种判定了：管理员只读查看别人的数据时为 false。
   reviewIsReadOnly() 留着是因为关联日/周那几个处理器在用，语义一样。 */
function reviewCanEdit() { return !viewingUserId; }
function reviewIsReadOnly() { return !reviewCanEdit(); }

function slashFilteredItems() {
  const q = ((slashMenu && slashMenu.query) || "").toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter((it) =>
    it.keys.some((k) => k.toLowerCase().includes(q)) || T(it.labelKey).toLowerCase().includes(q));
}

function isMacLike() {
  const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
  return /mac|iphone|ipad/i.test(p);
}
function modKeyLabel() { return isMacLike() ? "⌘" : "Ctrl"; }

function reviewSaveBadgeHtml() {
  if (reviewSaveError) return `<span class="reviewSaveBadge err">${ICONS.alert} ${esc(reviewSaveError)}</span>`;
  if (reviewSaveState === "saving") return `<span class="reviewSaveBadge">${esc(T("review.saving"))}</span>`;
  if (reviewSaveState === "dirty") return `<span class="reviewSaveBadge dirty">${esc(T("review.unsaved"))}</span>`;
  if (reviewSaveState === "saved" && reviewSavedAt) {
    return `<span class="reviewSaveBadge ok">${esc(T("review.saved", { time: new Date(reviewSavedAt).toLocaleTimeString(localeTag(), { hour: "2-digit", minute: "2-digit" }) }))}</span>`;
  }
  return `<span class="reviewSaveBadge"></span>`;
}
function updateReviewSaveBadge() {
  const n = document.getElementById("reviewSaveSlot");
  if (n) n.innerHTML = reviewSaveBadgeHtml();
}

/* 关联日/周那一行。单独拆出来是因为改周只需要换这一行——
   重绘整个编辑器会把正在写的正文和光标一起冲掉。 */
function reviewWeekRowInnerHtml() {
  if (!editingReview) return "";
  // 只读态是拿来看的，一排禁用按钮纯属噪音——只留一枚说明关联到哪天/哪周的标签
  if (reviewIsReadOnly()) {
    return `<span class="reviewWeekTag ${reviewPeriodKind(editingReview) ? "on" : ""}">${esc(reviewPeriodTagText(editingReview))}</span>`
      + `<span class="reviewReadOnly">${esc(T("review.readOnly"))}</span>`;
  }
  const kind = reviewPeriodKind(editingReview);
  const day = editingReview.day_date || "";
  const week = editingReview.week_start || "";
  const seg = (k, labelKey) =>
    `<button class="tinyBtn ${kind === k ? "on" : ""}" data-action="review-period" data-kind="${k}">${esc(T(labelKey))}</button>`;

  let tail = "";
  if (kind === "day") {
    tail = `<button class="tinyBtn ${day === todayStr() ? "on" : ""}" data-action="review-day" data-day="today">${esc(T("review.dayToday"))}</button>
      <button class="tinyBtn ${day === yesterdayStr() ? "on" : ""}" data-action="review-day" data-day="yesterday">${esc(T("review.dayYesterday"))}</button>
      <input type="date" class="input reviewWeekDate" value="${esc(day)}" data-review-day-date />`;
  } else if (kind === "week") {
    tail = `<button class="tinyBtn ${week === thisMondayStr() ? "on" : ""}" data-action="review-week" data-week="this">${esc(T("review.weekThis"))}</button>
      <button class="tinyBtn ${week === lastMondayStr() ? "on" : ""}" data-action="review-week" data-week="last">${esc(T("review.weekLast"))}</button>
      <input type="date" class="input reviewWeekDate" value="${esc(week)}" data-review-week-date />`;
  }
  return `<span class="reviewWeekLabel">${esc(T("review.linkedPeriod"))}</span>
    <span class="reviewPeriodSeg">${seg("day", "review.periodDay")}${seg("week", "review.periodWeek")}${seg("", "review.periodNone")}</span>
    ${tail}`;
}
function refreshReviewWeekRow() {
  const row = document.getElementById("reviewWeekRow");
  if (row) row.innerHTML = reviewWeekRowInnerHtml();
}

/* ============================================================
   markdown ⇄ 编辑器
   ============================================================ */

/* 打开时：markdown → 编辑器能解析的 HTML。和只读渲染是同一套规则 */
function mdToEditorHtml(src) {
  return renderMarkdown(src, true) || "<p></p>";
}

/* 普通文字里要加反斜杠的字符。原则是「只转义真会被误读的」，
   省得存下来的 markdown 满屏反斜杠（搜索和摘要都直接读这份原文）。 */
function mdEscapeText(text, ctx) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i], prev = text[i - 1] || "", next = text[i + 1] || "";
    let e = false;
    if (c === "\\" || c === "`" || c === "*" || c === "[") e = true;
    else if (c === "_") e = !/\w/.test(prev) || !/\w/.test(next);          // 单词中间的 a_b_c 不会被当斜体
    else if (c === "~") e = prev === "~" || next === "~" || ctx.strike;       // 只有连着的 ~~ 才是语法
    else if (c === "{") e = /^(red|green|yellow|blue|gray|mark)\|/.test(text.slice(i + 1));
    else if (c === "}") e = ctx.color;                                         // 颜色里的 } 会提前收尾
    else if (c === "]") e = ctx.link;                                          // 链接文字里的 ] 同理
    else if (c === "|") e = ctx.table;
    out += e ? "\\" + c : c;
  }
  return out;
}

/* 段落每一行的开头：长得像块语法的要转义，不然 「1. 先看大周期」这种正文
   存回去就变成了编号列表 */
function mdEscapeLineStart(line) {
  return line
    .replace(/^(\s{0,3})(#{1,6}(\s|$))/, "$1\\$2")
    .replace(/^(\s*)([-+](\s|$))/, "$1\\$2")
    .replace(/^(\s*)(-{3,}\s*)$/, "$1\\$2")
    .replace(/^(\s*\d+)([.)])(\s|$)/, "$1\\$2$3")
    .replace(/^(\s{0,3})>/, "$1\\>");
}

/* 链接/图片地址：只放行 http(s)，并把会截断 markdown 语法的字符编码掉 */
function mdUrlOut(u) {
  const safe = mdSafeUrl(u);
  if (!safe) return null;
  return safe.replace(/\s/g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/\}/g, "%7D");
}

/* 行内 mark 在 markdown 里的嵌套顺序（外 → 内）。颜色必须在最外面：
   渲染器先跑上色规则，{red|**x**} 能继续加粗，反过来就不行。代码必须在最里面。 */
const MD_MARK_ORDER = ["mdColor", "link", "bold", "italic", "strike", "code"];
function mdNormalizeMark(m) {
  if (m.type === "link") {
    const href = mdUrlOut(m.attrs && m.attrs.href);
    return href ? { type: "link", attrs: { href } } : null;
  }
  if (m.type === "mdColor") {
    const c = m.attrs && m.attrs.color;
    return MD_COLORS.includes(c) ? { type: "mdColor", attrs: { color: c } } : null;
  }
  return MD_MARK_ORDER.includes(m.type) ? { type: m.type, attrs: {} } : null;
}
function mdMarkDelims(m) {
  switch (m.type) {
    case "mdColor": return ["{" + m.attrs.color + "|", "}"];
    case "link": return ["[", "](" + m.attrs.href + ")"];
    case "bold": return ["**", "**"];
    case "italic": return ["*", "*"];
    case "strike": return ["~~", "~~"];
    case "code": return ["`", "`"];
  }
  return ["", ""];
}

/* 一串行内节点 → markdown。oneLine：换行变空格（标题、列表项、表格格子只能占一行） */
function mdInlineFromNodes(nodes, ctx) {
  ctx = ctx || {};
  let out = "";
  const stack = [];   // 当前开着的 mark，外 → 内
  const same = (a, b) => a.type === b.type && (a.attrs.href || a.attrs.color || "") === (b.attrs.href || b.attrs.color || "");
  const closeTo = (k) => { while (stack.length > k) out += stack.pop().close; };
  const has = (t) => stack.some((s) => s.mark.type === t);
  (nodes || []).forEach((n) => {
    if (n.type === "text") {
      const marks = (n.marks || []).map(mdNormalizeMark).filter(Boolean)
        .sort((a, b) => MD_MARK_ORDER.indexOf(a.type) - MD_MARK_ORDER.indexOf(b.type));
      let k = 0;
      while (k < stack.length && k < marks.length && same(stack[k].mark, marks[k])) k++;
      closeTo(k);
      for (let j = k; j < marks.length; j++) {
        const [open, close] = mdMarkDelims(marks[j]);
        out += open;
        stack.push({ mark: marks[j], close });
      }
      const text = String(n.text || "");
      if (has("code")) out += text.replace(/`/g, "'").replace(/\n/g, " ");   // 行内代码里放不了反引号
      else {
        const esced = mdEscapeText(text, { strike: has("strike"), color: has("mdColor"), link: has("link"), table: ctx.table });
        out += ctx.oneLine ? esced.replace(/\n/g, " ") : esced;
      }
    } else if (n.type === "hardBreak") {
      // 所有行内语法都不能跨行，换行前把开着的 mark 全关掉，下一段文字会重新打开
      closeTo(0);
      out += ctx.oneLine ? " " : "\n";
    } else if (n.type === "tradeRef") {
      closeTo(0);
      const id = n.attrs && n.attrs.id;
      if (id && /^[A-Za-z0-9_-]+$/.test(id)) out += "[[trade:" + id + "]]";
    } else if (n.type === "image") {
      closeTo(0);
      const u = mdUrlOut(n.attrs && n.attrs.src);
      if (u) out += "![" + mdEscapeText(String((n.attrs && n.attrs.alt) || ""), { link: true }) + "](" + u + ")";
    }
  });
  closeTo(0);
  return out;
}

function mdListFromNode(list, depth) {
  const pad = "  ".repeat(depth);
  let num = (list.attrs && list.attrs.start) || 1;
  return (list.content || []).map((item) => {
    const kids = item.content || [];
    const first = kids[0] && kids[0].type === "paragraph" ? kids[0] : null;
    const marker = list.type === "orderedList" ? (num++) + "." : "-";
    const box = list.type === "taskList" ? (item.attrs && item.attrs.checked ? "[x] " : "[ ] ") : "";
    const lines = [pad + marker + " " + box + (first ? mdInlineFromNodes(first.content, { oneLine: true }).trim() : "")];
    kids.slice(first ? 1 : 0).forEach((k) => {
      if (k.type === "bulletList" || k.type === "orderedList" || k.type === "taskList") {
        const sub = mdListFromNode(k, depth + 1);
        if (sub) lines.push(sub);
      } else if (k.type === "paragraph") {
        // schema 里列表项只允许「一段 + 子列表」，这里只是兜底：多出来的段落并进第一行
        const t = mdInlineFromNodes(k.content, { oneLine: true }).trim();
        if (t) lines[0] += " " + t;
      }
    });
    return lines.join("\n");
  }).join("\n");
}

function mdTableFromNode(t) {
  const rows = (t.content || []).map((r) => (r.content || []).map((cell) =>
    (cell.content || []).map((p) => mdInlineFromNodes(p.content, { oneLine: true, table: true }).trim())
      .filter(Boolean).join(" ")));
  if (!rows.length) return "";
  const cols = Math.max(1, ...rows.map((r) => r.length));
  const line = (r) => "| " + Array.from({ length: cols }, (_, i) => r[i] || "").join(" | ") + " |";
  return [line(rows[0]), "| " + Array(cols).fill("---").join(" | ") + " |", ...rows.slice(1).map(line)].join("\n");
}

function mdBlockFromNode(n) {
  switch (n.type) {
    case "paragraph": {
      const txt = mdInlineFromNodes(n.content).replace(/^\n+|\n+$/g, "");
      if (!txt.trim()) return "";
      return txt.split("\n").map(mdEscapeLineStart).join("\n");
    }
    case "heading": {
      const txt = mdInlineFromNodes(n.content, { oneLine: true }).trim();
      if (!txt) return "";
      const lv = Math.min(Math.max((n.attrs && n.attrs.level) || 1, 1), 6);
      return "#".repeat(lv) + " " + txt;
    }
    case "blockquote": {
      const lines = [];
      (n.content || []).forEach((p, i) => {
        if (i) lines.push("");
        mdInlineFromNodes(p.content).replace(/^\n+|\n+$/g, "").split("\n").forEach((l) => lines.push(l));
      });
      if (!lines.some((l) => l.trim())) return "";
      return lines.map((l) => (l ? "> " + l : ">")).join("\n");
    }
    case "bulletList": case "orderedList": case "taskList": return mdListFromNode(n, 0);
    case "codeBlock": return "```\n" + (n.content || []).map((c) => c.text || "").join("") + "\n```";
    case "horizontalRule": return "---";
    case "image": return mdInlineFromNodes([n]);
    case "table": return mdTableFromNode(n);
  }
  return n.content ? mdInlineFromNodes(n.content) : "";
}

/* 编辑器文档 → markdown（存库的就是这个） */
function docToMarkdown(doc) {
  return ((doc && doc.content) || []).map(mdBlockFromNode).filter((s) => s.trim()).join("\n\n");
}

/* ============================================================
   Tiptap 扩展：自定义的两样东西（颜色、交易引用）+ 收紧几个节点的内容
   ============================================================ */
function mdColorFromClass(el) {
  const m = /\bmdC-([a-z]+)\b/.exec((el && el.className) || "");
  return m && MD_COLORS.includes(m[1]) ? m[1] : null;
}
function reviewExtensions(L) {
  // 列表项里只允许「一段文字 + 子列表」，引用里只允许段落，表格格子里也只放段落——
  // markdown 那边只表达得了这些，schema 放宽了的话写出来的东西存不回去
  const listItemContent = "paragraph (bulletList | orderedList | taskList)*";
  const httpOnly = (url) => /^https?:\/\//i.test(String(url || "").trim());

  const MdColor = L.Mark.create({
    name: "mdColor",
    addAttributes() {
      return { color: { default: "red", parseHTML: (el) => mdColorFromClass(el), renderHTML: () => ({}) } };
    },
    parseHTML() { return [{ tag: "span.mdC", getAttrs: (el) => (mdColorFromClass(el) ? null : false) }]; },
    // 只输出我们自己的类名，颜色值在 style.css 里——绝不把属性值当 CSS 塞进 style
    renderHTML({ mark }) {
      const c = MD_COLORS.includes(mark.attrs.color) ? mark.attrs.color : "red";
      return ["span", { class: "mdC mdC-" + c }, 0];
    },
  });

  const TradeRef = L.Node.create({
    name: "tradeRef",
    group: "inline",
    inline: true,
    atom: true,
    selectable: true,
    marks: "",
    addAttributes() {
      return {
        id: {
          default: "",
          parseHTML: (el) => { const v = el.getAttribute("data-trade-ref") || ""; return /^[A-Za-z0-9_-]+$/.test(v) ? v : ""; },
          renderHTML: (a) => ({ "data-trade-ref": a.id }),
        },
      };
    },
    parseHTML() { return [{ tag: "span[data-trade-ref]" }]; },
    renderHTML({ HTMLAttributes }) { return ["span", HTMLAttributes]; },
    renderText({ node }) { return "[[trade:" + node.attrs.id + "]]"; },
    // 显示成和只读视图一样的胶囊。胶囊上带着 data-action="open-trade-ref"，
    // 点击冒泡到 document 的委托里，照常弹出只读预览
    addNodeView() {
      return ({ node }) => {
        const dom = document.createElement("span");
        dom.className = "tradeRefHost";
        dom.innerHTML = tradeRefHtml(node.attrs.id);
        return { dom, ignoreMutation: () => true };
      };
    },
  });

  return [
    L.StarterKit.configure({
      blockquote: false,
      listItem: false,
      underline: false,          // markdown 里没有下划线，放进来的话 Ctrl+U 划的线存不下来
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: {
        openOnClick: false,      // 编辑时点链接是想改字，打开走格式栏里的按钮或 Ctrl+点击
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
        isAllowedUri: (url) => httpOnly(url),
        shouldAutoLink: (url) => httpOnly(url),
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
      },
    }),
    L.Blockquote.extend({ content: "paragraph+" }),
    L.ListItem.extend({ content: listItemContent }),
    L.TaskList,
    L.TaskItem.extend({ content: listItemContent }).configure({ nested: true }),
    L.Image.extend({
      // 粘贴进来的 HTML 里可能有 data:/blob: 的图，这里只认 http(s)，图片一律走外部图床
      parseHTML() { return [{ tag: "img[src]", getAttrs: (el) => (mdSafeUrl(el.getAttribute("src")) ? null : false) }]; },
    }).configure({ inline: false, allowBase64: false, HTMLAttributes: { class: "mdImg", referrerpolicy: "no-referrer" } }),
    L.Table.configure({ resizable: false, HTMLAttributes: { class: "mdTable" } }),
    L.TableRow,
    L.TableHeader.extend({ content: "paragraph+" }),
    L.TableCell.extend({ content: "paragraph+" }),
    L.Placeholder.configure({
      placeholder: ({ node }) => (node.type.name === "heading" ? T("review.ph.heading") : T("review.ph.line")),
    }),
    MdColor,
    TradeRef,
    reviewFoldExtension(L),
  ];
}

/* ============================================================
   挂载 / 卸载
   ============================================================ */
let reviewTiptap = null;
let reviewMountSeq = 0;     // 每次重建编辑器外壳 +1；异步加载回来发现对不上就放弃挂载

function destroyReviewTiptap() {
  syncReviewBody();   // 还没来得及转成 markdown 的最后几下，先落到 editingReview.body 里
  resetReviewOutline();
  if (reviewTiptap) { try { reviewTiptap.destroy(); } catch (e) {} }
  reviewTiptap = null;
  slashMenu = null;
  slashDismissedFrom = null;
  reviewPop = null;
  bubbleMode = "main";
  bubbleKey = null;
}

function renderReviewEditor(force) {
  const root = document.getElementById("reviewEditorRoot");
  if (!root) return;
  if (!editingReview) { destroyReviewTiptap(); reviewEditorRenderedFor = null; root.innerHTML = ""; return; }
  // 已经在显示这一篇就不重绘——否则正在写的正文和光标位置全没了
  if (!force && reviewEditorRenderedFor === editingReview.id) return;
  reviewEditorRenderedFor = editingReview.id;
  destroyReviewTiptap();
  const seq = ++reviewMountSeq;

  const readOnly = reviewIsReadOnly();
  const staticBody = renderMarkdown(editingReview.body);
  root.innerHTML = `<div class="reviewEditorOverlay" id="reviewScroller" onscroll="window.__reviewScroll()">
    <div class="reviewTopBar">
      <div class="reviewCrumbs">
        <button class="reviewCrumbBtn" data-action="close-review-editor">${esc(T("review.back"))}</button>
        <span class="reviewCrumbSep">/</span>
        <span class="reviewCrumbTitle" id="reviewCrumbTitle">${esc(reviewTitleOf(editingReview))}</span>
      </div>
      <div class="reviewTopRight">
        <span id="reviewSaveSlot">${readOnly ? "" : reviewSaveBadgeHtml()}</span>
        <button class="iconBtn reviewOutlineBtn" id="reviewOutlineBtn" data-action="review-outline-toggle" hidden>${ICONS.outline}</button>
        <button class="iconBtn" data-action="close-review-editor" title="${esc(T("review.editorClose"))}">${ICONS.x}</button>
      </div>
    </div>
    <div class="reviewPage">
      ${readOnly
        ? `<div class="reviewTitleStatic display">${esc(reviewTitleOf(editingReview))}</div>`
        : `<input class="reviewTitleInput display" type="text" id="reviewTitleInput"
            placeholder="${esc(T("review.titlePlaceholder"))}" value="${esc(editingReview.title || "")}"
            oninput="window.__reviewTitleInput(this)" onkeydown="window.__reviewTitleKey(event)" />`}
      <div class="reviewWeekRow" id="reviewWeekRow">${reviewWeekRowInnerHtml()}</div>
      ${readOnly
        ? `<div class="mdBody reviewDoc">${staticBody || `<div class="reviewDocEmpty">${esc(T("review.previewEmpty"))}</div>`}</div>`
        : `<div id="reviewDocMount" class="reviewDocMount">
            <div class="mdBody reviewDoc reviewDocLoading">${staticBody}</div>
            <div class="reviewLoadingNote">${esc(T("review.loadingEditor"))}</div>
          </div>
          <div class="reviewDocTail" onclick="window.__reviewFocusEnd()"></div>`}
    </div>
    <nav class="reviewOutline" id="reviewOutline" hidden onmousedown="event.preventDefault()"></nav>
    ${readOnly ? "" : `<div class="reviewHintBar">${esc(T("review.hintBar", { mod: modKeyLabel(), alt: isMacLike() ? "⌥" : "Alt" }))}</div>`}
    <div id="reviewFloatRoot" onmousedown="window.__reviewFloatMouseDown(event)">
      <div id="reviewBubble" class="reviewBubble" hidden></div>
      <div id="reviewPop" class="reviewPop" hidden></div>
      <div id="slashMenuRoot"></div>
      <div id="reviewToast" class="reviewToast" hidden></div>
    </div>
    <div id="tradePickerRoot"></div>
  </div>`;
  refreshReviewOutline();   // 只读态、编辑器加载中显示的静态正文也有目录

  if (readOnly) return;
  if (editingReview._isNew && !(editingReview.title || "").trim()) {
    const ti = document.getElementById("reviewTitleInput");
    if (ti) ti.focus();
  }
  mountReviewTiptap(seq);
}

async function mountReviewTiptap(seq) {
  let L;
  try {
    L = await loadTiptap();
  } catch (err) {
    console.error(err);
    if (seq === reviewMountSeq) mountReviewFallback();
    return;
  }
  // 加载期间用户可能已经关掉、换了一篇，或者外壳被强制重建过
  if (seq !== reviewMountSeq || !editingReview) return;
  const mount = document.getElementById("reviewDocMount");
  if (!mount) return;
  mount.innerHTML = "";
  const titleHadFocus = document.activeElement && document.activeElement.id === "reviewTitleInput";
  try {
    reviewTiptap = new L.Editor({
      element: mount,
      extensions: reviewExtensions(L),
      content: mdToEditorHtml(editingReview.body),
      editorProps: {
        attributes: { class: "mdBody reviewDoc", spellcheck: "false" },
        // 光标滚进视野时，上面让出 sticky 顶栏、下面让出提示条，不然正在打的那行会被挡住
        scrollThreshold: { top: 70, bottom: 90, left: 0, right: 0 },
        scrollMargin: { top: 70, bottom: 90, left: 0, right: 0 },
        handleKeyDown: (view, e) => reviewEditorKeydown(view, e),
        handleDOMEvents: { mousedown: (view, e) => reviewFoldMouseDown(view, e) },
        handlePaste: (view, e) => reviewEditorPaste(view, e),
        handleDoubleClickOn: (view, pos, node) => {
          if (node.type.name !== "image") return false;
          const u = mdSafeUrl(node.attrs.src);
          if (u) openLightbox(view.nodeDOM(pos) || view.dom, u);
          return true;
        },
        handleClick: (view, pos, e) => {
          // Ctrl/⌘ + 点击链接 = 在新标签页打开（普通点击是在改字）
          const a = e.target && e.target.closest && e.target.closest("a[href]");
          if (!a || !(e.ctrlKey || e.metaKey)) return false;
          const u = mdSafeUrl(a.getAttribute("href"));
          if (u) window.open(u, "_blank", "noopener,noreferrer");
          return true;
        },
      },
      onUpdate: () => {
        if (!editingReview) return;
        markReviewBodyChanged();
        syncSlashMenu();
        updateBubble();
      },
      // 改了字、折了/展开了一节、光标挪进折叠区被自动展开——都可能让目录变，统一停手再刷新
      onTransaction: () => scheduleReviewOutline(),
      onSelectionUpdate: () => { syncSlashMenu(); updateBubble(); },
      onFocus: () => updateBubble(),
      onBlur: ({ event }) => {
        // 焦点挪进了格式栏里的输入框（改链接）——那不算离开
        const to = event && event.relatedTarget;
        if (to && to.closest && to.closest("#reviewFloatRoot")) return;
        if (slashMenu) closeSlashMenu(true);
        setTimeout(updateBubble, 0);
      },
    });
  } catch (err) {
    console.error(err);
    reviewTiptap = null;
    mountReviewFallback();
    return;
  }
  if (titleHadFocus) { const ti = document.getElementById("reviewTitleInput"); if (ti) ti.focus(); }
  refreshReviewOutline();
}

/* 编辑器没加载出来（断网、被拦截）：退回纯文本框，直接写 markdown。
   丑一点，但写的东西照样存得下来，不能因为一个库把人卡在门外 */
function mountReviewFallback() {
  const mount = document.getElementById("reviewDocMount");
  if (!mount || !editingReview) return;
  mount.innerHTML = `<div class="notice error" style="margin-bottom:12px;">${ICONS.alert}<span>${esc(T("review.editorLoadFailed"))}</span></div>
    <textarea class="input reviewFallbackInput" spellcheck="false" oninput="window.__reviewFallbackInput(this)">${esc(editingReview.body || "")}</textarea>`;
  refreshReviewOutline();
}
window.__reviewFallbackInput = function (ta) {
  if (!editingReview) return;
  editingReview.body = ta.value;
  scheduleReviewSave();
};

/* 点正文下面的空白：跳到文末接着写。文末是表格、图片、列表这些的话先补一个空段落——
   不然光标会钻进最后一个表格格子里。空段落不会写进 markdown，没有副作用 */
window.__reviewFocusEnd = function () {
  const ed = reviewTiptap;
  if (!ed) return;
  const last = ed.state.doc.lastChild;
  if (!last || last.type.name !== "paragraph" || last.content.size) {
    ed.chain().insertContentAt(ed.state.doc.content.size, { type: "paragraph" }).focus("end").run();
  } else {
    ed.commands.focus("end");
  }
};
window.__reviewScroll = function () { positionReviewFloats(); onReviewOutlineScroll(); };
window.addEventListener("resize", () => { if (reviewTiptap) positionReviewFloats(); });

/* 浮层里的按钮不能抢走编辑器的焦点（选区会丢）；输入框例外，它本来就要焦点 */
window.__reviewFloatMouseDown = function (e) {
  if (!(e.target.closest && e.target.closest("input"))) e.preventDefault();
};

function positionReviewFloats() {
  if (slashMenu) renderSlashMenu();
  if (reviewPop) positionReviewPop();
  positionBubble();
}

/* 浮层都是 position:fixed，坐标直接用 ProseMirror 算的视口坐标 */
function placeFloat(el, anchorTop, anchorBottom, centerX, preferAbove) {
  const w = el.offsetWidth, h = el.offsetHeight;
  const minTop = 56;   // 顶栏下面
  let top = preferAbove ? anchorTop - h - 8 : anchorBottom + 6;
  if (preferAbove && top < minTop) top = anchorBottom + 8;
  if (!preferAbove && top + h > window.innerHeight - 8 && anchorTop - h - 6 > minTop) top = anchorTop - h - 6;
  const left = Math.min(Math.max(centerX - (preferAbove ? w / 2 : 0), 8), Math.max(window.innerWidth - w - 8, 8));
  el.style.top = Math.round(top) + "px";
  el.style.left = Math.round(left) + "px";
}

/* ---------- 自动保存 ----------
   停手 1.2 秒写数据库，同时每次输入都镜像一份到 localStorage 兜底。
   全程不调 render()，否则编辑器会被重建。 */
let reviewEditRev = 0;   // 每改一下 +1。保存回来时对不上 = 保存途中又改过，不能标成「已保存」

/* 正文：打字时不再每一下都 getJSON() → docToMarkdown() → 写 localStorage——长复盘
   （几十张图、好几张表）每个键都整篇转一遍会发涩。停手 300ms 才转一次，再接上面的 1.2 秒。
   任何要读 editingReview.body 的地方（保存、关闭、离开页面）先调 syncReviewBody()。 */
let reviewBodyTimer = null;
let reviewBodyFor = null;
function markReviewBodyChanged() {
  reviewEditRev++;
  reviewBodyFor = editingReview;
  reviewSaveState = "dirty";
  reviewSaveError = null;
  updateReviewSaveBadge();
  clearTimeout(reviewSaveTimer);   // 正文还没转好之前别去写库，转好了会重新排
  reviewSaveTimer = null;
  clearTimeout(reviewBodyTimer);
  reviewBodyTimer = setTimeout(() => { if (syncReviewBody()) scheduleReviewSave(); }, 300);
}
/* 返回 true = 正文更新到了当前这篇上 */
function syncReviewBody() {
  if (!reviewBodyTimer) return false;
  clearTimeout(reviewBodyTimer);
  reviewBodyTimer = null;
  const target = reviewBodyFor;
  reviewBodyFor = null;
  if (!target || !reviewTiptap) return false;
  target.body = docToMarkdown(reviewTiptap.getJSON());
  return target === editingReview;
}

function scheduleReviewSave() {
  reviewEditRev++;
  reviewSaveState = "dirty";
  reviewSaveError = null;
  updateReviewSaveBadge();
  saveReviewDraft();
  clearTimeout(reviewSaveTimer);
  reviewSaveTimer = setTimeout(() => { flushReviewSave(); }, 1200);
}
async function flushReviewSave() {
  if (syncReviewBody()) saveReviewDraft();
  clearTimeout(reviewSaveTimer);
  reviewSaveTimer = null;
  if (!editingReview || viewingUserId) return true;
  if (reviewSaveState !== "dirty") return true;
  const rev = editingReview;
  const startedAt = reviewEditRev;
  reviewSaveState = "saving";
  updateReviewSaveBadge();
  const ok = await persistReview(rev);
  if (rev !== editingReview) return ok;   // 保存途中已经关掉 / 换了一篇
  if (ok) {
    rev._isNew = false;
    if (startedAt === reviewEditRev) {
      reviewSaveState = "saved";
      reviewSavedAt = Date.now();
    } else {
      // 保存途中又改过：以前这里会直接标成「已保存」，排着的那次保存一看不是 dirty 就跳过了，
      // 最后几下只留在本地草稿里。现在保持 dirty，排着的保存照常写；persistReview 刚清掉的草稿也补回来
      reviewSaveState = "dirty";
      saveReviewDraft();
      if (!reviewSaveTimer && !reviewBodyTimer) reviewSaveTimer = setTimeout(() => { flushReviewSave(); }, 1200);
    }
  } else {
    reviewSaveState = "dirty";
  }
  updateReviewSaveBadge();
  return ok;
}

window.__reviewTitleInput = function (el) {
  if (!editingReview) return;
  editingReview.title = el.value;
  const crumb = document.getElementById("reviewCrumbTitle");
  if (crumb) crumb.textContent = reviewTitleOf(editingReview);
  scheduleReviewSave();
  scheduleReviewOutline();   // 目录最上面那一项就是标题
};
/* 标题里按回车 / 下箭头：跳进正文开头，跟 Notion 一样 */
window.__reviewTitleKey = function (e) {
  if (e.isComposing || e.keyCode === 229) return;
  if ((e.key === "Enter" || e.key === "ArrowDown") && reviewTiptap) {
    e.preventDefault();
    // Tiptap 的 focus() 要等下一帧才真正挪焦点，这之间打的字还会落在标题里——先同步聚焦
    reviewTiptap.view.focus();
    reviewTiptap.commands.focus("start");
  }
};

/* ---------- 编辑器里的键盘 ----------
   返回 true = 这一下我们处理了（ProseMirror 会顺手 preventDefault）。
   Escape 不在这里处理：交给 document 上那条 ESC 链，按层级一层层关。 */
function reviewEditorKeydown(view, e) {
  if (e.isComposing || view.composing || e.keyCode === 229) return false;
  if (slashMenu) {
    const items = slashFilteredItems();
    const n = Math.max(items.length, 1);
    if (e.key === "ArrowDown") { slashMenu.index = (slashMenu.index + 1) % n; renderSlashMenu(); return true; }
    if (e.key === "ArrowUp") { slashMenu.index = (slashMenu.index - 1 + n) % n; renderSlashMenu(); return true; }
    if ((e.key === "Enter" || e.key === "Tab") && items.length) { applySlashItem(items[slashMenu.index] || items[0]); return true; }
  }
  const mod = e.ctrlKey || e.metaKey;
  if (mod && !e.altKey && !e.shiftKey) {
    const k = e.key.toLowerCase();
    if (k === "s") { flushReviewSave(); return true; }
    if (k === "k") { openLinkEditor(); return true; }
  }
  return false;
}

const IMAGE_URL_RE = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif|bmp|svg)([?#]\S*)?$/i;
/* ---------- 粘贴 ----------
   - 光秃秃一个图片链接（含 TradingView 快照页链接）→ 直接变成图片
   - 纯文本里带 markdown 块语法（从别处复制来的笔记）→ 按 markdown 排好版再放进来
   - 剪贴板里是图片文件本身 → 不上传（图片一律走外部图床，不占数据库），提示一下
   其余情况（包括选中文字粘链接 = 加链接）交给 Tiptap 默认处理 */
function reviewEditorPaste(view, e) {
  const ed = reviewTiptap;
  const cd = e.clipboardData;
  if (!ed || !cd) return false;
  if (ed.isActive("codeBlock")) return false;
  const text = cd.getData("text/plain") || "";
  const html = cd.getData("text/html") || "";
  if (!text.trim() && !html && [...(cd.files || [])].some((f) => /^image\//.test(f.type))) {
    showReviewToast(T("review.pasteImageHint"));
    return true;
  }
  const url = text.trim();
  // TradingView 快照页面链接也算图片（imgSrc 换成直链）
  if (!html && ed.state.selection.empty && (IMAGE_URL_RE.test(url) || TV_SNAPSHOT_RE.test(url))) {
    ed.chain().focus().insertContent({ type: "image", attrs: { src: imgSrc(url) } }).run();
    return true;
  }
  if (!html && /\n/.test(text) && /^\s{0,3}(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|```|\|.*\|)/m.test(text)) {
    ed.chain().focus().insertContent(mdToEditorHtml(text)).run();
    return true;
  }
  return false;
}

let reviewToastTimer = null;
function showReviewToast(msg) {
  const el = document.getElementById("reviewToast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(reviewToastTimer);
  reviewToastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

/* ============================================================
   斜杠插入菜单：行首或空格后面打 / （中文输入法下是 、，只认行首）
   ============================================================ */
let slashDismissedFrom = null;   // 用户按 Esc 关掉过的那个 /，没删掉之前别再弹

function slashContext() {
  const ed = reviewTiptap;
  if (!ed || ed.view.composing) return null;
  const sel = ed.state.selection;
  if (!sel.empty) return null;
  const $f = sel.$from;
  if (!$f.parent.isTextblock || $f.parent.type.name === "codeBlock") return null;
  const before = $f.parent.textBetween(0, $f.parentOffset, null, "￼");
  const m = before.match(/(^|\s)([\/、])([^\s\/、]{0,20})$/);
  if (!m) return null;
  if (m[2] === "、" && before.length !== m[2].length + m[3].length) return null;
  return { from: $f.pos - m[3].length - 1, query: m[3] };
}
function syncSlashMenu() {
  const ctx = slashContext();
  if (!ctx) {
    slashDismissedFrom = null;
    if (slashMenu) closeSlashMenu();
    return;
  }
  if (ctx.from === slashDismissedFrom) return;
  const isNew = !slashMenu || slashMenu.from !== ctx.from;
  slashMenu = { from: ctx.from, query: ctx.query, index: isNew || slashMenu.query !== ctx.query ? 0 : slashMenu.index };
  // 打了好几个字都匹配不上，多半不是想插东西，收起来
  if (!slashFilteredItems().length && ctx.query.length >= 4) { closeSlashMenu(true); return; }
  updateBubble();
  renderSlashMenu();
}
function closeSlashMenu(dismiss) {
  if (dismiss && slashMenu) slashDismissedFrom = slashMenu.from;
  slashMenu = null;
  const root = document.getElementById("slashMenuRoot");
  if (root) root.innerHTML = "";
}
function renderSlashMenu() {
  const root = document.getElementById("slashMenuRoot");
  const ed = reviewTiptap;
  if (!root || !ed || !slashMenu) return;
  const items = slashFilteredItems();
  root.innerHTML = `<div class="slashMenu">
    <div class="slashMenuHead">${esc(T("review.slash.title"))}${slashMenu.query ? ` · ${esc(slashMenu.query)}` : ""}</div>
    ${items.length
      ? items.map((it, i) => `<button class="slashItem ${i === slashMenu.index ? "active" : ""}" data-action="slash-pick" data-cmd="${it.cmd}">
          ${ICONS[SLASH_ICONS[it.cmd]] || ""}<span>${esc(T(it.labelKey))}</span>
        </button>`).join("")
      : `<div class="slashEmpty">${esc(T("review.slash.empty"))}</div>`}
  </div>`;
  const menu = root.firstElementChild;
  let c;
  try { c = ed.view.coordsAtPos(slashMenu.from); } catch (e) { return; }
  placeFloat(menu, c.top, c.bottom, c.left, false);
  const act = menu.querySelector(".slashItem.active");
  if (act) act.scrollIntoView({ block: "nearest" });
}
function applySlashItem(item) {
  const ed = reviewTiptap;
  if (!ed || !item || !slashMenu) return;
  const from = slashMenu.from;
  const to = ed.state.selection.from;
  closeSlashMenu();
  // 先把 /query 本身删掉。⚠️ 这里不能带 .focus()：Tiptap 的 focus 是下一帧才生效的，
  // 接下来要弹的图片/链接小框、交易选择器的输入框刚拿到焦点，就会被它抢回编辑器
  ed.chain().deleteRange({ from, to }).run();
  runReviewCommand(item.cmd);
}

function runReviewCommand(cmd) {
  const ed = reviewTiptap;
  if (!ed || reviewIsReadOnly()) return;
  const c = ed.chain().focus();
  switch (cmd) {
    case "text": c.setParagraph().run(); break;
    case "h1": c.setHeading({ level: 1 }).run(); break;
    case "h2": c.setHeading({ level: 2 }).run(); break;
    case "h3": c.setHeading({ level: 3 }).run(); break;
    case "ul": c.toggleBulletList().run(); break;
    case "ol": c.toggleOrderedList().run(); break;
    case "task": c.toggleTaskList().run(); break;
    case "quote": c.setParagraph().toggleBlockquote().run(); break;
    case "code": c.toggleCodeBlock().run(); break;
    case "hr": c.setHorizontalRule().run(); break;
    case "table": c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
    case "image": openReviewPop("image"); break;
    case "link": openLinkEditor(); break;
    case "color":
      if (ed.state.selection.empty) openReviewPop("color");
      else { bubbleMode = "color"; updateBubble(); }
      break;
    case "trade": openTradePicker(); break;
  }
}

/* ============================================================
   选中文字浮出的格式栏（也负责：光标在链接里 → 链接操作；光标在表格里 → 行列操作）
   ============================================================ */
let bubbleMode = "main";    // 'main' | 'color' | 'link'
let bubbleKey = null;       // 内容没变就只挪位置，不重建（改链接时输入框不能被重建）
let bubbleKind = null;      // 'text' | 'link' | 'table'，定位时要用

function bubbleContext() {
  const ed = reviewTiptap;
  if (!ed || slashMenu || reviewPop) return null;
  const root = document.getElementById("reviewFloatRoot");
  const focusInside = root && root.contains(document.activeElement);
  if (!ed.isFocused && !focusInside) return null;
  const sel = ed.state.selection;
  if (sel.node) return null;                                    // 选中的是整张图/交易胶囊
  if (ed.isActive("codeBlock")) return null;
  const isCellSel = "$anchorCell" in sel;   // 表格里拖选了好几格（类名会被压缩掉，只能认属性）
  if (!sel.empty && !isCellSel) return "text";
  if (bubbleMode === "link") return "text";                     // 从 Ctrl+K 进来、选区可能是空的
  if (ed.isActive("link")) return "link";
  if (ed.isActive("table")) return "table";
  return null;
}

function bubbleHtml(kind) {
  const ed = reviewTiptap;
  // attrs 里写死 data-action="..."（不拼接）：交接文档那条 grep 对账只认字面量
  const btn = (attrs, inner, title, on) =>
    `<button class="bubbleBtn ${on ? "on" : ""}" ${attrs} title="${esc(title)}">${inner}</button>`;
  const mod = modKeyLabel();
  if (bubbleMode === "color") {
    const cur = (ed.getAttributes("mdColor") || {}).color;
    return MD_COLORS.map((c) => `<button class="colorSwatch ${cur === c ? "on" : ""}" data-action="rv-color" data-color="${c}" title="${esc(T("review.color." + c))}">
        <span class="colorDot mdC-${c}">A</span><span class="colorName">${esc(T("review.color." + c))}</span></button>`).join("")
      + `<button class="colorSwatch" data-action="rv-color" data-color=""><span class="colorDot">${ICONS.x}</span><span class="colorName">${esc(T("review.color.clear"))}</span></button>`;
  }
  if (bubbleMode === "link") {
    const href = (ed.getAttributes("link") || {}).href || "";
    return `<input class="bubbleInput" id="reviewLinkInput" type="text" placeholder="${esc(T("review.promptLink"))}"
        value="${esc(href)}" onkeydown="window.__reviewLinkKey(event)" />
      ${btn('data-action="rv-link-apply"', ICONS.check, T("review.pop.ok"))}
      ${href ? btn('data-action="rv-link-remove"', ICONS.trash, T("review.bubble.linkRemove")) : ""}`;
  }
  if (kind === "link") {
    const href = (ed.getAttributes("link") || {}).href || "";
    return `<span class="bubbleHref" title="${esc(href)}">${esc(href.replace(/^https?:\/\//, ""))}</span>
      ${btn('data-action="rv-link-open"', ICONS.expand, T("review.bubble.linkOpen"))}
      ${btn('data-action="rv-bubble" data-mode="link"', ICONS.pencil, T("review.bubble.linkEdit"))}
      ${btn('data-action="rv-link-remove"', ICONS.trash, T("review.bubble.linkRemove"))}`;
  }
  if (kind === "table") {
    const op = (o, label) => `<button class="bubbleBtn bubbleText" data-action="rv-table" data-op="${o}">${esc(T(label))}</button>`;
    return op("addRow", "review.table.addRow") + op("addCol", "review.table.addCol")
      + `<span class="bubbleSep"></span>` + op("delRow", "review.table.delRow") + op("delCol", "review.table.delCol")
      + `<span class="bubbleSep"></span>` + `<button class="bubbleBtn bubbleText danger" data-action="rv-table" data-op="delTable">${esc(T("review.table.delTable"))}</button>`;
  }
  return btn('data-action="rv-mark" data-cmd="bold"', ICONS.tbBold, T("review.tb.bold") + ` (${mod}+B)`, ed.isActive("bold"))
    + btn('data-action="rv-mark" data-cmd="italic"', ICONS.tbItalic, T("review.tb.italic") + ` (${mod}+I)`, ed.isActive("italic"))
    + btn('data-action="rv-mark" data-cmd="strike"', ICONS.tbStrike, T("review.tb.strike") + ` (${mod}+Shift+S)`, ed.isActive("strike"))
    + btn('data-action="rv-mark" data-cmd="code"', ICONS.tbCode, T("review.tb.code") + ` (${mod}+E)`, ed.isActive("code"))
    + `<span class="bubbleSep"></span>`
    + btn('data-action="rv-bubble" data-mode="link"', ICONS.tbLink, T("review.tb.link") + ` (${mod}+K)`, ed.isActive("link"))
    + btn('data-action="rv-bubble" data-mode="color"', ICONS.tbColor + ICONS.chevDown, T("review.tb.color"), ed.isActive("mdColor"))
    + `<span class="bubbleSep"></span>`
    + btn('data-action="rv-mark" data-cmd="h1"', ICONS.tbHeading + `<span class="tbLabel">1</span>`, T("review.tb.h1"), ed.isActive("heading", { level: 1 }))
    + btn('data-action="rv-mark" data-cmd="h2"', ICONS.tbHeading + `<span class="tbLabel">2</span>`, T("review.tb.h2"), ed.isActive("heading", { level: 2 }));
}

function updateBubble() {
  const el = document.getElementById("reviewBubble");
  if (!el) return;
  const kind = bubbleContext();
  bubbleKind = kind;
  if (!kind) {
    el.hidden = true;
    bubbleKey = null;
    const fr = document.getElementById("reviewFloatRoot");
    if (bubbleMode !== "main" && !(fr && fr.contains(document.activeElement))) bubbleMode = "main";
    return;
  }
  const html = bubbleHtml(kind);
  // 改链接时输入框正在打字，这时候重建会把输入框连同光标一起换掉——那一段不动
  const editingLink = bubbleMode === "link" && !el.hidden && el.querySelector("#reviewLinkInput");
  if (!editingLink && (html !== bubbleKey || el.hidden)) el.innerHTML = html;
  bubbleKey = html;
  el.className = "reviewBubble" + (bubbleMode === "color" ? " isColor" : "");
  el.hidden = false;
  positionBubble();
}
function positionBubble() {
  const el = document.getElementById("reviewBubble");
  const ed = reviewTiptap;
  if (!el || el.hidden || !ed) return;
  const { from, to } = ed.state.selection;
  // 表格操作栏挂在整张表的上方——跟着光标的话会正好盖住表头
  if (bubbleKind === "table") {
    let dom = null;
    try { dom = ed.view.domAtPos(from).node; } catch (e) {}
    const table = dom && (dom.nodeType === 1 ? dom : dom.parentElement);
    const t = table && table.closest("table");
    if (t) {
      const r = t.getBoundingClientRect();
      placeFloat(el, r.top, r.bottom, r.left + el.offsetWidth / 2, true);
      return;
    }
  }
  let a, b;
  try { a = ed.view.coordsAtPos(from); b = ed.view.coordsAtPos(to); } catch (e) { return; }
  placeFloat(el, Math.min(a.top, b.top), Math.max(a.bottom, b.bottom), (a.left + b.right) / 2, true);
}

/* 看大图时翻到哪张，编辑器里就选中哪张（金色描边）。不滚动、不抢焦点：
   位置由灯箱那边对齐好了，焦点还留在编辑器里 */
function selectReviewImage(img) {
  const ed = reviewTiptap;
  if (!ed || !img) return;
  try {
    const pos = ed.view.posAtDOM(img, 0);
    const node = ed.state.doc.nodeAt(pos);
    if (node && node.type.name === "image") ed.commands.setNodeSelection(pos);
  } catch (e) {}
}

/* Ctrl+K 或格式栏里的链接按钮：有选区就给选区加链接，没选区就弹小框插一个 */
function openLinkEditor() {
  const ed = reviewTiptap;
  if (!ed) return;
  if (ed.state.selection.empty && !ed.isActive("link")) { openReviewPop("link"); return; }
  if (ed.state.selection.empty) ed.chain().extendMarkRange("link").run();
  bubbleMode = "link";
  updateBubble();
  const input = document.getElementById("reviewLinkInput");
  if (input) { input.focus(); input.select(); }
}
function applyLinkFromBubble() {
  const ed = reviewTiptap;
  const input = document.getElementById("reviewLinkInput");
  if (!ed || !input) return;
  const url = input.value.trim();
  bubbleMode = "main";
  if (!url) ed.chain().focus().extendMarkRange("link").unsetLink().run();
  else if (!mdSafeUrl(url)) { bubbleMode = "link"; showReviewToast(T("review.pop.invalid")); input.focus(); return; }
  else ed.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  updateBubble();
}
window.__reviewLinkKey = function (e) {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === "Enter") { e.preventDefault(); applyLinkFromBubble(); }
};

/* ============================================================
   没选区时的小弹框：插图片 / 插链接 / 接下来打的字用什么颜色
   ============================================================ */
let reviewPop = null;   // { kind: 'image' | 'link' | 'color', pos }

function openReviewPop(kind) {
  const ed = reviewTiptap;
  if (!ed) return;
  reviewPop = { kind, pos: ed.state.selection.from };
  updateBubble();
  const el = document.getElementById("reviewPop");
  if (!el) return;
  if (kind === "color") {
    el.innerHTML = MD_COLORS.map((c) => `<button class="colorSwatch" data-action="rv-color" data-color="${c}">
        <span class="colorDot mdC-${c}">A</span><span class="colorName">${esc(T("review.color." + c))}</span></button>`).join("")
      + `<button class="colorSwatch" data-action="rv-color" data-color=""><span class="colorDot">${ICONS.x}</span><span class="colorName">${esc(T("review.color.clear"))}</span></button>`;
    el.className = "reviewPop isColor";
  } else {
    el.innerHTML = `<div class="reviewPopLabel">${esc(T(kind === "image" ? "review.promptImage" : "review.promptLink"))}</div>
      <div class="reviewPopRow">
        <input class="bubbleInput" id="reviewPopInput" type="text" placeholder="https://…" onkeydown="window.__reviewPopKey(event)" />
        <button class="btn btn-primary" data-action="rv-pop-apply">${esc(T("review.pop.insert"))}</button>
      </div>
      <div class="reviewPopErr" id="reviewPopErr"></div>`;
    el.className = "reviewPop";
  }
  el.hidden = false;
  positionReviewPop();
  const input = document.getElementById("reviewPopInput");
  if (input) input.focus();
}
function positionReviewPop() {
  const el = document.getElementById("reviewPop");
  const ed = reviewTiptap;
  if (!el || el.hidden || !ed || !reviewPop) return;
  let c;
  try { c = ed.view.coordsAtPos(Math.min(reviewPop.pos, ed.state.doc.content.size)); } catch (e) { return; }
  placeFloat(el, c.top, c.bottom, c.left, false);
}
function closeReviewPop(refocus) {
  reviewPop = null;
  const el = document.getElementById("reviewPop");
  if (el) { el.hidden = true; el.innerHTML = ""; }
  if (refocus && reviewTiptap) reviewTiptap.commands.focus();
}
function applyReviewPop() {
  const ed = reviewTiptap;
  const input = document.getElementById("reviewPopInput");
  if (!ed || !reviewPop || !input) return;
  const url = input.value.trim();
  if (!mdSafeUrl(url)) {
    const err = document.getElementById("reviewPopErr");
    if (err) err.textContent = T("review.pop.invalid");
    input.focus();
    return;
  }
  const pos = Math.min(reviewPop.pos, ed.state.doc.content.size);
  const kind = reviewPop.kind;
  closeReviewPop();
  if (kind === "image") {
    ed.chain().focus().insertContentAt(pos, { type: "image", attrs: { src: imgSrc(url) } }).run();
  } else {
    ed.chain().focus().insertContentAt(pos, [
      { type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] },
      { type: "text", text: " " },
    ]).run();
  }
}
window.__reviewPopKey = function (e) {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === "Enter") { e.preventDefault(); applyReviewPop(); }
};

/* 颜色：有选区就给选区上色；没选区（从插入菜单进来）就设成「接下来打的字」的颜色 */
function applyReviewColor(color) {
  const ed = reviewTiptap;
  if (!ed) return;
  const fromPop = !!reviewPop;
  closeReviewPop();
  bubbleMode = "main";
  const c = ed.chain().focus();
  if (!color) c.unsetMark("mdColor").run();
  else c.setMark("mdColor", { color }).run();
  if (!fromPop) updateBubble();
}

/* ---------- 交易选择器 ----------
   只渲染进 #tradePickerRoot，绝不碰编辑器本体；搜索时也只换结果区，
   否则输入框自己会被重建、光标丢失。 */
let tradePickerRange = null;
const TRADE_PICKER_LIMIT = 40;

function openTradePicker() {
  const ed = reviewTiptap;
  tradePickerRange = ed ? { from: ed.state.selection.from, to: ed.state.selection.to } : null;
  tradePickerOpen = true;
  tradePickerQuery = "";
  renderTradePicker();
}
function closeTradePicker() {
  tradePickerOpen = false;
  const root = document.getElementById("tradePickerRoot");
  if (root) root.innerHTML = "";
  if (reviewTiptap) reviewTiptap.commands.focus();
}
/* 选择器自己的搜索，不复用记录页的 tradeMatchesSearch()——那个只搜
   text/textarea/url，而在这里最常搜的恰恰是日期和模型（select 类型）。 */
function tradePickerMatches(t, q) {
  if (!q) return true;
  return schema.some((f) => {
    const v = t[f.id];
    if (v === undefined || v === null || v === "") return false;
    const str = Array.isArray(v) ? v.join(" ") : String(v);
    return str.toLowerCase().includes(q);
  });
}
function tradePickerList() {
  const q = (tradePickerQuery || "").trim().toLowerCase();
  const dateF = roleField("date");
  const list = trades.filter((t) => tradePickerMatches(t, q));
  return list.slice().sort((a, b) => {
    const av = dateF ? (a[dateF.id] || "") : "";
    const bv = dateF ? (b[dateF.id] || "") : "";
    if (av !== bv) return av < bv ? 1 : -1;
    return (b._created_at || "") < (a._created_at || "") ? -1 : 1;
  });
}
function tradePickerResultsHtml() {
  const all = tradePickerList();
  if (!all.length) {
    return `<div class="tradePickerEmpty">${esc(trades.length ? T("review.picker.empty") : T("review.picker.noTrades"))}</div>`;
  }
  const shown = all.slice(0, TRADE_PICKER_LIMIT);
  const dateF = roleField("date"), modelF = roleField("model"), resultF = roleField("result"),
    rF = roleField("r_multiple"), shotF = roleField("screenshot");
  let html = shown.map((t) => {
    const result = resultF ? t[resultF.id] : "";
    const rc = resultColor(result);
    const shot = shotF ? t[shotF.id] : null;
    const rVal = rF ? t[rF.id] : "";
    const rTxt = (rVal !== undefined && rVal !== "" && !isNaN(parseFloat(rVal)))
      ? (parseFloat(rVal) >= 0 ? "+" : "") + rVal + "R" : "";
    return `<button class="tradePickerRow" data-action="pick-trade" data-id="${esc(t.id)}">
      ${shot
        ? `<img class="tradePickerThumb" src="${esc(imgSrc(shot))}" loading="lazy" referrerpolicy="no-referrer" data-fallback-url="${esc(imgSrc(shot))}" data-fallback-class="tradePickerThumbEmpty" onerror="window.__imgFallback(this)" />`
        : `<span class="tradePickerThumbEmpty">${ICONS.camera}</span>`}
      <span class="tradePickerDate mono">${esc((dateF && t[dateF.id]) || "—")}</span>
      <span class="tradePickerModel">${esc((modelF && t[modelF.id]) || "")}</span>
      <span class="mono" style="color:${rc};font-weight:600;">${esc(result || "")}</span>
      <span class="mono" style="color:${rc};">${esc(rTxt)}</span>
    </button>`;
  }).join("");
  if (all.length > shown.length) {
    html += `<div class="tradePickerMore">${esc(T("review.picker.more", { n: TRADE_PICKER_LIMIT }))}</div>`;
  }
  return html;
}
function renderTradePicker() {
  const root = document.getElementById("tradePickerRoot");
  if (!root) return;
  if (!tradePickerOpen) { root.innerHTML = ""; return; }
  root.innerHTML = `<div class="overlay tradePickerOverlay" data-action="close-trade-picker">
    <div class="modal tradePickerModal">
      <div class="modalHead">
        <div class="display" style="font-size:16px;font-weight:600;">${esc(T("review.picker.title"))}</div>
        <button class="iconBtn" data-action="close-trade-picker">${ICONS.x}</button>
      </div>
      <div class="tradePickerSearch">
        ${ICONS.search}
        <input class="input" type="text" id="tradePickerInput" placeholder="${esc(T("review.picker.search"))}"
          value="${esc(tradePickerQuery)}" oninput="window.__tradePickerInput(this)" />
      </div>
      <div class="tradePickerResults" id="tradePickerResults">${tradePickerResultsHtml()}</div>
    </div>
  </div>`;
  const input = document.getElementById("tradePickerInput");
  if (input) input.focus();
}
window.__tradePickerInput = function (el) {
  tradePickerQuery = el.value;
  const box = document.getElementById("tradePickerResults");
  if (box) box.innerHTML = tradePickerResultsHtml();   // 只换结果，输入框留着
};
function insertTradeRef(id) {
  const ed = reviewTiptap;
  closeTradePicker();
  if (!ed || !/^[A-Za-z0-9_-]+$/.test(id || "")) return;
  const size = ed.state.doc.content.size;
  const r = tradePickerRange || { from: ed.state.selection.from, to: ed.state.selection.to };
  tradePickerRange = null;
  ed.chain().focus().insertContentAt({ from: Math.min(r.from, size), to: Math.min(r.to, size) }, [
    { type: "tradeRef", attrs: { id } },
    { type: "text", text: " " },
  ]).run();
}

/* ---------- 打开 / 关闭编辑器 ---------- */
function openReviewEditor(id) {
  const r = reviews.find((x) => x.id === id);
  if (!r) return;
  editingReview = {
    id: r.id, title: r.title || "", body: r.body || "", week_start: r.week_start || "", day_date: r.day_date || "",
    mode: r.mode || recordMode, group_id: r.group_id || null,
    sort_order: r.sort_order === undefined ? null : r.sort_order,
    _isNew: false,
  };
  reviewSaveState = "idle";
  reviewSavedAt = null;
  reviewSaveError = null;
  tradePickerOpen = false;
  renderReviewEditor(true);
}
function openNewReview(opts) {
  const o = opts || {};
  editingReview = {
    id: newReviewId(), title: "", body: "",
    // 顶部「写复盘」默认关联到今天：交易日记里按天复盘远比按周频繁，
    // 想写周复盘点一下「周」就行。分组里新建仍然什么都不关联
    week_start: o.weekStart !== undefined ? o.weekStart : "",
    day_date: o.dayDate !== undefined ? o.dayDate : todayStr(),
    mode: recordMode,
    group_id: o.groupId || null,
    sort_order: null,
    _isNew: true,
  };
  reviewSaveState = "idle";
  reviewSavedAt = null;
  reviewSaveError = null;
  tradePickerOpen = false;
  renderReviewEditor(true);
}
async function closeReviewEditor() {
  syncReviewBody();   // 下面判断「是不是空白页」要看最新的正文
  tradePickerOpen = false;
  const wasNew = editingReview && editingReview._isNew;
  const isBlank = editingReview && !(editingReview.title || "").trim() && !(editingReview.body || "").trim();
  if (wasNew && isBlank) {
    // 开了个空白页又直接关掉：别往数据库里塞空行
    clearTimeout(reviewSaveTimer); reviewSaveTimer = null;
    reviewSaveState = "idle";
    clearReviewDraft();
  } else {
    await flushReviewSave();
  }
  editingReview = null;
  reviewEditorRenderedFor = null;
  renderReviewEditor();
  render();
}


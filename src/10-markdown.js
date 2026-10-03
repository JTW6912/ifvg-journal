/* ============================================================
   MARKDOWN —— 复盘正文的渲染器

   ⚠️ 安全模型（改这一段前务必读完）
   这是整个项目里唯一一处把用户输入变成 HTML 的地方，别处全部走 esc()。
   而管理员能只读查看任意用户的数据，所以一段带 <img onerror> 的复盘正文
   会在管理员的会话里执行 —— 那是权限最高的会话。

   因此本渲染器的铁律是「先转义、再排版」：
     1. 一进来就把整段过 esc()，此后源文本里不可能再出现真正的 < > " &
     2. 后续所有规则都只在这份已转义的文本上加白名单标签
     3. 链接和图片的 URL 只放行 http(s):// 开头的（挡 javascript: / data:）
   任何时候都不要为了支持某个语法而把原始 HTML 放回去。
   ============================================================ */
/* 正文能上色的几种颜色。语法是 {red|文字}。
   ⚠️ 颜色名走这份白名单，渲染出去的只有我们自己的类名（mdC-red 这种），
   **绝不能把用户写的东西当成 CSS 塞进 style**——那等于把整套「先转义再排版」的
   防线拆了。具体颜色值在 style.css 里按主题定义，深浅色都对得上。 */
const MD_COLORS = ["red", "green", "yellow", "blue", "gray", "mark"];

/* ⚠️ 只判断协议，**不做转义**：返回的是原样的字符串。
   markdown 渲染器里能直接塞进属性，是因为那边整段在最开头就 esc() 过了。
   如果你从别处（比如原始字段值）拿 URL 过来用，必须自己再 esc() 一次，
   否则 `https://x.com/a" onmouseover="..."` 能从 href 里逃出去挂事件处理器。 */
/* TradingView 的「复制链接」给的是快照页面（…/x/8z0cHCrw/），不是图片。图片本体在
   s3.tradingview.com/snapshots/{id 首字符小写}/{id}.png —— 就是那个页面 og:image 里的地址，实测过。
   存的仍然是用户粘的原链接（点开能回到 TV 页面），只在「显示成图片」的地方换成直链。
   FX Replay 那种（fxr-snapshots-….s3.amazonaws.com/xxx.png）本来就是图片直链，原样放行。 */
const TV_SNAPSHOT_RE = /^https?:\/\/(?:[a-z-]+\.)?tradingview\.com\/x\/([A-Za-z0-9]+)\/?(?:[?#]\S*)?$/i;
function imgSrc(u) {
  const raw = String(u || "").trim();
  const m = raw.match(TV_SNAPSHOT_RE);
  return m ? `https://s3.tradingview.com/snapshots/${m[1][0].toLowerCase()}/${m[1]}.png` : raw;
}

function mdSafeUrl(u) {
  const raw = String(u || "").trim();
  // esc() 把 & 变成了 &amp;，放进 HTML 属性里本来就该是这个形态，不用还原
  return /^https?:\/\//i.test(raw) ? raw : null;
}

/* 反斜杠转义：\* \# \[ 这种显示成字面字符。所见即所得编辑器里打出一个真正的 *，
   存回 markdown 时只能写成 \*，不然下次打开就被当成斜体了。
   esc() 之后 > < & 已经变成实体，所以实体也要能被转义（\&gt; 是一个字面的 >，
   用在行首时防止被当成引用）。 */
const MD_ESCAPABLE_RE = /\\(&gt;|&lt;|&amp;|[\\`*_{}\[\]()#+\-.!~|])/g;

/* 行内规则。传进来的 text 必须已经是 esc() 过的。
   forEditor：输出给 Tiptap 解析用的 HTML（交易引用只留 id 壳子，图片不挂点击/兜底属性），
   不是给人看的。两边共用同一套规则，保证「编辑器里看到的」和「只读时看到的」是同一个东西。 */
function mdInline(text, forEditor) {
  // 占位符用私有区字符包起来，正文里不可能打出来，不会跟用户文字撞上
  const slots = [];
  const hold = (html) => { slots.push(html); return "\uE000" + (slots.length - 1) + "\uE001"; };

  // 行内代码先抽走，免得里面的 * _ [ 被当成语法。前面是反斜杠的反引号是字面字符，不开代码
  let out = String(text).replace(/(?<!\\)`([^`\n]+)`/g, (m, c) => hold(`<code>${c}</code>`));
  // 然后是转义字符：抽走之后，后面的加粗/链接规则就看不到这些 * [ 了
  out = out.replace(MD_ESCAPABLE_RE, (m, c) => hold(c));

  // 交易引用要排在链接前面，否则 [[trade:x]] 会先被方括号规则啃掉。
  // 生成出来的 HTML（交易胶囊、图片、链接标签）都存进占位符：里面的 URL、模型名
  // 可能带 * 或 _，留在明面上会被后面的加粗/斜体规则插进 <em>，把属性改坏
  out = out.replace(/\[\[trade:([A-Za-z0-9_-]+)\]\]/g, (m, id) =>
    hold(forEditor ? `<span data-trade-ref="${id}"></span>` : tradeRefHtml(id)));
  // 页面引用（模型库的系统 / 策略 / 错题，或者另一篇复盘）。跟交易引用同一个套路
  out = out.replace(/\[\[page:([A-Za-z0-9_-]+)\]\]/g, (m, id) =>
    hold(forEditor ? `<span data-page-ref="${id}"></span>` : pageRefHtml(id)));

  // 上色 {red|文字}。放在加粗/斜体之前，好让里面还能继续排版：
  // {red|**粗的红字**} 会先变成 <span>**粗的红字**</span>，加粗规则随后再跑一遍
  // 颜色名和 MD_COLORS 保持一致；写成字面量正则，省得为了拼字符串再套一层转义
  out = out.replace(/\{(red|green|yellow|blue|gray|mark)\|([^}\n]+)\}/g,
    (m, c, inner) => `<span class="mdC mdC-${c}">${inner}</span>`);

  // 图片在链接之前（语法上 ![]() 是 []() 的超集）
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, url) => {
    const safe = mdSafeUrl(url) && imgSrc(mdSafeUrl(url));
    if (!safe) return m;
    if (forEditor) return hold(`<img src="${safe}" alt="${alt}" />`);
    return hold(`<img class="mdImg" src="${safe}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" data-action="preview-image" data-url="${safe}" data-fallback-url="${safe}" data-fallback-class="mdImgFallback" onerror="window.__imgFallback(this)" />`);
  });

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
    const safe = mdSafeUrl(url);
    if (!safe) return m;
    return hold(`<a href="${safe}" target="_blank" rel="noopener noreferrer nofollow">`) + label + hold("</a>");
  });

  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*(?![*\w])/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_\w])_([^_\n]+)_(?![_\w])/g, "$1<em>$2</em>");
  out = out.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");

  // \u5360\u4F4D\u7B26\u53EF\u4EE5\u5957\u5360\u4F4D\u7B26\uFF08\u56FE\u7247\u7684 alt \u91CC\u6709\u8F6C\u4E49\u5B57\u7B26\u4E4B\u7C7B\uFF09\uFF0C\u6240\u4EE5\u9012\u5F52\u8FD8\u539F\u3002
  // \u540E\u5B58\u7684\u53EA\u4F1A\u5F15\u7528\u5148\u5B58\u7684\uFF0C\u4E0D\u4F1A\u6210\u73AF
  const restore = (str) => str.replace(/\uE000(\d+)\uE001/g, (m, i) => restore(slots[+i]));
  return restore(out);
}

/* [[trade:xxx]] 渲染成一个可点的小胶囊。
   找不到那笔交易时**显式标红**，不静默消失 —— 组合引用失效字段的老坑同款。
   复盘只在实盘模式下用，所以 trades 里就是实盘那批，不存在跨 mode 查不到的情况。 */
function tradeRefHtml(id) {
  const t = trades.find((x) => x.id === id);
  if (!t) {
    return `<span class="tradeRef broken" title="${esc(id)}">${ICONS.alert}<span class="tradeRefMeta">${esc(T("review.tradeMissing"))}</span></span>`;
  }
  const dateF = roleField("date"), modelF = roleField("model"), resultF = roleField("result"), rF = roleField("r_multiple");
  const result = resultF ? t[resultF.id] : "";
  const rc = resultColor(result);
  const bits = [];
  if (dateF && t[dateF.id]) bits.push(esc(t[dateF.id]));
  if (modelF && t[modelF.id]) bits.push(esc(String(t[modelF.id])));
  const rVal = rF ? t[rF.id] : "";
  const rTxt = (rVal !== undefined && rVal !== "" && !isNaN(parseFloat(rVal)))
    ? (parseFloat(rVal) >= 0 ? "+" : "") + rVal + "R" : "";
  return `<span class="tradeRef" data-action="open-trade-ref" data-id="${esc(id)}" title="${esc(T("review.tradeOpen"))}">`
    + `<span class="tradeRefIcon">${ICONS.grid}</span>`
    + `<span class="tradeRefMeta">${bits.join(" · ") || esc(id)}</span>`
    + (result ? `<span class="mono" style="color:${rc};font-weight:600;">${esc(result)}</span>` : "")
    + (rTxt ? `<span class="mono" style="color:${rc};">${esc(rTxt)}</span>` : "")
    + `</span>`;
}

/* [[page:xxx]] → 一枚可点的页面胶囊。能指向模型库的任何一页，也能指向一篇复盘
   （「今天又犯了 [[page:连损那条错题]]」）。找不到时跟交易引用一样显式标红，不静默消失 */
function findDocById(id) {
  return pbFind(id) || reviews.find((r) => r.id === id) || null;
}
function pageRefKindLabel(d) {
  if (!d) return "";
  if (d.kind === "system") return T("pb.kind.system");
  if (d.kind === "strategy") return T("pb.kind.strategy");
  if (d.kind === "mistake") return T("pb.kind.mistake");
  return T("pb.kind.review");
}
function pageRefHtml(id) {
  const d = findDocById(id);
  if (!d) {
    return `<span class="pageRef broken" title="${esc(id)}">${ICONS.alert}<span class="pageRefMeta">${esc(T("pb.pageMissing"))}</span></span>`;
  }
  const title = isPbDoc(d) ? pbLabel(d.id) : reviewTitleOf(d);
  return `<span class="pageRef kind-${esc(d.kind || "review")}" data-action="open-page-ref" data-id="${esc(id)}" title="${esc(T("pb.pageOpen"))}">`
    + `<span class="pageRefKind">${esc(pageRefKindLabel(d))}</span>`
    + `<span class="pageRefMeta">${esc(title)}</span>`
    + `</span>`;
}
function extractPageRefs(body) {
  const out = [];
  const re = /\[\[page:([A-Za-z0-9_-]+)\]\]/g;
  let m;
  while ((m = re.exec(body || ""))) { if (!out.includes(m[1])) out.push(m[1]); }
  return out;
}

/* 按没被转义的 | 切格子。\| 是单元格里的字面竖线（编辑器存表格时会这么写） */
function mdTableRowCells(line) {
  let inner = line.trim();
  if (inner.startsWith("|")) inner = inner.slice(1);
  if (inner.endsWith("|") && !inner.endsWith("\\|")) inner = inner.slice(0, -1);
  return inner.split(/(?<!\\)\|/).map((c) => c.trim());
}
function mdIsTableDivider(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line || "");
}

/* markdown → HTML。
   forEditor = true 时输出给 Tiptap 解析（见 mdToEditorHtml），结构上有两处不同：
   待办要写成 Tiptap 认的 <ul data-type="taskList">，而且待办和普通条目不能混在同一个列表里；
   引用里的每一行包进 <p>。其余完全一样——同一套规则，编辑器里和只读时看到的才会是同一个东西。 */
function renderMarkdown(src, forEditor) {
  if (!src || !String(src).trim()) return "";
  const lines = esc(src).replace(/\r\n?/g, "\n").split("\n");
  const inl = (t) => mdInline(t, forEditor);
  let html = "";
  let i = 0;
  // 子列表要放进上一个 <li> 里面才是合法结构，
  // 所以开子列表时把刚写完的 </li> 撕掉，收子列表时再补回去。
  const listStack = []; // [{ kind: 'ul'|'ol'|'task', nested: boolean }]
  const MAX_LIST_DEPTH = 4;

  // 这两个直接写 html，不返回字符串：`html += openList()` 会先读走 html 的旧值，
  // 函数内部对 html 的截断就白做了
  function openList(kind) {
    let nested = false;
    if (listStack.length && html.endsWith("</li>")) { html = html.slice(0, -5); nested = true; }
    listStack.push({ kind, nested });
    html += kind === "task" ? `<ul data-type="taskList" class="mdList">` : `<${kind} class="mdList">`;
  }
  function closeOneList() {
    const l = listStack.pop();
    html += `</${l.kind === "ol" ? "ol" : "ul"}>` + (l.nested ? "</li>" : "");
  }
  function closeLists(toDepth) {
    while (listStack.length > toDepth) closeOneList();
  }

  while (i < lines.length) {
    const line = lines[i];

    // 代码块 ```
    if (/^\s*```/.test(line)) {
      closeLists(0);
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // 吃掉收尾的 ```
      html += `<pre class="mdPre"><code>${buf.join("\n")}</code></pre>`;
      continue;
    }

    // 表格：一行表头 + 一行分隔线，后面跟数据行
    if (/\|/.test(line) && mdIsTableDivider(lines[i + 1] || "")) {
      closeLists(0);
      const head = mdTableRowCells(line);
      i += 2;
      const body = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) { body.push(mdTableRowCells(lines[i])); i++; }
      html += `<div class="mdTableWrap"><table class="mdTable"><thead><tr>`
        + head.map((c) => `<th>${inl(c)}</th>`).join("")
        + `</tr></thead><tbody>`
        + body.map((r) => `<tr>` + head.map((_, ci) => `<td>${inl(r[ci] || "")}</td>`).join("") + `</tr>`).join("")
        + `</tbody></table></div>`;
      continue;
    }

    // 空行 = 段落分隔，同时结束列表
    if (!line.trim()) { closeLists(0); i++; continue; }

    // 分割线
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { closeLists(0); html += `<hr class="mdHr" />`; i++; continue; }

    // 标题 # ~ ######
    const h = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (h) {
      closeLists(0);
      const lv = Math.min(h[1].length, 6);
      html += `<h${lv} class="mdH mdH${lv}">${inl(h[2].trim())}</h${lv}>`;
      i++; continue;
    }

    // 引用 >（esc() 之后 > 已经变成 &gt;）
    if (/^\s{0,3}&gt;\s?/.test(line)) {
      closeLists(0);
      const buf = [];
      while (i < lines.length && /^\s{0,3}&gt;\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s{0,3}&gt;\s?/, "")); i++; }
      const inner = buf.map((b) => inl(b)).join("<br />");
      html += `<blockquote class="mdQuote">${forEditor ? `<p>${inner}</p>` : inner}</blockquote>`;
      continue;
    }

    // 列表（含待办）。每 2 个空格缩进算一层
    const li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (li) {
      const depth = Math.min(Math.floor(li[1].replace(/\t/g, "  ").length / 2), MAX_LIST_DEPTH - 1) + 1;
      let kind = /^\d/.test(li[2]) ? "ol" : "ul";
      let content = li[3];
      let taskHtml = "";
      let done = false;
      const task = kind === "ul" && content.match(/^\[( |x|X)\](?:\s+(.*))?$/);
      if (task) {
        done = task[1].toLowerCase() === "x";
        content = task[2] || "";
        taskHtml = `<span class="mdTask ${done ? "done" : ""}"></span>`;
        if (forEditor) kind = "task";
      }
      while (listStack.length > depth) closeOneList();
      while (listStack.length < depth) openList(kind);
      if (listStack[depth - 1].kind !== kind) { closeOneList(); openList(kind); }
      if (forEditor && task) html += `<li data-type="taskItem" data-checked="${done}">${inl(content)}</li>`;
      else html += `<li${taskHtml ? ' class="mdTaskItem"' : ""}>${taskHtml}${inl(content)}</li>`;
      i++; continue;
    }

    // 普通段落：连着的非空行合成一段，段内换行转 <br>
    closeLists(0);
    const para = [];
    while (i < lines.length && lines[i].trim()
      && !/^\s*```/.test(lines[i])
      && !/^\s{0,3}#{1,6}\s/.test(lines[i])
      && !/^\s{0,3}&gt;\s?/.test(lines[i])
      && !/^(\s*)([-*+]|\d+[.)])\s+/.test(lines[i])
      && !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])) { para.push(lines[i]); i++; }
    if (forEditor) {
      // 编辑器里图片是块级节点，不能放在段落里：包在 <p> 里的话 Tiptap 会把它拎出来，
      // 原地留下一个空段落（正文里凭空多一行空白）。所以单独成行的图片直接输出
      let buf = [];
      const flush = () => { if (buf.length) { html += `<p>${buf.join("<br />")}</p>`; buf = []; } };
      para.forEach((l) => {
        const h = inl(l);
        if (/^\s*<img [^>]*\/>\s*$/.test(h)) { flush(); html += h; } else buf.push(h);
      });
      flush();
    } else {
      html += `<p class="mdP">${para.map((l) => inl(l)).join("<br />")}</p>`;
    }
  }
  closeLists(0);
  return html;
}

/* 列表页摘要用：把 markdown 语法剥干净，只留人话 */
function mdPlainExcerpt(src, max) {
  const t = String(src || "")
    // 转义过的字符先换成私有区字符藏起来，免得下面「去掉 * _ ~」把字面的星号也删了
    .replace(/\\([\\`*_{}\[\]()#+\-.!~|>])/g, (m, c) => String.fromCharCode(0xE100 + c.charCodeAt(0)))
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[\[trade:[A-Za-z0-9_-]+\]\]/g, "[trade]")
    .replace(/\[\[page:([A-Za-z0-9_-]+)\]\]/g, (m, id) => { const d = findDocById(id); return d ? "[" + (isPbDoc(d) ? pbTitle(d) : reviewTitleOf(d)) + "]" : "[page]"; })
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "[img]")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\{(?:red|green|yellow|blue|gray|mark)\|([^}\n]+)\}/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/gm, " ")   // 表格分隔行
    .replace(/^\s*([-*+]|\d+[.)])\s+(\[[ xX]\]\s*)?/gm, "")                  // 列表标记 + 待办方框
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*-{3,}\s*$/gm, " ")
    .replace(/[*_~`|]/g, "")
    .replace(/[-]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xE100))
    .replace(/\s+/g, " ")
    .trim();
  const lim = max || 150;
  return t.length > lim ? t.slice(0, lim) + "…" : t;
}


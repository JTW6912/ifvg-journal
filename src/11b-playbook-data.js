/* ============================================================
   模型库（PLAYBOOK）—— 数据模型

   三层东西，都是一篇「可以写长文的页面」，存在 journal_playbook 表里：
     交易系统 system    交易框架 / 交易语言，例：RIFVG、TLD-QM
     衍生策略 strategy  同一个系统衍生出来的 setup，例：趋势延续、猎杀反转（parent_id = 系统）
     错题笔记 mistake   一条反复出现的错误：涉及哪些单、错在哪、怎么规避（parent_id = 系统或策略，空 = 通用）
   正文是 markdown，编辑器 / 折叠 / 目录全部复用复盘那一套（editingReview 上带 kind 就是模型库页面）。

   交易属于哪一页存在交易自己身上（trades.data 里的两个保留键，不是用户字段）：
     __pb       页面 id；"__none" = 确认过「不属于任何模型」，归类时不再出现
     __pb_star  true = 「我关注的关联交易」，在页面上单独展示
   一笔交易只属于一个策略（说不清是哪个子策略时归到系统本身），放在交易上删交易时自然就没了，
   也不用迁移——data 是 jsonb，多两个键而已。

   错题涉及哪些交易 = 错题正文里的 [[trade:xxx]]（linked_trade_ids 是冗余索引，跟复盘一样「正文才是唯一真相」）。
   所以「这笔错在哪」就是正文里紧跟在交易胶囊后面的那句话，用户在编辑器里直接改。

   ⚠ 指向已删除页面的 __pb 一律按「未归类」读（pbTradePageId 返回空），不报错也不静默算进别处——
   这样就算删页面时没来得及改交易（比如当时在回测模式，实盘交易不在内存里），交易也只是回到归类队列。
   ============================================================ */
const PB_KINDS = ["system", "strategy", "mistake"];
const PB_KEY = "__pb";
const PB_STAR_KEY = "__pb_star";
const PB_NONE = "__none";

function isPbDoc(d) { return !!d && PB_KINDS.includes(d.kind); }
function newPbId() { return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function pbFind(id) { return id ? pbPages.find((p) => p.id === id) || null : null; }
function pbTitle(p) { return (p && (p.title || "").trim()) || T("pb.untitled"); }

/* 同级里的顺序：排过序的按 sort_order，没排过的按创建先后（先建的系统排前面，跟用户脑子里的顺序一致） */
function pbSortList(list) {
  return list.slice().sort((a, b) => {
    const ao = a.sort_order, bo = b.sort_order;
    const aHas = ao !== null && ao !== undefined, bHas = bo !== null && bo !== undefined;
    if (aHas && bHas && ao !== bo) return ao - bo;
    if (aHas !== bHas) return aHas ? -1 : 1;
    return (a.created_at || "") < (b.created_at || "") ? -1 : (a.created_at || "") > (b.created_at || "") ? 1 : 0;
  });
}
function pbSystems() { return pbSortList(pbPages.filter((p) => p.kind === "system")); }
function pbStrategiesOf(sysId) { return pbSortList(pbPages.filter((p) => p.kind === "strategy" && p.parent_id === sysId)); }
/* 系统被删掉（理论上有衍生策略时不让删，这里防脏数据）的策略：单独当一个顶层项，不能凭空消失 */
function pbOrphanStrategies() { return pbSortList(pbPages.filter((p) => p.kind === "strategy" && !pbFind(p.parent_id))); }
function pbHasPages() { return pbPages.some((p) => p.kind === "system" || p.kind === "strategy"); }

/* 一页往上的那一串（不含自己）：错题 → 策略 → 系统 */
function pbAncestors(p) {
  const out = [];
  let cur = p && pbFind(p.parent_id);
  while (cur && out.length < 3) { out.unshift(cur); cur = pbFind(cur.parent_id); }
  return out;
}
/* 「RIFVG › 趋势延续」。交易表单、筛选、归类都用这一个写法 */
function pbLabel(id) {
  const p = pbFind(id);
  if (!p) return "";
  if (p.kind === "strategy") {
    const sys = pbFind(p.parent_id);
    return sys ? pbTitle(sys) + " › " + pbTitle(p) : pbTitle(p);
  }
  return pbTitle(p);
}

/* 交易能归到哪些页面：系统，紧跟着它的衍生策略。交易表单 / 归类 / 筛选共用这一份顺序 */
function pbAssignOptions() {
  const out = [];
  pbSystems().forEach((s) => {
    out.push({ id: s.id, label: pbTitle(s), full: pbLabel(s.id), depth: 0, kind: "system" });
    pbStrategiesOf(s.id).forEach((st) => out.push({ id: st.id, label: pbTitle(st), full: pbLabel(st.id), depth: 1, kind: "strategy" }));
  });
  pbOrphanStrategies().forEach((st) => out.push({ id: st.id, label: pbTitle(st), full: pbLabel(st.id), depth: 0, kind: "strategy" }));
  return out;
}

/* ---------- 交易归属 ---------- */
function pbTradePageId(t) {
  const v = t && t[PB_KEY];
  if (!v || v === PB_NONE) return "";
  const p = pbFind(v);
  return p && p.kind !== "mistake" ? v : "";
}
function pbTradeIsNone(t) { return !!t && t[PB_KEY] === PB_NONE; }
function pbTradeIsUnsorted(t) { return !pbTradePageId(t) && !pbTradeIsNone(t); }
function pbTradeStarred(t) { return !!(t && t[PB_STAR_KEY]); }
function pbTradeLabel(t) { const id = pbTradePageId(t); return id ? pbLabel(id) : ""; }

/* 系统页算上它所有衍生策略的交易；策略页只算自己 */
function pbScopeIds(pageId) {
  const p = pbFind(pageId);
  if (!p) return [];
  if (p.kind === "system") return [p.id, ...pbStrategiesOf(p.id).map((s) => s.id)];
  return [p.id];
}
function pbTradeDateOf(t) { const dateF = roleField("date"); return (dateF && t[dateF.id]) || ""; }
/* 新的在前：页面上最先想看的是最近那几笔 */
function pbSortTradesDesc(list) {
  return list.slice().sort((a, b) => {
    const ad = pbTradeDateOf(a), bd = pbTradeDateOf(b);
    if (ad !== bd) return ad < bd ? 1 : -1;
    return (b._created_at || "") < (a._created_at || "") ? -1 : 1;
  });
}
function pbTradesOf(pageId) {
  const ids = new Set(pbScopeIds(pageId));
  return pbSortTradesDesc(trades.filter((t) => ids.has(pbTradePageId(t))));
}
function pbUnsortedCount() { return recordMode === "live" ? trades.filter(pbTradeIsUnsorted).length : 0; }

/* ---------- 统计 ----------
   口径跟标题栏一致：只算真的入场了的。明确标了 Faded（taken 有值但不是 Taken）的单是「setup 出现了但没做」，
   照样归在页面里当例子看，但不进胜率和 R——不然没做的单会把这个策略的成绩算花。
   taken 留空的单算入场：实盘记录里常常懒得填这一项，按空值排除的话整页数字会莫名其妙变成 0。 */
function pbIsFaded(t) {
  const takenF = roleField("taken");
  if (!takenF) return false;
  const v = t[takenF.id];
  return !!v && v !== "Taken";
}
function pbStats(list) {
  const counted = list.filter((t) => !pbIsFaded(t));
  const s = filteredSummaryStats(counted);
  return { ...s, all: list.length, faded: list.length - counted.length };
}

/* ---------- 错题 ---------- */
function pbMistakes() { return pbPages.filter((p) => p.kind === "mistake"); }
/* 这一页（系统页连同它的衍生策略）下面挂着的错题 */
function pbMistakesOf(pageId) {
  const ids = new Set(pbScopeIds(pageId));
  return pbSortList(pbMistakes().filter((m) => ids.has(m.parent_id)));
}
/* 通用错题：没挂在任何页面上（或者挂的那页被删了） */
function pbGlobalMistakes() {
  return pbSortList(pbMistakes().filter((m) => { const o = pbFind(m.parent_id); return !o || o.kind === "mistake"; }));
}
function pbMistakeOwner(m) { const o = pbFind(m && m.parent_id); return o && o.kind !== "mistake" ? o : null; }
/* 记新交易 / 归类时要提醒的错题：策略自己的 + 它所属系统的 + 通用的。系统页：系统的 + 它衍生策略的 + 通用的 */
function pbMistakeCandidates(pageId) {
  const p = pbFind(pageId);
  const own = [], fromSystem = [];
  if (p && p.kind === "strategy") {
    own.push(...pbMistakesOf(p.id));
    const sys = pbFind(p.parent_id);
    if (sys) fromSystem.push(...pbSortList(pbMistakes().filter((m) => m.parent_id === sys.id)));
  } else if (p) {
    own.push(...pbMistakesOf(p.id));
  }
  return { own, fromSystem, global: pbGlobalMistakes() };
}
function pbMistakeTradeIds(m) { return extractTradeRefs(m && m.body); }
function pbMistakeTrades(m) {
  const ids = pbMistakeTradeIds(m);
  return pbSortTradesDesc(trades.filter((t) => ids.includes(t.id)));
}
function pbMistakesWithTrade(tradeId) {
  return pbSortList(pbMistakes().filter((m) => pbMistakeTradeIds(m).includes(tradeId)));
}
function pbMistakeLastDate(m) {
  return pbMistakeTrades(m).map(pbTradeDateOf).filter(Boolean).sort().pop() || "";
}

/* 标题文字在两种语言里各是什么。模板是按建页面时的界面语言写进正文的，
   之后用户可能切了语言，所以认标题的时候两种都认 */
function pbHeadingNames(key) {
  const out = [];
  I18N_LANGS.forEach((l) => { const v = I18N[l] && I18N[l][key]; if (v && !out.includes(v)) out.push(v); });
  return out;
}
function pbIsHeadingLine(line, names) {
  const m = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
  return !!m && names.some((n) => m[1].trim().toLowerCase() === n.toLowerCase());
}
/* 正文里某一节（按标题文字找）下面的那一段，剥成纯文字。便利贴上显示「怎么规避」就靠它 */
function pbSectionText(body, key) {
  const names = pbHeadingNames(key);
  const lines = String(body || "").split("\n");
  const at = lines.findIndex((l) => pbIsHeadingLine(l, names));
  if (at < 0) return "";
  const buf = [];
  for (let i = at + 1; i < lines.length; i++) {
    if (/^\s{0,3}#{1,6}\s/.test(lines[i])) break;
    buf.push(lines[i]);
  }
  return mdPlainExcerpt(buf.join("\n"), 400);
}
/* 便利贴上那句话：优先「如何规避」，没写就退回「错误现象」，再退回全文摘要 */
function pbMistakeGist(m) {
  return pbSectionText(m.body, "pb.tpl.avoid") || pbSectionText(m.body, "pb.tpl.symptom")
    || mdPlainExcerpt(String(m.body || "").replace(/^\s{0,3}#{1,6}\s.*$/gm, ""), 160);
}

const PB_TRADE_LINE_RE = (id) => new RegExp("^\\s*[-*+]\\s+(?:\\[[ xX]\\]\\s+)?\\[\\[trade:" + id + "\\]\\](.*)$");
/* 错题正文里，紧跟在这笔交易胶囊后面的那句话（「这笔错在哪」）。只认列表项：
   别的地方顺手提到的胶囊没有固定的「后面那句」可言 */
function pbMistakeLineNote(body, tradeId) {
  if (!/^[A-Za-z0-9_-]+$/.test(tradeId || "")) return "";
  const re = PB_TRADE_LINE_RE(tradeId);
  const line = String(body || "").split("\n").find((l) => re.test(l));
  if (!line) return "";
  return mdPlainExcerpt(line.match(re)[1].replace(/^\s*[-—:：·]\s*/, ""), 120);
}

/* 往错题正文里加一笔交易：写成「- [[trade:id]] 错在哪」，放进「涉及的交易」那一节的末尾。
   找不到那一节就在文末补一节。已经引用过这笔就原样返回。
   note 是用户随手打的一句话，要转义成 markdown 的普通文字（不然里面的 * [ 会被当成语法） */
function pbAppendTradeToBody(body, tradeId, note) {
  const src = String(body || "");
  if (!/^[A-Za-z0-9_-]+$/.test(tradeId || "")) return src;
  if (extractTradeRefs(src).includes(tradeId)) return src;
  const clean = String(note || "").replace(/\s+/g, " ").trim();
  const item = "- [[trade:" + tradeId + "]]" + (clean ? " " + mdEscapeText(clean, {}) : "");
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const names = pbHeadingNames("pb.tpl.mistakeTrades");
  const at = lines.findIndex((l) => pbIsHeadingLine(l, names));
  if (at < 0) {
    const head = "## " + T("pb.tpl.mistakeTrades");
    return (src.trim() ? src.replace(/\s+$/, "") + "\n\n" : "") + head + "\n\n" + item;
  }
  let end = lines.length;
  for (let i = at + 1; i < lines.length; i++) if (/^\s{0,3}#{1,6}\s/.test(lines[i])) { end = i; break; }
  let last = end - 1;
  while (last > at && !lines[last].trim()) last--;
  // 上一行是列表项就紧贴着接上（同一个列表）；是标题或普通段落就空一行再开列表
  const prevIsItem = last > at && /^\s*[-*+]\s/.test(lines[last]);
  const insert = prevIsItem ? [item] : ["", item];
  const rest = lines.slice(last + 1);
  const out = lines.slice(0, last + 1).concat(insert, rest.length && rest[0].trim() ? [""] : [], rest);
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}
/* 从错题正文里拿掉这笔交易所在的那个列表项。别处行文里顺手提到的胶囊不动——
   那是用户自己写的句子，删了会把句子删断。返回 { body, removed, stillLinked } */
function pbRemoveTradeFromBody(body, tradeId) {
  const src = String(body || "");
  if (!/^[A-Za-z0-9_-]+$/.test(tradeId || "")) return { body: src, removed: false, stillLinked: false };
  const re = PB_TRADE_LINE_RE(tradeId);
  const lines = src.split("\n");
  const kept = lines.filter((l) => !re.test(l));
  const out = kept.join("\n").replace(/\n{3,}/g, "\n\n");
  return { body: out, removed: kept.length !== lines.length, stillLinked: extractTradeRefs(out).includes(tradeId) };
}

/* ---------- 归类时的建议 ----------
   先看「同一个模型标签以前大多被归到哪一页」：用户归过几笔之后，这个对应关系就学出来了，
   比任何字面匹配都准（标签叫 ifvg、系统叫 RIFVG 这种）。还没归过就退回名字匹配。 */
function pbSuggestFor(t) {
  const modelF = roleField("model");
  const tag = modelF ? t[modelF.id] : "";
  const tags = (Array.isArray(tag) ? tag : [tag]).map((x) => String(x || "").trim().toLowerCase()).filter(Boolean);
  if (!tags.length) return "";
  const counts = {};
  trades.forEach((x) => {
    if (x.id === t.id) return;
    const pid = pbTradePageId(x);
    if (!pid) return;
    const v = x[modelF.id];
    const xs = (Array.isArray(v) ? v : [v]).map((y) => String(y || "").trim().toLowerCase());
    if (xs.some((y) => tags.includes(y))) counts[pid] = (counts[pid] || 0) + 1;
  });
  const best = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  if (best) return best;
  const opts = pbAssignOptions();
  const exact = opts.find((o) => tags.includes(o.label.trim().toLowerCase()));
  if (exact) return exact.id;
  const loose = opts.find((o) => tags.some((g) => g.length >= 3 && o.label.toLowerCase().includes(g)));
  return loose ? loose.id : "";
}

/* 新页面的正文模板。按当时的界面语言写进去，之后就是用户自己的文字了 */
function pbTemplateBody(kind) {
  const h = (k) => "## " + T(k);
  if (kind === "system") return [h("pb.tpl.structure"), h("pb.tpl.conditions"), h("pb.tpl.manage")].join("\n\n");
  if (kind === "strategy") return [h("pb.tpl.setupLooks"), h("pb.tpl.conditions"), h("pb.tpl.manage")].join("\n\n");
  return [h("pb.tpl.symptom"), h("pb.tpl.mistakeTrades"), h("pb.tpl.avoid")].join("\n\n");
}

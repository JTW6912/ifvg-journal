/* ============================================================
   模型库（PLAYBOOK）—— 数据模型

   三层东西，都是一篇「可以写长文的页面」，存在 journal_playbook 表里：
     交易系统 system    交易框架 / 交易语言，例：RIFVG、TLD-QM
     衍生策略 strategy  同一个系统衍生出来的 setup，例：趋势延续、猎杀反转（parent_id = 系统）
     错题笔记 mistake   一条反复出现的错误：涉及哪些单、错在哪、怎么规避（parent_id = 系统或策略，空 = 通用）
     待验证   verify    还不确定能不能做的想法：涉及哪些单、成绩如何、结论（归属规则跟错题一样）。
                        status = watching 观察中 / works 验证可做 / rejected 已否定；可做的能一键升级成衍生策略
   错题和待验证合称「笔记」（pbIsNote）：都是「正文里列着几笔交易」的便利贴，不是交易能归进去的页面。
     标签     tag       一个已经确认过的条件 / 变体，例：Mech 模型「有 SMT」。不单开策略、也不是待验证，
                        只把交易标出来，看有它和没它差多少（归属规则跟错题一样）
   笔记和标签合称「挂在页面下面的东西」（pbIsChild）；能归交易的「页面」只有系统和策略（pbIsPage）。
   正文是 markdown，编辑器 / 折叠 / 目录全部复用复盘那一套（editingReview 上带 kind 就是模型库页面）。

   交易属于哪一页存在交易自己身上（trades.data 里的两个保留键，不是用户字段）：
     __pb       页面 id；"__none" = 确认过「不属于任何模型」，归类时不再出现
     __pb_star  true = 「我关注的关联交易」，在页面上单独展示
     __pb_tags  打了哪些标签（标签页面 id 的数组；一笔可以打好几个）
     __pb_note  归类记录：归类时写下的「为什么归到这里 / 这笔看到了什么」。跟交易当时写的备注、
                事后的复盘笔记分开放；存在交易上，所以改归到别的策略时记录跟着走
   一笔交易只属于一个策略（说不清是哪个子策略时归到系统本身），放在交易上删交易时自然就没了，
   也不用迁移——data 是 jsonb，多两个键而已。

   笔记涉及哪些交易 = 笔记正文里的 [[trade:xxx]]（linked_trade_ids 是冗余索引，跟复盘一样「正文才是唯一真相」）。
   所以「这笔错在哪」就是正文里紧跟在交易胶囊后面的那句话，用户在编辑器里直接改。

   ⚠ 指向已删除页面的 __pb 一律按「未归类」读（pbTradePageId 返回空），不报错也不静默算进别处——
   这样就算删页面时没来得及改交易（比如当时在回测模式，实盘交易不在内存里），交易也只是回到归类队列。
   ============================================================ */
const PB_KINDS = ["system", "strategy", "mistake", "verify", "tag"];
const PB_NOTE_KINDS = ["mistake", "verify"];
const PB_CHILD_KINDS = ["mistake", "verify", "tag"];
/* 没挂在任何页面上时叫什么、它所在的那面墙叫什么 */
const PB_GLOBAL_KEY = { mistake: "pb.globalMistake", verify: "pb.globalVerify", tag: "pb.globalTag" };
const PB_LIBRARY_KEY = { mistake: "pb.mistakeLibrary", verify: "pb.verifyLibrary", tag: "pb.tagLibrary" };
const PB_VERIFY_STATUSES = ["watching", "works", "rejected"];
const PB_KEY = "__pb";
const PB_STAR_KEY = "__pb_star";
const PB_TAGS_KEY = "__pb_tags";
const PB_NOTE_KEY = "__pb_note";
const PB_NONE = "__none";

function isPbDoc(d) { return !!d && PB_KINDS.includes(d.kind); }
function pbIsNote(d) { return !!d && PB_NOTE_KINDS.includes(d.kind); }
function pbIsChild(d) { return !!d && PB_CHILD_KINDS.includes(d.kind); }
function pbIsPage(d) { return !!d && (d.kind === "system" || d.kind === "strategy"); }
function pbVerifyStatus(d) { return d && PB_VERIFY_STATUSES.includes(d.status) ? d.status : "watching"; }
/* 已否定的待验证：有结论了，记交易 / 归类时不再摆出来让人勾 */
function pbVerifyRejected(d) { return !!d && d.kind === "verify" && pbVerifyStatus(d) === "rejected"; }
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

/* 一页往上的那一串（不含自己）：笔记 → 策略 → 系统 */
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
  return pbIsPage(p) ? v : "";
}
function pbTradeIsNone(t) { return !!t && t[PB_KEY] === PB_NONE; }
function pbTradeIsUnsorted(t) { return !pbTradePageId(t) && !pbTradeIsNone(t); }
function pbTradeStarred(t) { return !!(t && t[PB_STAR_KEY]); }
function pbTradeNote(t) { const v = t && t[PB_NOTE_KEY]; return typeof v === "string" ? v.trim() : ""; }
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
/* 模型库自己的成绩口径（模型库页顶上「成绩口径」那块设的条件，存在 analysisPrefs.pbScope，跟着账号走）。
   刻意跟分析页的「分析范围」分开：用户在模型库里要排除的是「只记录、没真做」的单，
   不想因此把分析页的口径也改了。代价是两边数字可以不一样——所以页面上把口径写出来，不藏。
   Faded 那条照旧固定排除，口径是在它之外再加的条件 */
function pbScopeConditions() { return (analysisPrefs && analysisPrefs.pbScope) || []; }
function pbScopeActive() { return pbScopeConditions().some(filterNodeIsEffective); }
function pbCountsInStats(t) { return !pbIsFaded(t) && tradeMatchesFilters(t, pbScopeConditions()); }
function pbStats(list) {
  const counted = list.filter(pbCountsInStats);
  const s = filteredSummaryStats(counted);
  return { ...s, all: list.length, faded: list.length - counted.length };
}

/* ---------- 笔记（错题 / 待验证）----------
   两种笔记的归属、候选、涉及的交易规则完全一样，只是 kind 不同 */
function pbNotes(kind) { return pbPages.filter((p) => p.kind === kind); }
/* 这一页（系统页连同它的衍生策略）下面挂着的笔记 */
function pbNotesOf(pageId, kind) {
  const ids = new Set(pbScopeIds(pageId));
  return pbSortList(pbNotes(kind).filter((m) => ids.has(m.parent_id)));
}
function pbNoteOwner(m) { const o = pbFind(m && m.parent_id); return pbIsPage(o) ? o : null; }
/* 通用笔记：没挂在任何页面上（或者挂的那页被删了） */
function pbGlobalNotes(kind) { return pbSortList(pbNotes(kind).filter((m) => !pbNoteOwner(m))); }
/* 记新交易 / 归类时要摆出来的笔记：策略自己的 + 它所属系统的 + 通用的。系统页：系统的 + 它衍生策略的 + 通用的 */
function pbNoteCandidates(pageId, kind) {
  const p = pbFind(pageId);
  const own = [], fromSystem = [];
  if (p && p.kind === "strategy") {
    own.push(...pbNotesOf(p.id, kind));
    const sys = pbFind(p.parent_id);
    if (sys) fromSystem.push(...pbSortList(pbNotes(kind).filter((m) => m.parent_id === sys.id)));
  } else if (p) {
    own.push(...pbNotesOf(p.id, kind));
  }
  return { own, fromSystem, global: pbGlobalNotes(kind) };
}
function pbNoteTradeIds(m) { return extractTradeRefs(m && m.body); }
function pbNoteTrades(m) {
  const ids = pbNoteTradeIds(m);
  return pbSortTradesDesc(trades.filter((t) => ids.includes(t.id)));
}
function pbNotesWithTrade(tradeId, kind) {
  return pbSortList(pbNotes(kind).filter((m) => pbNoteTradeIds(m).includes(tradeId)));
}
function pbNoteLastDate(m) {
  return pbNoteTrades(m).map(pbTradeDateOf).filter(Boolean).sort().pop() || "";
}

/* 错题版的简写，老代码都在用 */
function pbMistakes() { return pbNotes("mistake"); }
function pbMistakesOf(pageId) { return pbNotesOf(pageId, "mistake"); }
function pbGlobalMistakes() { return pbGlobalNotes("mistake"); }
function pbMistakeOwner(m) { return pbNoteOwner(m); }
function pbMistakeCandidates(pageId) { return pbNoteCandidates(pageId, "mistake"); }
function pbMistakeTradeIds(m) { return pbNoteTradeIds(m); }
function pbMistakeTrades(m) { return pbNoteTrades(m); }
function pbMistakesWithTrade(tradeId) { return pbNotesWithTrade(tradeId, "mistake"); }
function pbMistakeLastDate(m) { return pbNoteLastDate(m); }

/* ---------- 标签 ----------
   交易打了哪些标签存在交易自己身上（__pb_tags），跟 __pb 一个套路：删交易时自然就没了，
   指向已删除标签的 id 读的时候直接忽略（pbTradeTagIds）。
   对比的范围：标签挂在哪一页，「没有」就是那一页（系统页含衍生策略）里没打这个标签的交易；
   通用标签跟全部交易比。「有」= 所有打了这个标签的交易（归到别处的也算，不然标了却看不见） */
function pbTags() { return pbNotes("tag"); }
function pbTradeTagIds(t) {
  const v = t && t[PB_TAGS_KEY];
  return Array.isArray(v) ? v.filter((id) => { const p = pbFind(id); return !!p && p.kind === "tag"; }) : [];
}
function pbTagTrades(tag) { return pbSortTradesDesc(trades.filter((t) => pbTradeTagIds(t).includes(tag.id))); }
function pbTagCompare(tag) {
  const withList = pbTagTrades(tag);
  const ids = new Set(withList.map((t) => t.id));
  const owner = pbNoteOwner(tag);
  const scope = owner ? pbTradesOf(owner.id) : pbSortTradesDesc(trades);
  const withoutList = scope.filter((t) => !ids.has(t.id));
  return { with: pbStats(withList), without: pbStats(withoutList), withList, withoutList, owner };
}
/* 「Mech · 有 SMT」：不同系统下可能有同名标签，虚拟字段的选项和筛选条件认的是这个写法 */
function pbTagLabel(tag) { const o = pbNoteOwner(tag); return o ? pbLabel(o.id) + " · " + pbTitle(tag) : pbTitle(tag); }
function pbTradeTagLabels(t) { return pbTradeTagIds(t).map((id) => pbTagLabel(pbFind(id))); }
/* 打 / 摘一个标签之后的数组。顺手清掉指向已删除标签的 id；空了返回 undefined（patch 里 = 删掉这个键） */
function pbTagsToggled(t, tagId) {
  const cur = pbTradeTagIds(t);
  const next = cur.includes(tagId) ? cur.filter((x) => x !== tagId) : cur.concat(tagId);
  return next.length ? next : undefined;
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
/* 便利贴上那句话。错题：优先「如何规避」，没写就退回「错误现象」；
   待验证：优先「结论」，没写就退回「想验证什么」。都没写就是全文摘要 */
function pbMistakeGist(m) {
  const first = m.kind === "verify"
    ? pbSectionText(m.body, "pb.tpl.verdict") || pbSectionText(m.body, "pb.tpl.hypothesis")
    : pbSectionText(m.body, "pb.tpl.avoid") || pbSectionText(m.body, "pb.tpl.symptom");
  // 退回全文摘要时去掉标题和交易胶囊——只列了几笔交易的笔记，摘要里不该是一串「[trade]」
  return first || mdPlainExcerpt(String(m.body || "").replace(/^\s{0,3}#{1,6}\s.*$/gm, "").replace(/\[\[trade:[A-Za-z0-9_-]+\]\]/g, ""), 160);
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

/* 往系统 / 策略页正文里记一条「归类时的发现」：跨好几笔才看得出来的东西（「这个 setup 多半出在开盘 15 分钟内」），
   不该只挂在某一笔上。写进页面正文「归类时的发现」那一节末尾，一条一个列表项：日期 + 当时那笔的胶囊 + 那句话。
   找不到那一节就在文末补一节。跟 pbAppendTradeToBody 不同，同一笔可以被记好几次（不同的发现） */
function pbAppendFindingToBody(body, text, tradeId, date) {
  const src = String(body || "");
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return src;
  const ref = /^[A-Za-z0-9_-]+$/.test(tradeId || "") ? " [[trade:" + tradeId + "]]" : "";
  const item = "- " + (date ? date + ref : ref.trim()) + " " + mdEscapeText(clean, {});
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const at = lines.findIndex((l) => pbIsHeadingLine(l, pbHeadingNames("pb.tpl.findings")));
  if (at < 0) return (src.trim() ? src.replace(/\s+$/, "") + "\n\n" : "") + "## " + T("pb.tpl.findings") + "\n\n" + item;
  let end = lines.length;
  for (let i = at + 1; i < lines.length; i++) if (/^\s{0,3}#{1,6}\s/.test(lines[i])) { end = i; break; }
  let last = end - 1;
  while (last > at && !lines[last].trim()) last--;
  const prevIsItem = last > at && /^\s*[-*+]\s/.test(lines[last]);
  const rest = lines.slice(last + 1);
  const out = lines.slice(0, last + 1).concat(prevIsItem ? [item] : ["", item], rest.length && rest[0].trim() ? [""] : [], rest);
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

/* 新页面的正文模板。按当时的界面语言写进去，之后就是用户自己的文字了 */
function pbTemplateBody(kind) {
  const h = (k) => "## " + T(k);
  if (kind === "system") return [h("pb.tpl.structure"), h("pb.tpl.conditions"), h("pb.tpl.manage")].join("\n\n");
  if (kind === "strategy") return [h("pb.tpl.setupLooks"), h("pb.tpl.conditions"), h("pb.tpl.manage")].join("\n\n");
  if (kind === "verify") return [h("pb.tpl.hypothesis"), h("pb.tpl.mistakeTrades"), h("pb.tpl.verdict")].join("\n\n");
  if (kind === "tag") return [h("pb.tpl.tagWhat"), h("pb.tpl.verdict")].join("\n\n");
  return [h("pb.tpl.symptom"), h("pb.tpl.mistakeTrades"), h("pb.tpl.avoid")].join("\n\n");
}

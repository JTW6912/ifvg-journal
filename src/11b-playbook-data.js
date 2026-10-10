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

/* 一页往上的那一串（不含自己）：分支 → 问题 → 策略 → 系统 */
function pbAncestors(p) {
  const out = [];
  // 编辑器手里那份（editingReview）不带 branch_of，分支关系读库里那份
  const root = pbBranchRoot((p && pbFind(p.id)) || p);
  if (root) out.push(root);
  let cur = pbFind((root || p || {}).parent_id);
  while (cur && out.length < 4) { out.unshift(cur); cur = pbFind(cur.parent_id); }
  return out;
}

/* ---------- 笔记的分支（最多两层） ----------
   一条错题 / 待验证可以当「问题」，下面挂几条更具体的「分支」：branch_of = 问题的 id。
   例：「不知道价格要去哪里」下面挂「mech 看不到回调」「HTF 延续看不到外部 DOL」。
   - 分支只能挂在同种类、自己不是分支的笔记下面（两层封顶）；有分支的笔记不能再去当别人的分支
   - 分支的 parent_id（归属哪个系统 / 策略）始终跟问题一样，改问题归属时一起改（pbSetNoteParent）。
     所以按 parent_id 找「这一页下面的笔记」的地方天然把分支也算进去
   - 问题自己也能直接挂交易：「知道是这个问题，还没想清楚是哪个分支」，以后再手动分下去
   - 问题有了分支之后，自己的状态不再显示，结论看分支
   ⚠ branch_of 指向已删除 / 种类不对 / 本身也是分支的笔记，一律按「不是分支」读，不报错 */
function pbBranchRoot(m) {
  if (!m || !m.branch_of || !pbIsNote(m)) return null;
  const r = pbFind(m.branch_of);
  return r && r.id !== m.id && r.kind === m.kind && !r.branch_of ? r : null;
}
function pbIsBranch(m) { return !!pbBranchRoot(m); }
function pbBranchesOf(m) {
  if (!m || !pbIsNote(m) || pbIsBranch(m)) return [];
  return pbSortList(pbPages.filter((x) => x.branch_of === m.id && x.kind === m.kind && x.id !== m.id));
}
function pbHasBranches(m) { return pbBranchesOf(m).length > 0; }
/* 一组笔记里的顶层：问题和普通的一条。分支跟着它的问题出现，不单独占位置。
   问题不在这组里的分支（比如问题被筛掉了）也算顶层，不能凭空消失 */
function pbTopNotes(list) {
  const ids = new Set(list.map((m) => m.id));
  return list.filter((m) => { const r = pbBranchRoot(m); return !r || !ids.has(r.id); });
}
/* 列表里把分支排到各自的问题后面：[{ m, depth, group }]，depth 1 = 分支，group = 第几组（问题的序号）。
   顶层按原来的顺序，分支按分支自己的顺序；问题不在列表里的分支当顶层 */
function pbNestBranches(list) {
  const out = [];
  const tops = pbTopNotes(list);
  const inList = new Set(list.map((m) => m.id));
  tops.forEach((m, g) => {
    out.push({ m, depth: 0, group: g });
    pbBranchesOf(m).forEach((b) => { if (inList.has(b.id)) out.push({ m: b, depth: 1, group: g }); });
  });
  return out;
}
/* m 能不能挂到 root 下面当分支 */
function pbCanBranchUnder(m, root) {
  return !!m && !!root && m.id !== root.id && pbIsNote(m) && root.kind === m.kind && !pbIsBranch(root) && !pbHasBranches(m);
}
/* 问题连同分支涉及的全部交易（去重）：问题卡片上的总成绩 */
function pbFamilyTrades(m) {
  const ids = new Set(pbNoteTradeIds(m));
  pbBranchesOf(m).forEach((b) => pbNoteTradeIds(b).forEach((id) => ids.add(id)));
  return pbSortTradesDesc(trades.filter((t) => ids.has(t.id)));
}
/* 挂在问题自己身上、还没分到任何分支的交易 */
function pbUnsplitTrades(m) {
  const inBranch = new Set();
  pbBranchesOf(m).forEach((b) => pbNoteTradeIds(b).forEach((id) => inBranch.add(id)));
  return pbNoteTrades(m).filter((t) => !inBranch.has(t.id));
}
/* 同级重排：把 id 放到 targetId 前面 / 后面（targetId 空 = 放到最后），返回要改 sort_order 的那几行。
   siblings 是完整的同级列表（含筛选、搜索藏起来的），所以只动被拖的那一张，别的相对顺序不变 */
function pbReorderPatches(siblings, id, targetId, after) {
  const list = pbSortList(siblings).filter((p) => p.id !== id);
  let at = targetId ? list.findIndex((p) => p.id === targetId) : -1;
  if (at < 0) at = list.length; else if (after) at++;
  const moving = pbFind(id);
  if (!moving) return [];
  list.splice(at, 0, moving);
  return list.map((p, i) => ({ id: p.id, patch: { sort_order: i } })).filter((it) => pbFind(it.id).sort_order !== it.patch.sort_order);
}
/* 「RIFVG › 趋势延续」。交易表单、筛选、归类都用这一个写法 */
function pbLabel(id) {
  const p = pbFind(id);
  if (!p) return "";
  if (p.kind === "strategy") {
    const sys = pbFind(p.parent_id);
    return sys ? pbTitle(sys) + " › " + pbTitle(p) : pbTitle(p);
  }
  const root = pbBranchRoot(p);
  return root ? pbTitle(root) + " › " + pbTitle(p) : pbTitle(p);
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
  return pbSortTradesDesc(scopedTrades().filter((t) => ids.has(pbTradePageId(t))));
}
function pbUnsortedCount() { return recordMode === "live" ? scopedTrades().filter(pbTradeIsUnsorted).length : 0; }

/* ---------- 统计 ----------
   **默认所有归进来的交易都算**：Taken、Faded、missed、data-gathering……不管做没做。
   模型库问的是「这个 setup 本身表现如何」，没做的单也是这个 setup 出现过的样本——这是用户明确要的默认。
   想只看实际做了的，在模型库页顶上「成绩口径」里自己加条件（有「只算 Taken」快捷按钮），
   存在 analysisPrefs.pbScope，跟着账号走。刻意跟分析页的「分析范围」分开，两边数字可以不一样，
   所以口径不是默认时页面上会标出来。
   「做了 / 没做」另外按 taken 字段的实际值分组摆在页面里（pbExecGroups），不靠口径 */
function pbScopeConditions() { return (analysisPrefs && analysisPrefs.pbScope) || []; }
function pbScopeActive() { return pbScopeConditions().some(filterNodeIsEffective); }
function pbCountsInStats(t) { return inDataScope(t) && tradeMatchesFilters(t, pbScopeConditions()); }   // 数据范围外的一律不算

/* ---------- 执行情况：按 taken 字段的值分组 ----------
   直接用用户自己填的值（Taken / Faded / missed / data-gathering…），不翻译成「做了 / 没做」——
   每个人叫法不一样，按值分就永远对得上。顺序跟字段设置里选项的顺序一致，选项里没有的值接在后面，没填的排最后 */
const PB_EXEC_EMPTY = "__empty";
function pbTakenValue(t) {
  const f = roleField("taken");
  const v = f ? t[f.id] : "";
  return v === undefined || v === null ? "" : String(v).trim();
}
function pbExecGroups(list) {
  const f = roleField("taken");
  if (!f) return [];
  const by = new Map();
  list.forEach((t) => { const k = pbTakenValue(t) || PB_EXEC_EMPTY; if (!by.has(k)) by.set(k, []); by.get(k).push(t); });
  const order = (f.options || []).filter((o) => by.has(o));
  [...by.keys()].forEach((k) => { if (!order.includes(k) && k !== PB_EXEC_EMPTY) order.push(k); });
  if (by.has(PB_EXEC_EMPTY)) order.push(PB_EXEC_EMPTY);
  return order.map((k) => ({ value: k, list: by.get(k), stats: filteredSummaryStats(by.get(k)) }));
}
function pbExecMatches(t, value) {
  if (!value) return true;
  return value === PB_EXEC_EMPTY ? !pbTakenValue(t) : pbTakenValue(t) === value;
}
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
function pbTagTrades(tag) { return pbSortTradesDesc(scopedTrades().filter((t) => pbTradeTagIds(t).includes(tag.id))); }
function pbTagCompare(tag) {
  const withList = pbTagTrades(tag);
  const ids = new Set(withList.map((t) => t.id));
  const owner = pbNoteOwner(tag);
  const scope = owner ? pbTradesOf(owner.id) : pbSortTradesDesc(scopedTrades());
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
/* ---------- 笔记 / 标签页面上每笔交易的两样标记 ----------
   存在 journal_playbook.trade_marks 上：{ 交易id: { fav: true, ev: "pro" | "con" | "key" } }。
   跟正文分开存：笔记开在编辑器里时也不会跟正在写的正文打架，标记也不会混进用户的文字里。
   两样是独立的，同一笔可以既收藏又关联：
     fav  收藏：有意思的单子，留着回头看（系统 / 策略页上对应的是交易身上的 __pb_star）
     ev   关联：真正决定这条笔记结论的那几笔。待验证分「支持 / 反驳」这个想法；错题只有一种「关联」（确实是这个错）；
          标签没有这一项（标签页本身就是「有 / 没有」的对比）
   成绩、便利贴上的「关联」那行、「可以下结论了」的提示都只看 ev。
   标记跟着「这条笔记里有没有这笔」走：笔记里已经没有的交易，标记读的时候忽略（pbMarkedIds 过一遍成员） */
const PB_EV_STATES = { verify: ["pro", "con"], mistake: ["key"], tag: [] };
function pbMarksOf(p) {
  const m = p && p.trade_marks;
  return m && typeof m === "object" && !Array.isArray(m) ? m : {};
}
function pbMarkOf(p, tradeId) { const v = pbMarksOf(p)[tradeId]; return v && typeof v === "object" ? v : {}; }
function pbIsFav(p, tradeId) { return !!pbMarkOf(p, tradeId).fav; }
function pbEvOf(p, tradeId) {
  const ev = pbMarkOf(p, tradeId).ev;
  return p && (PB_EV_STATES[p.kind] || []).includes(ev) ? ev : "";
}
/* 点一下关联按钮之后的状态：待验证 无 → 支持 → 反驳 → 无；错题 无 ⇄ 关联 */
function pbEvNext(kind, cur) {
  const s = PB_EV_STATES[kind] || [];
  if (!s.length) return "";
  const i = s.indexOf(cur);
  return i < 0 ? s[0] : s[i + 1] || "";
}
/* 改一笔交易的标记，返回新的整张表（不改原对象）。空了的条目整个删掉，不在库里留一堆 {} */
function pbMarksWith(p, tradeId, patch) {
  const out = { ...pbMarksOf(p) };
  const next = { ...pbMarkOf(p, tradeId), ...patch };
  Object.keys(next).forEach((k) => { if (!next[k]) delete next[k]; });
  if (Object.keys(next).length) out[tradeId] = next; else delete out[tradeId];
  return out;
}
/* 这一页现在有哪些交易（笔记看正文里的胶囊，标签看交易身上的 __pb_tags）。body 传进来是因为笔记开在编辑器里时正文以编辑器为准 */
function pbMemberIds(p, body) {
  if (!p) return [];
  if (p.kind === "tag") return trades.filter((t) => pbTradeTagIds(t).includes(p.id)).map((t) => t.id);
  return extractTradeRefs(body === undefined ? p.body : body);
}
/* 按标记挑出来的那一组：which = "fav" | "ev" | "pro" | "con" */
function pbMarkedTrades(p, list, which) {
  return list.filter((t) => {
    if (which === "fav") return pbIsFav(p, t.id);
    const ev = pbEvOf(p, t.id);
    return which === "ev" ? !!ev : ev === which;
  });
}
/* 待验证：关联的交易够多、而且支持 / 反驳一边倒时，提示可以下结论了。
   门槛用分析页的「最少样本」设置，跟字段拆解同一个口径 */
function pbVerdictHint(p, list) {
  if (!p || p.kind !== "verify" || pbVerifyStatus(p) !== "watching") return null;
  const pro = pbMarkedTrades(p, list, "pro").length, con = pbMarkedTrades(p, list, "con").length;
  const n = pro + con;
  const floor = currentMinSample();
  if (n < floor) return null;
  const share = pro / n;
  if (share >= 0.7) return { suggest: "works", pro, con, n };
  if (share <= 0.3) return { suggest: "rejected", pro, con, n };
  return n >= floor * 2 ? { suggest: "", pro, con, n } : null;   // 样本已经很多还是五五开：多半要拆成更细的条件
}
/* 一笔交易在这一页上的「记录」：笔记看正文里胶囊后面那句话，其它页面看交易身上的归类记录 */
function pbRowNoteOf(p, t, body) {
  if (pbIsNote(p)) return pbMistakeLineNote(body === undefined ? p.body : body, t.id);
  return pbTradeNote(t);
}

/* 错题正文里，紧跟在这笔交易胶囊后面的那句话（「这笔错在哪」）。只认列表项：
   别的地方顺手提到的胶囊没有固定的「后面那句」可言 */
function pbMistakeLineNote(body, tradeId, max) {
  if (!/^[A-Za-z0-9_-]+$/.test(tradeId || "")) return "";
  const re = PB_TRADE_LINE_RE(tradeId);
  const line = String(body || "").split("\n").find((l) => re.test(l));
  if (!line) return "";
  return mdPlainExcerpt(line.match(re)[1].replace(/^\s*[-—:：·]\s*/, ""), max || 120);   // 要拿来改的传 Infinity，不截
}
/* 正文里有没有这笔交易自己的那一行（「- [[trade:id]] …」）。只是行文里提到的不算——那种没有「那句话」可改 */
function pbHasTradeLine(body, tradeId) {
  if (!/^[A-Za-z0-9_-]+$/.test(tradeId || "")) return false;
  const re = PB_TRADE_LINE_RE(tradeId);
  return String(body || "").split("\n").some((l) => re.test(l));
}
/* 把「- [[trade:id]] 那句话」里胶囊后面的文字换成 note（纯文字，转义成 markdown）。只改第一行，跟编辑器里的 pbEditorSetLineNote 一致。
   没有这一行就原样返回 */
function pbSetLineNoteInBody(body, tradeId, note) {
  const src = String(body || "");
  if (!/^[A-Za-z0-9_-]+$/.test(tradeId || "")) return src;
  const re = PB_TRADE_LINE_RE(tradeId);
  const lines = src.split("\n");
  const i = lines.findIndex((l) => re.test(l));
  if (i < 0) return src;
  const clean = String(note || "").replace(/\s+/g, " ").trim();
  const cap = "[[trade:" + tradeId + "]]";
  const at = lines[i].indexOf(cap) + cap.length;
  lines[i] = lines[i].slice(0, at) + (clean ? " " + mdEscapeText(clean, {}) : "");
  return lines.join("\n");
}

/* 往错题正文里加一笔交易：写成「- [[trade:id]] 错在哪」，放进「涉及的交易」那一节的末尾。
   找不到那一节就在文末补一节。已经引用过这笔就原样返回。
   note 是用户随手打的一句话，要转义成 markdown 的普通文字（不然里面的 * [ 会被当成语法） */
function pbAppendTradeToBody(body, tradeId, note, raw) {
  const src = String(body || "");
  if (!/^[A-Za-z0-9_-]+$/.test(tradeId || "")) return src;
  if (extractTradeRefs(src).includes(tradeId)) return src;
  const clean = String(note || "").replace(/\s+/g, " ").trim();
  // raw = note 已经是 markdown（从别的笔记里原样搬过来的那句），不再转义，格式照留
  const item = "- [[trade:" + tradeId + "]]" + (clean ? " " + (raw ? clean : mdEscapeText(clean, {})) : "");
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
/* 「- [[trade:id]] 那句话」里那句话的 markdown 原文（不转成纯文字）：把一笔从一条笔记挪到另一条时原样带过去 */
function pbTradeLineRaw(body, tradeId) {
  if (!/^[A-Za-z0-9_-]+$/.test(tradeId || "")) return "";
  const re = PB_TRADE_LINE_RE(tradeId);
  const line = String(body || "").split("\n").find((l) => re.test(l));
  return line ? line.match(re)[1].trim() : "";
}
/* 合并两条笔记：把 src 的正文并进 dst。
   - src 里列着的交易一行一行搬进 dst「涉及的交易」，那句话原样带过去；dst 已经有这笔的，dst 那行没写字才用 src 的那句
   - src 剩下的正文（去掉交易那几行）不是空模板的话，接在 dst 最后，单开一节「合并自「src 标题」」，里面的标题降一级
   返回新的 dst 正文 */
function pbMergeNoteBodies(dstBody, srcBody, srcTitle) {
  let out = String(dstBody || "");
  const src = String(srcBody || "").replace(/\r\n?/g, "\n");
  const anyLine = /^\s*[-*+]\s+(?:\[[ xX]\]\s+)?\[\[trade:([A-Za-z0-9_-]+)\]\]/;
  src.split("\n").forEach((l) => {
    const m = l.match(anyLine);
    if (!m) return;
    const id = m[1], note = pbTradeLineRaw(src, id);
    if (!extractTradeRefs(out).includes(id)) out = pbAppendTradeToBody(out, id, note, true);
    else if (note && pbHasTradeLine(out, id) && !pbTradeLineRaw(out, id)) {
      const lines = out.split("\n");
      const re = PB_TRADE_LINE_RE(id);
      const i = lines.findIndex((x) => re.test(x));
      lines[i] = lines[i].replace(/\s+$/, "") + " " + note;
      out = lines.join("\n");
    }
  });
  const isHead = (l) => /^\s{0,3}#{1,6}\s/.test(l);
  let rest = src.split("\n").filter((l) => !anyLine.test(l));
  // 只剩标题和空行（没动过的模板）就不搬
  if (!rest.some((l) => l.trim() && !isHead(l))) return out;
  // 下面直到下一个标题都是空的标题（比如交易搬走以后的「涉及的交易」）也不搬
  rest = rest.filter((l, i) => {
    if (!isHead(l)) return true;
    for (let j = i + 1; j < rest.length; j++) { if (isHead(rest[j])) return false; if (rest[j].trim()) return true; }
    return false;
  });
  const demoted = rest.map((l) => l.replace(/^(\s{0,3})(#{1,5})(\s)/, "$1#$2$3")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return out.replace(/\s+$/, "") + "\n\n## " + T("pb.merge.fromHead", { title: srcTitle }) + "\n\n" + demoted;
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

/* 错题 ⇄ 待验证互转时，正文里**还是模板原样**的标题跟着对调（「错误现象」↔「想验证什么」、「如何规避」↔「结论」），
   不然便利贴上那句要点（按标题找段落）转完就取不到了。用户自己改过、加的标题一律不动；
   「涉及的交易」两边都有，不用换。认标题时中英文模板都认，换成当前界面语言的写法，级别（## / ###）保持原样 */
const PB_NOTE_HEADING_SWAP = [["pb.tpl.symptom", "pb.tpl.hypothesis"], ["pb.tpl.avoid", "pb.tpl.verdict"]];
function pbSwapNoteHeadings(body, toKind) {
  const pairs = PB_NOTE_HEADING_SWAP.map(([m, v]) => (toKind === "verify" ? [m, v] : [v, m]));
  return String(body || "").split("\n").map((line) => {
    const h = /^(\s{0,3}#{1,6}\s+)(.*?)\s*#*\s*$/.exec(line);
    if (!h) return line;
    const text = h[2].trim().toLowerCase();
    const hit = pairs.find(([from]) => pbHeadingNames(from).some((n) => n.toLowerCase() === text));
    return hit ? h[1] + T(hit[1]) : line;
  }).join("\n");
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

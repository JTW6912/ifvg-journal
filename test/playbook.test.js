const test = require("node:test");
const assert = require("node:assert");
const { makeContext, ENGINE_FILES } = require("./load");

// 每个测试一份干净的上下文：模型库的状态全在顶层变量上
function setup(pages, trades) {
  const ctx = makeContext(ENGINE_FILES);
  ctx.run('lang = "zh"; recordMode = "live";');
  ctx.set("pbPages", pages || []);
  ctx.set("trades", trades || []);
  // 结果过一遍 JSON：vm 里造的数组/对象原型跟这边不是同一个，deepStrictEqual 会因此判不等
  const call = (expr, ...args) => {
    ctx.sandbox.__a = JSON.parse(JSON.stringify(args));
    const r = ctx.run(`(${expr})(...__a)`);
    return r === undefined ? r : JSON.parse(JSON.stringify(r));
  };
  return { ctx, call };
}
const PAGES = [
  { id: "sys", kind: "system", title: "RIFVG", created_at: "2026-10-01T00:00:00Z" },
  { id: "st1", kind: "strategy", parent_id: "sys", title: "趋势延续", created_at: "2026-10-01T00:01:00Z" },
  { id: "st2", kind: "strategy", parent_id: "sys", title: "猎杀反转", created_at: "2026-10-01T00:02:00Z" },
  { id: "tld", kind: "system", title: "TLD-QM", created_at: "2026-10-01T00:03:00Z" },
];

test("归属选项：系统后面紧跟它的衍生策略，标签写成「系统 › 策略」", () => {
  const { call } = setup(PAGES);
  const opts = call("() => pbAssignOptions()");
  assert.deepStrictEqual(opts.map((o) => o.id), ["sys", "st1", "st2", "tld"]);
  assert.strictEqual(opts[1].full, "RIFVG › 趋势延续");
  assert.strictEqual(opts[1].depth, 1);
});

test("指向已删除页面的 __pb 按未归类读，__none 是确认过的「不属于任何模型」", () => {
  const { call } = setup(PAGES, [
    { id: "a", __pb: "st1" }, { id: "b", __pb: "gone" }, { id: "c", __pb: "__none" }, { id: "d" },
  ]);
  assert.strictEqual(call("(id) => pbTradePageId(trades.find((t) => t.id === id))", "a"), "st1");
  assert.strictEqual(call("(id) => pbTradeIsUnsorted(trades.find((t) => t.id === id))", "b"), true);
  assert.strictEqual(call("(id) => pbTradeIsUnsorted(trades.find((t) => t.id === id))", "c"), false);
  assert.strictEqual(call("() => pbUnsortedCount()"), 2);
});

test("系统页算上衍生策略的交易，策略页只算自己", () => {
  const { call } = setup(PAGES, [
    { id: "a", __pb: "st1" }, { id: "b", __pb: "st2" }, { id: "c", __pb: "sys" }, { id: "d", __pb: "tld" },
  ]);
  assert.deepStrictEqual(call("(id) => pbTradesOf(id).map((t) => t.id).sort()", "sys"), ["a", "b", "c"]);
  assert.deepStrictEqual(call("(id) => pbTradesOf(id).map((t) => t.id)", "st1"), ["a"]);
});

test("成绩不算 Faded 的单，taken 留空的照算", () => {
  const { call } = setup(PAGES, [
    { id: "a", __pb: "st1", taken: "Taken", result: "W", r_multiple: "2" },
    { id: "b", __pb: "st1", taken: "", result: "L", r_multiple: "-1" },
    { id: "c", __pb: "st1", taken: "Faded", result: "W", r_multiple: "3" },
  ]);
  const st = call("(id) => pbStats(pbTradesOf(id))", "st1");
  assert.strictEqual(st.all, 3);
  assert.strictEqual(st.n, 2);
  assert.strictEqual(st.faded, 1);
  assert.strictEqual(st.wr, 50);
  assert.strictEqual(st.totalR, 1);
});

test("往错题里加交易：放进「涉及的交易」那一节，紧贴着上一条列表项", () => {
  const { call } = setup(PAGES);
  const body = "## 错误现象\n\n追单\n\n## 涉及的交易\n\n- [[trade:t_a]] 第一笔\n\n## 如何规避\n\n等回踩";
  const out = call("(b) => pbAppendTradeToBody(b, 't_b', '没等 *回踩*')", body);
  assert.strictEqual(out, "## 错误现象\n\n追单\n\n## 涉及的交易\n\n- [[trade:t_a]] 第一笔\n- [[trade:t_b]] 没等 \\*回踩\\*\n\n## 如何规避\n\n等回踩");
  // 已经在里面就不重复加
  assert.strictEqual(call("(b) => pbAppendTradeToBody(b, 't_a', 'x')", body), body);
});

test("往错题里加交易：那一节还空着 / 根本没有那一节", () => {
  const { call } = setup(PAGES);
  const tpl = call("() => pbTemplateBody('mistake')");
  const out = call("(b) => pbAppendTradeToBody(b, 't_x', '')", tpl);
  assert.strictEqual(out, "## 错误现象\n\n## 涉及的交易\n\n- [[trade:t_x]]\n\n## 如何规避");
  assert.strictEqual(call("(b) => pbAppendTradeToBody(b, 't_x', 'a')", "随手写的一段"), "随手写的一段\n\n## 涉及的交易\n\n- [[trade:t_x]] a");
  // 加完再交给渲染器，交易胶囊还是交易胶囊（不是被转义掉的文字）
  const { ctx } = setup(PAGES, [{ id: "t_x", date: "2026-09-01" }]);
  ctx.sandbox.__s = out;
  assert.match(ctx.run("renderMarkdown(__s)"), /data-action="open-trade-ref" data-id="t_x"/);
});

test("从错题里拿掉交易：只删它那一行列表项；正文别处还提到时如实报告", () => {
  const { call } = setup(PAGES);
  const body = "## 涉及的交易\n\n- [[trade:t_a]] 第一笔\n- [[trade:t_b]] 第二笔";
  const r = call("(b) => pbRemoveTradeFromBody(b, 't_a')", body);
  assert.deepStrictEqual(r, { body: "## 涉及的交易\n\n- [[trade:t_b]] 第二笔", removed: true, stillLinked: false });
  const r2 = call("(b) => pbRemoveTradeFromBody(b, 't_a')", "那天 [[trade:t_a]] 也是这样\n\n- [[trade:t_a]] x");
  assert.strictEqual(r2.removed, true);
  assert.strictEqual(r2.stillLinked, true);
});

test("便利贴上那句话：优先「如何规避」，两种语言的标题都认", () => {
  const { call } = setup(PAGES);
  assert.strictEqual(call("(b) => pbMistakeGist({ body: b })", "## 错误现象\n\n追高\n\n## 如何规避\n\n**等** 回踩再进"), "等 回踩再进");
  assert.strictEqual(call("(b) => pbMistakeGist({ body: b })", "## How to avoid it\n\nwait for the retest"), "wait for the retest");
  assert.strictEqual(call("(b) => pbMistakeGist({ body: b })", "## 错误现象\n\n追高"), "追高");
  assert.strictEqual(call("(b) => pbMistakeLineNote(b, 't_a')", "- [[trade:t_a]] 没等确认"), "没等确认");
});

test("错题候选：策略自己的、它所属系统的、通用的，各归各的", () => {
  const { call } = setup(PAGES.concat([
    { id: "m1", kind: "mistake", parent_id: "st1", title: "追单" },
    { id: "m2", kind: "mistake", parent_id: "sys", title: "连损" },
    { id: "m3", kind: "mistake", parent_id: null, title: "情绪" },
    { id: "m4", kind: "mistake", parent_id: "st2", title: "别的策略的" },
  ]));
  const c = call("(id) => { const c = pbMistakeCandidates(id); return [c.own, c.fromSystem, c.global].map((l) => l.map((m) => m.id)); }", "st1");
  assert.deepStrictEqual(c, [["m1"], ["m2"], ["m3"]]);
  // 系统页的错题集带上它所有衍生策略的
  assert.deepStrictEqual(call("(id) => pbMistakesOf(id).map((m) => m.id).sort()", "sys"), ["m1", "m2", "m4"]);
});

test("归类建议：先看同一个模型标签以前归到哪，没有就按名字匹配", () => {
  const { call } = setup(PAGES, [
    { id: "a", model: "ifvg", __pb: "st1" },
    { id: "b", model: "ifvg", __pb: "st1" },
    { id: "c", model: "ifvg", __pb: "st2" },
    { id: "x", model: "ifvg" },
    { id: "y", model: "tld-qm" },
    { id: "z", model: "" },
  ]);
  assert.strictEqual(call("(id) => pbSuggestFor(trades.find((t) => t.id === id))", "x"), "st1");
  assert.strictEqual(call("(id) => pbSuggestFor(trades.find((t) => t.id === id))", "y"), "tld");
  assert.strictEqual(call("(id) => pbSuggestFor(trades.find((t) => t.id === id))", "z"), "");
});

test("模型库归属是一个虚拟 select 字段：筛选能按策略筛，没建页面时不出现", () => {
  const { call } = setup(PAGES, [{ id: "a", __pb: "st1" }, { id: "b", __pb: "tld" }]);
  const f = call("() => resolveField(VF_PLAYBOOK)");
  assert.strictEqual(f.type, "select");
  assert.ok(f.options.includes("RIFVG › 趋势延续"));
  const hits = call("() => trades.filter((t) => tradeMatchesFilters(t, [{ ...newFilterRow(VF_PLAYBOOK), values: ['RIFVG › 趋势延续'] }])).map((t) => t.id)");
  assert.deepStrictEqual(hits, ["a"]);
  const { call: call2 } = setup([], []);
  assert.ok(!call2("() => virtualFields().some((f) => f.id === VF_PLAYBOOK)"));
});

test("[[page:id]] 渲染成页面胶囊；找不到的标红，不静默消失；摘要里换成标题", () => {
  const { ctx, call } = setup(PAGES);
  ctx.sandbox.__s = "见 [[page:st1]] 和 [[page:nope]]";
  const html = ctx.run("renderMarkdown(__s)");
  assert.match(html, /class="pageRef kind-strategy" data-action="open-page-ref" data-id="st1"/);
  assert.match(html, /RIFVG › 趋势延续/);
  assert.match(html, /pageRef broken/);
  assert.strictEqual(call("(s) => mdPlainExcerpt(s)", "见 [[page:st1]]"), "见 [趋势延续]");
  assert.deepStrictEqual(call("(s) => extractPageRefs(s)", "[[page:a]] [[page:b]] [[page:a]]"), ["a", "b"]);
});

/* ---------- 待验证 ---------- */
const VPAGES = PAGES.concat([
  { id: "v1", kind: "verify", parent_id: "st1", title: "亚盘扫完反手", status: "works", body: "- [[trade:a]] 好\n- [[trade:b]]", created_at: "2026-10-02T00:00:00Z" },
  { id: "v2", kind: "verify", parent_id: null, title: "通用想法", created_at: "2026-10-02T00:01:00Z" },
  { id: "m1", kind: "mistake", parent_id: "st1", title: "追单", body: "- [[trade:a]]", created_at: "2026-10-02T00:02:00Z" },
]);

test("待验证跟错题一样是笔记：交易归不进去，按归属分候选，两种笔记互不混", () => {
  const { call } = setup(VPAGES, [{ id: "a", __pb: "v1" }]);
  assert.strictEqual(call("() => pbTradePageId(trades[0])"), "");   // 指向笔记的 __pb 按未归类读
  const c = call("() => pbNoteCandidates('st1', 'verify')");
  assert.deepStrictEqual(c.own.map((m) => m.id), ["v1"]);
  assert.deepStrictEqual(c.global.map((m) => m.id), ["v2"]);
  assert.deepStrictEqual(call("() => pbMistakeCandidates('st1').own.map((m) => m.id)"), ["m1"]);
  assert.deepStrictEqual(call("() => pbNotesWithTrade('a', 'verify').map((m) => m.id)"), ["v1"]);
  assert.deepStrictEqual(call("() => pbMistakesWithTrade('a').map((m) => m.id)"), ["m1"]);
});

test("待验证的状态：认不出的一律按观察中；status 只在待验证上写", () => {
  const { call } = setup(VPAGES);
  assert.strictEqual(call("() => pbVerifyStatus(pbFind('v1'))"), "works");
  assert.strictEqual(call("() => pbVerifyStatus(pbFind('v2'))"), "watching");
  assert.strictEqual(call("() => pbVerifyStatus({ kind: 'verify', status: 'maybe' })"), "watching");
  call("() => { session = { user: { id: 'u' } }; }");
  assert.strictEqual(call("() => pbRowPayload(pbFind('v2')).status"), "watching");
  assert.strictEqual(call("() => 'status' in pbRowPayload(pbFind('m1'))"), false);
  assert.strictEqual(call("() => 'status' in pbRowPayload(pbFind('sys'))"), false);
});

test("待验证的模板和便利贴摘要：先看「结论」，没写退回「想验证什么」", () => {
  const { call } = setup(VPAGES);
  const tpl = call("() => pbTemplateBody('verify')");
  assert.match(tpl, /## 想验证什么/);
  assert.match(tpl, /## 涉及的交易/);
  assert.match(tpl, /## 结论/);
  const gist = (body) => call("(body) => pbMistakeGist({ kind: 'verify', body })", body);
  assert.strictEqual(gist("## 想验证什么\n\n扫完反手能不能做\n\n## 结论\n"), "扫完反手能不能做");
  assert.strictEqual(gist("## 想验证什么\n\nA\n\n## 结论\n\n可以做"), "可以做");
  // 往待验证里加交易，跟错题一样落在「涉及的交易」那一节
  const body = call("(b) => pbAppendTradeToBody(b, 'x1', '情况')", tpl);
  assert.match(body, /## 涉及的交易\n\n- \[\[trade:x1\]\] 情况/);
});

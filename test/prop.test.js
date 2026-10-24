const test = require("node:test");
const assert = require("node:assert");
const { makeContext, ENGINE_FILES } = require("./load");

function setup() {
  const ctx = makeContext(ENGINE_FILES);
  ctx.run('lang = "zh";');
  // 结果过一遍 JSON：vm 里造的数组/对象原型跟这边不是同一个，deepStrictEqual 会因此判不等
  const call = (expr, ...args) => {
    ctx.sandbox.__a = JSON.parse(JSON.stringify(args));
    const r = ctx.run(`(${expr})(...__a)`);
    return r === undefined ? r : JSON.parse(JSON.stringify(r));
  };
  return { ctx, call };
}
const E = (account_id, kind, amount, day, pending) => ({ account_id, kind, amount, day, pending: !!pending });

test("口径：退款冲减投入，待到账的出金不算回报", () => {
  const { call } = setup();
  const s = call("(es) => propSum(es)", [
    E("a", "purchase", 100, "2026-10-01"), E("a", "monthly", 50, "2026-10-02"), E("a", "refund", 30, "2026-10-03"),
    E("a", "payout", 500, "2026-10-04"), E("a", "payout", 200, "2026-10-05", true),
  ]);
  assert.strictEqual(s.spent, 120);
  assert.strictEqual(s.received, 500);
  assert.strictEqual(s.pending, 200);
  assert.strictEqual(s.net, 380);
  assert.ok(Math.abs(s.roi - 316.6667) < 0.001);
  assert.strictEqual(call("(es) => propSum(es).roi", []), null);
});

test("按月：按付款 / 到账那天归月，待到账的不算", () => {
  const { call } = setup();
  const m = call("(es) => propMonthly(es, 2026)", [
    E("a", "purchase", 100, "2026-09-30"), E("a", "payout", 400, "2026-10-01"), E("a", "payout", 999, "2026-10-02", true),
    E("a", "refund", 20, "2026-10-03"), E("a", "purchase", 50, "2025-10-03"),
  ]);
  assert.deepStrictEqual(m[8], { spent: 100, received: 0, net: -100, n: 1 });
  assert.deepStrictEqual(m[9], { spent: -20, received: 400, net: 420, n: 2 });
});

test("漏斗：重置前那次失败也算进通过率的分母", () => {
  const { call } = setup();
  const accounts = [
    { id: "a", status: "funded", events: [{ to: "eval" }, { to: "passed" }, { to: "funded" }] },
    { id: "b", status: "eval", events: [{ to: "eval" }, { to: "failed" }, { to: "eval" }] },
    { id: "c", status: "failed", events: [{ to: "eval" }, { to: "failed" }] },
    { id: "d", status: "eval", events: [{ to: "eval" }] },
  ];
  const entries = [E("a", "purchase", 100), E("b", "purchase", 100), E("b", "reset", 50), E("c", "purchase", 100), E("a", "payout", 1000)];
  const f = call("(a, e) => propFunnel(a, e)", accounts, entries);
  assert.strictEqual(f.total, 4);
  assert.strictEqual(f.passed, 1);
  assert.strictEqual(f.funded, 1);
  assert.strictEqual(f.paid, 1);
  assert.strictEqual(f.decided, 3);
  assert.ok(Math.abs(f.passRate - 33.333) < 0.01);
  assert.strictEqual(f.costPerFunded, 350);
});

test("月付：按购买日逐月记，31 号买的小月记在月底；水位之前的不补", () => {
  const { call } = setup();
  assert.strictEqual(call("(d, k) => propAddMonths(d, k)", "2026-01-31", 1), "2026-02-28");
  assert.strictEqual(call("(d, k) => propAddMonths(d, k)", "2026-11-15", 2), "2027-01-15");
  const acc = { billing: "monthly", renewing: true, monthly_fee: 89, bought_on: "2026-07-10", renewed_through: null };
  assert.deepStrictEqual(call("(a, t) => propDueRenewals(a, t)", acc, "2026-10-09"), ["2026-08-10", "2026-09-10"]);
  assert.deepStrictEqual(call("(a, t) => propDueRenewals(a, t)", { ...acc, renewed_through: "2026-09-10" }, "2026-10-10"), ["2026-10-10"]);
  assert.deepStrictEqual(call("(a, t) => propDueRenewals(a, t)", { ...acc, renewing: false }, "2026-12-01"), []);
  assert.strictEqual(call("(a) => propNextRenewal(a)", { ...acc, renewed_through: "2026-09-10" }), "2026-10-10");
});

test("目录校验：规则值只能是数字 / none / null，计划要挂在已有公司下", () => {
  const { call } = setup();
  const ok = call("(r) => propValidateCatalog(r)", {
    firms: [{ id: "x", name: "X" }],
    plans: [{ id: "x-50", firm: "x", series: "S", size: 50000, price: { list: 99, billing: "one_time" }, eval: { target: 3000, dll: "none", minDays: null } }],
  });
  assert.deepStrictEqual(ok.errors, []);
  assert.strictEqual(ok.catalog.plans[0].status, "current");
  const bad = call("(r) => propValidateCatalog(r)", {
    firms: [{ id: "x", name: "X" }, { id: "x", name: "Y" }],
    plans: [{ id: "p", firm: "z", eval: { target: "3000" }, price: { billing: "weekly" } }, { id: "p", firm: "x", size: 1.5 }],
  });
  assert.strictEqual(bad.catalog, null);
  assert.strictEqual(bad.errors.length, 6);
  assert.strictEqual(call("(r) => propValidateCatalog(r).errors.length", { firms: {} }), 1);
});

test("目录对比：字段顺序不同不算改动", () => {
  const { call } = setup();
  const d = call("(a, b) => propCatalogDiff(a, b)",
    [{ id: "a", price: { list: 1, billing: "monthly" } }, { id: "b", size: 1 }, { id: "c" }],
    [{ id: "a", price: { billing: "monthly", list: 1 } }, { id: "b", size: 2 }, { id: "d" }]);
  assert.deepStrictEqual(d, { added: ["d"], changed: ["b"], removed: ["c"] });
});

test("添加账号：同系列同规模里按可选项挑计划，must 那一维必须对上", () => {
  const { call } = setup();
  const P = (id, size, c, list) => ({ id, size, choices: Object.entries(c).map(([axis, value]) => ({ axis, value })), price: { list } });
  const plans = [
    P("f40y", 50000, { 一致性: "40%", 日损: "有日损" }, 69), P("f40n", 50000, { 一致性: "40%", 日损: "无日损" }, 115),
    P("f50n", 50000, { 一致性: "50%", 日损: "无日损" }, 130), P("s40y", 25000, { 一致性: "40%", 日损: "有日损" }, 39),
  ];
  const best = (size, want, must) => call("(ps, s, w, m) => (propBestPlan(ps, s, w, m) || {}).id || null", plans, size, want, must);
  assert.strictEqual(best(50000, { 一致性: "40%", 日损: "无日损" }), "f40n");
  // 50% 只有无日损：点「50%」时日损跟着换过去，而不是找不到
  assert.strictEqual(best(50000, { 一致性: "50%", 日损: "有日损" }, "一致性"), "f50n");
  // 25K 没有 50% 的组合
  assert.strictEqual(best(25000, { 一致性: "50%", 日损: "有日损" }, "一致性"), null);
  // 换额度时组合尽量保持
  assert.strictEqual(best(25000, { 一致性: "40%", 日损: "有日损" }), "s40y");
  const axes = call("(ps) => propFamilyAxes(ps)", plans);
  assert.deepStrictEqual(axes, [{ axis: "一致性", values: ["40%", "50%"] }, { axis: "日损", values: ["有日损", "无日损"] }]);
});

test("添加账号：规则输入框三种取值，改过的规则能认出来、套进快照不动原计划", () => {
  const { call } = setup();
  assert.strictEqual(call("(t) => propParseRule(t)", "1,200"), 1200);
  assert.strictEqual(call("(t) => propParseRule(t)", "$40%"), 40);
  assert.strictEqual(call("(t) => propParseRule(t)", "无"), "none");
  assert.strictEqual(call("(t) => propParseRule(t)", "None"), "none");
  assert.strictEqual(call("(t) => propParseRule(t)", "  "), null);
  assert.strictEqual(call("(t) => propParseRule(t)", "abc"), null);
  const plan = { eval: { target: 3000, dll: "none", consistency: 40 }, funded: {}, payout: { split: 90 } };
  const texts = call("(p) => propRuleTexts(p)", plan);
  assert.strictEqual(texts.dll, "无");
  assert.deepStrictEqual(call("(p, t) => propEditedRules(p, t)", plan, texts), []);
  const edited = { ...texts, dll: "1200", split: "80" };
  assert.deepStrictEqual(call("(p, t) => propEditedRules(p, t)", plan, edited), ["dll", "split"]);
  const out = call("(p, t) => ({ snap: propApplyRuleEdits(p, t), orig: p })", plan, edited);
  assert.strictEqual(out.snap.eval.dll, 1200);
  assert.strictEqual(out.snap.payout.split, 80);
  assert.strictEqual(out.snap.eval.target, 3000);
});

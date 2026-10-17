const test = require("node:test");
const assert = require("node:assert");
const { makeContext, ENGINE_FILES } = require("./load");

// 2026-10-05 是周一。所有测试都用过去的日期，积分从 start 一直算到真实的今天也没关系
const MON = "2026-10-05", TUE = "2026-10-06", WED = "2026-10-07", SAT = "2026-10-10";
function setup(opts) {
  const o = opts || {};
  const ctx = makeContext(ENGINE_FILES);
  ctx.run('lang = "zh"; recordMode = "live"; tradesMode = "live"; goalLoaded = true;');
  ctx.set("trades", o.trades || []);
  ctx.set("reviews", o.reviews || []);
  ctx.set("pbPages", o.pages || []);
  ctx.set("goalActivity", o.activity || []);
  ctx.set("goalDays", o.days || {});
  ctx.sandbox.__p = JSON.parse(JSON.stringify(o.prefs || { rhythm: "daily", start: MON, goals: [] }));
  ctx.run("goalPrefs = normalizeGoalPrefs(__p); goalTouch();");
  const call = (expr, ...args) => {
    ctx.sandbox.__a = JSON.parse(JSON.stringify(args));
    const r = ctx.run(`(${expr})(...__a)`);
    return r === undefined ? r : JSON.parse(JSON.stringify(r));
  };
  return { ctx, call };
}
let n = 0;
function tr(date, extra) {
  n++;
  return { id: "t" + n, _created_at: date + "T15:00:00Z", date, entry_time: "09:" + String(30 + n % 20).padStart(2, "0"),
    taken: "Taken", result: "W", r_multiple: 1, human_error: "no", model: "ifvg", screenshot: "https://x.test/" + n + ".png", ...extra };
}
const points = (call) => call("() => { const m = computeGoalPoints(); const o = {}; Object.values(m).forEach((x) => { o[x.source + '|' + x.period] = x.points; }); return o; }");

test("纪律：只看 Taken 的单；超过日内亏损、超过笔数、人为错误、没模型各算一条", () => {
  const { call } = setup({ trades: [
    tr(MON, { result: "L", r_multiple: -1, entry_time: "09:31" }),
    tr(MON, { result: "L", r_multiple: -1.5, entry_time: "09:40", human_error: "yes" }),
    tr(MON, { result: "W", r_multiple: 0.2, entry_time: "10:30", model: "" }),
    tr(MON, { result: "W", r_multiple: 1, entry_time: "11:00" }),
    tr(MON, { taken: "Faded", result: "L", r_multiple: -1 }),   // 没做的单不算
  ] });
  const ev = call("(d) => goalEvalDay(d)", MON);
  assert.strictEqual(ev.n, 4);
  assert.ok(Math.abs(ev.r - -1.3) < 1e-9);
  // 默认规则：亏损 2R（-1.3 没超）、最多 3 笔（超了）、人为错误（1 笔）、模型（1 笔没有）
  assert.deepStrictEqual(ev.violated.map((x) => x.key).sort(), ["humanError", "maxTrades", "model"]);
});

test("纪律：连亏停手和亏损后冷静期按入场时间排", () => {
  const prefs = { rhythm: "daily", start: MON, goals: [], rules: { stopAfterLosses: { on: true, value: 2 }, revengeMin: { on: true, value: 15 }, maxTrades: { on: false, value: 3 } } };
  const { call } = setup({ prefs, trades: [
    tr(TUE, { result: "L", r_multiple: -0.5, entry_time: "10:00" }),
    tr(TUE, { result: "L", r_multiple: -0.5, entry_time: "09:30" }),
    tr(TUE, { result: "W", r_multiple: 1, entry_time: "10:05" }),
  ] });
  const ev = call("(d) => goalEvalDay(d)", TUE);
  const keys = ev.violated.map((x) => x.key).sort();
  assert.deepStrictEqual(keys, ["revengeMin", "stopAfterLosses"]);
});

test("人为错误的值：no / 否 / 无 / 空 不算，yes / 写了字 / 多选里选了 算", () => {
  const { call } = setup();
  const f = (v) => call("(v) => goalIsErrorValue(v)", v);
  assert.strictEqual(f("no"), false);
  assert.strictEqual(f("否"), false);
  assert.strictEqual(f(""), false);
  assert.strictEqual(f([]), false);
  assert.strictEqual(f("yes"), true);
  assert.strictEqual(f("追单"), true);
  assert.strictEqual(f(["FOMO"]), true);
});

test("积分：守纪律 +20、没交易 +10、违规每条 -5 最多 -15、写了反省免扣并 +5", () => {
  const snap = (v) => ({ n: 1, violations: Array.from({ length: v }, (_, i) => ({ key: "k" + i })), selfFails: [], score: 100 - 20 * v, tradeIds: [] });
  const days = {
    [MON]: { day: MON, settled_at: "x", snapshot: snap(0) },
    [TUE]: { day: TUE, settled_at: "x", snapshot: { ...snap(0), n: 0 } },
    [WED]: { day: WED, settled_at: "x", snapshot: snap(4) },
    "2026-10-08": { day: "2026-10-08", settled_at: "x", snapshot: snap(2) },
  };
  const { call } = setup({ days, reviews: [{ id: "r", mode: "live", day_date: "2026-10-08", body: "这天追单了，下次连亏两笔就停手，等第二天再说。".repeat(3) }] });
  const p = points(call);
  assert.strictEqual(p["discipline|" + MON], 20);
  assert.strictEqual(p["discipline|" + TUE], 10);
  assert.strictEqual(p["discipline|" + WED], -15);
  assert.strictEqual(p["discipline|2026-10-08"], 5);
});

test("积分：复盘时长每 15 分钟 +5、补全的交易每笔 +2，按交易日期", () => {
  const { call } = setup({
    activity: [{ day: MON, area: "review", seconds: 1800 }, { day: MON, area: "playbook", seconds: 900 }, { day: MON, area: "focus", seconds: 600 }],
    trades: [tr(MON), tr(MON), tr(MON, { screenshot: "" })],
  });
  const p = points(call);
  assert.strictEqual(p["time_review|" + MON], 15);
  assert.strictEqual(p["time_focus|" + MON], undefined);   // 不满 15 分钟
  assert.strictEqual(p["trades_complete|" + MON], 4);      // 第三笔没截图
});

test("开始日期之前的不算分；周末不是交易日、不进待结算", () => {
  const { call } = setup({ trades: [tr("2026-10-02"), tr(SAT), tr(MON)], days: { [TUE]: { day: TUE, off: true } } });
  const p = points(call);
  assert.strictEqual(p["trades_complete|2026-10-02"], undefined);
  assert.strictEqual(call("(d) => goalIsTradingDay(d)", SAT), false);
  const pending = call("() => goalPendingDays()");
  assert.ok(pending.includes(MON));
  assert.ok(!pending.includes(SAT));
  assert.ok(!pending.includes(TUE));   // 休息日
});

test("连续达成：结算了且当天目标全做完才算，周末跳过，中间漏一天就断", () => {
  const goals = [{ id: "g1", kind: "manual", freq: "trading", title: "看回放" }];
  const ok = (d) => ({ day: d, settled_at: "x", snapshot: { n: 0, violations: [], selfFails: [], score: 100 }, checks: { g1: true } });
  const days = { "2026-10-08": ok("2026-10-08"), "2026-10-09": ok("2026-10-09"), "2026-10-12": ok("2026-10-12") };
  const { call } = setup({ prefs: { rhythm: "daily", start: MON, goals }, days });
  const st = call("() => goalStreakInfo()");
  assert.strictEqual(st.best, 3);   // 周四、周五、（跳过周末）下周一
});

test("分析页的「纪律」虚拟字段：按交易日期那天的结算结果", () => {
  const days = {
    [MON]: { day: MON, settled_at: "x", snapshot: { n: 1, violations: [], selfFails: [], score: 100 } },
    [TUE]: { day: TUE, settled_at: "x", snapshot: { n: 1, violations: [{ key: "maxTrades" }], selfFails: [], score: 80 } },
  };
  const { call } = setup({ days, trades: [tr(MON), tr(TUE), tr(WED)] });
  const vals = call("() => trades.map((t) => tradeFieldValue(t, disciplineVirtualField()))");
  assert.deepStrictEqual(vals, ["守纪律的日子", "违规的日子", "没结算"]);
  assert.ok(call("() => breakdownCandidateFields().some((f) => f.id === VF_DISCIPLINE)"));
});

test("配置：坏数据回落到默认，目标类型和指标不合法时纠正", () => {
  const { call } = setup();
  const p = call("(r) => normalizeGoalPrefs(r)", { rhythm: "hourly", goals: [{ id: "a", kind: "auto", freq: "weekly", metric: "day_review" }, { id: "b", kind: "timer", target: -5 }, null], rules: { maxLossR: { on: false, value: "abc" } } });
  assert.strictEqual(p.rhythm, null);
  assert.strictEqual(p.goals.length, 2);
  assert.strictEqual(p.goals[0].metric, "settled");   // 日复盘不能当每周目标
  assert.strictEqual(p.goals[1].target, 30);
  assert.strictEqual(p.rules.maxLossR.on, false);
  assert.strictEqual(p.rules.maxLossR.value, 2);
});

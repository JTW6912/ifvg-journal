const test = require("node:test");
const assert = require("node:assert");
const { makeContext, ENGINE_FILES } = require("./load");

const ctx = makeContext(ENGINE_FILES);
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
// 默认 schema 里字段 id 就是 result / r_multiple / date / taken / model 这些
const trade = (id, date, result, r, extra) => ({ id, date, result, r_multiple: r, taken: "Taken", model: "ifvg", _created_at: date + "T00:00:00Z", ...extra });

test("resultBucket：partial 算赢，三种 BE 各占一桶，大小写和空白不敏感", () => {
  const b = (v) => ctx.run(`resultBucket(${JSON.stringify(v)})`);
  assert.strictEqual(b("W"), "win");
  assert.strictEqual(b(" partial "), "win");
  assert.strictEqual(b("PARTIAL"), "win");
  assert.strictEqual(b("L"), "loss");
  assert.strictEqual(b("BE"), "be");
  assert.strictEqual(b("BE -> W"), "bewin");
  assert.strictEqual(b("be -> l"), "beloss");
  assert.strictEqual(b(""), "other");
  assert.strictEqual(b(null), "other");
  assert.strictEqual(b("乱写的"), "other");
});

test("computeStats：胜率分母只算 W/L，SQ 把 BE 转赢转输算进去", () => {
  ctx.set("trades", [
    trade("a", "2026-01-01", "W", "2"),
    trade("b", "2026-01-02", "Partial", "1"),
    trade("c", "2026-01-03", "L", "-1"),
    trade("d", "2026-01-04", "BE -> W", "0.5"),
    trade("e", "2026-01-05", "BE -> L", "-0.5"),
    trade("f", "2026-01-06", "BE", "0"),
  ]);
  ctx.set("analysisFilters", []);
  const s = ctx.run("computeStats()");
  assert.strictEqual(s.total, 6);
  assert.strictEqual(s.w, 2); // W + Partial
  assert.strictEqual(s.l, 1);
  assert.strictEqual(s.bew, 1);
  assert.strictEqual(s.bel, 1);
  assert.strictEqual(s.be, 1);
  near(s.wr, (2 / 3) * 100);
  near(s.sq, (3 / 5) * 100); // (w+bew) / (w+l+bew+bel)
  near(s.totalR, 2);
  near(s.ev, 2 / 6);
});

test("profitFactorOf：正 R 之和 ÷ |负 R 之和|，没有亏损时是 ∞，没填 R 的不计入样本", () => {
  const pf = (list) => ctx.run(`profitFactorOf(${JSON.stringify(list)}, { id: "r_multiple" })`);
  const r = pf([{ r_multiple: "3" }, { r_multiple: "-1" }, { r_multiple: "-2" }, { r_multiple: "" }, {}]);
  assert.strictEqual(r.n, 3);
  near(r.pf, 1);
  assert.strictEqual(pf([{ r_multiple: "2" }]).pf, Infinity);
  assert.strictEqual(pf([{ r_multiple: "0" }]).pf, null);
  assert.strictEqual(pf([]).pf, null);
});

test("maxDrawdownR：按日期累加成资金曲线，取峰到谷的最大跌幅；没填日期的排最后", () => {
  const dd = (list) => ctx.run(`maxDrawdownR(${JSON.stringify(list)}, { id: "r_multiple" })`);
  // 顺序故意打乱：+2, -3, +1, -1, +4 → 曲线 2,-1,0,-1,3 → 峰 2 谷 -1 → 3R
  const shuffled = [
    trade("3", "2026-01-03", "W", "1"), trade("1", "2026-01-01", "W", "2"),
    trade("5", "2026-01-05", "W", "4"), trade("2", "2026-01-02", "L", "-3"),
    trade("4", "2026-01-04", "L", "-1"),
  ];
  const r = dd(shuffled);
  near(r.dd, 3);
  assert.strictEqual(r.n, 5);
  // 没日期的那笔大亏不能插进曲线中间：排到最后，回撤就是它自己造成的那 5
  const r2 = dd([trade("1", "2026-01-01", "W", "2"), { id: "x", result: "L", r_multiple: "-5" }]);
  near(r2.dd, 5);
  assert.strictEqual(dd([]), null);
});

test("twoSidedP：几个已知分位点", () => {
  const p = (z) => ctx.run(`twoSidedP(${z})`);
  near(p(0), 1, 1e-6);
  near(p(1.959964), 0.05, 1e-4);
  near(p(2.575829), 0.01, 1e-4);
  near(p(-1.959964), 0.05, 1e-4);
  assert.strictEqual(ctx.run("twoSidedP(null)"), 1);
  assert.strictEqual(ctx.run("twoSidedP(NaN)"), 1);
});

test("twoProportionZ / welchT：方向正确，退化输入返回 null", () => {
  assert.ok(ctx.run("twoProportionZ(18, 2, 5, 15)") > 3);
  assert.ok(ctx.run("twoProportionZ(5, 15, 18, 2)") < -3);
  assert.strictEqual(ctx.run("twoProportionZ(0, 0, 5, 5)"), null); // 一边没有样本
  assert.strictEqual(ctx.run("twoProportionZ(5, 0, 5, 0)"), null); // 两边都 100%：没有可比的波动
  assert.ok(ctx.run("welchT([3,2,4,3,2.5],[0,-1,0.5,-0.5,0])") > 3);
  assert.strictEqual(ctx.run("welchT([1],[1,2,3])"), null); // 样本不足
  assert.strictEqual(ctx.run("welchT([1,1,1],[2,2,2])"), null); // 方差为 0
});

test("markFdrSignificant：Benjamini–Hochberg，只给过线的行打 strong", () => {
  // m=4, q=0.10 → 阈值 0.025 / 0.05 / 0.075 / 0.10；p 排序 0.001 0.04 0.06 0.5
  // 前三名都在各自的线以内，第 4 名 0.5 > 0.10 → 前三个算强信号
  const rows = [0.5, 0.001, 0.06, 0.04].map((p) => ({ sig: { p } }));
  ctx.sandbox.__rows = rows;
  ctx.run("markFdrSignificant(__rows)");
  assert.deepStrictEqual(rows.map((r) => r.sig.strong), [false, true, true, true]);

  // 纯噪音：最小的 p 都过不了 0.10/m 的线 → 一个都不能标
  const noise = [0.2, 0.3, 0.5, 0.9].map((p) => ({ sig: { p } }));
  ctx.sandbox.__rows = noise;
  ctx.run("markFdrSignificant(__rows)");
  assert.ok(noise.every((r) => r.sig.strong === false));

  // 没有 sig 的行（样本不够）不参与，也不该炸
  ctx.sandbox.__rows = [{ sig: null }, { sig: { p: 0.001 } }];
  ctx.run("markFdrSignificant(__rows)");
});

test("breakdownRowStats：n 含 BE，胜率分母只算 W/L", () => {
  const list = [
    { result: "W", r_multiple: "2" }, { result: "L", r_multiple: "-1" },
    { result: "BE", r_multiple: "0" }, { result: "Partial", r_multiple: "1" },
  ];
  const r = ctx.run(`breakdownRowStats("x", ${JSON.stringify(list)}, { id: "result" }, { id: "r_multiple" })`);
  assert.strictEqual(r.n, 4);
  assert.strictEqual(r.w, 2);
  assert.strictEqual(r.l, 1);
  assert.strictEqual(r.be, 1);
  near(r.wr, (2 / 3) * 100);
  near(r.totalR, 2);
});

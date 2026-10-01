const test = require("node:test");
const assert = require("node:assert");
const { makeContext, ENGINE_FILES } = require("./load");

const ctx = makeContext(ENGINE_FILES);
const call = (fn, ...args) => { ctx.sandbox.__a = args; return JSON.parse(ctx.run(`JSON.stringify(${fn}(...__a))`)); };

const heads = [
  { pos: 0, level: 1, text: "盘前计划", folded: false },
  { pos: 10, level: 2, text: "关键位", folded: true },
  { pos: 20, level: 1, text: "执行", folded: false },
  { pos: 30, level: 2, text: "关键位", folded: true },   // 跟上面同级同名
];

test("折叠状态按「级别 + 文字 + 第几个」存，重名标题能区分", () => {
  assert.deepStrictEqual(call("foldKeysOf", heads), [
    { l: 2, t: "关键位", n: 0 },
    { l: 2, t: "关键位", n: 1 },
  ]);
});

test("前面插了内容、位置全变，照样认得出是哪几节", () => {
  const shifted = heads.map((h) => ({ ...h, pos: h.pos + 100, folded: false }));
  assert.deepStrictEqual(call("foldPositionsFromKeys", shifted, [{ l: 2, t: "关键位", n: 1 }]), [130]);
});

test("标题改了字、删了，或者存的东西格式不对，直接忽略", () => {
  assert.deepStrictEqual(call("foldPositionsFromKeys", heads, [{ l: 2, t: "不存在", n: 0 }]), []);
  assert.deepStrictEqual(call("foldPositionsFromKeys", heads, [{ l: "2", t: "关键位", n: 0 }, null, "x"]), []);
  assert.deepStrictEqual(call("foldPositionsFromKeys", heads, null), []);
  assert.deepStrictEqual(call("foldPositionsFromKeys", heads, [{ l: 1, t: "关键位", n: 0 }]), []);   // 级别不对
});

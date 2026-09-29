const test = require("node:test");
const assert = require("node:assert");
const { makeContext, ENGINE_FILES } = require("./load");

const ctx = makeContext(ENGINE_FILES);
const T1 = { id: "1", session: "London", direction: "Long", entry: ["IFVG", "CISD"], r_multiple: "2", date: "2026-03-10" };
const T2 = { id: "2", session: "NYAM", direction: "Short", entry: ["IFVG"], r_multiple: "-1", date: "2026-03-11" };
const T3 = { id: "3", session: "NYAM", direction: "Long", entry: [], r_multiple: "0.5", date: "2026-03-12" };
const all = [T1, T2, T3];
const leaf = (fieldId, values, extra) => ({ fieldId, values, negate: false, matchMode: "or", rangeStart: "", rangeEnd: "", textValue: "", ...extra });
const ids = (filters) => {
  ctx.sandbox.__f = filters;
  ctx.sandbox.__all = all;
  return ctx.run("__all.filter((t) => tradeMatchesFilters(t, __f))").map((t) => t.id);
};

test("空筛选、没填值的条件：匹配全部", () => {
  assert.deepStrictEqual(ids([]), ["1", "2", "3"]);
  assert.deepStrictEqual(ids([leaf("session", [])]), ["1", "2", "3"]);
  assert.deepStrictEqual(ids([leaf("nope", ["x"])]), ["1", "2", "3"]); // 字段已删除：别把交易筛光
});

test("顶层元素之间隐式 AND；单选值之间是 OR；negate 取反", () => {
  assert.deepStrictEqual(ids([leaf("session", ["NYAM"])]), ["2", "3"]);
  assert.deepStrictEqual(ids([leaf("session", ["NYAM", "London"])]), ["1", "2", "3"]);
  assert.deepStrictEqual(ids([leaf("session", ["NYAM"]), leaf("direction", ["Long"])]), ["3"]);
  assert.deepStrictEqual(ids([leaf("session", ["NYAM"], { negate: true })]), ["1"]);
});

test("multiselect：or 命中任一，and 要全含", () => {
  assert.deepStrictEqual(ids([leaf("entry", ["IFVG", "CISD"], { matchMode: "or" })]), ["1", "2"]);
  assert.deepStrictEqual(ids([leaf("entry", ["IFVG", "CISD"], { matchMode: "and" })]), ["1"]);
});

test("数字字段是数值区间，不是字符串包含；单边区间成立", () => {
  assert.deepStrictEqual(ids([leaf("r_multiple", [], { rangeStart: "0.5" })]), ["1", "3"]);
  assert.deepStrictEqual(ids([leaf("r_multiple", [], { rangeEnd: "0" })]), ["2"]);
  assert.deepStrictEqual(ids([leaf("r_multiple", [], { rangeStart: "-1", rangeEnd: "1" })]), ["2", "3"]);
});

test("日期区间是闭区间", () => {
  assert.deepStrictEqual(ids([leaf("date", [], { rangeStart: "2026-03-11", rangeEnd: "2026-03-12" })]), ["2", "3"]);
});

test("分组：or / and / 非", () => {
  const g = (op, children, negate) => ({ op, negate: !!negate, children });
  assert.deepStrictEqual(ids([g("or", [leaf("session", ["London"]), leaf("direction", ["Short"])])]), ["1", "2"]);
  assert.deepStrictEqual(ids([g("and", [leaf("session", ["NYAM"]), leaf("direction", ["Long"])], true)]), ["1", "2"]);
});

test("空分组必须中性，而且要忽略 negate（刚点出来的空分组不能把页面清空）", () => {
  const empty = { op: "and", negate: true, children: [leaf("session", [])] };
  assert.deepStrictEqual(ids([empty]), ["1", "2", "3"]);
  assert.deepStrictEqual(ids([{ op: "or", negate: true, children: [] }]), ["1", "2", "3"]);
});

test("路径寻址：能找到嵌套节点，指不到就返回 null", () => {
  const tree = [leaf("session", ["x"]), { op: "and", negate: false, children: [leaf("a", []), leaf("b", [])] }];
  ctx.sandbox.__t = tree;
  assert.strictEqual(ctx.run('filterNodeAt(__t, "1.1")').fieldId, "b");
  assert.strictEqual(ctx.run('filterNodeAt(__t, "5")'), null);
  assert.strictEqual(ctx.run('filterNodeAt(__t, "0.0")'), null); // 叶子下面没有孩子
  assert.strictEqual(ctx.run('filterParentAt(__t, "1.1")').index, 1);
});

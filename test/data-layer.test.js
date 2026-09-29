const test = require("node:test");
const assert = require("node:assert");
const { makeContext, ENGINE_FILES } = require("./load");

const ctx = makeContext(ENGINE_FILES);

// 模拟 PostgREST：range(from, to) 只回 [from, to] 这一段，并且服务端有个 Max rows 上限；
// withCount = 是否带回 count（对应 select(..., { count: "exact" })）
function fakeTable(size, { maxRows = 1000, withCount = true, failAtCall = null } = {}) {
  const all = Array.from({ length: size }, (_, i) => ({ id: i }));
  const calls = [];
  const makeQuery = () => ({
    range(from, to) {
      calls.push([from, to]);
      if (failAtCall !== null && calls.length === failAtCall) return Promise.resolve({ data: null, error: { message: "boom" } });
      const end = Math.min(to, from + maxRows - 1);
      return Promise.resolve({ data: all.slice(from, end + 1), error: null, count: withCount ? size : null });
    },
  });
  return { makeQuery, calls };
}
const fetchAll = (t) => { ctx.sandbox.__q = t.makeQuery; return ctx.run("fetchAllRows(__q)"); };

test("超过 1000 行也能拿全（这是修复前会被静默截断的场景）", async () => {
  const t = fakeTable(2500);
  const { data, error } = await fetchAll(t);
  assert.strictEqual(error, null);
  assert.strictEqual(data.length, 2500);
  assert.deepStrictEqual(Array.from(data, (r) => r.id), Array.from({ length: 2500 }, (_, i) => i)); // 不重不漏、顺序不变
  assert.strictEqual(t.calls.length, 3);
});

test("恰好 1000 行：不多发一个空请求", async () => {
  const t = fakeTable(1000);
  const { data } = await fetchAll(t);
  assert.strictEqual(data.length, 1000);
  assert.strictEqual(t.calls.length, 1);
});

test("服务端把 Max rows 调小（比页大小还小）：靠 count 继续翻，不会拿到第一页就停", async () => {
  const t = fakeTable(950, { maxRows: 300 });
  const { data } = await fetchAll(t);
  assert.strictEqual(data.length, 950);
  assert.strictEqual(t.calls.length, 4);
});

test("空表 / 小表", async () => {
  assert.strictEqual((await fetchAll(fakeTable(0))).data.length, 0);
  assert.strictEqual((await fetchAll(fakeTable(7))).data.length, 7);
});

test("没带回 count 时退回「这页不满就停」，也能拿全", async () => {
  const t = fakeTable(2100, { withCount: false });
  const { data } = await fetchAll(t);
  assert.strictEqual(data.length, 2100);
});

test("中途某一页报错：整体返回 error，不能把已经拿到的半截数据当成全部", async () => {
  const t = fakeTable(2500, { failAtCall: 2 });
  const { data, error } = await fetchAll(t);
  assert.strictEqual(data, null);
  assert.strictEqual(error.message, "boom");
});

test("每一页都用全新的 query（builder 不能复用）", async () => {
  let made = 0;
  const inner = fakeTable(2200);
  ctx.sandbox.__q = () => { made++; return inner.makeQuery(); };
  await ctx.run("fetchAllRows(__q)");
  assert.strictEqual(made, 3);
});

test("isSchemaOutdatedError：缺表 / 缺列算「库过期」，权限、网络这类错误不算", () => {
  const is = (e) => { ctx.sandbox.__e = e; return ctx.run("isSchemaOutdatedError(__e)"); };
  assert.strictEqual(is({ code: "42P01" }), true); // undefined_table
  assert.strictEqual(is({ code: "42703" }), true); // undefined_column
  assert.strictEqual(is({ code: "PGRST204" }), true); // schema cache 里没这列
  assert.strictEqual(is({ code: "PGRST205" }), true); // schema cache 里没这表
  assert.strictEqual(is({ code: "42501", message: "permission denied" }), false);
  assert.strictEqual(is({ message: "Failed to fetch" }), false);
  assert.strictEqual(is(null), false);
});

test("noteDbError：只有库过期错误才会点亮 dbOutdated", () => {
  const c = makeContext(ENGINE_FILES);
  c.sandbox.__e = { code: "42501" };
  assert.strictEqual(c.run("noteDbError(__e)"), false);
  assert.strictEqual(c.run("dbOutdated"), false);
  c.sandbox.__e = { code: "PGRST204", message: "Could not find the 'day_date' column" };
  assert.strictEqual(c.run("noteDbError(__e)"), true);
  assert.strictEqual(c.run("dbOutdated"), true);
});

test("保存复盘：缺列时不再摘列重存，直接报「库过期」，本地列表不变", async () => {
  const c = makeContext(ENGINE_FILES);
  const calls = [];
  c.sandbox.__sb = { from: () => ({ upsert: (row) => { calls.push(row); return Promise.resolve({ error: { code: "PGRST204", message: "Could not find the 'day_date' column of 'journal_reviews'" } }); } }) };
  c.sandbox.__session = { user: { id: "u1" } };
  c.run("sb = __sb; session = __session");
  c.sandbox.__r = { id: "r1", title: "x", body: "y" };
  const ok = await c.run("persistReview(__r)");
  assert.strictEqual(ok, false);
  assert.strictEqual(calls.length, 1); // 只试一次，没有「摘掉 day_date 再来」
  assert.strictEqual(c.run("dbOutdated"), true);
  assert.match(c.run("reviewSaveError"), /supabase\/migrations/);
  assert.strictEqual(c.run("reviews.length"), 0);
});

const test = require("node:test");
const assert = require("node:assert");
const { makeContext, ENGINE_FILES } = require("./load");

// 每个用例一个全新的上下文，互不污染
function setup({ upsertResult, deleteResult, reloadRows } = {}) {
  const alerts = [];
  const ctx = makeContext(ENGINE_FILES, { alert: (m) => alerts.push(m) });
  const state = { upserts: [], deletes: [], renders: 0, selects: 0 };
  const rowsAfterUpsert = (row) => ({
    id: row.id, created_at: "2026-05-01T10:00:00Z", updated_at: row.updated_at, data: row.data,
  });
  ctx.sandbox.__sb = {
    from: () => ({
      upsert(row) {
        state.upserts.push(row);
        return {
          select: () => ({
            single: () => Promise.resolve(upsertResult ? upsertResult(row) : { data: rowsAfterUpsert(row), error: null }),
          }),
        };
      },
      delete: () => ({
        eq: () => ({ eq: (_c, _v) => { state.deletes.push(true); return Promise.resolve(deleteResult || { error: null }); } }),
      }),
      // reloadModeData 走的读取
      select: () => {
        state.selects++;
        const q = { eq: () => q, order: () => q, range: () => Promise.resolve({ data: reloadRows || [], error: null, count: (reloadRows || []).length }) };
        return q;
      },
    }),
  };
  ctx.sandbox.__session = { user: { id: "u1" } };
  ctx.run("sb = __sb; session = __session; render = () => { __renders(); }");
  ctx.sandbox.__renders = () => { state.renders++; };
  return { ctx, state, alerts };
}

test("新交易：追加到末尾，_created_at 用服务端返回的值，并且只重绘、不重新拉库", async () => {
  const { ctx, state } = setup();
  ctx.set("trades", [{ id: "old", _created_at: "2026-01-01T00:00:00Z", result: "W" }]);
  ctx.sandbox.__t = { id: "new1", _isNew: true, result: "L", r_multiple: "-1" };
  await ctx.run("persistTrade(__t)");
  const trades = ctx.run("trades");
  assert.deepStrictEqual(Array.from(trades, (t) => t.id), ["old", "new1"]);
  assert.strictEqual(trades[1]._created_at, "2026-05-01T10:00:00Z");
  assert.strictEqual(trades[1].result, "L");
  assert.strictEqual(trades[1]._isNew, undefined); // 草稿标记不能进库也不能留在本地
  assert.strictEqual(state.upserts[0].data._isNew, undefined);
  assert.strictEqual(state.selects, 0); // 不再 loadAll()
  assert.strictEqual(state.renders, 1);
});

test("改老交易：原位替换，顺序不变", async () => {
  const { ctx } = setup();
  ctx.set("trades", [{ id: "a", result: "W" }, { id: "b", result: "W" }, { id: "c", result: "W" }]);
  ctx.sandbox.__t = { id: "b", result: "L" };
  await ctx.run("persistTrade(__t)");
  const trades = ctx.run("trades");
  assert.deepStrictEqual(Array.from(trades, (t) => t.id), ["a", "b", "c"]);
  assert.strictEqual(trades[1].result, "L");
});

test("保存失败：弹窗提示，本地数据原样不动，不重绘", async () => {
  const { ctx, state, alerts } = setup({ upsertResult: () => ({ data: null, error: { message: "denied" } }) });
  ctx.set("trades", [{ id: "a", result: "W" }]);
  ctx.sandbox.__t = { id: "a", result: "L" };
  await ctx.run("persistTrade(__t)");
  assert.strictEqual(ctx.run("trades")[0].result, "W");
  assert.strictEqual(alerts.length, 1);
  assert.match(alerts[0], /denied/);
  assert.strictEqual(state.renders, 0);
});

test("保存途中用户切了回测/实盘：这一笔不能混进另一批", async () => {
  const { ctx } = setup();
  ctx.set("trades", [{ id: "a" }]);
  ctx.run('recordMode = "live"');
  ctx.sandbox.__t = { id: "n" };
  const p = ctx.run("persistTrade(__t)");
  ctx.run('recordMode = "backtest"'); // 请求还在路上
  await p;
  assert.deepStrictEqual(Array.from(ctx.run("trades"), (t) => t.id), ["a"]);
});

test("只读查看别人数据时不能写", async () => {
  const { ctx, state } = setup();
  ctx.run('viewingUserId = "someone-else"');
  ctx.sandbox.__t = { id: "n" };
  await ctx.run("persistTrade(__t)");
  assert.strictEqual(state.upserts.length, 0);
});

test("删除成功：本地摘掉那一笔并重绘", async () => {
  const { ctx, state } = setup();
  ctx.set("trades", [{ id: "a" }, { id: "b" }]);
  await ctx.run('removeTrade("a")');
  assert.deepStrictEqual(Array.from(ctx.run("trades"), (t) => t.id), ["b"]);
  assert.strictEqual(state.renders, 1);
  assert.strictEqual(state.selects, 0);
});

test("删除失败：不能在界面上假装删掉了，而是从库里重新拉一次回到真实状态", async () => {
  const { ctx, state } = setup({
    deleteResult: { error: { message: "nope" } },
    reloadRows: [{ id: "a", created_at: "x", updated_at: "y", data: { result: "W" } }, { id: "b", created_at: "x", updated_at: "y", data: {} }],
  });
  ctx.set("trades", [{ id: "a" }, { id: "b" }]);
  await ctx.run('removeTrade("a")');
  assert.deepStrictEqual(Array.from(ctx.run("trades"), (t) => t.id), ["a", "b"]);
  assert.ok(state.selects >= 1);
});

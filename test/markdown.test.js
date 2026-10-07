const test = require("node:test");
const assert = require("node:assert");
const { makeContext, ENGINE_FILES } = require("./load");

const ctx = makeContext(ENGINE_FILES);
const md = (s) => { ctx.sandbox.__s = s; return ctx.run("renderMarkdown(__s)"); };

test("正文里的 HTML 一律被转义", () => {
  const out = md("<script>alert(1)</script> <img src=x onerror=alert(1)>");
  assert.ok(!out.includes("<script"));
  assert.ok(!out.includes("<img src=x"));
  assert.ok(out.includes("&lt;script&gt;"));
});

test("javascript: 链接不会变成 <a href>", () => {
  const out = md("[点我](javascript:alert(1))");
  assert.ok(!/href="javascript:/i.test(out));
});

test("http(s) 链接和图片正常渲染", () => {
  assert.match(md("[a](https://example.com)"), /<a [^>]*href="https:\/\/example\.com"/);
  assert.match(md("![x](https://example.com/a.png)"), /<img [^>]*src="https:\/\/example\.com\/a\.png"/);
});

test("TradingView 快照页链接被翻译成图片地址", () => {
  assert.strictEqual(
    ctx.run('imgSrc("https://www.tradingview.com/x/8z0cHCrw/")'),
    "https://s3.tradingview.com/snapshots/8/8z0cHCrw.png"
  );
  assert.strictEqual(ctx.run('imgSrc("https://example.com/a.png")'), "https://example.com/a.png");
});

test("标题 / 列表 / 表格 / 代码块的基本结构", () => {
  assert.match(md("# 标题"), /<h1[ >]/);
  assert.match(md("- a\n- b"), /<ul[ >][\s\S]*<li[ >]/);
  assert.match(md("1. a\n2. b"), /<ol[ >]/);
  assert.match(md("| a | b |\n| --- | --- |\n| 1 | 2 |"), /<table/);
  assert.match(md("```\ncode\n```"), /<pre/);
});

test("mdPlainExcerpt：去掉标记，超长截断加省略号，转义的星号保留", () => {
  const ex = (s, n) => { ctx.sandbox.__s = s; return ctx.run(`mdPlainExcerpt(__s, ${n || 150})`); };
  assert.strictEqual(ex("# 标题\n**加粗** 和 [链接](https://a.com)"), "标题 加粗 和 链接");
  assert.strictEqual(ex("a".repeat(200), 10), "a".repeat(10) + "…");
  assert.strictEqual(ex("价格 \\*5"), "价格 *5");
  assert.strictEqual(ex("[[trade:t_abc123]]"), "[trade]");
});

test("extractTradeRefs：抽出 [[trade:id]]，去重，保持出现顺序", () => {
  ctx.sandbox.__s = "见 [[trade:t_a1]] 和 [[trade:t_b2]]，再看 [[trade:t_a1]]";
  assert.deepStrictEqual(Array.from(ctx.run("extractTradeRefs(__s)")), ["t_a1", "t_b2"]);
  assert.deepStrictEqual(Array.from(ctx.run("extractTradeRefs('')")), []);
});

test("截图字段：一行一个链接，老的单链接照旧", () => {
  const urls = (s) => { ctx.sandbox.__s = s; return JSON.parse(ctx.run("JSON.stringify(shotUrls(__s))")); };
  assert.deepStrictEqual(urls("https://a.com/1.png"), ["https://a.com/1.png"]);
  assert.deepStrictEqual(urls(" https://a.com/1.png\n\n  https://b.com/2.png \r\nhttps://c.com/3.png "), ["https://a.com/1.png", "https://b.com/2.png", "https://c.com/3.png"]);
  assert.deepStrictEqual(urls("https://a.com/1.png https://b.com/2.png"), ["https://a.com/1.png", "https://b.com/2.png"]);
  assert.deepStrictEqual(urls(""), []);
  assert.deepStrictEqual(urls(undefined), []);
});

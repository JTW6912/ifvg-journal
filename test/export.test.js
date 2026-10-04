const test = require("node:test");
const assert = require("node:assert");
const { makeContext, ENGINE_FILES } = require("./load");

function setup(pages, trades) {
  const ctx = makeContext(ENGINE_FILES, { TextEncoder, Blob });
  ctx.run('lang = "zh"; recordMode = "live";');
  ctx.set("pbPages", pages || []);
  ctx.set("trades", trades || []);
  const call = (expr, ...args) => {
    ctx.sandbox.__a = JSON.parse(JSON.stringify(args));
    const r = ctx.run(`(${expr})(...__a)`);
    return r === undefined ? r : JSON.parse(JSON.stringify(r));
  };
  return { ctx, call };
}

test("CRC32 跟标准值一致（zip 校验靠它）", () => {
  const { call } = setup();
  assert.strictEqual(call("() => exCrc32(new TextEncoder().encode('hello'))"), 0x3610a686);
  assert.strictEqual(call("() => exCrc32(new Uint8Array(0))"), 0);
});

test("Excel 日期 / 时间换算：1900 日期系统，时间是一天里的小数", () => {
  const { call } = setup();
  assert.strictEqual(call("() => exExcelDate('2026-10-05')"), 46300);
  assert.strictEqual(call("() => exExcelDate('1900-01-01')"), 2);
  assert.strictEqual(call("() => exExcelDate('昨天')"), null);
  assert.strictEqual(call("() => exExcelTime('09:30')"), 9.5 / 24);
  assert.strictEqual(call("() => exColName(0) + exColName(25) + exColName(26) + exColName(701)"), "AZAAZZ");
});

test("单元格 XML：文本转义、剥掉 Excel 不认的控制字符、数字不加引号", () => {
  const { call } = setup();
  assert.strictEqual(call("() => exCellXml('A1', 'a<b>&\"c\u0001')"), '<c r="A1" t="inlineStr"><is><t xml:space="preserve">a&lt;b&gt;&amp;&quot;c</t></is></c>');
  assert.strictEqual(call("() => exCellXml('B2', { v: 3.5, s: 7 })"), '<c r="B2" s="7"><v>3.5</v></c>');
  assert.strictEqual(call("() => exCellXml('C3', '')"), "");
});

test("工作表名：去掉非法字符、截到 31 个字、重名加序号", () => {
  const { call } = setup();
  assert.deepStrictEqual(call("() => { const u = new Set(); return [exSheetName('a/b:c', u), exSheetName('a/b:c', u), exSheetName('x'.repeat(40), u).length]; }"), ["a b c", "a b c (2)", 31]);
});

test("文件名：去掉路径里不能有的字符；重名自动加序号", () => {
  const { call } = setup();
  assert.strictEqual(call("() => exFileName('RIFVG / 趋势:延续?')"), "RIFVG _ 趋势_延续_");
  assert.deepStrictEqual(call("() => { const u = new Set(); return [exUniquePath('a/b.md', u), exUniquePath('a/b.md', u)]; }"), ["a/b.md", "a/b (2).md"]);
});

test("正文里的引用换成文字：交易带截图链接、页面写名字、上色变加粗、找不到的明说", () => {
  const pages = [{ id: "sys", kind: "system", title: "RIFVG" }, { id: "st1", kind: "strategy", parent_id: "sys", title: "趋势延续" }];
  const trades = [{ id: "t_a", date: "2026-08-04", model: "ifvg", result: "W", r_multiple: "3.5", screenshot: "https://www.tradingview.com/x/8z0cHCrw/" }];
  const { ctx } = setup(pages, trades);
  ctx.run("var __ctx = { tradeMap: new Map(trades.map((t) => [t.id, { t, mode: 'live' }])), reviewMap: new Map() };");
  ctx.sandbox.__b = "见 [[trade:t_a]] 和 [[page:st1]]，{red|别追}，还有 [[trade:gone]] [[page:gone]]";
  assert.strictEqual(ctx.run("exResolveMd(__ctx, __b)"),
    "见 [2026-08-04 · ifvg · W · +3.5R](https://s3.tradingview.com/snapshots/8/8z0cHCrw.png) 和 「RIFVG › 趋势延续」，**别追**，还有 （已删除的交易） （已删除的页面）");
});

test("zip：文件头签名、UTF-8 文件名标记、内容原样、结尾目录记对了文件数", async () => {
  const { ctx } = setup();
  const blob = ctx.run("exZip([{ name: '说明.md', data: 'hello' }, { name: 'a/b.txt', data: new Uint8Array([1,2,3]) }])");
  const buf = Buffer.from(await blob.arrayBuffer());
  assert.strictEqual(buf.readUInt32LE(0), 0x04034b50);
  assert.strictEqual(buf.readUInt16LE(6) & 0x0800, 0x0800);
  const nameLen = buf.readUInt16LE(26);
  assert.strictEqual(buf.slice(30, 30 + nameLen).toString("utf8"), "说明.md");
  assert.strictEqual(buf.slice(30 + nameLen, 30 + nameLen + 5).toString("utf8"), "hello");
  assert.strictEqual(buf.readUInt32LE(14), 0x3610a686);
  const end = buf.length - 22;
  assert.strictEqual(buf.readUInt32LE(end), 0x06054b50);
  assert.strictEqual(buf.readUInt16LE(end + 10), 2);
});

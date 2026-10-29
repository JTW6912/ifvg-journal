const test = require("node:test");
const assert = require("node:assert/strict");
const { makeContext, ENGINE_FILES } = require("./load");

function setup(firms, modern = true) {
  const ctx = makeContext(ENGINE_FILES);
  ctx.run('lang = "zh";');
  ctx.sandbox.document.documentElement.dataset.layout = modern ? "modern" : "classic";
  ctx.set("propFirms", firms);
  ctx.set("propPlans", [{ id: "plan", firm: "a", size: 50000, status: "current", price: { list: 69, billing: "one_time" } }]);
  return ctx;
}

const firm = {
  id: "a", name: "Example Futures", rank: 1, tier: "good", logo: "/img/prop/lucid.webp",
  review: "推荐语应与优惠同时显示", promo: { discount: "40%", text: "优惠说明独立展示" },
  platforms: ["Tradovate", "Rithmic"],
};

test("modern 推荐长卡同时展示身份、评级、推荐语、优惠说明和平台", () => {
  const ctx = setup([firm]);
  const html = ctx.run("renderPropBoard()");
  for (const value of ["propBoardList", "propRecommendCard", firm.name, firm.logo, "推荐", firm.review, "40%", firm.promo.text, ...firm.platforms]) {
    assert.ok(html.includes(value), `missing ${value}`);
  }
  assert.match(html, /data-action="prop-cat-firm" data-val="a"/);
  assert.match(html, /aria-label="查看 Example Futures 的全部计划"/);
  assert.match(html, /type="button"/);
  assert.match(html, /<article class="propRecommendCard" data-prop-firm="a"/);
  const heading = html.match(/aria-labelledby="([^"]+)"/)[1];
  const body = html.match(/aria-controls="([^"]+)"/)[1];
  for (const id of [heading, body]) assert.ok(html.includes(`id="${id}"`), `missing accessible target ${id}`);
});

test("推荐列表按排名排序、过滤隐藏公司，展开全部不改变数据顺序", () => {
  const firms = Array.from({ length: 8 }, (_, i) => ({ ...firm, id: `firm-${i}`, rank: 8 - i }));
  firms.push({ ...firm, id: "hidden", rank: 0, hidden: true });
  const ctx = setup(firms);
  const before = ctx.run("JSON.stringify(propFirms)");
  const ids = (html) => [...html.matchAll(/data-prop-firm="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids(ctx.run("renderPropBoard()")), ["firm-7", "firm-6", "firm-5", "firm-4", "firm-3", "firm-2"]);
  ctx.run("propBoardAll = true;");
  assert.deepEqual(ids(ctx.run("renderPropBoard()")), ["firm-7", "firm-6", "firm-5", "firm-4", "firm-3", "firm-2", "firm-1", "firm-0"]);
  assert.equal(ctx.run("JSON.stringify(propFirms)"), before);
});

test("目录信息缺失时明确显示待补充，不把未知优惠当作已确认无优惠", () => {
  const ctx = setup([{ id: "empty", name: "No details" }]);
  const html = ctx.run("renderPropBoard()");
  for (const key of ["prop.cat.noReview", "prop.cat.noPromo", "prop.firmInfo.unknown", "prop.firmInfo.noNotes", "prop.adm.noTier"]) {
    const text = ctx.run(`T(${JSON.stringify(key)})`);
    assert.notEqual(text, key);
    assert.ok(html.includes(text));
  }
  assert.doesNotMatch(html, /undefined|null|NaN/);
});

test("推荐语、优惠、平台和公司名按纯文本转义，只有优惠说明也能显示", () => {
  const attack = '<img src=x onerror="alert(1)">';
  const ctx = setup([{ ...firm, id: 'a" onclick="bad', name: attack, review: attack, promo: { text: attack }, platforms: [attack] }]);
  const html = ctx.run("renderPropBoard()");
  assert.doesNotMatch(html, /<img src=x|data-val="a" onclick=/);
  assert.ok(html.includes("&lt;img"));
  assert.ok(html.includes("propRecommendDealText"));
  assert.doesNotMatch(html, /优惠 undefined/);
});

test("classic 保持原排行卡片和最低价格，不切入新版布局", () => {
  const ctx = setup([firm], false);
  const html = ctx.run("renderPropBoard()");
  assert.match(html, /class="propBoard"/);
  assert.match(html, /propBoardCard/);
  assert.match(html, /propBoardFoot/);
  assert.match(html, /\$69/);
  assert.doesNotMatch(html, /propRecommend|propBoardList/);
});

test("英文推荐卡片的标题、空态与可访问名称完整", () => {
  const ctx = setup([{ id: "a", name: "Example Futures" }]);
  ctx.run('lang = "en";');
  const html = ctx.run("renderPropBoard()");
  assert.match(html, /View all Example Futures plans/);
  assert.match(html, /Current deal/);
  assert.doesNotMatch(html, /prop\.(cat|adm)\.|待补充|暂无/);
});

test("modern 排行卡片分成头部、阅读内容和信息脚注，导航与正文保持分离", () => {
  const ctx = setup([firm]);
  const html = ctx.run("renderPropBoard()");
  assert.match(html, /propPanel propRecommendPanel/);
  assert.match(html, /class="propRecommendTop"/);
  const header = html.match(/<header class="propRecommendHeader">([\s\S]*?)<\/header>/)?.[1];
  const content = html.match(/<div class="propRecommendContent">([\s\S]*?)<\/aside>/)?.[1];
  const footer = html.match(/<footer class="propRecommendFooter">([\s\S]*?)<\/footer>/)?.[1];
  assert.ok(header && content && footer);
  assert.match(header, /propRecommendBrand/);
  assert.match(header, /propRecommendCta/);
  assert.match(header, /propTier-good/);
  assert.match(content, /propReviewText/);
  assert.match(content, /propRecommendDeal/);
  assert.match(content, /<aside class="propRecommendDeal\b[^"]*"[^>]*role="note"/);
  assert.doesNotMatch(content, /prop-cat-firm/);
  assert.match(footer, /Tradovate/);
  assert.match(footer, /propMagicPolicy/);
  assert.doesNotMatch(footer, /prop-cat-firm/);
});

test("前三名标识使用实际排名，隐藏或排序不把普通名次误当奖牌", () => {
  const ctx = setup([
    { ...firm, id: "fourth", rank: 4 }, { ...firm, id: "third", rank: 3 },
    { ...firm, id: "first", rank: 1, hidden: true }, { ...firm, id: "second", rank: 2 },
  ]);
  const html = ctx.run("renderPropBoard()");
  const ranks = [...html.matchAll(/class="propRecommendRank[^"]*" data-rank="(\d+)"/g)].map((m) => Number(m[1]));
  assert.deepEqual(ranks, [2, 3, 4]);
  assert.match(html, /class="propRecommendRank top" data-rank="2">02<\/span>/);
  assert.match(html, /class="propRecommendRank " data-rank="4">04<\/span>/);
  assert.equal(ctx.run("propFirms[0].rank"), 4);
});

test("玻璃卡片悬停不对内容使用缩放、旋转、位移或滤镜", () => {
  const css = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "theme-modern.css"), "utf8");
  const hoverRules = [...css.matchAll(/[^{}]*propRecommendCard[^{}]*:hover[^{}]*\{([^{}]*)\}/g)];
  assert.ok(hoverRules.length > 0);
  for (const rule of hoverRules) assert.doesNotMatch(rule[1], /(?:^|[;\s])(?:transform|translate|rotate|scale|filter|opacity)\s*:/);
  assert.match(css, /backdrop-filter:blur\(16px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

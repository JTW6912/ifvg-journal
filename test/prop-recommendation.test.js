const test = require("node:test");
const assert = require("node:assert/strict");
const { makeContext, ENGINE_FILES } = require("./load");

function setup() {
  const ctx = makeContext(ENGINE_FILES);
  ctx.run('lang = "zh";');
  ctx.sandbox.document.documentElement.dataset.layout = "modern";
  return ctx;
}
function call(ctx, fn, ...args) {
  ctx.sandbox.__args = args;
  return ctx.run(`${fn}(...__args)`);
}

test("推荐语轻量排版支持段落、换行、加粗、高亮及连续项目列表", () => {
  const ctx = setup();
  const html = call(ctx, "propReviewHtml", "**先看结论**\n补充一句\n\n- ==关键条件==\n- **第二项**\n\n结尾");
  assert.equal(html, "<p><strong>先看结论</strong><br>补充一句</p><ul><li><mark>关键条件</mark></li><li><strong>第二项</strong></li></ul><p>结尾</p>");
  assert.equal(call(ctx, "propReviewHtml", "**==重点==**"), "<p><strong><mark>重点</mark></strong></p>");
  assert.equal(call(ctx, "propReviewHtml", "普通说明\r\n下一行"), "<p>普通说明<br>下一行</p>");
  assert.equal(call(ctx, "propReviewHtml", ""), "");
});

test("推荐语先转义且仅生成固定标签，不加载链接图片或引用个人交易", () => {
  const ctx = setup();
  const text = '<script>alert(1)</script>\n**<img src=x onerror="bad">**\n==<svg onload=bad>==\n![image](https://example.invalid/a.png)\n[x](javascript:bad)\n[[trade:private]]\n\uE0000\uE001';
  const html = call(ctx, "propReviewHtml", text);
  assert.doesNotMatch(html, /<(?:script|img|svg|a)\b|data-action|href=/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<strong>&lt;img/);
  assert.match(html, /\[\[trade:private\]\]/);
  const tags = [...html.matchAll(/<\/?([a-z]+)[^>]*>/g)].map((m) => m[1]);
  assert.ok(tags.every((t) => ["p", "br", "ul", "li", "strong", "mark"].includes(t)));
});

test("未配对语法保留原文，嵌套格式始终生成闭合标签", () => {
  const ctx = setup();
  assert.equal(call(ctx, "propReviewHtml", "没有闭合 **文本"), "<p>没有闭合 **文本</p>");
  assert.equal(call(ctx, "propReviewHtml", "**甲==乙**丙=="), "<p><strong>甲==乙</strong>丙==</p>");
  assert.equal(call(ctx, "propReviewPlainText", "**结论**\n- ==条件=="), "结论\n• 条件");
});

test("格式按钮能包裹与取消选区格式，不覆盖选区之外的内容", () => {
  const ctx = setup();
  const bold = call(ctx, "propReviewFormatEdit", "前重点后", 1, 3, "bold");
  assert.equal(bold.value, "前**重点**后");
  assert.equal(bold.value.slice(bold.selectionStart, bold.selectionEnd), "重点");
  const plain = call(ctx, "propReviewFormatEdit", bold.value, bold.selectionStart, bold.selectionEnd, "bold");
  assert.equal(plain.value, "前重点后");
  const mark = call(ctx, "propReviewFormatEdit", "关键", 0, 2, "highlight");
  assert.equal(mark.value, "==关键==");
  assert.equal(call(ctx, "propReviewFormatEdit", "甲\n乙", 0, 3, "bold").value, "**甲**\n**乙**");
  assert.equal(call(ctx, "propReviewFormatEdit", "甲", 0, 1, "unsupported").value, "甲");
});

test("列表按钮覆盖所选完整行、支持取消列表，空选区插入可编辑示例", () => {
  const ctx = setup();
  const list = call(ctx, "propReviewFormatEdit", "开头\n第一条\n第二条\n末尾", 4, 11, "list");
  assert.equal(list.value, "开头\n- 第一条\n- 第二条\n末尾");
  const plain = call(ctx, "propReviewFormatEdit", list.value, list.selectionStart, list.selectionEnd, "list");
  assert.equal(plain.value, "开头\n第一条\n第二条\n末尾");
  assert.equal(call(ctx, "propReviewFormatEdit", "甲\n\n乙", 0, 4, "list").value, "- 甲\n\n- 乙");
  const empty = call(ctx, "propReviewFormatEdit", "", 0, 0, "highlight");
  assert.ok(empty.value.startsWith("==") && empty.value.endsWith("=="));
  assert.ok(empty.selectionEnd > empty.selectionStart);
});

test("排行使用非交互文章容器，推荐正文不是跳转按钮，展开有独立可访问控件", () => {
  const ctx = setup();
  const html = call(ctx, "propRecommendationCard", { id: "example", name: "Example", review: "**理由**", rank: 1 }, 2);
  assert.match(html, /<article class="propRecommendCard"[^>]*data-prop-firm="example"/);
  assert.doesNotMatch(html.match(/<article[^>]*>/)[0], /data-action|role="button"/);
  assert.match(html, /propRichText[^>]*>[\s\S]*<strong>理由<\/strong>/);
  assert.match(html, /data-action="prop-review-toggle"[^>]*aria-expanded="false"/);
  assert.match(html, /data-action="prop-cat-firm"/);
  assert.match(html, /查看计划/);
});

test("公司编辑提供多行输入、格式按钮和同一渲染器的即时预览，长内容不截断", () => {
  const ctx = setup();
  const review = "**重点**\n\n" + "说明内容".repeat(80);
  const html = call(ctx, "propReviewEditorHtml", review);
  assert.match(html, /<textarea[^>]*id="propFirmReview"[^>]*data-prop-field="review"/);
  assert.doesNotMatch(html, /maxlength="120"/);
  assert.ok(html.includes(review));
  for (const format of ["bold", "highlight", "list"]) assert.ok(html.includes(`data-format="${format}"`));
  assert.ok(html.includes(call(ctx, "propReviewHtml", review)));
});

test("保存推荐语保留格式、换行和公司其他字段", async () => {
  const ctx = setup();
  ctx.set("currentProfile", { role: "admin", active: true });
  const review = "**重点**\n\n- ==限制==\n- " + "较长说明".repeat(40);
  ctx.set("propFirms", [{ id: "example", name: "Example", magicPolicy: "fixed_region", rank: 1 }]);
  ctx.run("render = () => {}; propRenderModal = () => {};");
  let payload;
  ctx.sandbox.__client = { from: () => ({ upsert: async (rows) => { payload = rows[0]; return { error: null }; } }) };
  ctx.run("sb = __client; propModal = { type: 'admFirm', id: 'example', isNew: false, draft: propAdmFirmDraft(propFirms[0]) };");
  ctx.sandbox.__review = review;
  ctx.run("propModal.draft.review = __review;");
  await ctx.run("propAdmSaveFirm()");
  assert.equal(payload.data.review, review);
  assert.equal(payload.data.magicPolicy, "fixed_region");
});

test("推荐语工具、展开按钮和预览文案中英文齐全", () => {
  const ctx = setup();
  for (const lang of ["zh", "en"]) {
    for (const key of ["viewPlans", "expand", "collapse", "bold", "highlight", "list", "formatTools", "insertText", "characters", "preview", "editHint"]) {
      assert.equal(ctx.run(`typeof I18N.${lang}["prop.review.${key}"]`), "string");
    }
  }
});

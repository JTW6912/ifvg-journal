const test = require("node:test");
const assert = require("node:assert/strict");
const { makeContext, ENGINE_FILES } = require("./load");
const fields = ["platforms", "payoutMethods", "kycRequirements", "paymentMethods"];
const firm = { id: "sample", name: "Example Firm", platforms: ["Rithmic", "Custom, Suite"], payoutMethods: ["Rise", "Bank transfer"], kycRequirements: ["Passport", "Custom verification"], paymentMethods: ["Visa", "PayPal"], magicPolicy: "fixed_region", notes: "原有备注\n第二行", review: "**完整推荐语**", recentUpdates: [] };
function setup(admin = true) {
  const ctx = makeContext(ENGINE_FILES);
  ctx.run('lang = "zh";');
  ctx.sandbox.document.documentElement.dataset.layout = "modern";
  ctx.set("currentProfile", { role: admin ? "admin" : "user" });
  ctx.set("propFirms", [firm]);
  ctx.set("propPlans", []);
  return ctx;
}
function call(ctx, fn, ...args) { ctx.sandbox.__args = args; return ctx.run(`${fn}(...__args)`); }
const plain = (value) => JSON.parse(JSON.stringify(value));

test("多选兼容旧字符串，数组中的逗号与自定义名称不被拆坏", () => {
  const ctx = setup();
  assert.deepEqual(plain(call(ctx, "propFirmChoiceValues", "Tradovate、Rithmic, NinjaTrader\nTradingView")), ["Tradovate", "Rithmic", "NinjaTrader", "TradingView"]);
  assert.deepEqual(plain(call(ctx, "propFirmChoiceValues", [" Rithmic ", "Custom, Suite", "Rithmic", ""])), ["Rithmic", "Custom, Suite"]);
  assert.deepEqual(plain(call(ctx, "propFirmChoiceValues", undefined)), []);
  const draft = call(ctx, "propAdmFirmDraft", firm);
  for (const field of fields) assert.deepEqual(plain(draft[field]), firm[field]);
  draft.platforms.push("Draft only");
  assert.deepEqual(firm.platforms, ["Rithmic", "Custom, Suite"]);
  assert.equal(draft.notes, firm.notes);
});

test("候选包含常用项、其它公司已有的自定义项与本次编辑值", () => {
  const ctx = setup();
  ctx.set("propFirms", [firm, { id: "other", platforms: ["Shared Custom"] }]);
  const options = call(ctx, "propFirmChoiceOptions", "platforms", { platforms: ["Current Custom"] }, { platforms: ["Session Custom"] });
  for (const value of ["Tradovate", "Rithmic", "Custom, Suite", "Shared Custom", "Current Custom", "Session Custom"]) assert.ok(options.includes(value));
  assert.equal(call(ctx, "propFirmChoiceLabel", "payoutMethods", "Bank transfer"), "银行转账");
  assert.equal(call(ctx, "propFirmChoiceLabel", "platforms", "Passport"), "Passport");
  assert.equal(call(ctx, "propFirmChoiceLabel", "platforms", "__proto__"), "__proto__");
});

test("选项统一使用主题标签类，不按品牌或自定义值分配独立颜色", () => {
  const ctx = setup();
  const custom = '<img src=x onerror="bad">';
  const html = call(ctx, "propFirmInfoHtml", { ...firm, platforms: ["Tradovate", "Rithmic", custom] }, true);
  assert.match(html, /class="propRecommendTag propChoiceTag"/);
  assert.doesNotMatch(html, /propChoiceTone-|<img src=x|style="[^"]*onerror/);
  const editor = call(ctx, "propFirmChoiceFieldHtml", "platforms", { draft: { platforms: [custom] } });
  assert.match(editor, /class="propChoiceTag"/);
  assert.doesNotMatch(editor, /propChoiceTone-/);
  assert.ok(editor.includes("&lt;img"));
});

test("选择、取消与自定义添加只修改草稿，重复添加不产生重复项", () => {
  const ctx = setup();
  ctx.run("propModal = { type: 'admFirm', draft: propAdmFirmDraft(propFirms[0]) };");
  const before = ctx.run("JSON.stringify(propFirms)");
  ctx.run('propSetFirmChoice("platforms", "Tradovate", true); propSetFirmChoice("platforms", "Rithmic", false);');
  assert.deepEqual(plain(ctx.run("propModal.draft.platforms")), ["Custom, Suite", "Tradovate"]);
  ctx.run('propAddFirmChoiceValue("platforms", "My Custom Platform"); propAddFirmChoiceValue("platforms", "My Custom Platform");');
  assert.equal(ctx.run('propModal.draft.platforms.filter(x => x === "My Custom Platform").length'), 1);
  ctx.run('propAddFirmChoiceValue("payoutMethods", "银行转账");');
  assert.equal(ctx.run('propModal.draft.payoutMethods.filter(x => x === "Bank transfer").length'), 1);
  assert.equal(ctx.run("JSON.stringify(propFirms)"), before);
});

test("多选编辑有字段分组、复选框和自定义输入，未选择的字段不默认选中", () => {
  const ctx = setup();
  ctx.run("propModal = { type: 'admFirm', draft: propAdmFirmDraft(propFirms[0]) };");
  const html = ctx.run("propFirmChoicesEditorHtml(propModal)");
  for (const field of fields) {
    assert.ok(html.includes(`id="propChoice-${field}"`));
    assert.ok(html.includes(`data-prop-firm-choice="${field}"`));
    assert.ok(html.includes(`id="propChoiceCustom-${field}"`));
  }
  assert.match(html, /type="checkbox"/);
  const empty = call(ctx, "propFirmChoiceFieldHtml", "payoutMethods", { draft: { payoutMethods: [] } });
  assert.doesNotMatch(empty, / checked/);
});

test("普通用户及未知字段不能通过多选入口修改草稿", () => {
  const ctx = setup(false);
  ctx.run("propModal = { type: 'admFirm', draft: propAdmFirmDraft(propFirms[0]) };");
  const before = ctx.run("JSON.stringify(propModal.draft)");
  ctx.run('propSetFirmChoice("platforms", "Unauthorized", true); propAddFirmChoiceValue("platforms", "Unauthorized");');
  assert.equal(ctx.run("JSON.stringify(propModal.draft)"), before);
  ctx.set("currentProfile", { role: "admin" });
  ctx.run('propSetFirmChoice("__proto__", "bad", true); propSetFirmChoice("role", "admin", true); propAddFirmChoiceValue("constructor", "bad");');
  assert.equal(ctx.run("JSON.stringify(propModal.draft)"), before);
  ctx.run('propModal.busy = true; propSetFirmChoice("platforms", "During save", true); propAddFirmChoiceValue("platforms", "During save");');
  assert.equal(ctx.run("JSON.stringify(propModal.draft)"), before);
});

test("排行和详情包含全部公司信息，自定义内容转义且缺项显示待补充", () => {
  const ctx = setup();
  const source = { ...firm, payoutMethods: ["Rise", '<img src=x onerror="bad">'], notes: '**说明**\n<script>bad</script>' };
  for (const compact of [true, false]) {
    const html = call(ctx, "propFirmInfoHtml", source, compact);
    for (const label of ["交易平台", "出金方式", "购买支付方式", "KYC", "魔法使用政策", "其它说明"]) assert.ok(html.includes(label));
    for (const value of ["Rithmic", "Custom, Suite", "Rise", "Visa", "PayPal", "Custom verification"]) assert.ok(html.includes(value));
    assert.doesNotMatch(html, /<img src=x|<script>/);
    assert.match(html, /&lt;img/);
    assert.match(html, /<strong>说明<\/strong>/);
  }
  const empty = call(ctx, "propFirmInfoHtml", { id: "empty" }, true);
  assert.match(empty, /待补充/);
  assert.match(empty, /暂无其它说明/);
  assert.doesNotMatch(empty, /无需KYC|不支持出金/);
});

test("推荐语与其它说明独立展开，不覆盖彼此状态", () => {
  const ctx = setup();
  ctx.sandbox.document.querySelectorAll = () => [];
  ctx.run('propToggleReview("sample", "notes");');
  assert.equal(ctx.run('propFirmNotesExpanded.has("sample")'), true);
  assert.equal(ctx.run('propReviewExpanded.has("sample")'), false);
  ctx.run('propToggleReview("sample"); propToggleReview("sample", "notes");');
  assert.equal(ctx.run('propFirmNotesExpanded.has("sample")'), false);
  assert.equal(ctx.run('propReviewExpanded.has("sample")'), true);
});

test("折叠按实际可见高度判断，测量后保留展开状态与按钮语义", () => {
  const ctx = setup();
  const classes = new Set(["isExpanded"]), attrs = {};
  const toggle = { hidden: true, setAttribute: (k, v) => { attrs[k] = v; } };
  const body = { isConnected: true, dataset: { propReviewId: "sample" }, scrollHeight: 120,
    get clientHeight() { return classes.has("isExpanded") ? 120 : 55; },
    classList: { remove: (k) => classes.delete(k), toggle: (k, on) => on ? classes.add(k) : classes.delete(k) },
    parentElement: { querySelector: () => toggle } };
  ctx.sandbox.__body = body;
  ctx.run('propReviewExpanded.add("sample"); propMeasureReviewBody(__body);');
  assert.equal(classes.has("isExpanded"), true);
  assert.equal(toggle.hidden, false);
  assert.equal(attrs["aria-expanded"], "true");
  ctx.run('propReviewExpanded.clear(); propMeasureReviewBody(__body);');
  assert.equal(classes.has("isExpanded"), false);
  assert.equal(attrs["aria-expanded"], "false");
});

test("保存四组数组及旧备注，读回与导出不丢自定义值或拆分逗号", async () => {
  const ctx = setup();
  let saved;
  ctx.sandbox.__client = { from: () => ({ upsert: async (rows) => { saved = plain(rows[0]); return { error: null }; } }) };
  ctx.run("sb = __client; render = () => {}; propRenderModal = () => {}; propModal = { type: 'admFirm', id: 'sample', isNew: false, draft: propAdmFirmDraft(propFirms[0]) };");
  ctx.run('propModal.draft.paymentMethods.push("Custom payment");');
  await ctx.run("propAdmSaveFirm()");
  assert.deepEqual(saved.data.platforms, firm.platforms);
  assert.deepEqual(saved.data.payoutMethods, firm.payoutMethods);
  assert.deepEqual(saved.data.kycRequirements, firm.kycRequirements);
  assert.deepEqual(saved.data.paymentMethods, [...firm.paymentMethods, "Custom payment"]);
  assert.equal(saved.data.notes, firm.notes);
  ctx.sandbox.__row = saved;
  assert.equal(ctx.run('propFirmFromRow(__row).platforms.includes("Custom, Suite")'), true);
  assert.equal(ctx.run('propCatalogExport().firms[0].paymentMethods.includes("Custom payment")'), true);
});

test("异常型保存失败也恢复旧目录并保留草稿，新公司不会虚假留下", async () => {
  for (const isNew of [false, true]) {
    const ctx = setup();
    ctx.sandbox.console = { ...console, error() {} };
    ctx.sandbox.__client = { from: () => ({ upsert: async () => { throw new Error("Transport rejected"); } }) };
    ctx.run("sb = __client; render = () => {}; propRenderModal = () => {};");
    const before = ctx.run("JSON.stringify(propFirms)");
    ctx.run(`propModal = { type: "admFirm", id: "sample", isNew: ${isNew}, draft: propAdmFirmDraft(${isNew ? "null" : "propFirms[0]"}) };`);
    ctx.run('propModal.draft.name = "Edited firm"; propModal.draft.platforms.push("Unsaved platform");');
    await ctx.run("propAdmSaveFirm()");
    assert.equal(ctx.run("JSON.stringify(propFirms)"), before);
    assert.equal(ctx.run("propModal.busy"), false);
    assert.ok(ctx.run("propModal.error"));
    assert.equal(ctx.run('propModal.draft.platforms.includes("Unsaved platform")'), true);
  }
});

test("错误多选结构拒绝导入和保存，不把旧数据静默清空", async () => {
  const ctx = setup();
  const invalid = { ...firm, payoutMethods: { name: "Keep invalid source" } };
  ctx.set("propFirms", [invalid]);
  const draft = call(ctx, "propAdmFirmDraft", invalid);
  assert.deepEqual(plain(draft.payoutMethods), invalid.payoutMethods);
  assert.ok(call(ctx, "propValidateFirmChoices", draft).length);
  const result = call(ctx, "propValidateCatalog", { firms: [invalid], plans: [] });
  assert.equal(result.catalog, null);
  ctx.sandbox.__client = { from() { throw new Error("invalid data must not be saved"); } };
  ctx.run("sb = __client; propRenderModal = () => {}; propModal = { type: 'admFirm', id: 'sample', isNew: false, draft: propAdmFirmDraft(propFirms[0]) };");
  await ctx.run("propAdmSaveFirm()");
  assert.ok(ctx.run("propModal.error"));
  assert.deepEqual(plain(ctx.run("propFirms[0].payoutMethods")), invalid.payoutMethods);
});

test("公司信息字段及多选操作文案中英文齐全", () => {
  const ctx = setup();
  for (const lang of ["zh", "en"]) {
    for (const key of ["title", ...fields, "notes", "unknown", "noNotes", "choose", "selected", "custom", "add", "choiceHint", "kycHint", "invalidChoices", "notesExpand", "notesCollapse"]) {
      assert.equal(ctx.run(`typeof I18N.${lang}["prop.firmInfo.${key}"]`), "string");
    }
  }
});

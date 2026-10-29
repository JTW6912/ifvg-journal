const test = require("node:test");
const assert = require("node:assert/strict");
const { makeContext, ENGINE_FILES } = require("./load");

const policies = ["unknown", "allowed", "prohibited", "self_hosted_only", "temporary", "fixed_region"];
const firm = { id: "sample", name: "Sample Firm", rank: 1, tier: "good", review: "Keep this review", platforms: ["Rithmic"], promo: { discount: "20%", text: "Keep this offer" }, notes: "Keep these notes" };
function setup() {
  const ctx = makeContext(ENGINE_FILES);
  ctx.run('lang = "zh";');
  ctx.sandbox.document.documentElement.dataset.layout = "modern";
  ctx.set("propFirms", [firm]);
  ctx.set("propPlans", []);
  return ctx;
}

test("魔法政策仅使用固定枚举；旧目录、空值或非法值显示未确认", () => {
  const ctx = setup();
  assert.deepEqual(JSON.parse(ctx.run("JSON.stringify(PROP_MAGIC_POLICIES)")), policies);
  for (const value of policies.concat([undefined, null, "", "<img src=x>", true])) {
    ctx.sandbox.__firm = { ...firm, magicPolicy: value };
    assert.equal(ctx.run("propMagicPolicy(__firm)"), policies.includes(value) ? value : "unknown");
  }
  assert.equal(ctx.run("propMagicPolicy(null)"), "unknown");
});

test("六种魔法政策均在推荐卡片显示，未知值不能注入文本或样式", () => {
  const ctx = setup();
  for (const value of policies) {
    ctx.set("propFirms", [{ ...firm, magicPolicy: value }]);
    const html = ctx.run("renderPropBoard()");
    const label = ctx.run(`T("prop.magic.${value}")`);
    assert.notEqual(label, `prop.magic.${value}`);
    assert.ok(html.includes(label));
    assert.ok(html.includes("魔法使用政策"));
    assert.ok(html.includes(`propMagicPolicy-${value}`));
  }
  ctx.set("propFirms", [{ ...firm, magicPolicy: '\" onclick=\"bad' }]);
  const html = ctx.run("renderPropBoard()");
  assert.ok(html.includes("propMagicPolicy-unknown"));
  assert.ok(html.includes("未确认"));
  assert.ok(!html.includes('onclick="bad'));
});

test("编辑公司是有可访问标签的单选，下拉只有六个选项且恢复已有值", () => {
  const ctx = setup();
  ctx.set("propModal", { type: "admFirm", busy: false });
  for (const value of policies) {
    ctx.sandbox.__firm = { ...firm, magicPolicy: value };
    const html = ctx.run("propAdmFirmForm({ draft: propAdmFirmDraft(__firm) }).body");
    const select = html.match(/<select[^>]*data-prop-field="magicPolicy"[^>]*>[\s\S]*?<\/select>/)?.[0];
    assert.ok(select);
    assert.doesNotMatch(select, /\bmultiple\b/);
    assert.equal((select.match(/<option /g) || []).length, 6);
    assert.equal((select.match(/ selected/g) || []).length, 1);
    assert.ok(select.includes(`value="${value}" selected`));
    assert.match(html, /<label for="propMagicPolicy">魔法使用政策<\/label>/);
    assert.match(select, /id="propMagicPolicy"/);
    assert.match(select, /aria-describedby="propMagicPolicyHint"/);
  }
  assert.equal(ctx.run("propAdmFirmDraft(null).magicPolicy"), "unknown");
});

test("政策下拉仅触发 change 时也能同步草稿，无需重绘弹窗", () => {
  const ctx = setup();
  ctx.set("propModal", { type: "admFirm", draft: { magicPolicy: "allowed" } });
  ctx.run('propRenderModal = () => { throw new Error("unexpected rerender"); };');
  ctx.run('propHandleChange({ type: "select-one", dataset: { propField: "magicPolicy" }, value: "fixed_region" });');
  assert.equal(ctx.run("propModal.draft.magicPolicy"), "fixed_region");
  ctx.run('propHandleChange({ type: "select-one", dataset: { propField: "magicPolicy" }, value: "invalid" });');
  assert.equal(ctx.run("propModal.draft.magicPolicy"), "unknown");
});

test("保存政策进入 prop_firms.data，读回与导出不丢字段，不覆盖其他公司信息", async () => {
  const ctx = setup();
  ctx.set("currentProfile", { role: "admin", active: true });
  const writes = [];
  ctx.sandbox.__client = { from(table) { assert.equal(table, "prop_firms"); return { async upsert(rows) { writes.push(JSON.parse(JSON.stringify(rows))); return { error: null }; } }; } };
  ctx.run("sb = __client; render = () => {}; propRenderModal = () => {};");
  for (const value of policies) {
    ctx.run(`propModal = { type: "admFirm", id: "sample", isNew: false, draft: { ...propAdmFirmDraft(propFirms[0]), magicPolicy: ${JSON.stringify(value)} } };`);
    await ctx.run("propAdmSaveFirm()");
    const saved = writes.at(-1)[0];
    assert.equal(saved.data.magicPolicy, value);
    assert.equal(saved.data.review, firm.review);
    assert.equal(saved.data.notes, firm.notes);
    assert.deepEqual(saved.data.platforms, firm.platforms);
    assert.deepEqual(saved.data.promo, firm.promo);
    ctx.sandbox.__row = saved;
    assert.equal(ctx.run("propFirmFromRow(__row).magicPolicy"), value);
    assert.equal(ctx.run("propCatalogExport().firms[0].magicPolicy"), value);
    assert.equal(ctx.run("propAdmFirmDraft(propFirmFromRow(__row)).magicPolicy"), value);
  }
});

test("目录导入接受旧格式与合法政策，但拒绝拼错的政策值", () => {
  const ctx = setup();
  for (const value of [undefined, null, ""].concat(policies)) {
    ctx.sandbox.__catalog = { firms: [{ ...firm, magicPolicy: value }], plans: [] };
    assert.equal(ctx.run("propValidateCatalog(__catalog).errors.length"), 0);
  }
  ctx.sandbox.__catalog = { firms: [{ ...firm, magicPolicy: "allowd" }], plans: [] };
  assert.equal(ctx.run("propValidateCatalog(__catalog).catalog"), null);
  assert.match(ctx.run("propValidateCatalog(__catalog).errors[0]"), /magicPolicy/);
});

test("推荐卡片按在售计划系列去重，不按规模或规则版本计数，也不吃价格筛选", () => {
  const ctx = setup();
  const p = (id, family, size, status = "current", owner = "sample") => ({ id, firm: owner, family, series: family || "Legacy name", size, status, price: { list: 99 } });
  ctx.set("propPlans", [p("f25", "Flex", 25000), p("f50", "Flex", 50000), p("f100", "Flex", 100000), p("f50-alt", "Flex", 50000), p("p50", "Pro", 50000), p("old-format", undefined, 50000), p("retired", "Retired", 50000, "legacy"), p("other", "Other", 50000, "current", "other")]);
  ctx.run('propCatalogSize = "25000"; propCatalogPrefs = ["noDll"];');
  const html = ctx.run("renderPropBoard()");
  assert.match(html, /propRecommendCount">3 个计划系列<\/span>/);
  assert.equal(ctx.run("propPlans.length"), 8);
  ctx.set("propPlans", []);
  assert.match(ctx.run("renderPropBoard()"), /propRecommendCount">0 个计划系列<\/span>/);
});

test("魔法政策中英文齐全，系列数量支持英文单复数", () => {
  const ctx = setup();
  for (const language of ["zh", "en"]) {
    ctx.run(`lang = "${language}";`);
    for (const key of ["prop.magic.label", "prop.magic.hint", "prop.magic.invalid", ...policies.map((p) => `prop.magic.${p}`)]) {
      assert.equal(ctx.run(`typeof I18N.${language}[${JSON.stringify(key)}]`), "string");
      assert.notEqual(ctx.run(`T(${JSON.stringify(key)})`), key);
    }
  }
  assert.equal(ctx.run('T("prop.cat.familyCount", { n: 1 })'), "1 plan family");
  assert.equal(ctx.run('T("prop.cat.familyCount", { n: 2 })'), "2 plan families");
});

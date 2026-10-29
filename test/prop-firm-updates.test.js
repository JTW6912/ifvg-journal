const test = require("node:test");
const assert = require("node:assert/strict");
const { makeContext, ENGINE_FILES } = require("./load");
const update = (id, date, text, type = "notice") => ({ id, date, text, type });
const firm = { id: "firm", name: "Example Firm", review: "Keep this review", magicPolicy: "fixed_region", recentUpdates: [update("old", "2026-10-20", "Older update"), update("new", "2026-10-25", "**Newest update**", "rules"), update("middle", "2026-10-23", "Middle update", "pricing")] };
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

test("公司更新按日期倒序，同日保持原顺序，不改变原数据", () => {
  const ctx = setup();
  const input = { recentUpdates: [update("a", "2026-10-20", "A"), update("b", "2026-10-25", "B"), update("c", "2026-10-25", "C")] };
  const before = JSON.stringify(input);
  assert.deepEqual(Array.from(call(ctx, "propFirmUpdates", input), (x) => x.id), ["b", "c", "a"]);
  const draft = call(ctx, "propFirmUpdatesDraft", input);
  assert.deepEqual(Array.from(draft, (x) => x.id), ["b", "c", "a"]);
  draft[0].text = "Draft only";
  assert.equal(JSON.stringify(input), before);
  assert.equal(call(ctx, "propFirmUpdates", {}).length, 0);
});

test("更新校验区分合法日期、空内容、错误分类、重复ID和错误结构", () => {
  const ctx = setup();
  assert.equal(call(ctx, "propValidateFirmUpdates", undefined).length, 0);
  assert.equal(call(ctx, "propValidateFirmUpdates", [update("a", "2024-02-29", "Valid", "rules")]).length, 0);
  for (const list of [{}, [null], [update("a", "2026-02-30", "Invalid")], [update("a", "2026-10-25", " ")], [update("a", "2026-10-25", "Text", "bad")], [update("same", "2026-10-25", "A"), update("same", "2026-10-24", "B")]]) {
    assert.ok(call(ctx, "propValidateFirmUpdates", list).length > 0);
  }
});

test("卡片可配置为最新两条，详情展示全部，使用相同日期和内容", () => {
  const ctx = setup();
  const card = call(ctx, "propFirmUpdatesHtml", { ...firm, updatesPreviewCount: 2 }, true);
  const detail = call(ctx, "propFirmUpdatesHtml", firm, false);
  assert.equal((card.match(/class="propFirmUpdate"/g) || []).length, 2);
  assert.equal((detail.match(/class="propFirmUpdate"/g) || []).length, 3);
  assert.ok(card.indexOf("Newest update") < card.indexOf("Middle update"));
  assert.ok(!card.includes("Older update"));
  assert.ok(detail.includes("Older update"));
  assert.match(card, /data-action="prop-firm-updates" data-id="firm"/);
  assert.match(detail, /id="propFirmUpdates"/);
  assert.match(card, /<strong>Newest update<\/strong>/);
});

test("更新内容和属性安全转义；未知类型显示公告，非法日期不输出 datetime", () => {
  const ctx = setup();
  const attack = '<img src=x onerror="bad">';
  const html = call(ctx, "propFirmUpdatesHtml", { id: 'x" onclick="bad', name: attack, recentUpdates: [{ date: "not-a-date", type: attack, text: `**${attack}**\n==重点==` }] }, true);
  assert.doesNotMatch(html, /<img src=x|data-id="x" onclick=|datetime="not-a-date"/);
  assert.match(html, /&lt;img/);
  assert.match(html, /<mark>重点<\/mark>/);
  assert.match(html, /公告/);
});

test("编辑草稿与公司数据分离，增删只改草稿，普通用户不能操作", () => {
  const ctx = setup();
  ctx.run("propModal = { type: 'admFirm', draft: propAdmFirmDraft(propFirms[0]) }; propRefreshFirmUpdatesEditor = () => {};");
  const before = ctx.run("JSON.stringify(propFirms)");
  ctx.run("propAddFirmUpdate();");
  assert.equal(ctx.run("propModal.draft.recentUpdates.length"), 4);
  ctx.run('propSetFirmUpdateField(0, "text", "New draft");');
  assert.equal(ctx.run("propModal.draft.recentUpdates[0].text"), "New draft");
  ctx.run("propRemoveFirmUpdate(0);");
  assert.equal(ctx.run("propModal.draft.recentUpdates.length"), 3);
  assert.equal(ctx.run("JSON.stringify(propFirms)"), before);
  ctx.set("currentProfile", { role: "user" });
  ctx.run('propAddFirmUpdate(); propRemoveFirmUpdate(0); propSetFirmUpdateField(0, "text", "unauthorized");');
  assert.equal(ctx.run("propModal.draft.recentUpdates.length"), 3);
  assert.equal(ctx.run("JSON.stringify(propFirms)"), before);
});

test("编辑更新有日期、分类和多行内容，输入能单独同步，禁止任意字段写入", () => {
  const ctx = setup();
  ctx.run("propModal = { type: 'admFirm', draft: propAdmFirmDraft(propFirms[0]) };");
  const html = ctx.run("propFirmUpdatesEditorHtml(propModal)");
  assert.match(html, /data-prop-details="updatesOpen"/);
  for (const field of ["date", "type", "text"]) assert.ok(html.includes(`data-prop-update-field="${field}"`));
  assert.match(html, /<label for="propUpdateDate-0">/);
  ctx.run('propSetFirmUpdateField(0, "date", "2026-10-26"); propSetFirmUpdateField(0, "type", "payout"); propSetFirmUpdateField(0, "text", "Updated");');
  assert.equal(ctx.run("propModal.draft.recentUpdates[0].date"), "2026-10-26");
  assert.equal(ctx.run("propModal.draft.recentUpdates[0].type"), "payout");
  ctx.run('propSetFirmUpdateField(0, "__proto__", "bad"); propSetFirmUpdateField(-1, "text", "bad");');
  assert.equal(ctx.run("propModal.draft.recentUpdates[0].text"), "Updated");
});

test("公司更新随 data 保存、读回和导出，不覆盖推荐语与政策", async () => {
  const ctx = setup();
  let saved;
  ctx.sandbox.__client = { from(table) { assert.equal(table, "prop_firms"); return { async upsert(rows) { saved = JSON.parse(JSON.stringify(rows[0])); return { error: null }; } }; } };
  ctx.run("sb = __client; render = () => {}; propRenderModal = () => {}; propModal = { type: 'admFirm', id: 'firm', isNew: false, draft: propAdmFirmDraft(propFirms[0]) };");
  ctx.run('propModal.draft.recentUpdates[0].text = "Edited update";');
  await ctx.run("propAdmSaveFirm()");
  assert.equal(saved.data.recentUpdates.length, 3);
  assert.equal(saved.data.recentUpdates[0].text, "Edited update");
  assert.equal(saved.data.review, firm.review);
  assert.equal(saved.data.magicPolicy, firm.magicPolicy);
  ctx.sandbox.__row = saved;
  assert.equal(ctx.run("propFirmFromRow(__row).recentUpdates.length"), 3);
  assert.equal(ctx.run("propCatalogExport().firms[0].recentUpdates.length"), 3);
});

test("空白或非法更新阻止保存，保留草稿并打开更新编辑区", async () => {
  const ctx = setup();
  ctx.sandbox.__client = { from() { throw new Error("must not save invalid update"); } };
  ctx.run("sb = __client; render = () => {}; propRenderModal = () => {}; propModal = { type: 'admFirm', id: 'firm', isNew: false, draft: propAdmFirmDraft(propFirms[0]) }; propModal.draft.recentUpdates.push({ date: '', text: '', type: 'notice' });");
  const before = ctx.run("JSON.stringify(propFirms)");
  await ctx.run("propAdmSaveFirm()");
  assert.ok(ctx.run("propModal.error"));
  assert.equal(ctx.run("propModal.updatesOpen"), true);
  assert.equal(ctx.run("propModal.draft.recentUpdates.length"), 4);
  assert.equal(ctx.run("JSON.stringify(propFirms)"), before);
});

test("公司保存失败时不把草稿更新当成已发布，原历史保留", async () => {
  const ctx = setup();
  ctx.sandbox.console = { ...console, error() {} };
  ctx.sandbox.__client = { from: () => ({ upsert: async () => ({ error: { message: "offline failure" } }) }) };
  ctx.run("sb = __client; render = () => {}; propRenderModal = () => {}; propModal = { type: 'admFirm', id: 'firm', isNew: false, draft: propAdmFirmDraft(propFirms[0]) };");
  const before = ctx.run("JSON.stringify(propFirms)");
  ctx.run('propModal.draft.recentUpdates[0].text = "Unsaved change";');
  await ctx.run("propAdmSaveFirm()");
  assert.equal(ctx.run("JSON.stringify(propFirms)"), before);
  assert.equal(ctx.run("propModal.draft.recentUpdates[0].text"), "Unsaved change");
  assert.ok(ctx.run("propModal.error"));
  assert.equal(ctx.run("propModal.busy"), false);
});

test("目录导入兼容缺少更新的旧公司，但拒绝非法更新", () => {
  const ctx = setup();
  for (const company of [{ id: "a", name: "A" }, firm]) {
    assert.equal(call(ctx, "propValidateCatalog", { firms: [company], plans: [] }).errors.length, 0);
  }
  const invalid = call(ctx, "propValidateCatalog", { firms: [{ ...firm, recentUpdates: [update("x", "2026-13-01", "Bad date")] }], plans: [] });
  assert.equal(invalid.catalog, null);
  assert.match(invalid.errors[0], /recentUpdates/);
});

test("空态不伪造动态、普通用户无编辑入口，中英文完整", () => {
  const ctx = setup(false);
  const empty = call(ctx, "propFirmUpdatesHtml", { id: "empty", name: "Empty" }, true);
  assert.match(empty, /暂无更新记录/);
  assert.doesNotMatch(empty, /data-action="prop-adm-firm"|<time/);
  for (const lang of ["zh", "en"]) {
    for (const key of ["title", "empty", "viewAll", "edit", "add", "remove", "date", "type", "text", "editorHint", "previewLabel", "previewNumber", "previewAll", "previewHint", "invalidPreview", "invalidList", "invalidEntry", "noDate", "noText", "count", "type.notice", "type.rules", "type.pricing", "type.payout", "type.platform"]) {
      assert.equal(ctx.run(`typeof I18N.${lang}["prop.updates.${key}"]`), "string");
    }
  }
});

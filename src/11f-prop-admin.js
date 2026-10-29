/* ============================================================
   PROP 账户 —— 管理员在网页上维护目录
   价格、规则会随时间变，不用每次重新爬 / 导入 JSON：管理员打开「编辑目录」后
   - 推荐排行：↑↓ 调顺序（顺序就是排名），编辑公司信息（评级、推荐语、本月优惠、logo…），新增公司
   - 价格卡片上 ✎ 改单个计划（左边实时预览，右边分组填写），可复制成新规模、删除
   - 公司页：每个系列「＋ 新增规模」，「批量改价」按原价打几折一次改完
   每次保存直接写 prop_firms / prop_plans（RLS 只放管理员写）；计划「核实于」记成当天。
   注意：之后再用「导入目录」整份替换，会覆盖这里手动改过的内容
   ============================================================ */
function propIsAdmin() { return !!(currentProfile && currentProfile.role === "admin" && currentProfile.active !== false && !viewingUserId); }
function propEditing() { return propEditMode && propIsAdmin(); }

/* ---------- 读写 ---------- */
function propFirmRow(f) {
  const { id, name, website, logo, ...rest } = f;
  const index = propFirms.findIndex((x) => x.id === id);
  return { id, name, website: website || "", logo: logo || "", sort_order: index < 0 ? propFirms.length : index, data: rest, updated_at: new Date().toISOString() };
}
function propPlanRow(p) {
  const { id, firm, series, size, status, ...rest } = p;
  const i = propPlans.findIndex((x) => x.id === id);
  return { id, firm_id: firm, series: series || "", size: size === undefined || size === "" ? null : size, status: status || "current",
    sort_order: i >= 0 ? i : propPlans.length, data: rest, updated_at: new Date().toISOString() };
}
async function propAdmSaveFirms(list) {
  try {
    const { error } = await sb.from("prop_firms").upsert(list.map(propFirmRow));
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(error);
    propError = T("prop.saveFailed", { msg: error && error.message ? error.message : String(error) });
    return false;
  }
}
async function propAdmSavePlans(list) {
  const { error } = await sb.from("prop_plans").upsert(list.map(propPlanRow));
  if (error) { console.error(error); propError = T("prop.saveFailed", { msg: error.message }); return false; }
  list.forEach((p) => { const i = propPlans.findIndex((x) => x.id === p.id); if (i >= 0) propPlans[i] = p; else propPlans.push(p); });
  return true;
}
async function propAdmDeletePlan(id) {
  const { error } = await sb.from("prop_plans").delete().eq("id", id);
  if (error) { console.error(error); propError = T("prop.saveFailed", { msg: error.message }); return false; }
  propPlans = propPlans.filter((p) => p.id !== id);
  return true;
}
function propSlug(s) { return String(s || "").trim().toLowerCase().replace(/[\s/·]+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").replace(/-+/g, "-").replace(/^-|-$/g, "") || "x"; }
function propNewPlanId(firm, series, size) {
  const base = [firm, propSlug(series), size ? size / 1000 + "k" : ""].filter(Boolean).join("-");
  let id = base;
  for (let n = 2; propPlans.some((p) => p.id === id); n++) id = base + "-" + n;
  return id;
}

/* ---------- 推荐排行：管理员视角 ---------- */
function renderPropBoardAdmin() {
  const firms = propFirms.slice().sort((a, b) => propRankOf(a) - propRankOf(b));
  return `<div class="calendarPanel propPanel propAdmBoard">
    <div class="propPanelHead"><div class="sectionLabel propLabel">${esc(T("prop.cat.boardTitle"))}</div><span class="propMuted">${esc(T("prop.adm.boardHint"))}</span></div>
    <div class="propAdmFirms">${firms.map((f, i) => `<div class="propAdmFirm ${f.hidden ? "hidden" : ""}">
      <span class="propRank ${i < 3 ? "top" : ""}">${i + 1}</span>${propFirmLogo(f, true)}
      <div class="propAdmFirmName"><b>${esc(f.name)}</b>${propTierTag(f)}${f.hidden ? `<span class="propTier propTier-meh">${esc(T("prop.adm.hiddenTag"))}</span>` : ""}
        <small>${esc(f.promo && (f.promo.discount || f.promo.text) ? [f.promo.discount && T("prop.cat.off", { v: f.promo.discount }), f.promo.text].filter(Boolean).join(" · ") : propReviewPlainText(f.review))}</small></div>
      <span class="propMuted">${esc(T("prop.cat.planCount", { n: propPlans.filter((p) => p.firm === f.id).length }))}</span>
      <div class="propAdmBtns">
        <button class="tinyBtn" data-action="prop-adm-move" data-id="${esc(f.id)}" data-d="-1" ${i === 0 ? "disabled" : ""} title="${esc(T("prop.adm.up"))}">↑</button>
        <button class="tinyBtn" data-action="prop-adm-move" data-id="${esc(f.id)}" data-d="1" ${i === firms.length - 1 ? "disabled" : ""} title="${esc(T("prop.adm.down"))}">↓</button>
        <button class="btn btn-sm ${f.hidden ? "btn-primary" : ""}" data-action="prop-adm-hide" data-id="${esc(f.id)}" title="${esc(T("prop.adm.hideHint"))}">${esc(T(f.hidden ? "prop.adm.show" : "prop.adm.hideShort"))}</button>
        <button class="btn btn-sm" data-action="prop-adm-firm" data-id="${esc(f.id)}">${ICONS.pencil} ${esc(T("prop.adm.edit"))}</button>
        <button class="btn btn-sm" data-action="prop-cat-firm" data-val="${esc(f.id)}">${esc(T("prop.adm.plans"))} ›</button>
      </div></div>`).join("")}</div>
    <button class="btn btn-sm propBoardMore" data-action="prop-adm-firm" data-id="">${ICONS.plus} ${esc(T("prop.adm.newFirm"))}</button>
  </div>`;
}
async function propAdmMove(id, d) {
  const list = propFirms.slice().sort((a, b) => propRankOf(a) - propRankOf(b));
  const i = list.findIndex((f) => f.id === id), j = i + d;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  propFirms = list.map((f, k) => ({ ...f, rank: k + 1 }));
  render();
  if (!(await propAdmSaveFirms(propFirms))) render();
}

/* ---------- 编辑公司 ---------- */
const PROP_TIERS = ["", "good", "fair", "meh", "avoid"];
function propAdmFirmDraft(f) {
  return { id: f ? f.id : "", name: f ? f.name : "", logo: f ? f.logo || "" : "", website: f ? f.website || "" : "", tier: f ? f.tier || "" : "",
    magicPolicy: propMagicPolicy(f),
    recentUpdates: propFirmUpdatesDraft(f),
    updatesPreviewCount: f?.updatesPreviewCount ?? 1,
    keySentence: propPresentationClone(f?.keySentence),
    promoDesign: propPresentationClone(f?.promo),
    review: f ? f.review || "" : "", promoDiscount: f && f.promo ? f.promo.discount || "" : "", promoText: f && f.promo ? f.promo.text || "" : "",
    platforms: propFirmChoiceDraft(f, "platforms"), payoutMethods: propFirmChoiceDraft(f, "payoutMethods"),
    kycRequirements: propFirmChoiceDraft(f, "kycRequirements"), paymentMethods: propFirmChoiceDraft(f, "paymentMethods"),
    notes: f ? f.notes || "" : "", hidden: !!(f && f.hidden) };
}
function propAdmFirmValue(m) {
  const d = m.draft, old = m.isNew ? null : propFindFirm(m.id);
  const name = String(d.name || "").trim();
  let id = old ? old.id : propSlug(name);
  for (let n = 2; !old && propFirms.some((f) => f.id === id); n++) id = propSlug(name) + "-" + n;
  const promo = { ...(old && old.promo ? old.promo : {}), ...(propPresentationObject(d.promoDesign) ? d.promoDesign : {}), discount: String(d.promoDiscount || "").trim(), text: String(d.promoText || "").trim() };
  if (!promo.discount) delete promo.discount;
  if (!promo.text) delete promo.text;
  return { ...(old || {}), id, name, logo: String(d.logo || "").trim(), website: String(d.website || "").trim(), tier: d.tier || null,
    magicPolicy: propMagicPolicy(d),
    ...(d.keySentence !== undefined && (old?.keySentence !== undefined || Object.keys(d.keySentence || {}).length) ? { keySentence: propPresentationClone(d.keySentence) } : {}),
    recentUpdates: (d.recentUpdates || []).map((u) => ({ ...u, type: PROP_FIRM_UPDATE_TYPES.includes(u.type) ? u.type : "notice", text: u.text.trim() })),
    updatesPreviewCount: d.updatesPreviewCount ?? 1,
    review: String(d.review || "").trim(), promo: Object.keys(promo).length ? promo : undefined, notes: String(d.notes || "").trim(), hidden: !!d.hidden,
    platforms: propFirmChoiceValues(d.platforms), payoutMethods: propFirmChoiceValues(d.payoutMethods),
    kycRequirements: propFirmChoiceValues(d.kycRequirements), paymentMethods: propFirmChoiceValues(d.paymentMethods),
    rank: old ? old.rank : propFirms.length + 1 };
}
function propAdmFirmForm(m) {
  const d = m.draft;
  const body = `<div class="propRow">${propField(T("prop.adm.firmName"), propInput("name", d.name, `maxlength="60"`))}
      ${propField(T("prop.adm.tier"), propSelect("tier", d.tier, PROP_TIERS.map((t) => [t, t ? T("prop.tier." + t) : T("prop.adm.noTier")])))}</div>
    <div class="propRow">${propField(T("prop.adm.logo"), propInput("logo", d.logo, `placeholder="/img/prop/xxx.webp"`), T("prop.adm.logoHint"))}
      ${propField(T("prop.cat.website"), propInput("website", d.website, `placeholder="https://"`))}</div>
    ${propReviewEditorHtml(d.review)}
    ${propFirmUpdatesEditorHtml(m)}
    <div class="propRow">${propField(T("prop.adm.promoDiscount"), propInput("promoDiscount", d.promoDiscount, `maxlength="12" placeholder="40%"`))}
      ${propField(T("prop.adm.promoText"), propInput("promoText", d.promoText, `maxlength="80"`), T("prop.adm.promoHint"))}</div>
    ${propFirmChoicesEditorHtml(m)}
    <div class="field"><div class="fieldLabel"><label for="propMagicPolicy">${esc(T("prop.magic.label"))}</label></div>
      <select class="input" id="propMagicPolicy" data-prop-field="magicPolicy" aria-describedby="propMagicPolicyHint">${PROP_MAGIC_POLICIES.map((v) => `<option value="${v}" ${propMagicPolicy(d) === v ? "selected" : ""}>${esc(T("prop.magic." + v))}</option>`).join("")}</select>
      <div class="propHint" id="propMagicPolicyHint">${esc(T("prop.magic.hint"))}</div></div>
    <div class="field"><div class="fieldLabel"><label for="propFirmNotesInput">${esc(T("prop.firmInfo.notes"))}</label></div><textarea class="input" id="propFirmNotesInput" data-prop-field="notes" rows="4">${esc(d.notes)}</textarea></div>
    <div class="field">${propCheck("hidden", d.hidden, T("prop.adm.hide"))}<div class="propHint">${esc(T("prop.adm.hideHint"))}</div></div>`;
  return { title: esc(T(m.isNew ? "prop.adm.newFirm" : "prop.adm.editFirm")), body, foot: propFootButtons("prop-adm-save-firm") };
}
async function propAdmSaveFirm() {
  const m = propModal;
  if (!propIsAdmin() || !m || m.type !== "admFirm" || m.busy) return;
  const d = m.draft;
  const name = String(d.name || "").trim();
  if (!name) { m.error = T("prop.form.needFirm"); propRenderModal(); return; }
  const choiceErrors = propValidateFirmChoices(d);
  if (choiceErrors.length) { m.error = choiceErrors[0]; propRenderModal(); return; }
  const designErrors = propValidatePresentation(propDraftPresentation(d));
  if (designErrors.length) { m.error = designErrors[0]; propRenderModal(); return; }
  const updateErrors = propValidateFirmUpdates(d.recentUpdates, d.updatesPreviewCount);
  if (updateErrors.length) { m.error = updateErrors[0]; m.updatesOpen = true; propRenderModal(); propScrollFirmUpdatesEditor(); return; }
  const old = m.isNew ? null : propFindFirm(m.id);
  const f = propAdmFirmValue(m), id = f.id;
  if (!old) propFirms.push(f); else propFirms = propFirms.map((x) => (x.id === id ? f : x));
  m.busy = true; propRenderModal();
  const ok = await propAdmSaveFirms([f]);
  if (!ok) {
    // 保存失败时恢复目录中的旧公司；新录入的更新仍留在弹窗草稿里，不能显示成已发布。
    propFirms = old ? propFirms.map((x) => x === f ? old : x) : propFirms.filter((x) => x !== f);
    m.busy = false; m.error = propError; propRenderModal(); return;
  }
  propError = null; propModal = null; propRenderModal(); render();
}

/* ---------- 编辑计划 ----------
   左边是跟价格对比一样的卡片（实时预览），右边按「基本 / 价格 / 考核 / 出金号 / 出金」分组。
   规则格子：数字 = 具体值，「无」= 没有这项，空着 = 不知道 */
const PROP_ADM_RULES = {
  price: [["list", "prop.adm.f.list", "$"], ["original", "prop.adm.f.original", "$"], ["activation", "prop.rule.activation", "$"], ["reset", "prop.rule.reset", "$"]],
  eval: [["target", "prop.rule.target", "$"], ["drawdown", "prop.rule.drawdown", "$"], ["dll", "prop.rule.dll", "$"], ["consistency", "prop.rule.consistency", "%"], ["minDays", "prop.rule.minDays", "d"]],
  funded: [["drawdown", "prop.rule.drawdown", "$"], ["dll", "prop.rule.dll", "$"], ["consistency", "prop.rule.consistency", "%"]],
  payout: [["split", "prop.rule.split", "%"], ["min", "prop.cmp.payoutMin", "$"], ["cap", "prop.cmp.payoutCap", "$"], ["qualifyingDays", "prop.adm.f.days", "d"], ["dayProfit", "prop.cmp.dayProfit", "$"]],
};
const PROP_ADM_TEXTS = { price: [["note", "prop.rule.priceNote"], ["promoUntil", "prop.adm.f.promoUntil"]], eval: [["maxContracts", "prop.rule.evalContracts"]],
  funded: [["maxContracts", "prop.rule.fundedContracts"], ["staticAfter", "prop.rule.staticAfter"]], payout: [["frequency", "prop.rule.frequency"], ["live", "prop.rule.live"]] };
function propAdmPlanDraft(p) {
  const d = { id: p.id || "", firm: p.firm, series: p.series || "", family: p.family || "", size: p.size || "", type: p.type || "evaluation", status: p.status || "current",
    billing: (p.price || {}).billing || "one_time", evalDd: (p.eval || {}).drawdownType || "", fundedDd: (p.funded || {}).drawdownType || "",
    daily: !!(p.payout || {}).daily, notes: p.notes || "",
    choices: (Array.isArray(p.choices) ? p.choices : []).map((c) => c.axis + "=" + c.value).join("; ") };
  Object.entries(PROP_ADM_RULES).forEach(([sec, keys]) => keys.forEach(([k]) => { d[sec + "." + k] = propRuleText((p[sec] || {})[k]); }));
  Object.entries(PROP_ADM_TEXTS).forEach(([sec, keys]) => keys.forEach(([k]) => { d[sec + "." + k] = (p[sec] || {})[k] || ""; }));
  return d;
}
/* 草稿 → 计划对象（预览和保存都用） */
function propAdmPlanFromDraft(base, d) {
  const p = JSON.parse(JSON.stringify(base || {}));
  ["price", "eval", "funded", "payout"].forEach((sec) => { p[sec] = { ...(p[sec] || {}) }; });
  Object.entries(PROP_ADM_RULES).forEach(([sec, keys]) => keys.forEach(([k]) => { p[sec][k] = propParseRule(d[sec + "." + k]); }));
  Object.entries(PROP_ADM_TEXTS).forEach(([sec, keys]) => keys.forEach(([k]) => { const v = String(d[sec + "." + k] || "").trim(); if (v) p[sec][k] = v; else delete p[sec][k]; }));
  p.series = String(d.series || "").trim();
  p.family = String(d.family || "").trim() || p.series;
  p.size = Number(d.size) || null;
  p.type = d.type === "instant" ? "instant" : "evaluation";
  p.status = d.status === "legacy" ? "legacy" : "current";
  p.price.billing = d.billing === "monthly" ? "monthly" : "one_time";
  p.eval.drawdownType = PROP_DD_TYPES.includes(d.evalDd) ? d.evalDd : null;
  p.funded.drawdownType = PROP_DD_TYPES.includes(d.fundedDd) ? d.fundedDd : null;
  if (d.daily) p.payout.daily = true; else delete p.payout.daily;
  p.choices = String(d.choices || "").split(/[;；\n]/).map((s) => s.split(/[=：:]/)).filter((x) => x.length === 2 && x[0].trim() && x[1].trim())
    .map(([axis, value]) => ({ axis: axis.trim(), value: value.trim() }));
  p.notes = String(d.notes || "").trim();
  if (p.type === "instant") delete p.eval;
  return p;
}
function propAdmPlanForm(m) {
  const d = m.draft;
  const base = m.isNew ? { firm: d.firm } : propFindPlan(m.id) || { firm: d.firm };
  const preview = { ...propAdmPlanFromDraft(base, d), id: m.id || "__new", firm: d.firm };
  const rule = (sec, k, label, unit) => propField(T(label) + (unit === "%" ? " %" : unit === "d" ? "" : " $"), propInput(sec + "." + k, d[sec + "." + k], `placeholder="${esc(T("prop.rule.unknown"))}" data-prop-rerender`));
  const text = (sec, k, label) => propField(T(label), propInput(sec + "." + k, d[sec + "." + k], `data-prop-rerender`));
  const grid = (sec) => `<div class="propRuleGrid">${PROP_ADM_RULES[sec].map(([k, l, u]) => rule(sec, k, l, u)).join("")}</div>${(PROP_ADM_TEXTS[sec] || []).map(([k, l]) => text(sec, k, l)).join("")}`;
  const ddSel = (field) => propSelect(field, d[field], [["", T("prop.rule.unknown")], ...PROP_DD_TYPES.map((t) => [t, T("prop.dd." + t)])], true);
  const step = (n, title, html) => `<div class="propCard propAddStep"><div class="propAddStepHead"><b>${esc(title)}</b><span>${n}</span></div>${html}</div>`;
  const form = step("01", T("prop.adm.secBasic"), `
      <div class="propRow">${propField(T("prop.cmp.series"), propInput("series", d.series, `data-prop-rerender`))}${propField(T("prop.add.family"), propInput("family", d.family, `data-prop-rerender`), T("prop.adm.familyHint"))}</div>
      <div class="propRow">${propField(T("prop.form.size"), propInput("size", d.size, `type="number" min="0" step="1000" data-prop-rerender`))}
        ${propField(T("prop.cmp.type"), propSelect("type", d.type, [["evaluation", T("prop.plan.evaluation")], ["instant", T("prop.plan.instant")]], true))}</div>
      <div class="propRow">${propField(T("prop.adm.f.status"), propSelect("status", d.status, [["current", T("prop.adm.f.current")], ["legacy", T("prop.cat.legacy")]], true))}
        ${propField(T("prop.form.billing"), propSelect("billing", d.billing, [["one_time", T("prop.billing.one_time")], ["monthly", T("prop.billing.monthly")]], true))}</div>
      ${propField(T("prop.adm.f.choices"), propInput("choices", d.choices, `placeholder="一致性=40%; 日损=有日损" data-prop-rerender`), T("prop.adm.choicesHint"))}`)
    + step("02", T("prop.adm.secPrice"), grid("price"))
    + (d.type === "instant" ? "" : step("03", T("prop.adm.secEval"), `<div class="propRow">${propField(T("prop.cmp.ddType"), ddSel("evalDd"))}<div></div></div>${grid("eval")}`))
    + step(d.type === "instant" ? "03" : "04", T("prop.adm.secFunded"), `<div class="propRow">${propField(T("prop.cmp.ddType"), ddSel("fundedDd"))}<div></div></div>${grid("funded")}`)
    + step(d.type === "instant" ? "04" : "05", T("prop.adm.secPayout"), `${grid("payout")}<div class="field">${propCheck("daily", d.daily, T("prop.pc.pref.daily"), true)}</div>`)
    + step(d.type === "instant" ? "05" : "06", T("prop.adm.notes"), `<textarea class="input" data-prop-field="notes" rows="4">${esc(d.notes)}</textarea>`);
  const body = `<div class="propHint" style="margin-bottom:12px;">${esc(T("prop.adm.ruleHint"))}</div>
    <div class="propAddGrid"><div class="propAddPreview propAdmPreview">${propPlanCard2({ key: "__adm", plans: [preview], pick: preview }, [], true)}</div><div class="propAddForm">${form}</div></div>`;
  const foot = `${m.isNew ? "" : m.confirmDelete
      ? `<button class="btn btn-danger" data-action="prop-adm-del-plan">${esc(T("prop.acc.deleteYes"))}</button><button class="btn" data-action="prop-adm-cancel-del">${esc(T("common.cancel"))}</button>`
      : `<button class="btn" data-action="prop-adm-ask-del">${ICONS.trash} ${esc(T("prop.adm.delPlan"))}</button><button class="btn" data-action="prop-adm-dup-plan">${esc(T("prop.adm.dupPlan"))}</button>`}
    <span style="flex:1"></span>${propFootButtons("prop-adm-save-plan")}`;
  const firm = propFindFirm(d.firm) || { name: d.firm };
  return { title: esc(T(m.isNew ? "prop.adm.newPlan" : "prop.adm.editPlan", { firm: firm.name })), body, foot };
}
async function propAdmSavePlan() {
  const m = propModal, d = m.draft;
  if (!String(d.series || "").trim()) { m.error = T("prop.adm.needSeries"); propRenderModal(); return; }
  const base = m.isNew ? { firm: d.firm } : propFindPlan(m.id);
  const p = { ...propAdmPlanFromDraft(base, d), firm: d.firm, checkedAt: todayStr() };
  p.id = m.isNew ? propNewPlanId(d.firm, p.series, p.size) : m.id;
  m.busy = true; propRenderModal();
  const ok = await propAdmSavePlans([p]);
  if (!ok) { m.busy = false; m.error = propError; propRenderModal(); return; }
  propError = null; propModal = null; propRenderModal(); render();
}

/* ---------- 批量改价：一家公司（或其中一个系列）按原价打几折 ---------- */
function propAdmBatchRows(m) {
  const d = m.draft, off = Number(d.off);
  return propPlans.filter((p) => p.firm === m.firm && p.status !== "legacy" && (!d.family || propFamilyOf(p) === d.family)).map((p) => {
    const pr = p.price || {};
    const orig = typeof pr.original === "number" ? pr.original : typeof pr.list === "number" ? pr.list : null;
    const next = orig !== null && isFinite(off) && d.off !== "" ? Math.round(orig * (1 - off / 100) * 100) / 100 : null;
    return { p, orig, now: typeof pr.list === "number" ? pr.list : null, next };
  });
}
function propAdmBatchForm(m) {
  const d = m.draft, firm = propFindFirm(m.firm) || { name: m.firm };
  const rows = propAdmBatchRows(m);
  const body = `<div class="propHint" style="margin-bottom:12px;">${esc(T("prop.adm.batchHint"))}</div>
    <div class="propRow">${propField(T("prop.add.family"), propSelect("family", d.family, [["", T("prop.adm.allSeries")], ...propFamilies(m.firm).map((f) => [f, f])], true))}
      ${propField(T("prop.adm.off"), propInput("off", d.off, `type="number" min="0" max="100" step="1" placeholder="40" data-prop-rerender`))}</div>
    <div class="propRow">${propField(T("prop.adm.f.promoUntil"), propInput("promoUntil", d.promoUntil, `placeholder="10/31"`))}${propField(T("prop.rule.priceNote"), propInput("note", d.note, `placeholder="${esc(T("prop.adm.notePh"))}"`))}</div>
    <div class="tableScroll"><table class="adminTable propTable"><thead><tr><th>${esc(T("prop.cmp.series"))}</th><th class="num">${esc(T("prop.form.size"))}</th><th class="num">${esc(T("prop.adm.f.original"))}</th><th class="num">${esc(T("prop.adm.nowPrice"))}</th><th class="num">${esc(T("prop.adm.newPrice"))}</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${esc(r.p.series)}</td><td class="num">${esc(propSizeLabel(r.p.size))}</td><td class="num">${r.orig === null ? "—" : propUsd(r.orig)}</td><td class="num">${r.now === null ? "—" : propUsd(r.now)}</td>
      <td class="num ${r.next !== null && r.next !== r.now ? "propAdmChanged" : ""}">${r.next === null ? "—" : propUsd(r.next)}</td></tr>`).join("")}</tbody></table></div>`;
  return { title: esc(T("prop.adm.batch", { firm: firm.name })), body, foot: propFootButtons("prop-adm-save-batch", T("prop.adm.applyN", { n: rows.filter((r) => r.next !== null).length })) };
}
async function propAdmSaveBatch() {
  const m = propModal, d = m.draft;
  const rows = propAdmBatchRows(m).filter((r) => r.next !== null);
  if (!rows.length) { m.error = T("prop.adm.needOff"); propRenderModal(); return; }
  const off = Number(d.off) / 100;
  const list = rows.map(({ p, orig, next }) => ({ ...p, checkedAt: todayStr(),
    price: { ...(p.price || {}), original: orig, list: next, discount: off || undefined,
      promoUntil: String(d.promoUntil || "").trim() || undefined, note: String(d.note || "").trim() || (p.price || {}).note } }));
  m.busy = true; propRenderModal();
  const ok = await propAdmSavePlans(list);
  if (!ok) { m.busy = false; m.error = propError; propRenderModal(); return; }
  propError = null; propModal = null; propToast(T("prop.adm.batchDone", { n: list.length })); propRenderModal(); render();
}

/* ---------- 事件 ---------- */
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || !el.dataset.action.startsWith("prop-adm") || !propIsAdmin()) return;
  const a = el.dataset.action, id = el.dataset.id, m = propModal;
  if (a === "prop-adm-toggle") { propEditMode = !propEditMode; render(); }
  else if (a === "prop-adm-review-format") { propApplyReviewFormat(el.dataset.format); }
  else if (a === "prop-adm-choice-add") { propAddFirmChoice(el.dataset.field); }
  else if (a === "prop-adm-update-add") { propAddFirmUpdate(); }
  else if (a === "prop-adm-update-remove") { propRemoveFirmUpdate(Number(el.dataset.index)); }
  else if (a === "prop-adm-move") { await propAdmMove(id, Number(el.dataset.d)); }
  else if (a === "prop-adm-hide") {
    // 一键隐藏 / 显示：这家公司的排行、所有规模所有计划一起对普通用户隐藏
    const f = propFindFirm(id);
    if (!f) return;
    const next = { ...f, hidden: !f.hidden };
    propFirms = propFirms.map((x) => (x.id === id ? next : x));
    render();
    if (await propAdmSaveFirms([next])) propToast(T(next.hidden ? "prop.adm.hiddenDone" : "prop.adm.shownDone", { name: f.name, n: propPlans.filter((p) => p.firm === id).length }));
    else { propFirms = propFirms.map((x) => (x.id === id ? f : x)); render(); }
  }
  else if (a === "prop-adm-firm") {
    if (currentLayout() === "modern") { propOpenFirmEditor(id, el.dataset.section); return; }
    const f = id ? propFindFirm(id) : null;
    propModal = { type: "admFirm", id, isNew: !f, draft: propAdmFirmDraft(f), updatesOpen: el.dataset.section === "updates" }; propRenderModal();
    if (propModal.updatesOpen) propScrollFirmUpdatesEditor();
  }
  else if (a === "prop-adm-save-firm") { await propAdmSaveFirm(); }
  else if (a === "prop-adm-plan") {
    const p = propFindPlan(id);
    if (!p) return;
    propModal = { type: "admPlan", id, isNew: false, draft: propAdmPlanDraft(p) }; propRenderModal();
  }
  else if (a === "prop-adm-new-plan") {
    // 新增规模：从同系列最后一个计划复制规则，价格清空让管理员填
    const tpl = propPlans.filter((p) => p.firm === el.dataset.firm && propFamilyOf(p) === el.dataset.family).pop();
    const d = propAdmPlanDraft(tpl || { firm: el.dataset.firm, series: el.dataset.family, family: el.dataset.family });
    d.size = ""; d["price.list"] = ""; d["price.original"] = "";
    propModal = { type: "admPlan", isNew: true, draft: { ...d, firm: el.dataset.firm } }; propRenderModal();
  }
  else if (a === "prop-adm-dup-plan") { m.isNew = true; m.id = null; m.draft = { ...m.draft, size: "" }; propRenderModal(); }
  else if (a === "prop-adm-save-plan") { await propAdmSavePlan(); }
  else if (a === "prop-adm-ask-del") { m.confirmDelete = true; propRenderModal(); }
  else if (a === "prop-adm-cancel-del") { m.confirmDelete = false; propRenderModal(); }
  else if (a === "prop-adm-del-plan") {
    m.busy = true; propRenderModal();
    const ok = await propAdmDeletePlan(m.id);
    if (!ok) { m.busy = false; m.error = propError; propRenderModal(); return; }
    propModal = null; propRenderModal(); render();
  }
  else if (a === "prop-adm-batch") { propModal = { type: "admBatch", firm: el.dataset.firm, draft: { family: "", off: "", promoUntil: "", note: "" } }; propRenderModal(); }
  else if (a === "prop-adm-save-batch") { await propAdmSaveBatch(); }
});

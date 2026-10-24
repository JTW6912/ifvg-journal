/* ============================================================
   PROP 账户 —— 页面
   三页：总览（投入 / 回报 / ROI / 按月 / 按公司 / 漏斗）、我的账号（卡片 + 详情）、公司计划（目录卡片 + 对比）。
   弹窗都挂在 #secondaryModalRoot（见 renderSecondaryModals 里的 "prop"），内容变了用 propRenderModal() 强制重画；
   表单里打的字随 input 事件写进 propModal.draft，所以强制重画不会把没保存的输入冲掉。
   数据和口径在 11d-prop-data.js
   ============================================================ */
function propUsd(n, signed) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const v = Math.abs(n);
  const whole = Math.abs(v - Math.round(v)) < 0.005;
  const s = "$" + v.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  if (n < -0.004) return "−" + s;
  return (signed && n > 0.004 ? "+" : "") + s;
}
function propPct(n) { return n === null || n === undefined || isNaN(n) ? "—" : (n > 0.04 ? "+" : "") + n.toFixed(1) + "%"; }
function propTone(n) { return n > 0.004 ? "pos" : n < -0.004 ? "neg" : ""; }
function propStatusPill(s) { return `<span class="propSt propSt-${esc(s)}">${esc(T("prop.status." + s))}</span>`; }
function propReadOnly() { return !!viewingUserId; }

/* ---------- 规则值：数字 / "none" = 没有 / null = 不知道 ---------- */
function propRule(v, unit) {
  if (v === "none") return `<span class="propNone">${esc(T("prop.rule.none"))}</span>`;
  if (v === null || v === undefined || v === "") return `<span class="propUnknown">${esc(T("prop.rule.unknown"))}</span>`;
  if (typeof v !== "number") return esc(v);
  if (unit === "$") return propUsd(v);
  if (unit === "%") return v + "%";
  if (unit === "d") return esc(T("prop.rule.days", { n: v }));
  return esc(String(v));
}
function propDdType(t) { return PROP_DD_TYPES.includes(t) ? T("prop.dd." + t) : ""; }
function propBillingLabel(b) { return b === "monthly" ? T("prop.billing.monthly") : b === "one_time" ? T("prop.billing.one_time") : ""; }
/* 卡片上的几项重点 */
function propKeyRules(p) {
  const po = p.payout || {};
  // 免考号没有考核阶段：目标写「免考」，回撤看资金阶段的
  const instant = p.type === "instant";
  const ev = instant ? { target: "none", ...(p.funded || {}) } : (p.eval || {});
  const dd = propRule(ev.drawdown, "$") + (propDdType(ev.drawdownType) ? `<small>${esc(propDdType(ev.drawdownType))}</small>` : "");
  const range = (po.min === undefined && po.cap === undefined) ? propRule(null)
    : `${propRule(po.min, "$")} – ${propRule(po.cap, "$")}`;
  const qual = propRule(po.qualifyingDays, "d") + (typeof po.dayProfit === "number" ? `<small>${esc(T("prop.rule.dayProfitShort", { v: propUsd(po.dayProfit) }))}</small>` : "");
  return [
    [T("prop.rule.target"), instant ? `<span class="propNone">${esc(T("prop.plan.instant"))}</span>` : propRule(ev.target, "$")],
    [T("prop.rule.drawdown"), dd],
    [T("prop.rule.dll"), propRule(ev.dll, "$")],
    [T("prop.rule.consistency"), propRule(ev.consistency, "%")],
    [T("prop.rule.split"), propRule(po.split, "%")],
    [T("prop.rule.payoutRange"), range],
    [T("prop.rule.qualifying"), qual],
  ];
}
/* 展开后的其余规则；全是「不知道」的行不列 */
function propMoreRules(p) {
  const ev = p.eval || {}, fu = p.funded || {}, po = p.payout || {}, pr = p.price || {};
  const instant = p.type === "instant";
  const rows = [
    [T("prop.rule.activation"), pr.activation, "$"], [T("prop.rule.reset"), pr.reset, "$"],
    [T("prop.rule.minDays"), instant ? null : ev.minDays, "d"], [T("prop.rule.timeLimit"), instant ? null : ev.timeLimit, "d"],
    [T("prop.rule.evalContracts"), instant ? null : ev.maxContracts, ""],
    [T("prop.rule.fundedDrawdown"), instant ? null : fu.drawdown, "$", propDdType(fu.drawdownType)],
    [T("prop.rule.fundedDll"), instant ? null : fu.dll, "$"], [T("prop.rule.fundedConsistency"), fu.consistency, "%"],
    [T("prop.rule.fundedContracts"), fu.maxContracts, ""],
    [T("prop.rule.buffer"), po.buffer, "$"],
  ];
  return rows.filter((r) => r[1] !== null && r[1] !== undefined && r[1] !== "")
    .map(([k, v, unit, extra]) => [k, propRule(v, unit) + (extra ? `<small>${esc(extra)}</small>` : "")]);
}
/* 长句子的规则（出金条件、何时变静态、转 Live、价格说明）：一条一段，不挤进两列的格子里 */
function propLongRules(p) {
  const fu = p.funded || {}, po = p.payout || {}, pr = p.price || {};
  return [[T("prop.rule.frequency"), po.frequency], [T("prop.rule.staticAfter"), fu.staticAfter], [T("prop.rule.live"), po.live], [T("prop.rule.priceNote"), pr.note]]
    .filter(([, v]) => typeof v === "string" && v.trim());
}
function propLongRulesHtml(p) {
  const rows = propLongRules(p);
  return rows.length ? `<div class="propLong">${rows.map(([k, v]) => `<div><b>${esc(k)}</b>${esc(v)}</div>`).join("")}</div>` : "";
}
function propRulesDl(rows) {
  return `<dl class="propRules">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
}
function propPriceHtml(p) {
  const pr = p.price || {};
  const bill = propBillingLabel(pr.billing);
  const act = typeof pr.activation === "number" ? (pr.activation > 0 ? T("prop.plan.activation", { v: propUsd(pr.activation) }) : T("prop.plan.noActivation"))
    : pr.activation === "none" ? T("prop.plan.noActivation") : "";
  const orig = typeof pr.original === "number" && typeof pr.list === "number" && pr.original > pr.list ? `<s>${propUsd(pr.original)}</s>` : "";
  return `<div class="propPrice"><b>${propRule(pr.list, "$")}</b>${orig}${bill ? `<span>${esc(bill)}</span>` : ""}${act ? `<span class="propPriceAct">${esc(act)}</span>` : ""}
    ${pr.promoUntil ? `<span class="propPromo">${esc(T("prop.plan.promoUntil", { d: pr.promoUntil }))}</span>` : ""}</div>`;
}

/* ============================================================
   页面
   ============================================================ */
function renderProp() {
  const ro = propReadOnly();
  let html = propError ? `<div class="notice error" style="margin-bottom:16px;">${ICONS.alert}<span>${esc(propError)}</span></div>` : "";
  html += `<div class="propTop">
    <div class="modeToggle propSeg">${["overview", "accounts", "catalog"].map((v) => `<button class="modeBtn ${propView === v ? "active" : ""}" data-action="prop-view" data-view="${v}">${esc(T("prop.view." + v))}</button>`).join("")}</div>
    ${ro ? "" : `<button class="btn btn-primary" data-action="prop-new-account">${ICONS.plus} ${esc(T("prop.acc.new"))}</button>`}
  </div>`;
  if (propView === "accounts") html += renderPropAccounts();
  else if (propView === "catalog") html += renderPropCatalog();
  else html += renderPropOverview();
  if (propCompare.length && propView === "catalog") {
    html += `<div class="propCompareBar"><span>${esc(T("prop.compare.picked", { n: propCompare.length }))}</span>
      <button class="btn btn-primary" data-action="prop-open-compare">${esc(T("prop.compare.open"))}</button>
      <button class="btn" data-action="prop-clear-compare">${esc(T("prop.compare.clear"))}</button></div>`;
  }
  return html;
}

/* 筛选（公司 / 分组）后的账号和它们的流水 */
function propScoped() {
  const accounts = propAccounts.filter((a) => (!propFirmFilter || a.firm_name === propFirmFilter) && (!propGroupFilter || a.group_name === propGroupFilter));
  const ids = new Set(accounts.map((a) => a.id));
  return { accounts, entries: propEntries.filter((e) => ids.has(e.account_id)) };
}
function propFilterChips() {
  const firms = propFirmNames(), groups = propGroups();
  let html = "";
  if (firms.length > 1) {
    html += `<div class="chipGroup">${[["", T("prop.filter.allFirms")], ...firms.map((f) => [f, f])].map(([v, label]) =>
      `<button class="chip ${propFirmFilter === v ? "active" : ""}" data-action="prop-firm-filter" data-val="${esc(v)}">${esc(label)}</button>`).join("")}</div>`;
  }
  if (groups.length) {
    html += `<div class="chipGroup">${[["", T("prop.filter.allGroups")], ...groups.map((g) => [g, g])].map(([v, label]) =>
      `<button class="chip ${propGroupFilter === v ? "active" : ""}" data-action="prop-group-filter" data-val="${esc(v)}">${esc(label)}</button>`).join("")}</div>`;
  }
  return html ? `<div class="propFilters">${html}</div>` : "";
}
function propEmpty(msgKey) {
  return `<div class="emptyState propEmptyState">${ICONS.wallet}<div>${esc(T(msgKey))}</div>
    ${propReadOnly() ? "" : `<button class="btn btn-primary" data-action="prop-new-account">${ICONS.plus} ${esc(T("prop.acc.new"))}</button>`}</div>`;
}

/* ---------- 总览 ---------- */
function renderPropOverview() {
  if (!propAccounts.length) return propEmpty("prop.empty.accounts");
  const { accounts, entries } = propScoped();
  const s = propSum(entries);
  let html = propFilterChips();
  html += `<div class="statRow propStats">
    <div class="statBox"><div class="statLabel">${esc(T("prop.stat.spent"))}</div><div class="statValue">${propUsd(s.spent)}</div><div class="statSub">${esc(T("prop.stat.spentSub"))}${s.refund ? " · " + esc(T("prop.stat.refunded", { v: propUsd(s.refund) })) : ""}</div></div>
    <div class="statBox"><div class="statLabel">${esc(T("prop.stat.received"))}</div><div class="statValue">${propUsd(s.received)}</div><div class="statSub">${s.pending ? esc(T("prop.stat.pendingSub", { v: propUsd(s.pending) })) : esc(T("prop.stat.receivedSub"))}</div></div>
    <div class="statBox"><div class="statLabel">${esc(T("prop.stat.net"))}</div><div class="statValue ${propTone(s.net)}">${propUsd(s.net, true)}</div><div class="statSub">${esc(T("prop.stat.netSub"))}</div></div>
    <div class="statBox"><div class="statLabel">ROI</div><div class="statValue ${propTone(s.roi || 0)}">${propPct(s.roi)}</div><div class="statSub">${esc(T("prop.stat.roiSub"))}</div></div>
    <div class="statBox"><div class="statLabel">${esc(T("prop.stat.accounts"))}</div><div class="statValue">${accounts.filter(propIsActive).length}<span class="propStatOf"> / ${accounts.length}</span></div><div class="statSub">${esc(T("prop.stat.accountsSub"))}</div></div>
  </div>`;
  html += renderPropFunnel(accounts, entries);
  html += renderPropMonths(accounts, entries);
  html += renderPropByFirm(accounts, entries);
  return html;
}
function renderPropFunnel(accounts, entries) {
  const f = propFunnel(accounts, entries);
  const steps = [["bought", f.total], ["passed", f.passed], ["funded", f.funded], ["paid", f.paid]];
  return `<div class="calendarPanel propPanel">
    <div class="propPanelHead"><div class="sectionLabel propLabel">${esc(T("prop.funnel.title"))}</div></div>
    <div class="propFunnel">${steps.map(([k, n], i) => `<div class="propStep"><b>${n}</b><span>${esc(T("prop.funnel." + k))}</span>${i && steps[i - 1][1] ? `<small>${Math.round((n / steps[i - 1][1]) * 100)}%</small>` : ""}</div>`).join(`<div class="propStepArrow">›</div>`)}</div>
    <div class="propFunnelFoot">
      <div><span>${esc(T("prop.funnel.passRate"))}</span><b>${f.passRate === null ? "—" : f.passRate.toFixed(0) + "%"}</b><small>${esc(T("prop.funnel.passRateSub", { n: f.decided }))}</small></div>
      <div><span>${esc(T("prop.funnel.costPerFunded"))}</span><b>${propUsd(f.costPerFunded)}</b><small>${esc(T("prop.funnel.costPerFundedSub"))}</small></div>
    </div>
  </div>`;
}
function renderPropMonths(accounts, entries) {
  const months = propMonthly(entries, propYear);
  const year = months.reduce((a, m) => ({ net: a.net + m.net, n: a.n + m.n }), { net: 0, n: 0 });
  let html = `<div class="calendarPanel propPanel">
    <div class="propPanelHead"><div class="sectionLabel propLabel">${esc(T("prop.month.title"))}</div>
      <div class="propYearNav"><button class="tinyBtn" data-action="prop-year" data-d="-1">‹</button><div class="monthYear">${propYear}</div><button class="tinyBtn" data-action="prop-year" data-d="1">›</button></div></div>
    <div class="monthBar">`;
  months.forEach((m, i) => {
    html += `<button class="monthBarCell ${m.n ? propTone(m.net) || "neutral" : ""} ${propMonth === i + 1 ? "current" : ""}" data-action="prop-month" data-m="${i + 1}">
      <div class="monthBarLabel">${esc(new Date(2000, i, 1).toLocaleString(localeTag(), { month: "short" }))}</div>
      ${m.n ? `<div class="monthBarValue">${propUsd(m.net, true)}</div>` : ""}</button>`;
  });
  html += `<div class="monthBarCell ${year.n ? propTone(year.net) || "neutral" : ""}" style="cursor:default;"><div class="monthBarLabel">${esc(T("prop.month.year"))}</div>${year.n ? `<div class="monthBarValue">${propUsd(year.net, true)}</div>` : ""}</div></div>`;
  html += renderPropMonthDetail(accounts, entries);
  return html + `</div>`;
}
function renderPropMonthDetail(accounts, entries) {
  const key = propYear + "-" + String(propMonth).padStart(2, "0");
  const list = entries.filter((e) => propEntryMonth(e) === key).sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  const m = propMonthly(list, propYear)[propMonth - 1];
  const title = new Date(propYear, propMonth - 1, 1).toLocaleString(localeTag(), { year: "numeric", month: "long" });
  let html = `<div class="propMonthDetail"><div class="propMonthHead"><b>${esc(title)}</b>
    <span>${esc(T("prop.month.spent"))} <b>${propUsd(m.spent)}</b></span><span>${esc(T("prop.month.received"))} <b>${propUsd(m.received)}</b></span>
    <span>${esc(T("prop.month.net"))} <b class="${propTone(m.net)}">${propUsd(m.net, true)}</b></span></div>`;
  if (!list.length) return html + `<div class="propMuted">${esc(T("prop.month.empty"))}</div></div>`;
  html += `<div class="tableScroll"><table class="adminTable propTable"><thead><tr><th>${esc(T("prop.col.day"))}</th><th>${esc(T("prop.col.account"))}</th><th>${esc(T("prop.col.kind"))}</th><th class="num">${esc(T("prop.col.amount"))}</th></tr></thead><tbody>`;
  list.forEach((e) => {
    const acc = accounts.find((a) => a.id === e.account_id);
    html += `<tr><td>${esc(e.day)}</td><td><button class="propLink" data-action="prop-open-detail" data-id="${esc(e.account_id)}">${esc(acc ? propAccountTitle(acc) : "—")}</button></td>
      <td>${esc(T("prop.kind." + e.kind))}${e.pending ? ` <span class="propPendingTag">${esc(T("prop.entry.pending"))}</span>` : ""}</td>${propAmountCell(e)}</tr>`;
  });
  return html + `</tbody></table></div></div>`;
}
/* 一笔流水的金额：出金 / 退款是进账（+），其他是出账（−）；待到账的灰掉 */
function propAmountCell(e) {
  const income = e.kind === "payout" || e.kind === "refund";
  const v = propMoney(e.amount) * (income ? 1 : -1);
  return `<td class="num ${e.pending ? "propMuted" : propTone(v)}">${propUsd(v, true)}</td>`;
}
function renderPropByFirm(accounts, entries) {
  const firms = [...new Set(accounts.map((a) => a.firm_name || "—"))];
  if (firms.length < 2 && !propFirmFilter) return "";
  const rows = firms.map((name) => {
    const accs = accounts.filter((a) => (a.firm_name || "—") === name);
    const ids = new Set(accs.map((a) => a.id));
    return { name, n: accs.length, open: accs.some(propIsActive), s: propSum(entries.filter((e) => ids.has(e.account_id))), f: propFunnel(accs, entries) };
  }).sort((a, b) => b.s.net - a.s.net);
  return `<div class="calendarPanel propPanel"><div class="propPanelHead"><div class="sectionLabel propLabel">${esc(T("prop.firm.title"))}</div></div>
    <div class="tableScroll"><table class="adminTable propTable"><thead><tr><th>${esc(T("prop.col.firm"))}</th><th class="num">${esc(T("prop.col.accounts"))}</th><th class="num">${esc(T("prop.col.passRate"))}</th><th class="num">${esc(T("prop.stat.spent"))}</th><th class="num">${esc(T("prop.stat.received"))}</th><th class="num">${esc(T("prop.stat.net"))}</th><th class="num">ROI</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${esc(r.name)}</td><td class="num">${r.n}</td><td class="num">${r.f.passRate === null ? "—" : r.f.passRate.toFixed(0) + "%"}</td><td class="num">${propUsd(r.s.spent)}</td><td class="num">${propUsd(r.s.received)}</td><td class="num ${propTone(r.s.net)}">${propUsd(r.s.net, true)}</td>
      ${r.open && !r.s.received ? `<td class="num propMuted">${esc(T("prop.acc.inProgress"))}</td>` : `<td class="num ${propTone(r.s.roi || 0)}">${propPct(r.s.roi)}</td>`}</tr>`).join("")}
    </tbody></table></div></div>`;
}

/* ---------- 我的账号 ---------- */
function renderPropAccounts() {
  if (!propAccounts.length) return propEmpty("prop.empty.accounts");
  const { accounts } = propScoped();
  const counts = { active: accounts.filter(propIsActive).length, ended: accounts.filter((a) => !propIsActive(a)).length, all: accounts.length };
  const list = accounts.filter((a) => propStatusFilter === "all" || (propStatusFilter === "active") === propIsActive(a));
  let html = `<div class="propFilters"><div class="chipGroup">${["active", "ended", "all"].map((k) =>
    `<button class="chip ${propStatusFilter === k ? "active" : ""}" data-action="prop-status-filter" data-val="${k}">${esc(T("prop.filter." + k))} · ${counts[k]}</button>`).join("")}</div></div>`;
  html += propFilterChips();
  if (!list.length) return html + `<div class="emptyState">${esc(T("prop.empty.filtered"))}</div>`;
  return html + `<div class="propAccGrid">${list.map(propAccountCard).join("")}</div>`;
}
function propAccountCard(a) {
  const s = propSum(propEntriesOf(a.id));
  const sub = [a.nickname ? [a.firm_name, a.plan_name, propSizeLabel(a.size)].filter(Boolean).join(" · ") : "", a.group_name ? "# " + a.group_name : ""].filter(Boolean).join(" · ");
  // 还在跑、也还没出过金的账号不给 ROI：那不是亏光了，是还没结果
  const roi = propIsActive(a) && !s.received ? `<span class="propMuted">${esc(T("prop.acc.inProgress"))}</span>` : `<span class="${propTone(s.roi || 0)}">${propPct(s.roi)}</span>`;
  const last = (a.events || []).slice(-1)[0];
  return `<div class="propCard propAcc" data-action="prop-open-detail" data-id="${esc(a.id)}">
    <div class="propAccHead"><div class="propAccTitle">${esc(propAccountTitle(a))}</div>${propStatusPill(a.status)}</div>
    ${sub ? `<div class="propAccSub">${esc(sub)}</div>` : ""}
    <div class="propAccNums">
      <div><span>${esc(T("prop.stat.spent"))}</span><b>${propUsd(s.spent)}</b></div>
      <div><span>${esc(T("prop.stat.received"))}</span><b>${propUsd(s.received)}</b></div>
      <div><span>${esc(T("prop.stat.net"))}</span><b class="${propTone(s.net)}">${propUsd(s.net, true)}</b></div>
      <div><span>ROI</span><b>${roi}</b></div>
    </div>
    <div class="propAccFoot"><span>${esc(T("prop.acc.boughtOn", { d: a.bought_on }))}${last && last.day !== a.bought_on ? " · " + esc(T("prop.status." + last.to)) + " " + esc(last.day) : ""}</span>
      ${s.pending ? `<span class="propPendingTag">${esc(T("prop.stat.pendingSub", { v: propUsd(s.pending) }))}</span>` : ""}
      ${a.renewing ? `<span class="propRenewTag">${esc(T("prop.acc.renewingTag", { v: propUsd(propMoney(a.monthly_fee)) }))}</span>` : ""}</div>
  </div>`;
}

/* ---------- 公司计划 ---------- */
function renderPropCatalog() {
  const admin = currentProfile && currentProfile.role === "admin" && !viewingUserId;
  const info = propCatalogInfo ? T("prop.cat.updated", { d: localDateStr(propCatalogInfo.imported_at), f: propFirms.length, p: propPlans.length }) : "";
  let html = `<div class="propCatHead"><div class="propMuted">${esc(info || T("prop.cat.hint"))}</div>
    ${admin ? `<div class="propCatAdmin"><button class="btn" data-action="prop-open-import">${esc(T("prop.import.open"))}</button>${propFirms.length ? `<button class="btn" data-action="prop-export-catalog">${esc(T("prop.import.export"))}</button>` : ""}</div>` : ""}</div>`;
  if (!propFirms.length) return html + `<div class="emptyState propEmptyState">${ICONS.layers}<div>${esc(T(admin ? "prop.empty.catalogAdmin" : "prop.empty.catalog"))}</div></div>`;
  const visible = propPlans.filter((p) => propShowLegacy || p.status !== "legacy");
  const sizes = [...new Set(visible.filter((p) => !propCatalogFirm || p.firm === propCatalogFirm).map((p) => p.size).filter(Boolean))].sort((a, b) => a - b);
  html += `<div class="propFilters"><div class="chipGroup">${[["", T("prop.filter.allFirms")], ...propFirms.map((f) => [f.id, f.name])].map(([v, label]) =>
    `<button class="chip ${propCatalogFirm === v ? "active" : ""}" data-action="prop-cat-firm" data-val="${esc(v)}">${esc(label)}</button>`).join("")}</div>
    <div class="chipGroup">${[["", T("prop.filter.allSizes")], ...sizes.map((s) => [String(s), propSizeLabel(s)])].map(([v, label]) =>
    `<button class="chip ${propCatalogSize === v ? "active" : ""}" data-action="prop-cat-size" data-val="${esc(v)}">${esc(label)}</button>`).join("")}
    ${propPlans.some((p) => p.status === "legacy") ? `<button class="chip ${propShowLegacy ? "active" : ""}" data-action="prop-toggle-legacy">${esc(T("prop.cat.showLegacy"))}</button>` : ""}</div></div>`;
  propFirms.filter((f) => !propCatalogFirm || f.id === propCatalogFirm).forEach((f) => {
    const plans = visible.filter((p) => p.firm === f.id && (!propCatalogSize || String(p.size) === propCatalogSize));
    html += renderPropFirm(f, plans);
  });
  return html;
}
function propFirmLogo(f) {
  const initials = esc((f.name || "?").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?");
  return f.logo ? `<span class="propLogo"><img src="${esc(f.logo)}" alt="" loading="lazy"></span>` : `<span class="propLogo">${initials}</span>`;
}
function renderPropFirm(f, plans) {
  const series = [];
  plans.forEach((p) => { if (!series.includes(p.series)) series.push(p.series); });
  const faq = Array.isArray(f.faq) ? f.faq : [];
  let html = `<div class="calendarPanel propPanel propFirm">
    <div class="propFirmHead">${propFirmLogo(f)}<div class="propFirmName"><b>${esc(f.name)}</b>
      <span>${esc(T("prop.cat.planCount", { n: plans.length }))}${f.website ? ` · <a href="${esc(f.website)}" target="_blank" rel="noopener">${esc(T("prop.cat.website"))}</a>` : ""}${f.source ? ` · <a href="${esc(f.source)}" target="_blank" rel="noopener">${esc(T("prop.cat.sourcePage"))}</a>` : ""}</span></div>
      ${f.review ? `<span class="propReview">${esc(f.review)}</span>` : ""}</div>
    ${Array.isArray(f.platforms) && f.platforms.length ? `<div class="propMuted">${esc(T("prop.cat.platforms", { v: listJoin(f.platforms) }))}</div>` : ""}
    ${f.notes ? `<div class="propNotes">${esc(f.notes)}</div>` : ""}`;
  if (!plans.length) html += `<div class="propMuted">${esc(T("prop.empty.filtered"))}</div>`;
  series.forEach((sr) => {
    html += `<div class="propSeries"><div class="propSeriesName">${esc(sr || T("prop.cat.noSeries"))}</div>
      <div class="propPlanGrid">${plans.filter((p) => p.series === sr).map(propPlanCard).join("")}</div></div>`;
  });
  if (faq.length) {
    html += `<details class="propFaq"><summary>${esc(T("prop.cat.faq", { n: faq.length }))}</summary>${faq.map((q) => `<div class="propFaqItem">
      <div class="propFaqTopic">${esc(q.topic || "")}${q.status === "unclear" ? ` <span class="propUnknown">${esc(T("prop.cat.unclear"))}</span>` : ""}</div>
      <div>${esc(q.answer || "")}</div>${q.source ? `<a href="${esc(q.source)}" target="_blank" rel="noopener">${esc(T("prop.cat.source"))}</a>` : ""}</div>`).join("")}</details>`;
  }
  return html + `</div>`;
}
function propPlanCard(p) {
  const picked = propCompare.includes(p.id);
  const more = propMoreRules(p);
  const opts = Array.isArray(p.options) ? p.options : [];
  const sources = Array.isArray(p.sources) ? p.sources : [];
  const hasMore = more.length || propLongRules(p).length || opts.length || p.notes || sources.length;
  return `<div class="propCard propPlan ${picked ? "picked" : ""}">
    <div class="propPlanHead"><div class="propPlanSize">${esc(propSizeLabel(p.size) || p.series)}</div><div class="propPlanTags">
      ${p.type === "instant" ? `<span class="propSt propSt-funded">${esc(T("prop.plan.instant"))}</span>` : ""}
      ${p.status === "legacy" ? `<span class="propSt propSt-closed">${esc(T("prop.cat.legacy"))}</span>` : ""}</div></div>
    ${propPriceHtml(p)}
    ${propRulesDl(propKeyRules(p))}
    ${hasMore ? `<details class="propMore"><summary>${esc(T("prop.cat.more"))}</summary>
      ${more.length ? propRulesDl(more) : ""}${propLongRulesHtml(p)}
      ${opts.length ? `<div class="propOpts"><div class="propMiniLabel">${esc(T("prop.cat.options"))}</div>${opts.map((o) => `<div>${esc(o.name || "")}${typeof o.price === "number" ? " · " + propUsd(o.price) : ""}${o.note ? ` <span class="propMuted">${esc(o.note)}</span>` : ""}</div>`).join("")}</div>` : ""}
      ${p.notes ? `<div class="propNotes">${esc(p.notes)}</div>` : ""}
      ${sources.length ? `<div class="propSources">${sources.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(T("prop.cat.source"))} ${i + 1}</a>`).join("")}</div>` : ""}
    </details>` : ""}
    <div class="propPlanFoot">
      ${p.checkedAt ? `<span class="propMuted">${esc(T("prop.cat.checked", { d: p.checkedAt }))}</span>` : ""}
      <div><button class="btn btn-sm ${picked ? "active" : ""}" data-action="prop-toggle-compare" data-id="${esc(p.id)}">${esc(T(picked ? "prop.compare.picked1" : "prop.compare.add"))}</button>
      ${propReadOnly() ? "" : `<button class="btn btn-sm btn-primary" data-action="prop-buy-plan" data-id="${esc(p.id)}">${esc(T("prop.cat.buy"))}</button>`}</div>
    </div>
  </div>`;
}

/* ============================================================
   弹窗
   ============================================================ */
function propRenderModal() { renderSecondaryModals(true); }
function propCloseModal() { propModal = null; propRenderModal(); render(); }
function propModalHtml() {
  const m = propModal;
  if (!m) return "";
  let title = "", body = "", foot = "", wide = false;
  if (m.type === "account") ({ title, body, foot } = propAccountForm(m));
  else if (m.type === "entry") ({ title, body, foot } = propEntryForm(m));
  else if (m.type === "status") ({ title, body, foot } = propStatusForm(m));
  else if (m.type === "detail") { ({ title, body, foot } = propDetail(m)); wide = true; }
  else if (m.type === "import") { ({ title, body, foot } = propImportForm(m)); wide = true; }
  else if (m.type === "compare") { ({ title, body, foot } = propCompareView()); wide = true; }
  return `<div class="overlay" data-action="prop-dismiss-overlay">
    <div class="modal propModal" style="max-width:${wide ? 860 : 480}px;">
      <div class="modalHead"><div class="display" style="font-size:16px;font-weight:600;">${title}</div><button class="iconBtn" data-action="prop-close-modal">${ICONS.x}</button></div>
      <div class="modalBody">${m.error ? `<div class="notice error" style="margin-bottom:12px;">${ICONS.alert}<span>${esc(m.error)}</span></div>` : ""}${body}</div>
      ${foot ? `<div class="modalFoot">${foot}</div>` : ""}
    </div></div>`;
}
/* 表单控件：data-prop-field 的值随输入写进 propModal.draft；data-prop-rerender 的变了要重画（换公司、换收费方式这类） */
function propInput(field, value, attrs) {
  return `<input class="input" data-prop-field="${field}" value="${esc(value === null || value === undefined ? "" : value)}" ${attrs || ""} />`;
}
function propField(label, control, hint) {
  return `<div class="field"><div class="fieldLabel">${esc(label)}</div>${control}${hint ? `<div class="propHint">${esc(hint)}</div>` : ""}</div>`;
}
function propSelect(field, value, options, rerender) {
  return `<select class="input" data-prop-field="${field}" ${rerender ? "data-prop-rerender" : ""}>${options.map(([v, label]) => `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(label)}</option>`).join("")}</select>`;
}
function propCheck(field, checked, label, rerender) {
  return `<label class="propCheck"><input type="checkbox" data-prop-field="${field}" ${checked ? "checked" : ""} ${rerender ? "data-prop-rerender" : ""} /> ${esc(label)}</label>`;
}
function propFootButtons(saveAction, saveLabel, back) {
  return `<button class="btn" data-action="${back ? "prop-modal-back" : "prop-close-modal"}">${esc(T(back ? "prop.back" : "common.cancel"))}</button>
    <button class="btn btn-primary" data-action="${saveAction}" ${propModal.busy ? "disabled" : ""}>${esc(propModal.busy ? T("common.saving") : saveLabel || T("common.save"))}</button>`;
}

/* ---------- 记录购买 ---------- */
function propPlanOptionLabel(p) {
  const price = p.price && typeof p.price.list === "number" ? " · " + propUsd(p.price.list) + (p.price.billing === "monthly" ? T("prop.billing.perMonth") : "") : "";
  return [p.series, propSizeLabel(p.size)].filter(Boolean).join(" · ") + price + (p.status === "legacy" ? " · " + T("prop.cat.legacy") : "");
}
function propNewAccountDraft(planId) {
  const plan = planId ? propFindPlan(planId) : null;
  const firmId = plan ? plan.firm : (propFirms[0] ? propFirms[0].id : "__custom");
  const d = { firmSel: firmId, planSel: "__custom", firm_name: "", plan_name: "", size: "", nickname: "", group_name: "",
    bought_on: todayStr(), amount: "", billing: "one_time", monthly_fee: "", renewing: true, status: "eval", note: "" };
  propPickPlan(d, plan ? plan.id : (propPlans.find((p) => p.firm === firmId && p.status !== "legacy") || {}).id);
  return d;
}
/* 选中一个目录里的计划：价格、收费方式、规模跟着带过来（用户还可以改实付金额） */
function propPickPlan(d, planId) {
  const plan = planId ? propFindPlan(planId) : null;
  d.planSel = plan ? plan.id : "__custom";
  if (!plan) return;
  const pr = plan.price || {};
  d.billing = pr.billing === "monthly" ? "monthly" : "one_time";
  d.amount = typeof pr.list === "number" ? pr.list : "";
  d.monthly_fee = d.billing === "monthly" && typeof pr.list === "number" ? pr.list : "";
  d.status = plan.type === "instant" ? "funded" : "eval";
}
function propAccountForm(m) {
  const d = m.draft;
  const firmOpts = [...propFirms.map((f) => [f.id, f.name]), ["__custom", T("prop.form.customFirm")]];
  const plans = propPlans.filter((p) => p.firm === d.firmSel);
  let body = propField(T("prop.form.firm"), propSelect("firmSel", d.firmSel, firmOpts, true));
  if (d.firmSel === "__custom") body += propField(T("prop.form.firmName"), propInput("firm_name", d.firm_name, `placeholder="Lucid / Topstep …" maxlength="60"`));
  else body += propField(T("prop.form.plan"), propSelect("planSel", d.planSel, [...plans.map((p) => [p.id, propPlanOptionLabel(p)]), ["__custom", T("prop.form.customPlan")]], true));
  if (d.firmSel === "__custom" || d.planSel === "__custom") {
    body += `<div class="propRow">${propField(T("prop.form.planName"), propInput("plan_name", d.plan_name, `placeholder="Flex / Combine …" maxlength="60"`))}
      ${propField(T("prop.form.size"), propInput("size", d.size, `type="number" min="0" step="1000" placeholder="50000"`))}</div>`;
  }
  body += `<div class="propRow">${propField(T("prop.form.nickname"), propInput("nickname", d.nickname, `maxlength="60" placeholder="${esc(T("prop.form.optional"))}"`))}
    ${propField(T("prop.form.group"), propInput("group_name", d.group_name, `maxlength="40" list="propGroupList" placeholder="${esc(T("prop.form.optional"))}"`), T("prop.form.groupHint"))}</div>
    <datalist id="propGroupList">${propGroups().map((g) => `<option value="${esc(g)}">`).join("")}</datalist>`;
  body += `<div class="propRow">${propField(T("prop.form.boughtOn"), propInput("bought_on", d.bought_on, `type="date"`))}
    ${propField(T("prop.form.paid"), propInput("amount", d.amount, `type="number" min="0" step="0.01" placeholder="0"`), T("prop.form.paidHint"))}</div>`;
  body += `<div class="propRow">${propField(T("prop.form.billing"), propSelect("billing", d.billing, [["one_time", T("prop.billing.one_time")], ["monthly", T("prop.billing.monthly")]], true))}
    ${propField(T("prop.form.startStatus"), propSelect("status", d.status, [["eval", T("prop.status.eval")], ["passed", T("prop.status.passed")], ["funded", T("prop.status.funded")]]))}</div>`;
  if (d.billing === "monthly") {
    body += `<div class="propRow">${propField(T("prop.form.monthlyFee"), propInput("monthly_fee", d.monthly_fee, `type="number" min="0" step="0.01"`))}
      <div class="field propCheckField">${propCheck("renewing", d.renewing, T("prop.form.renewing"))}<div class="propHint">${esc(T("prop.form.renewingHint"))}</div></div></div>`;
  }
  body += propField(T("prop.form.note"), `<textarea class="input" data-prop-field="note" rows="2" maxlength="500">${esc(d.note)}</textarea>`);
  return { title: esc(T("prop.acc.new")), body, foot: propFootButtons("prop-save-account") };
}
async function propSaveNewAccount() {
  const d = propModal.draft;
  const firm = d.firmSel === "__custom" ? null : propFindFirm(d.firmSel);
  const plan = firm && d.planSel !== "__custom" ? propFindPlan(d.planSel) : null;
  const firmName = firm ? firm.name : String(d.firm_name || "").trim();
  if (!firmName) { propModal.error = T("prop.form.needFirm"); propRenderModal(); return; }
  if (!d.bought_on) { propModal.error = T("prop.form.needDate"); propRenderModal(); return; }
  const monthly = d.billing === "monthly";
  const acc = {
    id: propNewId("pa"), firm_id: firm ? firm.id : null, firm_name: firmName,
    plan_id: plan ? plan.id : null, plan_name: plan ? plan.series : String(d.plan_name || "").trim(),
    size: plan ? plan.size : (Number(d.size) || null), nickname: String(d.nickname || "").trim(), group_name: String(d.group_name || "").trim(),
    status: d.status, events: [{ to: d.status, day: d.bought_on }], bought_on: d.bought_on, billing: d.billing,
    monthly_fee: monthly ? propMoney(d.monthly_fee) : null, renewing: monthly && !!d.renewing && d.status === "eval", renewed_through: null,
    plan_snapshot: plan ? JSON.parse(JSON.stringify(plan)) : null, note: String(d.note || "").trim(),
  };
  propModal.busy = true; propRenderModal();
  let ok = await propSaveAccount(acc);
  if (ok && propMoney(d.amount) > 0) ok = await propSaveEntries([{ account_id: acc.id, kind: "purchase", amount: d.amount, day: d.bought_on }]);
  // 买的时候已经过了几个月（补记以前的账号）：这期间的月费一次补上，用户不对再删
  if (ok) await propApplyRenewals();
  if (!ok) { propModal.busy = false; propModal.error = propError; propRenderModal(); return; }
  propError = null;
  propModal = { type: "detail", id: acc.id };
  propRenderModal(); render();
}

/* ---------- 记一笔 ---------- */
function propEntryForm(m) {
  const d = m.draft;
  const acc = propAccounts.find((a) => a.id === m.accountId);
  let body = `<div class="propMuted" style="margin-bottom:12px;">${esc(acc ? propAccountTitle(acc) : "")}</div>`;
  body += `<div class="propRow">${propField(T("prop.col.kind"), propSelect("kind", d.kind, PROP_ENTRY_KINDS.map((k) => [k, T("prop.kind." + k)]), true))}
    ${propField(T("prop.col.amount") + " (USD)", propInput("amount", d.amount, `type="number" min="0" step="0.01" placeholder="0"`), d.kind === "payout" ? T("prop.entry.payoutHint") : "")}</div>`;
  body += `<div class="propRow">${propField(T("prop.col.day"), propInput("day", d.day, `type="date"`))}
    ${d.kind === "payout" ? `<div class="field propCheckField">${propCheck("pending", d.pending, T("prop.entry.pendingLabel"))}<div class="propHint">${esc(T("prop.entry.pendingHint"))}</div></div>` : "<div></div>"}</div>`;
  body += propField(T("prop.form.note"), propInput("note", d.note, `maxlength="200"`));
  return { title: esc(T(d.id ? "prop.entry.edit" : "prop.entry.new")), body, foot: propFootButtons("prop-save-entry", null, !!m.back) };
}
async function propSaveEntry() {
  const m = propModal, d = m.draft;
  if (!(propMoney(d.amount) > 0)) { m.error = T("prop.entry.needAmount"); propRenderModal(); return; }
  if (!d.day) { m.error = T("prop.form.needDate"); propRenderModal(); return; }
  m.busy = true; propRenderModal();
  const ok = await propSaveEntries([{ id: d.id, account_id: m.accountId, kind: d.kind, amount: d.amount, day: d.day, pending: d.pending, note: d.note }]);
  if (!ok) { m.busy = false; m.error = propError; propRenderModal(); return; }
  propError = null;
  propModal = m.back || null;
  propRenderModal(); render();
}

/* ---------- 改状态 ---------- */
const PROP_FEE_FOR = { activate: "activation", reset: "reset" };
/* 每个状态下能走的下一步：[按钮 key, 去哪个状态] */
function propNextSteps(status) {
  if (status === "eval") return [["pass", "passed"], ["fundedDirect", "funded"], ["fail", "failed"], ["reset", "eval"]];
  if (status === "passed") return [["activate", "funded"], ["fail", "failed"], ["close", "closed"]];
  if (status === "funded") return [["blow", "blown"], ["close", "closed"]];
  if (status === "failed") return [["reset", "eval"], ["close", "closed"]];
  return [["reopen", "funded"]];
}
function propStatusForm(m) {
  const d = m.draft;
  const acc = propAccounts.find((a) => a.id === m.accountId);
  const feeKind = PROP_FEE_FOR[m.step];
  let body = `<div class="propMuted" style="margin-bottom:12px;">${esc(acc ? propAccountTitle(acc) : "")} · ${acc ? propStatusPill(acc.status) : ""} → ${propStatusPill(m.to)}</div>`;
  body += `<div class="propRow">${propField(T("prop.col.day"), propInput("day", d.day, `type="date"`))}
    ${feeKind ? propField(T("prop.kind." + feeKind) + " (USD)", propInput("fee", d.fee, `type="number" min="0" step="0.01" placeholder="0"`), T("prop.step.feeHint")) : "<div></div>"}</div>`;
  if (acc && acc.status === "eval" && m.to !== "eval" && acc.renewing) body += `<div class="propHint">${esc(T("prop.step.stopRenew"))}</div>`;
  return { title: esc(T("prop.step." + m.step)), body, foot: propFootButtons("prop-save-status", T("prop.step.confirm"), !!m.back) };
}
async function propSaveStatus() {
  const m = propModal, d = m.draft;
  const acc = propAccounts.find((a) => a.id === m.accountId);
  if (!acc) return;
  if (!d.day) { m.error = T("prop.form.needDate"); propRenderModal(); return; }
  m.busy = true; propRenderModal();
  const ok = await propChangeStatus(acc, m.to, d.day, d.fee, PROP_FEE_FOR[m.step] || null);
  if (!ok) { m.busy = false; m.error = propError; propRenderModal(); return; }
  propError = null;
  propModal = m.back || null;
  propRenderModal(); render();
}

/* ---------- 账号详情 ---------- */
function propDetail(m) {
  const acc = propAccounts.find((a) => a.id === m.id);
  if (!acc) return { title: "", body: `<div class="propMuted">${esc(T("prop.acc.gone"))}</div>`, foot: "" };
  const ro = propReadOnly();
  const list = propEntriesOf(acc.id).slice().sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  const s = propSum(list);
  const title = `${esc(propAccountTitle(acc))} ${propStatusPill(acc.status)}`;
  let body = `<div class="propAccSub" style="margin-bottom:12px;">${esc([acc.firm_name, acc.plan_name, propSizeLabel(acc.size)].filter(Boolean).join(" · "))}${acc.group_name ? " · # " + esc(acc.group_name) : ""}</div>`;
  body += `<div class="propAccNums propDetailNums">
    <div><span>${esc(T("prop.stat.spent"))}</span><b>${propUsd(s.spent)}</b></div>
    <div><span>${esc(T("prop.stat.received"))}</span><b>${propUsd(s.received)}</b></div>
    <div><span>${esc(T("prop.entry.pending"))}</span><b>${propUsd(s.pending)}</b></div>
    <div><span>${esc(T("prop.stat.net"))}</span><b class="${propTone(s.net)}">${propUsd(s.net, true)}</b></div>
    <div><span>ROI</span><b class="${propTone(s.roi || 0)}">${propIsActive(acc) && !s.received ? esc(T("prop.acc.inProgress")) : propPct(s.roi)}</b></div></div>`;
  if (!ro) {
    body += `<div class="propActions">
      <button class="btn btn-primary btn-sm" data-action="prop-open-entry" data-id="${esc(acc.id)}" data-kind="${acc.status === "funded" ? "payout" : "other"}">${ICONS.plus} ${esc(T(acc.status === "funded" ? "prop.acc.addPayout" : "prop.acc.addEntry"))}</button>
      ${propNextSteps(acc.status).map(([step, to]) => `<button class="btn btn-sm" data-action="prop-open-status" data-id="${esc(acc.id)}" data-step="${step}" data-to="${to}">${esc(T("prop.step." + step))}</button>`).join("")}
    </div>`;
  }
  if (acc.renewing) body += `<div class="propHint" style="margin-bottom:10px;">${esc(T("prop.acc.renewingLine", { v: propUsd(propMoney(acc.monthly_fee)), d: propNextRenewal(acc) }))}</div>`;

  body += `<div class="propMiniLabel">${esc(T("prop.acc.entries"))}</div>`;
  if (!list.length) body += `<div class="propMuted" style="margin-bottom:14px;">${esc(T("prop.acc.noEntries"))}</div>`;
  else {
    body += `<div class="tableScroll" style="margin-bottom:14px;"><table class="adminTable propTable"><thead><tr><th>${esc(T("prop.col.day"))}</th><th>${esc(T("prop.col.kind"))}</th><th class="num">${esc(T("prop.col.amount"))}</th><th>${esc(T("prop.form.note"))}</th>${ro ? "" : "<th></th>"}</tr></thead><tbody>
    ${list.map((e) => `<tr><td>${esc(e.day)}</td><td>${esc(T("prop.kind." + e.kind))}${e.pending ? ` <span class="propPendingTag">${esc(T("prop.entry.pending"))}</span>` : ""}</td>${propAmountCell(e)}<td class="propNoteCell">${esc(e.note || "")}</td>
      ${ro ? "" : `<td class="propRowActs">${e.pending ? `<button class="tinyBtn propAct" data-action="prop-mark-received" data-id="${esc(e.id)}">${esc(T("prop.entry.markReceived"))}</button>` : ""}
        <button class="tinyBtn propAct" data-action="prop-edit-entry" data-id="${esc(e.id)}">${ICONS.pencil}</button>
        ${m.confirmEntry === e.id ? `<button class="tinyBtn propAct neg" data-action="prop-delete-entry" data-id="${esc(e.id)}">${esc(T("common.confirmDelete"))}</button>` : `<button class="tinyBtn propAct" data-action="prop-ask-delete-entry" data-id="${esc(e.id)}">${ICONS.trash}</button>`}</td>`}</tr>`).join("")}
    </tbody></table></div>`;
  }
  const events = acc.events || [];
  if (events.length) {
    body += `<div class="propMiniLabel">${esc(T("prop.acc.timeline"))}</div><div class="propTimeline">${events.map((ev) => `<div><span>${esc(ev.day)}</span>${propStatusPill(ev.to)}</div>`).join("")}</div>`;
  }
  if (acc.plan_snapshot) {
    const p = acc.plan_snapshot;
    body += `<details class="propMore propSnapshot"><summary>${esc(T("prop.acc.snapshot", { d: p.checkedAt || acc.bought_on }))}</summary>${propPriceHtml(p)}${propRulesDl([...propKeyRules(p), ...propMoreRules(p)])}${propLongRulesHtml(p)}${p.notes ? `<div class="propNotes">${esc(p.notes)}</div>` : ""}</details>`;
  }
  if (acc.note) body += `<div class="propNotes">${esc(acc.note)}</div>`;
  if (!ro) body += propEditBlock(m, acc);
  return { title, body, foot: "" };
}
/* 详情底部：改账号信息（昵称、分组、月费、续费、备注、手动改状态）、删除 */
function propEditBlock(m, acc) {
  if (!m.edit) {
    return `<div class="propEditToggle"><button class="btn btn-sm" data-action="prop-edit-account">${ICONS.pencil} ${esc(T("prop.acc.edit"))}</button></div>`;
  }
  const d = m.draft;
  let html = `<div class="propEditBox"><div class="propRow">${propField(T("prop.form.nickname"), propInput("nickname", d.nickname, `maxlength="60"`))}
    ${propField(T("prop.form.group"), propInput("group_name", d.group_name, `maxlength="40" list="propGroupList"`))}</div>
    <datalist id="propGroupList">${propGroups().map((g) => `<option value="${esc(g)}">`).join("")}</datalist>
    <div class="propRow">${propField(T("prop.form.firmName"), propInput("firm_name", d.firm_name, `maxlength="60"`))}
    ${propField(T("prop.form.planName"), propInput("plan_name", d.plan_name, `maxlength="60"`))}</div>
    <div class="propRow">${propField(T("prop.form.size"), propInput("size", d.size, `type="number" min="0" step="1000"`))}
    ${propField(T("prop.form.boughtOn"), propInput("bought_on", d.bought_on, `type="date"`))}</div>
    <div class="propRow">${propField(T("prop.form.billing"), propSelect("billing", d.billing, [["one_time", T("prop.billing.one_time")], ["monthly", T("prop.billing.monthly")]], true))}
    ${propField(T("prop.form.statusFix"), propSelect("status", d.status, PROP_STATUSES.map((s) => [s, T("prop.status." + s)])), T("prop.form.statusFixHint"))}</div>`;
  if (d.billing === "monthly") {
    html += `<div class="propRow">${propField(T("prop.form.monthlyFee"), propInput("monthly_fee", d.monthly_fee, `type="number" min="0" step="0.01"`))}
      <div class="field propCheckField">${propCheck("renewing", d.renewing, T("prop.form.renewing"))}<div class="propHint">${esc(T("prop.form.renewingEditHint"))}</div></div></div>`;
  }
  html += propField(T("prop.form.note"), `<textarea class="input" data-prop-field="note" rows="2" maxlength="500">${esc(d.note)}</textarea>`);
  html += `<div class="propEditFoot">
    ${m.confirmDelete ? `<button class="btn btn-danger" data-action="prop-delete-account">${esc(T("prop.acc.deleteConfirm"))}</button>` : `<button class="btn" data-action="prop-ask-delete-account">${ICONS.trash} ${esc(T("prop.acc.delete"))}</button>`}
    <span style="flex:1"></span>
    <button class="btn" data-action="prop-cancel-edit">${esc(T("common.cancel"))}</button>
    <button class="btn btn-primary" data-action="prop-save-edit" ${m.busy ? "disabled" : ""}>${esc(T(m.busy ? "common.saving" : "common.save"))}</button></div></div>`;
  return html;
}
async function propSaveEdit() {
  const m = propModal, d = m.draft;
  const acc = propAccounts.find((a) => a.id === m.id);
  if (!acc) return;
  if (!String(d.firm_name || "").trim()) { m.error = T("prop.form.needFirm"); propRenderModal(); return; }
  const monthly = d.billing === "monthly";
  const renewing = monthly && !!d.renewing;
  const next = { ...acc, nickname: String(d.nickname || "").trim(), group_name: String(d.group_name || "").trim(),
    firm_name: String(d.firm_name).trim(), plan_name: String(d.plan_name || "").trim(), size: Number(d.size) || null,
    bought_on: d.bought_on || acc.bought_on, billing: d.billing, monthly_fee: monthly ? propMoney(d.monthly_fee) : null,
    renewing, note: String(d.note || "").trim() };
  // 刚打开续费：从今天起算，不补记关着的那段
  if (renewing && !acc.renewing) next.renewed_through = todayStr();
  if (d.status !== acc.status) { next.status = d.status; next.events = [...(acc.events || []), { to: d.status, day: todayStr() }]; }
  m.busy = true; propRenderModal();
  const ok = await propSaveAccount(next);
  m.busy = false;
  if (!ok) { m.error = propError; propRenderModal(); return; }
  propError = null; m.error = null; m.edit = false; m.draft = null;
  propRenderModal(); render();
}

/* ---------- 对比 ---------- */
function propCompareView() {
  const plans = propCompare.map(propFindPlan).filter(Boolean);
  const g0 = (p, path) => path.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), p);
  // 免考号：目标是「免考」，考核回撤 / 类型取资金阶段的，跟卡片上一致
  const g = (p, path) => {
    if (p.type !== "instant" || !path.startsWith("eval.")) return g0(p, path);
    if (path === "eval.target") return "none";
    return ["eval.drawdown", "eval.drawdownType", "eval.dll"].includes(path) ? g0(p, "funded." + path.slice(5)) : undefined;
  };
  const ratio = (p) => {
    const t = g(p, "eval.target"), dd = g(p, "eval.drawdown");
    return typeof t === "number" && typeof dd === "number" && dd > 0 ? (t / dd).toFixed(2) : "—";
  };
  const per1k = (p) => {
    const price = g(p, "price.list"), dd = g(p, "eval.drawdown");
    return typeof price === "number" && typeof dd === "number" && dd > 0 ? propUsd(price / (dd / 1000)) : "—";
  };
  const rows = [
    [T("prop.col.firm"), (p) => esc((propFindFirm(p.firm) || {}).name || p.firm)],
    [T("prop.cmp.series"), (p) => esc(p.series || "")],
    [T("prop.form.size"), (p) => esc(propSizeLabel(p.size))],
    [T("prop.cmp.price"), (p) => propRule(g(p, "price.list"), "$")],
    [T("prop.form.billing"), (p) => esc(propBillingLabel(g(p, "price.billing")) || "—")],
    [T("prop.cmp.type"), (p) => esc(T(p.type === "instant" ? "prop.plan.instant" : "prop.plan.evaluation"))],
    [T("prop.cmp.original"), (p) => propRule(g(p, "price.original"), "$")],
    [T("prop.rule.activation"), (p) => propRule(g(p, "price.activation"), "$")],
    [T("prop.rule.reset"), (p) => propRule(g(p, "price.reset"), "$")],
    [T("prop.rule.target"), (p) => propRule(g(p, "eval.target"), "$")],
    [T("prop.rule.drawdown"), (p) => propRule(g(p, "eval.drawdown"), "$")],
    [T("prop.cmp.ddType"), (p) => esc(propDdType(g(p, "eval.drawdownType")) || "—")],
    [T("prop.cmp.ratio"), ratio],
    [T("prop.cmp.per1k"), per1k],
    [T("prop.rule.dll"), (p) => propRule(g(p, "eval.dll"), "$")],
    [T("prop.rule.consistency"), (p) => propRule(g(p, "eval.consistency"), "%")],
    [T("prop.rule.minDays"), (p) => propRule(g(p, "eval.minDays"), "d")],
    [T("prop.rule.timeLimit"), (p) => propRule(g(p, "eval.timeLimit"), "d")],
    [T("prop.rule.fundedDrawdown"), (p) => propRule(g(p, "funded.drawdown"), "$")],
    [T("prop.rule.fundedDll"), (p) => propRule(g(p, "funded.dll"), "$")],
    [T("prop.rule.fundedConsistency"), (p) => propRule(g(p, "funded.consistency"), "%")],
    [T("prop.rule.split"), (p) => propRule(g(p, "payout.split"), "%")],
    [T("prop.cmp.payoutMin"), (p) => propRule(g(p, "payout.min"), "$")],
    [T("prop.cmp.payoutCap"), (p) => propRule(g(p, "payout.cap"), "$")],
    [T("prop.rule.qualifying"), (p) => propRule(g(p, "payout.qualifyingDays"), "d")],
    [T("prop.cmp.dayProfit"), (p) => propRule(g(p, "payout.dayProfit"), "$")],
    [T("prop.rule.buffer"), (p) => propRule(g(p, "payout.buffer"), "$")],
    [T("prop.rule.frequency"), (p) => propRule(g(p, "payout.frequency"))],
    [T("prop.cmp.checked"), (p) => esc(p.checkedAt || "—")],
  ];
  const body = !plans.length ? `<div class="propMuted">${esc(T("prop.compare.none"))}</div>`
    : `<div class="tableScroll"><table class="adminTable propTable propCmp"><tbody>${rows.map(([label, fn]) => `<tr><th>${esc(label)}</th>${plans.map((p) => `<td>${fn(p)}</td>`).join("")}</tr>`).join("")}
      <tr><th></th>${plans.map((p) => `<td><button class="tinyBtn propAct" data-action="prop-toggle-compare" data-id="${esc(p.id)}">${esc(T("prop.compare.remove"))}</button></td>`).join("")}</tr></tbody></table></div>`;
  return { title: esc(T("prop.compare.title")), body, foot: "" };
}

/* ---------- 管理员：导入目录 ---------- */
function propImportForm(m) {
  const c = m.check;
  let body = `<div class="propHint" style="margin-bottom:10px;">${esc(T("prop.import.hint"))}</div>
    <div class="propImportPick"><label class="btn btn-sm">${esc(T("prop.import.pickFile"))}<input type="file" accept=".json,application/json" data-prop-file hidden></label>
    <span class="propMuted">${esc(m.fileName || "")}</span></div>
    <textarea class="input mono propImportText" data-prop-field="text" rows="12" placeholder='{ "firms": [...], "plans": [...] }'>${esc(m.draft.text)}</textarea>`;
  if (c) {
    if (c.errors.length) {
      body += `<div class="notice error propImportMsgs">${ICONS.alert}<div><b>${esc(T("prop.import.errors", { n: c.errors.length }))}</b><ul>${c.errors.slice(0, 30).map((x) => `<li>${esc(x)}</li>`).join("")}${c.errors.length > 30 ? `<li>…</li>` : ""}</ul></div></div>`;
    } else {
      body += `<div class="notice propImportMsgs">${ICONS.check}<div><b>${esc(T("prop.import.ok", { f: c.catalog.firms.length, p: c.catalog.plans.length }))}</b>
        <div>${esc(T("prop.import.diff", { a: c.diff.added.length, c: c.diff.changed.length, r: c.diff.removed.length }))}</div>
        ${c.diff.removed.length ? `<div class="propMuted">${esc(T("prop.import.removedList", { ids: c.diff.removed.slice(0, 12).join(", ") + (c.diff.removed.length > 12 ? " …" : "") }))}</div>` : ""}
        ${c.warnings.length ? `<details><summary>${esc(T("prop.import.warnings", { n: c.warnings.length }))}</summary><ul>${c.warnings.slice(0, 40).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}</div></div>`;
    }
  }
  const canPublish = c && !c.errors.length;
  const foot = `<button class="btn" data-action="prop-close-modal">${esc(T("common.cancel"))}</button>
    <button class="btn" data-action="prop-check-import">${esc(T("prop.import.check"))}</button>
    <button class="btn btn-primary" data-action="prop-publish-import" ${canPublish && !m.busy ? "" : "disabled"}>${esc(T(m.busy ? "common.saving" : "prop.import.publish"))}</button>`;
  return { title: esc(T("prop.import.title")), body, foot };
}
function propCheckImport() {
  const m = propModal;
  let raw;
  try { raw = JSON.parse(String(m.draft.text || "").replace(/^﻿/, "")); }
  catch (e) { m.check = { errors: [T("prop.import.errJson", { msg: e.message })], warnings: [], catalog: null }; return; }
  const r = propValidateCatalog(raw);
  m.check = { ...r, diff: r.catalog ? propCatalogDiff(propPlans, r.catalog.plans) : null };
}

/* ============================================================
   事件
   ============================================================ */
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || !el.dataset.action.startsWith("prop-")) return;
  const a = el.dataset.action, id = el.dataset.id;
  const m = propModal;

  if (a === "prop-view") { propView = el.dataset.view; try { localStorage.setItem("journal_prop_view", propView); } catch (err) {} render(); }
  else if (a === "prop-firm-filter") { propFirmFilter = el.dataset.val; render(); }
  else if (a === "prop-group-filter") { propGroupFilter = el.dataset.val; render(); }
  else if (a === "prop-status-filter") { propStatusFilter = el.dataset.val; render(); }
  else if (a === "prop-year") { propYear += Number(el.dataset.d); render(); }
  else if (a === "prop-month") { propMonth = Number(el.dataset.m); render(); }
  else if (a === "prop-cat-firm") { propCatalogFirm = el.dataset.val; propCatalogSize = ""; render(); }
  else if (a === "prop-cat-size") { propCatalogSize = el.dataset.val; render(); }
  else if (a === "prop-toggle-legacy") { propShowLegacy = !propShowLegacy; render(); }
  else if (a === "prop-toggle-compare") {
    if (propCompare.includes(id)) propCompare = propCompare.filter((x) => x !== id);
    else if (propCompare.length < 4) propCompare = [...propCompare, id];
    if (m && m.type === "compare") propRenderModal();
    render();
  }
  else if (a === "prop-clear-compare") { propCompare = []; render(); }
  else if (a === "prop-open-compare") { propModal = { type: "compare" }; propRenderModal(); }
  /* ---------- 弹窗开关 ---------- */
  else if (a === "prop-dismiss-overlay") { if (e.target === el && !(m && m.busy)) propCloseModal(); }
  else if (a === "prop-close-modal") { if (!(m && m.busy)) propCloseModal(); }
  else if (a === "prop-modal-back") { propModal = m && m.back ? m.back : null; propRenderModal(); }
  else if (a === "prop-new-account") { propModal = { type: "account", draft: propNewAccountDraft(null) }; propRenderModal(); }
  else if (a === "prop-buy-plan") { propModal = { type: "account", draft: propNewAccountDraft(id) }; propRenderModal(); }
  else if (a === "prop-save-account") { await propSaveNewAccount(); }
  else if (a === "prop-open-detail") { propModal = { type: "detail", id }; propRenderModal(); }
  else if (a === "prop-open-entry") {
    propModal = { type: "entry", accountId: id, back: m && m.type === "detail" ? { type: "detail", id } : null,
      draft: { kind: el.dataset.kind || "other", amount: "", day: todayStr(), pending: false, note: "" } };
    propRenderModal();
  }
  else if (a === "prop-edit-entry") {
    const en = propEntries.find((x) => x.id === id);
    if (!en) return;
    propModal = { type: "entry", accountId: en.account_id, back: m && m.type === "detail" ? { type: "detail", id: en.account_id } : null,
      draft: { id: en.id, kind: en.kind, amount: propMoney(en.amount), day: en.day, pending: !!en.pending, note: en.note || "" } };
    propRenderModal();
  }
  else if (a === "prop-save-entry") { await propSaveEntry(); }
  else if (a === "prop-ask-delete-entry") { m.confirmEntry = id; propRenderModal(); }
  else if (a === "prop-delete-entry") { await propDeleteEntry(id); if (propModal) propModal.confirmEntry = null; propRenderModal(); render(); }
  else if (a === "prop-mark-received") {
    const en = propEntries.find((x) => x.id === id);
    if (en) await propSaveEntries([{ ...en, pending: false, day: todayStr() }]);
    propRenderModal(); render();
  }
  else if (a === "prop-open-status") {
    const acc = propAccounts.find((x) => x.id === id);
    if (!acc) return;
    const step = el.dataset.step, snap = acc.plan_snapshot && acc.plan_snapshot.price ? acc.plan_snapshot.price : {};
    const feeKey = step === "activate" ? "activation" : step === "reset" ? "reset" : null;
    const fee = feeKey && typeof snap[feeKey] === "number" ? snap[feeKey] : "";
    propModal = { type: "status", accountId: id, step, to: el.dataset.to, back: { type: "detail", id }, draft: { day: todayStr(), fee } };
    propRenderModal();
  }
  else if (a === "prop-save-status") { await propSaveStatus(); }
  else if (a === "prop-edit-account") {
    const acc = propAccounts.find((x) => x.id === m.id);
    if (!acc) return;
    m.edit = true; m.confirmDelete = false;
    m.draft = { nickname: acc.nickname, group_name: acc.group_name, firm_name: acc.firm_name, plan_name: acc.plan_name, size: acc.size || "",
      bought_on: acc.bought_on, billing: acc.billing, monthly_fee: acc.monthly_fee === null ? "" : propMoney(acc.monthly_fee), renewing: !!acc.renewing, status: acc.status, note: acc.note || "" };
    propRenderModal();
  }
  else if (a === "prop-cancel-edit") { m.edit = false; m.draft = null; m.error = null; propRenderModal(); }
  else if (a === "prop-save-edit") { await propSaveEdit(); }
  else if (a === "prop-ask-delete-account") { m.confirmDelete = true; propRenderModal(); }
  else if (a === "prop-delete-account") {
    m.busy = true; propRenderModal();
    const ok = await propDeleteAccount(m.id);
    if (ok) propModal = null; else { m.busy = false; m.error = propError; }
    propRenderModal(); render();
  }
  /* ---------- 目录导入（管理员） ---------- */
  else if (a === "prop-open-import") { propModal = { type: "import", draft: { text: "" }, check: null }; propRenderModal(); }
  else if (a === "prop-check-import") { propCheckImport(); propRenderModal(); }
  else if (a === "prop-publish-import") {
    const c = m.check;
    if (!c || c.errors.length) return;
    m.busy = true; propRenderModal();
    const summary = { firms: c.catalog.firms.length, plans: c.catalog.plans.length, added: c.diff.added.length, changed: c.diff.changed.length, removed: c.diff.removed.length };
    const ok = await propImportCatalog(c.catalog, summary);
    if (ok) { propModal = null; propCompare = propCompare.filter((x) => propFindPlan(x)); }
    else { m.busy = false; m.error = propError; }
    propRenderModal(); render();
  }
  else if (a === "prop-export-catalog") {
    downloadFile("prop-catalog-" + todayStr() + ".json", JSON.stringify(propCatalogExport(), null, 2), "application/json");
  }
});
document.addEventListener("input", (e) => {
  const f = e.target.dataset && e.target.dataset.propField;
  if (!f || !propModal || !propModal.draft) return;
  propModal.draft[f] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
  if (propModal.type === "import" && f === "text") propModal.check = null;
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (!propModal || !t.dataset) return;
  if (t.dataset.propFile !== undefined && t.files && t.files[0]) {
    const file = t.files[0];
    file.text().then((text) => {
      if (!propModal || propModal.type !== "import") return;
      propModal.draft.text = text; propModal.fileName = file.name;
      propCheckImport(); propRenderModal();
    });
    return;
  }
  if (t.dataset.propRerender === undefined || !propModal.draft) return;
  const f = t.dataset.propField, d = propModal.draft;
  d[f] = t.type === "checkbox" ? t.checked : t.value;
  if (propModal.type === "account" && f === "firmSel") propPickPlan(d, (propPlans.find((p) => p.firm === d.firmSel && p.status !== "legacy") || {}).id);
  if (propModal.type === "account" && f === "planSel") propPickPlan(d, d.planSel === "__custom" ? null : d.planSel);
  if (f === "billing" && d.billing === "monthly" && (d.monthly_fee === "" || d.monthly_fee === null) && d.amount !== undefined) d.monthly_fee = d.amount;
  propRenderModal();
});

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
/* 格子窄的地方用：$1.1K / −$540，完整金额放 title 里 */
function propUsdShort(n, signed) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const v = Math.abs(n);
  if (v < 1000) return propUsd(Math.round(n), signed);
  const k = v >= 100000 ? Math.round(v / 1000) : Math.round(v / 100) / 10;
  return (n < -0.004 ? "−" : signed && n > 0.004 ? "+" : "") + "$" + k + "K";
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
/* ---------- 每月收支 ----------
   上面：12 个月的柱子（到账向上绿、投入向下红，顶上标净收支），右边全年汇总 + 回本进度（按全部时间算）。
   下面：选中月份的流水，按天分组的卡片；同一天同一批买的号（同公司同计划同规模、同类型）合成一条，点开看每个号 */
function renderPropMonths(accounts, entries) {
  // 今年还没有数据（比如只补录了去年的号）：自动跳到最近一个有数据的年份；用户自己翻过年份就不再跳
  if (!propYearTouched && entries.length && !propMonthly(entries, propYear).some((m) => m.n)) {
    const latest = entries.map((e) => Number(String(e.day || "").slice(0, 4))).filter((y) => y > 2000).sort((a, b) => b - a)[0];
    if (latest) { propYear = latest; propMonth = Number((entries.filter((e) => String(e.day).startsWith(latest + "-")).map((e) => e.day).sort().pop() || "").slice(5, 7)) || 1; }
  }
  const months = propMonthly(entries, propYear);
  const max = Math.max(1, ...months.map((m) => Math.max(m.spent, m.received)));
  const year = months.reduce((a, m) => ({ spent: a.spent + m.spent, received: a.received + m.received, n: a.n + m.n }), { spent: 0, received: 0, n: 0 });
  year.net = propMoney(year.received - year.spent);
  const all = propSum(entries);
  const pct = all.spent > 0 ? all.received / all.spent : null;
  const back = pct === null ? "" : pct >= 1
    ? `<b class="pos">${esc(T("prop.mo.paidBack"))}</b><span>${esc(T("prop.mo.netProfit", { v: propUsd(all.net) }))}</span>`
    : `<b>${esc(T("prop.mo.backPct", { p: Math.round(pct * 100) }))}</b><span>${esc(T("prop.mo.toGo", { v: propUsd(all.spent - all.received) }))}</span>`;
  let html = `<div class="calendarPanel propPanel">
    <div class="propPanelHead"><div class="sectionLabel propLabel">${esc(T("prop.month.title"))}</div>
      <div class="propYearNav"><button class="tinyBtn" data-action="prop-year" data-d="-1">‹</button><div class="monthYear">${propYear}</div><button class="tinyBtn" data-action="prop-year" data-d="1">›</button></div></div>
    <div class="propMo">
      <div class="propMoChart">${months.map((m, i) => `<button class="propMoCol ${propMonth === i + 1 ? "on" : ""} ${m.n ? "" : "empty"}" data-action="prop-month" data-m="${i + 1}"
          title="${esc(T("prop.mo.tip", { s: propUsd(m.spent), r: propUsd(m.received) }))}">
        <span class="propMoNet ${m.n ? propTone(m.net) : ""}">${m.n ? propUsdShort(m.net, true) : ""}</span>
        <span class="propMoBars"><span class="up"><i style="height:${Math.round((m.received / max) * 100)}%"></i></span><span class="down"><i style="height:${Math.round((m.spent / max) * 100)}%"></i></span></span>
        <span class="propMoLabel">${esc(new Date(2000, i, 1).toLocaleString(localeTag(), { month: "short" }))}</span></button>`).join("")}</div>
      <div class="propMoSum">
        <div class="propMiniLabel">${esc(T("prop.mo.yearSum", { y: propYear }))}</div>
        <div class="propMoSumRow"><span>${esc(T("prop.month.spent"))}</span><b>${propUsd(year.spent)}</b></div>
        <div class="propMoSumRow"><span>${esc(T("prop.month.received"))}</span><b>${propUsd(year.received)}</b></div>
        <div class="propMoSumRow big"><span>${esc(T("prop.month.net"))}</span><b class="${propTone(year.net)}">${propUsd(year.net, true)}</b></div>
        ${pct === null ? "" : `<div class="propMoBack"><div class="propMoBackHead">${back}</div>
          <div class="propMoBackBar"><i style="width:${Math.round(Math.min(1, pct) * 100)}%"></i></div>
          <small>${esc(T("prop.mo.backHint"))}</small></div>`}
      </div>
    </div>`;
  html += renderPropMonthDetail(accounts, entries);
  return html + `</div>`;
}
const PROP_KIND_ICON = { purchase: "🛒", monthly: "↻", reset: "⟲", activation: "⚡", payout: "↑", refund: "↩", other: "•" };
function renderPropMonthDetail(accounts, entries) {
  const key = propYear + "-" + String(propMonth).padStart(2, "0");
  const list = entries.filter((e) => propEntryMonth(e) === key);
  const m = propMonthly(list, propYear)[propMonth - 1];
  const title = new Date(propYear, propMonth - 1, 1).toLocaleString(localeTag(), { year: "numeric", month: "long" });
  let html = `<div class="propMonthDetail"><div class="propMonthHead"><b>${esc(title)}</b>
    <span>${esc(T("prop.month.spent"))} <b>${propUsd(m.spent)}</b></span><span>${esc(T("prop.month.received"))} <b>${propUsd(m.received)}</b></span>
    <span>${esc(T("prop.month.net"))} <b class="${propTone(m.net)}">${propUsd(m.net, true)}</b></span></div>`;
  if (!list.length) return html + `<div class="propMuted">${esc(T("prop.month.empty"))}</div></div>`;
  // 按天，再把同一批合起来
  const days = [...new Set(list.map((e) => e.day))].sort().reverse();
  days.forEach((day) => {
    const groups = new Map();
    list.filter((e) => e.day === day).forEach((e) => {
      const acc = accounts.find((a) => a.id === e.account_id) || {};
      const base = [acc.firm_name, acc.plan_name, propSizeLabel(acc.size)].filter(Boolean).join(" · ") || "—";
      const k = [e.kind, !!e.pending, base].join("|");
      if (!groups.has(k)) groups.set(k, { kind: e.kind, pending: !!e.pending, base, acc, items: [] });
      groups.get(k).items.push({ e, acc });
    });
    const d = new Date(day + "T00:00:00");
    html += `<div class="propLedDay"><div class="propLedDate"><b>${esc(String(d.getDate()))}</b><span>${esc(d.toLocaleString(localeTag(), { weekday: "short" }))}</span></div><div class="propLedItems">`;
    groups.forEach((g) => {
      const income = g.kind === "payout" || g.kind === "refund";
      const sum = propMoney(g.items.reduce((s, x) => s + propMoney(x.e.amount), 0)) * (income ? 1 : -1);
      const firm = (g.acc.firm_id && propFindFirm(g.acc.firm_id)) || { name: g.acc.firm_name || "?" };
      const one = g.items.length === 1;
      const head = `${propFirmLogo(firm, true)}<span class="propLedName"><b>${esc(one ? propAccountTitle(g.items[0].acc) : g.base)}</b>${one ? "" : `<em>× ${g.items.length}</em>`}</span>
        <span class="propLedKind propLedKind-${esc(g.kind)}">${PROP_KIND_ICON[g.kind] || "•"} ${esc(T("prop.kind." + g.kind))}${g.pending ? " · " + esc(T("prop.entry.pending")) : ""}</span>
        <span class="propLedAmt ${g.pending ? "propMuted" : propTone(sum)}">${propUsd(sum, true)}</span>`;
      if (one) html += `<button class="propLedRow" data-action="prop-open-detail" data-id="${esc(g.items[0].e.account_id)}">${head}</button>`;
      else html += `<details class="propLedRow propLedGroup"><summary>${head}</summary><div class="propLedSub">${g.items.map(({ e, acc }) =>
        `<button data-action="prop-open-detail" data-id="${esc(e.account_id)}"><span>${esc(propAccountTitle(acc))}</span>${propStatusPill(acc.status || "eval")}<span class="propLedAmt">${propUsd(propMoney(e.amount) * (income ? 1 : -1), true)}</span></button>`).join("")}</div></details>`;
    });
    html += `</div></div>`;
  });
  return html + `</div>`;
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

/* ---------- 我的账号 ----------
   卡片按状态上色（考核蓝 / 通过金 / 资金绿 / 失败爆仓红 / 结束灰），上面一条进度（考核 → 通过 → 资金 → 出金），
   净收益放最大；记了余额的显示离目标还差多少、离爆仓线还有多少。
   同一批买的号（同公司同计划同规模、同一天、同一分组）默认叠成一摞，点开看每个号，也可以展开成单张 */
function propStackKey(a) { return [a.firm_name, a.plan_name, a.size || "", a.bought_on, a.group_name].join("|"); }
function renderPropAccounts() {
  if (!propAccounts.length) return propEmpty("prop.empty.accounts");
  const { accounts } = propScoped();
  const counts = { active: accounts.filter(propIsActive).length, ended: accounts.filter((a) => !propIsActive(a)).length, all: accounts.length };
  const list = accounts.filter((a) => propStatusFilter === "all" || (propStatusFilter === "active") === propIsActive(a));
  let html = `<div class="propFilters propAccFilters"><div class="chipGroup">${["active", "ended", "all"].map((k) =>
    `<button class="chip ${propStatusFilter === k ? "active" : ""}" data-action="prop-status-filter" data-val="${k}">${esc(T("prop.filter." + k))} · ${counts[k]}</button>`).join("")}</div>
    ${propReadOnly() ? "" : `<button class="btn btn-sm ${propBatch ? "active" : ""}" data-action="prop-batch-toggle">${ICONS.check} ${esc(T(propBatch ? "prop.batch.exit" : "prop.batch.enter"))}</button>`}</div>`;
  html += propFilterChips();
  if (!list.length) return html + `<div class="emptyState">${esc(T("prop.empty.filtered"))}</div>`;
  // 叠摞：多选时不叠，一张张勾
  const stacks = new Map();
  list.forEach((a) => { const k = propStackKey(a); if (!stacks.has(k)) stacks.set(k, []); stacks.get(k).push(a); });
  const seen = new Set();
  const cards = [];
  list.forEach((a) => {
    const k = propStackKey(a), members = stacks.get(k);
    if (members.length > 1 && !propBatch && !propStacksOpen.includes(k)) {
      if (!seen.has(k)) { seen.add(k); cards.push(propStackCard(k, members)); }
      return;
    }
    cards.push(propAccountCard(a, members.length > 1 && propStacksOpen.includes(k) && members[0] === a ? k : null));
  });
  html += `<div class="propAccGrid">${cards.join("")}</div>`;
  if (propBatch) {
    const n = propSelected.length, all = list.every((a) => propSelected.includes(a.id));
    html += `<div class="propCompareBar propBatchBar"><span>${esc(T("prop.batch.picked", { n }))}</span>
      <button class="btn btn-sm" data-action="prop-batch-all" data-val="${all ? "none" : "all"}" data-ids="${esc(list.map((a) => a.id).join(","))}">${esc(T(all ? "prop.batch.none" : "prop.batch.all"))}</button>
      ${["status", "payout", "group", "delete"].map((k) => `<button class="btn btn-sm ${k === "delete" ? "btn-danger" : k === "payout" ? "btn-primary" : ""}" data-action="prop-batch-open" data-val="${k}" ${n ? "" : "disabled"}>${esc(T("prop.batch." + k))}</button>`).join("")}</div>`;
  }
  return html;
}
function propDaysSince(day) { return Math.max(0, Math.round((new Date(todayStr() + "T00:00:00") - new Date(day + "T00:00:00")) / 86400000)) + 1; }
/* 进度：考核 → 通过 → 资金 → 出金（免考号只有 资金 → 出金）；失败 / 爆仓 / 结束 接在最后 */
function propStepper(a, s) {
  const instant = (a.plan_snapshot || {}).type === "instant";
  const steps = (instant ? ["funded", "paid"] : ["eval", "passed", "funded", "paid"]).map((k) => ({
    k, done: k === "paid" ? s.received > 0 : k === "eval" ? true : propReached(a, k) || (k === "passed" && propReached(a, "funded")) }));
  const cur = steps.map((x) => x.done).lastIndexOf(true);
  const end = ["failed", "blown", "closed"].includes(a.status) ? a.status : null;
  return `<div class="propStepper">${steps.map((x, i) => `<span class="${x.done ? "done" : ""} ${i === cur && !end ? "cur" : ""}">${esc(T("prop.stepper." + x.k))}</span>`).join("<i></i>")}
    ${end ? `<i class="end"></i><span class="endSt endSt-${end}">${esc(T("prop.status." + end))}</span>` : ""}</div>`;
}
/* 规则小字：目标 · 回撤 · 日损（来自买的时候存的计划快照） */
function propRuleLine(a) {
  const p = a.plan_snapshot;
  if (!p) return "";
  const evalPhase = a.status === "eval" && p.type !== "instant";
  const ph = (evalPhase ? p.eval : p.funded) || {};
  const bits = [
    evalPhase && typeof (p.eval || {}).target === "number" ? T("prop.acc.ruleTarget", { v: propUsd(p.eval.target) }) : "",
    typeof ph.drawdown === "number" ? T("prop.acc.ruleDd", { v: propUsd(ph.drawdown), t: propDdType(ph.drawdownType) }) : "",
    typeof ph.dll === "number" ? T("prop.acc.ruleDll", { v: propUsd(ph.dll) }) : ph.dll === "none" ? T("prop.acc.ruleNoDll") : "",
  ].filter(Boolean);
  return bits.length ? `<div class="propAccRules">${esc(bits.join(" · "))}</div>` : "";
}
function propBalanceBlock(a) {
  const ro = propReadOnly();
  const v = propBalanceView(a);
  if (!v) return ro ? "" : `<button class="propBalAdd" data-action="prop-open-balance" data-id="${esc(a.id)}">＋ ${esc(T("prop.bal.add"))}</button>`;
  return `<div class="propBal ${v.danger ? "danger" : ""}" ${ro ? "" : `data-action="prop-open-balance" data-id="${esc(a.id)}"`} title="${esc(T("prop.bal.asOf", { d: a.balance_on || "" }))}">
    <div class="propBalTop"><span>${esc(T("prop.bal.now"))} <b>${propUsd(v.balance)}</b></span>${v.profit !== null ? `<span class="${propTone(v.profit)}">${propUsd(v.profit, true)}</span>` : ""}</div>
    ${v.target ? `<div class="propBalBar"><i style="width:${Math.round(v.progress * 100)}%"></i></div><div class="propBalRow"><span>${esc(T(v.left > 0 ? "prop.bal.left" : "prop.bal.hit", { v: propUsd(v.left) }))}</span><span>${Math.round(v.progress * 100)}%</span></div>` : ""}
    ${v.room !== null ? `<div class="propBalRow ${v.danger ? "neg" : ""}"><span>${esc(T("prop.bal.room"))}</span><b>${propUsd(v.room)}</b></div>` : ""}
  </div>`;
}
function propRoiRing(roi, live) {
  if (live || roi === null) return `<span class="propRing empty"><em>${esc(live ? T("prop.acc.inProgress") : "—")}</em></span>`;
  const p = Math.max(-1, Math.min(1, roi / 100)), deg = Math.abs(p) * 360;
  // 圆环里放不下小数：100% 以上取整
  const text = Math.abs(roi) >= 100 ? (roi > 0 ? "+" : "") + Math.round(roi) + "%" : propPct(roi);
  return `<span class="propRing ${roi >= 0 ? "pos" : "neg"}" style="--deg:${deg}deg" title="ROI ${esc(propPct(roi))}"><em>${esc(text)}</em></span>`;
}
function propCardMenuHtml(a) {
  if (propReadOnly() || propBatch) return "";
  return `<div class="propCardMenuWrap"><button class="propCardMenuBtn" data-action="prop-card-menu" data-id="${esc(a.id)}" aria-label="${esc(T("prop.acc.menu"))}">⋯</button>
    ${propCardMenu === a.id ? `<div class="propMenu">
      <button data-action="prop-open-detail" data-id="${esc(a.id)}">${ICONS.pencil} ${esc(T("prop.acc.openEdit"))}</button>
      <button data-action="prop-open-entry" data-id="${esc(a.id)}" data-kind="${a.status === "funded" ? "payout" : "other"}">${ICONS.plus} ${esc(T(a.status === "funded" ? "prop.acc.addPayout" : "prop.acc.addEntry"))}</button>
      <button data-action="prop-open-balance" data-id="${esc(a.id)}">${ICONS.wallet} ${esc(T("prop.bal.add"))}</button>
      <button class="neg" data-action="prop-delete-quick" data-id="${esc(a.id)}">${ICONS.trash} ${esc(T("prop.acc.delete"))}</button></div>` : ""}</div>`;
}
function propAccountCard(a, stackKey) {
  const s = propSum(propEntriesOf(a.id));
  const firm = (a.firm_id && propFindFirm(a.firm_id)) || { name: a.firm_name || "?" };
  const sub = [a.nickname ? [a.firm_name, a.plan_name, propSizeLabel(a.size)].filter(Boolean).join(" · ") : "", a.group_name ? "# " + a.group_name : ""].filter(Boolean).join(" · ");
  const picked = propBatch && propSelected.includes(a.id);
  const live = propIsActive(a) && !s.received;
  return `<div class="propCard propAcc propAccSt-${esc(a.status)} ${picked ? "selected" : ""} ${propBatch ? "batch" : ""}" data-action="${propBatch ? "prop-batch-pick" : "prop-open-detail"}" data-id="${esc(a.id)}">
    <div class="propAccHead">${propBatch ? `<span class="propPickBox">${picked ? ICONS.check : ""}</span>` : propFirmLogo(firm, true)}
      <div class="propAccTitleWrap"><div class="propAccTitle">${esc(propAccountTitle(a))}</div>${sub ? `<div class="propAccSub">${esc(sub)}</div>` : ""}</div>
      ${propStatusPill(a.status)}${propCardMenuHtml(a)}</div>
    ${propStepper(a, s)}
    <div class="propAccMain">
      <div class="propAccNet"><span>${esc(T("prop.stat.net"))}</span><b class="${propTone(s.net)}" title="${esc(propUsd(s.net, true))}">${propUsd(s.net, true)}</b>
        <small>${esc(T("prop.acc.spentRecv", { s: propUsdShort(s.spent), r: propUsdShort(s.received) }))}</small></div>
      ${propRoiRing(s.roi, live)}
    </div>
    ${propRuleLine(a)}
    ${propBalanceBlock(a)}
    <div class="propAccFoot"><span>${esc(T("prop.acc.dayN", { d: a.bought_on, n: propDaysSince(a.bought_on) }))}</span>
      ${s.pending ? `<span class="propPendingTag">${esc(T("prop.stat.pendingSub", { v: propUsd(s.pending) }))}</span>` : ""}
      ${a.renewing ? `<span class="propRenewTag">${esc(T("prop.acc.renewingTag", { v: propUsd(propMoney(a.monthly_fee)) }))}</span>` : ""}
      ${stackKey ? `<button class="propStackFold" data-action="prop-stack-toggle" data-val="${esc(stackKey)}">${esc(T("prop.stack.fold"))}</button>` : ""}</div>
  </div>`;
}
/* 一摞：同一批的号合在一张，列出每个号（点进详情），合计投入 / 到账 */
function propStackCard(key, members) {
  const a = members[0];
  const firm = (a.firm_id && propFindFirm(a.firm_id)) || { name: a.firm_name || "?" };
  const s = propSum(propEntries.filter((e) => members.some((m) => m.id === e.account_id)));
  const byStatus = {};
  members.forEach((m) => { byStatus[m.status] = (byStatus[m.status] || 0) + 1; });
  const worst = members.some((m) => propIsActive(m)) ? (members.find((m) => m.status === "funded") ? "funded" : members.find((m) => m.status === "passed") ? "passed" : "eval") : a.status;
  return `<div class="propCard propAcc propStack propAccSt-${esc(worst)}">
    <div class="propAccHead">${propFirmLogo(firm, true)}
      <div class="propAccTitleWrap"><div class="propAccTitle">${esc([a.firm_name, a.plan_name, propSizeLabel(a.size)].filter(Boolean).join(" · "))}</div>
        <div class="propAccSub">${esc(T("prop.stack.sub", { d: a.bought_on }))}${a.group_name ? " · # " + esc(a.group_name) : ""}</div></div>
      <span class="propStackN">× ${members.length}</span></div>
    <div class="propStackSt">${Object.entries(byStatus).map(([st, n]) => `${propStatusPill(st)}<b>${n}</b>`).join("")}</div>
    <div class="propAccMain">
      <div class="propAccNet"><span>${esc(T("prop.stack.net"))}</span><b class="${propTone(s.net)}">${propUsd(s.net, true)}</b>
        <small>${esc(T("prop.acc.spentRecv", { s: propUsdShort(s.spent), r: propUsdShort(s.received) }))}</small></div>
      ${propRoiRing(s.roi, members.some(propIsActive) && !s.received)}
    </div>
    ${propRuleLine(a)}
    <div class="propStackList">${members.map((m) => {
      const ms = propSum(propEntriesOf(m.id)), v = propBalanceView(m);
      return `<button data-action="prop-open-detail" data-id="${esc(m.id)}"><span class="propStackName">${esc(propAccountTitle(m))}</span>
        ${v && v.target ? `<span class="propStackProg"><i style="width:${Math.round(v.progress * 100)}%"></i></span>` : ""}
        ${propStatusPill(m.status)}<span class="${propTone(ms.net)}">${propUsdShort(ms.net, true)}</span></button>`;
    }).join("")}</div>
    <button class="btn btn-sm propStackOpen" data-action="prop-stack-toggle" data-val="${esc(key)}">${esc(T("prop.stack.unfold", { n: members.length }))}</button>
  </div>`;
}

/* ---------- 记余额 ---------- */
function propBalanceForm(m) {
  const acc = propAccounts.find((a) => a.id === m.accountId);
  const d = m.draft;
  let body = `<div class="propMuted" style="margin-bottom:12px;">${esc(acc ? propAccountTitle(acc) : "")}</div>
    <div class="propRow">${propField(T("prop.bal.now") + " (USD)", propInput("balance", d.balance, `type="number" step="0.01" placeholder="${esc(acc && acc.size ? String(acc.size) : "")}"`), T("prop.bal.hint"))}
    ${propField(T("prop.col.day"), propInput("day", d.day, `type="date"`))}</div>`;
  if (acc && acc.balance !== null && acc.balance !== undefined) body += `<div class="propHint">${esc(T("prop.bal.peak", { v: propUsd(Math.max(Number(acc.balance_peak) || 0, Number(acc.balance) || 0)) }))}</div>`;
  return { title: esc(T("prop.bal.add")), body, foot: propFootButtons("prop-save-balance", null, !!m.back) };
}
async function propSaveBalance() {
  const m = propModal, d = m.draft;
  const acc = propAccounts.find((a) => a.id === m.accountId);
  if (!acc) return;
  if (d.balance === "" || !isFinite(Number(d.balance))) { m.error = T("prop.bal.need"); propRenderModal(); return; }
  const bal = propMoney(d.balance);
  m.busy = true; propRenderModal();
  const ok = await propSaveAccount({ ...acc, balance: bal, balance_on: d.day || todayStr(),
    balance_peak: Math.max(Number(acc.balance_peak) || 0, Number(acc.balance) || 0, bal) });
  if (!ok) { m.busy = false; m.error = propError; propRenderModal(); return; }
  propError = null; propModal = m.back || null;
  propRenderModal(); render();
}

/* ---------- 公司计划 ----------
   没选公司时：上面是排行（目录里公司的先后顺序 = 排名），下面是跨公司的价格对比表（默认 50K）；
   点排行里的公司或表里的一行，进那家公司的页面看全部计划卡片 */
function renderPropCatalog() {
  const admin = currentProfile && currentProfile.role === "admin" && !viewingUserId;
  const info = propCatalogInfo ? T("prop.cat.updated", { d: localDateStr(propCatalogInfo.imported_at), f: propFirms.length, p: propPlans.length }) : "";
  let html = `<div class="propCatHead"><div class="propMuted">${esc(info || T("prop.cat.hint"))}</div>
    ${admin ? `<div class="propCatAdmin"><button class="btn" data-action="prop-open-import">${esc(T("prop.import.open"))}</button>${propFirms.length ? `<button class="btn" data-action="prop-export-catalog">${esc(T("prop.import.export"))}</button>` : ""}</div>` : ""}</div>`;
  if (!propFirms.length) return html + `<div class="emptyState propEmptyState">${ICONS.layers}<div>${esc(T(admin ? "prop.empty.catalogAdmin" : "prop.empty.catalog"))}</div></div>`;
  const firm = propCatalogFirm && propFindFirm(propCatalogFirm);
  if (!firm) return html + renderPropBoard() + renderPropCompare();

  const visible = propPlans.filter((p) => p.firm === firm.id && (propShowLegacy || p.status !== "legacy"));
  const sizes = [...new Set(visible.map((p) => p.size).filter(Boolean))].sort((a, b) => a - b);
  html += `<div class="propFilters propFirmNav"><button class="btn btn-sm" data-action="prop-cat-firm" data-val="">‹ ${esc(T("prop.cat.back"))}</button>
    <div class="chipGroup">${[["", T("prop.filter.allSizes")], ...sizes.map((s) => [String(s), propSizeLabel(s)])].map(([v, label]) =>
    `<button class="chip ${propCatalogFirmSize === v ? "active" : ""}" data-action="prop-cat-firm-size" data-val="${esc(v)}">${esc(label)}</button>`).join("")}
    ${propPlans.some((p) => p.firm === firm.id && p.status === "legacy") ? `<button class="chip ${propShowLegacy ? "active" : ""}" data-action="prop-toggle-legacy">${esc(T("prop.cat.showLegacy"))}</button>` : ""}</div></div>`;
  return html + renderPropFirm(firm, visible.filter((p) => !propCatalogFirmSize || String(p.size) === propCatalogFirmSize));
}
/* logo 位：目录里给了 logo 就显示图，没有就显示名字的前两个字母，位置大小不变 */
function propFirmLogo(f, small) {
  const initials = esc((f.name || "?").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?");
  const cls = "propLogo" + (small ? " propLogoSm" : "");
  return f.logo ? `<span class="${cls}"><img src="${esc(f.logo)}" alt="" loading="lazy"></span>` : `<span class="${cls}">${initials}</span>`;
}
function propTierTag(f) {
  return ["good", "fair", "meh", "avoid"].includes(f.tier) ? `<span class="propTier propTier-${f.tier}">${esc(T("prop.tier." + f.tier))}</span>` : "";
}
function propRankOf(f) { return typeof f.rank === "number" ? f.rank : propFirms.indexOf(f) + 1; }

/* 对比表和排行用的数：免考号没有考核阶段，回撤 / 日损取资金阶段的，目标记「免考」 */
function propCmpVals(p) {
  const pr = p.price || {}, po = p.payout || {}, fu = p.funded || {};
  const instant = p.type === "instant";
  const ev = instant ? { drawdown: fu.drawdown, drawdownType: fu.drawdownType, dll: fu.dll } : (p.eval || {});
  const price = typeof pr.list === "number" ? pr.list : null;
  const dd = typeof ev.drawdown === "number" && ev.drawdown > 0 ? ev.drawdown : null;
  return { instant, price, original: typeof pr.original === "number" && price !== null && pr.original > price ? pr.original : null,
    monthly: pr.billing === "monthly", activation: pr.activation, target: instant ? "none" : ev.target, dd: ev.drawdown, ddType: ev.drawdownType,
    dll: ev.dll, consistency: instant ? null : ev.consistency, fundedConsistency: fu.consistency, split: po.split, cap: po.cap,
    // 每千回撤成本：首付 + 激活费，摊到每 $1000 回撤上；月费的只算第一个月
    per1k: price !== null && dd ? ((price + (typeof pr.activation === "number" ? pr.activation : 0)) / dd) * 1000 : null };
}
/* 价格对比的筛选：规模、「我在意」偏好（可多选，全部满足才留下）、含已下架 */
const PROP_MAIN_SIZES = [25000, 50000, 100000, 150000];
const PROP_PREFS = {
  noDll: (p, v) => v.dll === "none",
  eod: (p, v) => v.ddType === "eod",
  noCons: (p, v) => !v.instant && v.consistency === "none",
  oneTime: (p) => (p.price || {}).billing === "one_time",
  daily: (p) => !!(p.payout || {}).daily,
  instant: (p) => p.type === "instant",
  noAct: (p, v) => v.activation === 0 || v.activation === "none",
};
function propCatalogRows() {
  return propPlans.filter((p) => {
    if (!propShowLegacy && p.status === "legacy") return false;
    if (propCatalogSize && String(p.size) !== propCatalogSize) return false;
    const v = propCmpVals(p);
    return propCatalogPrefs.every((k) => !PROP_PREFS[k] || PROP_PREFS[k](p, v));
  });
}
/* 考试难度：目标 ÷ 回撤。≤1.5 好过，≤2 一般，再高就难 */
function propRatio(v) { return !v.instant && typeof v.target === "number" && typeof v.dd === "number" && v.dd > 0 ? v.target / v.dd : null; }
function propSortRows(list, get) {
  const rank = new Map(propFirms.map((f) => [f.id, propRankOf(f)]));
  const num = (x) => (typeof x === "number" ? x : Infinity);
  const key = { price: (v) => v.price, per1k: (v) => v.per1k, ratio: (v) => propRatio(v) }[propCatalogSort];
  return list.sort((a, b) => {
    const pa = get(a), pb = get(b), ra = rank.get(pa.firm) || 999, rb = rank.get(pb.firm) || 999;
    if (key) return num(key(propCmpVals(pa))) - num(key(propCmpVals(pb))) || ra - rb;
    return ra - rb || propPlans.indexOf(pa) - propPlans.indexOf(pb);
  });
}

/* ---------- 价格对比：上面一条筛选，下面卡片墙（默认）或表格 ---------- */
function renderPropCompare() {
  const chip = (action, on, val, label) => `<button class="chip ${on ? "active" : ""}" data-action="${action}" data-val="${esc(val)}">${esc(label)}</button>`;
  const sizes = [...new Set(propPlans.filter((p) => propShowLegacy || p.status !== "legacy").map((p) => p.size).filter(Boolean))].sort((a, b) => a - b);
  const more = sizes.filter((s) => !PROP_MAIN_SIZES.includes(s));
  const rows = propCatalogRows();
  const cards = propCatalogLayout !== "table";
  const groups = cards ? propCardGroups(rows) : null;
  let html = `<div class="calendarPanel propPanel propCmpPanel">
    <div class="propPanelHead"><div class="sectionLabel propLabel">${esc(T("prop.cat.tableTitle"))}</div>
      <div class="propCmpHeadRight"><span class="propMuted">${esc(T(cards ? "prop.pc.count" : "prop.cat.tableCount", { n: cards ? groups.length : rows.length }))}</span>
      <div class="modeToggle propLayoutToggle">${[["cards", "prop.pc.viewCards"], ["table", "prop.pc.viewTable"]].map(([v, k]) =>
        `<button class="modeBtn ${(cards ? "cards" : "table") === v ? "active" : ""}" data-action="prop-cat-layout" data-val="${v}">${esc(T(k))}</button>`).join("")}</div></div></div>
    <div class="propPcFilters">
      <div class="propPcSizes">${chip("prop-cat-size", !propCatalogSize, "", T("prop.filter.allSizes"))}
        ${PROP_MAIN_SIZES.filter((s) => sizes.includes(s)).map((s) => `<button class="propPcSizeBtn ${propCatalogSize === String(s) ? "on" : ""}" data-action="prop-cat-size" data-val="${s}">${esc(propSizeLabel(s))}</button>`).join("")}
        ${more.length ? `<select class="input propPcMore ${more.map(String).includes(propCatalogSize) ? "on" : ""}" data-prop-cat-size>
          <option value="">${esc(T("prop.pc.moreSizes"))}</option>${more.map((s) => `<option value="${s}" ${propCatalogSize === String(s) ? "selected" : ""}>${esc(propSizeLabel(s))}</option>`).join("")}</select>` : ""}</div>
      <div class="propFilterLine"><span class="propMuted">${esc(T("prop.pc.care"))}</span><div class="chipGroup">
        ${Object.keys(PROP_PREFS).map((k) => chip("prop-cat-pref", propCatalogPrefs.includes(k), k, T("prop.pc.pref." + k))).join("")}
        ${propPlans.some((p) => p.status === "legacy") ? chip("prop-toggle-legacy", propShowLegacy, "", T("prop.cat.showLegacy")) : ""}</div></div>
      <div class="propFilterLine"><span class="propMuted">${esc(T("prop.cat.sortBy"))}</span><div class="chipGroup">
        ${[["rank", "prop.cat.sort.rank"], ["price", "prop.cat.sort.price"], ["per1k", "prop.cat.sort.per1k"], ["ratio", "prop.pc.sortRatio"]].map(([v, k]) => chip("prop-cat-sort", propCatalogSort === v, v, T(k))).join("")}</div></div>
    </div>`;
  if (!rows.length) return html + `<div class="propMuted propPcEmpty">${esc(T("prop.empty.filtered"))}</div></div>`;
  html += cards ? propCardWall(groups) : renderPropPriceTable(rows);
  return html + `<div class="propHint">${esc(T("prop.cat.tableFoot"))}</div></div>`;
}

/* ---------- 卡片墙 ----------
   一张卡 = 一家公司的一个系列在一个规模；同系列的几个版本（一致性 / 日损 / 激活费…）合在一张卡上，用卡片里的开关切 */
function propCardKey(p) { return p.firm + "|" + propFamilyOf(p) + "|" + (p.size || ""); }
function propCardGroups(rows) {
  const map = new Map();
  rows.forEach((p) => { const k = propCardKey(p); if (!map.has(k)) map.set(k, []); map.get(k).push(p); });
  // 没切过的卡默认显示最便宜的那个版本
  const cheapest = (plans) => plans.reduce((b, q) => ((propCmpVals(q).price ?? Infinity) < (propCmpVals(b).price ?? Infinity) ? q : b), plans[0]);
  const groups = [...map].map(([key, plans]) => ({ key, plans, pick: plans.find((q) => q.id === propCardPick[key]) || cheapest(plans) }));
  return propSortRows(groups, (g) => g.pick);
}
/* 在当前这批卡片里比出来的标签：最便宜 / 回撤最宽 / 最好过 / 最划算（每样只给一张卡） */
function propCardBests(groups) {
  const best = {};
  const pick = (name, get, max) => {
    let win = null, val = null;
    groups.forEach((g) => {
      const x = get(propCmpVals(g.pick));
      if (typeof x !== "number") return;
      if (val === null || (max ? x > val : x < val)) { val = x; win = g.key; }
    });
    if (win && groups.length > 1) (best[win] = best[win] || []).push(name);
  };
  pick("cheapest", (v) => v.price);
  pick("widest", (v) => (typeof v.dd === "number" ? v.dd : null), true);
  pick("easiest", (v) => propRatio(v));
  pick("value", (v) => v.per1k);
  return best;
}
function propCardWall(groups) {
  const bests = propCardBests(groups);
  return `<div class="propPcGrid">${groups.map((g) => propPlanCard2(g, bests[g.key] || [])).join("")}</div>`;
}
function propSizeTier(size) { return !size ? 0 : size <= 25000 ? 0 : size <= 50000 ? 1 : size <= 100000 ? 2 : 3; }
function propPlanCard2(g, bests, onFirmPage) {
  const p = g.pick, v = propCmpVals(p), po = p.payout || {}, pr = p.price || {};
  const f = propFindFirm(p.firm) || { name: p.firm };
  const picked = propCompare.includes(p.id);
  const ratio = propRatio(v);
  const diff = ratio === null ? null : ratio <= 1.5 ? "easy" : ratio <= 2 ? "mid" : "hard";
  const days = typeof po.qualifyingDays === "number"
    ? `${esc(T("prop.rule.days", { n: po.qualifyingDays }))}${typeof po.dayProfit === "number" ? `<small>${esc(T("prop.pc.dayMin", { v: propUsd(po.dayProfit) }))}</small>` : ""}`
    : po.daily ? `<span class="propPcGood">${esc(T("prop.pc.daily"))}</span>` : propRule(null);
  const cons = v.instant ? propRule(v.fundedConsistency, "%") : propRule(v.consistency, "%");
  const row = (label, value, sub) => `<div class="propPcRow"><span>${esc(label)}</span><b>${value}${sub ? `<small>${esc(sub)}</small>` : ""}</b></div>`;
  // 卡片上的属性标签：最多 3 个
  const attrs = [v.instant && "instant", pr.billing === "one_time" && "oneTime", v.dll === "none" && "noDll", !v.instant && v.consistency === "none" && "noCons", po.daily && "daily"].filter(Boolean).slice(0, 3);
  const want = propChoiceMap(p);
  const chips = propFamilyAxes(g.plans).map(({ axis, values }) => `<div class="propPcOpt"><span>${esc(axis)}</span><div>${values.map((val) => {
    const q = propBestPlan(g.plans, p.size || null, { ...want, [axis]: val }, axis);
    return `<button class="${want[axis] === val ? "on" : ""}" data-action="prop-card-pick" data-key="${esc(g.key)}" data-id="${esc(q ? q.id : "")}" ${q ? "" : "disabled"}>${esc(val)}</button>`;
  }).join("")}</div></div>`).join("");
  const act = typeof v.activation === "number" && v.activation > 0 ? T("prop.plan.activation", { v: propUsd(v.activation) }) : T("prop.plan.noActivation");
  const foot = [propBillingLabel(pr.billing), act].filter(Boolean).join(" · ");
  const sizeText = p.size ? "$" + Number(p.size).toLocaleString("en-US") : p.series;
  return `<article class="propPc propPcTier${propSizeTier(p.size)} ${f.tier === "avoid" ? "dim" : ""} ${picked ? "picked" : ""}">
    <div class="propPcArc" aria-hidden="true"></div>
    <div class="propPcTop">
      <div class="propPcPrice">${v.original ? `<s>${propUsd(v.original)}</s>` : ""}<b>${v.price === null ? esc(T("prop.cat.noPrice")) : propUsd(v.price)}</b><span>${v.monthly ? esc(T("prop.cat.perMonth")) : "USD"}</span></div>
      <button class="propPcFirm" data-action="prop-cat-firm" data-val="${esc(p.firm)}" data-size="${esc(p.size || "")}" title="${esc(f.name)}">${propFirmLogo(f)}</button>
    </div>
    <div class="propPcBests">${bests.map((b) => `<span class="propPcBest propPcBest-${b}">${esc(T("prop.pc.best." + b))}</span>`).join("")}</div>
    <div class="propPcSize">${esc(sizeText)}</div>
    <div class="propPcSub"><span>#${propRankOf(f)}</span>${esc(f.name)} · ${esc(propFamilyOf(p))}${p.status === "legacy" ? ` · ${esc(T("prop.cat.legacy"))}` : ""}</div>
    ${attrs.length ? `<div class="propPcAttrs">${attrs.map((a) => `<span>${esc(T("prop.pc.pref." + a))}</span>`).join("")}</div>` : ""}
    <div class="propPcRows">
      ${row(T("prop.rule.drawdown"), propRule(v.dd, "$"), propDdType(v.ddType))}
      ${row(T("prop.rule.target"), v.instant ? `<span class="propNone">${esc(T("prop.plan.instant"))}</span>` : propRule(v.target, "$"))}
      ${row(T(v.instant ? "prop.rule.fundedConsistency" : "prop.rule.consistency"), cons)}
      ${row(T("prop.rule.dll"), propRule(v.dll, "$"))}
      ${row(T("prop.pc.payoutDays"), days)}
      ${row(T("prop.rule.split"), propRule(v.split, "%"))}
    </div>
    ${diff ? `<div class="propPcDiff propPcDiff-${diff}" title="${esc(T("prop.pc.diffHint"))}"><span>${esc(T("prop.pc.diff." + diff))}</span><i style="--w:${Math.min(100, Math.round((ratio / 3) * 100))}%"></i><em>${esc(T("prop.pc.ratio", { r: ratio.toFixed(1) }))}</em></div>` : ""}
    ${chips ? `<div class="propPcOpts">${chips}</div>` : ""}
    <details class="propPcMore"><summary>${esc(T("prop.pc.details"))}</summary>
      ${propRulesDl([...propKeyRules(p).filter((r) => r[0] === T("prop.rule.payoutRange")), ...propMoreRules(p)])}${propLongRulesHtml(p)}
      ${p.notes ? `<div class="propNotes">${esc(p.notes)}</div>` : ""}
      ${onFirmPage ? "" : `<button class="tinyBtn propPcFirmLink" data-action="prop-cat-firm" data-val="${esc(p.firm)}" data-size="${esc(p.size || "")}">${esc(T("prop.pc.firmPage", { name: f.name }))} ›</button>`}
    </details>
    <div class="propPcActs">
      ${propReadOnly() ? "" : `<button class="btn propPcCta" data-action="prop-buy-plan" data-id="${esc(p.id)}">${esc(T("prop.cat.buy"))}</button>`}
      <button class="btn propPcCmp ${picked ? "active" : ""}" data-action="prop-toggle-compare" data-id="${esc(p.id)}">${picked ? ICONS.check : ICONS.plus}<span>${esc(T("prop.compare.add"))}</span></button>
    </div>
    <div class="propPcFoot">${esc(foot)}</div>
  </article>`;
}

/* ---------- 排行 ---------- */
function renderPropBoard() {
  const BOARD_TOP = 6;
  const firms = propFirms.slice().sort((a, b) => propRankOf(a) - propRankOf(b));
  const shown = propBoardAll ? firms : firms.slice(0, BOARD_TOP);
  const card = (f) => {
    const plans = propPlans.filter((p) => p.firm === f.id && p.status !== "legacy");
    const atSize = propCatalogSize ? plans.filter((p) => String(p.size) === propCatalogSize) : [];
    // 这家没有选中的规模时，拿最便宜的考试号（不拿 $500 这种迷你免考号，免得看着便宜得离谱）
    const fallback = plans.some((p) => p.type !== "instant") ? plans.filter((p) => p.type !== "instant") : plans;
    const pool = (atSize.length ? atSize : fallback).filter((p) => propCmpVals(p).price !== null);
    const cheapest = pool.sort((a, b) => propCmpVals(a).price - propCmpVals(b).price)[0];
    const promo = f.promo && (f.promo.discount || f.promo.text);
    return `<button class="propCard propBoardCard ${f.tier === "avoid" ? "dim" : ""}" data-action="prop-cat-firm" data-val="${esc(f.id)}">
      <div class="propBoardHead"><span class="propRank ${propRankOf(f) <= 3 ? "top" : ""}">${propRankOf(f)}</span>${propFirmLogo(f)}
        <div class="propBoardName"><b>${esc(f.name)}</b>${propTierTag(f)}</div></div>
      ${promo ? `<div class="propBoardPromo">${f.promo.discount ? `<b>${esc(T("prop.cat.off", { v: f.promo.discount }))}</b>` : ""}${f.promo.text ? `<span>${esc(f.promo.text)}</span>` : ""}</div>`
        : f.review && f.review !== T("prop.tier." + f.tier) ? `<div class="propBoardReview">${esc(f.review)}</div>` : ""}
      <div class="propBoardFoot">${cheapest ? `<span>${esc(T("prop.cat.from", { s: propSizeLabel(cheapest.size) || cheapest.series }))}</span><b>${propUsd(propCmpVals(cheapest).price)}</b>${propCmpVals(cheapest).monthly ? `<small>${esc(T("prop.cat.perMonth"))}</small>` : ""}` : `<span>${esc(T("prop.cat.noPrice"))}</span>`}
        <em>${esc(T("prop.cat.planCount", { n: plans.length }))}</em></div>
    </button>`;
  };
  return `<div class="calendarPanel propPanel">
    <div class="propPanelHead"><div class="sectionLabel propLabel">${esc(T("prop.cat.boardTitle"))}</div><span class="propMuted">${esc(T("prop.cat.boardHint"))}</span></div>
    <div class="propBoard">${shown.map(card).join("")}</div>
    ${firms.length > BOARD_TOP ? `<button class="btn btn-sm propBoardMore" data-action="prop-board-all">${esc(T(propBoardAll ? "prop.cat.boardLess" : "prop.cat.boardAll", { n: firms.length }))}</button>` : ""}
  </div>`;
}

/* ---------- 价格对比表（「表格」视图）：一行一个计划 ---------- */
function renderPropPriceTable(list) {
  const rows = propSortRows(list.map((p) => ({ p, v: propCmpVals(p) })), (x) => x.p);
  // 按排名看时一家公司是一组：先列最便宜的几个，其余折起来，免得一家（比如 Lucid 有十种组合）占满整屏
  const GROUP_TOP = 3;
  const grouped = propCatalogSort === "rank";
  const groupCount = new Map();
  rows.forEach((x) => groupCount.set(x.p.firm, (groupCount.get(x.p.firm) || 0) + 1));
  let html = "";
  const pct = (v) => propRule(v, "%");
  html += `<div class="tableScroll propPriceScroll"><table class="adminTable propTable propPriceTable"><thead><tr>
    <th class="propStickyCol">${esc(T("prop.col.firm"))}</th><th>${esc(T("prop.cmp.series"))}</th><th class="num">${esc(T("prop.form.size"))}</th>
    <th class="num">${esc(T("prop.cmp.price"))}</th><th class="num">${esc(T("prop.rule.activation"))}</th><th class="num">${esc(T("prop.rule.target"))}</th>
    <th class="num">${esc(T("prop.rule.drawdown"))}</th><th class="num">${esc(T("prop.rule.dll"))}</th><th class="num">${esc(T("prop.cat.colEvalCons"))}</th>
    <th class="num">${esc(T("prop.cat.colFundedCons"))}</th><th class="num">${esc(T("prop.rule.split"))}</th><th class="num">${esc(T("prop.cmp.payoutCap"))}</th>
    <th class="num" title="${esc(T("prop.cat.per1kHint"))}">${esc(T("prop.cmp.per1k"))}</th><th></th></tr></thead><tbody>`;
  const COLS = 14;
  let prevFirm = null, inGroup = 0;
  rows.forEach(({ p, v }, i) => {
    const f = propFindFirm(p.firm) || { name: p.firm };
    const first = p.firm !== prevFirm;
    inGroup = first ? 1 : inGroup + 1;
    prevFirm = p.firm;
    const open = propExpandedFirms.includes(p.firm);
    const total = groupCount.get(p.firm);
    if (grouped && !open && inGroup > GROUP_TOP) {
      // 这组折起来的部分：只在组的最后一行位置补一个「展开」
      const last = !rows[i + 1] || rows[i + 1].p.firm !== p.firm;
      if (last) html += `<tr class="propGroupMore"><td class="propStickyCol"></td><td colspan="${COLS - 1}"><button class="tinyBtn" data-action="prop-cat-expand" data-id="${esc(p.firm)}">${esc(T("prop.cat.expandFirm", { name: f.name, n: total - GROUP_TOP }))}</button></td></tr>`;
      return;
    }
    const picked = propCompare.includes(p.id);
    const showFirm = !grouped || first;
    html += `<tr class="propPriceRow ${f.tier === "avoid" ? "dim" : ""} ${picked ? "picked" : ""} ${grouped && first && i ? "groupStart" : ""}" data-action="prop-cat-firm" data-val="${esc(p.firm)}" data-size="${esc(p.size || "")}">
      <td class="propStickyCol">${showFirm ? `<div class="propFirmCell"><span class="propRankSm">${propRankOf(f)}</span>${propFirmLogo(f, true)}<span class="propFirmCellName">${esc(f.name)}</span></div>` : ""}</td>
      <td><div class="propSeriesCell">${esc(p.series || "—")}${v.instant ? ` <span class="propSt propSt-funded">${esc(T("prop.plan.instant"))}</span>` : ""}${p.status === "legacy" ? ` <span class="propSt propSt-closed">${esc(T("prop.cat.legacy"))}</span>` : ""}</div></td>
      <td class="num">${esc(propSizeLabel(p.size) || "—")}</td>
      <td class="num propPriceCell">${v.original ? `<s>${propUsd(v.original)}</s>` : ""}<b>${propRule(v.price, "$")}</b>${v.monthly ? `<small>${esc(T("prop.cat.perMonth"))}</small>` : ""}</td>
      <td class="num">${v.activation === 0 || v.activation === "none" ? `<span class="propNone">${esc(T("prop.cat.free"))}</span>` : propRule(v.activation, "$")}</td>
      <td class="num">${v.instant ? `<span class="propNone">${esc(T("prop.plan.instant"))}</span>` : propRule(v.target, "$")}</td>
      <td class="num">${propRule(v.dd, "$")}${propDdType(v.ddType) ? `<small>${esc(propDdType(v.ddType))}</small>` : ""}</td>
      <td class="num">${propRule(v.dll, "$")}</td><td class="num">${v.instant ? `<span class="propNone">—</span>` : pct(v.consistency)}</td>
      <td class="num">${pct(v.fundedConsistency)}</td><td class="num">${pct(v.split)}</td><td class="num">${propRule(v.cap, "$")}</td>
      <td class="num">${v.per1k === null ? "—" : propUsd(Math.round(v.per1k))}</td>
      <td class="propRowActs"><button class="btn btn-sm ${picked ? "active" : ""}" data-action="prop-toggle-compare" data-id="${esc(p.id)}">${esc(T(picked ? "prop.compare.picked1" : "prop.compare.add"))}</button></td>
    </tr>`;
    const lastOfOpenGroup = grouped && open && total > GROUP_TOP && (!rows[i + 1] || rows[i + 1].p.firm !== p.firm);
    if (lastOfOpenGroup) html += `<tr class="propGroupMore"><td class="propStickyCol"></td><td colspan="${COLS - 1}"><button class="tinyBtn" data-action="prop-cat-expand" data-id="${esc(p.firm)}">${esc(T("prop.cat.collapseFirm"))}</button></td></tr>`;
  });
  return html + `</tbody></table></div>`;
}

function renderPropFirm(f, plans) {
  const faq = Array.isArray(f.faq) ? f.faq : [];
  const promo = f.promo && (f.promo.discount || f.promo.text);
  let html = `<div class="calendarPanel propPanel propFirm">
    <div class="propFirmHead"><span class="propRank ${propRankOf(f) <= 3 ? "top" : ""}">${propRankOf(f)}</span>${propFirmLogo(f)}<div class="propFirmName"><b>${esc(f.name)} ${propTierTag(f)}</b>
      <span>${esc(T("prop.cat.planCount", { n: plans.length }))}${f.website ? ` · <a href="${esc(f.website)}" target="_blank" rel="noopener">${esc(T("prop.cat.website"))}</a>` : ""}${f.source ? ` · <a href="${esc(f.source)}" target="_blank" rel="noopener">${esc(T("prop.cat.sourcePage"))}</a>` : ""}</span></div>
      ${f.review ? `<span class="propReview">${esc(f.review)}</span>` : ""}</div>
    ${promo ? `<div class="propBoardPromo propFirmPromo">${f.promo.discount ? `<b>${esc(T("prop.cat.off", { v: f.promo.discount }))}</b>` : ""}${f.promo.text ? `<span>${esc(f.promo.text)}</span>` : ""}</div>` : ""}
    ${Array.isArray(f.platforms) && f.platforms.length ? `<div class="propMuted">${esc(T("prop.cat.platforms", { v: listJoin(f.platforms) }))}</div>` : ""}
    ${f.notes ? `<details class="propMore propFirmNotes"><summary>${esc(T("prop.pc.firmNotes"))}</summary><div class="propNotes">${esc(f.notes)}</div></details>` : ""}`;
  if (!plans.length) html += `<div class="propMuted">${esc(T("prop.empty.filtered"))}</div>`;
  // 一个系列一段，段里是跟价格对比一样的卡片（同系列同规模的版本合成一张，用开关切）
  const families = [];
  plans.forEach((p) => { const fam = propFamilyOf(p); if (!families.includes(fam)) families.push(fam); });
  families.forEach((fam) => {
    const groups = propCardGroups(plans.filter((p) => propFamilyOf(p) === fam));
    html += `<div class="propSeries"><div class="propSeriesName">${esc(fam || T("prop.cat.noSeries"))}</div>
      <div class="propPcGrid">${groups.map((g) => propPlanCard2(g, [], true)).join("")}</div></div>`;
  });
  if (faq.length) {
    html += `<details class="propFaq"><summary>${esc(T("prop.cat.faq", { n: faq.length }))}</summary>${faq.map((q) => `<div class="propFaqItem">
      <div class="propFaqTopic">${esc(q.topic || "")}${q.status === "unclear" ? ` <span class="propUnknown">${esc(T("prop.cat.unclear"))}</span>` : ""}</div>
      <div>${esc(q.answer || "")}</div>${q.source ? `<a href="${esc(q.source)}" target="_blank" rel="noopener">${esc(T("prop.cat.source"))}</a>` : ""}</div>`).join("")}</details>`;
  }
  return html + `</div>`;
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
  if (m.type === "account") { ({ title, body, foot } = propAccountForm(m)); wide = 1080; }
  else if (m.type === "entry") ({ title, body, foot } = propEntryForm(m));
  else if (m.type === "status") ({ title, body, foot } = propStatusForm(m));
  else if (m.type === "detail") { ({ title, body, foot } = propDetail(m)); wide = "drawer"; }
  else if (m.type === "batch") ({ title, body, foot } = propBatchForm(m));
  else if (m.type === "balance") ({ title, body, foot } = propBalanceForm(m));
  else if (m.type === "import") { ({ title, body, foot } = propImportForm(m)); wide = true; }
  else if (m.type === "compare") { ({ title, body, foot } = propCompareView()); wide = true; }
  const drawer = wide === "drawer";
  // 抽屉只在第一次打开时滑进来，里面改东西重画时不再动
  if (drawer) setTimeout(() => { if (propModal === m) m.shown = true; }, 0);
  return `<div class="overlay ${drawer ? "propDrawerOverlay" : ""}" data-action="prop-dismiss-overlay">
    <div class="modal propModal ${drawer ? "propDrawer" + (m.shown ? "" : " anim") : ""}" style="max-width:${drawer ? 640 : typeof wide === "number" ? wide : wide ? 860 : 480}px;">
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

/* ---------- 记录购买 ----------
   左边一张实时预览卡片，右边一步步选：公司 → 系列 → 额度 → 可选项（日损 / 一致性 / 激活费 …）→ 价格 → 规则 → 账号。
   选中的组合就是目录里的一个计划，价格和规则从它带出来；用户可以改实付价、改任何一条规则，
   也可以完全手动填（目录里没有的公司 / 计划）。一次可以建几个一样的号（复制交易常见）。
   draft 字段：firmSel / family（"__custom" = 手动）/ size / want（各维度选的值）/ planId，
   amount（每个号实付）/ billing / monthly_fee / renewing / activation（none | now | later）/ activation_fee，
   rules（规则输入框的文字，见 PROP_RULE_FIELDS）/ ddType，quantity / nickname / group_name / bought_on / status / note */
const PROP_MAX_QTY = 20;
function propDraftPlan(d) { return d.planId ? propFindPlan(d.planId) : null; }
function propDraftCustom(d) { return d.firmSel === "__custom" || d.family === "__custom"; }
/* 选中一个计划：价格、收费方式、激活费、规则都按它重新带一遍（之前手动改的会被覆盖） */
function propLoadPlan(d, plan) {
  d.planId = plan ? plan.id : null;
  if (!plan) return;
  const pr = plan.price || {};
  d.size = plan.size || null;
  d.want = propChoiceMap(plan);
  d.billing = pr.billing === "monthly" ? "monthly" : "one_time";
  d.amount = typeof pr.list === "number" ? pr.list : "";
  d.monthly_fee = d.billing === "monthly" && typeof pr.list === "number" ? pr.list : "";
  d.activation = typeof pr.activation === "number" && pr.activation > 0 ? "later" : "none";
  d.activation_fee = typeof pr.activation === "number" && pr.activation > 0 ? pr.activation : "";
  d.rules = propRuleTexts(plan);
  d.ddType = (plan.type === "instant" ? (plan.funded || {}).drawdownType : (plan.eval || {}).drawdownType) || "";
  d.status = plan.type === "instant" ? "funded" : "eval";
}
/* 换公司 / 换系列：额度尽量保持（没有这个额度就挑 50K，再没有就第一个），组合用目录里排第一的 */
function propPickFamily(d, family) {
  d.family = family;
  if (family === "__custom") {
    // 手动填：上一个计划带来的价格、激活费、规则都清掉，免得看着像目录数据
    Object.assign(d, { planId: null, want: {}, rules: propRuleTexts(null), ddType: "", amount: "", billing: "one_time", monthly_fee: "",
      activation: "none", activation_fee: "", status: d.type === "instant" ? "funded" : "eval" });
    return;
  }
  const plans = propFamilyPlans(d.firmSel, family);
  const sizes = propFamilySizes(plans);
  const size = sizes.includes(d.size) ? d.size : sizes.includes(50000) ? 50000 : sizes[0];
  propLoadPlan(d, propBestPlan(plans, size, d.want || {}) || plans[0] || null);
}
function propPickFirm(d, firmId) {
  d.firmSel = firmId;
  const fams = firmId === "__custom" ? [] : propFamilies(firmId);
  propPickFamily(d, fams.length ? fams[0] : "__custom");
}
function propNewAccountDraft(planId) {
  const plan = planId ? propFindPlan(planId) : null;
  const d = { firmSel: "", family: "", size: null, want: {}, planId: null, firm_name: "", plan_name: "", type: "evaluation",
    amount: "", billing: "one_time", monthly_fee: "", renewing: true, activation: "none", activation_fee: "",
    rules: propRuleTexts(null), ddType: "", quantity: 1, nickname: "", group_name: "", bought_on: todayStr(), status: "eval", note: "" };
  if (plan) { d.firmSel = plan.firm; d.family = propFamilyOf(plan); propLoadPlan(d, plan); }
  else propPickFirm(d, propFirms[0] ? propFirms[0].id : "__custom");
  return d;
}

/* 这份草稿最后会存成的计划快照（预览卡片也用它画） */
function propDraftSnapshot(d) {
  const plan = propDraftPlan(d);
  const custom = propDraftCustom(d);
  const firm = d.firmSel === "__custom" ? null : propFindFirm(d.firmSel);
  const base = plan && !custom ? plan : {
    id: null, firm: firm ? firm.id : null, series: String(d.plan_name || "").trim(), family: String(d.plan_name || "").trim(),
    size: Number(d.size) || null, type: d.type === "instant" ? "instant" : "evaluation", price: {}, eval: {}, funded: {}, payout: {}, choices: [],
  };
  const snap = propApplyRuleEdits(base, d.rules || {});
  const ddSec = snap.type === "instant" ? "funded" : "eval";
  snap[ddSec] = { ...(snap[ddSec] || {}), drawdownType: PROP_DD_TYPES.includes(d.ddType) ? d.ddType : null };
  const fee = d.activation === "none" ? 0 : (d.activation_fee === "" ? null : propMoney(d.activation_fee));
  snap.price = { ...(snap.price || {}), billing: d.billing, activation: fee, activationUpfront: d.activation === "now",
    paid: d.amount === "" ? null : propMoney(d.amount) };
  snap.edited = custom ? [] : propEditedRules(plan, d.rules || {});
  return snap;
}
function propDraftPlanName(d, snap) {
  if (propDraftCustom(d)) return String(d.plan_name || "").trim();
  const vals = (snap.choices || []).map((c) => c.value);
  return vals.length ? [propFamilyOf(snap), ...vals].join(" · ") : snap.series || propFamilyOf(snap);
}
function propDraftFirmName(d) {
  const firm = d.firmSel === "__custom" ? null : propFindFirm(d.firmSel);
  return firm ? firm.name : String(d.firm_name || "").trim();
}

/* ---------- 预览卡片 ---------- */
function propAccountPreview(d) {
  const snap = propDraftSnapshot(d);
  const firm = d.firmSel === "__custom" ? { name: d.firm_name || T("prop.form.customFirm") } : propFindFirm(d.firmSel) || { name: "" };
  const instant = snap.type === "instant";
  const ev = instant ? (snap.funded || {}) : (snap.eval || {});
  const po = snap.payout || {}, pr = snap.price || {};
  const ed = new Set(snap.edited);
  const edTag = (keys) => (keys.some((k) => ed.has(k)) ? `<em class="propEdited">${esc(T("prop.add.edited"))}</em>` : "");
  const cell = (label, value, sub, keys) => `<div class="propPvCell ${keys && keys.some((k) => ed.has(k)) ? "edited" : ""}"><span>${esc(label)}${edTag(keys || [])}</span><b>${value}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</div>`;
  const qty = Math.max(1, Math.min(PROP_MAX_QTY, Math.round(Number(d.quantity) || 1)));
  const paid = pr.paid;
  const list = propDraftCustom(d) ? null : ((propDraftPlan(d) || {}).price || {}).list;
  const config = [...(snap.choices || []).map((c) => c.value),
    d.activation === "none" ? T("prop.add.actNone") : d.activation === "now" ? T("prop.add.actNowShort") : T("prop.add.actLaterShort")];
  const actLine = d.activation === "none" ? T("prop.plan.noActivation")
    : T(d.activation === "now" ? "prop.add.actNowLine" : "prop.add.actLaterLine", { v: typeof pr.activation === "number" ? propUsd(pr.activation) : T("prop.rule.unknown") });
  return `<div class="propCard propPreview">
    <div class="propPvHead">${propFirmLogo(firm)}<div class="propFirmName"><b>${esc(firm.name || "—")}</b><span>${esc(propDraftPlanName(d, snap) || T("prop.add.noPlan"))}</span></div>
      ${qty > 1 ? `<span class="propPvQty">× ${qty}</span>` : ""}</div>
    <div class="propPvMain">
      <div><div class="propMiniLabel">${esc(T(instant ? "prop.add.fundedSize" : "prop.add.evalSize"))}</div>
        <div class="propPvSize">${esc(propSizeLabel(snap.size) || "—")}</div>
        ${snap.size ? `<div class="propMuted">$${Number(snap.size).toLocaleString("en-US")} USD</div>` : ""}</div>
      <div class="propPvPrice"><div><b>${paid === null || paid === undefined ? esc(T("prop.add.noPrice")) : propUsd(paid)}</b>
        <span>${esc(propBillingLabel(d.billing))}</span></div>
        ${typeof list === "number" && paid !== list && paid !== null ? `<div class="propMuted">${esc(T("prop.add.catalogPrice", { v: propUsd(list) }))}</div>` : ""}
        <div class="propMuted">${esc(actLine)}</div>
        ${qty > 1 && typeof paid === "number" ? `<div class="propPvTotal">${esc(T("prop.add.total", { n: qty, v: propUsd(paid * qty) }))}</div>` : ""}</div>
    </div>
    ${config.length ? `<div class="propPvConfig"><span>${esc(T("prop.add.config"))}</span><b>${esc(config.join(" · "))}</b></div>` : ""}
    <div class="propPvGrid">
      ${instant ? cell(T("prop.rule.target"), `<span class="propNone">${esc(T("prop.plan.instant"))}</span>`) : cell(T("prop.rule.target"), propRule(ev.target, "$"), "", ["target"])}
      ${cell(T("prop.rule.drawdown"), propRule(ev.drawdown, "$"), propDdType(ev.drawdownType), instant ? ["fundedDrawdown"] : ["drawdown"])}
      ${cell(T("prop.rule.dll"), propRule(ev.dll, "$"), "", instant ? ["fundedDll"] : ["dll"])}
      ${instant ? cell(T("prop.rule.fundedConsistency"), propRule((snap.funded || {}).consistency, "%"), "", ["fundedConsistency"]) : cell(T("prop.rule.consistency"), propRule(ev.consistency, "%"), "", ["consistency"])}
      ${cell(T("prop.rule.split"), propRule(po.split, "%"), "", ["split"])}
      ${cell(T("prop.cmp.payoutCap"), propRule(po.cap, "$"), typeof po.min === "number" ? T("prop.add.payoutMin", { v: propUsd(po.min) }) : "", ["cap"])}
    </div>
    ${!instant ? `<div class="propPvFunded">${esc(T("prop.add.fundedLine"))}
      ${esc(T("prop.rule.drawdown"))} <b>${propRule((snap.funded || {}).drawdown, "$")}</b> ·
      ${esc(T("prop.rule.dll"))} <b>${propRule((snap.funded || {}).dll, "$")}</b> ·
      ${esc(T("prop.add.consistency"))} <b>${propRule((snap.funded || {}).consistency, "%")}</b></div>` : ""}
    ${propLongRules(snap).length ? `<details class="propMore"><summary>${esc(T("prop.add.fullRules"))}</summary>${propLongRulesHtml(snap)}${snap.notes ? `<div class="propNotes">${esc(snap.notes)}</div>` : ""}</details>` : ""}
    <div class="propPvFoot"><span>${esc(T(snap.edited.length ? "prop.add.editedFoot" : "prop.add.liveFoot", { n: snap.edited.length }))}</span>
      ${(snap.sources || []).length ? `<a href="${esc(snap.sources[snap.sources.length - 1])}" target="_blank" rel="noopener">${esc(T("prop.cat.source"))}</a>` : ""}</div>
  </div>`;
}

/* ---------- 右边的表单 ---------- */
function propOptBtns(action, items) {
  return `<div class="propOptBtns">${items.map((it) => `<button type="button" class="propOptBtn ${it.on ? "on" : ""}" data-action="${action}" ${it.attrs || ""} ${it.disabled ? "disabled" : ""}>
    <span>${esc(it.label)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</button>`).join("")}</div>`;
}
function propAccountForm(m) {
  const d = m.draft;
  const custom = propDraftCustom(d);
  const plan = propDraftPlan(d);
  const firmOpts = [...propFirms.map((f) => [f.id, f.name]), ["__custom", T("prop.form.customFirm")]];
  let pick = `<div class="propRow">${propField(T("prop.form.firm"), propSelect("firmSel", d.firmSel, firmOpts, true))}`;
  if (d.firmSel === "__custom") pick += propField(T("prop.form.firmName"), propInput("firm_name", d.firm_name, `placeholder="Lucid / Topstep …" maxlength="60" data-prop-rerender`));
  else pick += propField(T("prop.add.family"), propSelect("family", d.family, [...propFamilies(d.firmSel).map((f) => [f, f]), ["__custom", T("prop.form.customPlan")]], true));
  pick += `</div>`;
  if (custom) {
    pick += `<div class="propRow">${propField(T("prop.form.planName"), propInput("plan_name", d.plan_name, `placeholder="Flex / Combine …" maxlength="60" data-prop-rerender`))}
      ${propField(T("prop.form.size"), propInput("size", d.size || "", `type="number" min="0" step="1000" placeholder="50000" data-prop-rerender`))}</div>
      ${propField(T("prop.cmp.type"), propSelect("type", d.type, [["evaluation", T("prop.plan.evaluation")], ["instant", T("prop.plan.instant")]], true))}`;
  } else {
    const plans = propFamilyPlans(d.firmSel, d.family);
    const cur = plan && typeof (plan.price || {}).list === "number" ? plan.price.list : null;
    const priceOf = (p) => (p && typeof (p.price || {}).list === "number" ? p.price.list : null);
    // 可选项按钮上标差价（相对现在选中的），额度按钮上直接标价格（不同额度差太多，差价没意义）
    const delta = (p) => {
      const v = priceOf(p);
      if (v === null || cur === null || p.id === d.planId) return "";
      return v === cur ? T("prop.add.samePrice") : (v > cur ? "+" : "−") + propUsd(Math.abs(v - cur));
    };
    const sizes = propFamilySizes(plans);
    pick += `<div class="field"><div class="fieldLabel propLabelRow">${esc(T("prop.add.size"))}<span>${esc(T("prop.add.sizeHint"))}</span></div>
      ${propOptBtns("prop-add-size", sizes.map((s) => {
        const p = propBestPlan(plans, s, d.want || {});
        return { label: propSizeLabel(s) || T("prop.add.noSize"), on: s === (d.size || null), attrs: `data-val="${esc(s === null ? "" : s)}"`, sub: priceOf(p) === null ? "" : propUsd(priceOf(p)) };
      }))}</div>`;
    propFamilyAxes(plans).forEach(({ axis, values }) => {
      pick += `<div class="field"><div class="fieldLabel">${esc(axis)}</div>${propOptBtns("prop-add-choice", values.map((v) => {
        const p = propBestPlan(plans, d.size || null, { ...(d.want || {}), [axis]: v }, axis);
        return { label: v, on: (d.want || {})[axis] === v, disabled: !p, attrs: `data-axis="${esc(axis)}" data-val="${esc(v)}"`,
          sub: !p ? T("prop.add.noCombo") : (d.want || {})[axis] === v ? "" : delta(p) };
      }))}</div>`;
    });
    if (!propFamilyAxes(plans).length) pick += `<div class="propHint">${esc(T("prop.add.noOptions"))}</div>`;
  }

  const price = `<div class="propRow">${propField(T("prop.add.paidEach"), propInput("amount", d.amount, `type="number" min="0" step="0.01" placeholder="${esc(T("prop.add.pricePending"))}" data-prop-rerender`), T("prop.form.paidHint"))}
      ${propField(T("prop.form.billing"), propSelect("billing", d.billing, [["one_time", T("prop.billing.one_time")], ["monthly", T("prop.billing.monthly")]], true))}</div>
    ${d.billing === "monthly" ? `<div class="propRow">${propField(T("prop.form.monthlyFee"), propInput("monthly_fee", d.monthly_fee, `type="number" min="0" step="0.01"`))}
      <div class="field propCheckField">${propCheck("renewing", d.renewing, T("prop.form.renewing"), true)}<div class="propHint">${esc(T("prop.form.renewingHint"))}</div></div></div>` : ""}
    ${propBackfillField(d)}
    <div class="propRow">${propField(T("prop.add.activation"), propSelect("activation", d.activation, [["none", T("prop.add.actNone")], ["later", T("prop.add.actLater")], ["now", T("prop.add.actNow")]], true))}
      ${d.activation === "none" ? "<div></div>" : propField(T("prop.add.activationFee"), propInput("activation_fee", d.activation_fee, `type="number" min="0" step="0.01" data-prop-rerender`))}</div>
    <div class="propHint" style="margin-top:-6px;margin-bottom:10px;">${esc(T(d.activation === "now" ? "prop.add.actNowHint" : d.activation === "later" ? "prop.add.actLaterHint" : "prop.add.actNoneHint"))}</div>`;

  const instant = custom ? d.type === "instant" : plan && plan.type === "instant";
  const edited = new Set(custom ? [] : propEditedRules(plan, d.rules || {}));
  const ruleInput = (k, label) => `<div class="${edited.has(k) ? "propRuleEdited" : ""}">${propField(label + (edited.has(k) ? " · " + T("prop.add.edited") : ""),
    propInput("r:" + k, (d.rules || {})[k], `placeholder="${esc(T("prop.rule.unknown"))}" data-prop-rerender`))}</div>`;
  const ruleRows = [
    ...(instant ? [] : [["target", T("prop.rule.target")], ["drawdown", T("prop.rule.drawdown")], ["dll", T("prop.rule.dll")], ["consistency", T("prop.rule.consistency")]]),
    ["fundedDrawdown", T("prop.rule.fundedDrawdown")], ["fundedDll", T("prop.rule.fundedDll")], ["fundedConsistency", T("prop.rule.fundedConsistency")],
    ["split", T("prop.rule.split")], ["cap", T("prop.cmp.payoutCap")],
  ];
  const rules = `<details class="propAddRules" ${custom || edited.size || m.rulesOpen ? "open" : ""} data-prop-details="rulesOpen">
    <summary>${esc(T("prop.add.rules"))}${edited.size ? ` <span class="propEdited">${esc(T("prop.add.editedN", { n: edited.size }))}</span>` : ""}</summary>
    <div class="propHint" style="margin-bottom:10px;">${esc(T("prop.add.rulesHint"))}</div>
    <div class="propRow">${propField(T("prop.cmp.ddType"), propSelect("ddType", d.ddType, [["", T("prop.rule.unknown")], ...PROP_DD_TYPES.map((t) => [t, T("prop.dd." + t)])], true))}<div></div></div>
    <div class="propRuleGrid">${ruleRows.map(([k, label]) => ruleInput(k, label)).join("")}</div>
    ${edited.size ? `<button class="btn btn-sm" data-action="prop-add-reset-rules">${esc(T("prop.add.resetRules"))}</button>` : ""}
  </details>`;

  const account = `<div class="propRow">${propField(T("prop.add.quantity"), propInput("quantity", d.quantity, `type="number" min="1" max="${PROP_MAX_QTY}" step="1" data-prop-rerender`), T("prop.add.quantityHint"))}
      ${propField(T("prop.form.boughtOn"), propInput("bought_on", d.bought_on, `type="date" data-prop-rerender`))}</div>
    <div class="propRow">${propField(T("prop.form.nickname"), propInput("nickname", d.nickname, `maxlength="60" placeholder="${esc(T("prop.form.optional"))}"`), Number(d.quantity) > 1 ? T("prop.add.nicknameMany") : "")}
      ${propField(T("prop.form.group"), propInput("group_name", d.group_name, `maxlength="40" list="propGroupList" placeholder="${esc(T("prop.form.optional"))}"`), T("prop.form.groupHint"))}</div>
    <datalist id="propGroupList">${propGroups().map((g) => `<option value="${esc(g)}">`).join("")}</datalist>
    ${propField(T("prop.form.startStatus"), propSelect("status", d.status, [["eval", T("prop.status.eval")], ["passed", T("prop.status.passed")], ["funded", T("prop.status.funded")]]))}
    ${propField(T("prop.form.note"), `<textarea class="input" data-prop-field="note" rows="2" maxlength="500">${esc(d.note)}</textarea>`)}`;

  const step = (n, title, html) => `<div class="propCard propAddStep"><div class="propAddStepHead"><b>${esc(title)}</b><span>${n}</span></div>${html}</div>`;
  const body = `<div class="propAddGrid">
    <div class="propAddPreview">${propAccountPreview(d)}</div>
    <div class="propAddForm">${step("01", T("prop.add.step1"), pick)}${step("02", T("prop.add.step2"), price + rules)}${step("03", T("prop.add.step3"), account)}</div>
  </div>`;
  const qty = Math.max(1, Math.min(PROP_MAX_QTY, Math.round(Number(d.quantity) || 1)));
  return { title: esc(T("prop.acc.new")), body,
    foot: propFootButtons("prop-save-account", qty > 1 ? T("prop.add.saveN", { n: qty }) : T("common.save")) };
}

/* 补录以前买的月付号：购买日到今天之间该扣的月费要不要一次补记。默认不补（补录老号时一下冒出一串月费很吓人），用户自己选 */
function propDraftDueRenewals(d) {
  if (d.billing !== "monthly" || !d.renewing || !d.bought_on) return [];
  return propDueRenewals({ billing: "monthly", renewing: true, monthly_fee: propMoney(d.monthly_fee) || 1, bought_on: d.bought_on, renewed_through: null }, todayStr());
}
function propBackfillField(d) {
  const due = propDraftDueRenewals(d);
  if (!due.length) return "";
  const fee = propMoney(d.monthly_fee);
  return `<div class="propBackfill">
    <div><b>${esc(T("prop.add.backfillTitle", { n: due.length, from: due[0].slice(0, 7), to: due[due.length - 1].slice(0, 7) }))}</b>
      <div class="propHint">${esc(T("prop.add.backfillHint"))}</div></div>
    ${propOptBtns("prop-add-backfill", [
      { label: T("prop.add.backfillNone"), on: d.backfill !== "all", attrs: `data-val="none"` },
      { label: T("prop.add.backfillAll", { n: due.length }), sub: fee ? propUsd(fee * due.length) : "", on: d.backfill === "all", attrs: `data-val="all"` },
    ])}</div>`;
}
async function propSaveNewAccount() {
  const d = propModal.draft;
  const firm = d.firmSel === "__custom" ? null : propFindFirm(d.firmSel);
  const firmName = propDraftFirmName(d);
  if (!firmName) { propModal.error = T("prop.form.needFirm"); propRenderModal(); return; }
  if (!d.bought_on) { propModal.error = T("prop.form.needDate"); propRenderModal(); return; }
  const snap = propDraftSnapshot(d);
  const plan = propDraftCustom(d) ? null : propDraftPlan(d);
  const planName = propDraftPlanName(d, snap);
  const qty = Math.max(1, Math.min(PROP_MAX_QTY, Math.round(Number(d.quantity) || 1)));
  const monthly = d.billing === "monthly";
  const base = String(d.nickname || "").trim();
  const fallback = [firmName, propSizeLabel(snap.size)].filter(Boolean).join(" ");
  const accounts = Array.from({ length: qty }, (_, i) => ({
    id: propNewId("pa"), firm_id: firm ? firm.id : null, firm_name: firmName,
    plan_id: plan ? plan.id : null, plan_name: planName, size: snap.size || null,
    // 一次建好几个：昵称后面编号，没填昵称就用「公司 规模 #n」
    nickname: qty > 1 ? `${base || fallback} #${i + 1}` : base, group_name: String(d.group_name || "").trim(),
    status: d.status, events: [{ to: d.status, day: d.bought_on }], bought_on: d.bought_on, billing: d.billing,
    monthly_fee: monthly ? propMoney(d.monthly_fee) : null, renewing: monthly && !!d.renewing && d.status === "eval",
    // 不补记：水位直接挪到最近一次该扣的日子，以后的照常自动记
    renewed_through: d.backfill === "all" ? null : (propDraftDueRenewals(d).pop() || null),
    plan_snapshot: snap, note: String(d.note || "").trim(),
  }));
  propModal.busy = true; propRenderModal();
  let ok = true;
  for (const acc of accounts) { if (!(ok = await propSaveAccount(acc))) break; }
  const entries = [];
  if (ok) accounts.forEach((acc) => {
    if (propMoney(d.amount) > 0) entries.push({ account_id: acc.id, kind: "purchase", amount: d.amount, day: d.bought_on });
    // 激活费「现在一起付」：跟购买同一天记；「通过后再付」等改状态时再记（那时会带出这个金额）
    if (d.activation === "now" && propMoney(d.activation_fee) > 0) entries.push({ account_id: acc.id, kind: "activation", amount: d.activation_fee, day: d.bought_on });
  });
  if (ok && entries.length) ok = await propSaveEntries(entries);
  // 买的时候已经过了几个月（补记以前的账号）：这期间的月费一次补上，用户不对再删
  if (ok) await propApplyRenewals();
  if (!ok) { propModal.busy = false; propModal.error = propError; propRenderModal(); return; }
  propError = null;
  if (qty === 1) propModal = { type: "detail", id: accounts[0].id };
  else { propModal = null; propView = "accounts"; }
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

/* ---------- 账号详情（右侧抽屉） ----------
   看到的都能直接改：账号信息是常开的表单（改完点保存），时间线上每一步的日期点了就能改，流水每行有编辑 / 删除。
   删除账号放在顶部，删了以后底部有「撤销」 */
function propDetailDraft(acc) {
  return { nickname: acc.nickname || "", group_name: acc.group_name || "", firm_name: acc.firm_name || "", plan_name: acc.plan_name || "", size: acc.size || "",
    bought_on: acc.bought_on, billing: acc.billing, monthly_fee: acc.monthly_fee === null || acc.monthly_fee === undefined ? "" : propMoney(acc.monthly_fee),
    renewing: !!acc.renewing, status: acc.status, note: acc.note || "" };
}
function propDetailDirty(acc, d) {
  const now = propDetailDraft(acc);
  return Object.keys(now).some((k) => String(now[k]) !== String(d[k]));
}
function propDetail(m) {
  const acc = propAccounts.find((a) => a.id === m.id);
  if (!acc) return { title: "", body: `<div class="propMuted">${esc(T("prop.acc.gone"))}</div>`, foot: "" };
  const ro = propReadOnly();
  if (!m.draft) m.draft = propDetailDraft(acc);
  const list = propEntriesOf(acc.id).slice().sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  const s = propSum(list);
  const title = `${esc(propAccountTitle(acc))} ${propStatusPill(acc.status)}`;
  let body = `<div class="propDrawerSub"><span>${esc([acc.firm_name, acc.plan_name, propSizeLabel(acc.size)].filter(Boolean).join(" · "))}${acc.group_name ? " · # " + esc(acc.group_name) : ""}</span>
    ${ro ? "" : m.confirmDelete
      ? `<span class="propDelConfirm">${esc(T("prop.acc.deleteConfirm"))}<button class="btn btn-sm btn-danger" data-action="prop-delete-account" data-id="${esc(acc.id)}">${esc(T("prop.acc.deleteYes"))}</button><button class="btn btn-sm" data-action="prop-cancel-delete">${esc(T("common.cancel"))}</button></span>`
      : `<button class="btn btn-sm propDelBtn" data-action="prop-ask-delete-account">${ICONS.trash} ${esc(T("prop.acc.delete"))}</button>`}</div>`;
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
      <button class="btn btn-sm" data-action="prop-open-balance" data-id="${esc(acc.id)}">${esc(T("prop.bal.add"))}</button>
    </div>`;
  }
  body += propBalanceBlock(acc);
  if (acc.renewing) body += `<div class="propHint" style="margin-bottom:10px;">${esc(T("prop.acc.renewingLine", { v: propUsd(propMoney(acc.monthly_fee)), d: propNextRenewal(acc) }))}</div>`;

  // 时间线：日期直接改（第一步就是购买日，改它等于改购买日期，购买那笔账一起挪）
  const events = acc.events || [];
  if (events.length) {
    body += `<div class="propMiniLabel">${esc(T("prop.acc.timeline"))}</div><div class="propTimeline propTimelineEdit">${events.map((ev, i) =>
      `<div>${ro ? `<span>${esc(ev.day)}</span>` : `<input type="date" class="input propEvDate" value="${esc(ev.day)}" data-prop-event="${i}" data-id="${esc(acc.id)}" title="${esc(T("prop.acc.eventDateHint"))}">`}${propStatusPill(ev.to)}</div>`).join(`<span class="propEvArrow">›</span>`)}</div>`;
  }

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
  if (!ro) body += propInfoForm(m, acc);
  else if (acc.note) body += `<div class="propNotes">${esc(acc.note)}</div>`;
  if (acc.plan_snapshot) {
    const p = acc.plan_snapshot;
    body += `<details class="propMore propSnapshot"><summary>${esc(T("prop.acc.snapshot", { d: p.checkedAt || acc.bought_on }))}</summary>${propPriceHtml(p)}${propRulesDl([...propKeyRules(p), ...propMoreRules(p)])}${propLongRulesHtml(p)}${p.notes ? `<div class="propNotes">${esc(p.notes)}</div>` : ""}</details>`;
  }
  return { title, body, foot: "" };
}
/* 账号信息：常开的表单，有改动才亮「保存」 */
function propInfoForm(m, acc) {
  const d = m.draft;
  const dirty = propDetailDirty(acc, d);
  let html = `<div class="propInfoBox"><div class="propMiniLabel">${esc(T("prop.acc.info"))}</div>
    <div class="propRow">${propField(T("prop.form.nickname"), propInput("nickname", d.nickname, `maxlength="60" data-prop-rerender`))}
    ${propField(T("prop.form.group"), propInput("group_name", d.group_name, `maxlength="40" list="propGroupList" data-prop-rerender`))}</div>
    <datalist id="propGroupList">${propGroups().map((g) => `<option value="${esc(g)}">`).join("")}</datalist>
    <div class="propRow">${propField(T("prop.form.firmName"), propInput("firm_name", d.firm_name, `maxlength="60" data-prop-rerender`))}
    ${propField(T("prop.form.planName"), propInput("plan_name", d.plan_name, `maxlength="60" data-prop-rerender`))}</div>
    <div class="propRow">${propField(T("prop.form.size"), propInput("size", d.size, `type="number" min="0" step="1000" data-prop-rerender`))}
    ${propField(T("prop.form.boughtOn"), propInput("bought_on", d.bought_on, `type="date" data-prop-rerender`), T("prop.acc.boughtOnHint"))}</div>
    <div class="propRow">${propField(T("prop.form.billing"), propSelect("billing", d.billing, [["one_time", T("prop.billing.one_time")], ["monthly", T("prop.billing.monthly")]], true))}
    ${propField(T("prop.form.statusFix"), propSelect("status", d.status, PROP_STATUSES.map((s) => [s, T("prop.status." + s)]), true), T("prop.form.statusFixHint"))}</div>`;
  if (d.billing === "monthly") {
    html += `<div class="propRow">${propField(T("prop.form.monthlyFee"), propInput("monthly_fee", d.monthly_fee, `type="number" min="0" step="0.01" data-prop-rerender`))}
      <div class="field propCheckField">${propCheck("renewing", d.renewing, T("prop.form.renewing"), true)}<div class="propHint">${esc(T("prop.form.renewingEditHint"))}</div></div></div>`;
  }
  html += propField(T("prop.form.note"), `<textarea class="input" data-prop-field="note" data-prop-rerender rows="2" maxlength="500">${esc(d.note)}</textarea>`);
  html += `<div class="propEditFoot"><span class="propMuted">${esc(T(dirty ? "prop.acc.unsaved" : "prop.acc.saved"))}</span><span style="flex:1"></span>
    ${dirty ? `<button class="btn btn-sm" data-action="prop-cancel-edit">${esc(T("prop.acc.revert"))}</button>` : ""}
    <button class="btn btn-primary btn-sm" data-action="prop-save-edit" ${dirty && !m.busy ? "" : "disabled"}>${esc(T(m.busy ? "common.saving" : "common.save"))}</button></div></div>`;
  return html;
}
/* 改购买日期：时间线第一步、购买当天记的那几笔（购买 / 一起付的激活费）跟着挪 */
function propMoveBoughtOn(acc, next, day) {
  const old = acc.bought_on;
  if (!day || day === old) return [];
  next.bought_on = day;
  next.events = (next.events || acc.events || []).map((ev, i) => (i === 0 && ev.day === old ? { ...ev, day } : ev));
  return propEntriesOf(acc.id).filter((e) => e.day === old && (e.kind === "purchase" || e.kind === "activation")).map((e) => ({ ...e, day }));
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
    billing: d.billing, monthly_fee: monthly ? propMoney(d.monthly_fee) : null, renewing, note: String(d.note || "").trim() };
  // 刚打开续费：从今天起算，不补记关着的那段
  if (renewing && !acc.renewing) next.renewed_through = todayStr();
  if (d.status !== acc.status) { next.status = d.status; next.events = [...(acc.events || []), { to: d.status, day: todayStr() }]; }
  const moved = propMoveBoughtOn(acc, next, d.bought_on);
  m.busy = true; propRenderModal();
  let ok = await propSaveAccount(next);
  if (ok && moved.length) ok = await propSaveEntries(moved);
  m.busy = false;
  if (!ok) { m.error = propError; propRenderModal(); return; }
  propError = null; m.error = null; m.draft = null;
  propRenderModal(); render();
}
/* 时间线上改某一步的日期，直接存 */
async function propSaveEventDay(accId, i, day) {
  const acc = propAccounts.find((a) => a.id === accId);
  if (!acc || !day || !(acc.events || [])[i]) return;
  const next = { ...acc, events: acc.events.map((ev, k) => (k === i ? { ...ev, day } : ev)) };
  const moved = i === 0 ? propMoveBoughtOn(acc, next, day) : [];
  let ok = await propSaveAccount(next);
  if (ok && moved.length) ok = await propSaveEntries(moved);
  if (propModal && propModal.type === "detail") { propModal.draft = null; if (!ok) propModal.error = propError; }
  propRenderModal(); render();
}

/* ---------- 删除（可撤销） ----------
   删的时候把账号和它的流水留一份在内存里，底部提示条 10 秒内点「撤销」就原样写回去（id 不变） */
let propToastUndo = null, propToastTimer = null;
function propToast(msg, undo) {
  let el = document.getElementById("propToast");
  if (!el) { el = document.createElement("div"); el.id = "propToast"; document.body.appendChild(el); }
  el.className = "propToast show";
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button class="btn btn-sm" data-action="prop-toast-undo">${esc(T("prop.undo"))}</button>` : ""}`;
  propToastUndo = undo || null;
  clearTimeout(propToastTimer);
  propToastTimer = setTimeout(() => { el.className = "propToast"; propToastUndo = null; }, 10000);
}
function propHideToast() { const el = document.getElementById("propToast"); if (el) el.className = "propToast"; propToastUndo = null; }
async function propDeleteAccounts(ids) {
  const kept = ids.map((id) => ({ acc: propAccounts.find((a) => a.id === id), entries: propEntriesOf(id).map((e) => ({ ...e })) })).filter((x) => x.acc);
  let done = 0;
  for (const k of kept) { if (await propDeleteAccount(k.acc.id)) done++; else break; }
  render();
  if (!done) return false;
  propToast(T("prop.acc.deleted", { n: done }), async () => {
    for (const k of kept.slice(0, done)) {
      if (await propSaveAccount(k.acc)) await propSaveEntries(k.entries);
    }
    propToast(T("prop.acc.restored", { n: done }));
    render();
  });
  return true;
}

/* ---------- 批量操作 ----------
   「我的账号」里打开多选，勾几个号一起：改状态、各记一笔出金、改分组、删除（复制交易一组号常常一起过 / 一起爆） */
function propBatchForm(m) {
  const d = m.draft, accs = propSelected.map((id) => propAccounts.find((a) => a.id === id)).filter(Boolean);
  let body = `<div class="propMuted" style="margin-bottom:12px;">${esc(T("prop.batch.picked", { n: accs.length }))}：${esc(accs.slice(0, 6).map(propAccountTitle).join("、"))}${accs.length > 6 ? " …" : ""}</div>`;
  if (m.mode === "status") {
    body += `<div class="propRow">${propField(T("prop.batch.to"), propSelect("to", d.to, PROP_STATUSES.map((s) => [s, T("prop.status." + s)])))}
      ${propField(T("prop.col.day"), propInput("day", d.day, `type="date"`))}</div><div class="propHint">${esc(T("prop.batch.statusHint"))}</div>`;
  } else if (m.mode === "payout") {
    body += `<div class="propRow">${propField(T("prop.batch.each"), propInput("amount", d.amount, `type="number" min="0" step="0.01" placeholder="0"`))}
      ${propField(T("prop.col.day"), propInput("day", d.day, `type="date"`))}</div>
      <div class="propRow"><div class="field propCheckField">${propCheck("pending", d.pending, T("prop.entry.pendingLabel"))}</div><div></div></div>
      ${propField(T("prop.form.note"), propInput("note", d.note, `maxlength="200"`))}`;
  } else if (m.mode === "group") {
    body += propField(T("prop.form.group"), propInput("group_name", d.group_name, `maxlength="40" list="propGroupList" placeholder="${esc(T("prop.batch.groupClear"))}"`)) +
      `<datalist id="propGroupList">${propGroups().map((g) => `<option value="${esc(g)}">`).join("")}</datalist>`;
  } else if (m.mode === "delete") {
    body += `<div class="notice error">${ICONS.alert}<span>${esc(T("prop.batch.deleteWarn", { n: accs.length }))}</span></div>`;
  }
  return { title: esc(T("prop.batch." + m.mode)), body, foot: propFootButtons("prop-batch-save", m.mode === "delete" ? T("prop.acc.deleteYes") : null) };
}
async function propBatchSave() {
  const m = propModal, d = m.draft;
  const accs = propSelected.map((id) => propAccounts.find((a) => a.id === id)).filter(Boolean);
  if (!accs.length) return;
  if (m.mode === "delete") {
    m.busy = true; propRenderModal();
    const ok = await propDeleteAccounts(accs.map((a) => a.id));
    if (!ok) { m.busy = false; m.error = propError; propRenderModal(); return; }
    propSelected = []; propModal = null; propRenderModal(); render(); return;
  }
  if ((m.mode === "status" || m.mode === "payout") && !d.day) { m.error = T("prop.form.needDate"); propRenderModal(); return; }
  if (m.mode === "payout" && !(propMoney(d.amount) > 0)) { m.error = T("prop.entry.needAmount"); propRenderModal(); return; }
  m.busy = true; propRenderModal();
  let ok = true;
  if (m.mode === "status") {
    for (const a of accs) { if (a.status !== d.to && !(ok = await propChangeStatus(a, d.to, d.day))) break; }
  } else if (m.mode === "payout") {
    ok = await propSaveEntries(accs.map((a) => ({ account_id: a.id, kind: "payout", amount: d.amount, day: d.day, pending: !!d.pending, note: d.note || "" })));
  } else if (m.mode === "group") {
    for (const a of accs) { if (!(ok = await propSaveAccount({ ...a, group_name: String(d.group_name || "").trim() }))) break; }
  }
  if (!ok) { m.busy = false; m.error = propError; propRenderModal(); return; }
  propError = null; propModal = null;
  propToast(T("prop.batch.done", { n: accs.length }));
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
    : `<div class="tableScroll"><table class="adminTable propTable propCmp"><tbody>${rows.map(([label, fn]) => {
        // 几个计划这一项不一样的行高亮，一眼看出差在哪
        const cells = plans.map(fn);
        return `<tr class="${plans.length > 1 && new Set(cells).size > 1 ? "propCmpDiff" : ""}"><th>${esc(label)}</th>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
      }).join("")}
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
  else if (a === "prop-year") { propYear += Number(el.dataset.d); propYearTouched = true; render(); }
  else if (a === "prop-month") { propMonth = Number(el.dataset.m); render(); }
  else if (a === "prop-cat-firm") {
    // 从对比表的某一行进来的，公司页先只显示那个规模
    propCatalogFirm = el.dataset.val; propCatalogFirmSize = el.dataset.size || "";
    render(); window.scrollTo({ top: 0 });
  }
  else if (a === "prop-cat-firm-size") { propCatalogFirmSize = el.dataset.val; render(); }
  else if (a === "prop-cat-size") { propCatalogSize = el.dataset.val; render(); }
  else if (a === "prop-cat-pref") {
    const k = el.dataset.val;
    propCatalogPrefs = propCatalogPrefs.includes(k) ? propCatalogPrefs.filter((x) => x !== k) : [...propCatalogPrefs, k];
    render();
  }
  else if (a === "prop-cat-layout") { propCatalogLayout = el.dataset.val; try { localStorage.setItem("journal_prop_layout", propCatalogLayout); } catch (err) {} render(); }
  else if (a === "prop-card-pick") { if (id) { propCardPick = { ...propCardPick, [el.dataset.key]: id }; render(); } }
  else if (a === "prop-cat-sort") { propCatalogSort = el.dataset.val; render(); }
  else if (a === "prop-board-all") { propBoardAll = !propBoardAll; render(); }
  else if (a === "prop-cat-expand") {
    propExpandedFirms = propExpandedFirms.includes(id) ? propExpandedFirms.filter((x) => x !== id) : [...propExpandedFirms, id];
    render();
  }
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
  else if (a === "prop-add-size" || a === "prop-add-choice") {
    const d = m.draft, plans = propFamilyPlans(d.firmSel, d.family);
    const size = a === "prop-add-size" ? (el.dataset.val === "" ? null : Number(el.dataset.val)) : (d.size || null);
    const want = a === "prop-add-choice" ? { ...(d.want || {}), [el.dataset.axis]: el.dataset.val } : (d.want || {});
    const p = propBestPlan(plans, size, want, a === "prop-add-choice" ? el.dataset.axis : null);
    if (p) propLoadPlan(d, p);
    propRenderModal();
  }
  else if (a === "prop-add-backfill") { m.draft.backfill = el.dataset.val; propRenderModal(); }
  else if (a === "prop-add-reset-rules") { const p = propDraftPlan(m.draft); m.draft.rules = propRuleTexts(p); propRenderModal(); }
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
    // 添加账号时选了「激活费现在一起付」的，激活那一步已经记过了，不再带出来
    const paidUpfront = feeKey === "activation" && snap.activationUpfront;
    const fee = feeKey && !paidUpfront && typeof snap[feeKey] === "number" ? snap[feeKey] : "";
    propModal = { type: "status", accountId: id, step, to: el.dataset.to, back: { type: "detail", id }, draft: { day: todayStr(), fee } };
    propRenderModal();
  }
  else if (a === "prop-save-status") { await propSaveStatus(); }
  else if (a === "prop-cancel-edit") { m.draft = null; m.error = null; propRenderModal(); }
  else if (a === "prop-save-edit") { await propSaveEdit(); }
  else if (a === "prop-ask-delete-account") { m.confirmDelete = true; propRenderModal(); }
  else if (a === "prop-cancel-delete") { m.confirmDelete = false; propRenderModal(); }
  else if (a === "prop-delete-account") {
    m.busy = true; propRenderModal();
    const ok = await propDeleteAccounts([m.id]);
    if (ok) propModal = null; else { m.busy = false; m.error = propError; }
    propRenderModal(); render();
  }
  else if (a === "prop-delete-quick") { propCardMenu = null; await propDeleteAccounts([id]); }
  else if (a === "prop-card-menu") { propCardMenu = propCardMenu === id ? null : id; render(); }
  else if (a === "prop-toast-undo") { const undo = propToastUndo; propHideToast(); if (undo) await undo(); }
  /* ---------- 批量 ---------- */
  else if (a === "prop-batch-toggle") { propBatch = !propBatch; propSelected = []; propCardMenu = null; render(); }
  else if (a === "prop-batch-pick") { propSelected = propSelected.includes(id) ? propSelected.filter((x) => x !== id) : [...propSelected, id]; render(); }
  else if (a === "prop-batch-all") { propSelected = el.dataset.val === "all" ? el.dataset.ids.split(",").filter(Boolean) : []; render(); }
  else if (a === "prop-batch-open") {
    propModal = { type: "batch", mode: el.dataset.val, draft: { to: "passed", day: todayStr(), amount: "", pending: false, note: "", group_name: "" } };
    propRenderModal();
  }
  else if (a === "prop-batch-save") { await propBatchSave(); }
  else if (a === "prop-stack-toggle") { const k = el.dataset.val; propStacksOpen = propStacksOpen.includes(k) ? propStacksOpen.filter((x) => x !== k) : [...propStacksOpen, k]; render(); }
  else if (a === "prop-open-balance") {
    const acc = propAccounts.find((x) => x.id === id);
    if (!acc) return;
    propCardMenu = null;
    propModal = { type: "balance", accountId: id, back: m && m.type === "detail" ? { type: "detail", id } : null,
      draft: { balance: acc.balance === null || acc.balance === undefined ? "" : propMoney(acc.balance), day: todayStr() } };
    propRenderModal(); render();
  }
  else if (a === "prop-save-balance") { await propSaveBalance(); }
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
// 账号卡片的「⋯」菜单：点到菜单以外的地方就收起
document.addEventListener("click", (e) => {
  if (propCardMenu && !e.target.closest(".propMenu, [data-action='prop-card-menu']")) { propCardMenu = null; render(); }
}, true);
/* 表单字段写回 draft；「r:xxx」是添加账号里的规则输入框，写进 draft.rules */
function propSetDraftField(d, f, v) {
  if (f.startsWith("r:")) d.rules = { ...(d.rules || {}), [f.slice(2)]: v };
  else d[f] = v;
}
// 「改规则」那块折叠的开关记下来，弹窗重画后保持原样（toggle 事件不冒泡，用捕获）
document.addEventListener("toggle", (e) => {
  const k = e.target && e.target.dataset && e.target.dataset.propDetails;
  if (k && propModal) propModal[k] = e.target.open;
}, true);
document.addEventListener("input", (e) => {
  const f = e.target.dataset && e.target.dataset.propField;
  if (!f || !propModal || !propModal.draft) return;
  propSetDraftField(propModal.draft, f, e.target.type === "checkbox" ? e.target.checked : e.target.value);
  if (propModal.type === "import" && f === "text") propModal.check = null;
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.propCatSize !== undefined) { propCatalogSize = t.value; render(); return; }
  if (t.dataset && t.dataset.propEvent !== undefined) { propSaveEventDay(t.dataset.id, Number(t.dataset.propEvent), t.value); return; }
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
  propSetDraftField(d, f, t.type === "checkbox" ? t.checked : t.value);
  if (propModal.type === "account" && f === "firmSel") propPickFirm(d, d.firmSel);
  if (propModal.type === "account" && f === "family") propPickFamily(d, d.family);
  if (f === "billing" && d.billing === "monthly" && (d.monthly_fee === "" || d.monthly_fee === null) && d.amount !== undefined) d.monthly_fee = d.amount;
  propRenderModal();
});

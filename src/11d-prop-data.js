/* ============================================================
   PROP 账户 —— 目录格式、记账口径、读写
   页面在 11e-prop-view.js；表结构见 supabase/migrations/20261024000000_prop.sql

   ---------- 目录 JSON（管理员导入，整份替换）----------
   {
     "firms": [
       { "id": "lucid", "name": "Lucid Trading", "website": "https://...", "logo": "https://.../lucid.png",
         "source": "https://... 资料来源页", "review": "一句话评价", "platforms": ["Tradovate"],
         "notes": "写给人看的说明",
         "faq": [{ "topic": "出金方式", "answer": "...", "status": "confirmed" | "unclear", "source": "https://..." }] }
     ],
     "plans": [
       { "id": "lucid-flex-50k", "firm": "lucid", "series": "LucidFlex", "size": 50000, "status": "current" | "legacy",
         "type": "evaluation" | "instant",          // instant = 免考，直接是资金账号，eval 不填
         "price":  { "list": 99, "billing": "one_time" | "monthly", "activation": 0, "reset": 75,
                     "original": 199, "promoUntil": "10/31", "note": "价格说明" },   // list 是现在实际要付的价，original 是没打折的原价
         "eval":   { "target": 3000, "drawdown": 2000, "drawdownType": "eod" | "intraday" | "static",
                     "dll": "none", "consistency": 40, "minDays": null, "timeLimit": "none", "maxContracts": "4 mini" },
         "funded": { "drawdown": 2000, "drawdownType": "eod", "dll": "none", "consistency": "none",
                     "maxContracts": "4 mini", "staticAfter": "何时变静态回撤" },
         "payout": { "split": 90, "min": 500, "cap": 2000, "qualifyingDays": 5, "dayProfit": 150,
                     "buffer": "none", "frequency": "每 5 个合格盈利日", "live": "转 Live 的说明" },
         "options": [{ "name": "50% 一致性", "price": null, "note": "" }],
         "notes": "写给人看的说明", "sources": ["https://..."], "checkedAt": "2026-10-24" }
     ]
   }
   规则字段只有三种值：数字 = 具体值；"none" = 没有这项要求；null / 不写 = 还不知道。
   「没有」和「不知道」必须分开——混在一起的话，界面上没法区分「无日亏限制」和「没查到」。
   同一条规则只存一份；DLL、一致性加购这类可选配置写进 options，不要把所有组合展开成一堆计划。

   ---------- 记账口径 ----------
   金额一律美元、正数，方向看 kind：
     投入 = 购买 + 月费 + 重置 + 激活 + 其他 − 退款
     回报 = 已到账的出金（pending 的不算）
     ROI  = (回报 − 投入) ÷ 投入
   ============================================================ */
const PROP_STATUSES = ["eval", "passed", "funded", "failed", "blown", "closed"];
const PROP_ACTIVE = ["eval", "passed", "funded"];
const PROP_ENTRY_KINDS = ["purchase", "monthly", "reset", "activation", "payout", "refund", "other"];
const PROP_COST_KINDS = ["purchase", "monthly", "reset", "activation", "other"];
const PROP_DD_TYPES = ["eod", "intraday", "static"];

function propNewId(prefix) { return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function propMoney(v) { const n = Number(v); return isFinite(n) ? Math.round(n * 100) / 100 : 0; }

/* ---------- 目录校验 ----------
   导入前在浏览器里过一遍：结构不对直接拦下，不把半残的数据写进库。
   返回 { errors, warnings, catalog }；errors 非空就不能发布 */
function propIsRuleValue(v) { return v === null || v === undefined || v === "none" || (typeof v === "number" && isFinite(v)); }
function propValidateCatalog(raw) {
  const errors = [], warnings = [];
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.firms) || !Array.isArray(raw.plans)) {
    return { errors: [T("prop.import.errShape")], warnings, catalog: null };
  }
  const firmIds = new Set();
  const firms = raw.firms.map((f, i) => {
    const where = "firms[" + i + "]";
    if (!f || typeof f !== "object") { errors.push(where + ": " + T("prop.import.errObject")); return null; }
    const id = String(f.id || "").trim();
    if (!id) errors.push(where + ": " + T("prop.import.errNoId"));
    else if (firmIds.has(id)) errors.push(where + ": " + T("prop.import.errDupId", { id }));
    firmIds.add(id);
    if (!String(f.name || "").trim()) errors.push(where + ": " + T("prop.import.errNoName"));
    if (f.faq !== undefined && !Array.isArray(f.faq)) errors.push(where + ".faq: " + T("prop.import.errArray"));
    return { ...f, id, name: String(f.name || "").trim() };
  }).filter(Boolean);

  const planIds = new Set();
  const RULE_KEYS = {
    price: ["list", "activation", "reset", "original"],
    eval: ["target", "drawdown", "dll", "consistency", "minDays", "timeLimit"],
    funded: ["drawdown", "dll", "consistency"],
    payout: ["split", "min", "cap", "qualifyingDays", "dayProfit", "buffer"],
  };
  const plans = raw.plans.map((p, i) => {
    const where = "plans[" + i + "]";
    if (!p || typeof p !== "object") { errors.push(where + ": " + T("prop.import.errObject")); return null; }
    const id = String(p.id || "").trim();
    if (!id) errors.push(where + ": " + T("prop.import.errNoId"));
    else if (planIds.has(id)) errors.push(where + ": " + T("prop.import.errDupId", { id }));
    planIds.add(id);
    if (!firmIds.has(p.firm)) errors.push(where + ": " + T("prop.import.errFirm", { firm: p.firm }));
    if (p.size !== undefined && p.size !== null && !(Number.isInteger(p.size) && p.size > 0)) errors.push(where + ".size: " + T("prop.import.errSize"));
    if (p.status !== undefined && !["current", "legacy"].includes(p.status)) errors.push(where + ".status: current / legacy");
    if (p.type !== undefined && !["evaluation", "instant"].includes(p.type)) errors.push(where + ".type: evaluation / instant");
    Object.keys(RULE_KEYS).forEach((sec) => {
      const s = p[sec];
      if (s === undefined || s === null) return;
      if (typeof s !== "object" || Array.isArray(s)) { errors.push(where + "." + sec + ": " + T("prop.import.errObject")); return; }
      RULE_KEYS[sec].forEach((k) => {
        if (!propIsRuleValue(s[k])) errors.push(where + "." + sec + "." + k + ": " + T("prop.import.errRule", { v: JSON.stringify(s[k]) }));
      });
    });
    if (p.price && p.price.billing !== undefined && !["one_time", "monthly"].includes(p.price.billing)) errors.push(where + ".price.billing: one_time / monthly");
    ["eval", "funded"].forEach((sec) => {
      const t = p[sec] && p[sec].drawdownType;
      if (t !== undefined && t !== null && !PROP_DD_TYPES.includes(t)) errors.push(where + "." + sec + ".drawdownType: " + PROP_DD_TYPES.join(" / "));
    });
    if (p.options !== undefined && !Array.isArray(p.options)) errors.push(where + ".options: " + T("prop.import.errArray"));
    if (p.sources !== undefined && !Array.isArray(p.sources)) errors.push(where + ".sources: " + T("prop.import.errArray"));
    if (!p.price || p.price.list === undefined || p.price.list === null) warnings.push(T("prop.import.warnNoPrice", { id: id || where }));
    if (p.eval !== undefined && p.type === "instant") warnings.push(T("prop.import.warnInstantEval", { id: id || where }));
    return { ...p, id, series: String(p.series || "").trim(), status: p.status || "current" };
  }).filter(Boolean);
  return { errors, warnings, catalog: errors.length ? null : { firms, plans } };
}
/* 新旧目录比一比：哪些计划是新加的、改过的、没了的。比的是整份计划，字段顺序不同也算一样 */
function propStableJson(v) {
  if (Array.isArray(v)) return "[" + v.map(propStableJson).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ":" + propStableJson(v[k])).join(",") + "}";
  return JSON.stringify(v === undefined ? null : v);
}
function propCatalogDiff(oldPlans, newPlans) {
  const before = new Map(oldPlans.map((p) => [p.id, propStableJson(p)]));
  const after = new Set(newPlans.map((p) => p.id));
  const added = [], changed = [];
  newPlans.forEach((p) => {
    if (!before.has(p.id)) added.push(p.id);
    else if (before.get(p.id) !== propStableJson(p)) changed.push(p.id);
  });
  const removed = oldPlans.filter((p) => !after.has(p.id)).map((p) => p.id);
  return { added, changed, removed };
}
/* 库里的一行 → 跟导入格式一样的对象（导出 / 比较 / 快照都用这个形状） */
function propPlanFromRow(r) { return { ...(r.data || {}), id: r.id, firm: r.firm_id, series: r.series, size: r.size, status: r.status }; }
function propFirmFromRow(r) { return { ...(r.data || {}), id: r.id, name: r.name, website: r.website || "", logo: r.logo || "" }; }
function propCatalogExport() { return { firms: propFirms, plans: propPlans }; }
function propFindPlan(id) { return propPlans.find((p) => p.id === id) || null; }
function propFindFirm(id) { return propFirms.find((f) => f.id === id) || null; }

/* ---------- 口径 ---------- */
function propEntriesOf(accountId, entries) { return (entries || propEntries).filter((e) => e.account_id === accountId); }
function propSum(entries) {
  let spent = 0, received = 0, pending = 0, refund = 0;
  entries.forEach((e) => {
    const a = propMoney(e.amount);
    if (e.kind === "payout") { if (e.pending) pending += a; else received += a; }
    else if (e.kind === "refund") refund += a;
    else if (PROP_COST_KINDS.includes(e.kind)) spent += a;
  });
  spent = propMoney(spent - refund);
  received = propMoney(received);
  const net = propMoney(received - spent);
  return { spent, received, pending: propMoney(pending), refund: propMoney(refund), net, roi: spent > 0 ? (net / spent) * 100 : null };
}
/* 账号到过某个状态没有（看时间线，不只看现在）：考核过了又爆仓的账号，「通过」这一步还是算数的 */
function propReached(acc, status) { return acc.status === status || (acc.events || []).some((e) => e.to === status); }
function propIsActive(acc) { return PROP_ACTIVE.includes(acc.status); }
/* 漏斗：买了几个 → 通过 → 资金账号 → 出过金。
   通过率按「考核次数」算，只算有结果的：通过的账号各算一次，时间线上每一次「考核失败」也算一次
   （挂了重置再考，那次失败照样算数）；还在考的不算进分母 */
function propFunnel(accounts, entries) {
  const total = accounts.length;
  const passed = accounts.filter((a) => propReached(a, "passed") || propReached(a, "funded")).length;
  const funded = accounts.filter((a) => propReached(a, "funded")).length;
  const paid = accounts.filter((a) => propEntriesOf(a.id, entries).some((e) => e.kind === "payout" && !e.pending && propMoney(e.amount) > 0)).length;
  const fails = accounts.reduce((n, a) => n + Math.max((a.events || []).filter((e) => e.to === "failed").length, a.status === "failed" ? 1 : 0), 0);
  const decided = passed + fails;
  const spent = propSum(entries.filter((e) => accounts.some((a) => a.id === e.account_id))).spent;
  return { total, passed, funded, paid, decided, passRate: decided ? (passed / decided) * 100 : null, costPerFunded: funded ? propMoney(spent / funded) : null };
}
/* 按月：钱是哪天付的 / 哪天到的就算哪个月。待到账的出金不算 */
function propMonthly(entries, year) {
  const months = Array.from({ length: 12 }, () => ({ spent: 0, received: 0, net: 0, n: 0 }));
  entries.forEach((e) => {
    const d = String(e.day || "");
    if (!d.startsWith(year + "-")) return;
    const m = months[Number(d.slice(5, 7)) - 1];
    if (!m || (e.kind === "payout" && e.pending)) return;
    const a = propMoney(e.amount);
    if (e.kind === "payout") m.received += a;
    else if (e.kind === "refund") m.spent -= a;
    else m.spent += a;
    m.n++;
  });
  months.forEach((m) => { m.spent = propMoney(m.spent); m.received = propMoney(m.received); m.net = propMoney(m.received - m.spent); });
  return months;
}
function propEntryMonth(e) { return String(e.day || "").slice(0, 7); }

/* ---------- 月付订阅 ----------
   续费中的月付账号，每到购买日的同一天记一笔月费（31 号买的，小月记在月底）。
   renewed_through 是「已经记到哪天」的水位：删掉自动记的那笔不会被补回来，关掉续费再打开也不会补记中间那段 */
function propAddMonths(day, k) {
  const [y, m, d] = String(day).split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + k, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return first.toISOString().slice(0, 10);
}
function propDueRenewals(acc, today) {
  if (acc.billing !== "monthly" || !acc.renewing || !(propMoney(acc.monthly_fee) > 0) || !acc.bought_on) return [];
  const from = acc.renewed_through || acc.bought_on;
  const out = [];
  for (let k = 1; k < 600; k++) {
    const d = propAddMonths(acc.bought_on, k);
    if (d > today) break;
    if (d > from) out.push(d);
  }
  return out;
}
function propNextRenewal(acc) {
  const from = acc.renewed_through || acc.bought_on;
  for (let k = 1; k < 600; k++) { const d = propAddMonths(acc.bought_on, k); if (d > from) return d; }
  return "";
}

/* 账号显示名：自己起的昵称优先，没有就拼「公司 · 计划 · 规模」 */
function propSizeLabel(size) { return size ? (size % 1000 === 0 ? size / 1000 + "K" : String(size)) : ""; }
function propAccountTitle(acc) {
  if (acc.nickname) return acc.nickname;
  return [acc.firm_name, acc.plan_name, propSizeLabel(acc.size)].filter(Boolean).join(" · ") || T("prop.acc.untitled");
}
function propGroups() { return [...new Set(propAccounts.map((a) => a.group_name).filter(Boolean))].sort(); }
function propFirmNames() { return [...new Set(propAccounts.map((a) => a.firm_name).filter(Boolean))].sort(); }

/* ============================================================
   读写
   ============================================================ */
async function loadPropData() {
  if (!sb || !session) return;
  const uid = viewingUserId || session.user.id;
  propError = null;
  const [firms, plans, imp, accs, ents] = await Promise.all([
    fetchAllRows(() => sb.from("prop_firms").select("*", { count: "exact" }).order("sort_order", { ascending: true }).order("id", { ascending: true })),
    fetchAllRows(() => sb.from("prop_plans").select("*", { count: "exact" }).order("sort_order", { ascending: true }).order("id", { ascending: true })),
    sb.from("prop_catalog_imports").select("imported_at, summary").order("imported_at", { ascending: false }).limit(1),
    fetchAllRows(() => sb.from("prop_accounts").select("*", { count: "exact" }).eq("user_id", uid).order("bought_on", { ascending: false }).order("id", { ascending: true })),
    fetchAllRows(() => sb.from("prop_entries").select("*", { count: "exact" }).eq("user_id", uid).order("day", { ascending: true }).order("id", { ascending: true })),
  ]);
  const err = [firms, plans, imp, accs, ents].map((r) => r.error).find(Boolean);
  if (err) {
    console.error(err);
    propError = noteDbError(err) ? T("error.dbOutdated") : T("prop.loadFailed", { msg: err.message });
    return;
  }
  propFirms = (firms.data || []).map(propFirmFromRow);
  propPlans = (plans.data || []).map(propPlanFromRow);
  propCatalogInfo = (imp.data && imp.data[0]) || null;
  propAccounts = (accs.data || []).map((a) => ({ ...a, events: Array.isArray(a.events) ? a.events : [] }));
  propEntries = ents.data || [];
  if (!viewingUserId) await propApplyRenewals();
}
/* 打开页面时把该记的月费补上（一次写完，然后挪水位） */
async function propApplyRenewals() {
  const today = todayStr();
  for (const acc of propAccounts) {
    const due = propDueRenewals(acc, today);
    if (!due.length) continue;
    const rows = due.map((d) => ({ id: "pe_auto_" + acc.id + "_" + d, user_id: session.user.id, account_id: acc.id, kind: "monthly",
      amount: propMoney(acc.monthly_fee), day: d, pending: false, note: T("prop.entry.autoMonthly") }));
    const { error } = await sb.from("prop_entries").upsert(rows);
    if (error) { console.error(error); propError = T("prop.saveFailed", { msg: error.message }); return; }
    rows.forEach((r) => { if (!propEntries.some((e) => e.id === r.id)) propEntries.push({ ...r, created_at: new Date().toISOString() }); });
    await propSaveAccount({ ...acc, renewed_through: due[due.length - 1] });
  }
}
function propAccountRow(a) {
  return {
    id: a.id, user_id: session.user.id,
    firm_id: a.firm_id || null, firm_name: a.firm_name || "", plan_id: a.plan_id || null, plan_name: a.plan_name || "",
    size: a.size ? Number(a.size) : null, nickname: a.nickname || "", group_name: a.group_name || "",
    status: PROP_STATUSES.includes(a.status) ? a.status : "eval", events: a.events || [],
    bought_on: a.bought_on || todayStr(), billing: a.billing === "monthly" ? "monthly" : "one_time",
    monthly_fee: a.monthly_fee === null || a.monthly_fee === undefined || a.monthly_fee === "" ? null : propMoney(a.monthly_fee),
    renewing: !!a.renewing, renewed_through: a.renewed_through || null,
    plan_snapshot: a.plan_snapshot || null, note: a.note || "",
    updated_at: new Date().toISOString(),
  };
}
async function propSaveAccount(a) {
  if (viewingUserId || !sb || !session) return false;
  const row = propAccountRow(a);
  const { error } = await sb.from("prop_accounts").upsert(row);
  if (error) { console.error(error); propError = noteDbError(error) ? T("error.dbOutdated") : T("prop.saveFailed", { msg: error.message }); return false; }
  const i = propAccounts.findIndex((x) => x.id === row.id);
  if (i >= 0) propAccounts[i] = { ...propAccounts[i], ...row };
  else propAccounts.unshift({ ...row, created_at: new Date().toISOString() });
  return true;
}
async function propDeleteAccount(id) {
  if (viewingUserId || !sb || !session) return false;
  const { error } = await sb.from("prop_accounts").delete().eq("id", id).eq("user_id", session.user.id);
  if (error) { console.error(error); propError = T("prop.saveFailed", { msg: error.message }); return false; }
  propAccounts = propAccounts.filter((a) => a.id !== id);
  propEntries = propEntries.filter((e) => e.account_id !== id);   // 库里是 on delete cascade
  return true;
}
async function propSaveEntries(list) {
  if (viewingUserId || !sb || !session || !list.length) return !list.length;
  const rows = list.map((e) => ({
    id: e.id || propNewId("pe"), user_id: session.user.id, account_id: e.account_id,
    kind: PROP_ENTRY_KINDS.includes(e.kind) ? e.kind : "other", amount: propMoney(e.amount),
    day: e.day || todayStr(), pending: e.kind === "payout" && !!e.pending, note: e.note || "",
    updated_at: new Date().toISOString(),
  }));
  const { error } = await sb.from("prop_entries").upsert(rows);
  if (error) { console.error(error); propError = noteDbError(error) ? T("error.dbOutdated") : T("prop.saveFailed", { msg: error.message }); return false; }
  rows.forEach((row) => {
    const i = propEntries.findIndex((x) => x.id === row.id);
    if (i >= 0) propEntries[i] = { ...propEntries[i], ...row };
    else propEntries.push({ ...row, created_at: new Date().toISOString() });
  });
  return true;
}
async function propDeleteEntry(id) {
  if (viewingUserId || !sb || !session) return false;
  const { error } = await sb.from("prop_entries").delete().eq("id", id).eq("user_id", session.user.id);
  if (error) { console.error(error); propError = T("prop.saveFailed", { msg: error.message }); return false; }
  propEntries = propEntries.filter((e) => e.id !== id);
  return true;
}
/* 改状态：时间线记一笔，顺手记上这一步的费用（激活费 / 重置费，feeKind 由调用方给）。
   离开「考核中」时停掉月付续费——订阅一般只在考核阶段收，过了 / 挂了还接着扣的话用户自己再打开 */
async function propChangeStatus(acc, to, day, fee, feeKind) {
  const next = { ...acc, status: to, events: [...(acc.events || []), { to, day }] };
  if (acc.status === "eval" && to !== "eval") next.renewing = false;
  if (!(await propSaveAccount(next))) return false;
  if (feeKind && propMoney(fee) > 0) return propSaveEntries([{ account_id: acc.id, kind: feeKind, amount: fee, day }]);
  return true;
}
async function propImportCatalog(catalog, summary) {
  if (!sb || !session) return false;
  const { error } = await sb.rpc("prop_import_catalog", { payload: catalog, summary });
  if (error) { console.error(error); propError = noteDbError(error) ? T("error.dbOutdated") : T("prop.import.failed", { msg: error.message }); return false; }
  await loadPropData();
  return true;
}

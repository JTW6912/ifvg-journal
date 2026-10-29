/* ============================================================
   PROP 账户 —— 目录格式、记账口径、读写
   页面在 11e-prop-view.js；表结构见 supabase/migrations/20261024000000_prop.sql

   ---------- 目录 JSON（管理员导入，整份替换）----------
   {
     "firms": [
       { "id": "lucid", "name": "Lucid Trading", "website": "https://...", "logo": "https://.../lucid.png",
         "source": "https://... 资料来源页", "review": "推荐语：支持 **加粗**、==高亮==、换行与 - 列表", "platforms": ["Tradovate"],
         "payoutMethods": ["Rise", "Bank transfer"], "kycRequirements": ["Passport", "Selfie verification"],
         "paymentMethods": ["Visa", "PayPal"],                     // 四组多选都允许自定义文本；notes 是其它说明
         "magicPolicy": "unknown" | "allowed" | "prohibited" | "self_hosted_only" | "temporary" | "fixed_region",
         // 魔法（VPN / 代理）政策；可不填，不填 = 未确认。临时政策的期限和附加条件写 notes。
         "notes": "写给人看的说明",
         "recentUpdates": [{ "id": "pu_...", "date": "2026-10-25", "type": "rules", "text": "**规则更新**：说明内容" }],
         // 可不填；type = notice / rules / pricing / payout / platform，日期 YYYY-MM-DD，按日期倒序展示。
         "updatesPreviewCount": 1,                              // 推荐排行显示1–5条，或 "all"；省略默认1，详情始终全部
         "faq": [{ "topic": "出金方式", "answer": "...", "status": "confirmed" | "unclear", "source": "https://..." }] }
     ],
     "plans": [
       { "id": "lucid-flex-50k", "firm": "lucid", "series": "LucidFlex", "size": 50000, "status": "current" | "legacy",
         "family": "Flex",                                   // 系列；同系列同规模的几个计划 = 几种可选组合（不写就用 series）
         "choices": [{ "axis": "日损", "value": "有日损" }],   // 这个计划在各个可选维度上的取值，添加账号时让用户点选
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
   导出另含可选 optionIcons 数组（共享图标配置，格式见 docs/prop-firm-editor.md）。
   导入时按键合并图标；省略 optionIcons 的旧目录保留现有共享配置。

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
const PROP_MAGIC_POLICIES = ["unknown", "allowed", "prohibited", "self_hosted_only", "temporary", "fixed_region"];
/* 缺失或未知的目录值不能被解释成「允许」，也不直接拼进 UI 文案或 CSS 类。 */
function propMagicPolicy(firm) { return firm && PROP_MAGIC_POLICIES.includes(firm.magicPolicy) ? firm.magicPolicy : "unknown"; }

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
    if (f.magicPolicy !== undefined && f.magicPolicy !== null && f.magicPolicy !== "" && !PROP_MAGIC_POLICIES.includes(f.magicPolicy)) errors.push(where + ".magicPolicy: " + T("prop.magic.invalid"));
    propValidateFirmUpdates(f.recentUpdates, f.updatesPreviewCount).forEach((error) => errors.push(where + ".recentUpdates: " + error));
    propValidateFirmChoices(f).forEach((error) => errors.push(where + ": " + error));
    propValidatePresentation(f).forEach((error) => errors.push(where + ": " + error));
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
  const hasIcons = Object.prototype.hasOwnProperty.call(raw, "optionIcons");
  if (hasIcons && !propValidateOptionIcons(raw.optionIcons)) errors.push(T("prop.icons.invalidConfig"));
  return { errors, warnings, catalog: errors.length ? null : { firms, plans, ...(hasIcons ? { optionIcons: raw.optionIcons.map((r) => propIconRow(r.field, r.label, r.kind, r.value)) } : {}) } };
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
function propCatalogExport() { return { firms: propFirms, plans: propPlans, optionIcons: propOptionIconExport() }; }
function propFindPlan(id) { return propPlans.find((p) => p.id === id) || null; }
function propFindFirm(id) { return propFirms.find((f) => f.id === id) || null; }

/* ---------- 添加账号：系列 + 可选项 ----------
   目录里 family = 系列，choices = 这个计划在各个可选维度上的取值，[{ axis: "日损", value: "有日损" }]。
   同一系列、同一规模下的几个计划就是几种可选组合（比如 Lucid Flex 的 一致性 × 日损）。
   没写 family 的旧目录退回用 series 当系列，也就没有可选项 */
function propFamilyOf(p) { return p.family || p.series || ""; }
function propChoiceMap(p) {
  const m = {};
  (Array.isArray(p.choices) ? p.choices : []).forEach((c) => { if (c && c.axis) m[c.axis] = c.value; });
  return m;
}
function propLivePlans(firmId) { return propPlans.filter((p) => p.firm === firmId && p.status !== "legacy"); }
function propFamilies(firmId) {
  const out = [];
  propLivePlans(firmId).forEach((p) => { const f = propFamilyOf(p); if (!out.includes(f)) out.push(f); });
  return out;
}
function propFamilyPlans(firmId, family) { return propLivePlans(firmId).filter((p) => propFamilyOf(p) === family); }
/* 这个系列有哪些维度、每个维度有哪些值（按目录里出现的先后） */
function propFamilyAxes(plans) {
  const axes = [];
  plans.forEach((p) => (Array.isArray(p.choices) ? p.choices : []).forEach((c) => {
    let a = axes.find((x) => x.axis === c.axis);
    if (!a) axes.push((a = { axis: c.axis, values: [] }));
    if (!a.values.includes(c.value)) a.values.push(c.value);
  }));
  return axes;
}
function propFamilySizes(plans) { return [...new Set(plans.map((p) => p.size || null))].sort((a, b) => (a === null) - (b === null) || a - b); }
/* 某规模下最贴近想要的组合的计划：must 这一维必须一样，其余维度命中越多越好；一样多取目录里靠前的 */
function propBestPlan(plans, size, want, must) {
  let best = null, score = -1;
  plans.forEach((p) => {
    if ((p.size || null) !== (size || null)) return;
    const c = propChoiceMap(p);
    if (must && c[must] !== want[must]) return;
    const s = Object.keys(want || {}).filter((k) => c[k] === want[k]).length;
    if (s > score) { best = p; score = s; }
  });
  return best;
}

/* ---------- 添加账号：用户自己改的规则 ----------
   输入框里：数字 = 数值，「无」/ none = 没有这项，空着 = 不知道（跟目录的三种取值一一对应） */
const PROP_RULE_FIELDS = [
  ["target", "eval", "target"], ["drawdown", "eval", "drawdown"], ["dll", "eval", "dll"], ["consistency", "eval", "consistency"],
  ["fundedDrawdown", "funded", "drawdown"], ["fundedDll", "funded", "dll"], ["fundedConsistency", "funded", "consistency"],
  ["split", "payout", "split"], ["cap", "payout", "cap"],
];
function propParseRule(text) {
  const s = String(text === null || text === undefined ? "" : text).trim().replace(/[$,%\s]/g, "");
  if (!s) return null;
  if (/^(无|没有|none|no|n\/a)$/i.test(s)) return "none";
  const n = Number(s);
  return isFinite(n) ? n : null;
}
function propRuleText(v) { return typeof v === "number" ? String(v) : v === "none" ? T("prop.rule.none") : ""; }
function propRuleTexts(plan) {
  const out = {};
  PROP_RULE_FIELDS.forEach(([k, sec, key]) => { out[k] = propRuleText(plan && plan[sec] ? plan[sec][key] : null); });
  return out;
}
/* 哪些规则跟目录里的不一样了（界面上标「已改」，快照里也记一笔） */
function propEditedRules(plan, texts) {
  return PROP_RULE_FIELDS.filter(([k, sec, key]) => {
    const was = plan && plan[sec] && plan[sec][key] !== undefined ? plan[sec][key] : null;
    return JSON.stringify(propParseRule(texts[k])) !== JSON.stringify(was);
  }).map(([k]) => k);
}
/* 计划 + 用户改的规则 → 新的一份（不动原计划） */
function propApplyRuleEdits(plan, texts) {
  const out = JSON.parse(JSON.stringify(plan || {}));
  PROP_RULE_FIELDS.forEach(([k, sec, key]) => {
    if (texts[k] === undefined) return;
    out[sec] = out[sec] || {};
    out[sec][key] = propParseRule(texts[k]);
  });
  return out;
}

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
function propReached(acc, status) { return acc.status === status || (acc.events || []).some((e) => e?.to === status); }
function propIsActive(acc) { return PROP_ACTIVE.includes(acc.status); }
/* 已记录的通过优先；考核型省略 passed 时，只按有效 funded 日期派生统计证据。
   不从当前状态、爆仓或流水猜日期，不补写 events；显式但损坏的 passed 仍须核对。
   缺省计划类型沿用 evaluation；消费者可传入自己的日期有效范围。 */
function propPassEvidence(acc, isDay = day => propOverviewDay(day) !== null) {
  const events = Array.isArray(acc.events) ? acc.events : [];
  const explicit = events.filter(e => e?.to === "passed");
  const candidates = explicit.length ? explicit : acc.plan_snapshot?.type === "instant" ? [] : events.filter(e => e?.to === "funded");
  const days = [...new Set(candidates.filter(e => isDay(e.day)).map(e => e.day))].sort();
  return { days, source: explicit.length ? "passed" : days.length ? "funded" : null };
}
/* 漏斗：买了几个 → 通过 → 资金账号 → 出过金。
   通过率按「考核次数」算，只算有结果的：通过的账号各算一次，时间线上每一次「考核失败」也算一次
   （挂了重置再考，那次失败照样算数）；还在考的不算进分母 */
function propFunnel(accounts, entries) {
  const total = accounts.length;
  const passed = accounts.filter((a) => propReached(a, "passed") || (a.plan_snapshot?.type !== "instant" && propReached(a, "funded"))).length;
  const funded = accounts.filter((a) => propReached(a, "funded")).length;
  const paid = accounts.filter((a) => propEntriesOf(a.id, entries).some((e) => e.kind === "payout" && !e.pending && propMoney(e.amount) > 0)).length;
  const fails = accounts.reduce((n, a) => n + Math.max((a.events || []).filter((e) => e?.to === "failed").length, a.status === "failed" ? 1 : 0), 0);
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

/* ---------- 概览日期范围：日期键是自然日，UTC 只用于不受夏令时影响的运算 ---------- */
const PROP_OVERVIEW_DAY_MS = 86400000;
const PROP_OVERVIEW_PRESETS = ["custom", "all", "last7", "last30", "thisMonth", "lastMonth"];
function propOverviewDay(day) {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day) || day.startsWith("0000")) return null;
  const time = Date.parse(day + "T00:00:00Z");
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === day ? time : null;
}
function propOverviewShiftDay(day, delta) {
  const time = propOverviewDay(day);
  if (time === null || !Number.isSafeInteger(delta)) return null;
  const d = new Date(time + delta * PROP_OVERVIEW_DAY_MS);
  if (!Number.isFinite(d.getTime())) return null;
  const next = d.toISOString().slice(0, 10);
  return propOverviewDay(next) === null ? null : next;
}
function propOverviewMonthIndex(day) {
  const time = propOverviewDay(day);
  if (time === null) return null;
  const d = new Date(time);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}
function propOverviewMonthStart(index) {
  if (!Number.isInteger(index) || index < 12 || index > 119999) return null;
  return String(Math.floor(index / 12)).padStart(4, "0") + "-" + String(index % 12 + 1).padStart(2, "0") + "-01";
}
function propOverviewShiftMonth(day, delta) {
  const index = propOverviewMonthIndex(day);
  if (index === null || !Number.isSafeInteger(delta)) return null;
  const first = propOverviewMonthStart(index + delta);
  if (!first) return null;
  const year = Number(first.slice(0, 4)), month = Number(first.slice(5, 7));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const last = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return first.slice(0, 8) + String(Math.min(Number(day.slice(8)), last)).padStart(2, "0");
}
function propOverviewResolveRange(choice, today) {
  if (!choice || !PROP_OVERVIEW_PRESETS.includes(choice.preset) || propOverviewDay(today) === null) return null;
  const preset = choice.preset;
  if (preset === "all") return { preset, from: null, to: null };
  let from, to = today;
  if (preset === "custom") {
    if (propOverviewDay(choice.from) === null || propOverviewDay(choice.to) === null) return null;
    from = choice.from < choice.to ? choice.from : choice.to;
    to = choice.from < choice.to ? choice.to : choice.from;
  } else if (preset === "last7" || preset === "last30") from = propOverviewShiftDay(today, preset === "last7" ? -6 : -29);
  else if (preset === "thisMonth") from = today.slice(0, 8) + "01";
  else {
    const first = today.slice(0, 8) + "01";
    from = propOverviewShiftMonth(first, -1);
    to = propOverviewShiftDay(first, -1);
  }
  return from && to ? { preset, from, to } : null;
}
/* 只派生、不改原流水。每天仍用 propSum，避免曲线另造一套退款/pending口径。
   稀疏点只覆盖有收支的日子和区间两端；横坐标按日期距离，不枚举空白年月。 */
function propOverviewSnapshot(entries, choice, today) {
  const range = propOverviewResolveRange(choice, today);
  const unavailable = (reason) => ({ available: false, reason, sum: null, points: [], trendUnavailable: true, range, from: null, to: null });
  if (!range) return unavailable("invalidRange");
  if (!Array.isArray(entries) || entries.some((e) => !e || typeof e !== "object")) return unavailable("invalidData");
  const all = range.preset === "all", selected = [], groups = new Map();
  let invalidDates = 0;
  entries.forEach((e) => {
    if (propOverviewDay(e.day) === null) {
      const s = propSum([e]);
      if (s.spent || s.received || s.refund) invalidDates++;
      if (all) selected.push(e);
      return;
    }
    if (!all && (e.day < range.from || e.day > range.to)) return;
    selected.push(e);
    if (!groups.has(e.day)) groups.set(e.day, []);
    groups.get(e.day).push(e);
  });
  if (!all && invalidDates) return unavailable("invalidDates");
  if (selected.some(e => PROP_ENTRY_KINDS.includes(e.kind) &&
      ((typeof e.amount !== "number" && typeof e.amount !== "string") || String(e.amount).trim() === "" || !Number.isFinite(Number(e.amount)) || Number(e.amount) < 0))) return unavailable("invalidData");
  const sum = propSum(selected);
  const safe = (s) => [s.spent, s.received, s.refund, s.pending, s.net].every((v) => Number.isSafeInteger(Math.round(v * 100)));
  if (!safe(sum)) return unavailable("amountRange");
  const days = [...groups].map(([day, list]) => ({ day, sum: propSum(list) }))
    .filter((d) => d.sum.spent || d.sum.received || d.sum.refund).sort((a, b) => a.day.localeCompare(b.day));
  if (days.some((d) => !safe(d.sum))) return unavailable("amountRange");
  const from = all ? (days[0] ? days[0].day : today) : range.from;
  const lastDay = days.length ? days[days.length - 1].day : today;
  const to = all ? (lastDay > today ? lastDay : today) : range.to;
  const result = { available: true, reason: invalidDates ? "invalidDates" : null, sum, points: [], trendUnavailable: !!invalidDates, range, from, to };
  if (invalidDates || !days.length) return result;
  let cents = 0;
  const points = [{ day: from, at: propOverviewDay(from), net: 0 }];
  for (const d of days) {
    cents += Math.round(d.sum.net * 100);
    if (!Number.isSafeInteger(cents)) return unavailable("amountRange");
    points.push({ day: d.day, at: propOverviewDay(d.day) + PROP_OVERVIEW_DAY_MS, net: cents / 100 });
  }
  // 不强行改末点来掩盖两套结果的差异；不能精确表达时明确报不可用。
  if (cents !== Math.round(sum.net * 100)) return unavailable("amountRange");
  const end = propOverviewDay(to) + PROP_OVERVIEW_DAY_MS;
  if (points[points.length - 1].at < end) points.push({ day: to, at: end, net: cents / 100 });
  result.points = points;
  return result;
}
function propOverviewBarModel(sum) {
  const refundMode = sum.spent < 0;
  const scale = Math.max(Math.abs(sum.spent), sum.received, 1);
  const percent = (v) => Math.max(0, Math.min(100, v / scale * 100));
  return { refundMode, spent: percent(Math.abs(sum.spent)), covered: refundMode ? 0 : percent(Math.min(sum.spent, sum.received)),
    income: percent(refundMode ? sum.received : Math.max(0, sum.net)) };
}

/* ---------- 总览联动：财务范围与有日期证据的进展 ---------- */
const PROP_LINKAGE_STAGES = ["bought", "passed", "funded", "paid"];
function propLinkageIncludes(day, range) {
  return !!range && propOverviewDay(day) !== null && (range.preset === "all" || (day >= range.from && day <= range.to));
}
function propLinkageMonthAllowed(range, year, month) {
  const first = propOverviewMonthStart(year * 12 + month - 1);
  return !!first && (!range || range.preset === "all" || (first.slice(0, 7) >= range.from.slice(0, 7) && first.slice(0, 7) <= range.to.slice(0, 7)));
}
function propLinkageMonth(range, year, month) {
  if (!range || range.preset === "all") return { year, month };
  const index = Math.max(propOverviewMonthIndex(range.from), Math.min(propOverviewMonthIndex(range.to), year * 12 + month - 1));
  return { year: Math.floor(index / 12), month: index % 12 + 1 };
}
function propAccountMatchesStatus(account, filter) {
  if (filter === "all") return true;
  if (filter === "active") return propIsActive(account);
  if (filter === "ended") return !propIsActive(account);
  return PROP_STATUSES.includes(filter) && account.status === filter;
}
/* Rows own IDs/dates, not persistent account copies. Counts and drill-downs share
   these rows. Evaluation-only skipped passes use recorded funding dates with
   provenance; instant funding and current status never supply a pass date. */
function propLinkageReport(accounts, entries, choice, today) {
  const range = propOverviewResolveRange(choice, today);
  const unique = [...new Map(accounts.filter(a => a && a.id).map(a => [a.id, a])).values()];
  const ids = new Set(unique.map(a => a.id));
  const ownedEntries = entries.filter(e => e && ids.has(e.account_id));
  const finance = propOverviewSnapshot(ownedEntries, choice, today);
  const selected = range?.preset === "all" ? ownedEntries.slice() : ownedEntries.filter(e => propLinkageIncludes(e.day, range));
  const byAccount = new Map(unique.map(a => [a.id, []]));
  ownedEntries.forEach(e => byAccount.get(e.account_id).push(e));
  const stages = Object.fromEntries(PROP_LINKAGE_STAGES.map(k => [k, []]));
  const histories = new Map(), inferredPasses = new Set(), incomplete = new Set();
  let fails = 0;
  for (const a of unique) {
    const dates = { bought: [], passed: [], funded: [], paid: [] };
    const add = (key, day) => {
      if (propOverviewDay(day) === null) incomplete.add(a.id);
      else dates[key].push(day);
    };
    add("bought", a.bought_on);
    const events = Array.isArray(a.events) ? a.events : [];
    for (const ev of events) {
      if (!ev || !["passed", "funded", "failed"].includes(ev.to)) continue;
      if (ev.to === "failed") {
        if (propOverviewDay(ev.day) === null) incomplete.add(a.id);
        else if (propLinkageIncludes(ev.day, range)) fails++;
      } else add(ev.to, ev.day);
    }
    const pass = propPassEvidence(a);
    dates.passed = pass.days;
    if (pass.source === "funded") inferredPasses.add(a.id);
    for (const e of byAccount.get(a.id)) {
      if (e.kind === "payout" && !e.pending && Number(e.amount) > 0 && Number.isFinite(Number(e.amount))) add("paid", e.day);
    }
    const instant = a.plan_snapshot?.type === "instant";
    const knownFunded = ["funded", "blown"].includes(a.status) || dates.funded.length || dates.paid.length || events.some(ev => ev?.to === "blown");
    if ((a.status === "passed" || (!instant && knownFunded)) && !dates.passed.length) incomplete.add(a.id);
    if (knownFunded && !dates.funded.length) incomplete.add(a.id);
    if (a.status === "failed" && !events.some(ev => ev?.to === "failed" && propOverviewDay(ev.day) !== null)) incomplete.add(a.id);
    for (const key of PROP_LINKAGE_STAGES) {
      dates[key] = [...new Set(dates[key])].sort();
      const day = dates[key].find(d => propLinkageIncludes(d, range));
      if (day) stages[key].push({ id: a.id, day, ...(key === "passed" && pass.source === "funded" ? { passSource: "funded" } : {}) });
    }
    histories.set(a.id, dates);
  }
  const edges = PROP_LINKAGE_STAGES.slice(0, -1).map((from, i) => {
    const to = PROP_LINKAGE_STAGES[i + 1];
    const rows = stages[from].map(row => {
      const next = histories.get(row.id)[to].find(day => day >= row.day && (range.preset === "all" || day <= range.to)) || null;
      return { ...row, next, ...(to === "passed" && next && inferredPasses.has(row.id) ? { nextPassSource: "funded" } : {}) };
    });
    const converted = rows.filter(row => row.next), unconverted = rows.filter(row => !row.next);
    return { from, to, rows, converted, unconverted, rate: rows.length ? converted.length / rows.length * 100 : null };
  });
  const passed = stages.passed.length, decided = passed + fails;
  return { range, finance, entries: selected, stages, edges, incompleteIds: [...incomplete],
    summary: { passed, fails, decided, passRate: decided ? passed / decided * 100 : null,
      costPerFunded: stages.funded.length && finance.available ? propMoney(finance.sum.spent / stages.funded.length) : null } };
}

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
/* ---------- 余额 → 离目标 / 离爆仓线 ----------
   余额是用户自己记的。目标只在考核中算（资金账号没有「目标」）。
   爆仓线：静态回撤 = 起始 − 回撤；追踪（EOD / 日内）= 最高余额 − 回撤，涨到起始余额就锁住不再上移。
   各家锁定点不完全一样（有的锁在起始 +$100），所以界面上标「估算」 */
function propBalanceView(acc) {
  const bal = Number(acc.balance);
  if (acc.balance === null || acc.balance === undefined || acc.balance === "" || !isFinite(bal)) return null;
  const snap = acc.plan_snapshot || {};
  const size = Number(acc.size) || Number(snap.size) || null;
  if (!size) return { balance: bal, profit: null };
  const evalPhase = acc.status === "eval" && snap.type !== "instant";
  const phase = (evalPhase ? snap.eval : snap.funded) || {};
  const dd = typeof phase.drawdown === "number" ? phase.drawdown : typeof (snap.eval || {}).drawdown === "number" ? snap.eval.drawdown : null;
  const target = evalPhase && typeof (snap.eval || {}).target === "number" ? snap.eval.target : null;
  const profit = propMoney(bal - size);
  const peak = Math.max(Number(acc.balance_peak) || bal, bal, size);
  let floor = null;
  if (dd !== null) floor = phase.drawdownType === "static" ? size - dd : Math.min(peak - dd, size);
  const room = floor === null ? null : propMoney(bal - floor);
  return { balance: bal, profit, target, progress: target ? Math.max(0, Math.min(1, profit / target)) : null,
    left: target ? propMoney(Math.max(0, target - profit)) : null, floor, room, dd,
    danger: room !== null && dd ? room <= dd * 0.3 : false };
}
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
function propSessionContext() {
  return sb && session?.user?.id ? { client: sb, uid: session.user.id, viewing: viewingUserId || "", generation: propSessionGeneration } : null;
}
function propSessionCurrent(ctx) {
  return !!ctx && ctx.client === sb && ctx.uid === session?.user?.id && ctx.viewing === (viewingUserId || "") && ctx.generation === propSessionGeneration;
}
function propResetSessionData() {
  propSessionGeneration++; propLoadSequence++;
  propAccounts = []; propEntries = []; propError = null;
  propModal = null; propFirmEditor = null; propSelected = []; propBatch = false; propCardMenu = null; propStacksOpen = [];
  propFirmFilter = ""; propGroupFilter = ""; propStatusFilter = "active"; propYearTouched = false;
  propOverviewRange = { preset: "all", from: null, to: null }; propOverviewOwner = null; propOverviewPicker = null;
  if (typeof propOverviewCleanup === "function") propOverviewCleanup();
  if (typeof propHideToast === "function") propHideToast();
  if (typeof propToastTimer !== "undefined") { clearTimeout(propToastTimer); propToastTimer = null; }
}
async function loadPropData() {
  if (!sb || !session) return;
  const uid = viewingUserId || session.user.id;
  const ctx = propSessionContext(), request = ++propLoadSequence;
  propError = null;
  const [firms, plans, imp, accs, ents, icons] = await Promise.all([
    fetchAllRows(() => sb.from("prop_firms").select("*", { count: "exact" }).order("sort_order", { ascending: true }).order("id", { ascending: true })),
    fetchAllRows(() => sb.from("prop_plans").select("*", { count: "exact" }).order("sort_order", { ascending: true }).order("id", { ascending: true })),
    sb.from("prop_catalog_imports").select("imported_at, summary").order("imported_at", { ascending: false }).limit(1),
    fetchAllRows(() => sb.from("prop_accounts").select("*", { count: "exact" }).eq("user_id", uid).order("bought_on", { ascending: false }).order("id", { ascending: true })),
    fetchAllRows(() => sb.from("prop_entries").select("*", { count: "exact" }).eq("user_id", uid).order("day", { ascending: true }).order("id", { ascending: true })),
    fetchAllRows(() => sb.from("prop_option_icons").select("*", { count: "exact" }).order("id", { ascending: true })),
  ]);
  if (!propSessionCurrent(ctx) || request !== propLoadSequence) return;
  const err = [firms, plans, imp, accs, ents, icons].map((r) => r.error).find(Boolean);
  if (err) {
    console.error(err);
    propError = noteDbError(err) ? T("error.dbOutdated") : T("prop.loadFailed", { msg: err.message });
    return;
  }
  propFirms = (firms.data || []).map(propFirmFromRow);
  propPlans = (plans.data || []).map(propPlanFromRow);
  propCatalogInfo = (imp.data && imp.data[0]) || null;
  propOptionIcons = icons.data || [];
  propAccounts = (accs.data || []).map(propHistoryAccountFromRow);
  propEntries = ents.data || [];
  if (!viewingUserId) await propApplyRenewals();
}
/* 打开页面时把该记的月费补上（一次写完，然后挪水位） */
async function propApplyRenewals() {
  const ctx = propSessionContext();
  if (!ctx || ctx.viewing) return;
  const today = todayStr();
  for (const acc of propAccounts) {
    if (!propSessionCurrent(ctx)) return;
    const due = propDueRenewals(acc, today);
    if (!due.length) continue;
    const rows = due.map((d) => ({ id: "pe_auto_" + acc.id + "_" + d, user_id: session.user.id, account_id: acc.id, kind: "monthly",
      amount: propMoney(acc.monthly_fee), day: d, pending: false, note: T("prop.entry.autoMonthly") }));
    const { error } = await sb.from("prop_entries").upsert(rows);
    if (!propSessionCurrent(ctx)) return;
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
    status: PROP_STATUSES.includes(a.status) ? a.status : "eval", events: a._historyInvalidRoot ? a._historyRawEvents : a.events || [],
    bought_on: a.bought_on || todayStr(), billing: a.billing === "monthly" ? "monthly" : "one_time",
    monthly_fee: a.monthly_fee === null || a.monthly_fee === undefined || a.monthly_fee === "" ? null : propMoney(a.monthly_fee),
    renewing: !!a.renewing, renewed_through: a.renewed_through || null,
    balance: a.balance === null || a.balance === undefined || a.balance === "" ? null : propMoney(a.balance),
    balance_peak: a.balance_peak === null || a.balance_peak === undefined || a.balance_peak === "" ? null : propMoney(a.balance_peak),
    balance_on: a.balance_on || null,
    plan_snapshot: a.plan_snapshot || null, note: a.note || "",
    updated_at: new Date().toISOString(),
  };
}
async function propSaveAccount(a) {
  if (viewingUserId || !sb || !session) return false;
  const ctx = propSessionContext();
  const cached = propAccounts.find(x => x.id === a.id);
  // An unrelated save may preserve a malformed root, never erase or rewrite it.
  if ((a._historyInvalidRoot || cached?._historyInvalidRoot) && (!a._historyInvalidRoot || !Array.isArray(a.events) || a.events.length)) {
    propError = T("prop.history.error.invalidRoot"); return false;
  }
  const row = propAccountRow(a);
  const { error } = await sb.from("prop_accounts").upsert(row);
  if (!propSessionCurrent(ctx)) return false;
  if (error) { console.error(error); propError = noteDbError(error) ? T("error.dbOutdated") : T("prop.saveFailed", { msg: error.message }); return false; }
  const i = propAccounts.findIndex((x) => x.id === row.id);
  if (i >= 0) propAccounts[i] = propHistoryAccountFromRow({ ...propAccounts[i], ...row });
  else propAccounts.unshift(propHistoryAccountFromRow({ ...row, created_at: new Date().toISOString() }));
  return true;
}
async function propDeleteAccount(id) {
  if (viewingUserId || !sb || !session) return false;
  const ctx = propSessionContext();
  const { error } = await sb.from("prop_accounts").delete().eq("id", id).eq("user_id", session.user.id);
  if (!propSessionCurrent(ctx)) return false;
  if (error) { console.error(error); propError = T("prop.saveFailed", { msg: error.message }); return false; }
  propAccounts = propAccounts.filter((a) => a.id !== id);
  propEntries = propEntries.filter((e) => e.account_id !== id);   // 库里是 on delete cascade
  return true;
}
async function propSaveEntries(list) {
  if (viewingUserId || !sb || !session || !list.length) return !list.length;
  const ctx = propSessionContext();
  const rows = list.map((e) => ({
    id: e.id || propNewId("pe"), user_id: session.user.id, account_id: e.account_id,
    kind: PROP_ENTRY_KINDS.includes(e.kind) ? e.kind : "other", amount: propMoney(e.amount),
    day: e.day || todayStr(), pending: e.kind === "payout" && !!e.pending, note: e.note || "",
    updated_at: new Date().toISOString(),
  }));
  const { error } = await sb.from("prop_entries").upsert(rows);
  if (!propSessionCurrent(ctx)) return false;
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
  const ctx = propSessionContext();
  const { error } = await sb.from("prop_entries").delete().eq("id", id).eq("user_id", session.user.id);
  if (!propSessionCurrent(ctx)) return false;
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
  if (!sb || !session || !propIsAdmin()) return false;
  try {
    const { error } = await sb.rpc("prop_import_catalog_with_icons", { payload: catalog, summary });
    if (error) throw error;
    await loadPropData();
    return true;
  } catch (error) {
    const outdated = noteDbError(error) || error?.code === "PGRST202";
    if (outdated) dbOutdated = true;
    propError = outdated ? T("error.dbOutdated") : T("prop.import.failed", { msg: error?.message || String(error) });
    return false;
  }
}

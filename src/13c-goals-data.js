/* ============================================================
   目标 / 纪律 / 积分（GOALS）—— 数据层与计算
   界面见 13d-goals-view.js，使用时长的计时见 13e-activity.js，库结构见
   supabase/migrations/20261017000000_goals.sql。

   三条原则（跟用户定下来的）：
   1. 只算实盘。回测的交易、复盘、在回测模式下用网站的时间一律不算；模型库跨模式只有一份，算。
   2. 按交易日期算，不按录入日期算。周一的单周日才录，纪律算在周一。只有周一到周五是交易日，
      周末不评纪律、不断连续天数。所以「每周集中录」的人和「每天录」的人结果完全一样。
   3. 先结算才评纪律。系统分不清「今天没交易」和「交易了还没录」，所以要用户自己点一下结算
      （每天型：结算今天；每周型：结算本周）。结算时把当天的纪律结果拍成快照存进 goal_days.snapshot，
      之后改规则阈值不会回头改老成绩；想按新数据重算就再结算一次。

   积分是「算出来的」，不是「攒出来的」：computeGoalPoints() 每次都从数据（交易、复盘、模型库、
   使用时长、结算快照）完整算一遍，points_ledger 只是这份结果的缓存（给管理员看、给以后兑换用），
   (来源, 周期) 唯一，重算就覆盖——同一件事永远只算一次分，删掉的复盘分也跟着没了。
   ============================================================ */
const GOAL_TAB = "goals";
const GOAL_RHYTHMS = ["daily", "weekly"];
const GOAL_KINDS = ["auto", "timer", "manual"];
const GOAL_FREQS = ["trading", "weekly", "days"];
/* 自动判定的指标。day / week 是这个指标能用在哪种周期的目标上 */
const GOAL_METRICS = {
  trades_complete: { day: true, week: true },
  day_review: { day: true, week: false },
  week_review: { day: false, week: true },
  premarket_plan: { day: true, week: false },
  settled: { day: true, week: true },
};
const GOAL_TIMER_AREAS = ["review", "focus", "all"];
/* 使用时长的区域。review 桶 = 复盘（编辑器 / 复盘页）+ 模型库 + 复盘计时器 + 手动补录 */
const ACT_AREAS = ["review", "playbook", "focus", "trades", "analytics", "timer_review", "manual_review"];
const ACT_REVIEW_AREAS = ["review", "playbook", "timer_review", "manual_review"];
const ACT_USE_AREAS = ["trades", "analytics"];
const GOAL_RULE_KEYS = ["maxLossR", "maxTrades", "humanError", "model", "stopAfterLosses", "revengeMin"];
/* 积分规则。数值集中在这里，以后要调只改这一处 */
const GOAL_POINTS = {
  cleanDay: 20,          // 有交易、所有纪律都守住的交易日（结算后）
  noTradeDay: 10,        // 结算确认「今天没交易」：不乱交易也是纪律
  violation: -5,         // 每违反一条规则
  violationCap: -15,     // 一天最多扣这么多
  reflected: 5,          // 违规了但写了反省：扣分免掉，再给这么多
  allGoalsDay: 10, allGoalsWeek: 30,
  reviewPer15: 5, reviewCap: 60,
  focusPer15: 3, focusCap: 30,
  usePer15: 2, useCap: 20,
  dayReview: 10, weekReview: 30, reviewMinChars: 200,
  tradeComplete: 2, tradeCompleteCap: 20,
  pbNote: 5, pbNoteMinChars: 200, verifyConcluded: 15,
  reflectMinChars: 50,
  streak: { daily: [[5, 20], [20, 50], [60, 150]], weekly: [[4, 20], [12, 50], [26, 150]] },
};
/* 违规一条纪律分扣多少（纪律分 0–100，是成绩不是货币，跟积分是两回事） */
const GOAL_SCORE_STEP = 20;

let goalPrefs = normalizeGoalPrefs(null);
let goalDays = {};            // { "YYYY-MM-DD": goal_days 那一行 }
let goalActivity = [];        // [{ day, area, seconds }]
let goalLedger = {};          // { "source|period": { points, meta } } —— 库里那份缓存，同步时拿来比对
let goalLoaded = false;
let goalError = null;
/* 不在实盘模式时，实盘那批交易和复盘另拉一份（只读）。在实盘模式下直接用 trades / reviews */
let goalLive = { trades: null, reviews: null };
let tradesMode = null;        // trades 里现在装的是哪个模式的（loadTrades 写）
let goalPrefsSaveTimer = null;
let goalSyncTimer = null;
let goalSyncing = false;

/* ---------- 配置 ---------- */
function newGoalId() { return "g_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function defaultGoalRules() {
  return {
    maxLossR: { on: true, value: 2 }, maxTrades: { on: true, value: 3 },
    humanError: { on: true }, model: { on: true },
    stopAfterLosses: { on: false, value: 2 }, revengeMin: { on: false, value: 15 },
  };
}
/* 目标的标题留空 = 按指标自动起名（跟着界面语言走）；用户改过名才存字 */
function defaultGoals(rhythm) {
  const g = (kind, freq, extra) => ({ id: newGoalId(), kind, freq, title: "", days: [], ...extra });
  if (rhythm === "weekly") {
    return [
      g("auto", "weekly", { metric: "trades_complete" }),
      g("timer", "weekly", { area: "review", target: 120 }),
      g("auto", "weekly", { metric: "week_review" }),
      g("auto", "weekly", { metric: "settled" }),
    ];
  }
  return [
    g("auto", "trading", { metric: "premarket_plan" }),
    g("auto", "trading", { metric: "trades_complete" }),
    g("timer", "trading", { area: "review", target: 30 }),
    g("auto", "trading", { metric: "day_review" }),
    g("auto", "trading", { metric: "settled" }),
    g("auto", "weekly", { metric: "week_review" }),
  ];
}
function normalizeGoal(raw) {
  if (!raw || typeof raw !== "object" || typeof raw.id !== "string") return null;
  const kind = GOAL_KINDS.includes(raw.kind) ? raw.kind : "manual";
  const freq = GOAL_FREQS.includes(raw.freq) ? raw.freq : "trading";
  const out = { id: raw.id, kind, freq, title: typeof raw.title === "string" ? raw.title.slice(0, 80) : "" };
  out.days = Array.isArray(raw.days) ? raw.days.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7) : [];
  if (kind === "auto") {
    const scope = freq === "weekly" ? "week" : "day";
    out.metric = GOAL_METRICS[raw.metric] && GOAL_METRICS[raw.metric][scope] ? raw.metric : "settled";
  }
  if (kind === "timer") {
    out.area = GOAL_TIMER_AREAS.includes(raw.area) ? raw.area : "review";
    const t = Math.round(Number(raw.target));
    out.target = t > 0 && t <= 6000 ? t : 30;
  }
  if (kind === "manual" && !out.title) out.title = "…";
  return out;
}
function normalizeGoalPrefs(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const rules = defaultGoalRules();
  if (r.rules && typeof r.rules === "object") {
    GOAL_RULE_KEYS.forEach((k) => {
      const v = r.rules[k];
      if (!v || typeof v !== "object") return;
      rules[k].on = !!v.on;
      if ("value" in rules[k]) { const n = Number(v.value); if (n > 0 && n < 1000) rules[k].value = n; }
    });
  }
  return {
    rhythm: GOAL_RHYTHMS.includes(r.rhythm) ? r.rhythm : null,
    start: /^\d{4}-\d{2}-\d{2}$/.test(r.start || "") ? r.start : null,
    goals: Array.isArray(r.goals) ? r.goals.map(normalizeGoal).filter(Boolean) : [],
    rules,
    selfRules: Array.isArray(r.selfRules)
      ? r.selfRules.filter((x) => x && typeof x.id === "string").map((x) => ({ id: x.id, title: String(x.title || "").slice(0, 80) })).filter((x) => x.title)
      : [],
  };
}
function goalSetupDone() { return !!(goalPrefs.rhythm && goalPrefs.start); }
/* 第一次选节奏：按节奏给一套默认目标，从这周一开始算（每周型的人周末才开始用，也能把这周结算掉） */
function setupGoals(rhythm) {
  goalPrefs.rhythm = rhythm;
  if (!goalPrefs.start) goalPrefs.start = thisMondayStr();
  if (!goalPrefs.goals.length) goalPrefs.goals = defaultGoals(rhythm);
  saveGoalPrefsNow();
}
async function writeGoalPrefs() {
  goalPrefsSaveTimer = null;
  if (viewingUserId || !sb || !session) return;
  const { error } = await sb.from("journal_schema").update({ goal_prefs: goalPrefs }).eq("user_id", session.user.id);
  if (error) {
    console.error(error);
    goalError = noteDbError(error) ? T("error.dbOutdated") : T("goal.saveFailed", { msg: error.message });
    render();
  } else if (goalError) { goalError = null; render(); }
  queueGoalSync();
}
function queueSaveGoalPrefs() {
  if (viewingUserId) return;
  goalTouch();
  clearTimeout(goalPrefsSaveTimer);
  goalPrefsSaveTimer = setTimeout(writeGoalPrefs, 600);
}
function saveGoalPrefsNow() { clearTimeout(goalPrefsSaveTimer); goalTouch(); return writeGoalPrefs(); }
function flushGoalPrefs() { if (goalPrefsSaveTimer) saveGoalPrefsNow(); }

/* ---------- 加载 ---------- */
async function loadGoals() {
  goalLoaded = false;
  if (!sb || !session) return;
  const uid = viewingUserId || session.user.id;
  const [d, a, l] = await Promise.all([
    fetchAllRows(() => sb.from("goal_days").select("*", { count: "exact" }).eq("user_id", uid).order("day", { ascending: true })),
    fetchAllRows(() => sb.from("activity_daily").select("day, area, seconds", { count: "exact" }).eq("user_id", uid).order("day", { ascending: true }).order("area", { ascending: true })),
    fetchAllRows(() => sb.from("points_ledger").select("source, period, points, meta", { count: "exact" }).eq("user_id", uid).order("source", { ascending: true }).order("period", { ascending: true })),
  ]);
  const err = d.error || a.error || l.error;
  if (err) {
    console.error(err);
    goalError = noteDbError(err) ? T("error.dbOutdated") : T("goal.loadFailed");
    return;
  }
  goalDays = {};
  (d.data || []).forEach((r) => { goalDays[r.day] = r; });
  goalActivity = (a.data || []).map((r) => ({ day: r.day, area: r.area, seconds: Number(r.seconds) || 0 }));
  goalLedger = {};
  (l.data || []).forEach((r) => { goalLedger[r.source + "|" + r.period] = { points: r.points, meta: r.meta }; });
  if (recordMode !== "live") await loadGoalLiveData(uid);
  goalError = null;
  goalLoaded = true;
  queueGoalSync();
}
async function loadGoalLiveData(uid) {
  const [t, r] = await Promise.all([
    fetchAllRows(() => sb.from("trades").select("*", { count: "exact" }).eq("user_id", uid).eq("mode", "live").order("created_at", { ascending: true }).order("id", { ascending: true })),
    fetchAllRows(() => sb.from("journal_reviews").select("*", { count: "exact" }).eq("user_id", uid).eq("mode", "live").order("created_at", { ascending: false }).order("id", { ascending: false })),
  ]);
  if (t.error || r.error) { console.error(t.error || r.error); return; }
  goalLive = { trades: (t.data || []).map(tradeFromRow), reviews: r.data || [] };
}
/* 切模式时（reloadModeData）：从实盘切走，刚才那批就是实盘的，直接留着当缓存，不用再拉 */
async function goalAfterModeSwitch(prevTrades, prevReviews, prevMode) {
  if (recordMode === "live") { goalLive = { trades: null, reviews: null }; return; }
  if (prevMode === "live") { goalLive = { trades: prevTrades, reviews: prevReviews }; return; }
  if (!goalLive.trades && sb && session) await loadGoalLiveData(viewingUserId || session.user.id);
}
function goalLiveTrades() { return recordMode === "live" && tradesMode === "live" ? trades : (goalLive.trades || []); }
function goalLiveReviews() { return recordMode === "live" ? reviews : (goalLive.reviews || []); }

/* ---------- 日期 ---------- */
function goalDate(s) { return new Date(s + "T00:00:00"); }
function goalAddDays(s, n) { const d = goalDate(s); d.setDate(d.getDate() + n); return toDateStr(d); }
function goalWeekday(s) { const w = goalDate(s).getDay(); return w === 0 ? 7 : w; }   // 1 = 周一 … 7 = 周日
function goalIsTradingDay(s) { return goalWeekday(s) <= 5; }
function goalWeekDays(monday) { return [0, 1, 2, 3, 4, 5, 6].map((k) => goalAddDays(monday, k)); }
function goalTradingDaysOfWeek(monday) { return [0, 1, 2, 3, 4].map((k) => goalAddDays(monday, k)); }
function goalDayRow(day) { return goalDays[day] || null; }
function goalDayOff(day) { const r = goalDayRow(day); return !!(r && r.off); }
function goalDaySettled(day) { const r = goalDayRow(day); return !!(r && r.settled_at); }

/* ---------- 交易 ---------- */
function goalTradeDay(t) {
  const f = roleField("date");
  const v = f ? String(t[f.id] || "") : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : localDateStr(t._created_at);
}
/* 有 taken 字段且有 Taken 这个选项：纪律只看真的做了的单（Faded / missed 不算交易）；没有就全部算 */
function goalIsTaken(t) {
  const f = roleField("taken");
  if (!f || !(f.options || []).includes("Taken")) return true;
  return t[f.id] === "Taken";
}
let goalTradeIndexCache = null;
function goalTradesByDay() {
  const list = goalLiveTrades();
  if (goalTradeIndexCache && goalTradeIndexCache.list === list && goalTradeIndexCache.n === list.length && goalTradeIndexCache.schema === schema) return goalTradeIndexCache.map;
  const map = {};
  list.forEach((t) => { const d = goalTradeDay(t); if (d) (map[d] = map[d] || []).push(t); });
  goalTradeIndexCache = { list, n: list.length, schema, map };
  return map;
}
function goalTradesOn(day) { return goalTradesByDay()[day] || []; }
function goalTimeField() {
  return schema.find((f) => f.type === "time" && f.id === "entry_time") || schema.find((f) => f.type === "time") || null;
}
function goalTimeMinutes(t, timeF) {
  const m = timeF ? /^(\d{1,2}):(\d{2})/.exec(String(t[timeF.id] || "")) : null;
  return m ? +m[1] * 60 + +m[2] : null;
}
function goalSortByTime(list) {
  const timeF = goalTimeField();
  return list.slice().sort((a, b) => {
    const am = goalTimeMinutes(a, timeF), bm = goalTimeMinutes(b, timeF);
    if (am !== null && bm !== null && am !== bm) return am - bm;
    return String(a._created_at || "").localeCompare(String(b._created_at || ""));
  });
}
function goalTradeR(t) {
  const f = roleField("r_multiple");
  if (!f) return null;
  const v = t[f.id];
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}
/* 人为错误字段的值算不算「犯了错」：yes / 是 / 有 / 随便写了点什么 都算；no / 否 / 无 / 空 不算。多选的话选了就算 */
const GOAL_NO_ERROR = /^(no|n|none|false|0|否|无|没有|没|-|—|ok)$/i;
function goalIsErrorValue(v) {
  if (Array.isArray(v)) return v.some((x) => goalIsErrorValue(x));
  const s = v === undefined || v === null ? "" : String(v).trim();
  return !!s && !GOAL_NO_ERROR.test(s);
}
function goalTradeHasModel(t) {
  const f = roleField("model");
  const v = f ? t[f.id] : "";
  if (Array.isArray(v) ? v.length : v !== undefined && v !== null && String(v).trim() !== "") return true;
  return !!pbTradePageId(t);
}
/* 一笔交易「录完整了」：有截图、有结果；有 R 字段就得填 R；有模型字段或模型库就得有模型 */
function goalTradeComplete(t) {
  const shotF = roleField("screenshot"), resultF = roleField("result"), rF = roleField("r_multiple"), modelF = roleField("model");
  if (shotF && !shotUrls(t[shotF.id]).length) return false;
  if (resultF && !String(t[resultF.id] || "").trim()) return false;
  if (rF && goalIsTaken(t) && goalTradeR(t) === null) return false;
  if ((modelF || pbHasPages()) && !goalTradeHasModel(t)) return false;
  return true;
}

/* ---------- 纪律规则 ----------
   每条规则返回 { key, on, available, ok, detail }。缺对应字段的规则 available=false（界面上变灰并提示要哪个字段） */
function goalRuleAvailable(key) {
  if (key === "maxLossR") return !!roleField("r_multiple");
  if (key === "humanError") return !!roleField("human_error");
  if (key === "model") return !!roleField("model") || pbHasPages();
  if (key === "stopAfterLosses") return !!roleField("result");
  if (key === "revengeMin") return !!roleField("result") && !!goalTimeField();
  return true;
}
function goalEvalDay(day, rulesArg) {
  const rules = rulesArg || goalPrefs.rules;
  const all = goalTradesOn(day);
  const taken = goalSortByTime(all.filter(goalIsTaken));
  const resultF = roleField("result");
  const timeF = goalTimeField();
  let r = 0, hasR = false;
  taken.forEach((t) => { const v = goalTradeR(t); if (v !== null) { r += v; hasR = true; } });
  const isLoss = (t) => (resultF ? isLossResult(t[resultF.id]) : (goalTradeR(t) || 0) < 0);
  const results = GOAL_RULE_KEYS.map((key) => {
    const cfg = rules[key] || {};
    const res = { key, on: !!cfg.on, available: goalRuleAvailable(key), ok: true, detail: "" };
    if (!res.on || !res.available || !taken.length) return res;
    if (key === "maxLossR") {
      if (hasR && r < -Math.abs(cfg.value)) { res.ok = false; res.detail = T("goal.rule.maxLossR.bad", { r: fmtNum(r), v: cfg.value }); }
    } else if (key === "maxTrades") {
      if (taken.length > cfg.value) { res.ok = false; res.detail = T("goal.rule.maxTrades.bad", { n: taken.length, v: cfg.value }); }
    } else if (key === "humanError") {
      const f = roleField("human_error");
      const n = taken.filter((t) => goalIsErrorValue(t[f.id])).length;
      if (n) { res.ok = false; res.detail = T("goal.rule.humanError.bad", { n }); }
    } else if (key === "model") {
      const n = taken.filter((t) => !goalTradeHasModel(t)).length;
      if (n) { res.ok = false; res.detail = T("goal.rule.model.bad", { n }); }
    } else if (key === "stopAfterLosses") {
      let streak = 0, extra = 0;
      taken.forEach((t) => { if (streak >= cfg.value) extra++; streak = isLoss(t) ? streak + 1 : 0; });
      if (extra) { res.ok = false; res.detail = T("goal.rule.stopAfterLosses.bad", { v: cfg.value, n: extra }); }
    } else if (key === "revengeMin") {
      let n = 0;
      for (let i = 1; i < taken.length; i++) {
        const prev = taken[i - 1], cur = taken[i];
        const a = goalTimeMinutes(prev, timeF), b = goalTimeMinutes(cur, timeF);
        if (isLoss(prev) && a !== null && b !== null && b - a >= 0 && b - a < cfg.value) n++;
      }
      if (n) { res.ok = false; res.detail = T("goal.rule.revengeMin.bad", { n, v: cfg.value }); }
    }
    return res;
  });
  // 盘前计划对照：只提示，不扣分（扣分的话写计划反而吃亏，没人会写）
  const plan = goalDayPlan(day);
  const deviations = [];
  if (plan && taken.length) {
    const modelF = roleField("model");
    if (plan.models.length && modelF) {
      const off = taken.filter((t) => { const v = t[modelF.id]; const vs = Array.isArray(v) ? v : [v]; return vs.some((x) => x && !plan.models.includes(x)); });
      if (off.length) deviations.push(T("goal.plan.devModel", { n: off.length }));
    }
    if (plan.maxTrades && taken.length > plan.maxTrades) deviations.push(T("goal.plan.devCount", { n: taken.length, v: plan.maxTrades }));
  }
  const violated = results.filter((x) => x.on && x.available && !x.ok);
  return { day, all, taken, n: taken.length, r, hasR, results, violated, deviations };
}
function goalDayPlan(day) {
  const r = goalDayRow(day);
  const p = r && r.plan;
  if (!p || typeof p !== "object") return null;
  const out = { bias: String(p.bias || ""), models: Array.isArray(p.models) ? p.models.map(String) : [], maxTrades: Number(p.maxTrades) > 0 ? Math.round(Number(p.maxTrades)) : null, note: String(p.note || "") };
  return out.bias.trim() || out.models.length || out.maxTrades || out.note.trim() ? out : null;
}
/* 违规之后的反省：当天写了实盘日复盘，或者有一篇错题笔记关联了当天的交易 */
function goalHasReflection(day, tradeIds) {
  const strip = (s) => String(s || "").replace(/\s+/g, "");
  if (goalLiveReviews().some((rv) => rv.day_date === day && strip(rv.body).length >= GOAL_POINTS.reflectMinChars)) return true;
  const ids = new Set(tradeIds || goalTradesOn(day).map((t) => t.id));
  return pbPages.some((p) => p.kind === "mistake" && (p.linked_trade_ids || []).some((id) => ids.has(id)));
}
/* 结算快照：违反了哪几条、自评哪几条没做到、纪律分。快照只记结果，反省状态每次现算（写了反省不用重新结算） */
function goalBuildSnapshot(day, selfChecks) {
  const ev = goalEvalDay(day);
  const selfFails = goalPrefs.selfRules.filter((s) => selfChecks && selfChecks[s.id] === false).map((s) => s.id);
  const count = ev.violated.length + selfFails.length;
  return {
    n: ev.n, all: ev.all.length, r: ev.hasR ? Math.round(ev.r * 100) / 100 : null,
    violations: ev.violated.map((x) => ({ key: x.key, detail: x.detail })),
    selfFails, deviations: ev.deviations,
    score: Math.max(0, 100 - GOAL_SCORE_STEP * count),
    tradeIds: ev.taken.map((t) => t.id),
  };
}
function goalSnapshotCount(s) { return s ? (s.violations || []).length + (s.selfFails || []).length : 0; }

/* ---------- 写 goal_days ---------- */
function goalRowPayload(day, patch) {
  const cur = goalDayRow(day) || {};
  return {
    user_id: session.user.id, day,
    checks: cur.checks || {}, self_checks: cur.self_checks || {}, plan: cur.plan || null, off: !!cur.off,
    settled_at: cur.settled_at || null, snapshot: cur.snapshot || null,
    ...patch, updated_at: new Date().toISOString(),
  };
}
async function saveGoalDays(rows) {
  if (viewingUserId || !sb || !session || !rows.length) return false;
  const before = rows.map((r) => goalDays[r.day]);
  rows.forEach((r) => { goalDays[r.day] = { ...r }; });
  goalTouch();
  const { error } = await sb.from("goal_days").upsert(rows);
  if (error) {
    console.error(error);
    rows.forEach((r, i) => { if (before[i]) goalDays[r.day] = before[i]; else delete goalDays[r.day]; });
    goalTouch();
    goalError = noteDbError(error) ? T("error.dbOutdated") : T("goal.saveFailed", { msg: error.message });
    render();
    return false;
  }
  goalError = null;
  queueGoalSync();
  return true;
}
function goalPatchDay(day, patch) { return saveGoalDays([goalRowPayload(day, patch)]); }
/* 手动目标打勾：每天的目标记在当天那行，每周的目标记在那周周一那行（键前面加 w:） */
function goalCheckKey(goal) { return goal.freq === "weekly" ? "w:" + goal.id : goal.id; }
async function toggleGoalCheck(goal, period) {
  const row = goalDayRow(period) || {};
  const checks = { ...(row.checks || {}) };
  const k = goalCheckKey(goal);
  if (checks[k]) delete checks[k]; else checks[k] = true;
  return goalPatchDay(period, { checks });
}
async function settleGoalDays(days, selfDraft) {
  const now = new Date().toISOString();
  const rows = days.filter((d) => !goalDayOff(d)).map((d) => {
    const self = (selfDraft && selfDraft[d]) || (goalDayRow(d) || {}).self_checks || {};
    return goalRowPayload(d, { self_checks: self, settled_at: now, snapshot: goalBuildSnapshot(d, self) });
  });
  return saveGoalDays(rows);
}
async function unsettleGoalDay(day) { return goalPatchDay(day, { settled_at: null, snapshot: null }); }

/* ---------- 使用时长 ---------- */
function goalSecondsOn(day, areas) {
  let s = 0;
  goalActivity.forEach((a) => { if (a.day === day && (!areas || areas.includes(a.area))) s += a.seconds; });
  s += actPendingSeconds(day, areas);
  return s;
}
function goalAreaList(area) { return area === "review" ? ACT_REVIEW_AREAS : area === "focus" ? ["focus"] : null; }
function fmtDuration(sec) {
  const m = Math.floor((sec || 0) / 60);
  const h = Math.floor(m / 60);
  return !h ? T("goal.dur.m", { m }) : m % 60 ? T("goal.dur.hm", { h, m: m % 60 }) : T("goal.dur.h", { h });
}

/* ---------- 目标判定 ---------- */
/* 这个目标在这个周期里算不算数（休息日、周末不算） */
function goalApplies(goal, period) {
  if (goal.freq === "weekly") return true;
  if (goalDayOff(period)) return false;
  if (goal.freq === "trading") return goalIsTradingDay(period);
  return goal.days.includes(goalWeekday(period));
}
function goalPeriodDays(goal, period) { return goal.freq === "weekly" ? goalWeekDays(period) : [period]; }
function goalReviewOk(rv) { return String(rv.body || "").replace(/\s+/g, "").length >= GOAL_POINTS.reflectMinChars; }
/* → { done, na, progress (0..1), text } */
function goalStatus(goal, period) {
  const days = goalPeriodDays(goal, period);
  if (goal.kind === "manual") {
    const row = goalDayRow(period);
    const done = !!(row && row.checks && row.checks[goalCheckKey(goal)]);
    return { done, na: false, progress: done ? 1 : 0, text: "" };
  }
  if (goal.kind === "timer") {
    const sec = days.reduce((s, d) => s + goalSecondsOn(d, goalAreaList(goal.area)), 0);
    const p = Math.min(1, sec / (goal.target * 60));
    return { done: p >= 1, na: false, progress: p, text: fmtDuration(sec) + " / " + fmtDuration(goal.target * 60) };
  }
  const m = goal.metric;
  if (m === "trades_complete") {
    const list = days.flatMap((d) => goalTradesOn(d));
    if (!list.length) return { done: true, na: true, progress: 1, text: T("goal.status.noTrades") };
    const ok = list.filter(goalTradeComplete).length;
    return { done: ok === list.length, na: false, progress: ok / list.length, text: ok + " / " + list.length };
  }
  if (m === "day_review") {
    const done = goalLiveReviews().some((rv) => rv.day_date === period && goalReviewOk(rv));
    return { done, na: false, progress: done ? 1 : 0, text: "" };
  }
  if (m === "week_review") {
    const done = goalLiveReviews().some((rv) => rv.week_start === period && goalReviewOk(rv));
    return { done, na: false, progress: done ? 1 : 0, text: "" };
  }
  if (m === "premarket_plan") {
    const done = !!goalDayPlan(period);
    return { done, na: false, progress: done ? 1 : 0, text: "" };
  }
  if (m === "settled") {
    const need = (goal.freq === "weekly" ? goalTradingDaysOfWeek(period) : [period]).filter((d) => !goalDayOff(d));
    const ok = need.filter(goalDaySettled).length;
    return { done: ok === need.length, na: false, progress: need.length ? ok / need.length : 1, text: goal.freq === "weekly" ? ok + " / " + need.length : "" };
  }
  return { done: false, na: false, progress: 0, text: "" };
}
function goalTitle(goal) {
  if (goal.title && goal.title !== "…") return goal.title;
  if (goal.kind === "timer") return T("goal.timerTitle." + goal.area, { d: fmtDuration(goal.target * 60) });
  if (goal.kind === "auto") return T("goal.metric." + goal.metric + (goal.freq === "weekly" ? ".w" : ""));
  return goal.title || "…";
}
function goalsForDay(day) { return goalPrefs.goals.filter((g) => g.freq !== "weekly" && goalApplies(g, day)); }
function goalsForWeek() { return goalPrefs.goals.filter((g) => g.freq === "weekly"); }
/* 某个交易日「达成」：结算了，并且当天该做的目标全做完 */
function goalDayAchieved(day) {
  if (!goalDaySettled(day)) return false;
  return goalsForDay(day).every((g) => goalStatus(g, day).done);
}
function goalWeekAchieved(monday) {
  const days = goalTradingDaysOfWeek(monday).filter((d) => !goalDayOff(d));
  if (!days.every(goalDaySettled)) return false;
  return goalsForWeek().every((g) => goalStatus(g, monday).done);
}

/* ---------- 连续天数 ----------
   每天型：连续「达成」的交易日（周末、休息日跳过；今天还没结算不算断）。
   每周型：连续「达成」的周（这周还没过完不算断） */
function goalStreakInfo() {
  if (!goalSetupDone()) return { cur: 0, best: 0, unit: "day" };
  const today = todayStr();
  if (goalPrefs.rhythm === "weekly") {
    const thisMon = thisMondayStr();
    let run = 0, best = 0, cur = 0;
    for (let m = goalPrefs.start; m <= thisMon; m = goalAddDays(m, 7)) {
      if (goalWeekAchieved(m)) { run++; best = Math.max(best, run); }
      else if (m !== thisMon) run = 0;
    }
    cur = run;
    return { cur, best, unit: "week" };
  }
  let run = 0, best = 0;
  for (let d = goalPrefs.start; d <= today; d = goalAddDays(d, 1)) {
    if (!goalIsTradingDay(d) || goalDayOff(d)) continue;
    if (goalDayAchieved(d)) { run++; best = Math.max(best, run); }
    else if (d !== today) run = 0;
  }
  return { cur: run, best, unit: "day" };
}

/* ---------- 积分 ---------- */
function goalAddPoint(out, source, period, points, meta) {
  if (!points) return;
  const p = Math.max(-100, Math.min(300, Math.round(points)));
  out[source + "|" + period] = { source, period, points: p, meta: meta || null };
}
function goalPagePoints(out) {
  const start = goalPrefs.start;
  pbPages.forEach((p) => {
    if (!p || p.kind === "tag" || localDateStr(p.updated_at) < start) return;
    if (String(p.body || "").replace(/\s+/g, "").length >= GOAL_POINTS.pbNoteMinChars) goalAddPoint(out, "pb_note", p.id, GOAL_POINTS.pbNote);
    if (p.kind === "verify" && (p.status === "works" || p.status === "rejected")) goalAddPoint(out, "verify_done", p.id, GOAL_POINTS.verifyConcluded);
  });
}
/* 从数据完整算一遍积分 → { "source|period": { source, period, points, meta } } */
function computeGoalPoints() {
  const out = {};
  if (!goalSetupDone()) return out;
  const start = goalPrefs.start, today = todayStr();
  const P = GOAL_POINTS;
  const per15 = (sec, each, cap) => Math.min(cap, Math.floor(sec / 900) * each);
  for (let d = start; d <= today; d = goalAddDays(d, 1)) {
    // 使用时长（只有服务器上那份，本机还没传上去的不算）
    let rev = 0, foc = 0, use = 0;
    goalActivity.forEach((a) => {
      if (a.day !== d) return;
      if (ACT_REVIEW_AREAS.includes(a.area)) rev += a.seconds;
      else if (a.area === "focus") foc += a.seconds;
      else if (ACT_USE_AREAS.includes(a.area)) use += a.seconds;
    });
    goalAddPoint(out, "time_review", d, per15(rev, P.reviewPer15, P.reviewCap));
    goalAddPoint(out, "time_focus", d, per15(foc, P.focusPer15, P.focusCap));
    goalAddPoint(out, "time_use", d, per15(use, P.usePer15, P.useCap));
    // 交易补全：按交易日期
    const complete = goalTradesOn(d).filter(goalTradeComplete).length;
    goalAddPoint(out, "trades_complete", d, Math.min(P.tradeCompleteCap, complete * P.tradeComplete));
    // 纪律：结算过的交易日
    const row = goalDayRow(d);
    if (row && row.settled_at && row.snapshot && !row.off && goalIsTradingDay(d)) {
      const s = row.snapshot, cnt = goalSnapshotCount(s);
      if (!cnt) goalAddPoint(out, "discipline", d, s.n ? P.cleanDay : P.noTradeDay, { score: s.score });
      else if (goalHasReflection(d, s.tradeIds)) goalAddPoint(out, "discipline", d, P.reflected, { score: s.score, v: cnt, reflected: true });
      else goalAddPoint(out, "discipline", d, Math.max(P.violationCap, cnt * P.violation), { score: s.score, v: cnt });
      if (goalPrefs.rhythm === "daily" && goalsForDay(d).length && goalDayAchieved(d)) goalAddPoint(out, "goals_day", d, P.allGoalsDay);
    }
  }
  // 复盘帖
  const seenDay = new Set(), seenWeek = new Set();
  goalLiveReviews().forEach((rv) => {
    const len = String(rv.body || "").replace(/\s+/g, "").length;
    if (rv.day_date && rv.day_date >= start && rv.day_date <= today && !seenDay.has(rv.day_date) && len >= P.reviewMinChars) {
      seenDay.add(rv.day_date); goalAddPoint(out, "day_review", rv.day_date, P.dayReview);
    }
    if (rv.week_start && rv.week_start >= start && rv.week_start <= today && !seenWeek.has(rv.week_start) && len >= P.reviewMinChars) {
      seenWeek.add(rv.week_start); goalAddPoint(out, "week_review", "w" + rv.week_start, P.weekReview);
    }
  });
  // 每周目标全部完成
  if (goalsForWeek().length) {
    for (let m = start; m <= thisMondayStr(); m = goalAddDays(m, 7)) {
      if (goalWeekAchieved(m)) goalAddPoint(out, "goals_week", "w" + m, P.allGoalsWeek);
    }
  }
  goalPagePoints(out);
  // 连续里程碑：历史最好成绩到过就给，一次性
  const st = goalStreakInfo();
  (P.streak[st.unit === "week" ? "weekly" : "daily"] || []).forEach(([n, pts]) => { if (st.best >= n) goalAddPoint(out, "streak", (st.unit === "week" ? "w" : "d") + n, pts); });
  return out;
}
function goalPointsTotal(map) { return Object.values(map).reduce((s, x) => s + x.points, 0); }
let goalPointsCache = null;
/* render() 里会多次用到：同一轮里别算好几遍 */
function goalPointsNow() {
  const key = [goalLiveTrades().length, goalLiveReviews().length, pbPages.length, goalActivity.length, Object.keys(goalDays).length, todayStr(), goalDataVersion].join("|");
  if (!goalPointsCache || goalPointsCache.key !== key) goalPointsCache = { key, map: computeGoalPoints() };
  return goalPointsCache.map;
}
let goalDataVersion = 0;   // 数据就地改了（编辑交易、改复盘）但条数没变时，手动 +1 让缓存失效
function goalTouch() { goalDataVersion++; goalTradeIndexCache = null; }

/* 把算出来的积分写进 points_ledger：只写变了的，没了的删掉 */
function queueGoalSync() {
  if (viewingUserId) return;
  clearTimeout(goalSyncTimer);
  goalSyncTimer = setTimeout(syncGoalLedger, 2500);
}
async function syncGoalLedger() {
  goalSyncTimer = null;
  if (viewingUserId || !sb || !session || !goalLoaded || !goalSetupDone() || goalSyncing) return;
  goalSyncing = true;
  try {
    goalTouch();
    const want = goalPointsNow();
    const up = [], del = [];
    Object.keys(want).forEach((k) => {
      const w = want[k], have = goalLedger[k];
      if (!have || have.points !== w.points || JSON.stringify(have.meta || null) !== JSON.stringify(w.meta || null)) {
        up.push({ user_id: session.user.id, source: w.source, period: w.period, points: w.points, meta: w.meta, updated_at: new Date().toISOString() });
      }
    });
    Object.keys(goalLedger).forEach((k) => { if (!want[k]) del.push(k); });
    if (up.length) {
      const { error } = await sb.from("points_ledger").upsert(up);
      if (error) { console.error(error); return; }
      up.forEach((r) => { goalLedger[r.source + "|" + r.period] = { points: r.points, meta: r.meta }; });
    }
    for (const k of del) {
      const [source, period] = [k.slice(0, k.indexOf("|")), k.slice(k.indexOf("|") + 1)];
      const { error } = await sb.from("points_ledger").delete().eq("user_id", session.user.id).eq("source", source).eq("period", period);
      if (!error) delete goalLedger[k];
    }
  } finally { goalSyncing = false; }
}

/* ---------- 还没结算的交易日 ----------
   从开始那天到昨天（每天型）/ 上周（每周型），有实盘交易、没休息、没结算的交易日 */
function goalPendingDays() {
  if (!goalSetupDone()) return [];
  const today = todayStr();
  const out = [];
  for (let d = goalPrefs.start; d < today; d = goalAddDays(d, 1)) {
    if (!goalIsTradingDay(d) || goalDayOff(d) || goalDaySettled(d)) continue;
    if (goalPrefs.rhythm === "weekly" && mondayOfStr(d) === thisMondayStr()) continue;
    out.push(d);
  }
  return out;
}
/* 开新交易时的实时提醒：今天（表单上那天）实盘已经触到日内最大亏损 / 最多笔数了 */
function goalLiveWarning(day) {
  if (recordMode !== "live" || !goalSetupDone() || !day) return "";
  const ev = goalEvalDay(day);
  const rules = goalPrefs.rules;
  if (rules.maxLossR.on && ev.hasR && ev.r <= -Math.abs(rules.maxLossR.value)) return T("goal.warn.maxLoss", { r: fmtNum(ev.r), v: rules.maxLossR.value });
  if (rules.maxTrades.on && ev.n >= rules.maxTrades.value) return T("goal.warn.maxTrades", { n: ev.n, v: rules.maxTrades.value });
  return "";
}

/* ---------- 分析页：「纪律」虚拟字段 ----------
   按交易日期那天的结算结果给每笔交易贴一个值：守纪律的日子 / 违规的日子 / 没结算。
   拆解卡、筛选、组合都能直接用——「违规日平均 -1.8R，守纪律日 +0.6R」就是这张卡 */
const VF_DISCIPLINE = "__discipline_vf";
function goalDisciplineOptions() { return [T("goal.vf.clean"), T("goal.vf.violated"), T("goal.vf.unsettled")]; }
function disciplineVirtualField() {
  return { id: VF_DISCIPLINE, label: T("goal.vf.label"), type: "select", role: "", virtual: true, options: goalDisciplineOptions() };
}
function goalHasDisciplineData() { return recordMode === "live" && Object.values(goalDays).some((r) => r.settled_at && r.snapshot); }
function goalTradeDisciplineValue(t) {
  const row = goalDayRow(goalTradeDay(t));
  const [clean, bad, none] = goalDisciplineOptions();
  if (!row || !row.settled_at || !row.snapshot || row.off) return none;
  return goalSnapshotCount(row.snapshot) ? bad : clean;
}

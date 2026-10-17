/* ============================================================
   目标 / 纪律 / 积分 —— 界面
   - 记录页顶部一张卡片（只在实盘模式下出现）：今天 / 本周的目标、纪律、计时器、结算
   - 「目标」页签：总览、热力图、积分明细、使用时长、全部设置
   - 结算弹窗、盘前计划弹窗、编辑目标弹窗（都在 #secondaryModalRoot，跟别的弹窗互斥）
   计算全在 13c-goals-data.js，这里只管画和收输入。
   ============================================================ */
const GOAL_HEAT_WEEKS = 26;
let goalCardCollapsed = (function () { try { return localStorage.getItem("journal_goal_card_collapsed") === "1"; } catch (e) { return false; } })();
let goalSettleState = null;   // { days: [...], self: { day: { ruleId: bool } } }
let goalPlanDay = null;       // 正在写哪天的盘前计划
let goalPlanDraft = null;
let goalEditState = null;     // { goal, isNew }
let goalConfirmDeleteId = null;

function goalWeekdayLabel(day) { return T("calendar.week" + ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][goalWeekday(day) - 1]); }
function goalShortDate(day) { return day.slice(5).replace("-", "/"); }
function goalWeekLabel(monday) { return goalShortDate(monday) + " – " + goalShortDate(goalAddDays(monday, 6)); }
function goalRuleLabel(key) {
  const cfg = goalPrefs.rules[key] || {};
  return T("goal.rule." + key, { v: cfg.value });
}
function goalRuleNeed(key) { return T("goal.rule." + key + ".need"); }

/* ---------- 一行目标 ---------- */
function goalRowHtml(goal, period, readOnly) {
  const st = goalStatus(goal, period);
  const title = goalTitle(goal);
  let mark;
  if (goal.kind === "manual" && !readOnly) {
    mark = `<button class="goalTick${st.done ? " on" : ""}" data-action="goal-toggle-check" data-goal="${esc(goal.id)}" data-period="${esc(period)}" title="${esc(T("goal.tickHint"))}">${st.done ? ICONS.check : ""}</button>`;
  } else {
    mark = `<span class="goalTick auto${st.done ? " on" : ""}${st.na ? " na" : ""}" title="${esc(T(goal.kind === "timer" ? "goal.kind.timerHint" : goal.kind === "auto" ? "goal.kind.autoHint" : "goal.tickHint"))}">${st.done ? ICONS.check : ""}</span>`;
  }
  const bar = goal.kind === "timer" || (goal.kind === "auto" && st.text && !st.na)
    ? `<span class="goalBar"><i style="width:${Math.round(st.progress * 100)}%"></i></span>` : "";
  const action = goal.kind === "auto" && !readOnly ? goalAutoAction(goal, period, st) : "";
  return `<div class="goalRow${st.done ? " done" : ""}">
    ${mark}
    <span class="goalRowTitle">${esc(title)}</span>
    ${bar}
    ${st.text ? `<span class="goalRowText mono">${esc(st.text)}</span>` : ""}
    ${action}
  </div>`;
}
/* 自动目标旁边给一个「去做」的入口：写计划 / 结算 / 写复盘 */
function goalAutoAction(goal, period, st) {
  if (st.done) return "";
  if (goal.metric === "premarket_plan") return `<button class="tinyBtn goalGo" data-action="goal-open-plan" data-day="${esc(period)}">${esc(T("goal.go.plan"))}</button>`;
  if (goal.metric === "settled") return `<button class="tinyBtn goalGo" data-action="goal-open-settle" data-period="${esc(period)}" data-week="${goal.freq === "weekly" ? "1" : ""}">${esc(T("goal.go.settle"))}</button>`;
  if (recordMode === "live" && goal.metric === "day_review") return `<button class="tinyBtn goalGo" data-action="goal-new-review" data-day="${esc(period)}">${esc(T("goal.go.review"))}</button>`;
  if (recordMode === "live" && goal.metric === "week_review") return `<button class="tinyBtn goalGo" data-action="goal-new-review" data-week="${esc(period)}">${esc(T("goal.go.review"))}</button>`;
  return "";
}

/* ---------- 今天的纪律（还没结算，按现在录进来的单实时看） ---------- */
function goalRuleChipsHtml(day) {
  const ev = goalEvalDay(day);
  const on = ev.results.filter((x) => x.on);
  if (!on.length) return "";
  return `<div class="goalRules">${on.map((x) => {
    const cls = !x.available ? "na" : !ev.n ? "idle" : x.ok ? "ok" : "bad";
    const tip = !x.available ? goalRuleNeed(x.key) : x.detail || goalRuleLabel(x.key);
    return `<span class="goalRuleChip ${cls}" title="${esc(tip)}">${cls === "ok" ? "✓" : cls === "bad" ? "✗" : "·"} ${esc(goalRuleLabel(x.key))}</span>`;
  }).join("")}</div>`;
}

function goalTimerBtnHtml() {
  if (viewingUserId) return "";
  const st = goalTimerState();
  return st
    ? `<span class="goalTimer on"><span class="goalTimerDot"></span><span class="mono" data-goal-clock>${esc(goalTimerClockText())}</span>
        <button class="btn" data-action="goal-timer-stop">${esc(T("goal.timer.stop"))}</button>
        <button class="tinyBtn" data-action="goal-timer-cancel" title="${esc(T("goal.timer.cancelHint"))}">${ICONS.x}</button></span>`
    : `<button class="btn" data-action="goal-timer-start" title="${esc(T("goal.timer.hint"))}">${ICONS.clock} ${esc(T("goal.timer.start"))}</button>`;
}

function goalSetupHtml(big) {
  if (viewingUserId) return `<div class="goalEmpty">${esc(T("goal.setup.viewing"))}</div>`;
  return `<div class="goalSetup${big ? " big" : ""}">
    <div class="goalSetupTitle">${esc(T("goal.setup.title"))}</div>
    <div class="goalSetupIntro">${esc(T("goal.setup.intro"))}</div>
    <div class="goalSetupChoices">
      <button class="goalSetupChoice" data-action="goal-setup" data-rhythm="daily"><b>${esc(T("goal.rhythm.daily"))}</b><span>${esc(T("goal.rhythm.dailyDesc"))}</span></button>
      <button class="goalSetupChoice" data-action="goal-setup" data-rhythm="weekly"><b>${esc(T("goal.rhythm.weekly"))}</b><span>${esc(T("goal.rhythm.weeklyDesc"))}</span></button>
    </div>
    <div class="goalSetupNote">${esc(T("goal.setup.note"))}</div>
  </div>`;
}

/* ---------- 卡片（记录页顶部；目标页里也用同一份，full = 不能收起） ---------- */
function goalCardHtml(full) {
  if (goalError && !goalLoaded) return `<div class="notice error" style="margin-bottom:16px;">${ICONS.alert}<span>${esc(goalError)}</span></div>`;
  if (!goalLoaded) return "";
  if (!goalSetupDone()) return full ? goalSetupHtml(true) : `<div class="goalCard">${goalSetupHtml(false)}</div>`;
  const readOnly = !!viewingUserId;
  const today = todayStr(), monday = thisMondayStr();
  const weekly = goalPrefs.rhythm === "weekly";
  const pts = goalPointsTotal(goalPointsNow());
  const streak = goalStreakInfo();
  const pending = goalPendingDays();
  const collapsed = !full && goalCardCollapsed;
  const isTrading = goalIsTradingDay(today);
  const off = goalDayOff(today);
  const head = weekly
    ? T("goal.card.week", { range: goalWeekLabel(monday) })
    : T("goal.card.today", { wd: goalWeekdayLabel(today), d: goalShortDate(today) });
  const streakTxt = T(streak.unit === "week" ? "goal.streak.weeks" : "goal.streak.days", { n: streak.cur });
  let body = "";
  if (!collapsed) {
    if (pending.length && !readOnly) {
      body += `<button class="goalPending" data-action="goal-open-settle" data-days="${esc(pending.join(","))}">${ICONS.alert}<span>${esc(T("goal.pending", { n: pending.length }))}</span><b>${esc(T("goal.pendingGo"))}</b></button>`;
    }
    if (weekly) {
      body += `<div class="goalWeekStrip">${goalTradingDaysOfWeek(monday).map((d) => {
        const cls = goalDayOff(d) ? "off" : goalDaySettled(d) ? (goalSnapshotCount(goalDayRow(d).snapshot) ? "bad" : "ok") : goalTradesOn(d).length ? "todo" : "";
        return `<button class="goalWeekDay ${cls}${d === today ? " isToday" : ""}" data-action="goal-open-settle" data-days="${d}" ${readOnly ? "disabled" : ""}>
          <span>${esc(goalWeekdayLabel(d))}</span><b class="mono">${goalTradesOn(d).filter(goalIsTaken).length || "–"}</b></button>`;
      }).join("")}</div>`;
      body += `<div class="goalList">${goalsForWeek().map((g) => goalRowHtml(g, monday, readOnly)).join("") || `<div class="goalEmpty">${esc(T("goal.noGoalsWeek"))}</div>`}</div>`;
      const dailyGoals = goalPrefs.goals.filter((g) => g.freq !== "weekly" && goalApplies(g, today));
      if (dailyGoals.length) body += `<div class="goalSub">${esc(T("goal.todayToo"))}</div><div class="goalList">${dailyGoals.map((g) => goalRowHtml(g, today, readOnly)).join("")}</div>`;
      if (isTrading && !off) body += goalRuleChipsHtml(today);
    } else {
      if (!isTrading) body += `<div class="goalNote">${esc(T("goal.weekendNote"))}</div>`;
      else if (off) body += `<div class="goalNote">${esc(T("goal.offNote"))}</div>`;
      const dayGoals = goalsForDay(today);
      if (dayGoals.length) body += `<div class="goalList">${dayGoals.map((g) => goalRowHtml(g, today, readOnly)).join("")}</div>`;
      const wk = goalsForWeek();
      if (wk.length) body += `<div class="goalSub">${esc(T("goal.thisWeek"))}</div><div class="goalList">${wk.map((g) => goalRowHtml(g, monday, readOnly)).join("")}</div>`;
      if (isTrading && !off) body += goalRuleChipsHtml(today);
    }
    if (goalError) body += `<div class="goalErr">${esc(goalError)}</div>`;
  }
  const settleBtn = readOnly ? "" : weekly
    ? `<button class="btn btn-primary" data-action="goal-open-settle" data-period="${monday}" data-week="1">${esc(T("goal.settleWeek"))}</button>`
    : isTrading && !off ? `<button class="btn btn-primary" data-action="goal-open-settle" data-days="${today}">${esc(T(goalDaySettled(today) ? "goal.resettleToday" : "goal.settleToday"))}</button>` : "";
  const offBtn = readOnly || weekly || !isTrading ? "" : `<button class="tinyBtn" data-action="goal-toggle-off" data-day="${today}">${esc(T(off ? "goal.offUndo" : "goal.offToday"))}</button>`;
  return `<div class="goalCard${full ? " full" : ""}${collapsed ? " collapsed" : ""}">
    <div class="goalCardHead">
      <div class="goalCardTitle">${ICONS.target}<span>${esc(head)}</span></div>
      <div class="goalCardStats">
        <span class="goalStat" title="${esc(T("goal.streak.hint", { best: streak.best }))}">🔥 <b>${esc(streakTxt)}</b></span>
        <span class="goalStat" title="${esc(T("goal.points.hint"))}">⭐ <b class="mono">${pts}</b></span>
      </div>
      <div class="goalCardActions">
        ${collapsed ? "" : offBtn}
        ${goalTimerBtnHtml()}
        ${collapsed ? "" : settleBtn}
        ${full ? "" : `<button class="iconBtn" data-action="switch-tab" data-tab="${GOAL_TAB}" title="${esc(T("goal.openTab"))}">${ICONS.settings}</button>
        <button class="iconBtn" data-action="goal-toggle-card" title="${esc(T(collapsed ? "goal.expand" : "goal.collapse"))}">${collapsed ? ICONS.chevDown : ICONS.chevUp}</button>`}
      </div>
    </div>
    ${body}
  </div>`;
}

/* ============================================================
   「目标」页签
   ============================================================ */
function renderGoals() {
  if (goalError && !goalLoaded) return `<div class="notice error">${ICONS.alert}<span>${esc(goalError)}</span></div>`;
  if (!goalLoaded) return `<div class="loading">${T("common.loading")}</div>`;
  if (!goalSetupDone()) return `<div class="goalPage">${goalSetupHtml(true)}</div>`;
  let html = `<div class="goalPage">`;
  html += `<div class="goalLiveOnly">${esc(T("goal.liveOnly"))}</div>`;
  html += goalOverviewHtml();
  html += goalCardHtml(true);
  html += goalHeatHtml();
  html += `<div class="goalTwoCol">${goalPointsPanelHtml()}${goalTimePanelHtml()}</div>`;
  if (!viewingUserId) html += goalSettingsHtml();
  html += `</div>`;
  return html;
}
function goalPanel(title, inner, extra) {
  return `<div class="calendarPanel goalPanel"${extra || ""}><div class="sectionLabel goalPanelTitle"><span class="bk">⟦ </span>${esc(title)}<span class="bk"> ⟧</span></div>${inner}</div>`;
}
function goalOverviewHtml() {
  const map = goalPointsNow();
  const total = goalPointsTotal(map);
  const monday = thisMondayStr();
  const weekPts = Object.values(map).filter((x) => { const p = x.period.replace(/^w/, ""); return /^\d{4}-/.test(p) && p >= monday; }).reduce((s, x) => s + x.points, 0);
  const streak = goalStreakInfo();
  const settled = Object.values(goalDays).filter((r) => r.settled_at && r.snapshot && !r.off).sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, 20);
  const avg = settled.length ? Math.round(settled.reduce((s, r) => s + (r.snapshot.score || 0), 0) / settled.length) : null;
  const weekSec = goalWeekDays(monday).reduce((s, d) => s + goalSecondsOn(d, null), 0);
  const tile = (label, val, sub) => `<div class="goalTile"><div class="goalTileLabel">${esc(label)}</div><div class="goalTileVal mono">${val}</div>${sub ? `<div class="goalTileSub">${esc(sub)}</div>` : ""}</div>`;
  return `<div class="goalTiles">
    ${tile(T("goal.tile.points"), esc(String(total)), T("goal.tile.pointsWeek", { n: weekPts }))}
    ${tile(T("goal.tile.streak"), esc(String(streak.cur)), T(streak.unit === "week" ? "goal.tile.streakBestW" : "goal.tile.streakBestD", { n: streak.best }))}
    ${tile(T("goal.tile.discipline"), avg === null ? "—" : esc(String(avg)), T("goal.tile.disciplineSub", { n: settled.length }))}
    ${tile(T("goal.tile.time"), esc(fmtDuration(weekSec)), T("goal.tile.timeSub"))}
  </div>`;
}

/* 热力图：一列一周，五行周一到周五。颜色：达成 / 结算了没全做完 / 有交易没结算 / 休息 */
function goalHeatHtml() {
  const thisMon = thisMondayStr(), today = todayStr();
  const first = goalAddDays(thisMon, -7 * (GOAL_HEAT_WEEKS - 1));
  let cols = "";
  for (let m = first; m <= thisMon; m = goalAddDays(m, 7)) {
    const weekOk = goalPrefs.rhythm === "weekly" && m >= goalPrefs.start && goalWeekAchieved(m);
    let cells = "";
    goalTradingDaysOfWeek(m).forEach((d) => {
      const n = goalTradesOn(d).filter(goalIsTaken).length;
      let cls = "";
      if (d > today) cls = "future";
      else if (goalDayOff(d)) cls = "off";
      else if (goalDaySettled(d)) cls = goalDayAchieved(d) || (goalPrefs.rhythm === "weekly" && !goalSnapshotCount(goalDayRow(d).snapshot)) ? "full" : "part";
      else if (n) cls = d < goalPrefs.start ? "old" : "todo";
      const tip = d + " · " + goalWeekdayLabel(d) + (n ? " · " + T("dayDetail.summary", { n }) : "") + " · " + T("goal.heat." + (cls || "none"));
      const clickable = d <= today && d >= goalPrefs.start && !viewingUserId;
      cells += `<i class="gh ${cls}"${clickable ? ` data-action="goal-open-settle" data-days="${d}"` : ""} title="${esc(tip)}"></i>`;
    });
    cols += `<div class="ghCol${weekOk ? " weekOk" : ""}" title="${esc(goalWeekLabel(m))}">${cells}</div>`;
  }
  const legend = ["full", "part", "todo", "off"].map((k) => `<span><i class="gh ${k}"></i>${esc(T("goal.heat." + k))}</span>`).join("");
  return goalPanel(T("goal.heat.title"), `<div class="ghWrap"><div class="ghDays">${["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => `<span>${esc(T("calendar.week" + d))}</span>`).join("")}</div><div class="ghGrid">${cols}</div></div>
    <div class="ghLegend">${legend}</div><div class="goalHint">${esc(T("goal.heat.hint"))}</div>`);
}

function goalSourceLabel(src) { return T("goal.src." + src); }
function goalPointsPanelHtml() {
  const rows = Object.values(goalPointsNow()).slice().sort((a, b) => {
    const pa = a.period.replace(/^w/, ""), pb = b.period.replace(/^w/, "");
    const da = /^\d{4}-/.test(pa) ? pa : "", db = /^\d{4}-/.test(pb) ? pb : "";
    return da === db ? b.points - a.points : da < db ? 1 : -1;
  });
  const list = rows.slice(0, 40).map((x) => {
    const p = x.period;
    let when = /^w\d{4}-/.test(p) ? T("goal.weekOf", { d: goalShortDate(p.slice(1)) }) : /^\d{4}-/.test(p) ? goalShortDate(p) : x.source === "streak" ? "" : (pbFind(p) ? pbTitle(pbFind(p)) : "");
    return `<div class="goalLedgerRow"><span class="goalLedgerWhen mono">${esc(when)}</span><span class="goalLedgerSrc">${esc(goalSourceLabel(x.source))}${x.meta && x.meta.reflected ? " · " + esc(T("goal.reflected")) : ""}</span><b class="mono ${x.points < 0 ? "neg" : "pos"}">${x.points > 0 ? "+" : ""}${x.points}</b></div>`;
  }).join("");
  const P = GOAL_POINTS;
  const rules = [
    [T("goal.src.discipline"), T("goal.pr.discipline", { a: P.cleanDay, b: P.noTradeDay, c: -P.violation, d: -P.violationCap, e: P.reflected })],
    [T("goal.src.goals_day") + " / " + T("goal.src.goals_week"), "+" + P.allGoalsDay + " / +" + P.allGoalsWeek],
    [T("goal.src.time_review"), T("goal.pr.per15", { a: P.reviewPer15, cap: P.reviewCap })],
    [T("goal.src.time_focus"), T("goal.pr.per15", { a: P.focusPer15, cap: P.focusCap })],
    [T("goal.src.time_use"), T("goal.pr.per15", { a: P.usePer15, cap: P.useCap })],
    [T("goal.src.day_review") + " / " + T("goal.src.week_review"), T("goal.pr.review", { a: P.dayReview, b: P.weekReview, n: P.reviewMinChars })],
    [T("goal.src.trades_complete"), T("goal.pr.complete", { a: P.tradeComplete, cap: P.tradeCompleteCap })],
    [T("goal.src.pb_note") + " / " + T("goal.src.verify_done"), T("goal.pr.pb", { a: P.pbNote, n: P.pbNoteMinChars, b: P.verifyConcluded })],
    [T("goal.src.streak"), T("goal.pr.streak")],
  ].map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("");
  return goalPanel(T("goal.points.title"), `${list || `<div class="goalEmpty">${esc(T("goal.points.empty"))}</div>`}
    <details class="goalRulesTable"><summary>${esc(T("goal.points.rules"))}</summary><table>${rules}</table><div class="goalHint">${esc(T("goal.points.rulesNote"))}</div></details>`);
}
function goalTimePanelHtml() {
  const today = todayStr();
  const days = [];
  for (let k = 13; k >= 0; k--) days.push(goalAddDays(today, -k));
  const parts = days.map((d) => ({ d, rev: goalSecondsOn(d, ACT_REVIEW_AREAS), foc: goalSecondsOn(d, ["focus"]), use: goalSecondsOn(d, ACT_USE_AREAS) }));
  const max = Math.max(1800, ...parts.map((p) => p.rev + p.foc + p.use));
  const bars = parts.map((p) => {
    const h = (s) => ((s / max) * 100).toFixed(1) + "%";
    const tip = p.d + " · " + T("goal.time.review") + " " + fmtDuration(p.rev) + " · " + T("goal.time.focus") + " " + fmtDuration(p.foc) + " · " + T("goal.time.use") + " " + fmtDuration(p.use);
    return `<div class="gtCol" title="${esc(tip)}"><div class="gtStack"><i class="use" style="height:${h(p.use)}"></i><i class="foc" style="height:${h(p.foc)}"></i><i class="rev" style="height:${h(p.rev)}"></i></div><span>${esc(p.d.slice(8))}</span></div>`;
  }).join("");
  const manual = viewingUserId ? "" : `<div class="goalManual">
    <span>${esc(T("goal.manual.label"))}</span>
    <select class="select" id="goalManualDay">${[0, 1, 2, 3, 4, 5, 6].map((k) => { const d = goalAddDays(today, -k); return `<option value="${d}">${esc(goalShortDate(d) + " " + goalWeekdayLabel(d))}</option>`; }).join("")}</select>
    <input class="input" id="goalManualMin" type="number" min="1" max="360" placeholder="${esc(T("goal.manual.minutes"))}" />
    <button class="btn" data-action="goal-manual-add">${esc(T("goal.manual.add"))}</button>
  </div>`;
  return goalPanel(T("goal.time.title"), `<div class="gtChart">${bars}</div>
    <div class="ghLegend"><span><i class="gtKey rev"></i>${esc(T("goal.time.review"))}</span><span><i class="gtKey foc"></i>${esc(T("goal.time.focus"))}</span><span><i class="gtKey use"></i>${esc(T("goal.time.use"))}</span></div>
    ${manual}<div class="goalHint">${esc(T("goal.time.hint"))}</div>`);
}

/* ---------- 设置 ---------- */
function goalFreqLabel(g) {
  if (g.freq === "days") return g.days.length ? g.days.map((d) => T("calendar.week" + ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d - 1])).join(" ") : T("goal.freq.days");
  return T("goal.freq." + g.freq);
}
function goalSettingsHtml() {
  const goals = goalPrefs.goals.map((g) => `<div class="goalSetRow">
      <span class="goalKindTag">${esc(T("goal.kind." + g.kind))}</span>
      <span class="goalSetTitle">${esc(goalTitle(g))}</span>
      <span class="goalSetFreq">${esc(goalFreqLabel(g))}</span>
      <button class="tinyBtn" data-action="goal-edit" data-goal="${esc(g.id)}">${ICONS.pencil}</button>
      ${goalConfirmDeleteId === g.id
        ? `<button class="tinyBtn" style="color:var(--neg);" data-action="goal-delete" data-goal="${esc(g.id)}">✓</button><button class="tinyBtn" data-action="goal-delete-cancel">${ICONS.x}</button>`
        : `<button class="tinyBtn" data-action="goal-delete-ask" data-goal="${esc(g.id)}">${ICONS.trash}</button>`}
    </div>`).join("");
  const rules = GOAL_RULE_KEYS.map((k) => {
    const cfg = goalPrefs.rules[k];
    const avail = goalRuleAvailable(k);
    return `<div class="goalSetRow${avail ? "" : " na"}">
      <label class="goalSwitch"><input type="checkbox" data-goal-input="rule-on" data-key="${k}" ${cfg.on ? "checked" : ""} ${avail ? "" : "disabled"} /><span></span></label>
      <span class="goalSetTitle">${esc(T("goal.ruleName." + k))}</span>
      ${"value" in cfg ? `<input class="input goalNum" type="number" step="${k === "maxLossR" ? "0.5" : "1"}" min="0.5" data-goal-input="rule-value" data-key="${k}" value="${esc(String(cfg.value))}" /><span class="goalSetUnit">${esc(T("goal.ruleUnit." + k))}</span>` : ""}
      ${avail ? "" : `<span class="goalSetNeed">${esc(goalRuleNeed(k))}</span>`}
    </div>`;
  }).join("");
  const self = goalPrefs.selfRules.map((s) => `<div class="goalSetRow"><span class="goalSetTitle">${esc(s.title)}</span>
      <button class="tinyBtn" data-action="goal-self-delete" data-id="${esc(s.id)}">${ICONS.trash}</button></div>`).join("");
  return goalPanel(T("goal.settings.title"), `
    <div class="goalSetBlock">
      <div class="goalSetHead">${esc(T("goal.settings.rhythm"))}</div>
      <div class="modeToggle goalRhythm">${GOAL_RHYTHMS.map((r) => `<button class="modeBtn ${goalPrefs.rhythm === r ? "active" : ""}" data-action="goal-set-rhythm" data-rhythm="${r}">${esc(T("goal.rhythm." + r))}</button>`).join("")}</div>
      <div class="goalHint">${esc(T("goal.settings.rhythmHint"))}</div>
    </div>
    <div class="goalSetBlock">
      <div class="goalSetHead">${esc(T("goal.settings.goals"))}<button class="btn" data-action="goal-add">${ICONS.plus} ${esc(T("goal.add"))}</button></div>
      ${goals || `<div class="goalEmpty">${esc(T("goal.noGoals"))}</div>`}
      <button class="tinyBtn" data-action="goal-reset-defaults" style="margin-top:8px;">${esc(T("goal.resetDefaults"))}</button>
    </div>
    <div class="goalSetBlock">
      <div class="goalSetHead">${esc(T("goal.settings.rules"))}</div>
      ${rules}
      <div class="goalHint">${esc(T("goal.settings.rulesHint", { a: -GOAL_POINTS.violation, b: GOAL_POINTS.reflected }))}</div>
    </div>
    <div class="goalSetBlock">
      <div class="goalSetHead">${esc(T("goal.settings.self"))}</div>
      ${self || `<div class="goalEmpty">${esc(T("goal.selfEmpty"))}</div>`}
      <div class="goalAddRow"><input class="input" id="goalSelfInput" maxlength="80" placeholder="${esc(T("goal.selfPlaceholder"))}" /><button class="btn" data-action="goal-self-add">${ICONS.plus} ${esc(T("goal.add"))}</button></div>
    </div>`);
}

/* ============================================================
   结算弹窗
   ============================================================ */
function openGoalSettle(days) {
  const list = days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && goalIsTradingDay(d)).sort();
  if (!list.length) return;
  const self = {};
  list.forEach((d) => { self[d] = { ...((goalDayRow(d) || {}).self_checks || {}) }; });
  goalSettleState = { days: list, self };
  renderSecondaryModals(true);
}
function goalSettleDayHtml(day) {
  const ev = goalEvalDay(day);
  const off = goalDayOff(day);
  const row = goalDayRow(day);
  const self = goalSettleState.self[day] || {};
  const head = `<div class="gsHead"><b>${esc(goalWeekdayLabel(day) + " " + day)}</b>
    <span class="gsMeta">${esc(ev.n ? T("goal.settle.trades", { n: ev.n }) + (ev.hasR ? " · " + fmtNum(ev.r) + "R" : "") : T("goal.settle.noTrades"))}${ev.all.length > ev.n ? " · " + esc(T("goal.settle.untaken", { n: ev.all.length - ev.n })) : ""}</span>
    ${row && row.settled_at ? `<span class="pill on">${esc(T("goal.settle.done"))}</span>` : ""}
    <button class="tinyBtn gsOff" data-action="goal-toggle-off" data-day="${day}">${esc(T(off ? "goal.offUndo" : "goal.offDay"))}</button></div>`;
  if (off) return `<div class="gsDay off">${head}<div class="goalHint">${esc(T("goal.settle.offHint"))}</div></div>`;
  const rules = ev.results.filter((x) => x.on).map((x) => {
    const cls = !x.available ? "na" : !ev.n ? "idle" : x.ok ? "ok" : "bad";
    return `<div class="gsRule ${cls}"><span>${cls === "ok" ? "✓" : cls === "bad" ? "✗" : "·"}</span><span>${esc(goalRuleLabel(x.key))}</span><em>${esc(!x.available ? goalRuleNeed(x.key) : x.detail)}</em></div>`;
  }).join("");
  const selfHtml = goalPrefs.selfRules.map((s) => {
    const ok = self[s.id] !== false;
    return `<div class="gsRule ${ok ? "ok" : "bad"}"><span>${ok ? "✓" : "✗"}</span><span>${esc(s.title)}</span>
      <span class="gsSelfBtns"><button class="chip ${ok ? "active" : ""}" data-action="goal-settle-self" data-day="${day}" data-id="${esc(s.id)}" data-val="1">${esc(T("goal.settle.kept"))}</button><button class="chip ${!ok ? "active" : ""}" data-action="goal-settle-self" data-day="${day}" data-id="${esc(s.id)}" data-val="0">${esc(T("goal.settle.broke"))}</button></span></div>`;
  }).join("");
  const snap = goalBuildSnapshot(day, self);
  const cnt = goalSnapshotCount(snap);
  const reflected = cnt && goalHasReflection(day, snap.tradeIds);
  const P = GOAL_POINTS;
  const pts = !cnt ? (snap.n ? P.cleanDay : P.noTradeDay) : reflected ? P.reflected : Math.max(P.violationCap, cnt * P.violation);
  const plan = goalDayPlan(day);
  return `<div class="gsDay">${head}
    ${rules || `<div class="goalHint">${esc(T("goal.settle.noRules"))}</div>`}
    ${selfHtml}
    ${plan ? `<div class="gsPlan"><b>${esc(T("goal.plan.title"))}</b> ${esc([plan.bias, plan.models.join(" / "), plan.maxTrades ? T("goal.plan.max", { n: plan.maxTrades }) : ""].filter(Boolean).join(" · "))}
      ${snap.deviations.length ? `<div class="gsDev">${snap.deviations.map((x) => esc(x)).join(" · ")}</div>` : `<div class="gsOk">${esc(T("goal.plan.followed"))}</div>`}</div>` : ""}
    ${cnt ? `<div class="gsReflect ${reflected ? "ok" : ""}">${esc(T(reflected ? "goal.settle.reflectedYes" : "goal.settle.reflectNo", { a: -P.violation, b: P.reflected }))}
      ${!reflected && recordMode === "live" ? `<button class="tinyBtn" data-action="goal-new-review" data-day="${day}">${esc(T("goal.go.reflect"))}</button>` : ""}</div>` : ""}
    <div class="gsFoot"><span>${esc(T("goal.settle.score", { n: snap.score }))}</span><b class="mono ${pts < 0 ? "neg" : "pos"}">${pts > 0 ? "+" : ""}${pts} ${esc(T("goal.pointsUnit"))}</b></div>
  </div>`;
}
function goalSettleModalHtml() {
  const s = goalSettleState;
  const anySettled = s.days.some(goalDaySettled);
  const title = s.days.length === 1 ? T("goal.settle.titleDay", { d: s.days[0] }) : T("goal.settle.titleDays", { a: goalShortDate(s.days[0]), b: goalShortDate(s.days[s.days.length - 1]) });
  return `<div class="overlay" data-action="goal-settle-dismiss">
    <div class="modal goalSettleModal" style="max-width:620px;">
      <div class="modalHead"><div class="display" style="font-size:16px;font-weight:600;">${ICONS.target} ${esc(title)}</div>
        <button class="iconBtn" data-action="goal-settle-close">${ICONS.x}</button></div>
      <div class="modalBody">
        <div class="goalHint" style="margin-bottom:12px;">${esc(T("goal.settle.intro"))}</div>
        ${s.days.map(goalSettleDayHtml).join("")}
      </div>
      <div class="modalFoot">
        ${anySettled && s.days.length === 1 ? `<button class="btn" data-action="goal-unsettle" data-day="${s.days[0]}">${esc(T("goal.settle.undo"))}</button>` : ""}
        <button class="btn" data-action="goal-settle-close">${esc(T("common.cancel"))}</button>
        <button class="btn btn-primary" data-action="goal-settle-confirm">${esc(T(anySettled ? "goal.settle.confirmAgain" : "goal.settle.confirm"))}</button>
      </div>
    </div>
  </div>`;
}

/* ---------- 盘前计划 ---------- */
function openGoalPlan(day) {
  goalPlanDay = day;
  const p = goalDayPlan(day);
  goalPlanDraft = p ? { ...p, models: [...p.models] } : { bias: "", models: [], maxTrades: null, note: "" };
  renderSecondaryModals(true);
}
function goalPlanModalHtml() {
  const d = goalPlanDraft;
  const modelF = roleField("model");
  const opts = modelF && Array.isArray(modelF.options) ? modelF.options : [];
  return `<div class="overlay" data-action="goal-plan-dismiss">
    <div class="modal" style="max-width:480px;">
      <div class="modalHead"><div class="display" style="font-size:16px;font-weight:600;">${esc(T("goal.plan.titleDay", { d: goalPlanDay }))}</div>
        <button class="iconBtn" data-action="goal-plan-close">${ICONS.x}</button></div>
      <div class="modalBody">
        <div class="field"><div class="fieldLabel">${esc(T("goal.plan.bias"))}</div><input class="input" id="goalPlanBias" maxlength="120" value="${esc(d.bias)}" placeholder="${esc(T("goal.plan.biasPh"))}" /></div>
        ${opts.length ? `<div class="field"><div class="fieldLabel">${esc(T("goal.plan.models"))}</div><div class="chipGroup">${opts.map((o) => `<button type="button" class="chip ${d.models.includes(o) ? "active" : ""}" data-action="goal-plan-model" data-val="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>` : ""}
        <div class="field"><div class="fieldLabel">${esc(T("goal.plan.maxTrades"))}</div><input class="input" id="goalPlanMax" type="number" min="1" max="50" value="${d.maxTrades || ""}" /></div>
        <div class="field"><div class="fieldLabel">${esc(T("goal.plan.note"))}</div><textarea class="input" id="goalPlanNote" rows="3" maxlength="600">${esc(d.note)}</textarea></div>
        <div class="goalHint">${esc(T("goal.plan.hint"))}</div>
      </div>
      <div class="modalFoot"><button class="btn" data-action="goal-plan-close">${esc(T("common.cancel"))}</button><button class="btn btn-primary" data-action="goal-plan-save">${esc(T("common.save"))}</button></div>
    </div>
  </div>`;
}
function goalReadPlanInputs() {
  if (!goalPlanDraft) return;
  const v = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
  goalPlanDraft.bias = v("goalPlanBias");
  goalPlanDraft.note = v("goalPlanNote");
  const n = parseInt(v("goalPlanMax"), 10);
  goalPlanDraft.maxTrades = n > 0 ? n : null;
}

/* ---------- 编辑一个目标 ---------- */
function openGoalEdit(id) {
  const g = id ? goalPrefs.goals.find((x) => x.id === id) : null;
  goalEditState = g ? { goal: JSON.parse(JSON.stringify(g)), isNew: false }
    : { goal: { id: newGoalId(), kind: "manual", freq: goalPrefs.rhythm === "weekly" ? "weekly" : "trading", title: "", days: [], metric: "trades_complete", area: "review", target: 30 }, isNew: true };
  renderSecondaryModals(true);
}
function goalEditModalHtml() {
  const g = goalEditState.goal;
  const scope = g.freq === "weekly" ? "week" : "day";
  const metrics = Object.keys(GOAL_METRICS).filter((m) => GOAL_METRICS[m][scope]);
  const seg = (name, vals, cur, label) => `<div class="modeToggle goalSeg">${vals.map((v) => `<button class="modeBtn ${cur === v ? "active" : ""}" data-action="goal-edit-set" data-key="${name}" data-val="${v}">${esc(label(v))}</button>`).join("")}</div>`;
  return `<div class="overlay" data-action="goal-edit-dismiss">
    <div class="modal" style="max-width:500px;">
      <div class="modalHead"><div class="display" style="font-size:16px;font-weight:600;">${esc(T(goalEditState.isNew ? "goal.edit.new" : "goal.edit.edit"))}</div>
        <button class="iconBtn" data-action="goal-edit-close">${ICONS.x}</button></div>
      <div class="modalBody">
        <div class="field"><div class="fieldLabel">${esc(T("goal.edit.kind"))}</div>${seg("kind", GOAL_KINDS, g.kind, (v) => T("goal.kind." + v))}
          <div class="goalHint">${esc(T("goal.kind." + g.kind + "Hint"))}</div></div>
        <div class="field"><div class="fieldLabel">${esc(T("goal.edit.freq"))}</div>${seg("freq", GOAL_FREQS, g.freq, (v) => T("goal.freq." + v))}
          ${g.freq === "days" ? `<div class="chipGroup" style="margin-top:8px;">${[1, 2, 3, 4, 5, 6, 7].map((d) => `<button type="button" class="chip ${g.days.includes(d) ? "active" : ""}" data-action="goal-edit-day" data-val="${d}">${esc(T("calendar.week" + ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d - 1]))}</button>`).join("")}</div>` : ""}</div>
        ${g.kind === "auto" ? `<div class="field"><div class="fieldLabel">${esc(T("goal.edit.metric"))}</div><div class="chipGroup">${metrics.map((m) => `<button type="button" class="chip ${g.metric === m ? "active" : ""}" data-action="goal-edit-set" data-key="metric" data-val="${m}">${esc(T("goal.metric." + m + (scope === "week" ? ".w" : "")))}</button>`).join("")}</div></div>` : ""}
        ${g.kind === "timer" ? `<div class="field"><div class="fieldLabel">${esc(T("goal.edit.area"))}</div>${seg("area", GOAL_TIMER_AREAS, g.area, (v) => T("goal.area." + v))}</div>
          <div class="field"><div class="fieldLabel">${esc(T("goal.edit.target"))}</div><input class="input goalNum" id="goalEditTarget" type="number" min="5" max="6000" step="5" value="${esc(String(g.target || 30))}" /> <span class="goalSetUnit">${esc(T("goal.edit.minutes"))}</span></div>` : ""}
        <div class="field"><div class="fieldLabel">${esc(T("goal.edit.title"))}</div><input class="input" id="goalEditTitle" maxlength="80" value="${esc(g.title === "…" ? "" : g.title)}" placeholder="${esc(g.kind === "manual" ? T("goal.edit.titlePhManual") : T("goal.edit.titlePh"))}" /></div>
      </div>
      <div class="modalFoot"><button class="btn" data-action="goal-edit-close">${esc(T("common.cancel"))}</button><button class="btn btn-primary" data-action="goal-edit-save">${esc(T("common.save"))}</button></div>
    </div>
  </div>`;
}
function goalReadEditInputs() {
  if (!goalEditState) return;
  const g = goalEditState.goal;
  const t = document.getElementById("goalEditTitle");
  if (t) g.title = t.value.trim();
  const n = document.getElementById("goalEditTarget");
  if (n) { const v = Math.round(Number(n.value)); if (v > 0) g.target = v; }
}

/* ---------- 点击 ---------- */
async function handleGoalAction(action, el, e) {
  if (viewingUserId && !["goal-toggle-card", "goal-settle-close", "goal-settle-dismiss"].includes(action)) return;
  if (action === "goal-setup") { setupGoals(el.dataset.rhythm); render(); }
  else if (action === "goal-toggle-card") {
    goalCardCollapsed = !goalCardCollapsed;
    try { localStorage.setItem("journal_goal_card_collapsed", goalCardCollapsed ? "1" : "0"); } catch (err) {}
    render();
  }
  else if (action === "goal-toggle-check") {
    const g = goalPrefs.goals.find((x) => x.id === el.dataset.goal);
    if (g) { await toggleGoalCheck(g, el.dataset.period); render(); }
  }
  else if (action === "goal-toggle-off") {
    const d = el.dataset.day;
    const off = !goalDayOff(d);
    await goalPatchDay(d, off ? { off: true, settled_at: null, snapshot: null } : { off: false });
    render();
    if (goalSettleState) renderSecondaryModals(true);
  }
  else if (action === "goal-timer-start") { startGoalTimer(); render(); }
  else if (action === "goal-timer-stop") { await stopGoalTimer(); render(); }
  else if (action === "goal-timer-cancel") { if (confirm(T("goal.timer.cancelConfirm"))) { cancelGoalTimer(); render(); } }
  else if (action === "goal-open-settle") {
    if (el.dataset.week) openGoalSettle(goalTradingDaysOfWeek(el.dataset.period));
    else openGoalSettle(String(el.dataset.days || el.dataset.period || "").split(",").filter(Boolean));
  }
  else if (action === "goal-settle-dismiss") { if (e.target === el) { goalSettleState = null; renderSecondaryModals(true); } }
  else if (action === "goal-settle-close") { goalSettleState = null; renderSecondaryModals(true); }
  else if (action === "goal-settle-self") {
    const s = goalSettleState;
    if (!s) return;
    s.self[el.dataset.day] = { ...(s.self[el.dataset.day] || {}), [el.dataset.id]: el.dataset.val === "1" };
    renderSecondaryModals(true);
  }
  else if (action === "goal-settle-confirm") {
    const s = goalSettleState;
    if (!s) return;
    const ok = await settleGoalDays(s.days, s.self);
    if (ok) goalSettleState = null;
    renderSecondaryModals(true); render();
  }
  else if (action === "goal-unsettle") {
    await unsettleGoalDay(el.dataset.day);
    goalSettleState = null;
    renderSecondaryModals(true); render();
  }
  else if (action === "goal-new-review") {
    if (recordMode !== "live") return;
    goalSettleState = null;
    renderSecondaryModals(true);
    if (el.dataset.week) openNewReview({ weekStart: el.dataset.week, dayDate: "" });
    else openNewReview({ dayDate: el.dataset.day });
  }
  else if (action === "goal-open-plan") { openGoalPlan(el.dataset.day || todayStr()); }
  else if (action === "goal-plan-model") {
    goalReadPlanInputs();
    const v = el.dataset.val;
    goalPlanDraft.models = goalPlanDraft.models.includes(v) ? goalPlanDraft.models.filter((x) => x !== v) : [...goalPlanDraft.models, v];
    renderSecondaryModals(true);
  }
  else if (action === "goal-plan-dismiss") { if (e.target === el) { goalPlanDay = null; renderSecondaryModals(true); } }
  else if (action === "goal-plan-close") { goalPlanDay = null; renderSecondaryModals(true); }
  else if (action === "goal-plan-save") {
    goalReadPlanInputs();
    const day = goalPlanDay;
    const p = goalPlanDraft;
    const empty = !p.bias.trim() && !p.models.length && !p.maxTrades && !p.note.trim();
    const ok = await goalPatchDay(day, { plan: empty ? null : { bias: p.bias.trim(), models: p.models, maxTrades: p.maxTrades, note: p.note.trim() } });
    if (ok) goalPlanDay = null;
    renderSecondaryModals(true); render();
  }
  else if (action === "goal-set-rhythm") {
    const r = el.dataset.rhythm;
    if (r === goalPrefs.rhythm) return;
    goalPrefs.rhythm = r;
    saveGoalPrefsNow(); render();
  }
  else if (action === "goal-add") { openGoalEdit(null); }
  else if (action === "goal-edit") { openGoalEdit(el.dataset.goal); }
  else if (action === "goal-edit-set") {
    goalReadEditInputs();
    const g = goalEditState.goal;
    g[el.dataset.key] = el.dataset.val;
    if (el.dataset.key === "freq" || el.dataset.key === "kind") {
      const scope = g.freq === "weekly" ? "week" : "day";
      if (!GOAL_METRICS[g.metric] || !GOAL_METRICS[g.metric][scope]) g.metric = "trades_complete";
    }
    renderSecondaryModals(true);
  }
  else if (action === "goal-edit-day") {
    goalReadEditInputs();
    const d = +el.dataset.val, g = goalEditState.goal;
    g.days = g.days.includes(d) ? g.days.filter((x) => x !== d) : [...g.days, d].sort();
    renderSecondaryModals(true);
  }
  else if (action === "goal-edit-dismiss") { if (e.target === el) { goalEditState = null; renderSecondaryModals(true); } }
  else if (action === "goal-edit-close") { goalEditState = null; renderSecondaryModals(true); }
  else if (action === "goal-edit-save") {
    goalReadEditInputs();
    const g = normalizeGoal(goalEditState.goal);
    if (g.kind === "manual" && (!g.title || g.title === "…")) { alert(T("goal.edit.needTitle")); return; }
    if (g.freq === "days" && !g.days.length) { alert(T("goal.edit.needDays")); return; }
    const i = goalPrefs.goals.findIndex((x) => x.id === g.id);
    if (i >= 0) goalPrefs.goals[i] = g; else goalPrefs.goals.push(g);
    goalEditState = null;
    saveGoalPrefsNow();
    renderSecondaryModals(true); render();
  }
  else if (action === "goal-delete-ask") { goalConfirmDeleteId = el.dataset.goal; render(); }
  else if (action === "goal-delete-cancel") { goalConfirmDeleteId = null; render(); }
  else if (action === "goal-delete") {
    goalPrefs.goals = goalPrefs.goals.filter((x) => x.id !== el.dataset.goal);
    goalConfirmDeleteId = null;
    saveGoalPrefsNow(); render();
  }
  else if (action === "goal-reset-defaults") {
    if (!confirm(T("goal.resetConfirm"))) return;
    goalPrefs.goals = defaultGoals(goalPrefs.rhythm);
    saveGoalPrefsNow(); render();
  }
  else if (action === "goal-self-add") {
    const input = document.getElementById("goalSelfInput");
    const title = input ? input.value.trim().slice(0, 80) : "";
    if (!title) return;
    goalPrefs.selfRules.push({ id: newGoalId(), title });
    saveGoalPrefsNow(); render();
  }
  else if (action === "goal-self-delete") {
    goalPrefs.selfRules = goalPrefs.selfRules.filter((x) => x.id !== el.dataset.id);
    saveGoalPrefsNow(); render();
  }
  else if (action === "goal-manual-add") {
    const day = (document.getElementById("goalManualDay") || {}).value;
    const min = Math.round(Number((document.getElementById("goalManualMin") || {}).value));
    if (!day || !(min > 0)) return;
    if (await addActivityDirect(day, "manual_review", Math.min(min, 360) * 60)) {
      const inp = document.getElementById("goalManualMin");
      if (inp) inp.value = "";
    }
    render();
  }
}
/* 设置里的开关和数字框（change 事件） */
function handleGoalInput(input) {
  if (viewingUserId) return;
  const key = input.dataset.key;
  const rule = goalPrefs.rules[key];
  if (!rule) return;
  if (input.dataset.goalInput === "rule-on") rule.on = input.checked;
  if (input.dataset.goalInput === "rule-value") {
    const n = Number(input.value);
    if (n > 0 && n < 1000) rule.value = n;
  }
  queueSaveGoalPrefs();
  render();
}

/* ---------- 月度日历上的小标记：结算过的交易日 ✓ / ✗n，休息日「休」 ---------- */
function goalCalBadge(day) {
  if (recordMode !== "live" || !goalLoaded || !goalSetupDone()) return "";
  const row = goalDayRow(day);
  if (!row) return "";
  if (row.off) return `<span class="goalCalBadge off" title="${esc(T("goal.heat.off"))}">${esc(T("goal.calOff"))}</span>`;
  if (!row.settled_at || !row.snapshot) return "";
  const n = goalSnapshotCount(row.snapshot);
  return `<span class="goalCalBadge ${n ? "bad" : "ok"}" title="${esc(T("goal.settle.score", { n: row.snapshot.score }))}">${n ? "✗" + n : "✓"}</span>`;
}

/* 新建实盘交易时：今天已经触到日内最大亏损 / 最多笔数，表单顶上提醒一句（只提醒，不拦） */
function goalFormWarningHtml() {
  const dateF = roleField("date");
  const day = (dateF && formDraft && /^\d{4}-\d{2}-\d{2}$/.test(formDraft[dateF.id] || "")) ? formDraft[dateF.id] : todayStr();
  const msg = goalLiveWarning(day);
  return msg ? `<div class="notice error goalFormWarn">${ICONS.alert}<span>${esc(msg)}</span></div>` : "";
}

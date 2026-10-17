/* ============================================================
   使用时长（只算实盘）+ 复盘计时器

   自动计时：只在「标签页在前台、窗口有焦点、2 分钟内动过鼠标 / 键盘 / 滚轮」时算，挂机不算，
   开好几个标签页也只有有焦点的那个在算。每 15 秒记一笔到内存（同时落 localStorage，关页面不丢），
   每 5 分钟、或者切走 / 关页面时，用 add_activity() 加到服务器上（一天一个区域一行，只存秒数）。
   一小时大概 12 个很小的请求，对性能没影响。

   在哪算哪：复盘编辑器 / 复盘页 = review，模型库 = playbook（跨模式，回测模式下也算），
   看图模式 = focus，记录 / 月度 / 目标页 = trades，分析 = analytics。回测模式下除模型库外都不算。

   计时器：给网站外面的复盘（看回放、在 TradingView 上画）用。只记开始时间（localStorage），
   关掉网页照样在走，回来点结束就记一段到开始那天（timer_review，一次最多 6 小时）。
   计时器在走的时候自动计时暂停，免得同一段时间算两遍。
   ============================================================ */
const ACT_TICK_MS = 15000;
const ACT_IDLE_MS = 120000;
const ACT_FLUSH_MS = 300000;
const ACT_PASSIVE_CAP = 900;        // 服务器那边每次最多收 15 分钟（自动计时）
const ACT_TIMER_CAP = 21600;        // 计时器 / 补录一次最多 6 小时
const ACT_PENDING_KEY = "journal_act_pending";
const GOAL_TIMER_KEY = "journal_goal_timer";
let actLastInput = Date.now();
let actLastTick = Date.now();
let actLastFlush = Date.now();
let actFlushing = false;
let actStarted = false;

function actUid() { return session && session.user ? session.user.id : null; }
/* 本机还没传上去的秒数：{ uid, data: { day: { area: seconds } } }。换了账号就作废 */
function actLoadPending() {
  try {
    const raw = JSON.parse(localStorage.getItem(ACT_PENDING_KEY) || "null");
    return raw && raw.uid === actUid() && raw.data && typeof raw.data === "object" ? raw.data : {};
  } catch (e) { return {}; }
}
function actSavePending(data) {
  try { localStorage.setItem(ACT_PENDING_KEY, JSON.stringify({ uid: actUid(), data })); } catch (e) {}
}
function actPendingSeconds(day, areas) {
  if (!actUid()) return 0;
  const row = actLoadPending()[day] || {};
  return Object.keys(row).reduce((s, a) => s + (!areas || areas.includes(a) ? row[a] : 0), 0);
}
function activityArea() {
  if (!session || viewingUserId || authLoading || !goalLoaded) return null;
  if (goalTimerState()) return null;
  if (editingReview) {
    if (isPbDoc(editingReview)) return "playbook";
    return (editingReview.mode || recordMode) === "live" ? "review" : null;
  }
  if (tab === "playbook") return "playbook";
  if (recordMode !== "live") return null;
  if (tab === "grid") return gridViewMode === "focus" ? "focus" : "trades";
  if (tab === "reviews") return "review";
  if (tab === "analytics") return "analytics";
  if (tab === "calendar" || tab === GOAL_TAB) return "trades";
  return null;
}
function actIsActive(now) {
  return document.visibilityState === "visible" && (typeof document.hasFocus !== "function" || document.hasFocus()) && now - actLastInput < ACT_IDLE_MS;
}
function actTick() {
  const now = Date.now();
  const dt = Math.min(now - actLastTick, ACT_TICK_MS + 5000);
  actLastTick = now;
  const area = activityArea();
  if (area && dt > 0 && actIsActive(now)) {
    const data = actLoadPending();
    const day = todayStr();
    data[day] = data[day] || {};
    data[day][area] = (data[day][area] || 0) + dt / 1000;
    actSavePending(data);
  }
  if (now - actLastFlush >= ACT_FLUSH_MS) flushActivity();
}
/* 本机攒的秒数加到服务器上。超过单次上限的拆成几次发；成功一笔从本机扣一笔，失败的留着下次再发 */
async function flushActivity() {
  actLastFlush = Date.now();
  if (actFlushing || !sb || !session || viewingUserId) return;
  actFlushing = true;
  try {
    const data = actLoadPending();
    let changed = false;
    for (const day of Object.keys(data)) {
      for (const area of Object.keys(data[day])) {
        let sec = Math.floor(data[day][area]);
        while (sec >= 1) {
          const part = Math.min(sec, ACT_PASSIVE_CAP);
          const { error } = await sb.rpc("add_activity", { p_day: day, p_area: area, p_seconds: part });
          if (error) { console.error(error); actSavePending(data); return; }
          goalActivityAdd(day, area, part);
          sec -= part;
          data[day][area] -= part;
          changed = true;
        }
        if (data[day][area] < 1) delete data[day][area];
      }
      if (!Object.keys(data[day]).length) delete data[day];
    }
    // 服务器只收最近 8 天：再老的（离线太久）丢掉，免得每次都发一遍
    const oldest = goalAddDays(todayStr(), -7);
    Object.keys(data).forEach((d) => { if (d < oldest) delete data[d]; });
    actSavePending(data);
    if (changed) { queueGoalSync(); if (tab === "grid" || tab === GOAL_TAB) render(); }
  } finally { actFlushing = false; }
}
function goalActivityAdd(day, area, seconds) {
  const row = goalActivity.find((a) => a.day === day && a.area === area);
  if (row) row.seconds += seconds; else goalActivity.push({ day, area, seconds });
  goalTouch();
}
/* 计时器 / 手动补录：一次最多 6 小时，直接发，不经过本机暂存 */
async function addActivityDirect(day, area, seconds) {
  if (!sb || !session || viewingUserId) return false;
  const sec = Math.max(0, Math.min(ACT_TIMER_CAP, Math.round(seconds)));
  if (!sec) return true;
  const { error } = await sb.rpc("add_activity", { p_day: day, p_area: area, p_seconds: sec });
  if (error) {
    console.error(error);
    goalError = noteDbError(error) ? T("error.dbOutdated") : T("goal.saveFailed", { msg: error.message });
    return false;
  }
  goalActivityAdd(day, area, sec);
  queueGoalSync();
  return true;
}

/* ---------- 计时器 ---------- */
function goalTimerState() {
  try {
    const raw = JSON.parse(localStorage.getItem(GOAL_TIMER_KEY) || "null");
    return raw && raw.uid === actUid() && typeof raw.start === "number" ? raw : null;
  } catch (e) { return null; }
}
function startGoalTimer() {
  if (goalTimerState() || viewingUserId) return;
  flushActivity();   // 开始之前那段自动计时先交上去
  try { localStorage.setItem(GOAL_TIMER_KEY, JSON.stringify({ uid: actUid(), start: Date.now() })); } catch (e) {}
}
async function stopGoalTimer() {
  const st = goalTimerState();
  if (!st) return;
  try { localStorage.removeItem(GOAL_TIMER_KEY); } catch (e) {}
  const sec = (Date.now() - st.start) / 1000;
  const ok = await addActivityDirect(toDateStr(new Date(st.start)), "timer_review", sec);
  if (!ok) { try { localStorage.setItem(GOAL_TIMER_KEY, JSON.stringify(st)); } catch (e) {} }
  if (sec > ACT_TIMER_CAP) goalError = T("goal.timer.capped");
  actLastTick = Date.now();
}
function cancelGoalTimer() { try { localStorage.removeItem(GOAL_TIMER_KEY); } catch (e) {} actLastTick = Date.now(); }
function goalTimerClockText() {
  const st = goalTimerState();
  if (!st) return "";
  const s = Math.max(0, Math.floor((Date.now() - st.start) / 1000));
  const pad = (n) => String(n).padStart(2, "0");
  return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60);
}
/* 计时器的钟每秒走一下：只改那几个 span 的字，不重绘页面 */
function tickGoalClock() {
  const els = document.querySelectorAll("[data-goal-clock]");
  if (!els.length) return;
  const txt = goalTimerClockText();
  els.forEach((el) => { el.textContent = txt; });
}

function startActivityTracking() {
  if (actStarted || typeof window === "undefined" || !window.addEventListener || typeof setInterval !== "function") return;
  actStarted = true;
  const mark = () => { actLastInput = Date.now(); };
  ["mousemove", "mousedown", "keydown", "wheel", "touchstart", "scroll"].forEach((ev) => window.addEventListener(ev, mark, { passive: true, capture: true }));
  setInterval(actTick, ACT_TICK_MS);
  setInterval(tickGoalClock, 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { actTick(); flushActivity(); }
    else { actLastTick = Date.now(); actLastInput = Date.now(); }
  });
  window.addEventListener("pagehide", () => { actTick(); });
}

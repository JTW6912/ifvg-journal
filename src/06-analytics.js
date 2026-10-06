/* ============================================================
   ANALYTICS ENGINE
   ============================================================ */
// 模型筛选（多选，空=全部）也算总览/拆解的口径之一，跟另外两个开关一样不影响组合
// 分析页当前在看的那批交易：总览数字、字段拆解、最大回撤全都用这一批，没有任何额外的隐藏过滤。
// 「看到的数字 = 面板里那几条条件筛出来的结果」是这一页唯一的口径规则，别再往里塞暗逻辑。
function analysisFilteredTrades() {
  return scopedTrades().filter((t) => tradeMatchesFilters(t, analysisFilters));
}
// Profit Factor：正R之和 ÷ |负R之和|。只统计真的填了 R 的那些交易，n 一并返回好让 UI 标注口径。
function profitFactorOf(list, rF) {
  if (!rF) return { pf: null, n: 0 };
  let gross = 0, loss = 0, n = 0;
  list.forEach((t) => {
    const raw = t[rF.id];
    if (raw === undefined || raw === null || raw === "") return;
    const v = parseFloat(raw);
    if (isNaN(v)) return;
    n++;
    if (v > 0) gross += v; else if (v < 0) loss += -v;
  });
  if (!n) return { pf: null, n: 0 };
  if (loss === 0) return { pf: gross > 0 ? Infinity : null, n };
  return { pf: gross / loss, n };
}
function fmtPF(pf) {
  if (pf === null || pf === undefined) return "—";
  if (pf === Infinity) return "∞";
  return pf.toFixed(2);
}
function pfColor(pf) {
  if (pf === null || pf === undefined) return "var(--muted)";
  if (pf === Infinity) return "var(--pos)";
  return pf >= 1 ? "var(--pos)" : "var(--neg)";
}
// 最大回撤：按交易日期把 R 累加成一条资金曲线，取「峰值 → 谷底」的最大跌幅，单位 R，返回正数。
// 只算真的填了 R 的交易；没填日期的排到最后，免得它们插进曲线中间把回撤算歪。
function maxDrawdownR(list, rF) {
  if (!rF) return null;
  const dateF = roleField("date");
  const rows = list.filter((t) => {
    const raw = t[rF.id];
    return raw !== undefined && raw !== null && raw !== "" && !isNaN(parseFloat(raw));
  });
  if (!rows.length) return null;
  const dayOf = (t) => (dateF && t[dateF.id] ? String(t[dateF.id]) : "9999-12-31");
  const ordered = rows.slice().sort((a, b) => {
    const da = dayOf(a), db = dayOf(b);
    if (da !== db) return da < db ? -1 : 1;
    return String(a._created_at || "").localeCompare(String(b._created_at || ""));
  });
  let equity = 0, peak = 0, maxDD = 0;
  ordered.forEach((t) => {
    equity += parseFloat(t[rF.id]);
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDD) maxDD = dd;
  });
  return { dd: maxDD, n: ordered.length };
}
// 资金曲线：跟 maxDrawdownR 同一个排序口径（按交易日期，同一天按创建时间），返回每一笔之后的累计 R。
// 只给分析页顶部那张曲线图用，不参与任何统计
function equityCurve(list, rF) {
  if (!rF) return [];
  const dateF = roleField("date");
  const dayOf = (t) => (dateF && t[dateF.id] ? String(t[dateF.id]) : "9999-12-31");
  const rows = list.filter((t) => {
    const raw = t[rF.id];
    return raw !== undefined && raw !== null && raw !== "" && !isNaN(parseFloat(raw));
  }).sort((a, b) => {
    const da = dayOf(a), db = dayOf(b);
    if (da !== db) return da < db ? -1 : 1;
    return String(a._created_at || "").localeCompare(String(b._created_at || ""));
  });
  let eq = 0;
  return rows.map((t) => { eq += parseFloat(t[rF.id]); return { date: dateF ? t[dateF.id] || "" : "", eq }; });
}
// 标题栏那行摘要用的是固定口径（只算 Taken），故意不吃分析页的筛选：
// 它代表"这个账号现在整体什么水平"，不该被某一页里临时筛出来的一小撮交易带偏。
function headerStats() {
  const takenF = roleField("taken"), resultF = roleField("result"), rF = roleField("r_multiple");
  const base = scopedTrades();
  const list = takenF ? base.filter((t) => t[takenF.id] === "Taken") : base;
  const w = resultF ? list.filter((t) => isWinResult(t[resultF.id])).length : 0;
  const l = resultF ? list.filter((t) => isLossResult(t[resultF.id])).length : 0;
  let ev = null, hasR = false;
  if (rF) {
    const totalR = list.reduce((sum, t) => {
      if (t[rF.id] !== undefined && t[rF.id] !== "") { hasR = true; return sum + (parseFloat(t[rF.id]) || 0); }
      return sum;
    }, 0);
    ev = list.length ? totalR / list.length : null;
  }
  return { n: list.length, wr: w + l ? (w / (w + l)) * 100 : null, ev, hasR };
}
// list 默认是分析页那批（analysisFilteredTrades）；月度页传自己筛出来的那批进来，口径照旧
function computeStats(list = analysisFilteredTrades()) {
  const resultF = roleField("result"), takenF = roleField("taken"), rF = roleField("r_multiple");
  const isW = (t) => !!resultF && isWinResult(t[resultF.id]);
  const isL = (t) => !!resultF && isLossResult(t[resultF.id]);
  const isBEW = (t) => !!resultF && resultBucket(t[resultF.id]) === "bewin";
  const isBEL = (t) => !!resultF && resultBucket(t[resultF.id]) === "beloss";
  const isBE = (t) => !!resultF && resultBucket(t[resultF.id]) === "be";
  const w = list.filter(isW).length, l = list.filter(isL).length;
  const bew = list.filter(isBEW).length, bel = list.filter(isBEL).length, be = list.filter(isBE).length;
  const wr = w + l ? (w / (w + l)) * 100 : null;
  const sq = w + l + bew + bel ? ((w + bew) / (w + l + bew + bel)) * 100 : null;
  let totalR = null, ev = null;
  if (rF) { totalR = list.reduce((sum, t) => sum + (parseFloat(t[rF.id]) || 0), 0); ev = list.length ? totalR / list.length : null; }
  // Faded 这行是「当前这批里被放掉的」，不是从别处另算一批——分析页所有数字都出自同一个 list
  const faded = takenF ? list.filter((t) => t[takenF.id] === "Faded") : [];
  const pfInfo = profitFactorOf(list, rF);
  const ddInfo = maxDrawdownR(list, rF);
  // 拆解不在这里算：render() 每次重绘都会调 computeStats()，塞进来等于在设置页点个按钮也要把
  // 所有字段拆解白算一遍。拆解由 renderAnalytics() 拿 stats.list 单独算，只在分析页付这个代价。
  return { list, total: list.length, totalFaded: faded.length, w, l, be, bew, bel, wr, sq, totalR, ev,
           dd: ddInfo ? ddInfo.dd : null, ddSample: ddInfo ? ddInfo.n : 0,
           pf: pfInfo.pf, pfSample: pfInfo.n,
           fadedW: faded.filter(isW).length, fadedL: faded.filter(isL).length,
           hasResult: !!resultF, hasR: !!rF };
}

/* ============================================================
   近期表现 —— 按「创建日期」往回看几个滚动窗口
   问的是「我最近这几天录进来的单打得怎么样」。用创建日期而不是交易日期，是因为回测模式下
   交易日期可能是 2021 年的历史 K 线，只有创建日期才代表「我最近的判断水平」。

   三个窗口是故意重叠的（最近 3 天也在最近 30 天里），读法是「越往右越平滑」：
   最右边那格是当前分析范围的全体，当基准，前三格标相对它的差值。
   正因为重叠，它不能做成拆解卡——拆解卡各行的语义是互斥分桶，混进重叠窗口会让人以为笔数算错了。

   ⚠ 口径：这块放在月度页，切的是月度页当前筛选（activeFilters）那批交易，不是全部 trades。
   卡片上写明「基于当前筛选」，用户改了上面的筛选这里会跟着动；跟日历用的是同一批。
   ============================================================ */
const RECENT_WINDOWS = [3, 7, 30];
// 按本地自然日往回数，今天算第 1 天：最近 3 天 = 今天 + 昨天 + 前天。
// 不用「往回 72 小时」是因为那样同一批交易上午看和下午看结果会不一样
function recentWindowStats(list) {
  const resultF = roleField("result"), rF = roleField("r_multiple");
  const today = toDateStr(new Date());
  return RECENT_WINDOWS.map((days) => {
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const fromStr = toDateStr(from);
    const sub = list.filter((t) => {
      const c = localDateStr(t._created_at);
      return c && c >= fromStr && c <= today;
    });
    return { days, ...breakdownRowStats(T("recent.window", { n: days }), sub, resultF, rF) };
  });
}

/* ============================================================
   TIME BUCKETS —— 时间字段的分段拆解
   time 类型字段（入场时间这种）没法像 select 那样按值拆：每个 09:37 都是独一无二的值，
   拆出来是几十行 n=1。所以按用户定义的边界切成时间段，用「这个时段的胜率」来拆。

   边界存 analysisPrefs.timeBuckets，是一串 "HH:MM"，n 个边界切出 n-1 段，左闭右开：
   ["09:30","09:45","10:00"] → [09:30,09:45) 和 [09:45,10:00)，09:45 那笔算后一段。
   默认这套是美股 RTH（开盘 09:30 起，前半小时切细、后面放宽），记纽约数据直接能用；
   记 London/Asia 时段的用户在「拆解显示设置」里改成自己的边界。
   落在所有段之外的交易归到最后一行「其他时段」，不静默丢掉——否则用户会觉得笔数对不上。

   ⚠ 这里全是 "HH:MM" 的字符串比较，不转数字：值本来就是 normalizeTimeValue() 补过零的
   两位小时+两位分钟，字典序等于时间序。别改成 parseInt，那样 09:30 会变成 930 反而要处理进位。

   ⚠ DEFAULT_TIME_BUCKETS 不在这一段里，它被提到文件最上面的 STATE 之前去了——
   defaultAnalysisPrefs() 在模块加载时就被调用（let analysisPrefs = defaultAnalysisPrefs()），
   const 放在这里的话那次调用会撞上 TDZ，整个 app.js 直接起不来。
   ============================================================ */
// 清洗一串边界：去掉解析不出来的、去重、排序。不足 2 个（切不出任何一段）就回落到默认，
// 免得用户不小心清空之后时间拆解卡整张消失、还不知道为什么
function sanitizeTimeBoundaries(raw) {
  if (!Array.isArray(raw)) return DEFAULT_TIME_BUCKETS.slice();
  const seen = new Set();
  raw.forEach((v) => {
    const norm = normalizeTimeValue(v);
    if (norm) seen.add(norm);
  });
  const list = Array.from(seen).sort();
  return list.length >= 2 ? list : DEFAULT_TIME_BUCKETS.slice();
}
// 用户在输入框里随便怎么分隔（逗号 / 中文逗号 / 空格 / 顿号）都认
function parseTimeBoundaryInput(text) {
  return sanitizeTimeBoundaries(String(text || "").split(/[,，、\s]+/).filter(Boolean));
}
function currentTimeBoundaries() {
  return sanitizeTimeBoundaries(analysisPrefs.timeBuckets);
}
// 边界 → 段。每段 { label, start, end }，end 是开区间上界
function timeBucketDefs() {
  const b = currentTimeBoundaries();
  const out = [];
  for (let i = 0; i < b.length - 1; i++) out.push({ label: b[i] + "–" + b[i + 1], start: b[i], end: b[i + 1] });
  return out;
}
// 段是左闭右开 [start, end)，但筛选行的时间区间是两头都闭的（tradeMatchesFilter 里 tv > rangeEnd 才排除）。
// 直接把 end 填进筛选，09:45 那笔会同时算进 [09:30,09:45) 这一行和它生成的组合里，两个数字对不上。
// 时间精度就是分钟，所以退一分钟正好等价。
function timeMinusOneMinute(hhmm) {
  const [h, m] = String(hhmm).split(":").map((x) => parseInt(x, 10));
  if (isNaN(h) || isNaN(m)) return hhmm;
  const total = h * 60 + m - 1;
  if (total < 0) return "00:00";
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}
// 一笔交易的时间值落在第几段；返回 -1 表示落在所有段之外（归「其他时段」）
function timeBucketIndexOf(value, defs) {
  const v = normalizeTimeValue(value);
  if (!v) return -1;
  for (let i = 0; i < defs.length; i++) if (v >= defs[i].start && v < defs[i].end) return i;
  return -1;
}

/* ============================================================
   显著性 —— 「这个值真的不一样，还是只是样本小在抖」
   ⚠️ 不要用 |胜率 - 整体胜率| 来排序找发现。小样本天生波动大，n=3 打出 100% 太容易了，
   于是按差值排的结果是：**数据里一点 edge 都没有的时候，仍然有约 2/3 的概率把 n≤5 的行顶到第一名**。
   它找的不是发现，是最小的那个样本。换成下面的 z 检验后这个概率掉到 1/5 左右。

   口径：**这一行 vs 其余所有交易（补集）**，不是 vs 整体。这一行本身是整体的一部分，
   跟整体比会把差距稀释——某个值占了 70% 的交易时它跟整体必然接近，但跟另外那 30% 可能差很远。
   「这个值 vs 其他值」才是真正要问的问题，也才是一个合法的两样本检验。
   ============================================================ */
// 两比例 z 检验。分子是胜率差，分母随样本变小而变大，所以同样的差值样本越大 z 越高
function twoProportionZ(w1, l1, w2, l2) {
  const n1 = w1 + l1, n2 = w2 + l2;
  if (!n1 || !n2) return null;
  const p1 = w1 / n1, p2 = w2 / n2, p = (w1 + w2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  if (!se) return null;                       // 两边胜率都是 0% 或都是 100%：没有可比的波动
  return (p1 - p2) / se;
}
// Welch t 检验（两组方差不等）。比较两组 R 的均值——交易者真正该看的是每笔期望收益，
// 不是胜率：40% 胜率的 +3R 打法比 65% 胜率的 +0.3R 赚得多，而且胜率完全看不见 BE 的磨损
function welchT(a, b) {
  if (a.length < 2 || b.length < 2) return null;
  const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length;
  const varOf = (x, m) => x.reduce((s, v) => s + (v - m) * (v - m), 0) / (x.length - 1);
  const ma = mean(a), mb = mean(b);
  const se = Math.sqrt(varOf(a, ma) / a.length + varOf(b, mb) / b.length);
  if (!se) return null;
  return (ma - mb) / se;
}
// 正态分布双尾 p 值。t 检验这里也借用正态近似：样本量到了这个功能的门槛（默认 5 笔起）
// 之后两者差别对「排序」和「FDR 打标」都不构成影响，不值得为此背一张 t 分布表
function twoSidedP(z) {
  if (z === null || z === undefined || isNaN(z)) return 1;
  // Abramowitz & Stegun 7.1.26 的 erf 近似，精度 1.5e-7，够用
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return Math.max(0, Math.min(1, 1 - y));     // 1 - erf(|z|/√2) = 双尾 p
}

/* Benjamini–Hochberg FDR。
   ⚠️ 这是这个功能最危险的地方：10 个字段 × 每个 5 个值 ≈ 50 个组合，按 p<0.05 这个常规标准，
   **纯随机也会有 ~2.5 个看起来显著**。也就是说不加控制的话，每次都会递给用户一两个假发现，
   而且长得跟真的一模一样。所以：分数只用来排序，「强信号」这个徽章只发给过了 BH 的行，
   页面上还要常驻一句「本次检验了 N 个组合，预计有 ~X 个是随机波动」——丑话写在脸上。 */
const FDR_Q = 0.10;
function markFdrSignificant(rows) {
  const cand = rows.filter((r) => r.sig && r.sig.p !== null && r.sig.p !== undefined);
  const m = cand.length;
  if (!m) return;
  const sorted = cand.slice().sort((a, b) => a.sig.p - b.sig.p);
  let cutoff = -1;
  sorted.forEach((r, i) => { if (r.sig.p <= ((i + 1) / m) * FDR_Q) cutoff = i; });
  sorted.forEach((r, i) => { r.sig.strong = i <= cutoff; });
}

/* ---------- 字段拆解 ---------- */
// 能拆解的字段：所有 select/multiselect（只排掉「结果」角色——按 result 拆是自我循环，W 那行必然 100%），
// 外加所有 time 字段（按上面那套时间段分桶）。跟项目其他地方一样只认 type/role，不认字段叫什么名字，
// 所以以后加个「出场时间」字段也会自动多出一张拆解卡
function breakdownCandidateFields() {
  const all = schema.filter((f) => (f.type === "select" || f.type === "multiselect" || f.type === "time") && f.role !== "result");
  // 模型库归属也能拆：「哪个策略在赚钱」正是建模型库想回答的问题
  if (pbHasPages()) all.push(playbookVirtualField());
  if (pbTags().length) all.push(pbTagsVirtualField());   // 「有 SMT 的单是不是更好」
  const order = analysisPrefs.breakdownOrder || [];
  const ranked = [], rest = [];
  all.forEach((f) => (order.includes(f.id) ? ranked : rest).push(f));
  ranked.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  // 用户没排过的：taken / 人为错误 这两个信息量低，默认沉到最后
  const lowSignal = (f) => (f.role === "taken" || f.role === "human_error" ? 1 : 0);
  rest.sort((a, b) => lowSignal(a) - lowSignal(b));
  return ranked.concat(rest);
}
function visibleBreakdownFields() {
  const hidden = analysisPrefs.breakdownHidden || [];
  return breakdownCandidateFields().filter((f) => !hidden.includes(f.id));
}
// 一个选项值下面那批交易的统计。n 是全部笔数（含 BE 系列），胜率分母只算 W 和 L。
function breakdownRowStats(value, list, resultF, rF) {
  const res = (t) => (resultF ? t[resultF.id] : "");
  const w = list.filter((t) => isWinResult(res(t))).length;
  const l = list.filter((t) => isLossResult(res(t))).length;
  const be = list.filter((t) => isAnyBEResult(res(t))).length;
  const wr = w + l ? (w / (w + l)) * 100 : null;
  let totalR = null, ev = null, hasR = false;
  if (rF) {
    totalR = list.reduce((s, t) => {
      const raw = t[rF.id];
      if (raw === undefined || raw === null || raw === "") return s;
      hasR = true;
      return s + (parseFloat(raw) || 0);
    }, 0);
    ev = list.length ? totalR / list.length : null;
  }
  const pfInfo = profitFactorOf(list, rF);
  return { value, w, l, be, n: list.length, wr, totalR, ev, hasR, pf: pfInfo.pf };
}
// 拆解行的排序。默认按笔数，找 edge 时按「离整体多远」或按 EV 更快。
// 排序在渲染时做（要用到整批的胜率做基准），computeBreakdowns 里那次按 n 排只是给个稳定的初始顺序
// 一行在当前排序模式下的显著性分数。够不到样本阈值的行 sig 里全是 null，score 返回 -Infinity 排到最后
function rowSigScore(r, mode) {
  const s = r.sig;
  if (!s) return -Infinity;
  const v = mode === "sig_wr" ? s.z : s.t;
  return v === null || v === undefined || isNaN(v) ? -Infinity : Math.abs(v);
}
function isSigSort(mode) { return mode === "sig_r" || mode === "sig_wr"; }
// 排序下拉选的是「按 R」还是「按胜率」时就用它；选的是笔数/差值/EV 这类非显著性排序时，
// 卡片排序和重点发现仍然要有个口径——有 R 字段就按 R，没有就按胜率
function sigMetric() {
  if (isSigSort(breakdownSort)) return breakdownSort;
  return roleField("r_multiple") ? "sig_r" : "sig_wr";
}
/* 一张卡的分数 = 卡里**最高**的那个 |z|，不是平均。
   要回答的问题是「我该先看哪个字段」，答案就是「含有最突出那个值的字段」；
   取平均会让一个爆点被同卡里几个平庸值稀释掉，正好把最该看的卡按下去 */
function breakdownCardScore(b) {
  const m = sigMetric();
  return (b.rows || []).reduce((mx, r) => Math.max(mx, rowSigScore(r, m)), -Infinity);
}
function sortBreakdownCards(cards) {
  if (breakdownCardOrder !== "sig") return cards;
  return cards.slice().sort((a, b) => (breakdownCardScore(b) - breakdownCardScore(a)) || (b.rows.length - a.rows.length));
}
/* 「重点发现」：跨所有字段所有值，按 |z| 取最高的几条。
   光重排卡片只做到「最值得看的字段排第一」，进了那张卡还得再找是哪一行；
   这条摘要直接把「哪个字段的哪个值」摆到眼前，才是真正的一眼看到最该看的东西。 */
const TOP_FINDINGS = 4;
function topFindings(breakdowns) {
  const m = sigMetric();
  const minN = currentMinSample();
  const all = [];
  breakdowns.forEach((b) => (b.rows || []).forEach((r) => {
    if (r.n < minN) return;                       // 够不到阈值的不进重点发现
    const score = rowSigScore(r, m);
    if (score === -Infinity) return;
    all.push({ field: b.field, row: r, score, metric: m });
  }));
  all.sort((a, b) => b.score - a.score);
  // ⚠️ 一个字段最多占一条。二值字段（BW / non-BW）的两行互为补集，是同一个发现的正反两面，
  // 都列出来等于用两个名额说同一件事；多值字段的次强行也多半是被最强行挤出来的镜像。
  // 这条摘要是「先看哪儿」的索引，名额应该花在不同字段上——想看全部的行点进卡片就有
  const seen = new Set();
  const picked = [];
  all.forEach((f) => {
    if (seen.has(f.field.id)) return;
    seen.add(f.field.id);
    picked.push(f);
  });
  return picked.slice(0, TOP_FINDINGS);
}
// 这一页一共检验了多少个组合、纯随机预计有几个会达到 p<0.05。
// 丑话写在脸上：不写这句的话，用户会把排在最上面那条当成已经验证过的结论
function findingsTestCount(breakdowns) {
  const m = sigMetric();
  let tested = 0;
  breakdowns.forEach((b) => (b.rows || []).forEach((r) => { if (rowSigScore(r, m) !== -Infinity) tested++; }));
  return { tested, expectedFalse: Math.round(tested * 0.05) };
}
function sortBreakdownRows(rows, baseWr) {
  const arr = rows.slice();
  if (isSigSort(breakdownSort)) {
    // |z| / |t| 越大越靠前，方向（正面/反面发现）不影响排序，只影响行上的颜色
    arr.sort((a, b) => (rowSigScore(b, breakdownSort) - rowSigScore(a, breakdownSort)) || (b.n - a.n));
  } else if (breakdownSort === "delta") {
    const d = (r) => (r.wr === null || baseWr === null || baseWr === undefined ? -Infinity : Math.abs(r.wr - baseWr));
    arr.sort((a, b) => (d(b) - d(a)) || (b.n - a.n));
  } else if (breakdownSort === "ev") {
    const e = (r) => (r.hasR && r.ev !== null && r.ev !== undefined ? r.ev : -Infinity);
    arr.sort((a, b) => (e(b) - e(a)) || (b.n - a.n));
  } else {
    arr.sort((a, b) => b.n - a.n);
  }
  return arr;
}
// 一张拆解卡的行：样本够的正常画，样本不足的默认折成一行「其他 N 项」，点开才展开。
// 折叠只在有 2 行以上可折时才做——折 1 行既不省高度又少了信息
function breakdownRowsHtml(field, rows, baseWr) {
  const minN = currentMinSample();
  const strong = rows.filter((r) => r.n >= minN);
  const weak = rows.filter((r) => r.n < minN);
  let html = strong.map((r) => barRow(r, field.id, baseWr)).join("");
  if (!weak.length) return html;
  if (weak.length < 2) return html + weak.map((r) => barRow(r, field.id, baseWr)).join("");
  const open = expandedLowSample.has(field.id);
  if (open) {
    html += weak.map((r) => barRow(r, field.id, baseWr)).join("");
    html += `<button class="bdFoldRow" data-action="toggle-low-sample" data-field="${esc(field.id)}">${ICONS.chevUp} ${esc(T("breakdown.foldBack"))}</button>`;
  } else {
    const wn = weak.reduce((sum, r) => sum + r.n, 0);
    html += `<button class="bdFoldRow" data-action="toggle-low-sample" data-field="${esc(field.id)}" title="${esc(T("breakdown.lowSampleTitle", { n: currentMinSample() }))}">${ICONS.chevDown} ${esc(T("breakdown.folded", { k: weak.length, n: wn }))}</button>`;
  }
  return html;
}
// 时间字段的拆解：按段分桶，空桶不出行（一张全是"—"的卡没意义），
// 但顺序必须原样保留——时间轴打乱了就读不出「开盘那半小时最好、11 点以后最差」这种趋势。
// ordered:true 就是告诉渲染层「这张卡别排序、别折叠」
function computeTimeBreakdown(field, list, resultF, rF, minN) {
  const min = minN || currentMinSample();
  const sig = (sub) => {
    const inSub = new Set(sub.map((t) => t.id));
    return breakdownRowSignificance(sub, list.filter((t) => !inSub.has(t.id)), resultF, rF, min);
  };
  const defs = timeBucketDefs();
  const buckets = defs.map(() => []);
  const other = [];
  list.forEach((t) => {
    const raw = t[field.id];
    if (raw === undefined || raw === null || raw === "") return;
    const i = timeBucketIndexOf(raw, defs);
    if (i < 0) other.push(t); else buckets[i].push(t);
  });
  const rows = [];
  defs.forEach((d, i) => {
    if (!buckets[i].length) return;
    // 带上区间，行末的「+组合」才能建出 time 字段能用的区间条件（而不是 select 那种 values 条件）
    rows.push({ ...breakdownRowStats(d.label, buckets[i], resultF, rF), sig: sig(buckets[i]), rangeStart: d.start, rangeEnd: timeMinusOneMinute(d.end) });
  });
  // 「其他时段」是所有段的补集，没法用一个连续区间表示，所以这行不给「+组合」按钮
  if (other.length) rows.push({ ...breakdownRowStats(T("breakdown.timeOther"), other, resultF, rF), sig: sig(other), noCombo: true });
  return { field, rows, ordered: true };
}
/* 给一行算显著性：这一行 vs 补集（当前范围里**不**含这个值的交易）。
   多选字段一笔交易会落进好几行，行与行互相重叠，但「含这个值 / 不含这个值」仍然是一刀干净的二分，
   所以每一行自己的检验是成立的——只是行之间不构成一个划分，这点不影响排序。

   ⚠️ 阈值按「这个指标自己的分母」卡，不统一卡 n。因为 n 含 BE 而胜率只算 W/L：
   一行 n=20 里有 18 个 BE 的话，它顶着 n=20 的外表混过 n≥5，但那个胜率其实只有 2 笔支撑。
   胜率检验卡 W+L，R 检验卡「填了 R 的笔数」，显示层的折叠仍然卡 n（卡片上显示的就是 n）。 */
function breakdownRowSignificance(sub, rest, resultF, rF, minN) {
  const out = { z: null, t: null, p: null, pWr: null, pR: null, strong: false, dR: null, dWr: null };
  const wl = (arr) => {
    const w = arr.filter((t) => resultF && isWinResult(t[resultF.id])).length;
    const l = arr.filter((t) => resultF && isLossResult(t[resultF.id])).length;
    return [w, l];
  };
  if (resultF) {
    const [w1, l1] = wl(sub), [w2, l2] = wl(rest);
    if (w1 + l1 >= minN && w2 + l2 >= 1) {
      out.z = twoProportionZ(w1, l1, w2, l2);
      if (out.z !== null) {
        out.pWr = twoSidedP(out.z);
        out.dWr = (w1 / (w1 + l1)) * 100 - (w2 / (w2 + l2)) * 100;
      }
    }
  }
  if (rF) {
    const rs = (arr) => arr.map((t) => parseFloat(t[rF.id])).filter((v) => !isNaN(v));
    const a = rs(sub), b = rs(rest);
    if (a.length >= minN && b.length >= 2) {
      out.t = welchT(a, b);
      if (out.t !== null) {
        out.pR = twoSidedP(out.t);
        const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length;
        out.dR = mean(a) - mean(b);
      }
    }
  }
  return out;
}
function computeBreakdowns(list) {
  const resultF = roleField("result"), rF = roleField("r_multiple");
  const minN = currentMinSample();
  const out = visibleBreakdownFields().map((f) => {
    if (f.type === "time") return computeTimeBreakdown(f, list, resultF, rF, minN);
    const map = {};
    list.forEach((t) => {
      let vals = tradeFieldValue(t, f);   // 走 tradeFieldValue：模型库归属是虚拟字段，不在 t[f.id] 上
      if (vals === undefined || vals === null || vals === "") return;
      if (!Array.isArray(vals)) vals = [vals];
      // 多选字段一笔交易会落进多行，所以各行 n 之和可能大于总笔数，这是预期行为
      vals.forEach((v) => { if (v === "" || v === null || v === undefined) return; if (!map[v]) map[v] = []; map[v].push(t); });
    });
    const rows = Object.entries(map).map(([value, sub]) => {
      const inSub = new Set(sub.map((t) => t.id));
      const rest = list.filter((t) => !inSub.has(t.id));
      const row = breakdownRowStats(value, sub, resultF, rF);
      row.sig = breakdownRowSignificance(sub, rest, resultF, rF, minN);
      return row;
    }).sort((a, b) => b.n - a.n);
    return { field: f, rows };
  }).filter((b) => b.rows.length > 0);
  // FDR 要在**所有字段所有行**这一整批上跑，不是每张卡各跑各的——
  // 多重比较的分母是这一页总共检验了多少个组合。
  // sig.p 是「当前口径下的 p 值」：胜率口径用 pWr，R 口径用 pR。用户切了排序口径，
  // 该被校正的那一批也跟着换，所以这里现算，不在 breakdownRowSignificance 里写死
  const m = sigMetric();
  const all = out.reduce((acc, b) => acc.concat(b.rows), []);
  all.forEach((r) => { if (r.sig) r.sig.p = m === "sig_wr" ? r.sig.pWr : r.sig.pR; });
  markFdrSignificant(all);
  return out;
}
/* ---------- 组合 ---------- */
// 组合的完整筛选条件 = 用户自己加的条件（想只算 Taken / 排除人为错误，自己在下面加一行）。
// 组合卡片的统计和「跳到记录页」都走这一个函数，两边数字才能保证一模一样。
function comboFilterRows(combo) {
  return cloneFilterNodes(combo.conditions);
}
function comboMatchedTrades(combo) {
  const rows = comboFilterRows(combo);
  return scopedTrades().filter((t) => tradeMatchesFilters(t, rows));
}
function comboStats(combo) {
  const list = comboMatchedTrades(combo);
  const resultF = roleField("result"), rF = roleField("r_multiple");
  return breakdownRowStats(combo.name, list, resultF, rF);
}
// tradeMatchesFilter 找不到字段时会 return true，也就是删掉字段后组合会悄悄变成「匹配全部交易」，
// 数字突然变好看却毫无提示。所以渲染前先把这类失效条件挑出来。
function comboIssues(combo) {
  const hard = [], soft = [];
  // 拍平成叶子再编号：树形结构下「第 N 条」按渲染顺序数，才跟用户从上往下看到的对得上
  flattenFilterLeaves(combo.conditions).forEach((f, i) => {
    const no = i + 1;
    if (!f.fieldId) { soft.push(T("combo.issue.noField", { no })); return; }
    const field = resolveField(f.fieldId);
    if (!field) { hard.push(T("combo.issue.fieldDeleted", { no })); return; }
    if (field.type === "select" || field.type === "multiselect") {
      const opts = field.options || [];
      const missing = (f.values || []).filter((v) => !opts.includes(v));
      if (missing.length) hard.push(T("combo.issue.missingOptions", { label: field.label, opts: listJoin(missing) }));
      if (!(f.values || []).length) soft.push(T("combo.issue.noValues", { label: field.label }));
    } else if (field.type === "date" || field.type === "time") {
      if (!f.rangeStart && !f.rangeEnd) soft.push(T("combo.issue.noRange", { label: field.label }));
    } else if (field.type === "number") {
      if (!f.rangeStart && !f.rangeEnd && !f.textValue) soft.push(T("combo.issue.noRange", { label: field.label }));
    } else if (!f.textValue) {
      soft.push(T("combo.issue.noText", { label: field.label }));
    }
  });
  return { hard, soft };
}
// 卡片上那行人话版的条件描述
// 一条叶子条件的人话。返回 "" 表示这条还没填完，调用方直接跳过
function filterLeafText(f) {
  const field = resolveField(f.fieldId);
  if (!f.fieldId) return "";
  if (!field) return T("combo.cond.fieldDeleted");
  if (field.type === "select" || field.type === "multiselect") {
    if (!(f.values || []).length) return "";
    const join = f.matchMode === "and" ? T("combo.cond.and") : " / ";
    return `${field.label} ${f.negate ? "≠" : "="} ${f.values.join(join)}`;
  }
  if (field.type === "date" || field.type === "time") {
    if (!f.rangeStart && !f.rangeEnd) return "";
    return `${field.label} ${f.rangeStart || "…"}~${f.rangeEnd || "…"}`;
  }
  if (field.type === "number") {
    // 单边区间读成 ≥ / ≤，比 "2~…" 直观得多
    if (f.rangeStart && f.rangeEnd) return `${field.label} ${f.rangeStart}~${f.rangeEnd}`;
    if (f.rangeStart) return `${field.label} ≥ ${f.rangeStart}`;
    if (f.rangeEnd) return `${field.label} ≤ ${f.rangeEnd}`;
    return f.textValue ? T("combo.cond.contains", { label: field.label, value: f.textValue }) : "";
  }
  return f.textValue ? T("combo.cond.contains", { label: field.label, value: f.textValue }) : "";
}
// 分组的人话，带括号：非(信号=noticeable 且 gap=non-BW)。
// 搭好的规则能一眼读出来核对，是不做表达式输入框换来的那半边——没有这行，嵌套就成了黑箱
function filterNodeText(n) {
  if (!isFilterGroup(n)) return filterLeafText(n);
  const inner = (n.children || []).map(filterNodeText).filter(Boolean);
  if (!inner.length) return "";
  const joiner = n.op === "or" ? T("filter.joinOr") : T("filter.joinAnd");
  return (n.negate ? T("filter.notPrefix") : "") + "(" + inner.join(joiner) + ")";
}
function comboConditionsText(combo) {
  // 顶层用 " · " 分隔（读作 AND），跟以前一模一样——没建分组的用户看到的摘要一个字都不会变
  const parts = (combo.conditions || []).map(filterNodeText).filter(Boolean);
  return parts.length ? parts.join(" · ") : T("combo.cond.none");
}
const COMBO_SMALL_SAMPLE = 10;

// `list` 是已经过筛选面板的那一批记录——覆盖度跟着用户当前的条件走：
// 筛「只看 A 信号」，看到的就是 A 信号的历史覆盖，而不是永远的全量覆盖。
// 不传就退回全量，保持旧调用方的行为。
function computeMonthCoverageForYear(year, list) {
  const dateF = roleField("date");
  const src = list || trades;
  const monthsData = {};
  for (let i = 1; i <= 12; i++) monthsData[String(i).padStart(2, "0")] = { first: false, second: false, count: 0 };
  if (dateF) {
    src.forEach((t) => {
      const raw = t[dateF.id];
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d.getTime()) || d.getFullYear() !== year) return;
      const mo = String(d.getMonth() + 1).padStart(2, "0"), day = d.getDate();
      monthsData[mo].count++;
      if (day >= 1 && day <= 10) monthsData[mo].first = true;
      if (day >= 20) monthsData[mo].second = true;
    });
  }
  const result = {};
  Object.entries(monthsData).forEach(([mo, v]) => {
    result[mo] = { ...v, status: v.first && v.second ? "complete" : v.first || v.second ? "partial" : "empty" };
  });
  return result;
}

// Aggregate a set of trades (already filtered by the user's own filter panel) into a stats
// object for one day / one month. Colors by R sum when an r_multiple field exists; falls back
// to W/L balance otherwise. Does NOT apply any additional hidden filtering — what's passed in
// is exactly what gets counted, so the calendar only ever hides what the user filtered out above.
function aggregateTradeStats(list) {
  const rF = roleField("r_multiple"), resultF = roleField("result");
  const clean = list;
  let rSum = 0, hasR = false;
  if (rF) clean.forEach((t) => { if (t[rF.id] !== undefined && t[rF.id] !== "") { rSum += parseFloat(t[rF.id]) || 0; hasR = true; } });
  const w = resultF ? clean.filter((t) => isWinResult(t[resultF.id])).length : 0;
  const l = resultF ? clean.filter((t) => isLossResult(t[resultF.id])).length : 0;
  let tone = "neutral";
  if (hasR) tone = rSum > 0.0001 ? "pos" : rSum < -0.0001 ? "neg" : "neutral";
  else if (w + l > 0) tone = w > l ? "pos" : w < l ? "neg" : "neutral";
  const wr = (w + l) > 0 ? (w / (w + l)) * 100 : null;
  return { count: clean.length, takenCount: clean.length, rSum, hasR, w, l, wr, tone };
}
function tradesOnDate(dateStr) {
  const dateF = roleField("date");
  if (!dateF) return [];
  return scopedTrades().filter((t) => (t[dateF.id] || "") === dateStr && tradeMatchesFilters(t, activeFilters));
}
function tradesInMonth(year, month) {
  const dateF = roleField("date");
  if (!dateF) return [];
  const prefix = year + "-" + String(month).padStart(2, "0");
  return scopedTrades().filter((t) => String(t[dateF.id] || "").startsWith(prefix) && tradeMatchesFilters(t, activeFilters));
}


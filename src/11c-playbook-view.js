/* ============================================================
   模型库（PLAYBOOK）—— 界面

   - 页签「模型库」：交易系统卡片（带衍生策略和各自的成绩）+ 标签（有它 / 没它的成绩对比）+ 错题库 + 待验证区
   - 归类模式：一屏一笔，按数字键把旧交易归到某个系统 / 策略，顺手标关注、放进错题（E）/ 待验证（V）
   - 编辑器里的模型库页面：正文还是那个编辑器，正文上面换成属性行，下面挂几栏自动生成的内容
     （衍生策略 / 关注的交易 / 错题集 / 全部交易；错题页是 涉及的交易 / 相关错题）
   - 交易表单顶上的「模型库」一栏：选了策略就把它的错题和待验证摆出来，进场前看一眼；
     勾上就是「这笔也算」，点保存、交易存成功之后才写进那条笔记

   ⚠ 编辑器里的那几栏画在 #pbPanels 里，**不在 Tiptap 的挂载点里面**，可以随便整块重画
   （refreshPbPanels），不会碰到正在写的正文和光标。属性行同理（就是复盘的 #reviewWeekRow 那一格）。
   ============================================================ */

/* ---------- 共用的小零件 ---------- */
function pbFmtR(v) { return v === null || v === undefined || isNaN(v) ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2); }
function pbToneClass(v) { return v === null || v === undefined || isNaN(v) ? "" : v > 0.0001 ? "pos" : v < -0.0001 ? "neg" : ""; }
/* 一行成绩：笔数 · 胜率 · 平均 R · 总 R。compact = 卡片里的策略行用的短写法 */
function pbStatsHtml(st, compact) {
  if (!st.all) return `<span class="pbStatsEmpty">${esc(T("pb.noTrades"))}</span>`;
  const n = `<span class="pbStat"><b class="mono">${st.n}</b> ${esc(T("pb.stat.trades"))}</span>`;
  const wr = `<span class="pbStat">${esc(T("pb.stat.wr"))} <b class="mono">${fmtPct(st.wr)}</b></span>`;
  const ev = st.hasR ? `<span class="pbStat">${esc(T("pb.stat.ev"))} <b class="mono ${pbToneClass(st.ev)}">${pbFmtR(st.ev)}</b></span>` : "";
  const tot = st.hasR ? `<span class="pbStat">${esc(T("pb.stat.total"))} <b class="mono ${pbToneClass(st.totalR)}">${pbFmtR(st.totalR)}R</b></span>` : "";
  const faded = st.faded && !compact ? `<span class="pbStat muted" title="${esc(T("pb.stat.fadedTitle"))}">${esc(T("pb.stat.faded", { n: st.faded }))}</span>` : "";
  return n + wr + ev + (compact ? "" : tot) + faded;
}
function pbTradeResultBits(t) {
  const resultF = roleField("result"), rF = roleField("r_multiple");
  const result = resultF ? t[resultF.id] : "";
  const rc = resultColor(result);
  const rVal = rF ? t[rF.id] : "";
  const rTxt = (rVal !== undefined && rVal !== "" && !isNaN(parseFloat(rVal))) ? (parseFloat(rVal) >= 0 ? "+" : "") + rVal + "R" : "";
  return (result ? `<span class="mono pbRes" style="color:${rc};">${esc(result)}</span>` : "")
    + (rTxt ? `<span class="mono pbRes" style="color:${rc};">${esc(rTxt)}</span>` : "");
}
function pbShotOf(t) { return tradeShots(t)[0] || ""; }
function pbThumbHtml(t, cls) {
  const shot = pbShotOf(t);
  return shot
    ? `<img class="${cls}" src="${esc(imgSrc(shot))}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fallback-url="${esc(imgSrc(shot))}" data-fallback-class="${cls}Empty" onerror="window.__imgFallback(this)" />`
    : `<span class="${cls}Empty">${ICONS.camera}</span>`;
}
/* 截图墙上的一格：点了是交易的只读预览（跟复盘里的交易胶囊一样，读的时候不该一点就进编辑表单） */
function pbTileHtml(t, opts) {
  const o = opts || {};
  // o.remove = 「移出」按钮的 data-action（笔记页移出这条笔记 / 标签页摘掉标签）。按钮在磁贴里面，
  // 事件委托认最近的 data-action，点它不会顺带打开交易预览
  const rm = o.remove && !viewingUserId
    ? `<button class="pbTileRemove" data-action="${o.remove}" data-id="${esc(t.id)}" title="${esc(T(o.removeTitle || "pb.tile.remove"))}">${ICONS.x}</button>` : "";
  return `<div class="pbTile" data-action="open-trade-ref" data-id="${esc(t.id)}">
    <div class="pbTileImg">${pbThumbHtml(t, "pbTileShot")}${(o.fav !== undefined ? o.fav : pbTradeStarred(t)) ? `<span class="pbTileStar">${ICONS.starFill}</span>` : ""}${o.badge ? `<span class="pbTileBadge">${o.badge}</span>` : ""}${rm}</div>
    <div class="pbTileMeta"><span class="mono">${esc(pbTradeDateOf(t) || "—")}</span>${pbTradeResultBits(t)}</div>
    ${o.showLabel && pbTradeLabel(t) ? `<div class="pbTileSub">${esc(pbTradeLabel(t))}</div>` : ""}
    ${o.note ? `<div class="pbTileNote">${esc(o.note)}</div>` : ""}
  </div>`;
}
function pbStatusPillHtml(d) {
  const s = pbVerifyStatus(d);
  return `<span class="pbStatusPill status-${s}">${esc(T("pb.status." + s))}</span>`;
}
/* 一行简短成绩：「12 笔 · 胜率 58.0% · 平均 +0.80R」 */
function pbStatsLineText(st) {
  if (!st.all) return T("pb.sticky.none");
  return T("pb.sticky.verifyStats", { n: st.n, wr: fmtPct(st.wr), ev: st.hasR ? pbFmtR(st.ev) + "R" : "—" });
}
/* 待验证便利贴底下那行成绩。验证的意义就是看这类单能不能做，数字直接摆出来 */
function pbVerifyFootText(m) { return pbStatsLineText(pbStats(pbNoteTrades(m))); }
/* 便利贴上「关联」那一行：只看真正决定结论的那几笔。没有关联的就不写这一行 */
function pbEvFootText(m) {
  const list = pbNoteTrades(m).filter(inDataScope);
  const ev = pbMarkedTrades(m, list, "ev");
  if (!ev.length) return "";
  const st = pbStats(ev);
  const wr = fmtPct(st.wr), evR = st.hasR ? pbFmtR(st.ev) + "R" : "—";
  if (m.kind === "verify") {
    return T("pb.sticky.evVerify", { n: ev.length, pro: pbMarkedTrades(m, list, "pro").length, con: pbMarkedTrades(m, list, "con").length, wr, ev: evR });
  }
  return T("pb.sticky.evMistake", { n: ev.length, wr, ev: evR });
}

/* 标签：有它 vs 没它，差多少。两边都有入场的单才算差值 */
function pbTagDeltaHtml(c) {
  if (!c.with.n || !c.without.n) return "";
  const dWr = c.with.wr - c.without.wr;
  const wr = `<b class="mono ${pbToneClass(dWr)}">${dWr >= 0 ? "+" : ""}${dWr.toFixed(1)}%</b>`;
  const ev = c.with.hasR && c.without.hasR
    ? (() => { const d = c.with.ev - c.without.ev; return `<b class="mono ${pbToneClass(d)}">${pbFmtR(d)}R</b>`; })() : "—";
  return T("pb.tag.delta", { wr, ev });
}
function pbTagCardHtml(tag, opts) {
  const o = opts || {};
  const c = pbTagCompare(tag);
  const owner = c.owner;
  const delta = pbTagDeltaHtml(c);
  return `<div class="pbTagCard" data-action="pb-open" data-id="${esc(tag.id)}">
    <div class="pbTagHead">
      <span class="pbTagName">${ICONS.tag}${esc(pbTitle(tag))}</span>
      ${o.hideOwner ? "" : `<span class="pbTagOwner">${esc(owner ? pbLabel(owner.id) : T("pb.globalTag"))}</span>`}
    </div>
    <div class="pbTagLine on"><span class="pbTagSide">${esc(T("pb.tag.with"))}</span><span class="mono">${esc(pbStatsLineText(c.with))}</span></div>
    <div class="pbTagLine"><span class="pbTagSide">${esc(T("pb.tag.without"))}</span><span class="mono">${esc(pbStatsLineText(c.without))}</span></div>
    ${delta ? `<div class="pbTagDelta">${delta}</div>` : ""}
  </div>`;
}
/* 便利贴：一条笔记。上面是归属，中间标题 + 一句话。
   错题底下是出现过几次、最近一次是哪天——一眼看得出这个错是不是还在反复犯；
   待验证底下是关联交易的成绩，右上角是状态 */
function pbStickyHtml(m, opts) {
  const o = opts || {};
  const isV = m.kind === "verify";
  const owner = pbNoteOwner(m);
  const gist = pbMistakeGist(m);
  let foot;
  const evLine = pbEvFootText(m);
  const allPrefix = evLine ? esc(T("pb.sticky.allPrefix")) + " " : "";
  if (isV) foot = allPrefix + esc(pbVerifyFootText(m));
  else {
    const n = pbNoteTrades(m).length;
    const last = pbNoteLastDate(m);
    // 错题也摆成绩：犯这个错的那几笔一共亏了多少，比「出现过几次」更能说明要不要先改它
    foot = allPrefix + esc(n ? pbStatsLineText(pbStats(pbNoteTrades(m))) : T("pb.sticky.none")) + (last ? ` · ${esc(T("pb.sticky.last", { date: last }))}` : "");
  }
  if (evLine) foot += `<span class="pbStickyEv">${esc(evLine)}</span>`;
  const ownerTxt = owner ? pbLabel(owner.id) : T(isV ? "pb.globalVerify" : "pb.globalMistake");
  const top = (o.hideOwner ? "" : `<div class="pbStickyOwner">${esc(ownerTxt)}</div>`) + (isV ? pbStatusPillHtml(m) : "");
  return `<div class="pbSticky${isV ? " isVerify status-" + pbVerifyStatus(m) : ""}" data-action="pb-open" data-id="${esc(m.id)}">
    ${top ? `<div class="pbStickyTop">${top}</div>` : ""}
    <div class="pbStickyTitle">${esc(pbTitle(m))}</div>
    ${gist ? `<div class="pbStickyGist">${esc(gist)}</div>` : `<div class="pbStickyGist muted">${esc(T(isV ? "pb.sticky.noGistVerify" : "pb.sticky.noGist"))}</div>`}
    <div class="pbStickyFoot mono">${foot}</div>
  </div>`;
}
function pbSectionHeadHtml(title, count, rightHtml, hint) {
  return `<div class="pbSectionHead">
    <span class="pbSectionTitle">${esc(title)}</span>
    ${count !== null && count !== undefined ? `<span class="pbSectionCount mono">${count}</span>` : ""}
    ${hint ? `<span class="pbSectionHint">${esc(hint)}</span>` : ""}
    ${rightHtml ? `<span class="pbSectionRight">${rightHtml}</span>` : ""}
  </div>`;
}
function pbAddBtn(kind, parentId, labelKey) {
  if (viewingUserId) return "";
  return `<button class="tinyBtn pbAddBtn" data-action="pb-new" data-kind="${kind}" data-parent="${esc(parentId || "")}">${ICONS.plus} ${esc(T(labelKey))}</button>`;
}
function pbKindBadge(kind) { return `<span class="pbKindBadge kind-${kind}">${esc(T("pb.kind." + kind))}</span>`; }
function pbBacktestNote() {
  return recordMode === "live" ? "" : `<div class="notice pbNotice">${ICONS.alert}<span>${esc(T("pb.backtestNote"))}</span></div>`;
}

/* ============================================================
   页签：模型库
   ============================================================ */
function pbMatchesSearch(p, q) {
  if (!q) return true;
  return ((p.title || "") + " " + (p.body || "")).toLowerCase().includes(q);
}
function pbSystemCardHtml(sys, q) {
  const st = pbStats(pbTradesOf(sys.id));
  const strategies = pbStrategiesOf(sys.id);
  const own = scopedTrades().filter((t) => pbTradePageId(t) === sys.id).length;
  const starred = pbTradesOf(sys.id).filter(pbTradeStarred).length;
  const mistakes = pbMistakesOf(sys.id).length;
  const verifies = pbNotesOf(sys.id, "verify").length;
  const tagsN = pbNotesOf(sys.id, "tag").length;
  const excerpt = mdPlainExcerpt(String(sys.body || "").replace(/^\s{0,3}#{1,6}\s.*$/gm, ""), 150);
  return `<div class="pbSysCard" data-action="pb-open" data-id="${esc(sys.id)}">
    <div class="pbSysHead">
      <div class="pbSysTitle display">${esc(pbTitle(sys))}</div>
      ${pbKindBadge("system")}
    </div>
    <div class="pbStatsRow">${pbStatsHtml(st)}</div>
    ${excerpt ? `<div class="pbSysExcerpt">${esc(excerpt)}</div>` : ""}
    <div class="pbStratList">
      <div class="pbStratListHead">${esc(T("pb.section.strategies"))}</div>
      ${strategies.map((s) => {
        const ss = pbStats(pbTradesOf(s.id));
        const hit = q && pbMatchesSearch(s, q);
        return `<button class="pbStratRow${hit ? " hit" : ""}" data-action="pb-open" data-id="${esc(s.id)}">
          <span class="pbStratName">${esc(pbTitle(s))}</span>
          <span class="pbStratStats">${pbStatsHtml(ss, true)}</span>
        </button>`;
      }).join("")}
      ${strategies.length ? "" : `<div class="pbStratEmpty">${esc(T("pb.noStrategies"))}</div>`}
      ${pbAddBtn("strategy", sys.id, "pb.addStrategy")}
    </div>
    <div class="pbSysFoot mono">
      <span>${ICONS.star} ${starred}</span>
      <span>${esc(T("pb.foot.mistakes", { n: mistakes }))}</span>
      ${verifies ? `<span>${esc(T("pb.foot.verify", { n: verifies }))}</span>` : ""}
      ${tagsN ? `<span>${esc(T("pb.foot.tags", { n: tagsN }))}</span>` : ""}
      ${own && strategies.length ? `<span title="${esc(T("pb.foot.systemOnlyTitle"))}">${esc(T("pb.foot.systemOnly", { n: own }))}</span>` : ""}
    </div>
  </div>`;
}
function pbEmptyLibraryHtml() {
  return `<div class="pbIntro">
    <div class="pbIntroTitle display">${esc(T("pb.intro.title"))}</div>
    <div class="pbIntroSteps">
      <div class="pbIntroStep"><span class="pbIntroNo mono">1</span><div><b>${esc(T("pb.intro.s1"))}</b><p>${esc(T("pb.intro.s1d"))}</p></div></div>
      <div class="pbIntroStep"><span class="pbIntroNo mono">2</span><div><b>${esc(T("pb.intro.s2"))}</b><p>${esc(T("pb.intro.s2d"))}</p></div></div>
      <div class="pbIntroStep"><span class="pbIntroNo mono">3</span><div><b>${esc(T("pb.intro.s3"))}</b><p>${esc(T("pb.intro.s3d"))}</p></div></div>
    </div>
    ${viewingUserId ? "" : `<button class="btn btn-primary" data-action="pb-new" data-kind="system" data-parent="">${ICONS.plus} ${esc(T("pb.newSystem"))}</button>`}
  </div>`;
}
/* ---------- 成绩口径面板 ----------
   外壳跟分析页「分析范围」、记录页「筛选条件」是同一套（.filterPanel），条件行也是同一套 DOM，
   靠 data-filter-ctx="playbook" 区分改的是 analysisPrefs.pbScope。
   标题上的「全部 N → 计入 M」按实盘里归进模型库的交易算：就是卡片上那些成绩的分母 */
function pbScopePanelHtml() {
  const ro = !!viewingUserId;
  const cond = pbScopeConditions();
  const active = countFilterConditions(cond);
  const filed = recordMode === "live" ? scopedTrades().filter((t) => pbTradePageId(t)) : [];
  const counted = filed.filter(pbCountsInStats).length;
  let html = `<div class="filterPanel pbScopePanel${pbScopeOpen ? " open" : ""}">
    <button class="filterPanelHead" data-action="toggle-pb-scope">
      ${ICONS.filter}
      <span class="filterPanelTitle">${esc(T("pb.scope.title"))}</span>
      ${active ? `<span class="filterPanelBadge">${esc(T("filter.activeCount", { n: active }))}</span>` : `<span class="filterPanelBadge off">${esc(T("pb.scope.none"))}</span>`}
      ${recordMode === "live" ? `<span class="filterPanelChain mono" title="${esc(T("pb.scope.chainTitle"))}">${filed.length}<span class="arrow">→</span><b>${counted}</b></span>` : ""}
      <span class="filterPanelChev">${pbScopeOpen ? ICONS.chevUp : ICONS.chevDown}</span>
    </button>
    ${!pbScopeOpen && active ? filterPanelSummaryHtml(cond) : ""}`;
  if (pbScopeOpen) {
    html += `<div class="filterPanelBody">
      <div class="pbScopeHint">${esc(T("pb.scope.hint"))}</div>
      ${ro ? "" : pbScopePresetsHtml()}
      ${ro ? (active ? filterPanelSummaryHtml(cond) : "") : `<div style="display:flex;flex-wrap:wrap;gap:12px;width:100%;">${filterNodeListHtml(cond, PB_SCOPE_CTX)}</div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center;">
        <button class="btn" data-action="add-filter" data-filter-ctx="${PB_SCOPE_CTX}">${ICONS.plus} ${T("filter.addCondition")}</button>
        <button class="btn" data-action="add-filter-group" data-filter-ctx="${PB_SCOPE_CTX}">${ICONS.plus} ${T("filter.addGroup")}</button>
        ${cond.length ? `<button class="btn" data-action="pb-scope-clear">${esc(T("pb.scope.clear"))}</button>` : ""}
      </div>`}
      <div class="pbScopeHint" style="margin-top:12px;">${esc(T("pb.scope.note"))}</div>
    </div>`;
  }
  return html + `</div>`;
}

/* 快捷口径：「全部」= 清空条件；「只算 Taken」= 一条 taken = Taken。是不是当前状态按条件长相判断 */
function pbScopePresetsHtml() {
  const f = roleField("taken");
  const cond = pbScopeConditions();
  const isAll = !pbScopeActive();
  const isTaken = !!f && cond.length === 1 && !isFilterGroup(cond[0]) && cond[0].fieldId === f.id && !cond[0].negate
    && (cond[0].values || []).length === 1 && cond[0].values[0] === "Taken";
  return `<div class="pbScopePresets"><span class="pbScopeHint" style="margin:0;">${esc(T("pb.scope.quick"))}</span>
    <button type="button" class="chip ${isAll ? "active" : ""}" data-action="pb-scope-preset" data-preset="all">${esc(T("pb.scope.presetAll"))}</button>
    ${f && (f.options || []).includes("Taken") ? `<button type="button" class="chip ${isTaken ? "active" : ""}" data-action="pb-scope-preset" data-preset="taken">${esc(T("pb.scope.presetTaken"))}</button>` : ""}
  </div>`;
}
/* 交易行上那枚 taken 值（Taken 高亮，其余灰），口径排除了的再加一枚「不计入」 */
function pbTakenBadgeHtml(t) {
  const v = pbTakenValue(t);
  return (v ? `<span class="pbRowTaken${v === "Taken" ? " isTaken" : ""}">${esc(v)}</span>` : "")
    + (pbScopeActive() && !pbCountsInStats(t) ? `<span class="pbRowFaded" title="${esc(T("pb.scope.excludedTitle"))}">${esc(T("pb.scope.excluded"))}</span>` : "");
}
/* 页面里的「执行情况」：按 taken 的值各算一份成绩。点一行 = 下面的交易列表只看这一类 */
function pbExecLabel(v) { return v === PB_EXEC_EMPTY ? T("pb.exec.empty") : v; }
/* extra：插在「全部」下面的几行（关联 / 支持 / 反驳 / 其余 / 收藏），{ val, label, list, cls }。
   少于「最少样本」的行标一个「样本少」，免得几笔就下结论 */
function pbExecTableHtml(list, extra) {
  const groups = pbExecGroups(list);
  const more = (extra || []).filter((r) => r.list.length);   // 0 笔的行不摆，表里只留有内容的
  if (!list.length || (!groups.length && !more.length)) return "";
  const floor = currentMinSample();
  const small = (n) => n && n < floor ? ` <span class="pbSmallSample" title="${esc(T("pb.area.smallSampleTitle", { n: floor }))}">${esc(T("pb.area.smallSample"))}</span>` : "";
  const tone = (v) => (v === null || v === undefined || isNaN(v) ? "" : v > 0.0001 ? "pos" : v < -0.0001 ? "neg" : "");
  const row = (val, label, st, n, cls) => `<button type="button" class="pbExecRow${cls || ""}${pbExecFilter === val ? " on" : ""}" data-action="pb-exec-filter" data-val="${esc(val)}">
      <span class="pbExecName">${label}</span>
      <span class="mono">${n}</span>
      <span class="mono">${esc(fmtPct(st.wr))}</span>
      <span class="mono ${tone(st.ev)}">${st.hasR ? esc(pbFmtR(st.ev)) : "—"}</span>
      <span class="mono ${tone(st.totalR)}">${st.hasR ? esc(pbFmtR(st.totalR)) : "—"}</span>
    </button>`;
  return `<div class="pbExecTable">
    <div class="pbExecRow head"><span>${esc(T("pb.exec.col"))}</span><span>${esc(T("ex.col.all"))}</span><span>${esc(T("ex.col.wr"))}</span><span>${esc(T("ex.col.ev"))}</span><span>${esc(T("ex.col.totalR"))}</span></div>
    ${row("", esc(T("pb.exec.all")), filteredSummaryStats(list), list.length, " isAll")}
    ${more.map((r) => row(r.val, r.label + small(r.list.length), filteredSummaryStats(r.list), r.list.length, " isMark" + (r.cls || ""))).join("")}
    ${more.length && groups.length ? `<div class="pbExecSep"></div>` : ""}
    ${groups.map((g) => row(g.value, `<span class="pbRowTaken${g.value === "Taken" ? " isTaken" : ""}">${esc(pbExecLabel(g.value))}</span>`, g.stats, g.list.length)).join("")}
  </div>`;
}

function renderPlaybook() {
  if (pbTriage) return renderPbTriage();
  const readOnly = !!viewingUserId;
  const q = pbSearch.trim().toLowerCase();
  const unsorted = pbUnsortedCount();
  // 进模型库多半要点开某一页：跟复盘页一样，在后台先把编辑器的库拉下来
  if (!readOnly && !tiptapLib) loadTiptap().catch(() => {});

  let html = `<div class="pbTop">
    ${readOnly ? "" : `<button class="btn btn-primary" data-action="pb-new" data-kind="system" data-parent="">${ICONS.plus} ${esc(T("pb.newSystem"))}</button>
    <button class="btn pbTriageBtn${unsorted ? " hasWork" : ""}" data-action="pb-triage-start" data-scope="unsorted" ${recordMode !== "live" || !pbHasPages() ? "disabled" : ""}>
      ${ICONS.grid} ${esc(T("pb.triage.open"))}${unsorted ? `<span class="pbBadge mono">${unsorted}</span>` : ""}
    </button>`}
    <div class="reviewSearchBox">
      ${ICONS.search}
      <input class="input reviewSearchInput" type="text" placeholder="${esc(T("pb.searchPlaceholder"))}"
        value="${esc(pbSearch)}" data-action="pb-search-input" />
    </div>
  </div>`;
  if (pbError) html += `<div class="notice error" style="margin-bottom:16px;">${ICONS.alert}<span>${esc(pbError)}</span></div>`;
  html += pbBacktestNote();
  html += pbScopePanelHtml();

  const systems = pbSystems();
  const orphans = pbOrphanStrategies();
  if (!systems.length && !orphans.length && !pbPages.some(pbIsChild)) return html + pbEmptyLibraryHtml();

  // 搜索：系统本身或它下面任何一个策略命中，整张卡就留着（命中的策略行会高亮）
  const shownSystems = systems.filter((s) => !q || pbMatchesSearch(s, q) || pbStrategiesOf(s.id).some((x) => pbMatchesSearch(x, q)));
  html += pbSectionHeadHtml(T("pb.section.systems"), shownSystems.length, "", T("pb.section.systemsHint"));
  html += shownSystems.length
    ? `<div class="pbSysGrid">${shownSystems.map((s) => pbSystemCardHtml(s, q)).join("")}</div>`
    : `<div class="pbEmptyLine">${esc(q ? T("pb.emptySearch") : T("pb.noSystems"))}</div>`;
  if (orphans.length) {
    html += `<div class="pbEmptyLine">${esc(T("pb.orphans"))} ${orphans.map((s) => `<button class="pageRef kind-strategy" data-action="pb-open" data-id="${esc(s.id)}"><span class="pageRefMeta">${esc(pbTitle(s))}</span></button>`).join(" ")}</div>`;
  }

  // 标签：已经确认过的条件 / 变体，每张卡片是「有它 vs 没它」
  const tagAll = pbSortList(pbTags());
  const tagList = q ? tagAll.filter((g) => pbMatchesSearch(g, q)) : tagAll;
  html += `<div class="pbLibMistakes pbLibTags">`;
  html += pbSectionHeadHtml(T("pb.tagLibrary"), tagAll.length, pbAddBtn("tag", "", "pb.addGlobalTag"), T("pb.tagLibraryHint"));
  html += tagList.length
    ? `<div class="pbTagGrid">${tagList.map((g) => pbTagCardHtml(g)).join("")}</div>`
    : `<div class="pbEmptyLine">${esc(tagAll.length ? T("pb.emptySearch") : T("pb.noTags"))}</div>`;
  html += `</div>`;

  // 错题库：全部错题，按归属筛
  const all = pbSortList(pbMistakes());
  const bySystem = (sysId) => all.filter((m) => { const o = pbMistakeOwner(m); return o && (o.id === sysId || o.parent_id === sysId); });
  const globals = pbGlobalMistakes();
  let list = all;
  if (pbMistakeFilter === "__global") list = globals;
  else if (pbMistakeFilter !== "all" && pbFind(pbMistakeFilter)) list = bySystem(pbMistakeFilter);
  if (q) list = list.filter((m) => pbMatchesSearch(m, q));
  const chip = (val, label, n) => `<button class="chip ${pbMistakeFilter === val ? "active" : ""}" data-action="pb-mistake-filter" data-val="${esc(val)}">${esc(label)} <span class="mono pbChipN">${n}</span></button>`;
  html += `<div class="pbLibMistakes">`;
  html += pbSectionHeadHtml(T("pb.mistakeLibrary"), all.length, pbAddBtn("mistake", "", "pb.addGlobalMistake"), T("pb.mistakeLibraryHint"));
  if (all.length) {
    html += `<div class="chipGroup pbFilterChips">${chip("all", T("pb.filterAll"), all.length)}${systems.map((s) => chip(s.id, pbTitle(s), bySystem(s.id).length)).join("")}${chip("__global", T("pb.globalMistake"), globals.length)}</div>`;
  }
  html += list.length
    ? `<div class="pbStickyGrid">${list.map((m) => pbStickyHtml(m)).join("")}</div>`
    : `<div class="pbEmptyLine">${esc(all.length ? T("pb.emptySearch") : T("pb.noMistakes"))}</div>`;
  html += `</div>`;

  // 待验证区：按状态筛（观察中 / 验证可做 / 已否定）
  const vAll = pbSortList(pbNotes("verify"));
  const vCount = (s) => vAll.filter((v) => pbVerifyStatus(v) === s).length;
  let vList = pbVerifyFilter === "all" ? vAll : vAll.filter((v) => pbVerifyStatus(v) === pbVerifyFilter);
  if (q) vList = vList.filter((v) => pbMatchesSearch(v, q));
  const vChip = (val, label, n) => `<button class="chip ${pbVerifyFilter === val ? "active" : ""}" data-action="pb-verify-filter" data-val="${esc(val)}">${esc(label)} <span class="mono pbChipN">${n}</span></button>`;
  html += `<div class="pbLibMistakes pbLibVerify">`;
  html += pbSectionHeadHtml(T("pb.verifyLibrary"), vAll.length, pbAddBtn("verify", "", "pb.addGlobalVerify"), T("pb.verifyLibraryHint"));
  if (vAll.length) {
    html += `<div class="chipGroup pbFilterChips">${vChip("all", T("pb.filterAll"), vAll.length)}${PB_VERIFY_STATUSES.map((s) => vChip(s, T("pb.status." + s), vCount(s))).join("")}</div>`;
  }
  html += vList.length
    ? `<div class="pbStickyGrid">${vList.map((v) => pbStickyHtml(v)).join("")}</div>`
    : `<div class="pbEmptyLine">${esc(vAll.length ? T("pb.emptySearch") : T("pb.noVerify"))}</div>`;
  html += `</div>`;
  return html;
}

/* ============================================================
   编辑器里：属性行 + 下面那几栏
   ============================================================ */
function pbParentSelectHtml(d) {
  if (reviewIsReadOnly()) return "";
  if (d.kind === "strategy") {
    return `<label class="pbMetaField"><span>${esc(T("pb.meta.belongsTo"))}</span>
      <select class="select" data-pb-parent>
        ${pbSystems().map((s) => `<option value="${esc(s.id)}" ${d.parent_id === s.id ? "selected" : ""}>${esc(pbTitle(s))}</option>`).join("")}
      </select></label>`;
  }
  if (pbIsChild(d)) {
    const cur = pbNoteOwner(d) ? d.parent_id : "";
    return `<label class="pbMetaField"><span>${esc(T("pb.meta.mistakeOf"))}</span>
      <select class="select" data-pb-parent>
        <option value="" ${cur ? "" : "selected"}>${esc(T(PB_GLOBAL_KEY[d.kind]))}</option>
        ${pbAssignOptions().map((o) => `<option value="${esc(o.id)}" ${cur === o.id ? "selected" : ""}>${o.depth ? "　" : ""}${esc(o.label)}</option>`).join("")}
      </select></label>`;
  }
  return "";
}
function pbDeleteControlHtml(d) {
  if (reviewIsReadOnly() || d._isNew) return "";
  if (pbConfirmDeleteId !== d.id) {
    return `<button class="tinyBtn pbMetaDel" data-action="pb-ask-delete" data-id="${esc(d.id)}" title="${esc(T("pb.delete"))}">${ICONS.trash}</button>`;
  }
  if (d.kind === "system" && pbStrategiesOf(d.id).length) {
    return `<span class="pbDelConfirm"><span>${esc(T("pb.deleteBlocked"))}</span>
      <button class="tinyBtn" data-action="pb-cancel-delete">${esc(T("common.cancel"))}</button></span>`;
  }
  const n = pbIsChild(d) ? 0 : trades.filter((t) => t[PB_KEY] === d.id).length;
  const m = pbIsChild(d) ? 0 : pbPages.filter((x) => pbIsChild(x) && x.parent_id === d.id).length;
  const bits = [];
  if (d.kind === "tag") { const k = pbTagTrades(d).length; if (k) bits.push(T("pb.deleteTagTrades", { n: k })); }
  if (n) bits.push(T(d.kind === "strategy" ? "pb.deleteTradesUp" : "pb.deleteTradesClear", { n }));
  if (m) bits.push(T(d.kind === "strategy" ? "pb.deleteMistakesUp" : "pb.deleteMistakesGlobal", { n: m }));
  return `<span class="pbDelConfirm"><span>${esc(T("pb.deleteConfirm"))}${bits.length ? " " + esc(bits.join("；")) : ""}</span>
    <button class="btn btn-danger" data-action="pb-confirm-delete" data-id="${esc(d.id)}">${esc(T("common.delete"))}</button>
    <button class="tinyBtn" data-action="pb-cancel-delete">${esc(T("common.cancel"))}</button></span>`;
}
/* 待验证的状态：三选一的分段按钮（只读时只留一枚标签） */
function pbVerifyStatusHtml(d) {
  if (reviewIsReadOnly()) return pbStatusPillHtml(d);
  const cur = pbVerifyStatus(d);
  return `<span class="reviewPeriodSeg pbStatusSeg">${PB_VERIFY_STATUSES.map((s) =>
    `<button class="tinyBtn status-${s} ${cur === s ? "on" : ""}" data-action="pb-verify-status" data-status="${s}">${esc(T("pb.status." + s))}</button>`).join("")}</span>`;
}
function pbMetaRowInnerHtml() {
  const d = editingReview;
  let stats = "";
  if (d.kind === "mistake") {
    // 错题页也给成绩：犯这个错的那几笔一共怎么样
    const last = pbNoteLastDate(d);
    stats = (recordMode === "live" ? pbStatsHtml(pbStats(pbNoteTrades(d))) : `<span class="pbStat"><b class="mono">${pbNoteTrades(d).length}</b> ${esc(T("pb.stat.occurrences"))}</span>`)
      + (last ? `<span class="pbStat">${esc(T("pb.sticky.last", { date: last }))}</span>` : "");
  } else if (recordMode === "live") {
    stats = pbStatsHtml(pbStats(d.kind === "verify" ? pbNoteTrades(d) : d.kind === "tag" ? pbTagTrades(d) : pbTradesOf(d.id)));
  }
  const promote = d.kind === "verify" && pbVerifyStatus(d) === "works" && !reviewIsReadOnly() && !d._isNew
    ? `<button class="tinyBtn pbPromoteBtn" data-action="pb-verify-promote">${ICONS.up} ${esc(T("pb.promote.btn"))}</button>` : "";
  return `${pbKindBadge(d.kind)}
    ${pbParentSelectHtml(d)}
    ${d.kind === "verify" ? pbVerifyStatusHtml(d) : ""}
    <span class="pbMetaStats">${stats}${stats && pbScopeActive() && d.kind !== "mistake" ? `<span class="pbStat muted pbScopeMark" title="${esc(comboConditionsText({ conditions: pbScopeConditions() }))}">${esc(T("pb.scope.mark"))}</span>` : ""}</span>
    <span class="pbMetaRight">${promote}${pbConvertControlHtml(d)}${pbDeleteControlHtml(d)}</span>
    ${pbConvertAskId === d.id ? pbConvertConfirmHtml(d) : ""}`;
}

/* ---------- 错题 ⇄ 待验证 ----------
   两种笔记在数据上是同一种东西（正文 + 正文里关联的交易 + 挂在某页下面），只差 kind 和待验证的 status。
   所以转换 = 换 kind：正文、关联的交易、归属、别处链到它的 [[page:id]] 全都原样留着，随时能转回去。
   待验证被标成「已否定」时按钮换成醒目的「转到错题库」——证明不能做的想法，正好就是一条要避开的错 */
function pbConvertControlHtml(d) {
  if (!pbIsNote(d) || reviewIsReadOnly() || d._isNew || pbConvertAskId === d.id) return "";
  const rejected = d.kind === "verify" && pbVerifyStatus(d) === "rejected";
  const label = T(d.kind === "mistake" ? "pb.convert.toVerify" : rejected ? "pb.convert.rejectedBtn" : "pb.convert.toMistake");
  return `${rejected ? `<span class="pbConvertHint">${esc(T("pb.convert.rejectedHint"))}</span>` : ""}
    <button class="tinyBtn pbConvertBtn${rejected ? " strong" : ""}" data-action="pb-convert-ask">⇄ ${esc(label)}</button>`;
}
function pbConvertConfirmHtml(d) {
  const to = d.kind === "mistake" ? "verify" : "mistake";
  const pairs = PB_NOTE_HEADING_SWAP.map(([m, v]) => (to === "verify" ? [m, v] : [v, m]));
  return `<div class="pbConvertConfirm">
    <span>${esc(T(to === "verify" ? "pb.convert.confirmToVerify" : "pb.convert.confirmToMistake"))}</span>
    <label class="pbConvertSwap"><input type="checkbox" data-pb-convert-swap ${pbConvertSwap ? "checked" : ""} />
      ${esc(T("pb.convert.swap", { a: T(pairs[0][0]), b: T(pairs[0][1]), c: T(pairs[1][0]), d: T(pairs[1][1]) }))}</label>
    <span class="pbConvertBtns">
      <button class="btn btn-primary" data-action="pb-convert-do">${esc(T("pb.convert.do"))}</button>
      <button class="tinyBtn" data-action="pb-convert-cancel">${esc(T("common.cancel"))}</button>
    </span>
  </div>`;
}
/* 先把编辑器里没存的存掉，再换 kind（和正文标题）存一次。正文是在编辑器外面改的，存好后重新挂编辑器 */
async function pbConvertNote() {
  const d = editingReview;
  pbConvertAskId = null;
  if (!d || !pbIsNote(d) || reviewIsReadOnly()) return;
  await flushReviewSave();
  const before = { kind: d.kind, status: d.status, body: d.body };
  const to = d.kind === "mistake" ? "verify" : "mistake";
  d.kind = to;
  if (to === "verify") d.status = "watching";
  if (pbConvertSwap) d.body = pbSwapNoteHeadings(d.body, to);
  scheduleReviewSave();
  if (!(await flushReviewSave())) {
    Object.assign(d, before);
    refreshReviewWeekRow();
    return;
  }
  const p = pbFind(d.id);
  if (p && to === "verify") p.status = "watching";   // 本地那份也记上，打开时从这里读
  // 错题的「关联」→ 待验证的「支持」；待验证的「支持」→ 错题的「关联」，「反驳」在错题里没有对应，去掉
  if (p) {
    const map = to === "verify" ? { key: "pro" } : { pro: "key" };
    const marks = pbMarksOf(p);
    const next = {};
    let changed = false;
    Object.keys(marks).forEach((id) => {
      const m = { ...marks[id] };
      if (m.ev) { const nv = map[m.ev] || ""; if (nv !== m.ev) changed = true; if (nv) m.ev = nv; else delete m.ev; }
      if (Object.keys(m).some((k) => m[k])) next[id] = m;
    });
    if (changed) await pbWriteMarks(p.id, next);
  }
  openReviewEditor(d.id);
  render();
  showReviewToast(T(to === "verify" ? "pb.convert.doneToVerify" : "pb.convert.doneToMistake"));
}

/* ============================================================
   交易区：系统 / 策略 / 错题 / 待验证 / 标签页下面同一套
     1.（待验证）可以下结论了的提示
     2.（笔记）关联交易：真正决定结论的那几笔，单独算成绩
     3. 收藏（系统 / 策略页叫「关注的交易」，存在交易的 __pb_star；笔记 / 标签存在页面的 trade_marks）
     4. 全部交易：成绩表（全部 / 关联 / 支持 / 反驳 / 其余 / 收藏 / 按 taken 分）+ 列表
   列表里每一行直接点收藏、点关联、改记录、移出，不用进交易的编辑表单
   ============================================================ */
function pbAreaCtx(d) {
  const page = pbFind(d.id) || d;   // 标记读库里那份：编辑器里那份（editingReview）不带 trade_marks
  const mode = pbIsNote(d) ? "note" : d.kind === "tag" ? "tag" : "page";
  const list = mode === "note" ? pbNoteTrades(d) : mode === "tag" ? pbTagTrades(d) : pbTradesOf(d.id);
  return { d, page, mode, list, body: d.body, evStates: PB_EV_STATES[d.kind] || [], showLabel: mode !== "page" || d.kind === "system" };
}
function pbAreaFav(ctx, t) { return ctx.mode === "page" ? pbTradeStarred(t) : pbIsFav(ctx.page, t.id); }
function pbAreaMatches(ctx, t, f) {
  if (!f) return true;
  if (f.indexOf("m:") !== 0) return pbExecMatches(t, f);
  const which = f.slice(2);
  if (which === "fav") return pbAreaFav(ctx, t);
  const ev = pbEvOf(ctx.page, t.id);
  if (which === "rest") return !ev;
  return which === "ev" ? !!ev : ev === which;
}
function pbAreaFilterLabel(ctx, f) {
  if (f.indexOf("m:") !== 0) return pbExecLabel(f);
  const which = f.slice(2);
  if (which === "fav") return ctx.mode === "page" ? T("pb.section.starred") : T("pb.area.fav");
  return T("pb.area." + (which === "ev" ? "evRow" : which === "rest" ? "restRow" : which));
}
function pbEvLabel(ev) { return T("pb.area." + (ev || "evNone")); }
function pbEvBadgeHtml(ev) { return ev ? `<span class="pbEvBadge ev-${ev}">${esc(pbEvLabel(ev))}</span>` : ""; }

function pbTradeRowHtml(t, opts) {
  const o = opts || {};
  const ctx = o.ctx || { mode: "page", page: null, evStates: [] };
  const modelF = roleField("model");
  const tag = modelF ? t[modelF.id] : "";
  const tagTxt = Array.isArray(tag) ? tag.join(", ") : (tag || "");
  const mistakes = pbMistakesWithTrade(t.id);
  const verifies = pbNotesWithTrade(t.id, "verify");
  const ro = !!viewingUserId;
  const fav = pbAreaFav(ctx, t);
  const favAction = ctx.mode === "page" ? "pb-star" : "pb-fav";
  const ev = ctx.evStates.length ? pbEvOf(ctx.page, t.id) : "";
  const evBtn = ctx.evStates.length
    ? `<button class="pbEvBtn ev-${ev || "none"}" ${ro ? "disabled" : `data-action="pb-ev" data-id="${esc(t.id)}"`} title="${esc(T("pb.area.evBtnTitle." + ctx.page.kind))}">${ev ? "" : ICONS.plus}${esc(pbEvLabel(ev))}</button>` : "";
  const rmAction = ctx.mode === "note" ? "pb-note-remove-trade" : ctx.mode === "tag" ? "pb-tag-remove-trade" : "";
  const note = ctx.mode === "page" || !ctx.page ? pbTradeNote(t) : pbRowNoteOf(ctx.page, t, ctx.body);
  // 笔记页上，交易自己的归类记录（所有页面共用的那句）也摆出来，灰一点、只看不改
  const pbNote = ctx.mode === "note" && pbTradeNote(t) && pbTradeNote(t) !== note ? pbTradeNote(t) : "";
  const editing = pbInlineNoteFor === t.id && !ro;
  return `<div class="pbTradeRow${ev ? " hasEv ev-" + ev : ""}${o.out ? " isOut" : ""}">
    <button class="pbStarBtn${fav ? " on" : ""}" ${ro ? "disabled" : `data-action="${favAction}" data-id="${esc(t.id)}"`} title="${esc(T(ctx.mode === "page" ? "pb.starTitle" : "pb.area.favTitle"))}">${fav ? ICONS.starFill : ICONS.star}</button>
    <div class="pbTradeRowMain" data-action="open-trade-ref" data-id="${esc(t.id)}">
      ${pbThumbHtml(t, "pbRowShot")}
      <span class="mono pbRowDate">${esc(pbTradeDateOf(t) || "—")}</span>
      ${o.showLabel ? `<span class="pbRowLabel">${esc(pbTradeLabel(t))}</span>` : ""}
      ${tagTxt ? `<span class="pbRowTag">${esc(tagTxt)}</span>` : ""}
      ${pbTakenBadgeHtml(t)}
      ${o.out ? `<span class="pbRowOut" title="${esc(T("scope.outTitle"))}">${esc(T("scope.out"))}</span>` : ""}
      <span class="pbRowSpacer"></span>
      ${mistakes.length && ctx.mode !== "note" ? `<span class="pbRowMistake" title="${esc(mistakes.map(pbTitle).join(" / "))}">${esc(T("pb.inMistakes", { n: mistakes.length }))}</span>` : ""}
      ${verifies.length && ctx.mode !== "note" ? `<span class="pbRowVerify" title="${esc(verifies.map(pbTitle).join(" / "))}">${esc(T("pb.inVerify", { n: verifies.length }))}</span>` : ""}
      ${pbTradeTagIds(t).map((id) => `<span class="pbTagChip small">${esc(pbTitle(pbFind(id)))}</span>`).join("")}
      ${pbTradeResultBits(t)}
    </div>
    ${evBtn}
    ${ro ? "" : `<button class="pbRowIcon" data-action="pb-row-note" data-id="${esc(t.id)}" title="${esc(T("pb.area.noteAdd"))}">${ICONS.pencil}</button>`}
    ${rmAction && !ro ? `<button class="pbRowIcon danger" data-action="${rmAction}" data-id="${esc(t.id)}" title="${esc(T(ctx.mode === "tag" ? "pb.tile.untag" : "pb.tile.remove"))}">${ICONS.x}</button>` : ""}
    ${editing
      ? `<div class="pbRowNoteEdit"><input class="input" id="pbRowNoteInput" type="text" value="${esc(note)}" placeholder="${esc(T("pb.area.notePh"))}"
          onkeydown="window.__pbRowNoteKey(event)" onblur="window.__pbRowNoteBlur(this)" /></div>`
      : note ? `<div class="pbRowNote${ro ? "" : " editable"}" ${ro ? "" : `data-action="pb-row-note" data-id="${esc(t.id)}"`}>${esc(note)}</div>` : ""}
    ${pbNote ? `<div class="pbRowNote sub">${esc(T("pb.area.pbNote", { text: pbNote }))}</div>` : ""}
  </div>`;
}

function pbVerdictHtml(ctx) {
  const h = pbVerdictHint({ ...ctx.page, status: ctx.d.status }, ctx.list);
  if (!h) return "";
  const btns = viewingUserId ? "" : h.suggest === "works"
    ? `<button class="btn" data-action="pb-verify-status" data-status="works">${esc(T("pb.verdict.toWorks"))}</button>`
    : h.suggest === "rejected" ? `<button class="btn" data-action="pb-verify-status" data-status="rejected">${esc(T("pb.verdict.toRejected"))}</button>` : "";
  return `<div class="pbVerdict${h.suggest ? " is-" + h.suggest : ""}">${ICONS.alert}<span>${esc(T(h.suggest ? "pb.verdict.ready" : "pb.verdict.mixed", { n: h.n, pro: h.pro, con: h.con }))}</span>${btns}</div>`;
}

function pbTradeAreaHtml(d) {
  if (recordMode !== "live") return pbBacktestNote();
  const ctx = pbAreaCtx(d);
  // 系统 / 策略 / 标签的交易从源头就只取范围内的；笔记的交易是正文里挂的，范围外的单独拎出来放到列表最后
  const outList = ctx.list.filter((t) => !inDataScope(t));
  if (outList.length) ctx.list = ctx.list.filter(inDataScope);
  const { list, mode, page } = ctx;
  const ro = !!viewingUserId;
  let html = "";
  if (d.kind === "verify") html += pbVerdictHtml(ctx);
  const evList = ctx.evStates.length ? pbMarkedTrades(page, list, "ev") : [];
  const tileNote = (t) => (mode === "page" ? pbTradeNote(t) : pbRowNoteOf(page, t, ctx.body));

  // 关联交易：真正决定这条笔记结论的那几笔
  if (ctx.evStates.length) {
    const isV = d.kind === "verify";
    const pro = isV ? pbMarkedTrades(page, list, "pro").length : 0, con = isV ? pbMarkedTrades(page, list, "con").length : 0;
    html += `<section class="pbPanel pbEvPanel">${pbSectionHeadHtml(T("pb.area.ev"), evList.length, "", T(isV ? "pb.area.evHintVerify" : "pb.area.evHintMistake"))}
      ${evList.length
        ? `<div class="pbEvSummary">${isV ? `<span class="pbEvBadge ev-pro">${esc(T("pb.area.pro"))} ${pro}</span><span class="pbEvBadge ev-con">${esc(T("pb.area.con"))} ${con}</span>` : ""}<span class="pbStatsRow">${pbStatsHtml(pbStats(evList))}</span></div>
           <div class="pbTileGrid">${evList.map((t) => pbTileHtml(t, { showLabel: true, note: tileNote(t), fav: pbAreaFav(ctx, t), badge: pbEvBadgeHtml(pbEvOf(page, t.id)) })).join("")}</div>`
        : `<div class="pbEmptyLine">${esc(T("pb.area.evEmpty"))}</div>`}
    </section>`;
  }

  // 收藏 / 关注
  const favList = list.filter((t) => pbAreaFav(ctx, t));
  const favTitle = mode === "page" ? T("pb.section.starred") : T("pb.area.fav");
  html += `<section class="pbPanel">${pbSectionHeadHtml(favTitle, favList.length, "", mode === "page" ? T("pb.section.starredHint") : T("pb.area.favHint"))}
    ${favList.length
      ? `<div class="pbStatsRow pbFavStats">${pbStatsHtml(pbStats(favList))}</div>
         <div class="pbTileGrid">${favList.map((t) => pbTileHtml(t, { showLabel: ctx.showLabel, note: tileNote(t), fav: true, badge: pbEvBadgeHtml(ctx.evStates.length ? pbEvOf(page, t.id) : "") })).join("")}</div>`
      : `<div class="pbEmptyLine">${esc(mode === "page" ? T("pb.noStarred") : T("pb.area.favEmpty"))}</div>`}
  </section>`;

  // 全部交易
  const extra = [];
  if (ctx.evStates.length) {
    extra.push({ val: "m:ev", label: esc(T("pb.area.evRow")), list: evList });
    if (d.kind === "verify") {
      extra.push({ val: "m:pro", label: `<span class="pbEvBadge ev-pro">${esc(T("pb.area.pro"))}</span>`, list: pbMarkedTrades(page, list, "pro"), cls: " isSub" });
      extra.push({ val: "m:con", label: `<span class="pbEvBadge ev-con">${esc(T("pb.area.con"))}</span>`, list: pbMarkedTrades(page, list, "con"), cls: " isSub" });
    }
    if (evList.length) extra.push({ val: "m:rest", label: esc(T("pb.area.restRow")), list: list.filter((t) => !pbEvOf(page, t.id)) });
  }
  extra.push({ val: "m:fav", label: `${ICONS.starFill} ${esc(favTitle)}`, list: favList });
  const noted = list.filter((t) => tileNote(t));
  const rows = (pbNotedOnly ? noted : list).filter((t) => pbAreaMatches(ctx, t, pbExecFilter));
  const shown = pbShowAllTrades ? rows : rows.slice(0, PB_TRADES_PREVIEW);
  const triageBtn = mode !== "page" || ro || !pbUnsortedCount() ? "" : `<button class="tinyBtn pbAddBtn" data-action="pb-triage-start" data-scope="unsorted">${ICONS.grid} ${esc(T("pb.triage.more", { n: pbUnsortedCount() }))}</button>`;
  const notedBtn = noted.length ? `<button class="tinyBtn pbAddBtn pbNotedBtn${pbNotedOnly ? " on" : ""}" data-action="pb-noted-only">${ICONS.pencil} ${esc(T("pb.note.onlyNoted", { n: noted.length }))}</button>` : "";
  const addBtn = mode !== "page" && !ro ? `<button class="tinyBtn pbAddBtn" data-action="pb-area-add">${ICONS.plus} ${esc(T("pb.area.add"))}</button>` : "";
  html += `<section class="pbPanel">${pbSectionHeadHtml(T("pb.section.trades"), list.length, notedBtn + triageBtn + addBtn, d.kind === "system" ? T("pb.section.tradesHintSystem") : "")}
    ${pbExecTableHtml(list, extra)}
    ${pbExecFilter ? `<div class="pbExecNow">${esc(T("pb.exec.showing", { v: pbAreaFilterLabel(ctx, pbExecFilter), n: rows.length }))} <button class="tinyBtn" data-action="pb-exec-filter" data-val="">${esc(T("pb.exec.showAll"))}</button></div>` : ""}
    ${rows.length
      ? `<div class="pbTradeList">${shown.map((t) => pbTradeRowHtml(t, { showLabel: ctx.showLabel, ctx })).join("")}</div>
         ${rows.length > shown.length ? `<button class="btn pbShowAll" data-action="pb-show-all-trades">${esc(T("pb.showAllTrades", { n: rows.length }))}</button>` : ""}`
      : outList.length ? "" : `<div class="pbEmptyLine">${esc(T(mode === "page" ? "pb.noTradesLong" : mode === "tag" ? "pb.noTagTrades" : d.kind === "verify" ? "pb.noVerifyTrades" : "pb.noMistakeTrades"))}</div>`}
    ${outList.length && !pbExecFilter ? `<div class="pbOutHead">${esc(T("scope.outHead", { n: outList.length }))}</div>
      <div class="pbTradeList isOut">${outList.map((t) => pbTradeRowHtml(t, { showLabel: ctx.showLabel, ctx, out: true })).join("")}</div>` : ""}
  </section>`;
  return html;
}

/* ---------- 交易区上的动作 ---------- */
async function pbAreaSetMark(tradeId, patchFn) {
  const d = editingReview;
  const page = d && pbFind(d.id);
  if (!page || viewingUserId || !(pbIsNote(page) || page.kind === "tag")) return;
  const p = pbWriteMarks(page.id, pbMarksWith(page, tradeId, patchFn(page)));
  refreshPbPanels();
  if (!(await p)) showReviewToast(pbError || T("error.dbOutdated"));
  refreshPbPanels();
  render();   // 模型库首页的便利贴在编辑器底下，跟着换
}
function pbAreaToggleFav(tradeId) { return pbAreaSetMark(tradeId, (page) => ({ fav: !pbIsFav(page, tradeId) })); }
function pbAreaCycleEv(tradeId) { return pbAreaSetMark(tradeId, (page) => ({ ev: pbEvNext(page.kind, pbEvOf(page, tradeId)) })); }
/* 交易从笔记里移出 / 标签摘掉之后，它在这一页上的标记也一起清掉 */
function pbDropMarks(pageId, tradeId) {
  const page = pbFind(pageId);
  if (!page || !Object.keys(pbMarkOf(page, tradeId)).length) return Promise.resolve(true);
  return pbWriteMarks(pageId, pbMarksWith(page, tradeId, { fav: false, ev: "" }));
}
/* 「+ 添加交易」选中一笔：笔记 → 正文「涉及的交易」里加一行；标签 → 给交易打上 */
async function pbAreaAddTrade(tradeId) {
  const d = editingReview;
  if (!d || viewingUserId) return;
  const t = trades.find((x) => x.id === tradeId);
  if (!t) return;
  if (pbMemberIds(pbFind(d.id) || d, d.body).includes(tradeId)) { showReviewToast(T("pb.area.already")); return; }
  let ok = false;
  if (pbIsNote(d)) { pbError = null; ok = await pbSetTradeInNote(d.id, tradeId, true, ""); }
  else if (d.kind === "tag") { ok = await pbPatchTrade(tradeId, { [PB_TAGS_KEY]: pbTagsToggled(t, d.id) }); }
  refreshPbPanels();
  render();
  showReviewToast(ok ? T("pb.area.added") : (pbError || T("error.dbOutdated")));
}
/* 行里的记录：点一下原地变输入框，回车 / 移开就存，Esc 放弃 */
function pbStartRowNote(tradeId) {
  if (viewingUserId) return;
  pbInlineNoteFor = tradeId;
  refreshPbPanels();
  const inp = document.getElementById("pbRowNoteInput");
  if (inp) { inp.focus(); const n = inp.value.length; try { inp.setSelectionRange(n, n); } catch (e) {} }
}
let pbRowNoteSaving = false;
async function pbSaveRowNote(text) {
  const id = pbInlineNoteFor;
  if (!id || pbRowNoteSaving) return;
  pbRowNoteSaving = true;
  pbInlineNoteFor = null;
  try {
    const d = editingReview;
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (d && pbIsNote(d)) {
      // 笔记：改正文里胶囊后面那句话（走编辑器，能 Ctrl+Z）
      if (clean !== pbMistakeLineNote(d.body, id)) {
        if (!reviewTiptap || !pbEditorSetLineNote(reviewTiptap, id, clean)) showReviewToast(T("pb.area.noteNoLine"));
        else await flushReviewSave();
      }
    } else {
      // 系统 / 策略 / 标签：交易身上的归类记录
      const t = trades.find((x) => x.id === id);
      if (t && pbTradeNote(t) !== clean) {
        const ok = await pbPatchTrade(id, { [PB_NOTE_KEY]: clean || undefined });
        if (!ok) showReviewToast(pbError || T("error.dbOutdated"));
      }
    }
  } finally {
    pbRowNoteSaving = false;
    refreshPbPanels();
  }
}
window.__pbRowNoteKey = function (e) {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === "Enter") { e.preventDefault(); pbSaveRowNote(e.target.value); }
  else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); pbInlineNoteFor = null; refreshPbPanels(); }
};
window.__pbRowNoteBlur = function (el) { if (pbInlineNoteFor) pbSaveRowNote(el.value); };

const PB_TRADES_PREVIEW = 30;
function pbPanelsForPageHtml(d) {
  let html = "";
  if (d.kind === "system") {
    const strategies = pbStrategiesOf(d.id);
    html += `<section class="pbPanel">${pbSectionHeadHtml(T("pb.section.strategies"), strategies.length, pbAddBtn("strategy", d.id, "pb.addStrategy"), T("pb.section.strategiesHint"))}
      ${strategies.length
        ? `<div class="pbStratGrid">${strategies.map((s) => {
            const ss = pbStats(pbTradesOf(s.id));
            const ex = mdPlainExcerpt(String(s.body || "").replace(/^\s{0,3}#{1,6}\s.*$/gm, ""), 90);
            return `<div class="pbStratCard" data-action="pb-open" data-id="${esc(s.id)}">
              <div class="pbStratCardTitle">${esc(pbTitle(s))}</div>
              <div class="pbStatsRow small">${pbStatsHtml(ss, true)}</div>
              ${ex ? `<div class="pbStratCardEx">${esc(ex)}</div>` : ""}
              <div class="pbStratCardFoot mono">${ICONS.star} ${pbTradesOf(s.id).filter(pbTradeStarred).length} · ${esc(T("pb.foot.mistakes", { n: pbMistakesOf(s.id).length }))}${pbNotesOf(s.id, "verify").length ? ` · ${esc(T("pb.foot.verify", { n: pbNotesOf(s.id, "verify").length }))}` : ""}${pbNotesOf(s.id, "tag").length ? ` · ${esc(T("pb.foot.tags", { n: pbNotesOf(s.id, "tag").length }))}` : ""}</div>
            </div>`;
          }).join("")}</div>`
        : `<div class="pbEmptyLine">${esc(T("pb.noStrategiesLong"))}</div>`}
    </section>`;
  }
  const tagsHere = pbNotesOf(d.id, "tag");
  html += `<section class="pbPanel">${pbSectionHeadHtml(T("pb.section.tags"), tagsHere.length, pbAddBtn("tag", d.id, "pb.addTag"), T("pb.section.tagsHint"))}
    ${tagsHere.length
      ? `<div class="pbTagGrid">${tagsHere.map((g) => pbTagCardHtml(g, { hideOwner: g.parent_id === d.id })).join("")}</div>`
      : `<div class="pbEmptyLine">${esc(T("pb.noTagsHere"))}</div>`}
  </section>`;
  const mistakes = pbMistakesOf(d.id);

  html += `<section class="pbPanel">${pbSectionHeadHtml(T("pb.section.mistakes"), mistakes.length, pbAddBtn("mistake", d.id, "pb.addMistake"), T("pb.section.mistakesHint"))}
    ${mistakes.length
      ? `<div class="pbStickyGrid">${mistakes.map((m) => pbStickyHtml(m, { hideOwner: m.parent_id === d.id })).join("")}</div>`
      : `<div class="pbEmptyLine">${esc(T("pb.noMistakesHere"))}</div>`}
  </section>`;

  const verifies = pbNotesOf(d.id, "verify");
  html += `<section class="pbPanel">${pbSectionHeadHtml(T("pb.section.verify"), verifies.length, pbAddBtn("verify", d.id, "pb.addVerify"), T("pb.section.verifyHint"))}
    ${verifies.length
      ? `<div class="pbStickyGrid">${verifies.map((v) => pbStickyHtml(v, { hideOwner: v.parent_id === d.id })).join("")}</div>`
      : `<div class="pbEmptyLine">${esc(T("pb.noVerifyHere"))}</div>`}
  </section>`;

  return html + pbTradeAreaHtml(d);
}
function pbPanelsForNoteHtml(d) {
  let html = pbTradeAreaHtml(d);
  // 相关笔记：这一条正文里链到的，加上别的笔记里链到这一条的——两个方向都算「有关系」。错题和待验证混在一起算
  const outIds = extractPageRefs(d.body);
  const related = pbSortList(pbPages.filter((m) => pbIsNote(m) && m.id !== d.id && (outIds.includes(m.id) || extractPageRefs(m.body).includes(d.id))));
  const mentionedIn = sortReviewsForDisplay(reviews.filter((r) => extractPageRefs(r.body).includes(d.id)));
  html += `<section class="pbPanel">${pbSectionHeadHtml(T("pb.section.related"), related.length, "", T("pb.section.relatedHint"))}
    ${related.length
      ? `<div class="pbStickyGrid">${related.map((m) => pbStickyHtml(m)).join("")}</div>`
      : `<div class="pbEmptyLine">${esc(T("pb.noRelated"))}</div>`}
    ${mentionedIn.length ? `<div class="pbMentioned"><span>${esc(T("pb.mentionedIn"))}</span>${mentionedIn.map((r) => pageRefHtml(r.id)).join("")}</div>` : ""}
  </section>`;
  return html;
}
function pbPanelsForTagHtml(d) {
  if (recordMode !== "live") return pbBacktestNote();
  const c = pbTagCompare(d);
  const delta = pbTagDeltaHtml(c);
  let html = `<section class="pbPanel">${pbSectionHeadHtml(T("pb.section.tagCompare"), null, "", c.owner ? T("pb.tag.scopeOwner", { name: pbLabel(c.owner.id) }) : T("pb.tag.scopeAll"))}
    <div class="pbTagCompare">
      <div class="pbTagCompareRow on"><span class="pbTagSide">${esc(T("pb.tag.with"))}</span><span class="pbStatsRow">${pbStatsHtml(c.with)}</span></div>
      <div class="pbTagCompareRow"><span class="pbTagSide">${esc(T("pb.tag.without"))}</span><span class="pbStatsRow">${pbStatsHtml(c.without)}</span></div>
      ${delta ? `<div class="pbTagDelta">${delta}</div>` : ""}
    </div>
  </section>`;
  return html + pbTradeAreaHtml(d);
}
function pbPanelsHtml() {
  const d = editingReview;
  if (!isPbDoc(d)) return "";
  syncReviewBody();
  if (d._isNew) return "";
  if (d.kind === "tag") return pbPanelsForTagHtml(d);
  return pbIsNote(d) ? pbPanelsForNoteHtml(d) : pbPanelsForPageHtml(d);
}
/* 只换 #pbPanels 和属性行，编辑器本体不动 */
function refreshPbPanels() {
  const el = document.getElementById("pbPanels");
  if (el && isPbDoc(editingReview)) el.innerHTML = pbPanelsHtml();
  if (isPbDoc(editingReview)) refreshReviewWeekRow();
  const crumbs = document.querySelector("#reviewEditorRoot .reviewCrumbs");
  if (crumbs && isPbDoc(editingReview)) crumbs.innerHTML = reviewCrumbsHtml();
}

/* ============================================================
   新建页面的小弹窗（画在 #secondaryModalRoot，盖得住编辑器）
   ============================================================ */
function pbNameModalHtml() {
  const m = pbNameModal;
  const parent = pbFind(m.parentId);
  const title = m.kind === "system" ? T("pb.newSystem")
    : m.kind === "strategy" ? T("pb.newStrategyOf", { name: parent ? pbTitle(parent) : "" })
    : m.kind === "verify" ? (parent ? T("pb.newVerifyOf", { name: pbLabel(parent.id) }) : T("pb.addGlobalVerify"))
    : m.kind === "tag" ? (parent ? T("pb.newTagOf", { name: pbLabel(parent.id) }) : T("pb.addGlobalTag"))
    : parent ? T("pb.newMistakeOf", { name: pbLabel(parent.id) }) : T("pb.addGlobalMistake");
  return `<div class="overlay" data-action="dismiss-pb-name-overlay">
    <div class="modal" style="max-width:440px;">
      <div class="modalHead">
        <div class="display" style="font-size:16px;font-weight:600;">${esc(title)}</div>
        <button class="iconBtn" data-action="close-pb-name-modal">${ICONS.x}</button>
      </div>
      <div class="modalBody">
        <div class="field" style="margin-bottom:8px;">
          <div class="fieldLabel">${esc(T("pb.nameLabel." + m.kind))}</div>
          <input type="text" class="input" id="pbNameInput" value="${esc(m.name || "")}" placeholder="${esc(T("pb.namePh." + m.kind))}" maxlength="60"
            onkeydown="if(event.key==='Enter'&&!event.isComposing){event.preventDefault();document.querySelector('[data-action=&quot;save-pb-name-modal&quot;]').click();}" />
        </div>
        <div class="pbModalHint">${esc(T("pb.nameHint." + m.kind))}</div>
      </div>
      <div class="modalFoot">
        <button class="btn" data-action="close-pb-name-modal">${esc(T("common.cancel"))}</button>
        <button class="btn btn-primary" data-action="save-pb-name-modal">${esc(T("pb.create"))}</button>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   动作（事件委托里调这些）
   ============================================================ */
async function pbCreatePage(kind, parentId, title, body) {
  const p = { id: newPbId(), kind, parent_id: parentId || null, title: title || "", body: body === undefined ? pbTemplateBody(kind) : body, sort_order: null, folded_headings: [] };
  const ok = await persistPbPage(p);
  return ok ? pbFind(p.id) : null;
}
async function pbOpenDoc(id) {
  if (!findDocById(id)) return;
  if (editingReview) await navigateEditorTo(id);
  else { editorBackStack = []; openReviewEditor(id); }
}
/* 星标：只在交易已经归到某一页时才有意义（「关注的关联交易」是相对那一页说的） */
async function pbToggleStar(tradeId) {
  const t = trades.find((x) => x.id === tradeId);
  if (!t || viewingUserId) return;
  const p = pbPatchTrade(tradeId, { [PB_STAR_KEY]: pbTradeStarred(t) ? undefined : true });
  refreshPbPanels(); render();
  await p;
  refreshPbPanels(); render();
}
/* 一笔交易进 / 出一条笔记（错题或待验证）：改的是笔记正文里那一行列表项。on = 要不要在里面 */
/* ---------- 这条笔记正开在编辑器里时：改编辑器的文档，不改库里那份 ----------
   以前这种情况直接跳过（怕跟正在写的正文打架），而且是悄悄跳过：在笔记页里点开一笔交易 → 编辑 →
   取消勾选这条笔记 → 保存，什么都没变、也没提示。现在走一个 ProseMirror 事务，跟手动删那一行一样：
   能 Ctrl+Z 撤回、折叠和光标不受影响，存库还是编辑器那套自动保存。
   规则跟 pbAppendTradeToBody / pbRemoveTradeFromBody 一致：只认「开头就是这笔交易胶囊」的列表项 */
function pbEditorTradeItems(doc, tradeId) {
  const out = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== "listItem" && node.type.name !== "taskItem") return true;
    const p = node.firstChild;
    const first = p && p.type.name === "paragraph" ? p.firstChild : null;
    if (first && first.type.name === "tradeRef" && first.attrs.id === tradeId) out.push({ node, pos });
    return true;
  });
  return out;
}
function pbEditorHasTrade(doc, tradeId) {
  let found = false;
  doc.descendants((node) => {
    if (found) return false;
    if (node.type.name === "tradeRef" && node.attrs.id === tradeId) found = true;
    return !found;
  });
  return found;
}
function pbEditorRemoveTrade(ed, tradeId) {
  const items = pbEditorTradeItems(ed.state.doc, tradeId);
  if (!items.length) return false;
  const tr = ed.state.tr;
  // 从后往前删，前面的位置不会被挪动；列表里只剩这一项的话连整个列表一起删，不留一个空列表
  items.slice().reverse().forEach(({ node, pos }) => {
    const $p = tr.doc.resolve(pos);
    const list = $p.parent;
    if (list.childCount === 1 && $p.depth > 0) tr.delete($p.before(), $p.after());
    else tr.delete(pos, pos + node.nodeSize);
  });
  if (pbEditorHasTrade(tr.doc, tradeId)) return false;   // 正文别处还提到这笔：跟库里那份一样，不替用户删句子
  ed.view.dispatch(tr);
  return true;
}
function pbEditorAddTrade(ed, tradeId, note) {
  const { state } = ed;
  const doc = state.doc, schema = state.schema;
  if (pbEditorHasTrade(doc, tradeId)) return true;
  const clean = String(note || "").replace(/\s+/g, " ").trim();
  const para = schema.nodes.paragraph.create(null, [schema.nodes.tradeRef.create({ id: tradeId })].concat(clean ? [schema.text(" " + clean)] : []));
  const item = schema.nodes.listItem.create(null, para);
  const names = pbHeadingNames("pb.tpl.mistakeTrades").map((n) => n.toLowerCase());
  const blocks = [];
  doc.forEach((node, pos) => blocks.push({ node, pos }));
  const hi = blocks.findIndex((b) => b.node.type.name === "heading" && names.includes(b.node.textContent.trim().toLowerCase()));
  const tr = state.tr;
  if (hi < 0) {
    // 没有「涉及的交易」那一节：在文末补一节
    tr.insert(doc.content.size, [schema.nodes.heading.create({ level: 2 }, schema.text(T("pb.tpl.mistakeTrades"))), schema.nodes.bulletList.create(null, item)]);
  } else {
    let end = blocks.length;
    for (let i = hi + 1; i < blocks.length; i++) if (blocks[i].node.type.name === "heading") { end = i; break; }
    let last = null;
    for (let i = end - 1; i > hi; i--) {
      const b = blocks[i];
      if (b.node.type.name === "paragraph" && !b.node.content.size) continue;   // 空段落不算
      last = b; break;
    }
    if (last && last.node.type.name === "bulletList") tr.insert(last.pos + last.node.nodeSize - 1, item);   // 接在已有列表的最后
    else {
      const at = last ? last.pos + last.node.nodeSize : blocks[hi].pos + blocks[hi].node.nodeSize;
      tr.insert(at, schema.nodes.bulletList.create(null, item));
    }
  }
  ed.view.dispatch(tr);
  return true;
}
/* 改「- [[trade:id]] 那句话」里胶囊后面的文字。只改第一行（同一笔一般只列一次） */
function pbEditorSetLineNote(ed, tradeId, text) {
  const items = pbEditorTradeItems(ed.state.doc, tradeId);
  if (!items.length) return false;
  const { node, pos } = items[0];
  const para = node.firstChild;
  const from = pos + 3;                       // listItem 开头 +1 进段落、+1 进内容、+1 跳过胶囊
  const to = pos + 1 + para.nodeSize - 1;      // 段落内容结尾
  const tr = ed.state.tr;
  if (to > from) tr.delete(from, to);
  if (text) tr.insertText(" " + text, from);
  ed.view.dispatch(tr);
  return true;
}
async function pbSetTradeInOpenNote(tradeId, on, note) {
  const d = editingReview;
  syncReviewBody();
  const has = extractTradeRefs(d.body).includes(tradeId);
  if (has === !!on) return true;
  const ed = reviewTiptap;
  if (ed) {
    const ok = on ? pbEditorAddTrade(ed, tradeId, note) : pbEditorRemoveTrade(ed, tradeId);
    if (!ok) { pbError = T("pb.err.inlineRef", { title: pbTitle(d) }); return false; }
  } else {
    // 编辑器没加载出来、退回了纯文本框：直接改 markdown，再把文本框也换掉
    let body;
    if (!on) {
      const r = pbRemoveTradeFromBody(d.body, tradeId);
      if (!r.removed || r.stillLinked) { pbError = T("pb.err.inlineRef", { title: pbTitle(d) }); return false; }
      body = r.body;
    } else body = pbAppendTradeToBody(d.body, tradeId, note);
    d.body = body;
    const ta = document.querySelector(".reviewFallbackInput");
    if (ta) ta.value = body;
    scheduleReviewSave();
  }
  // 马上存：笔记页下面「涉及的交易」那一栏、库里那份都等着这一步刷新
  const saved = await flushReviewSave();
  refreshPbPanels();
  return saved !== false;
}

async function pbSetTradeInNote(noteId, tradeId, on, note) {
  const ok = await pbSetTradeInNoteBody(noteId, tradeId, on, note);
  if (ok && !on) await pbDropMarks(noteId, tradeId);
  return ok;
}
async function pbSetTradeInNoteBody(noteId, tradeId, on, note) {
  const m = pbFind(noteId);
  if (!m || viewingUserId) return false;
  if (editingReview && editingReview.id === noteId) return pbSetTradeInOpenNote(tradeId, on, note);
  const has = pbNoteTradeIds(m).includes(tradeId);
  if (has === !!on) return true;
  let body;
  if (!on) {
    const r = pbRemoveTradeFromBody(m.body, tradeId);
    if (!r.removed || r.stillLinked) { pbError = T("pb.err.inlineRef", { title: pbTitle(m) }); return false; }
    body = r.body;
  } else {
    body = pbAppendTradeToBody(m.body, tradeId, note);
  }
  return persistPbPage({ ...m, body });
}
async function pbToggleTradeInNote(noteId, tradeId, note) {
  const m = pbFind(noteId);
  if (!m) return false;
  const ok = await pbSetTradeInNote(noteId, tradeId, !pbNoteTradeIds(m).includes(tradeId), note);
  render();
  return ok;
}

/* 待验证 → 衍生策略。原地改 kind，id 不变：别处链到它的 [[page:id]] 照样有效。
   正文里关联的交易一起归到这个新策略下——策略页的交易看的是交易身上的归属，不看正文 */
async function pbPromoteVerify() {
  const d = editingReview;
  if (!d || d.kind !== "verify" || reviewIsReadOnly()) return;
  if (recordMode !== "live") { showReviewToast(T("pb.promote.needLive")); return; }
  const owner = pbNoteOwner(d);
  const sys = owner ? (owner.kind === "system" ? owner : pbFind(owner.parent_id)) : null;
  if (!sys) { showReviewToast(T("pb.promote.needSystem")); return; }
  const ids = pbNoteTradeIds(d).filter((id) => trades.some((t) => t.id === id));
  if (!confirm(T("pb.promote.confirm", { name: pbTitle(d), sys: pbTitle(sys), n: ids.length }))) return;
  await flushReviewSave();
  const before = { kind: d.kind, parent_id: d.parent_id };
  d.kind = "strategy";
  d.parent_id = sys.id;
  scheduleReviewSave();
  if (!(await flushReviewSave())) { d.kind = before.kind; d.parent_id = before.parent_id; refreshPbPanels(); return; }
  if (ids.length) await pbPatchTrades(ids.map((id) => ({ id, patch: { [PB_KEY]: d.id } })));
  refreshPbPanels();
  render();
  showReviewToast(T("pb.promote.done", { name: pbLabel(d.id) }));
}

/* 记交易 / 归类时能打的标签：这一页的 + 所属系统的 + 通用的，再加上这笔已经打了、但不在里面的（不然摘不掉） */
function pbTagChoices(pageId, t) {
  const c = pbNoteCandidates(pageId, "tag");
  const list = c.own.concat(c.fromSystem, c.global);
  const ids = new Set(list.map((g) => g.id));
  const extra = pbTradeTagIds(t).filter((id) => !ids.has(id)).map(pbFind);
  return extra.concat(list);
}
function pbTagChipsHtml(list, onIds, action, ro) {
  return list.map((g) => {
    const on = onIds.includes(g.id);
    return `<button type="button" class="pbTagChip${on ? " on" : ""}" ${ro ? "disabled" : `data-action="${action}" data-id="${esc(g.id)}"`} title="${esc(pbTagLabel(g))}">${on ? ICONS.check : ICONS.tag}${esc(pbTitle(g))}</button>`;
  }).join("");
}

/* ============================================================
   归类模式
   ============================================================ */
function pbTriageQueue(scope) {
  const list = scopedTrades().filter((t) => scope === "all" || pbTradeIsUnsorted(t));   // 只排数据范围内的
  return pbSortTradesDesc(list).map((t) => t.id);
}
function startPbTriage(scope) {
  if (viewingUserId || recordMode !== "live") return;
  const sc = scope === "all" ? "all" : "unsorted";
  pbTriage = { ids: pbTriageQueue(sc), i: 0, scope: sc, panel: "", errText: "", newNote: "", done: new Set(), starred: 0, mistakes: 0 };
  window.scrollTo({ top: 0 });
}
function pbTriageCurrent() {
  if (!pbTriage) return null;
  return trades.find((t) => t.id === pbTriage.ids[pbTriage.i]) || null;
}
function pbTriageStep(delta) {
  if (!pbTriage) return;
  pbTriageSaveNote();   // 翻走之前把没存的记录存掉（不等它：存的是 noteFor 那一笔，翻到哪都不影响）
  pbTriage.i = Math.max(0, Math.min(pbTriage.ids.length, pbTriage.i + delta));
  pbTriage.panel = "";
  pbTriage.errText = "";
  render();
  window.scrollTo({ top: 0 });
}
async function pbTriageAssign(pageId) {
  const t = pbTriageCurrent();
  if (!t) return;
  const patch = pageId === PB_NONE ? { [PB_KEY]: PB_NONE, [PB_STAR_KEY]: undefined } : { [PB_KEY]: pageId };
  if (t[PB_KEY] === pageId) return;
  pbTriage.done.add(t.id);
  const p = pbPatchTrade(t.id, patch);
  render();
  await p;
  render();
}
async function pbTriageStar() {
  const t = pbTriageCurrent();
  if (!t || !pbTradePageId(t)) return;
  if (!pbTradeStarred(t)) pbTriage.starred++;
  pbTriage.done.add(t.id);
  const p = pbPatchTrade(t.id, { [PB_STAR_KEY]: pbTradeStarred(t) ? undefined : true });
  render();
  await p;
  render();
}
/* 归类模式里点标签：马上写到交易上（跟星标一样先改本地再写库） */
async function pbTriageToggleTag(tagId) {
  const t = pbTriageCurrent();
  if (!t || !pbFind(tagId)) return;
  pbTriage.done.add(t.id);
  const p = pbPatchTrade(t.id, { [PB_TAGS_KEY]: pbTagsToggled(t, tagId) });
  render();
  await p;
  render();
}
/* 归类模式里打开错题（E）或待验证（V）的面板；再按一次同一个键收起 */
function pbTriageOpenPanel(kind) {
  if (!pbTriage) return;
  pbTriage.panel = pbTriage.panel === kind ? "" : kind;
  pbTriage.newNote = "";
  render();
  if (pbTriage.panel) { const inp = document.getElementById("pbErrText"); if (inp) inp.focus(); }
}
async function pbTriageToggleNote(noteId) {
  const t = pbTriageCurrent();
  if (!t) return;
  const m = pbFind(noteId);
  const adding = m && !pbNoteTradeIds(m).includes(t.id);
  const ok = await pbToggleTradeInNote(noteId, t.id, pbTriage.errText);
  if (ok && adding) { pbTriage.mistakes++; pbTriage.errText = ""; pbTriage.done.add(t.id); }
  render();
}
async function pbTriageNewNote(kind) {
  const t = pbTriageCurrent();
  const name = (pbTriage.newNote || "").trim();
  if (!t || !name || !PB_NOTE_KINDS.includes(kind)) return;
  // 新笔记挂在这笔交易归到的那一页下面；还没归类就先当通用的
  const owner = pbTradePageId(t) || null;
  const body = pbAppendTradeToBody(pbTemplateBody(kind), t.id, pbTriage.errText);
  const m = await pbCreatePage(kind, owner, name, body);
  if (m) { pbTriage.newNote = ""; pbTriage.errText = ""; pbTriage.mistakes++; pbTriage.done.add(t.id); }
  render();
}

/* ---------- 归类记录（这笔的记录）----------
   打字时不 render()：整块重画会把光标和输入法状态冲掉。停手 1.2 秒、失焦、翻到别的单、退出归类时存，
   只改右上角那个「已保存」小字。还没存的那一份放在 pbTriage.noteFor / noteText 上，
   中途因为别的操作重画了，文本框里显示的也是这一份，不会被库里的旧值盖回去。 */
let pbTriageNoteTimer = null;
function pbTriageNoteValue(t) {
  return pbTriage && pbTriage.noteFor === t.id ? pbTriage.noteText : (t[PB_NOTE_KEY] || "");
}
function pbTriageNoteStatus(key) {
  const el = document.getElementById("pbNoteStatus");
  if (!el) return;
  el.textContent = key ? T(key) : "";
  el.className = "pbNoteStatus" + (key === "pb.note.failed" ? " err" : key === "pb.note.saved" ? " ok" : "");
}
window.__pbTriageNoteInput = function (el) {
  const t = pbTriageCurrent();
  if (!t) return;
  pbTriage.noteFor = t.id;
  pbTriage.noteText = el.value;
  pbTriageNoteStatus("pb.note.unsaved");
  // 只换按钮那一小格（能不能点、「已写进」要不要撤掉），不重画整块
  const act = document.getElementById("pbNoteActions");
  if (act) act.innerHTML = pbTriageNoteActionsHtml(t, el.value);
  clearTimeout(pbTriageNoteTimer);
  pbTriageNoteTimer = setTimeout(pbTriageSaveNote, 1200);
};
/* Ctrl/⌘+Enter = 存好并下一笔；Esc = 收起光标（不退出归类——document 上那条 Esc 链会把整个归类关掉） */
window.__pbTriageNoteKey = function (e) {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); pbTriageStep(1); }
  else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); e.target.blur(); }
};
async function pbTriageSaveNote() {
  clearTimeout(pbTriageNoteTimer);
  pbTriageNoteTimer = null;
  if (!pbTriage || !pbTriage.noteFor) return true;
  const id = pbTriage.noteFor;
  const text = String(pbTriage.noteText || "").replace(/\s+$/, "");
  const t = trades.find((x) => x.id === id);
  if (!t) { pbTriage.noteFor = null; return true; }
  if ((t[PB_NOTE_KEY] || "") === text) { pbTriage.noteFor = null; pbTriageNoteStatus(text ? "pb.note.saved" : ""); return true; }
  pbTriage.done.add(id);
  pbTriageNoteStatus("pb.note.saving");
  const ok = await pbPatchTrade(id, { [PB_NOTE_KEY]: text || undefined });
  // 存的途中又改过：保持这一份草稿，排着的那次会再存
  if (pbTriage && pbTriage.noteFor === id && String(pbTriage.noteText || "").replace(/\s+$/, "") === text) pbTriage.noteFor = null;
  if (pbTriage && pbTriageCurrent() && pbTriageCurrent().id === id) pbTriageNoteStatus(ok ? "pb.note.saved" : "pb.note.failed");
  return ok;
}
function pbTriageFocusNote() {
  const el = document.getElementById("pbTriageNote");
  if (!el) return;
  el.focus();
  el.setSelectionRange(el.value.length, el.value.length);
}
/* 「也写进页面」：跨好几笔才看得出来的发现，记进这笔所归那一页的「归类时的发现」一节（带日期和这笔的胶囊） */
async function pbTriageNoteToPage() {
  const t = pbTriageCurrent();
  const page = t && pbFind(pbTradePageId(t));
  if (!page) return;
  const text = pbTriageNoteValue(t).trim();
  if (!text) { pbTriageFocusNote(); return; }
  await pbTriageSaveNote();
  const ok = await persistPbPage({ ...page, body: pbAppendFindingToBody(page.body, text, t.id, todayStr()) });
  if (ok) pbTriage.sentToPage = t.id + "\n" + text;
  render();
}
function pbTriageNoteBlockHtml(t) {
  const val = pbTriageNoteValue(t);
  const page = pbFind(pbTradePageId(t));
  return `<div class="pbTriageBlock pbNoteBlock">
    <div class="pbTriageLabel">${esc(T("pb.note.label"))}<span class="pbKbdHint">${esc(T("pb.note.keyHint", { mod: modKeyLabel() }))}</span>
      <span class="pbNoteStatus${t[PB_NOTE_KEY] && pbTriage.noteFor !== t.id ? " ok" : ""}" id="pbNoteStatus">${t[PB_NOTE_KEY] && pbTriage.noteFor !== t.id ? esc(T("pb.note.saved")) : ""}</span></div>
    <textarea class="input pbNoteInput" id="pbTriageNote" rows="3" placeholder="${esc(T("pb.note.ph"))}"
      oninput="window.__pbTriageNoteInput(this)" onblur="pbTriageSaveNote()" onkeydown="window.__pbTriageNoteKey(event)">${esc(val)}</textarea>
    ${page ? `<div class="pbNoteActions" id="pbNoteActions">${pbTriageNoteActionsHtml(t, val)}</div>` : ""}
  </div>`;
}
function pbTriageNoteActionsHtml(t, val) {
  const page = pbFind(pbTradePageId(t));
  if (!page) return "";
  if (pbTriage.sentToPage === t.id + "\n" + val.trim()) {
    return `<span class="pbNoteSent">${ICONS.check} ${esc(T("pb.note.sent", { name: pbTitle(page) }))}</span>`;
  }
  return `<button class="tinyBtn pbNoteToPage" data-action="pb-triage-note-to-page" ${val.trim() ? "" : "disabled"} title="${esc(T("pb.note.toPageTitle"))}">${ICONS.book} ${esc(T("pb.note.toPage", { name: pbTitle(page) }))}</button>`;
}

function pbTriageFieldsHtml(t) {
  const modelF = roleField("model");
  const rows = [];
  if (modelF && (Array.isArray(t[modelF.id]) ? t[modelF.id].length : t[modelF.id])) {
    const v = t[modelF.id];
    rows.push({ label: modelF.label, text: Array.isArray(v) ? v.join(", ") : String(v), long: false });
  }
  // 跟看图模式挂的是同一批字段（用户在那边挑过「看图时要看哪些」），归类时要看的也就是这些
  focusFields.forEach((fid) => {
    const f = resolveField(fid);
    if (!f || f.id === VF_PLAYBOOK || f.id === VF_PB_TAGS || f.id === VF_PB_NOTE || (modelF && f.id === modelF.id)) return;
    let v = tradeFieldValue(t, f);
    if (Array.isArray(v)) v = v.join(", ");
    if (v === undefined || v === null || String(v).trim() === "") return;
    rows.push({ label: f.label, text: String(v), long: f.type === "textarea" || String(v).length > 40 });
  });
  return rows.map((r) => `<div class="focusField${r.long ? " isLong" : ""}"><div class="focusFieldLabel">${esc(r.label)}</div><div class="focusFieldVal">${esc(r.text)}</div></div>`).join("");
}
function pbTriageNotePanelHtml(t, kind) {
  const isV = kind === "verify";
  const pageId = pbTradePageId(t);
  const c = pbNoteCandidates(pageId, kind);
  const has = (m) => pbNoteTradeIds(m).includes(t.id);
  const group = (label, all) => { const list = all.filter((m) => !pbVerifyRejected(m) || has(m)); return list.length ? `<div class="pbMpGroup">${esc(label)}</div>` + list.map((m) => `<button class="pbMpRow${has(m) ? " on" : ""}${isV ? " isVerify" : ""}" data-action="pb-triage-toggle-note" data-id="${esc(m.id)}">
      <span class="pbMpBox">${has(m) ? ICONS.check : ""}</span>
      <span class="pbMpTitle">${esc(pbTitle(m))}</span>
      ${isV ? pbStatusPillHtml(m) : ""}
      <span class="pbMpN mono">${pbNoteTrades(m).length}</span>
    </button>`).join("") : ""; };
  const page = pbFind(pageId);
  const sys = page && page.kind === "strategy" ? pbFind(page.parent_id) : null;
  const ofKey = isV ? "pb.mp.ofPageVerify" : "pb.mp.ofPage";
  const body = group(page ? T(ofKey, { name: pbTitle(page) }) : "", c.own)
    + group(sys ? T(ofKey, { name: pbTitle(sys) }) : "", c.fromSystem)
    + group(T(isV ? "pb.globalVerify" : "pb.globalMistake"), c.global);
  const newPh = page ? T(isV ? "pb.mp.newPhVerify" : "pb.mp.newPh", { name: pbTitle(page) }) : T(isV ? "pb.mp.newPhGlobalVerify" : "pb.mp.newPhGlobal");
  return `<div class="pbMp">
    <input class="input" id="pbErrText" type="text" placeholder="${esc(T(isV ? "pb.mp.notePh" : "pb.mp.errPh"))}" value="${esc(pbTriage.errText)}" oninput="window.__pbTriageInput(this,'errText')" />
    ${body || `<div class="pbEmptyLine">${esc(T(isV ? "pb.mp.emptyVerify" : "pb.mp.empty"))}</div>`}
    <div class="pbMpNew">
      <input class="input" type="text" placeholder="${esc(newPh)}" value="${esc(pbTriage.newNote)}"
        oninput="window.__pbTriageInput(this,'newNote')"
        onkeydown="if(event.key==='Enter'&&!event.isComposing){event.preventDefault();window.__pbTriageInput(this,'newNote');document.querySelector('[data-action=&quot;pb-triage-new-note&quot;]').click();}" />
      <button class="btn" data-action="pb-triage-new-note" data-kind="${kind}">${ICONS.plus} ${esc(T("pb.mp.create"))}</button>
    </div>
  </div>`;
}
window.__pbTriageInput = function (el, key) { if (pbTriage) pbTriage[key] = el.value; };

function renderPbTriage() {
  const tr = pbTriage;
  const total = tr.ids.length;
  const scopeSeg = `<span class="reviewPeriodSeg">
    <button class="tinyBtn ${tr.scope === "unsorted" ? "on" : ""}" data-action="pb-triage-scope" data-scope="unsorted">${esc(T("pb.triage.scopeUnsorted"))}</button>
    <button class="tinyBtn ${tr.scope === "all" ? "on" : ""}" data-action="pb-triage-scope" data-scope="all">${esc(T("pb.triage.scopeAll"))}</button>
  </span>`;
  const pct = total ? Math.round((Math.min(tr.i, total) / total) * 100) : 100;
  const bar = `<div class="pbTriageBar">
    <button class="btn" data-action="pb-triage-exit">← ${esc(T("tab.playbook"))}</button>
    <div class="pbTriageTitle display">${esc(T("pb.triage.title"))}</div>
    <div class="pbTriageProgress mono">
      <span>${esc(T("pb.triage.pos", { cur: Math.min(tr.i + 1, total), total }))}</span>
      <span class="pbProgress"><i style="width:${pct}%"></i></span>
      <span class="muted">${esc(T("pb.triage.doneCount", { n: tr.done.size }))}</span>
    </div>
    ${scopeSeg}
  </div>${dataScopeOn() ? `<div class="pbTriageScopeNote">${ICONS.filter}<span>${esc(T("scope.triageNote", { cond: comboConditionsText({ conditions: dataScopeConditions() }) }))}</span></div>` : ""}`;
  if (pbError) return bar + `<div class="notice error" style="margin-bottom:16px;">${ICONS.alert}<span>${esc(pbError)}</span></div>` + pbTriageBodyHtml();
  return bar + pbTriageBodyHtml();
}
function pbTriageBodyHtml() {
  const tr = pbTriage;
  if (!pbHasPages()) {
    return `<div class="pbTriageDone"><p>${esc(T("pb.triage.noPages"))}</p>
      <button class="btn btn-primary" data-action="pb-new" data-kind="system" data-parent="" data-from="triage">${ICONS.plus} ${esc(T("pb.newSystem"))}</button></div>`;
  }
  if (tr.i >= tr.ids.length) {
    return `<div class="pbTriageDone">
      <div class="pbTriageDoneMark">${ICONS.check}</div>
      <div class="display pbTriageDoneTitle">${esc(tr.ids.length ? T("pb.triage.finished") : T("pb.triage.nothing"))}</div>
      ${tr.ids.length ? `<p class="mono">${esc(T("pb.triage.summary", { n: tr.done.size, s: tr.starred, m: tr.mistakes }))}</p>` : ""}
      <div class="pbTriageDoneBtns">
        <button class="btn btn-primary" data-action="pb-triage-exit">${esc(T("pb.triage.backToLib"))}</button>
        ${tr.ids.length ? `<button class="btn" data-action="pb-triage-prev">${esc(T("pb.triage.prev"))}</button>` : ""}
        ${tr.scope === "unsorted" ? `<button class="btn" data-action="pb-triage-scope" data-scope="all">${esc(T("pb.triage.reviewAll"))}</button>` : ""}
      </div>
    </div>`;
  }
  const t = pbTriageCurrent();
  if (!t) {
    return `<div class="pbTriageDone"><p>${esc(T("pb.triage.gone"))}</p><button class="btn btn-primary" data-action="pb-triage-next">${esc(T("pb.triage.next"))}</button></div>`;
  }
  const shot = pbShotOf(t);
  const cur = t[PB_KEY] === PB_NONE ? PB_NONE : pbTradePageId(t);
  const suggest = cur ? "" : pbSuggestFor(t);
  const opts = pbAssignOptions();
  const optHtml = opts.map((o, k) => `<button class="pbOpt depth${o.depth}${cur === o.id ? " on" : ""}${suggest === o.id ? " suggest" : ""}" data-action="pb-triage-assign" data-id="${esc(o.id)}">
      ${k < 9 ? `<kbd>${k + 1}</kbd>` : `<kbd class="blank"></kbd>`}
      <span class="pbOptName">${o.depth ? `<span class="pbOptTree">└</span>` : ""}${esc(o.label)}</span>
      ${suggest === o.id ? `<span class="pbSuggest">${esc(T("pb.triage.suggest"))}</span>` : ""}
      ${cur === o.id ? `<span class="pbOptCheck">${ICONS.check}</span>` : ""}
    </button>`).join("");
  const inMistakes = pbMistakesWithTrade(t.id);
  const inVerify = pbNotesWithTrade(t.id, "verify");
  const starOn = pbTradeStarred(t);
  const canStar = !!pbTradePageId(t);
  const rF = roleField("r_multiple"), resultF = roleField("result");
  const result = resultF ? t[resultF.id] : "";
  const rc = resultColor(result);
  const rVal = rF ? t[rF.id] : "";
  const hasR = rVal !== undefined && rVal !== "" && !isNaN(parseFloat(rVal));
  return `<div class="pbTriageMain">
    <div class="pbTriageShot"${shot ? ` data-action="preview-image" data-url="${esc(imgSrc(shot))}"` : ""}>
      ${shot ? `<img src="${esc(imgSrc(shot))}" alt="" referrerpolicy="no-referrer" data-fallback-url="${esc(imgSrc(shot))}" data-fallback-class="focusShotEmpty" onerror="window.__imgFallback(this)" />`
        : `<div class="focusShotEmpty">${ICONS.camera} ${esc(T("focus.noShot"))}</div>`}
    </div>
    <div class="pbTriageSide">
      <div class="pbTriageTrade">
        <div class="focusSideHead">
          <span class="focusDate">${esc(pbTradeDateOf(t) || "—")}</span>
          ${hasR ? `<span class="focusR" style="color:${rc}">${(parseFloat(rVal) >= 0 ? "+" : "") + esc(String(rVal))}R</span>` : ""}
        </div>
        <div class="focusModelRow">
          ${result ? `<span class="focusResult" style="background:${rc}">${esc(result)}</span>` : ""}
          ${pbTakenBadgeHtml(t)}
          <button class="tinyBtn" data-action="edit-trade" data-id="${esc(t.id)}">${ICONS.pencil} ${esc(T("focus.edit"))}</button>
        </div>
        <div class="focusFields pbTriageFields">${pbTriageFieldsHtml(t)}</div>
      </div>
      <div class="pbTriageBlock">
        <div class="pbTriageLabel">${esc(T("pb.triage.which"))}<span class="pbKbdHint">${esc(T("pb.triage.whichHint"))}</span></div>
        <div class="pbOptList">${optHtml}
          <button class="pbOpt none${cur === PB_NONE ? " on" : ""}" data-action="pb-triage-assign" data-id="${PB_NONE}">
            <kbd>0</kbd><span class="pbOptName">${esc(T("pb.none"))}</span>${cur === PB_NONE ? `<span class="pbOptCheck">${ICONS.check}</span>` : ""}
          </button>
        </div>
      </div>
      ${pbTriageNoteBlockHtml(t)}
      <div class="pbTriageBlock">
        <div class="pbToggleRow">
          <button class="pbToggle${starOn ? " on" : ""}" data-action="pb-triage-star" ${canStar ? "" : `disabled title="${esc(T("pb.triage.starNeedsPage"))}"`}>
            <kbd>S</kbd>${starOn ? ICONS.starFill : ICONS.star}<span>${esc(T("pb.triage.star"))}</span>
          </button>
          <button class="pbToggle${pbTriage.panel === "mistake" ? " open" : ""}${inMistakes.length ? " on" : ""}" data-action="pb-triage-panel" data-kind="mistake">
            <kbd>E</kbd>${ICONS.alert}<span>${esc(inMistakes.length ? T("pb.triage.inMistakes", { n: inMistakes.length }) : T("pb.triage.addMistake"))}</span>
          </button>
          <button class="pbToggle isVerify${pbTriage.panel === "verify" ? " open" : ""}${inVerify.length ? " on" : ""}" data-action="pb-triage-panel" data-kind="verify">
            <kbd>V</kbd>${ICONS.search}<span>${esc(inVerify.length ? T("pb.triage.inVerify", { n: inVerify.length }) : T("pb.triage.addVerify"))}</span>
          </button>
        </div>
        ${pbTriage.panel ? pbTriageNotePanelHtml(t, pbTriage.panel) : ""}
        ${(() => { const tl = pbTagChoices(pbTradePageId(t), t); return tl.length ? `<div class="pbTriageTags"><span class="pbTriageTagsLabel">${esc(T("pb.triage.tags"))}</span>${pbTagChipsHtml(tl, pbTradeTagIds(t), "pb-triage-tag", false)}</div>` : ""; })()}
      </div>
      <div class="pbTriageNav">
        <button class="btn" data-action="pb-triage-prev" ${pbTriage.i === 0 ? "disabled" : ""}><kbd>←</kbd> ${esc(T("pb.triage.prev"))}</button>
        <button class="btn btn-primary" data-action="pb-triage-next">${esc(T("pb.triage.next"))} <kbd>Enter</kbd></button>
      </div>
    </div>
  </div>`;
}
/* 归类模式的键盘：数字 = 归到第几项（0 = 不属于任何模型）、S = 关注、E = 错题、V = 待验证、N = 写这笔的记录、Enter / → = 下一笔、← = 上一笔。
   正在输入（错在哪、新笔记名字）或者有弹层时一律让开 */
function pbTriageKey(e) {
  if (tab !== "playbook" || !pbTriage) return false;
  if (lightboxUrl || editingTrade || editingReview || pbNameModal || tradePreviewId || profileModalOpen) return false;
  const tg = e.target;
  if (tg && (tg.matches("input, textarea, select") || tg.isContentEditable)) return false;
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return false;
  const k = e.key;
  if (k === "Escape") {
    e.preventDefault();
    if (pbTriage.panel) { pbTriage.panel = ""; render(); }
    else { pbTriageSaveNote(); pbTriage = null; render(); }
    return true;
  }
  if (k === "Enter" || k === "ArrowRight") { e.preventDefault(); pbTriageStep(1); return true; }
  if (k === "ArrowLeft") { e.preventDefault(); pbTriageStep(-1); return true; }
  if (pbTriage.i >= pbTriage.ids.length) return false;
  if (/^[0-9]$/.test(k)) {
    e.preventDefault();
    if (k === "0") { pbTriageAssign(PB_NONE); return true; }
    const o = pbAssignOptions()[+k - 1];
    if (o) pbTriageAssign(o.id);
    return true;
  }
  if (k === "s" || k === "S") { e.preventDefault(); pbTriageStar(); return true; }
  if (k === "e" || k === "E") { e.preventDefault(); pbTriageOpenPanel("mistake"); return true; }
  if (k === "v" || k === "V") { e.preventDefault(); pbTriageOpenPanel("verify"); return true; }
  if (k === "n" || k === "N") { e.preventDefault(); pbTriageFocusNote(); return true; }
  return false;
}

/* ============================================================
   交易表单顶上的「模型库」一栏 + 交易预览里的归属
   ============================================================ */
/* 表单里勾的笔记先记在这里，点「保存」、交易存成功之后才写进笔记正文：
   取消表单的话笔记不该被改；新交易在库里还不存在，也不能先写一个指向它的胶囊。
   renderModal 换了一笔交易时清空（见 13 文件里 formDraft 初始化那一行）。 */
let pbFormNotes = null;   // { tradeId, init: Set, sel: Set, texts: { 笔记id: 这笔在这条里的那句话 }, creating: "" | "mistake" | "verify", newName, showAll: {} }
function pbFormNotesState() {
  if (!editingTrade) return null;
  if (!pbFormNotes || pbFormNotes.tradeId !== editingTrade.id) {
    syncReviewBody();
    const bodyOf = (m) => (editingReview && editingReview.id === m.id ? editingReview.body : m.body);
    const init = new Set(pbPages.filter((m) => pbIsNote(m) && extractTradeRefs(bodyOf(m)).includes(editingTrade.id)).map((m) => m.id));
    pbFormNotes = { tradeId: editingTrade.id, init, sel: new Set(init), texts: {}, creating: "", newName: "", showAll: {} };
  }
  return pbFormNotes;
}
const PB_FORM_NOTES_LIMIT = 8;
function pbFormNotesBoxHtml(kind, pageId) {
  const st = pbFormNotesState();
  if (!st) return "";
  const isV = kind === "verify";
  const ro = !!viewingUserId;
  const c = pbNoteCandidates(pageId, kind);
  // 已否定的想法有结论了，不再摆出来让人勾——除非这笔本来就在里面
  const cands = c.own.concat(c.fromSystem, c.global).filter((m) => !pbVerifyRejected(m) || st.sel.has(m.id) || st.init.has(m.id));
  const candIds = new Set(cands.map((m) => m.id));
  // 这笔本来就在里面、或者刚勾上的，就算不在候选里（比如挂在别的策略下）也得列出来，不然没法取消
  const extra = pbSortList(pbNotes(kind).filter((m) => (st.sel.has(m.id) || st.init.has(m.id)) && !candIds.has(m.id)));
  const all = extra.concat(cands);
  if (!all.length) return "";
  const list = st.showAll[kind] ? all : all.filter((m, i) => i < PB_FORM_NOTES_LIMIT || st.sel.has(m.id));
  const page = pbFind(pageId);
  const head = isV
    ? (page ? T("pb.form.verifyHead", { name: pbTitle(page) }) : T("pb.form.verifyHeadGlobal"))
    : (page ? T("pb.form.remind", { name: pbTitle(page) }) : T("pb.form.remindGlobal"));
  return `<div class="pbReminders${isV ? " isVerify" : ""}">
    <div class="pbRemindersHead">${isV ? ICONS.search : ICONS.alert} <span>${esc(head)}</span>${ro ? "" : `<span class="pbRemindersHint">${esc(T("pb.form.checkHint"))}</span>`}</div>
    ${list.map((m) => {
      const on = st.sel.has(m.id);
      const g = pbMistakeGist(m);
      return `<button type="button" class="pbReminder pbFormNote${on ? " on" : ""}" ${ro ? "disabled" : `data-action="pb-form-note" data-id="${esc(m.id)}"`}>
        <span class="pbMpBox">${on ? ICONS.check : ""}</span>
        <span class="pbFormNoteText"><b>${esc(pbTitle(m))}</b>${g ? `<span>${esc(g)}</span>` : ""}</span>
        ${isV ? pbStatusPillHtml(m) : ""}
      </button>${on && !ro && !st.init.has(m.id) ? pbFormNoteTextHtml(m.id, isV) : ""}`;
    }).join("")}
    ${all.length > list.length ? `<button type="button" class="tinyBtn pbFormMore" data-action="pb-form-notes-more" data-kind="${kind}">${esc(T("pb.form.more", { n: all.length }))}</button>` : ""}
  </div>`;
}
/* 刚勾上的每条笔记底下各一个输入框：这笔在这条里的那句话，保存时写成「- [[trade:id]] 那句话」。
   本来就关联着的不出——那句话已经在正文里了，去笔记页改 */
function pbFormNoteTextHtml(id, isV) {
  const v = (pbFormNotes && pbFormNotes.texts[id]) || "";
  return `<input class="input pbFormNoteInput" type="text" data-form-note-text="${esc(id)}" placeholder="${esc(T(isV ? "pb.mp.notePh" : "pb.mp.errPh"))}" value="${esc(v)}" oninput="window.__pbFormNoteTextInput(this)" />`;
}
window.__pbFormNoteTextInput = function (el) { if (pbFormNotes) pbFormNotes.texts[el.dataset.formNoteText] = el.value; };
function pbFormNotesExtraHtml() {
  const st = pbFormNotesState();
  if (!st || viewingUserId) return "";
  let html = "";
  if (st.creating) {
    html += `<div class="pbMpNew pbFormNew">
      <input class="input" id="pbFormNewName" type="text" placeholder="${esc(T("pb.form.newPh." + st.creating))}" value="${esc(st.newName)}"
        oninput="window.__pbFormNotesInput(this,'newName')"
        onkeydown="if(event.key==='Enter'&&!event.isComposing){event.preventDefault();window.__pbFormNotesInput(this,'newName');document.querySelector('[data-action=&quot;pb-form-note-create&quot;]').click();}" />
      <button type="button" class="btn" data-action="pb-form-note-create">${ICONS.plus} ${esc(T("pb.form.create"))}</button>
      <button type="button" class="iconBtn" data-action="pb-form-note-cancel">${ICONS.x}</button>
    </div>`;
  } else {
    html += `<div class="pbFormNewBtns">
      <button type="button" class="tinyBtn" data-action="pb-form-note-new" data-kind="mistake">${ICONS.plus} ${esc(T("pb.form.newMistake"))}</button>
      <button type="button" class="tinyBtn" data-action="pb-form-note-new" data-kind="verify">${ICONS.plus} ${esc(T("pb.form.newVerify"))}</button>
      <button type="button" class="tinyBtn" data-action="pb-form-note-new" data-kind="tag">${ICONS.plus} ${esc(T("pb.form.newTag"))}</button>
    </div>`;
  }
  return html;
}
window.__pbFormNotesInput = function (el, key) { if (pbFormNotes) pbFormNotes[key] = el.value; };

function pbFormBlockInnerHtml() {
  const readOnly = !!viewingUserId;
  const cur = formDraft[PB_KEY] || "";
  const curValid = cur === PB_NONE || pbTradePageId(formDraft) ? cur : "";
  const star = !!formDraft[PB_STAR_KEY];
  const suggest = curValid ? "" : pbSuggestFor(formDraft);
  const pageId = curValid && curValid !== PB_NONE ? curValid : "";
  return `<div class="fieldLabel">${esc(T("pb.form.label"))}</div>
    <div class="pbFormRow">
      <select class="input" data-pb-form-pick ${readOnly ? "disabled" : ""}>
        <option value="" ${curValid ? "" : "selected"}>${esc(T("pb.form.unsorted"))}</option>
        ${pbAssignOptions().map((o) => `<option value="${esc(o.id)}" ${curValid === o.id ? "selected" : ""}>${o.depth ? "　└ " : ""}${esc(o.label)}</option>`).join("")}
        <option value="${PB_NONE}" ${curValid === PB_NONE ? "selected" : ""}>${esc(T("pb.none"))}</option>
      </select>
      <button type="button" class="chip pbFormStar${star ? " active" : ""}" ${readOnly || !pageId ? "disabled" : `data-action="pb-form-star"`}>${star ? ICONS.starFill : ICONS.star} ${esc(T("pb.triage.star"))}</button>
    </div>
    ${suggest && !readOnly ? `<button type="button" class="tinyBtn pbFormSuggest" data-action="pb-form-suggest" data-id="${esc(suggest)}">${esc(T("pb.form.suggest", { name: pbLabel(suggest) }))}</button>` : ""}
    ${(() => { const tl = pbTagChoices(pageId, formDraft); return tl.length ? `<div class="pbFormTags"><span class="pbFormTagsLabel">${esc(T("pb.form.tags"))}</span>${pbTagChipsHtml(tl, pbTradeTagIds(formDraft), "pb-form-tag", readOnly)}</div>` : ""; })()}
    <div class="pbFormNoteWrap">
      <div class="pbFormTagsLabel">${esc(T("pb.form.noteLabel"))}</div>
      <textarea class="input pbFormNoteArea" rows="2" placeholder="${esc(T("pb.note.ph"))}" ${readOnly ? "disabled" : ""}
        oninput="window.__pbFormNoteInput(this)">${esc(formDraft[PB_NOTE_KEY] || "")}</textarea>
    </div>
    ${pbFormNotesBoxHtml("mistake", pageId)}
    ${pbFormNotesBoxHtml("verify", pageId)}
    ${pbFormNotesExtraHtml()}`;
}
/* 交易表单里改归类记录：跟着交易一起存（save-trade 写的就是 formDraft）。空了就把键删掉 */
window.__pbFormNoteInput = function (el) {
  if (!editingTrade || viewingUserId) return;
  if (el.value.trim()) formDraft[PB_NOTE_KEY] = el.value.replace(/\s+$/, ""); else delete formDraft[PB_NOTE_KEY];
  saveDraft();
};
function pbFormNoteToggle(id) {
  const st = pbFormNotesState();
  if (!st || viewingUserId || !pbFind(id)) return;
  const on = !st.sel.has(id);
  if (on) st.sel.add(id); else st.sel.delete(id);
  refreshPbFormBlock();
  if (on && !st.init.has(id)) pbFormFocusNoteText(id);
}
function pbFormFocusNoteText(id) {
  const inp = [...document.querySelectorAll("[data-form-note-text]")].find((x) => x.dataset.formNoteText === id);
  if (inp) inp.focus();
}
/* 表单里现建一条笔记：页面马上建（就是个空模板），「这笔算进去」照样等保存时才写 */
async function pbFormNoteCreate() {
  const st = pbFormNotesState();
  const name = st ? (st.newName || "").trim() : "";
  if (!st || !st.creating || viewingUserId) return;
  if (!name) { const inp = document.getElementById("pbFormNewName"); if (inp) inp.focus(); return; }
  const owner = pbTradePageId(formDraft) || null;
  const m = await pbCreatePage(st.creating, owner, name);
  if (!m) { alert(pbError || T("error.dbOutdated")); return; }
  // 标签直接打在交易上（跟着交易一起存）；笔记记进勾选，保存后再写
  if (m.kind === "tag") { formDraft[PB_TAGS_KEY] = pbTradeTagIds(formDraft).concat(m.id); saveDraft(); }
  else st.sel.add(m.id);
  st.creating = "";
  st.newName = "";
  refreshPbFormBlock();
  if (m.kind !== "tag") pbFormFocusNoteText(m.id);
}
/* save-trade 里、交易存成功之后调：把勾选的变化写进各条笔记 */
async function pbApplyFormNotes(tradeId) {
  const st = pbFormNotes;
  pbFormNotes = null;
  if (!st || st.tradeId !== tradeId || viewingUserId) return;
  const errs = [];
  const apply = async (id, on) => {
    pbError = null;
    const ok = await pbSetTradeInNote(id, tradeId, on, on ? st.texts[id] || "" : "");
    if (!ok && pbError) errs.push(pbError);
  };
  for (const id of st.sel) if (!st.init.has(id)) await apply(id, true);
  for (const id of st.init) if (!st.sel.has(id)) await apply(id, false);
  if (errs.length) alert(errs.join("\n"));
}
/* 只在实盘模式、而且建过模型库页面时出现——没用这个功能的人表单里不该多一栏 */
function pbFormBlockHtml() {
  if (recordMode !== "live" || (!pbHasPages() && !pbPages.some(pbIsChild))) return "";
  return `<div class="field pbFormBlock" id="pbFormBlock">${pbFormBlockInnerHtml()}</div>`;
}
function refreshPbFormBlock() {
  const el = document.getElementById("pbFormBlock");
  if (el) el.innerHTML = pbFormBlockInnerHtml();
}
function pbTradePreviewHtml(t) {
  const pid = pbTradePageId(t);
  const mistakes = pbMistakesWithTrade(t.id);
  const verifies = pbNotesWithTrade(t.id, "verify");
  const tagIds = pbTradeTagIds(t);
  const note = pbTradeNote(t);
  if (!pid && !mistakes.length && !verifies.length && !tagIds.length && !note) return "";
  return `<div class="tpPb">
    ${note ? `<div class="tpPbRow"><span class="tpPbLabel">${esc(T("pb.form.noteLabel"))}</span><span class="tpPbNote">${esc(note)}</span></div>` : ""}
    ${pid ? `<div class="tpPbRow"><span class="tpPbLabel">${esc(T("pb.form.label"))}</span>${pageRefHtml(pid)}${pbTradeStarred(t) ? `<span class="tpPbStar">${ICONS.starFill}</span>` : ""}</div>` : ""}
    ${mistakes.length ? `<div class="tpPbRow"><span class="tpPbLabel">${esc(T("pb.kind.mistake"))}</span>${mistakes.map((m) => pageRefHtml(m.id)).join("")}</div>` : ""}
    ${verifies.length ? `<div class="tpPbRow"><span class="tpPbLabel">${esc(T("pb.kind.verify"))}</span>${verifies.map((m) => pageRefHtml(m.id)).join("")}</div>` : ""}
    ${tagIds.length ? `<div class="tpPbRow"><span class="tpPbLabel">${esc(T("pb.kind.tag"))}</span>${tagIds.map((id) => pageRefHtml(id)).join("")}</div>` : ""}
  </div>`;
}

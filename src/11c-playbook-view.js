/* ============================================================
   模型库（PLAYBOOK）—— 界面

   - 页签「模型库」：交易系统卡片（带衍生策略和各自的成绩）+ 错题库（便利贴墙）
   - 归类模式：一屏一笔，按数字键把旧交易归到某个系统 / 策略，顺手标关注、放进错题
   - 编辑器里的模型库页面：正文还是那个编辑器，正文上面换成属性行，下面挂几栏自动生成的内容
     （衍生策略 / 关注的交易 / 错题集 / 全部交易；错题页是 涉及的交易 / 相关错题）
   - 交易表单顶上的「模型库」一栏：选了策略就把它的错题便利贴摆出来，进场前看一眼

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
function pbShotOf(t) { const shotF = roleField("screenshot"); return shotF ? t[shotF.id] : ""; }
function pbThumbHtml(t, cls) {
  const shot = pbShotOf(t);
  return shot
    ? `<img class="${cls}" src="${esc(imgSrc(shot))}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fallback-url="${esc(imgSrc(shot))}" data-fallback-class="${cls}Empty" onerror="window.__imgFallback(this)" />`
    : `<span class="${cls}Empty">${ICONS.camera}</span>`;
}
/* 截图墙上的一格：点了是交易的只读预览（跟复盘里的交易胶囊一样，读的时候不该一点就进编辑表单） */
function pbTileHtml(t, opts) {
  const o = opts || {};
  return `<div class="pbTile" data-action="open-trade-ref" data-id="${esc(t.id)}">
    <div class="pbTileImg">${pbThumbHtml(t, "pbTileShot")}${pbTradeStarred(t) ? `<span class="pbTileStar">${ICONS.starFill}</span>` : ""}</div>
    <div class="pbTileMeta"><span class="mono">${esc(pbTradeDateOf(t) || "—")}</span>${pbTradeResultBits(t)}</div>
    ${o.showLabel && pbTradeLabel(t) ? `<div class="pbTileSub">${esc(pbTradeLabel(t))}</div>` : ""}
    ${o.note ? `<div class="pbTileNote">${esc(o.note)}</div>` : ""}
  </div>`;
}
/* 便利贴：一条错题。上面是归属，中间标题 + 「怎么规避」那句，底下是出现过几次、最近一次是哪天——
   一眼看得出这个错是不是还在反复犯 */
function pbStickyHtml(m, opts) {
  const o = opts || {};
  const owner = pbMistakeOwner(m);
  const n = pbMistakeTrades(m).length;
  const last = pbMistakeLastDate(m);
  const gist = pbMistakeGist(m);
  return `<div class="pbSticky" data-action="pb-open" data-id="${esc(m.id)}">
    ${o.hideOwner ? "" : `<div class="pbStickyOwner">${esc(owner ? pbLabel(owner.id) : T("pb.globalMistake"))}</div>`}
    <div class="pbStickyTitle">${esc(pbTitle(m))}</div>
    ${gist ? `<div class="pbStickyGist">${esc(gist)}</div>` : `<div class="pbStickyGist muted">${esc(T("pb.sticky.noGist"))}</div>`}
    <div class="pbStickyFoot mono">${esc(n ? T("pb.sticky.count", { n }) : T("pb.sticky.none"))}${last ? ` · ${esc(T("pb.sticky.last", { date: last }))}` : ""}</div>
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
  const own = trades.filter((t) => pbTradePageId(t) === sys.id).length;
  const starred = pbTradesOf(sys.id).filter(pbTradeStarred).length;
  const mistakes = pbMistakesOf(sys.id).length;
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

  const systems = pbSystems();
  const orphans = pbOrphanStrategies();
  if (!systems.length && !orphans.length && !pbMistakes().length) return html + pbEmptyLibraryHtml();

  // 搜索：系统本身或它下面任何一个策略命中，整张卡就留着（命中的策略行会高亮）
  const shownSystems = systems.filter((s) => !q || pbMatchesSearch(s, q) || pbStrategiesOf(s.id).some((x) => pbMatchesSearch(x, q)));
  html += pbSectionHeadHtml(T("pb.section.systems"), shownSystems.length, "", T("pb.section.systemsHint"));
  html += shownSystems.length
    ? `<div class="pbSysGrid">${shownSystems.map((s) => pbSystemCardHtml(s, q)).join("")}</div>`
    : `<div class="pbEmptyLine">${esc(q ? T("pb.emptySearch") : T("pb.noSystems"))}</div>`;
  if (orphans.length) {
    html += `<div class="pbEmptyLine">${esc(T("pb.orphans"))} ${orphans.map((s) => `<button class="pageRef kind-strategy" data-action="pb-open" data-id="${esc(s.id)}"><span class="pageRefMeta">${esc(pbTitle(s))}</span></button>`).join(" ")}</div>`;
  }

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
  if (d.kind === "mistake") {
    const cur = pbMistakeOwner(d) ? d.parent_id : "";
    return `<label class="pbMetaField"><span>${esc(T("pb.meta.mistakeOf"))}</span>
      <select class="select" data-pb-parent>
        <option value="" ${cur ? "" : "selected"}>${esc(T("pb.globalMistake"))}</option>
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
  const n = d.kind === "mistake" ? 0 : trades.filter((t) => t[PB_KEY] === d.id).length;
  const m = d.kind === "mistake" ? 0 : pbPages.filter((x) => x.kind === "mistake" && x.parent_id === d.id).length;
  const bits = [];
  if (n) bits.push(T(d.kind === "strategy" ? "pb.deleteTradesUp" : "pb.deleteTradesClear", { n }));
  if (m) bits.push(T(d.kind === "strategy" ? "pb.deleteMistakesUp" : "pb.deleteMistakesGlobal", { n: m }));
  return `<span class="pbDelConfirm"><span>${esc(T("pb.deleteConfirm"))}${bits.length ? " " + esc(bits.join("；")) : ""}</span>
    <button class="btn btn-danger" data-action="pb-confirm-delete" data-id="${esc(d.id)}">${esc(T("common.delete"))}</button>
    <button class="tinyBtn" data-action="pb-cancel-delete">${esc(T("common.cancel"))}</button></span>`;
}
function pbMetaRowInnerHtml() {
  const d = editingReview;
  let stats = "";
  if (d.kind === "mistake") {
    const n = pbMistakeTrades(d).length;
    const last = pbMistakeLastDate(d);
    stats = `<span class="pbStat"><b class="mono">${n}</b> ${esc(T("pb.stat.occurrences"))}</span>${last ? `<span class="pbStat">${esc(T("pb.sticky.last", { date: last }))}</span>` : ""}`;
  } else if (recordMode === "live") {
    stats = pbStatsHtml(pbStats(pbTradesOf(d.id)));
  }
  return `${pbKindBadge(d.kind)}
    ${pbParentSelectHtml(d)}
    <span class="pbMetaStats">${stats}</span>
    <span class="pbMetaRight">${pbDeleteControlHtml(d)}</span>`;
}

function pbTradeRowHtml(t, opts) {
  const o = opts || {};
  const modelF = roleField("model");
  const tag = modelF ? t[modelF.id] : "";
  const tagTxt = Array.isArray(tag) ? tag.join(", ") : (tag || "");
  const mistakes = pbMistakesWithTrade(t.id);
  const ro = !!viewingUserId;
  return `<div class="pbTradeRow">
    <button class="pbStarBtn${pbTradeStarred(t) ? " on" : ""}" ${ro ? "disabled" : `data-action="pb-star" data-id="${esc(t.id)}"`} title="${esc(T("pb.starTitle"))}">${pbTradeStarred(t) ? ICONS.starFill : ICONS.star}</button>
    <div class="pbTradeRowMain" data-action="open-trade-ref" data-id="${esc(t.id)}">
      ${pbThumbHtml(t, "pbRowShot")}
      <span class="mono pbRowDate">${esc(pbTradeDateOf(t) || "—")}</span>
      ${o.showLabel ? `<span class="pbRowLabel">${esc(pbTradeLabel(t))}</span>` : ""}
      ${tagTxt ? `<span class="pbRowTag">${esc(tagTxt)}</span>` : ""}
      ${pbIsFaded(t) ? `<span class="pbRowFaded">${esc(T("pb.faded"))}</span>` : ""}
      <span class="pbRowSpacer"></span>
      ${mistakes.length ? `<span class="pbRowMistake" title="${esc(mistakes.map(pbTitle).join(" / "))}">${esc(T("pb.inMistakes", { n: mistakes.length }))}</span>` : ""}
      ${pbTradeResultBits(t)}
    </div>
  </div>`;
}
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
              <div class="pbStratCardFoot mono">${ICONS.star} ${pbTradesOf(s.id).filter(pbTradeStarred).length} · ${esc(T("pb.foot.mistakes", { n: pbMistakesOf(s.id).length }))}</div>
            </div>`;
          }).join("")}</div>`
        : `<div class="pbEmptyLine">${esc(T("pb.noStrategiesLong"))}</div>`}
    </section>`;
  }
  const mistakes = pbMistakesOf(d.id);
  const list = recordMode === "live" ? pbTradesOf(d.id) : [];
  const starred = list.filter(pbTradeStarred);
  const showLabel = d.kind === "system";

  html += `<section class="pbPanel">${pbSectionHeadHtml(T("pb.section.mistakes"), mistakes.length, pbAddBtn("mistake", d.id, "pb.addMistake"), T("pb.section.mistakesHint"))}
    ${mistakes.length
      ? `<div class="pbStickyGrid">${mistakes.map((m) => pbStickyHtml(m, { hideOwner: m.parent_id === d.id })).join("")}</div>`
      : `<div class="pbEmptyLine">${esc(T("pb.noMistakesHere"))}</div>`}
  </section>`;

  if (recordMode !== "live") return html + pbBacktestNote();

  html += `<section class="pbPanel">${pbSectionHeadHtml(T("pb.section.starred"), starred.length, "", T("pb.section.starredHint"))}
    ${starred.length
      ? `<div class="pbTileGrid">${starred.map((t) => pbTileHtml(t, { showLabel })).join("")}</div>`
      : `<div class="pbEmptyLine">${esc(T("pb.noStarred"))}</div>`}
  </section>`;

  const shown = pbShowAllTrades ? list : list.slice(0, PB_TRADES_PREVIEW);
  const triageBtn = viewingUserId || !pbUnsortedCount() ? "" : `<button class="tinyBtn pbAddBtn" data-action="pb-triage-start" data-scope="unsorted">${ICONS.grid} ${esc(T("pb.triage.more", { n: pbUnsortedCount() }))}</button>`;
  html += `<section class="pbPanel">${pbSectionHeadHtml(T("pb.section.trades"), list.length, triageBtn, showLabel ? T("pb.section.tradesHintSystem") : "")}
    ${list.length
      ? `<div class="pbTradeList">${shown.map((t) => pbTradeRowHtml(t, { showLabel })).join("")}</div>
         ${list.length > shown.length ? `<button class="btn pbShowAll" data-action="pb-show-all-trades">${esc(T("pb.showAllTrades", { n: list.length }))}</button>` : ""}`
      : `<div class="pbEmptyLine">${esc(T("pb.noTradesLong"))}</div>`}
  </section>`;
  return html;
}
function pbPanelsForMistakeHtml(d) {
  let html = "";
  const list = pbMistakeTrades(d);
  html += `<section class="pbPanel">${pbSectionHeadHtml(T("pb.section.mistakeTrades"), list.length, "", T("pb.section.mistakeTradesHint"))}
    ${list.length
      ? `<div class="pbTileGrid">${list.map((t) => pbTileHtml(t, { showLabel: true, note: pbMistakeLineNote(d.body, t.id) })).join("")}</div>`
      : `<div class="pbEmptyLine">${esc(recordMode === "live" ? T("pb.noMistakeTrades") : T("pb.backtestNote"))}</div>`}
  </section>`;
  // 相关错题：这一条正文里链到的，加上别的错题里链到这一条的——两个方向都算「有关系」
  const outIds = extractPageRefs(d.body);
  const related = pbSortList(pbMistakes().filter((m) => m.id !== d.id && (outIds.includes(m.id) || extractPageRefs(m.body).includes(d.id))));
  const mentionedIn = sortReviewsForDisplay(reviews.filter((r) => extractPageRefs(r.body).includes(d.id)));
  html += `<section class="pbPanel">${pbSectionHeadHtml(T("pb.section.related"), related.length, "", T("pb.section.relatedHint"))}
    ${related.length
      ? `<div class="pbStickyGrid">${related.map((m) => pbStickyHtml(m)).join("")}</div>`
      : `<div class="pbEmptyLine">${esc(T("pb.noRelated"))}</div>`}
    ${mentionedIn.length ? `<div class="pbMentioned"><span>${esc(T("pb.mentionedIn"))}</span>${mentionedIn.map((r) => pageRefHtml(r.id)).join("")}</div>` : ""}
  </section>`;
  return html;
}
function pbPanelsHtml() {
  const d = editingReview;
  if (!isPbDoc(d)) return "";
  if (d._isNew) return "";
  return d.kind === "mistake" ? pbPanelsForMistakeHtml(d) : pbPanelsForPageHtml(d);
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
/* 一笔交易进 / 出一条错题：改的是错题正文里那一行列表项 */
async function pbToggleTradeInMistake(mistakeId, tradeId, note) {
  const m = pbFind(mistakeId);
  if (!m || viewingUserId) return false;
  // 这条错题正开在编辑器里的话，正文以编辑器为准，这里不去改它（不会发生：归类模式下编辑器是关着的）
  if (editingReview && editingReview.id === mistakeId) return false;
  let body;
  if (pbMistakeTradeIds(m).includes(tradeId)) {
    const r = pbRemoveTradeFromBody(m.body, tradeId);
    if (!r.removed || r.stillLinked) { pbError = T("pb.err.inlineRef", { title: pbTitle(m) }); render(); return false; }
    body = r.body;
  } else {
    body = pbAppendTradeToBody(m.body, tradeId, note);
  }
  const ok = await persistPbPage({ ...m, body });
  render();
  return ok;
}

/* ============================================================
   归类模式
   ============================================================ */
function pbTriageQueue(scope) {
  const list = trades.filter((t) => scope === "all" || pbTradeIsUnsorted(t));
  return pbSortTradesDesc(list).map((t) => t.id);
}
function startPbTriage(scope) {
  if (viewingUserId || recordMode !== "live") return;
  const sc = scope === "all" ? "all" : "unsorted";
  pbTriage = { ids: pbTriageQueue(sc), i: 0, scope: sc, mistakeOpen: false, errText: "", newMistake: "", done: new Set(), starred: 0, mistakes: 0 };
  window.scrollTo({ top: 0 });
}
function pbTriageCurrent() {
  if (!pbTriage) return null;
  return trades.find((t) => t.id === pbTriage.ids[pbTriage.i]) || null;
}
function pbTriageStep(delta) {
  if (!pbTriage) return;
  pbTriage.i = Math.max(0, Math.min(pbTriage.ids.length, pbTriage.i + delta));
  pbTriage.mistakeOpen = false;
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
async function pbTriageToggleMistake(mistakeId) {
  const t = pbTriageCurrent();
  if (!t) return;
  const m = pbFind(mistakeId);
  const adding = m && !pbMistakeTradeIds(m).includes(t.id);
  const ok = await pbToggleTradeInMistake(mistakeId, t.id, pbTriage.errText);
  if (ok && adding) { pbTriage.mistakes++; pbTriage.errText = ""; pbTriage.done.add(t.id); }
  render();
}
async function pbTriageNewMistake() {
  const t = pbTriageCurrent();
  const name = (pbTriage.newMistake || "").trim();
  if (!t || !name) return;
  // 新错题挂在这笔交易归到的那一页下面；还没归类就先当通用错题
  const owner = pbTradePageId(t) || null;
  const body = pbAppendTradeToBody(pbTemplateBody("mistake"), t.id, pbTriage.errText);
  const m = await pbCreatePage("mistake", owner, name, body);
  if (m) { pbTriage.newMistake = ""; pbTriage.errText = ""; pbTriage.mistakes++; pbTriage.done.add(t.id); }
  render();
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
    if (!f || f.id === VF_PLAYBOOK || (modelF && f.id === modelF.id)) return;
    let v = tradeFieldValue(t, f);
    if (Array.isArray(v)) v = v.join(", ");
    if (v === undefined || v === null || String(v).trim() === "") return;
    rows.push({ label: f.label, text: String(v), long: f.type === "textarea" || String(v).length > 40 });
  });
  return rows.map((r) => `<div class="focusField${r.long ? " isLong" : ""}"><div class="focusFieldLabel">${esc(r.label)}</div><div class="focusFieldVal">${esc(r.text)}</div></div>`).join("");
}
function pbTriageMistakePanelHtml(t) {
  const pageId = pbTradePageId(t);
  const c = pbMistakeCandidates(pageId);
  const has = (m) => pbMistakeTradeIds(m).includes(t.id);
  const group = (label, list) => list.length ? `<div class="pbMpGroup">${esc(label)}</div>` + list.map((m) => `<button class="pbMpRow${has(m) ? " on" : ""}" data-action="pb-triage-toggle-mistake" data-id="${esc(m.id)}">
      <span class="pbMpBox">${has(m) ? ICONS.check : ""}</span>
      <span class="pbMpTitle">${esc(pbTitle(m))}</span>
      <span class="pbMpN mono">${pbMistakeTrades(m).length}</span>
    </button>`).join("") : "";
  const page = pbFind(pageId);
  const sys = page && page.kind === "strategy" ? pbFind(page.parent_id) : null;
  const body = group(page ? T("pb.mp.ofPage", { name: pbTitle(page) }) : "", c.own)
    + group(sys ? T("pb.mp.ofPage", { name: pbTitle(sys) }) : "", c.fromSystem)
    + group(T("pb.globalMistake"), c.global);
  return `<div class="pbMp">
    <input class="input" id="pbErrText" type="text" placeholder="${esc(T("pb.mp.errPh"))}" value="${esc(pbTriage.errText)}" oninput="window.__pbTriageInput(this,'errText')" />
    ${body || `<div class="pbEmptyLine">${esc(T("pb.mp.empty"))}</div>`}
    <div class="pbMpNew">
      <input class="input" type="text" placeholder="${esc(page ? T("pb.mp.newPh", { name: pbTitle(page) }) : T("pb.mp.newPhGlobal"))}" value="${esc(pbTriage.newMistake)}"
        oninput="window.__pbTriageInput(this,'newMistake')"
        onkeydown="if(event.key==='Enter'&&!event.isComposing){event.preventDefault();window.__pbTriageInput(this,'newMistake');document.querySelector('[data-action=&quot;pb-triage-new-mistake&quot;]').click();}" />
      <button class="btn" data-action="pb-triage-new-mistake">${ICONS.plus} ${esc(T("pb.mp.create"))}</button>
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
  </div>`;
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
          ${pbIsFaded(t) ? `<span class="pbRowFaded">${esc(T("pb.faded"))}</span>` : ""}
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
      <div class="pbTriageBlock">
        <div class="pbToggleRow">
          <button class="pbToggle${starOn ? " on" : ""}" data-action="pb-triage-star" ${canStar ? "" : `disabled title="${esc(T("pb.triage.starNeedsPage"))}"`}>
            <kbd>S</kbd>${starOn ? ICONS.starFill : ICONS.star}<span>${esc(T("pb.triage.star"))}</span>
          </button>
          <button class="pbToggle${pbTriage.mistakeOpen ? " open" : ""}${inMistakes.length ? " on" : ""}" data-action="pb-triage-mistake">
            <kbd>E</kbd>${ICONS.alert}<span>${esc(inMistakes.length ? T("pb.triage.inMistakes", { n: inMistakes.length }) : T("pb.triage.addMistake"))}</span>
          </button>
        </div>
        ${pbTriage.mistakeOpen ? pbTriageMistakePanelHtml(t) : ""}
      </div>
      <div class="pbTriageNav">
        <button class="btn" data-action="pb-triage-prev" ${pbTriage.i === 0 ? "disabled" : ""}><kbd>←</kbd> ${esc(T("pb.triage.prev"))}</button>
        <button class="btn btn-primary" data-action="pb-triage-next">${esc(T("pb.triage.next"))} <kbd>Enter</kbd></button>
      </div>
    </div>
  </div>`;
}
/* 归类模式的键盘：数字 = 归到第几项（0 = 不属于任何模型）、S = 关注、E = 错题、Enter / → = 下一笔、← = 上一笔。
   正在输入（错在哪、新错题名字）或者有弹层时一律让开 */
function pbTriageKey(e) {
  if (tab !== "playbook" || !pbTriage) return false;
  if (lightboxUrl || editingTrade || editingReview || pbNameModal || tradePreviewId || profileModalOpen) return false;
  const tg = e.target;
  if (tg && (tg.matches("input, textarea, select") || tg.isContentEditable)) return false;
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return false;
  const k = e.key;
  if (k === "Escape") {
    e.preventDefault();
    if (pbTriage.mistakeOpen) { pbTriage.mistakeOpen = false; render(); }
    else { pbTriage = null; render(); }
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
  if (k === "e" || k === "E") {
    e.preventDefault();
    pbTriage.mistakeOpen = !pbTriage.mistakeOpen;
    render();
    if (pbTriage.mistakeOpen) { const inp = document.getElementById("pbErrText"); if (inp) inp.focus(); }
    return true;
  }
  return false;
}

/* ============================================================
   交易表单顶上的「模型库」一栏 + 交易预览里的归属
   ============================================================ */
function pbFormBlockInnerHtml() {
  const readOnly = !!viewingUserId;
  const cur = formDraft[PB_KEY] || "";
  const curValid = cur === PB_NONE || pbTradePageId(formDraft) ? cur : "";
  const star = !!formDraft[PB_STAR_KEY];
  const suggest = curValid ? "" : pbSuggestFor(formDraft);
  let reminders = "";
  const pageId = curValid && curValid !== PB_NONE ? curValid : "";
  if (pageId) {
    const c = pbMistakeCandidates(pageId);
    const list = c.own.concat(c.fromSystem, c.global).slice(0, 8);
    if (list.length) {
      reminders = `<div class="pbReminders">
        <div class="pbRemindersHead">${ICONS.alert} ${esc(T("pb.form.remind", { name: pbTitle(pbFind(pageId)) }))}</div>
        ${list.map((m) => { const g = pbMistakeGist(m); return `<div class="pbReminder"><b>${esc(pbTitle(m))}</b>${g ? `<span>${esc(g)}</span>` : ""}</div>`; }).join("")}
      </div>`;
    }
  }
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
    ${reminders}`;
}
/* 只在实盘模式、而且建过模型库页面时出现——没用这个功能的人表单里不该多一栏 */
function pbFormBlockHtml() {
  if (recordMode !== "live" || !pbHasPages()) return "";
  return `<div class="field pbFormBlock" id="pbFormBlock">${pbFormBlockInnerHtml()}</div>`;
}
function refreshPbFormBlock() {
  const el = document.getElementById("pbFormBlock");
  if (el) el.innerHTML = pbFormBlockInnerHtml();
}
function pbTradePreviewHtml(t) {
  const pid = pbTradePageId(t);
  const mistakes = pbMistakesWithTrade(t.id);
  if (!pid && !mistakes.length) return "";
  return `<div class="tpPb">
    ${pid ? `<div class="tpPbRow"><span class="tpPbLabel">${esc(T("pb.form.label"))}</span>${pageRefHtml(pid)}${pbTradeStarred(t) ? `<span class="tpPbStar">${ICONS.starFill}</span>` : ""}</div>` : ""}
    ${mistakes.length ? `<div class="tpPbRow"><span class="tpPbLabel">${esc(T("pb.kind.mistake"))}</span>${mistakes.map((m) => pageRefHtml(m.id)).join("")}</div>` : ""}
  </div>`;
}

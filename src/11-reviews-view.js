/* ============================================================
   RENDER — 复盘（REVIEWS）

   只在实盘模式下出现（TABS 里按 recordMode 判断），所以这一整块都不用管
   回测那份数据，trades 里就是实盘那批。

   ⚠️ 编辑器不在 #app 里，它有自己的根节点 #reviewEditorRoot，
   靠 reviewEditorRenderedFor 守卫防止背景 render() 把正在写的长文冲掉，
   跟 renderModal 的 modalRenderedForId 是同一个套路。
   ============================================================ */

/* 周一那天。日历页 app.js 里也是周一开头，这里保持一致 */
function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function toDateStr(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function thisMondayStr() { return toDateStr(mondayOf(new Date())); }
function todayStr() { return toDateStr(new Date()); }
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateStr(d);
}
/* 用户在周模式下随手挑了个周三，也要归到那一周的周一去——
   week_start 这个名字就意味着它必须是周一，不然筛选和显示都会对不上 */
function mondayOfStr(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d.getTime()) ? "" : toDateStr(mondayOf(d));
}

/* 一篇复盘关联到什么：'day' / 'week' / ''（自由帖）。
   day_date 优先——两个都填了（理论上不会，切换时会清另一个）也有确定的落点 */
function reviewPeriodKind(r) {
  if (r && r.day_date) return "day";
  if (r && r.week_start) return "week";
  return "";
}
/* 卡片和只读态上那枚标签 */
function reviewPeriodTagText(r) {
  const kind = reviewPeriodKind(r);
  if (kind === "day") return r.day_date;
  if (kind === "week") return T("review.weekOf", { date: r.week_start });
  return T("review.freePost");
}
function lastMondayStr() {
  const m = mondayOf(new Date());
  m.setDate(m.getDate() - 7);
  return toDateStr(m);
}
function fmtReviewTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(localeTag(), { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function reviewTitleOf(r) { return (r.title || "").trim() || T("review.untitled"); }

function reviewMatchesSearch(r, q) {
  const s = (q || "").trim().toLowerCase();
  if (!s) return true;
  return ((r.title || "") + " " + (r.body || "")).toLowerCase().includes(s);
}

/* 一张复盘卡片。分组区块和搜索结果都用它，靠 showGroup 决定要不要标出所属分组 */
function renderReviewCard(r, showGroup) {
  const readOnly = !!viewingUserId;
  const confirming = reviewConfirmDeleteId === r.id;
  const excerpt = mdPlainExcerpt(r.body, 180);
  const linked = (r.linked_trade_ids || []).length;
  const gid = reviewEffectiveGroupId(r);
  const g = gid ? findReviewGroup(gid) : null;
  const dragAttrs = readOnly ? "" : `draggable="true"`;
  return `<div class="reviewCard" ${dragAttrs} data-review-id="${esc(r.id)}" data-action="open-review" data-id="${esc(r.id)}">
    <div class="reviewCardHead">
      <div class="reviewCardTitle display">${esc(reviewTitleOf(r))}</div>
      ${readOnly ? "" : (!confirming
        ? `<button class="tinyBtn reviewCardDel" data-action="ask-delete-review" data-id="${esc(r.id)}" title="${esc(T("review.deleteThis"))}">${ICONS.trash}</button>`
        : `<span class="reviewCardDelConfirm">
            <button class="tinyBtn" data-action="confirm-delete-review" data-id="${esc(r.id)}" style="color:var(--neg);">✓</button>
            <button class="tinyBtn" data-action="cancel-delete-review">${ICONS.x}</button>
          </span>`)}
    </div>
    <div class="reviewCardMeta mono">
      <span class="reviewWeekTag ${reviewPeriodKind(r) ? "on" : ""}">${esc(reviewPeriodTagText(r))}</span>
      <span>${esc(T("review.edited", { time: fmtReviewTime(r.updated_at || r.created_at) }))}</span>
      ${linked ? `<span class="reviewLinkTag">${ICONS.grid} ${esc(T("review.linkedTrades", { n: linked }))}</span>` : ""}
      ${showGroup && g ? `<span class="reviewInGroupTag">${esc(T("reviewGroup.inGroup", { name: g.name || T("reviewGroup.ungrouped") }))}</span>` : ""}
    </div>
    ${excerpt ? `<div class="reviewCardExcerpt">${esc(excerpt)}</div>` : ""}
  </div>`;
}

function renderReviewGroupDeleteConfirm(groupId) {
  if (reviewGroupConfirmDeleteId !== groupId) return "";
  const g = findReviewGroup(groupId);
  if (!g) return "";
  const n = reviews.filter((r) => reviewEffectiveGroupId(r) === groupId).length;
  const warn = n ? T("reviewGroup.cascadeKeep", { n }) : T("reviewGroup.cascadeEmpty");
  return `<div class="reviewGroupConfirm">
    ${esc(T("reviewGroup.confirmDelete", { name: g.name || T("reviewGroup.ungrouped"), warn }))}
    <button class="btn btn-danger" data-action="confirm-delete-review-group" data-group-id="${esc(groupId)}">${T("common.delete")}</button>
    <button class="btn" data-action="cancel-delete-review-group">${T("common.cancel")}</button>
  </div>`;
}

/* 一个分组区块。未分组那个桶复用同一套外壳，只是没有改名/删除/拖拽 */
function renderReviewGroupSection(gid, name, list, isUngrouped) {
  const readOnly = !!viewingUserId;
  const key = reviewGroupCollapseKey(gid);
  const collapsed = collapsedReviewGroups.has(key);
  const dragAttrs = (readOnly || isUngrouped) ? "" : `draggable="true"`;
  return `<div class="reviewGroupSection" data-group-drop="${esc(gid)}">
    <div class="reviewGroupHeader" ${dragAttrs} data-group-id="${esc(gid)}"
      data-action="toggle-review-group-collapse" data-gid="${esc(gid)}">
      <span class="reviewGroupChev">${collapsed ? ICONS.chevDown : ICONS.chevUp}</span>
      <span class="reviewGroupName ${isUngrouped ? "muted" : ""}">${esc(name)}</span>
      <span class="reviewGroupCount mono">${esc(T("reviewGroup.count", { n: list.length }))}</span>
      ${readOnly ? "" : `<span class="reviewGroupActions">
        <button class="tinyBtn" data-action="new-review-in-group" data-group-id="${esc(isUngrouped ? "" : gid)}">${ICONS.plus} ${T("reviewGroup.newHere")}</button>
        ${isUngrouped ? "" : `<button class="tinyBtn" data-action="rename-review-group" data-group-id="${esc(gid)}">${T("reviewGroup.rename")}</button>
        <button class="tinyBtn" data-action="ask-delete-review-group" data-group-id="${esc(gid)}" style="color:var(--neg);">${T("common.delete")}</button>`}
      </span>`}
    </div>
    ${renderReviewGroupDeleteConfirm(gid)}
    ${collapsed ? "" : (list.length
      ? `<div class="reviewList">${list.map((r) => renderReviewCard(r, false)).join("")}</div>`
      : `<div class="reviewGroupEmpty">${esc(isUngrouped ? T("reviewGroup.dropHintUngrouped") : T("reviewGroup.dropHint"))}</div>`)}
  </div>`;
}

function renderReviews() {
  const readOnly = !!viewingUserId;
  const groups = reviewGroups();
  // 进了复盘页多半要打开某一篇：趁这会儿在后台把编辑器的库拉下来，点开时就是秒开
  if (!readOnly && !tiptapLib) loadTiptap().catch(() => {});

  let html = `<div class="reviewTop">
    ${readOnly ? "" : `<button class="btn btn-primary" data-action="new-review">${ICONS.plus} ${T("review.new")}</button>
    <button class="btn" data-action="add-review-group">${ICONS.plus} ${T("reviewGroup.new")}</button>`}
    <div class="reviewSearchBox">
      ${ICONS.search}
      <input class="input reviewSearchInput" type="text" placeholder="${esc(T("review.searchPlaceholder"))}"
        value="${esc(reviewSearch)}" data-action="review-search-input" />
    </div>
    <div class="reviewCount mono">${esc(T("review.count", { n: reviews.length }))}</div>
  </div>`;

  if (reviewPrefsError) {
    html += `<div class="notice error" style="margin-bottom:16px;">${ICONS.alert}<span>${esc(reviewPrefsError)}</span></div>`;
  }

  // 搜索时拍平成一个列表：结果藏在折叠的分组里会让人以为没搜到
  if (reviewSearch.trim()) {
    const hits = sortReviewsForDisplay(reviews.filter((r) => reviewMatchesSearch(r, reviewSearch)));
    if (!hits.length) return html + `<div class="notice">${ICONS.alert}<span>${esc(T("review.emptySearch"))}</span></div>`;
    return html + `<div class="reviewSearchNote">${esc(T("reviewGroup.searchFlat"))}</div>`
      + `<div class="reviewList">${hits.map((r) => renderReviewCard(r, true)).join("")}</div>`;
  }

  if (!reviews.length && !groups.length) {
    return html + `<div class="notice">${ICONS.alert}<span>${esc(T("review.empty"))}</span></div>`;
  }

  const byGroup = {};
  reviews.forEach((r) => { const gid = reviewEffectiveGroupId(r); (byGroup[gid] = byGroup[gid] || []).push(r); });
  groups.forEach((g) => {
    html += renderReviewGroupSection(g.id, g.name || T("reviewGroup.ungrouped"), sortReviewsForDisplay(byGroup[g.id] || []), false);
  });
  html += renderReviewGroupSection("__ungrouped__", T("reviewGroup.ungrouped"), sortReviewsForDisplay(byGroup[""] || []), true);
  return html;
}


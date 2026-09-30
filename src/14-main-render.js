/* ============================================================
   MAIN RENDER
   ============================================================ */
function renderAuthScreen() {
  const isRegister = authScreenMode === "register";
  return `
  <div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:auto;padding:40px 16px;">
    <div style="max-width:380px;width:100%;">
      <div class="brand" style="text-align:center;margin-bottom:28px;"><span class="accent">IFVG</span> Trade Journal</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;">
        <div style="display:flex;gap:6px;margin-bottom:18px;">
          <button class="btn ${!isRegister ? "btn-primary" : ""}" style="flex:1;" data-action="auth-mode" data-mode="login">${T("auth.login")}</button>
          <button class="btn ${isRegister ? "btn-primary" : ""}" style="flex:1;" data-action="auth-mode" data-mode="register">${T("auth.register")}</button>
        </div>
        <div class="field"><div class="fieldLabel">${T("auth.email")}</div><input class="input" type="email" id="authEmail" autocomplete="username" /></div>
        <div class="field"><div class="fieldLabel">${T("auth.password")}</div><input class="input" type="password" id="authPassword" autocomplete="${isRegister ? "new-password" : "current-password"}" /></div>
        ${!isRegister ? `<label style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--muted);margin-bottom:14px;cursor:pointer;">
          <input type="checkbox" id="rememberMeCheck" checked style="width:14px;height:14px;" />${T("auth.rememberMe")}
        </label>` : ""}
        ${isRegister ? `<div style="font-size:12px;color:var(--mutedDark);margin-bottom:12px;line-height:1.6;">${T("auth.newAccountLangHint")}</div>` : ""}
        ${authError ? `<div style="font-size:12.5px;color:var(--neg);margin-bottom:12px;line-height:1.6;">${esc(authError)}</div>` : ""}
        ${authSuccess ? `<div style="font-size:12.5px;color:var(--pos);margin-bottom:12px;line-height:1.6;">${esc(authSuccess)}</div>` : ""}
        <button class="btn btn-primary" style="width:100%;justify-content:center;" data-action="auth-submit" ${authBusy ? "disabled" : ""}>
          ${authBusy ? T("common.processing") : isRegister ? T("auth.register") : T("auth.login")}
        </button>
      </div>
      <div style="display:flex;justify-content:center;margin-top:20px;">${langToggleHtml()}</div>
    </div>
  </div>`;
}
/* 语言切换控件：登录页和个人设置弹窗共用同一段 HTML */
function langToggleHtml() {
  return `<div class="modeToggle" title="${esc(T("lang.switchTitle"))}">
    ${I18N_LANGS.map((L) => `<button class="modeBtn ${lang === L ? "active" : ""}" data-action="set-lang" data-lang="${L}">${esc(T("lang." + L))}</button>`).join("")}
  </div>`;
}
function renderDisabledScreen() {
  return `<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:auto;padding:40px 16px;">
    <div style="max-width:380px;width:100%;text-align:center;">
      <div class="notice error" style="justify-content:center;">${ICONS.alert}<span>${T("auth.disabled")}</span></div>
      <button class="btn" style="margin-top:16px;" data-action="logout">${T("auth.logout")}</button>
    </div>
  </div>`;
}
function profileModalHtml() {
  const p = currentProfile || {};
  profileGenderDraft = p.gender || null;
  return `<div class="overlay">
    <div class="modal" style="max-width:420px;">
      <div class="modalHead"><div class="display" style="font-size:17px;font-weight:600;">${T("header.profile")}</div>
        <button class="iconBtn" data-action="close-profile-modal">${ICONS.x}</button></div>
      <div class="modalBody">
        <div class="field"><div class="fieldLabel">${esc(T("lang.label"))}</div>
          ${langToggleHtml()}
          <div style="font-size:11px;color:var(--mutedDark);margin-top:6px;line-height:1.5;">${esc(T("lang.hintShort"))}</div>
        </div>
        <div style="border-top:1px solid var(--border);margin:16px 0;"></div>
        <div class="field"><div class="fieldLabel">${T("profile.displayName")}</div>
          <input class="input" id="profileNameInput" value="${esc(p.display_name || "")}" placeholder="${esc(T("profile.namePlaceholder"))}" /></div>
        <div class="field"><div class="fieldLabel">${T("profile.gender")}</div>
          <div class="chipGroup">
            <button type="button" class="chip ${p.gender === "男" ? "active" : ""}" data-action="set-gender-draft" data-val="男">${esc(T("profile.male"))}</button>
            <button type="button" class="chip ${p.gender === "女" ? "active" : ""}" data-action="set-gender-draft" data-val="女">${esc(T("profile.female"))}</button>
          </div>
        </div>
        ${profileError ? `<div style="font-size:12.5px;color:var(--neg);margin-bottom:10px;">${esc(profileError)}</div>` : ""}
        ${profileSuccess ? `<div style="font-size:12.5px;color:var(--pos);margin-bottom:10px;">${esc(profileSuccess)}</div>` : ""}
        <button class="btn btn-primary" data-action="save-profile" ${profileBusy ? "disabled" : ""}>${profileBusy ? T("common.saving") : T("common.save")}</button>

        <div style="border-top:1px solid var(--border);margin:22px 0 16px;"></div>
        <div class="sectionLabel">⟦ ${esc(T("password.title"))} ⟧</div>
        <div class="field"><div class="fieldLabel">${T("password.current")}</div><input class="input" type="password" id="pwCurrentInput" autocomplete="current-password" /></div>
        <div class="field"><div class="fieldLabel">${T("password.new")}</div><input class="input" type="password" id="pwNewInput" autocomplete="new-password" /></div>
        <div class="field"><div class="fieldLabel">${T("password.confirm")}</div><input class="input" type="password" id="pwConfirmInput" autocomplete="new-password" /></div>
        ${passwordError ? `<div style="font-size:12.5px;color:var(--neg);margin-bottom:10px;">${esc(passwordError)}</div>` : ""}
        ${passwordSuccess ? `<div style="font-size:12.5px;color:var(--pos);margin-bottom:10px;">${esc(passwordSuccess)}</div>` : ""}
        <button class="btn btn-primary" data-action="save-password" ${passwordBusy ? "disabled" : ""}>${passwordBusy ? T("common.processing") : T("password.title")}</button>
      </div>
    </div>
  </div>`;
}
let profileGenderDraft = null;
function lightboxHtml() {
  const nav = lightboxNav;
  const navHtml = nav ? `
    <button class="lbNav lbPrev" data-action="lightbox-prev" ${nav.index === 0 ? "disabled" : ""} title="${esc(T("lightbox.prev"))}">‹</button>
    <button class="lbNav lbNext" data-action="lightbox-next" ${nav.index === nav.urls.length - 1 ? "disabled" : ""} title="${esc(T("lightbox.next"))}">›</button>
    <div class="lbCount mono">${nav.index + 1} / ${nav.urls.length} · ${esc(T("lightbox.hint"))}</div>` : "";
  // 有翻页时两侧留出按钮的位置，宽图铺满也不会压在按钮底下
  return `<div class="overlay${nav ? " lbHasNav" : ""}" data-action="close-lightbox"${nav ? "" : ' style="padding:30px;"'}>
    <img src="${esc(lightboxUrl)}" referrerpolicy="no-referrer" style="max-width:100%;max-height:100%;border-radius:10px;display:block;" onclick="event.stopPropagation()" />
    <button class="iconBtn" data-action="close-lightbox" style="position:absolute;top:20px;right:24px;background:rgba(0,0,0,.5);color:#fff;">${ICONS.x}</button>
    ${navHtml}
  </div>`;
}

/* ---------- 看大图：←/→ 翻图，背后的页面跟着对齐 ----------
   打开时把「同一处」能看大图的图收成一个列表：记录页 = 当前这一页（看图模式 / 卡片 / 表格），
   复盘 = 这篇正文，弹窗 = 那个弹窗（当日明细之类）。←/→ 在里面翻，到头就停，不循环。
   每翻一张就把背后的页面滚到那张图的位置（看图模式对齐到行首，并把 J/K 的当前行一起挪过去），
   所以关掉灯箱时，页面已经停在最后看的那一张上。
   列表里存的是 URL 而不是 DOM 节点：灯箱和弹窗共用 #secondaryModalRoot，打开灯箱时弹窗
   那层会被换掉，节点引用就失效了；对齐时按位置重新去 DOM 里找。
   ⚠ 打开/关闭灯箱只画 #secondaryModalRoot，不走 render()：render() 会重建 #app，
   看图模式的 <img> 全部重建、高度塌掉，刚对齐好的滚动位置就丢了。 */
let lightboxNav = null;   // { scope: 'app' | 'review' | 'modal', urls: [], index }

function lightboxScopeOf(el) {
  if (el && el.closest && el.closest("#reviewEditorRoot")) return "review";
  if (el && el.closest && el.closest("#secondaryModalRoot")) return "modal";
  return "app";
}
function lightboxTargets(scope) {
  if (scope === "review") {
    return [...document.querySelectorAll("#reviewEditorRoot .reviewDoc img")].filter((img) => mdSafeUrl(img.getAttribute("src")));
  }
  const root = document.getElementById(scope === "modal" ? "secondaryModalRoot" : "app");
  return root ? [...root.querySelectorAll('[data-action="preview-image"][data-url]')] : [];
}
function lightboxTargetUrl(el) { return (el.dataset && el.dataset.url) || el.getAttribute("src") || ""; }

function openLightbox(el, url) {
  const safe = mdSafeUrl(url);
  if (!safe) return;
  const scope = lightboxScopeOf(el);
  const targets = lightboxTargets(scope);
  let index = targets.indexOf(el);
  if (index < 0) index = targets.findIndex((t) => t.contains(el) || (el && el.contains && el.contains(t)));
  lightboxNav = index >= 0 && targets.length > 1 ? { scope, urls: targets.map(lightboxTargetUrl), index } : null;
  lightboxUrl = safe;
  renderSecondaryModals(true);
}
function stepLightbox(delta) {
  const nav = lightboxNav;
  if (!nav || !lightboxUrl) return;
  const next = nav.index + delta;
  if (next < 0 || next >= nav.urls.length) return;
  nav.index = next;
  lightboxUrl = nav.urls[next];
  renderSecondaryModals(true);
  alignLightboxSource();
}
function closeLightbox() {
  lightboxUrl = null;
  renderSecondaryModals(true);   // 从弹窗里打开的，这一步会把弹窗画回来
  alignLightboxSource();
  lightboxNav = null;
}
/* 把背后页面滚到当前这张图。弹窗里的图要等灯箱关掉、弹窗画回来之后才找得到 */
function alignLightboxSource() {
  const nav = lightboxNav;
  if (!nav || (nav.scope === "modal" && lightboxUrl)) return;
  const targets = lightboxTargets(nav.scope);
  let el = targets[nav.index];
  if (!el || lightboxTargetUrl(el) !== nav.urls[nav.index]) el = targets.find((t) => lightboxTargetUrl(t) === nav.urls[nav.index]);
  if (!el) return;
  const row = el.closest("[data-focus-row]");
  if (row) setFocusCursor(+row.dataset.focusRow, "auto");
  else el.scrollIntoView({ behavior: "auto", block: "center" });
  markLightboxSource(el, nav.scope);
}
/* 「选中」状态也要跟着翻过去，不然关掉灯箱时看着像回到了最开始那张：
   - 复盘编辑器里双击图片会把那张图选中（金色描边），这是 ProseMirror 的节点选区；
   - 其它地方是键盘焦点：点开大图的那个放大按钮一直留着焦点，按过方向键 / Esc 之后
     浏览器会给它画上焦点框（:focus-visible 认的是「最近一次是键盘操作」）。
   能拿焦点的就把焦点挪到当前这张的按钮上，拿不了的（看图模式的图、当日明细的缩略图）
   就把旧焦点放掉。都不滚动——位置上面已经对齐好了 */
function markLightboxSource(el, scope) {
  if (scope === "review") { selectReviewImage(el); return; }
  if (el.matches("button, a[href], [tabindex]")) el.focus({ preventScroll: true });
  else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
}
let secondaryModalState = null;
function dayDetailModalHtml() {
  const dateF = roleField("date"), resultF = roleField("result"), rF = roleField("r_multiple"), modelF = roleField("model"), shotF = roleField("screenshot");
  const list = tradesOnDate(dayDetailDate);
  const stats = aggregateTradeStats(list);
  return `<div class="overlay" data-action="close-day-detail">
    <div class="modal" style="max-width:580px;">
      <div class="modalHead"><div class="display" style="font-size:17px;font-weight:600;">${esc(dayDetailDate)}</div>
        <button class="iconBtn" data-action="close-day-detail">${ICONS.x}</button></div>
      <div class="modalBody">
        <div style="font-size:12.5px;color:var(--muted);margin-bottom:14px;">${esc(stats.hasR ? T("dayDetail.summaryWithR", { n: stats.count, r: fmtNum(stats.rSum) }) : T("dayDetail.summary", { n: stats.count }))}</div>
        ${list.length === 0 ? `<div style="color:var(--mutedDark);font-size:13px;margin-bottom:14px;">${T("dayDetail.empty")}</div>` : ""}
        ${list.map((t) => {
          const result = resultF ? t[resultF.id] : null;
          const rc = resultColor(result);
          const shot = shotF ? t[shotF.id] : null;
          const confirming = confirmDeleteId === t.id;
          return `<div class="dayDetailRow">
            <div data-action="open-trade-from-day" data-id="${esc(t.id)}" style="display:flex;align-items:center;gap:12px;flex:1;cursor:pointer;min-width:0;">
              ${shot
                ? `<img class="dayDetailThumb" src="${esc(imgSrc(shot))}" loading="lazy" referrerpolicy="no-referrer" data-action="preview-image" data-url="${esc(imgSrc(shot))}" data-fallback-url="${esc(imgSrc(shot))}" data-fallback-class="dayDetailThumbEmpty" onerror="window.__imgFallback(this)" />`
                : `<div class="dayDetailThumbEmpty">${ICONS.camera}</div>`}
              <span class="mono dayDetailResult" style="color:${rc};">${esc(result || "—")}</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${modelF ? esc(t[modelF.id] || "") : ""}</span>
              ${rF && t[rF.id] !== undefined && t[rF.id] !== "" ? `<span class="mono" style="color:${rc};flex-shrink:0;">${(parseFloat(t[rF.id]) >= 0 ? "+" : "") + t[rF.id]}R</span>` : ""}
            </div>
            ${viewingUserId ? "" : (!confirming
              ? `<button class="tinyBtn" data-action="ask-delete-day-trade" data-id="${esc(t.id)}" style="color:var(--mutedDark);flex-shrink:0;margin-left:8px;">${ICONS.trash}</button>`
              : `<span style="display:flex;gap:6px;flex-shrink:0;margin-left:8px;"><button class="tinyBtn" data-action="confirm-delete-day-trade" data-id="${esc(t.id)}" style="color:var(--neg);">✓</button><button class="tinyBtn" data-action="cancel-delete-day-trade">${ICONS.x}</button></span>`)}
          </div>`;
        }).join("")}
        ${viewingUserId ? "" : `<button class="btn btn-primary" data-action="new-trade-for-day" style="margin-top:14px;width:100%;justify-content:center;">${ICONS.plus} ${T("dayDetail.newTrade")}</button>`}
      </div>
    </div>
  </div>`;
}
function comboGroupModalHtml() {
  const m = comboGroupModal;
  const title = m.mode === "root" ? T("comboGroup.modalNewRoot") : m.mode === "sub" ? T("comboGroup.modalNewSub") : T("comboGroup.modalRename");
  return `<div class="overlay" data-action="dismiss-combo-group-overlay">
    <div class="modal" style="max-width:420px;">
      <div class="modalHead">
        <div class="display" style="font-size:16px;font-weight:600;">${esc(title)}</div>
        <button class="iconBtn" data-action="close-combo-group-modal">${ICONS.x}</button>
      </div>
      <div class="modalBody">
        <div class="field" style="margin-bottom:0;">
          <div class="fieldLabel">${T("comboGroup.nameLabel")}</div>
          <input type="text" class="input" id="comboGroupNameInput" value="${esc(m.name)}" placeholder="${esc(T("comboGroup.namePlaceholder"))}" maxlength="40" autofocus />
        </div>
      </div>
      <div class="modalFoot">
        <button class="btn" data-action="close-combo-group-modal">${T("common.cancel")}</button>
        <button class="btn btn-primary" data-action="save-combo-group-modal">${T("common.save")}</button>
      </div>
    </div>
  </div>`;
}
function reviewGroupModalHtml() {
  const m = reviewGroupModal;
  return `<div class="overlay" data-action="dismiss-review-group-overlay">
    <div class="modal" style="max-width:420px;">
      <div class="modalHead">
        <div class="display" style="font-size:16px;font-weight:600;">${esc(m.mode === "rename" ? T("reviewGroup.modalRename") : T("reviewGroup.modalNew"))}</div>
        <button class="iconBtn" data-action="close-review-group-modal">${ICONS.x}</button>
      </div>
      <div class="modalBody">
        <div class="field" style="margin-bottom:0;">
          <div class="fieldLabel">${T("reviewGroup.nameLabel")}</div>
          <input type="text" class="input" id="reviewGroupNameInput" value="${esc(m.name)}" placeholder="${esc(T("reviewGroup.namePlaceholder"))}" maxlength="40" autofocus />
        </div>
      </div>
      <div class="modalFoot">
        <button class="btn" data-action="close-review-group-modal">${T("common.cancel")}</button>
        <button class="btn btn-primary" data-action="save-review-group-modal">${T("common.save")}</button>
      </div>
    </div>
  </div>`;
}
/* ============================================================
   单笔交易的只读预览

   复盘正文里点交易胶囊走这里，不是编辑弹窗。理由和 focus 视图那条一样：
   看复盘的时候是在读，不是在改——一点就弹出一个满是输入框的表单，
   既容易误改，也把「我只想看一眼那张图」这件事弄得很重。
   所以这里只给截图 + 字段值，要改得点底下那个明确的「编辑这笔交易」。
   ============================================================ */
function tradePreviewHtml() {
  const t = trades.find((x) => x.id === tradePreviewId);
  if (!t) {
    return `<div class="overlay" data-action="close-trade-preview">
      <div class="modal" style="max-width:420px;">
        <div class="modalHead">
          <div class="display" style="font-size:16px;font-weight:600;">${esc(T("tradePreview.title"))}</div>
          <button class="iconBtn" data-action="close-trade-preview">${ICONS.x}</button>
        </div>
        <div class="modalBody"><div class="notice">${ICONS.alert}<span>${esc(T("tradePreview.gone"))}</span></div></div>
      </div>
    </div>`;
  }
  const dateF = roleField("date"), modelF = roleField("model"), resultF = roleField("result"),
    rF = roleField("r_multiple"), shotF = roleField("screenshot");
  const result = resultF ? t[resultF.id] : "";
  const rc = resultColor(result);
  const shot = shotF ? t[shotF.id] : null;
  const rVal = rF ? t[rF.id] : undefined;
  const hasR = rVal !== undefined && rVal !== "" && !isNaN(parseFloat(rVal));

  // 表头已经把日期/模型/结果/R 显示出来了，下面的字段表就别再重复一遍
  const shownInHead = [dateF, modelF, resultF, rF, shotF].filter(Boolean).map((f) => f.id);
  const rows = schema.filter((f) => !shownInHead.includes(f.id)).map((f) => {
    let v = tradeFieldValue(t, f);
    if (Array.isArray(v)) v = v.length ? v.join(", ") : "";
    if (v === undefined || v === null || String(v).trim() === "") return "";   // 空字段不占地方
    const text = String(v);
    // ⚠️ mdSafeUrl() 返回的是**没转义**的原串。它在 markdown 渲染器里够用，是因为
    // 那边整段早就 esc() 过了；这里拿到的是原始字段值，必须自己再 esc 一次，
    // 否则一个 `https://x.com/a" onmouseover="alert(1)` 就能从 href 里逃出来挂上事件处理器
    const url = f.type === "url" ? mdSafeUrl(text) : null;
    return `<div class="tpField${f.type === "textarea" || text.length > 40 ? " isLong" : ""}">
      <div class="tpFieldLabel">${esc(f.label)}</div>
      <div class="tpFieldVal">${url
        ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(text)}</a>`
        : esc(text)}</div>
    </div>`;
  }).join("");

  return `<div class="overlay" data-action="close-trade-preview">
    <div class="modal tradePreviewModal">
      <div class="modalHead">
        <div class="tpHead">
          <span class="tpDate display">${esc((dateF && t[dateF.id]) || "—")}</span>
          ${modelF && t[modelF.id] ? `<span class="tpModel">${esc(String(t[modelF.id]))}</span>` : ""}
          ${result ? `<span class="tpResult" style="background:${rc};">${esc(result)}</span>` : ""}
          ${hasR ? `<span class="tpR mono" style="color:${rc};">${(parseFloat(rVal) >= 0 ? "+" : "") + esc(String(rVal))}R</span>` : ""}
        </div>
        <button class="iconBtn" data-action="close-trade-preview">${ICONS.x}</button>
      </div>
      <div class="modalBody tradePreviewBody">
        <div class="tpShot"${shot ? ` data-action="preview-image" data-url="${esc(imgSrc(shot))}"` : ""}>
          ${shot
            ? `<img src="${esc(imgSrc(shot))}" alt="" referrerpolicy="no-referrer" data-fallback-url="${esc(imgSrc(shot))}" data-fallback-class="tpShotEmpty" onerror="window.__imgFallback(this)" />
               <span class="tpZoomHint">${esc(T("tradePreview.zoomHint"))}</span>`
            : `<div class="tpShotEmpty">${ICONS.camera} ${esc(T("tradePreview.noShot"))}</div>`}
        </div>
        ${rows ? `<div class="tpFields">${rows}</div>` : `<div class="tpEmpty">${esc(T("tradePreview.empty"))}</div>`}
      </div>
      <div class="modalFoot">
        ${viewingUserId ? "" : `<button class="btn" data-action="edit-trade-from-preview" data-id="${esc(t.id)}">${ICONS.pencil} ${esc(T("tradePreview.edit"))}</button>`}
        <button class="btn btn-primary" data-action="close-trade-preview">${esc(T("common.close"))}</button>
      </div>
    </div>
  </div>`;
}

function renderSecondaryModals(force) {
  const root = document.getElementById("secondaryModalRoot");
  if (!root) return;
  const want = profileModalOpen ? "profile" : (lightboxUrl ? "lightbox" : (tradePreviewId ? "tradepreview" : (dayDetailDate ? "daydetail" : (comboGroupModal ? "combogroup" : (reviewGroupModal ? "reviewgroup" : null)))));
  if (!force && want === secondaryModalState && want !== null) return; // already showing the right thing — don't wipe in-progress typing
  secondaryModalState = want;
  if (want === "profile") root.innerHTML = profileModalHtml();
  else if (want === "lightbox") root.innerHTML = lightboxHtml();
  else if (want === "tradepreview") root.innerHTML = tradePreviewHtml();
  else if (want === "combogroup") root.innerHTML = comboGroupModalHtml();
  else if (want === "reviewgroup") root.innerHTML = reviewGroupModalHtml();
  else if (want === "daydetail") root.innerHTML = dayDetailModalHtml();
  else root.innerHTML = "";
}
// render() 每次都整体重建 app 的 innerHTML，滚动容器的节点也跟着被换掉，
// scrollTop 会被浏览器重置成 0 —— 这里手动把滚动位置搬到新节点上
function renderPreservingScroll(elId) {
  const prev = document.getElementById(elId);
  const scrollTop = prev ? prev.scrollTop : null;
  render();
  if (scrollTop !== null) {
    const next = document.getElementById(elId);
    if (next) next.scrollTop = scrollTop;
  }
}
function renderExportPanel() {
  const filteredCount = exportFilteredTrades().length;
  const allCount = trades.length;
  const scope = resolvedExportScope();
  return `
    <div style="padding:10px 12px 6px;font-size:11px;color:var(--mutedDark);">${T("export.scope")}</div>
    <div class="chipGroup" style="padding:0 12px 8px;margin-bottom:0;">
      <button type="button" class="chip ${scope === "filtered" ? "active" : ""}" data-action="set-export-scope" data-value="filtered">${T("export.scopeFiltered", { n: filteredCount })}</button>
      <button type="button" class="chip ${scope === "all" ? "active" : ""}" data-action="set-export-scope" data-value="all">${T("export.scopeAll", { n: allCount })}</button>
    </div>
    <div style="padding:8px 12px 6px;font-size:11px;color:var(--mutedDark);border-top:1px solid var(--border);">${T("export.columns")}</div>
    <div class="chipGroup" style="padding:0 12px 8px;margin-bottom:0;">
      <button type="button" class="chip ${exportColumns === "all" ? "active" : ""}" data-action="set-export-columns" data-value="all">${T("export.columnsAll")}</button>
      <button type="button" class="chip ${exportColumns === "selected" ? "active" : ""}" data-action="set-export-columns" data-value="selected">${T("export.columnsSelected")}</button>
    </div>
    ${exportColumns === "selected" ? `<div id="exportFieldsScroll" class="chipGroup" style="padding:0 12px 8px;max-height:180px;overflow-y:auto;">
      ${exportAllFields().map((f) => `<button type="button" class="chip ${exportSelectedFields.includes(f.id) ? "active" : ""}" data-action="toggle-export-field" data-id="${esc(f.id)}">${esc(f.label)}</button>`).join("")}
    </div>
    <div style="padding:0 12px 8px;display:flex;gap:10px;">
      <button type="button" class="tinyBtn" data-action="export-fields-select-all">${T("export.selectAll")}</button>
      <button type="button" class="tinyBtn" data-action="export-fields-clear">${T("export.clearAll")}</button>
    </div>` : ""}
    <button data-action="export-csv" ${exportColumns === "selected" && exportSelectedFields.length === 0 ? "disabled" : ""} style="border-top:1px solid var(--border);font-weight:600;color:var(--accent);">${ICONS.download} ${T("export.exportCsv")}</button>
    <button data-action="export-json">${ICONS.download} ${T("header.jsonBackup")}</button>
    <div style="padding:6px 12px 10px;font-size:10.5px;color:var(--mutedDark);line-height:1.4;">${T("export.jsonBackupHint")}</div>
  `;
}
/* ---------- 分区重绘 ----------
   以前 render() 每次都把整个 #app 的 innerHTML 重写：随便点一下（开个弹窗、翻个页码、
   保存一笔交易）都会让所有 <img> 重建、滚动位置和焦点丢掉——前面那些 renderPreservingScroll、
   灯箱「不走 render()」的绕路，全是在给这件事打补丁。
   现在 #app 拆成五块（顶栏 / 只读横幅 / 页签 / 错误提示 / 页签内容），每块只在自己的 HTML
   跟上次写进去的不一样时才动。

   ⚠ 「HTML 一样就不动」有一个前提：DOM 里没有被用户改过、而 HTML 里又没记录的东西。
   用户在输入框里打了字但还没写进状态，以前的 render() 会把它冲回状态里的值；
   现在如果整块都跳过，那份没记录的输入会留着。为了让行为跟以前完全一致，
   只要这一块里有任何表单控件的当前值跟 HTML 里写的默认值对不上，就照旧整块重写。 */
const APP_REGIONS = ["appHeader", "appBanner", "appNav", "appNotice", "tabBody"];
let appRegionHtml = {};   // 每块上次写进 DOM 的 HTML
function regionHasEditedControls(root) {
  const controls = root.querySelectorAll("input, textarea, select");
  for (let i = 0; i < controls.length; i++) {
    const c = controls[i];
    if (c.tagName === "SELECT") {
      const opts = Array.from(c.options);
      const anyDefault = opts.some((o) => o.defaultSelected);
      // 没有任何 option 写了 selected 属性时，单选下拉的默认就是第一项
      if (opts.some((o, k) => o.selected !== (anyDefault || c.multiple ? o.defaultSelected : k === 0))) return true;
    } else if (c.type === "checkbox" || c.type === "radio") {
      if (c.checked !== c.defaultChecked) return true;
    } else if (c.type === "file") {
      if (c.value) return true;
    } else if (c.value !== c.defaultValue) {
      return true;
    }
  }
  return false;
}
function patchAppShell(regions) {
  const app = document.getElementById("app");
  // #app 里现在不是主界面骨架（刚登录 / 刚从登录页、禁用页切回来）：整个重建，缓存作废
  if (!document.getElementById("appHeader") || !app.contains(document.getElementById("tabBody"))) {
    app.innerHTML = `<div class="header" id="appHeader"></div><div id="appBanner"></div><div class="nav" id="appNav"></div><div id="appNotice"></div><div id="tabBody"></div>`;
    appRegionHtml = {};
  }
  APP_REGIONS.forEach((id) => {
    const el = document.getElementById(id);
    const html = regions[id];
    if (appRegionHtml[id] === html && !regionHasEditedControls(el)) return;
    el.innerHTML = html;
    appRegionHtml[id] = html;
  });
}
function render() {
  const app = document.getElementById("app");

  if (authLoading) { app.innerHTML = `<div class="loading">${T("common.loading")}</div>`; return; }
  if (!session) { app.innerHTML = renderAuthScreen(); renderModal(); return; }
  if (currentProfile && currentProfile.active === false) { app.innerHTML = renderDisabledScreen(); return; }

  const hs = headerStats();
  const isAdmin = currentProfile && currentProfile.role === "admin";
  const displayName = currentProfile && currentProfile.display_name;
  const TABS = [
    { id: "grid", label: T("tab.grid"), icon: ICONS.grid },
    { id: "analytics", label: T("tab.analytics"), icon: ICONS.chart },
    { id: "calendar", label: T("tab.calendar"), icon: ICONS.calendar },
    { id: "changelog", label: T("tab.changelog"), icon: ICONS.clock },
    { id: "settings", label: T("tab.settings"), icon: ICONS.settings },
  ];
  // 复盘只在实盘模式下出现——回测那批数据不需要写周复盘，页签也就不该占位置
  TABS.splice(3, 0, { id: "reviews", label: T("tab.reviews"), icon: ICONS.book });
  if (isAdmin) TABS.push({ id: "admin", label: T("tab.admin"), icon: ICONS.shield });
  applyFocusHeight();
  let body = "";
  try {
    if (tab === "grid") body = renderGrid();
    else if (tab === "analytics") body = renderAnalytics();
    else if (tab === "calendar") body = renderCalendar();
    else if (tab === "reviews") body = renderReviews();
    else if (tab === "changelog") body = renderChangelog();
    else if (tab === "settings") body = renderSettings();
    else if (tab === "admin") body = isAdmin ? renderAdminPanel() : `<div class="notice">${ICONS.alert}<span>${T("common.noPermission")}</span></div>`;
  } catch (err) {
    console.error(err);
    body = `<div class="notice error">${ICONS.alert}<span>${esc(T("common.tabRenderError", { msg: err.message || err }))}</span></div>`;
  }

  document.title = displayName ? T("header.titleWithName", { name: displayName }) : "IFVG Trade Journal";

  const headerHtml = `
      <div>
        <div class="brand">${displayName ? T("header.titleWithName", { name: `<span class="accent">${esc(displayName)}</span>` }) : `<span class="accent">IFVG</span> Trade Journal`}</div>
        <div class="subline">${recordMode === "backtest" ? T("mode.backtest") : T("mode.live")} · taken ${hs.n} · WR ${fmtPct(hs.wr)} ${hs.hasR ? "· EV " + fmtNum(hs.ev, 3) : ""}</div>
      </div>
      <div class="headerActions">
        <div class="modeToggle">
          <button class="modeBtn ${recordMode === "backtest" ? "active" : ""}" data-action="set-record-mode" data-mode="backtest">${T("mode.backtest")}</button>
          <button class="modeBtn ${recordMode === "live" ? "active" : ""}" data-action="set-record-mode" data-mode="live">${T("mode.live")}</button>
        </div>
        <button class="themeToggle" data-action="toggle-theme" title="${esc(T("header.toggleTheme"))}">${document.documentElement.dataset.theme === "light" ? ICONS.moon : ICONS.sun}</button>
        <div style="position:relative;">
          <button class="btn" data-action="toggle-export">${ICONS.download} ${T("header.export")}</button>
          <div class="exportMenu ${exportMenuOpen ? "open" : ""}" style="min-width:250px;">
            ${exportMenuOpen ? renderExportPanel() : ""}
          </div>
        </div>
        ${!viewingUserId ? `<button class="btn btn-primary" data-action="new-trade">${ICONS.plus} ${T("common.newTrade")}</button>` : ""}
        <div style="position:relative;">
          <button class="themeToggle" data-action="toggle-user-menu" title="${esc(T("header.account"))}">${ICONS.user}</button>
          <div class="exportMenu ${userMenuOpen ? "open" : ""}" style="min-width:220px;">
            <div style="padding:9px 12px;font-size:11.5px;color:var(--mutedDark);border-bottom:1px solid var(--border);">
              ${esc(session.user.email)} ${isAdmin ? "· admin" : ""}
            </div>
            <button data-action="open-profile-modal">${T("header.profile")}</button>
            <button data-action="logout">${T("auth.logout")}</button>
          </div>
        </div>
      </div>
  `;
  const bannerHtml = viewingUserId ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--accentSoft);border:1px solid var(--accent);border-radius:8px;padding:10px 16px;margin-bottom:16px;">
      <span style="font-size:13px;color:var(--accent);">${ICONS.expand} ${T("header.viewingUser", { email: `<b>${esc(viewingUserEmail)}</b>` })}</span>
      <button class="btn" data-action="exit-view-mode">${T("header.exitViewMode")}</button>
    </div>` : "";
  const navHtml = TABS.map((tb) => `<button class="tab ${tab === tb.id ? "active" : ""}" data-action="switch-tab" data-tab="${tb.id}">${tb.icon} ${tab === tb.id ? "[ " + esc(tb.label) + " ]" : esc(tb.label)}</button>`).join("");
  const noticeHtml = (loadError ? `<div class="notice error" style="margin-bottom:20px;">${ICONS.alert}<span>${esc(loadError)}</span></div>` : "")
    + (dbOutdated && loadError !== T("error.dbOutdated") ? `<div class="notice error" style="margin-bottom:20px;">${ICONS.alert}<span>${esc(T("error.dbOutdated"))}</span></div>` : "");

  patchAppShell({ appHeader: headerHtml, appBanner: bannerHtml, appNav: navHtml, appNotice: noticeHtml, tabBody: body });
  renderModal();
  renderSecondaryModals();
  renderReviewEditor();
}


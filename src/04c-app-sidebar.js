/* Shared modern/Glass navigation. UI only: no business reads/writes or router replacement.
   Registered before the company editor's capture guard: mobile navigation releases inert
   BEFORE the existing unsaved-draft confirmation is shown. Ctrl/Cmd+B stays with editors. */
function appSidebarReadPref(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
function appSidebarPreference(value) { return value === 'collapsed' ? true : value === 'expanded' ? false : null; }
function appSidebarWidth() { return typeof innerWidth === 'number' ? innerWidth : 1440; }
function appSidebarIsMobile() { return appSidebarWidth() < 900; }
function appSidebarResolveCollapsed(preference, width) { return preference === null ? width >= 900 && width < 1200 : preference; }
function appSidebarCollapsed() { return appSidebarResolveCollapsed(appSidebar.preference, appSidebarWidth()); }
function appSidebarActive() { return isModernLayout() && !!session?.user?.id && !authLoading && !!currentProfile && currentProfile.active !== false && (!currentProfile.id || currentProfile.id === session.user.id); }
function appSidebarStore(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
function appSidebarIcon(kind) {
  const paths = { panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m4-11 3 3-3 3"/>', more: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>' };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind] || paths.panel}</svg>`;
}
function appSidebarDockTabs(tabs) { return ['grid', 'analytics', 'prop'].map(id => tabs.find(t => t.id === id)).filter(Boolean); }
function appSidebarMoreActive(tabs) { return !appSidebarDockTabs(tabs).some(t => t.id === tab); }
function appSidebarRouteHtml(item, dock = false) {
  return `<button type="button" class="tab appSidebarRoute${tab === item.id ? ' active' : ''}" data-action="switch-tab" data-tab="${esc(item.id)}" aria-label="${esc(item.label)}"${tab === item.id ? ' aria-current="page"' : ''}${dock ? '' : ` data-sidebar-tip="${esc(item.label)}"`}>${item.icon}<span class="tabLabel">${esc(item.label)}</span></button>`;
}
function appSidebarNavigationHtml(tabs) {
  const groups = { grid: 'nav.groupTrade', reviews: 'nav.groupNotes', prop: 'nav.groupProp', changelog: 'nav.groupSystem' };
  return tabs.map(item => `${groups[item.id] ? `<div class="appSidebarGroup" aria-hidden="true">${esc(T(groups[item.id]))}</div>` : ''}${appSidebarRouteHtml(item)}`).join('');
}
function appSidebarPanelHtml(model, mobile = false) {
  const collapsed = !mobile && appSidebarCollapsed(), label = T(collapsed ? 'sidebar.expand' : 'sidebar.collapse');
  const name = currentProfile?.display_name || session?.user?.email || 'IFVG';
  const initial = Array.from(name)[0] || '?';
  return `<div class="appSidebarPanel${mobile ? ' appSidebarMobilePanel' : ' appSidebarDesktop'}">
    <div class="appSidebarHead"><div class="appSidebarBrand"><span class="appSidebarLogo">${LOGO_MARK}</span><span>IFVG <b>Journal</b><small>${esc(T('sidebar.workspace'))}</small></span></div>
      <button type="button" class="iconBtn appSidebarToggle" data-action="${mobile ? 'sidebar-close' : 'sidebar-toggle'}" aria-label="${esc(mobile ? T('sidebar.close') : label)}"${mobile ? '' : ` aria-expanded="${!collapsed}" aria-controls="appSidebarNavigation" data-sidebar-tip="${esc(label)}"`}>${mobile ? ICONS.x : appSidebarIcon('panel')}</button></div>
    <nav class="appSidebarScroll"${mobile ? '' : ' id="appSidebarNavigation"'} aria-label="${esc(T('sidebar.navigation'))}">${appSidebarNavigationHtml(model.tabs)}</nav>
    <div class="appSidebarFoot"><section class="appSidebarSummary"><button type="button" class="appSidebarSummaryToggle" data-action="sidebar-summary" aria-expanded="${appSidebar.summaryOpen}" aria-controls="${mobile ? 'appSidebarMobileSummary' : 'appSidebarDesktopSummary'}">${ICONS.chart}<span>${esc(T('sidebar.summary'))}</span>${ICONS.chevDown}</button>
      <div class="appSidebarSummaryBody" id="${mobile ? 'appSidebarMobileSummary' : 'appSidebarDesktopSummary'}"${appSidebar.summaryOpen ? '' : ' hidden'}>${model.summary}</div></section>
      <button type="button" class="appSidebarAccountTrigger" data-action="toggle-user-menu" data-sidebar-account aria-haspopup="dialog" aria-expanded="${userMenuOpen}" aria-label="${esc(T('sidebar.account'))}" data-sidebar-tip="${esc(T('sidebar.account'))}"><span class="appSidebarAvatar" aria-hidden="true">${esc(initial.toUpperCase())}</span><span class="appSidebarAccountText"><strong>${esc(name)}</strong><small>${esc(session?.user?.email || '')}</small></span><span class="appSidebarAccountChev">${ICONS.chevDown}</span></button>
    </div></div>`;
}
function appSidebarNavHtml(tabs, summary) {
  if (!appSidebarActive()) { appSidebar.model = null; return ''; }
  appSidebar.model = { tabs, summary, owner: session?.user?.id };
  const current = tabs.find(t => t.id === tab);
  return `${appSidebarPanelHtml(appSidebar.model)}<nav class="appSidebarDock" aria-label="${esc(T('sidebar.quick'))}">${appSidebarDockTabs(tabs).map(t => appSidebarRouteHtml(t, true)).join('')}<button type="button" class="tab appSidebarMore${appSidebarMoreActive(tabs) ? ' active' : ''}" data-action="sidebar-open" data-sidebar-launch="dock" aria-haspopup="dialog" aria-expanded="${appSidebar.mobileOpen}" aria-controls="appSidebarMobilePanel" aria-label="${esc(appSidebarMoreActive(tabs) ? T('sidebar.moreCurrent', { page: current?.label || '' }) : T('sidebar.more'))}">${appSidebarIcon('more')}<span class="tabLabel">${esc(T('sidebar.more'))}</span></button></nav>`;
}
function appSidebarMobileTriggerHtml() {
  return `<button type="button" class="iconBtn appSidebarMobileTrigger" data-action="sidebar-open" data-sidebar-launch="header" aria-label="${esc(T('sidebar.navigation'))}" aria-haspopup="dialog" aria-expanded="${appSidebar.mobileOpen}" aria-controls="appSidebarMobilePanel">${appSidebarIcon('panel')}</button>`;
}
function appSidebarRoot(id) {
  let root = document.getElementById(id);
  if (!root) { root = document.createElement('div'); root.id = id; document.body.appendChild(root); }
  return root;
}
function appSidebarVisible(el) { return !!el && !el.hidden && !!el.getClientRects?.().length; }
function appSidebarFocusables(root) { return [...(root?.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') || [])].filter(appSidebarVisible); }
function appSidebarFocusKey(root) {
  const el = document.activeElement;
  return el && root?.contains(el) ? Object.fromEntries(['action', 'tab', 'layout', 'palette', 'calColor'].filter(k => el.dataset?.[k] !== undefined).map(k => [k, el.dataset[k]])) : null;
}
function appSidebarRestoreKey(root, key) {
  if (!key || !Object.keys(key).length) return;
  const target = appSidebarFocusables(root).find(el => Object.entries(key).every(([k, v]) => el.dataset[k] === v));
  target?.focus({ preventScroll: true });
}
function appSidebarLockBackground(on) {
  if (on) {
    if (appSidebar.overflow === null) { appSidebar.overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    for (const el of [...document.body.children]) {
      if (['appSidebarDialogRoot', 'appSidebarAccountRoot', 'appSidebarTooltip'].includes(el.id) || ['SCRIPT', 'STYLE'].includes(el.tagName)) continue;
      if (!appSidebar.inert.has(el)) appSidebar.inert.set(el, el.inert);
      el.inert = true;
    }
  } else {
    appSidebar.inert.forEach((value, el) => { el.inert = value; }); appSidebar.inert.clear();
    if (appSidebar.overflow !== null) { document.body.style.overflow = appSidebar.overflow; appSidebar.overflow = null; }
  }
}
function appSidebarClearAccount() {
  const root = document.getElementById('appSidebarAccountRoot'); if (root) root.innerHTML = '';
  appSidebar.accountHTML = '';
}
function appSidebarCloseAccount(restore = false) {
  userMenuOpen = false; appSidebarClearAccount();
  document.querySelectorAll?.('[data-sidebar-account]').forEach(el => el.setAttribute('aria-expanded', 'false'));
  if (restore) [...(document.querySelectorAll?.('[data-sidebar-account]') || [])].find(appSidebarVisible)?.focus({ preventScroll: true });
}
function appSidebarCloseMobile(restore = true) {
  if (!appSidebar.mobileOpen && appSidebar.overflow === null) return;
  appSidebar.mobileOpen = false; appSidebarCloseAccount(); appSidebarLockBackground(false);
  const root = document.getElementById('appSidebarDialogRoot'); if (root) { root.innerHTML = ''; root.hidden = true; }
  appSidebar.mobileHTML = ''; appSidebarSyncDom();
  if (restore) {
    const selector = `[data-sidebar-launch="${appSidebar.returnLaunch === 'header' ? 'header' : 'dock'}"]`;
    const target = [document.querySelector(selector), document.querySelector('[data-action="sidebar-toggle"]')].find(appSidebarVisible);
    target?.focus({ preventScroll: true });
  }
}
function appSidebarOpenMobile(trigger) {
  if (!appSidebarActive() || !appSidebarIsMobile() || appSidebar.model?.owner !== session.user.id || editingTrade || editingReview || propModal || profileModalOpen || exportCenterOpen) return;
  appSidebar.returnLaunch = trigger?.dataset?.sidebarLaunch || 'dock';
  appSidebarCloseAccount(); appSidebarHideTip();
  if (typeof propOverviewCleanup === 'function') propOverviewCleanup();
  appSidebar.mobileOpen = true; appSidebarRenderMobile(); appSidebarSyncDom();
  document.querySelector('#appSidebarMobilePanel [data-action="sidebar-close"]')?.focus({ preventScroll: true });
  appSidebarLockBackground(true);
}
function appSidebarRenderMobile() {
  if (!appSidebar.mobileOpen || !appSidebar.model) return;
  const root = appSidebarRoot('appSidebarDialogRoot');
  root.hidden = false;
  if (document.activeElement?.matches?.('input[type="color"]') && document.activeElement.closest('#appSidebarAccountRoot')) return;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', T('sidebar.navigation'));
  const html = `<div class="appSidebarBackdrop" data-action="sidebar-close" aria-hidden="true"></div><section id="appSidebarMobilePanel" class="appSidebarSheet lgSurface" tabindex="-1">${appSidebarPanelHtml(appSidebar.model, true)}</section>`;
  if (appSidebar.mobileHTML !== html) {
    const key = appSidebarFocusKey(root), scroll = root.querySelector('.appSidebarScroll')?.scrollTop || 0;
    const account = root.querySelector('#appSidebarAccountRoot'); account?.remove();
    root.innerHTML = html; appSidebar.mobileHTML = html;
    if (account) root.appendChild(account);
    const content = root.querySelector('.appSidebarScroll'); if (content) content.scrollTop = scroll;
    appSidebarRestoreKey(root, key);
  }
}
function appSidebarPositionAccount(root, anchor) {
  const menu = root.firstElementChild; if (!menu) return;
  const rect = anchor.getBoundingClientRect(), w = appSidebarWidth(), h = typeof innerHeight === 'number' ? innerHeight : 800;
  menu.style.maxHeight = Math.max(120, h - 24) + 'px'; menu.style.width = Math.min(292, w - 24) + 'px';
  const width = menu.offsetWidth, height = menu.offsetHeight;
  const left = appSidebarIsMobile() ? rect.left : rect.right + 10;
  menu.style.left = Math.max(12, Math.min(left, w - width - 12)) + 'px';
  menu.style.top = Math.max(12, Math.min(rect.bottom - height, h - height - 12)) + 'px';
}
function appSidebarRenderAccount() {
  if (!appSidebarActive() || !userMenuOpen) { appSidebarClearAccount(); return; }
  const anchor = [...(document.querySelectorAll?.('[data-sidebar-account]') || [])].find(appSidebarVisible);
  if (!anchor) { appSidebarCloseAccount(); return; }
  const root = appSidebarRoot('appSidebarAccountRoot');
  // A sibling of the sheet keeps the popup inside the modal's accessibility tree,
  // without inheriting the sheet's backdrop-filter containing block.
  const parent = appSidebar.mobileOpen ? document.getElementById('appSidebarDialogRoot') : document.body;
  if (parent && root.parentElement !== parent) parent.appendChild(root);
  const html = `<div class="exportMenu open appSidebarAccountMenu" role="dialog" aria-label="${esc(T('sidebar.account'))}">${appAccountMenuHtml()}</div>`;
  const editingColor = root.contains(document.activeElement) && document.activeElement?.matches('input[type="color"]');
  if (appSidebar.accountHTML !== html && !editingColor) {
    const key = appSidebarFocusKey(root), scroll = root.firstElementChild?.scrollTop || 0;
    root.innerHTML = html; appSidebar.accountHTML = html;
    if (root.firstElementChild) root.firstElementChild.scrollTop = scroll;
    appSidebarRestoreKey(root, key);
  }
  anchor.setAttribute('aria-expanded', 'true'); appSidebarPositionAccount(root, anchor);
}
function appSidebarSyncDom() {
  const d = document.documentElement.dataset;
  if (!isModernLayout()) { delete d.sidebarState; return; }
  d.sidebarState = appSidebarCollapsed() ? 'collapsed' : 'expanded';
  document.querySelectorAll?.('[data-action="sidebar-toggle"]').forEach(el => {
    const label = T(appSidebarCollapsed() ? 'sidebar.expand' : 'sidebar.collapse');
    el.setAttribute('aria-expanded', String(!appSidebarCollapsed())); el.setAttribute('aria-label', label); el.dataset.sidebarTip = label;
  });
  document.querySelectorAll?.('[data-action="sidebar-open"]').forEach(el => el.setAttribute('aria-expanded', String(appSidebar.mobileOpen)));
  document.querySelectorAll?.('[data-sidebar-account]').forEach(el => el.setAttribute('aria-expanded', String(userMenuOpen)));
  document.querySelectorAll?.('[data-action="sidebar-summary"]').forEach(el => el.setAttribute('aria-expanded', String(appSidebar.summaryOpen)));
  document.querySelectorAll?.('.appSidebarSummaryBody').forEach(el => { el.hidden = !appSidebar.summaryOpen; });
}
function appSidebarToggle() {
  if (!appSidebarActive() || appSidebarIsMobile()) return;
  appSidebar.preference = !appSidebarCollapsed(); appSidebarStore('journal_sidebar', appSidebar.preference ? 'collapsed' : 'expanded');
  appSidebarHideTip(); appSidebarSyncDom(); appSidebarRenderAccount();
}
function appSidebarToggleSummary() {
  appSidebar.summaryOpen = !appSidebar.summaryOpen;
  appSidebarStore('journal_sidebar_summary', appSidebar.summaryOpen ? 'open' : 'closed'); appSidebarSyncDom();
}
function appSidebarResetSession() {
  appSidebar.generation++;
  appSidebarCloseMobile(false); appSidebarCloseAccount(); appSidebarHideTip();
  appSidebar.model = null; appSidebar.owner = null;
  appSidebar.navScroll = 0; appSidebar.navFocus = null;
}
function appSidebarBeforeRender() {
  const owner = session?.user?.id || null;
  const nav = document.getElementById('appNav');
  appSidebar.navScroll = nav?.querySelector?.('.appSidebarScroll')?.scrollTop || 0;
  appSidebar.navFocus = appSidebarFocusKey(nav);
  if (appSidebar.owner && owner !== appSidebar.owner) appSidebarResetSession();
  appSidebar.owner = owner; appSidebarHideTip();
  if (!appSidebarActive()) { appSidebarCloseMobile(false); appSidebarClearAccount(); appSidebar.model = null; }
  appSidebarSyncDom();
}
function appSidebarAfterRender() {
  if (!appSidebarActive()) return;
  if (!appSidebarIsMobile()) appSidebarCloseMobile(false);
  const nav = document.getElementById('appNav'), scroll = nav?.querySelector?.('.appSidebarScroll');
  if (scroll) scroll.scrollTop = appSidebar.navScroll;
  if (!document.activeElement?.isConnected || document.activeElement === document.body) appSidebarRestoreKey(nav, appSidebar.navFocus);
  appSidebar.navFocus = null;
  appSidebarSyncDom(); appSidebarRenderMobile(); appSidebarRenderAccount();
  if (appSidebar.mobileOpen) appSidebarLockBackground(true);
}
function appSidebarHideTip() {
  clearTimeout(appSidebar.tipTimer); appSidebar.tipTimer = null;
  appSidebar.tooltip?.remove(); appSidebar.tooltip = null;
  const el = appSidebar.tooltipTrigger;
  if (el?.getAttribute) {
    const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== 'appSidebarTooltip');
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' ')); else el.removeAttribute('aria-describedby');
  }
  appSidebar.tooltipTrigger = null;
}
function appSidebarShowTip(el) {
  appSidebarHideTip();
  if (!appSidebarActive() || appSidebarIsMobile() || !appSidebarCollapsed() || !el?.isConnected) return;
  const tip = document.createElement('div'); tip.id = 'appSidebarTooltip'; tip.className = 'appSidebarTooltip'; tip.setAttribute('role', 'tooltip'); tip.textContent = el.dataset.sidebarTip;
  document.body.appendChild(tip); appSidebar.tooltip = tip; appSidebar.tooltipTrigger = el;
  el.setAttribute('aria-describedby', [el.getAttribute('aria-describedby'), tip.id].filter(Boolean).join(' '));
  const r = el.getBoundingClientRect(), h = typeof innerHeight === 'number' ? innerHeight : 800;
  tip.style.left = Math.min(r.right + 12, appSidebarWidth() - tip.offsetWidth - 10) + 'px';
  tip.style.top = Math.max(8, Math.min(r.top + (r.height - tip.offsetHeight) / 2, h - tip.offsetHeight - 8)) + 'px';
}
function appSidebarKeydown(e) {
  if (e.isComposing || !appSidebarActive()) return;
  if (e.key === 'Escape' && appSidebar.accountHTML) { e.preventDefault(); e.stopImmediatePropagation(); appSidebarCloseAccount(true); return; }
  if (e.key === 'Escape' && appSidebar.mobileOpen) { e.preventDefault(); e.stopImmediatePropagation(); appSidebarCloseMobile(); return; }
  if (e.key === 'Escape' && appSidebar.tooltip) { appSidebarHideTip(); return; }
  if (e.key !== 'Tab' || !appSidebar.mobileOpen) return;
  const items = appSidebar.accountHTML ? appSidebarFocusables(document.getElementById('appSidebarAccountRoot')) : appSidebarFocusables(document.getElementById('appSidebarMobilePanel'));
  const first = items[0], last = items[items.length - 1];
  if (!first) return;
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
// Native event dispatch can drain microtasks between listeners. Wait for the original
// navigation/menu listener, but never focus a new identity from an old click.
function appSidebarAfterClick(callback) {
  const owner = session?.user?.id, generation = appSidebar.generation;
  setTimeout(() => { if (appSidebarActive() && owner === session.user.id && generation === appSidebar.generation) callback(); }, 0);
}
// Do not stop propagation: original routing and editor guards still own the action.
document.addEventListener('click', e => {
  if (!appSidebarActive()) return;
  const el = e.target.closest?.('[data-action]'), action = el?.dataset.action;
  const owned = e.target.closest?.('#appNav, #appSidebarDialogRoot, #appSidebarAccountRoot');
  if (owned && ['switch-tab', 'switch-account', 'add-account', 'logout', 'open-profile-modal', 'open-data-scope', 'open-export-center', 'new-trade'].includes(action)) {
    const wasMobile = appSidebar.mobileOpen;
    appSidebarCloseMobile(false); appSidebarCloseAccount();
    if (wasMobile && action === 'switch-tab') appSidebarAfterClick(() => {
      if (tab !== el.dataset.tab || propFirmEditor?.pendingLeave) return;
      const heading = document.querySelector('.pageTitle');
      const target = appSidebarVisible(heading) ? heading : document.getElementById('tabBody');
      if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
    });
  } else if (userMenuOpen && !e.target.closest?.('#appSidebarAccountRoot, [data-action="toggle-user-menu"]')) appSidebarCloseAccount();
}, true);
document.addEventListener('click', e => {
  const el = e.target.closest?.('[data-action]'); if (!el || !appSidebarActive()) return;
  const a = el.dataset.action;
  if (a === 'sidebar-toggle') { e.preventDefault(); appSidebarToggle(); }
  else if (a === 'sidebar-summary') { e.preventDefault(); appSidebarToggleSummary(); }
  else if (a === 'sidebar-open') { e.preventDefault(); appSidebarOpenMobile(el); }
  else if (a === 'sidebar-close') { e.preventDefault(); appSidebarCloseMobile(); }
  else if (a === 'toggle-user-menu' && el.hasAttribute('data-sidebar-account')) appSidebarAfterClick(() => {
    if (userMenuOpen) appSidebarFocusables(document.getElementById('appSidebarAccountRoot'))[0]?.focus({ preventScroll: true });
  });
});
document.addEventListener('keydown', appSidebarKeydown, true);
document.addEventListener('focusin', e => {
  if (appSidebar.accountHTML && !e.target.closest?.('#appSidebarAccountRoot, [data-sidebar-account]')) appSidebarCloseAccount();
  const el = e.target.closest?.('#appNav [data-sidebar-tip]'); if (el) appSidebarShowTip(el);
});
document.addEventListener('focusout', () => appSidebarHideTip());
document.addEventListener('pointerover', e => {
  const el = e.target.closest?.('#appNav [data-sidebar-tip]'); if (!el || el.contains(e.relatedTarget)) return;
  clearTimeout(appSidebar.tipTimer); appSidebar.tipTimer = setTimeout(() => appSidebarShowTip(el), 140);
});
document.addEventListener('pointerout', e => { if (e.target.closest?.('[data-sidebar-tip]') && !e.target.closest('[data-sidebar-tip]').contains(e.relatedTarget)) appSidebarHideTip(); });
function appSidebarResize() {
  appSidebarHideTip();
  const previous = document.documentElement.dataset.sidebarState, next = appSidebarCollapsed() ? 'collapsed' : 'expanded';
  if (previous && previous !== next) appSidebarCloseAccount();
  if (!appSidebarIsMobile()) appSidebarCloseMobile();
  appSidebarSyncDom(); appSidebarRenderAccount();
}
window.addEventListener('resize', appSidebarResize);

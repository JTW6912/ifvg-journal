/* ============================================================
   多账号切换
   登录过的账号把 Supabase 会话（access / refresh token）记在 localStorage 的 journal_accounts 里，
   左上角头像 / 右上角账号菜单点一下就用 setSession 换过去，然后整页刷新——内存里的状态全清掉，
   不会把上一个账号的交易、筛选、编辑器带进下一个账号。

   - 只记「记住我」登录的账号（会话本来就在 localStorage 里）；没勾的那次登录不落盘，切走就没了
   - refresh token 每次刷新都会轮换，旧的再用会失效，所以当前账号的 token 一变就回写（loadProfile / TOKEN_REFRESHED）
   - 「添加账号」不能调 signOut：哪怕 scope=local 服务器也会把这次会话吊销，存下来的 token 就废了。
     改成直接删掉本地的会话再刷新，登录页上列着已存的账号，可以随时点回来
   - 草稿、筛选这些全局 localStorage 键是跟账号走的：切走时收进 journal_acct_stash_<id>，切回来再放出来
   ============================================================ */
const ACCOUNTS_KEY = "journal_accounts";
const ACCOUNT_STASH_PREFIX = "journal_acct_stash_";
const ACCOUNT_STASH_KEYS = ["journal_trade_draft", "journal_trade_edit_draft", "journal_review_draft",
  "journal_active_filters", "journal_analysis_filters", "journal_data_scope_off"];
const ACCOUNT_PREFILL_KEY = "journal_acct_prefill";   // sessionStorage：已过期的账号点进登录页时预填的邮箱
let accountSwitching = false;
let acctPopOpen = false;

function loadAccounts() {
  try {
    const list = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
    return Array.isArray(list) ? list.filter((a) => a && a.id && a.email) : [];
  } catch (e) { return []; }
}
function saveAccounts(list) {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)); } catch (e) {}
}
function authStorageKey() { return sb && sb.auth && sb.auth.storageKey; }
/* 当前会话是不是「记住我」登录的：看 Supabase 把它写在 localStorage 还是 sessionStorage */
function sessionIsRemembered() {
  const k = authStorageKey();
  if (!k) return true;
  try { return localStorage.getItem(k) !== null; } catch (e) { return false; }
}
function rememberAccount(s) {
  if (!s || !s.user || !s.refresh_token || accountSwitching) return;
  if (!sessionIsRemembered()) return;
  const list = loadAccounts();
  const old = list.find((a) => a.id === s.user.id) || {};
  const name = currentProfile && currentProfile.id === s.user.id ? currentProfile.display_name || "" : old.name || "";
  const entry = { id: s.user.id, email: s.user.email || old.email, name, at: s.access_token, rt: s.refresh_token, last: Date.now() };
  saveAccounts([entry, ...list.filter((a) => a.id !== s.user.id)]);
}
function forgetAccount(id) {
  saveAccounts(loadAccounts().filter((a) => a.id !== id));
  try { localStorage.removeItem(ACCOUNT_STASH_PREFIX + id); } catch (e) {}
}
/* 收起 / 放出跟账号走的那几个 localStorage 键 */
function stashAccountState(id) {
  const bag = {};
  try {
    ACCOUNT_STASH_KEYS.forEach((k) => { const v = localStorage.getItem(k); if (v !== null) bag[k] = v; localStorage.removeItem(k); });
    if (id) localStorage.setItem(ACCOUNT_STASH_PREFIX + id, JSON.stringify(bag));
  } catch (e) {}
}
function restoreAccountState(id) {
  try {
    const bag = JSON.parse(localStorage.getItem(ACCOUNT_STASH_PREFIX + id) || "null");
    if (bag) Object.keys(bag).forEach((k) => { if (ACCOUNT_STASH_KEYS.includes(k)) localStorage.setItem(k, bag[k]); });
    localStorage.removeItem(ACCOUNT_STASH_PREFIX + id);
  } catch (e) {}
}
/* 离开当前账号之前：没存完的东西先存掉，再把它的最新会话记进列表 */
async function leaveCurrentAccount() {
  flushAnalysisPrefs(); flushReviewPrefs();
  if (editingReview && !viewingUserId) { await flushReviewSave(); await flushReviewFolds(); }
  // 刷新时 beforeunload 还会往草稿键里写一遍，先把编辑器 / 表单的引用放掉
  editingReview = null; editingTrade = null;
  let cur = session;
  try { const { data } = await sb.auth.getSession(); if (data && data.session) cur = data.session; } catch (e) {}
  if (cur) rememberAccount(cur);
  accountSwitching = true;
  stashAccountState(cur && cur.user ? cur.user.id : null);
  try { sessionStorage.removeItem(NAV_KEY); } catch (e) {}
}
function showSwitchingScreen() {
  acctPopOpen = false; userMenuOpen = false;
  renderAcctPop();
  document.getElementById("app").innerHTML = `<div class="loading">${esc(T("account.switching"))}</div>`;
}
async function switchToAccount(id) {
  if (!sb || accountSwitching) return;
  const target = loadAccounts().find((a) => a.id === id);
  if (!target) return;
  if (session && session.user.id === id) { acctPopOpen = false; userMenuOpen = false; render(); return; }
  if (!target.rt) { goReloginAccount(target); return; }
  const fromId = session ? session.user.id : null;
  if (session) await leaveCurrentAccount(); else accountSwitching = true;
  showSwitchingScreen();
  rememberMe = true;   // 新会话也写进 localStorage
  if (sb.auth.stopAutoRefresh) sb.auth.stopAutoRefresh();
  let error = null, data = null;
  try { ({ data, error } = await sb.auth.setSession({ access_token: target.at, refresh_token: target.rt })); }
  catch (e) { error = e; }
  if (error || !data || !data.session) {
    console.error(error);
    const offline = error && (error.name === "AuthRetryableFetchError" || /fetch|network/i.test(error.message || ""));
    // token 用不了了（过期 / 在别处退出过）：留着这个账号但去掉 token，点它就回登录页预填邮箱。断网不算
    if (!offline) saveAccounts(loadAccounts().map((a) => (a.id === id ? { ...a, at: null, rt: null } : a)));
    if (fromId) restoreAccountState(fromId);
    if (fromId) { const back = loadAccounts().find((a) => a.id === fromId); if (back && back.rt) await sb.auth.setSession({ access_token: back.at, refresh_token: back.rt }).catch(() => {}); }
    alert(offline ? T("auth.err.network") : T("account.expired", { email: target.email }));
    location.reload();
    return;
  }
  restoreAccountState(id);
  location.reload();
}
/* 去登录页再登一个号；当前账号留在列表里 */
async function addAccount() {
  if (!sb || accountSwitching) return;
  const k = authStorageKey();
  if (!k) return;
  await leaveCurrentAccount();
  showSwitchingScreen();
  if (sb.auth.stopAutoRefresh) sb.auth.stopAutoRefresh();
  try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {}
  location.reload();
}
/* 已过期的账号：回登录页，邮箱预填好 */
async function goReloginAccount(acct) {
  try { sessionStorage.setItem(ACCOUNT_PREFILL_KEY, acct.email); } catch (e) {}
  if (session) { await addAccount(); return; }
  authPrefillEmail = acct.email; authScreenMode = "login"; authError = ""; render();
  const pw = document.getElementById("authPassword"); if (pw) pw.focus();
}
function takeAccountPrefill() {
  try { const v = sessionStorage.getItem(ACCOUNT_PREFILL_KEY); sessionStorage.removeItem(ACCOUNT_PREFILL_KEY); return v || ""; } catch (e) { return ""; }
}
let authPrefillEmail = takeAccountPrefill();

/* ---------- 界面 ---------- */
function accountInitial(a) {
  const s = ((a && (a.name || a.email)) || "?").trim();
  return esc(Array.from(s)[0].toUpperCase());
}
function accountHue(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
function accountAvatarHtml(a, cls) {
  return `<span class="acctAvatar ${cls || ""}" style="--acctHue:${accountHue(a.id)}">${accountInitial(a)}</span>`;
}
/* 账号列表：头像浮层、右上角账号菜单、登录页三处共用 */
function accountRowsHtml(opts) {
  const curId = session && session.user ? session.user.id : null;
  let list = loadAccounts();
  if (curId && !list.some((a) => a.id === curId)) {
    // 这次没勾「记住我」：列表里没有，也照样把自己显示在第一行
    list = [{ id: curId, email: session.user.email, name: (currentProfile && currentProfile.display_name) || "" }, ...list];
  }
  if (opts && opts.othersOnly) list = list.filter((a) => a.id !== curId);
  return list.map((a) => {
    const isCur = a.id === curId;
    const stale = !isCur && !a.rt;
    return `<div class="acctRow${isCur ? " isCur" : ""}">
      <button class="acctPick" data-action="switch-account" data-id="${esc(a.id)}" title="${esc(isCur ? T("account.current") : stale ? T("account.relogin") : T("account.switchTo", { email: a.email }))}">
        ${accountAvatarHtml(a)}
        <span class="acctText"><b>${esc(a.name || a.email.split("@")[0])}</b><small>${esc(a.email)}${stale ? ` · ${esc(T("account.relogin"))}` : ""}</small></span>
        ${isCur ? `<span class="acctCheck">${ICONS.check}</span>` : ""}
      </button>
      ${isCur ? "" : `<button class="acctForget" data-action="forget-account" data-id="${esc(a.id)}" title="${esc(T("account.forget"))}" aria-label="${esc(T("account.forget"))}">${ICONS.x}</button>`}
    </div>`;
  }).join("");
}
/* 左上角头像点开的浮层。侧边栏有 backdrop-filter，里面的 fixed 元素会被它裁掉，所以挂在 body 下面 */
function renderAcctPop() {
  let root = document.getElementById("acctPopRoot");
  const brand = document.querySelector(".navBrand");
  const show = acctPopOpen && session && brand && brand.offsetParent !== null;
  if (!show) { if (root) root.innerHTML = ""; return; }
  if (!root) { root = document.createElement("div"); root.id = "acctPopRoot"; document.body.appendChild(root); }
  const r = brand.getBoundingClientRect();
  root.innerHTML = `<div class="acctPop" style="top:${Math.round(r.bottom - 10)}px;left:${Math.round(r.left)}px;">
    <div class="acctPopLabel">${esc(T("account.switch"))}</div>
    <div class="acctList">${accountRowsHtml()}</div>
    <div class="acctPopSep"></div>
    <button class="acctPopItem" data-action="add-account">${ICONS.plus}<span>${esc(T("account.add"))}</span></button>
    <button class="acctPopItem" data-action="logout">${ICONS.user}<span>${esc(T("auth.logout"))}</span></button>
  </div>`;
}
/* 登录页上方：已登录过的账号，点一下直接进去 */
function authSavedAccountsHtml() {
  if (!loadAccounts().length) return "";
  return `<div class="authCard acctAuthCard">
    <div class="acctPopLabel">${esc(T("account.saved"))}</div>
    <div class="acctList">${accountRowsHtml()}</div>
  </div>`;
}

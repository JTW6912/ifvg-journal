/* ============================================================
   CONFIG — 真实值在 config.js（已 gitignore，不进仓库）
   本地开发：复制 config.example.js 为 config.js 并填入你的
   Supabase 后台 → Settings → API → Project URL / anon public key
   ============================================================ */
const SUPABASE_URL = window.IFVG_CONFIG?.url || "";
const SUPABASE_ANON_KEY = window.IFVG_CONFIG?.key || "";

function getStoredApiConfig() {
  try {
    const raw = localStorage.getItem("journal_api_config");
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}
function currentApiConfig() {
  const stored = getStoredApiConfig();
  return {
    url: (stored && stored.url) || SUPABASE_URL,
    key: (stored && stored.key) || SUPABASE_ANON_KEY,
  };
}
let sb = null;
let rememberMe = true;
const authStorageAdapter = {
  getItem: (key) => {
    try { return localStorage.getItem(key) ?? sessionStorage.getItem(key); } catch (e) { return null; }
  },
  setItem: (key, value) => {
    try {
      if (rememberMe) { localStorage.setItem(key, value); sessionStorage.removeItem(key); }
      else { sessionStorage.setItem(key, value); localStorage.removeItem(key); }
    } catch (e) {}
  },
  removeItem: (key) => {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch (e) {}
  },
};
function initSupabaseClient() {
  const cfg = currentApiConfig();
  sb = cfg.url && cfg.url.startsWith("http") && cfg.key
    ? supabase.createClient(cfg.url, cfg.key, { auth: { storage: authStorageAdapter, persistSession: true, autoRefreshToken: true } })
    : null;
}
initSupabaseClient();


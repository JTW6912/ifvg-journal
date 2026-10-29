// Generate real IFVG shell markup from an isolated VM and a synthetic identity.
// No bootstrap, Supabase client, account storage or network is used.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../../..');
const { makeContext, ENGINE_FILES } = require(path.join(root, 'test/load.js'));
const ctx = makeContext(ENGINE_FILES);
const app = {};
ctx.sandbox.document.getElementById = id => id === 'app' ? app : null;
ctx.sandbox.document.documentElement.style = { setProperty() {}, removeProperty() {}, getPropertyValue() { return ''; } };
ctx.sandbox.getComputedStyle = () => ({ getPropertyValue() { return ''; } });
ctx.sandbox.document.documentElement.dataset.layout = 'modern';
ctx.sandbox.document.documentElement.dataset.palette = 'graphite';
ctx.run(`
  authLoading = false; session = { user: { id: 'synthetic-owner', email: 'demo@example.invalid' } };
  currentProfile = { id: 'synthetic-owner', display_name: 'Demo', active: true, role: 'user' };
  tab = 'prop'; propView = 'overview'; recordMode = 'live';
  function saveNav() {}
  patchAppShell = regions => { globalThis.__prototypeRegions = regions; };
  renderModal = renderSecondaryModals = renderReviewEditor = renderExportCenter = renderAcctPop = () => {};
`);
const shells = {};
for (const locale of ['zh', 'en']) {
  shells[locale] = {};
  for (const theme of ['light', 'dark']) {
    ctx.set('lang', locale);
    ctx.sandbox.document.documentElement.dataset.theme = theme;
    ctx.run('render()');
    const r = ctx.sandbox.__prototypeRegions;
    if (!r || !r.appNav.includes('prop')) throw new Error('Expected actual Prop shell');
    const top = r.tabBody.split('<div class="emptyState')[0];
    shells[locale][theme] = { header: r.appHeader, nav: r.appNav, tabs: top };
  }
}
const dest = path.resolve(__dirname, '../artifact/assets/shell-snapshot.js');
fs.writeFileSync(dest, '// Synthetic identity; generated from the actual app renderer.\nwindow.PROTOTYPE_SHELL = '+JSON.stringify(shells)+';\n');
console.log('Generated four real-shell variants with synthetic identity; no live initialization.');

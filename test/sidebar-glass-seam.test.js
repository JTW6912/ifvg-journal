const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Glass scrolled header feathers its sidebar boundary within the existing content gutter', () => {
  const css = fs.readFileSync(path.join(__dirname, '../theme-modern.css'), 'utf8');
  const selector = '[data-layout="modern"][data-glass] #appHeader::after';
  const rule = css.slice(css.indexOf(selector)).match(/^[^{]+\{([^}]+)\}/)[1];
  const title = css.match(/\[data-layout="modern"\]\[data-glass\]\[data-lg-scrolled\] \.pageTitleMini\{([^}]+)\}/)[1];
  const gutter = title.match(/left:calc\(var\(--sideW,[^)]+\) \+ (clamp\([^)]+\))\)/)[1];
  const mask = `linear-gradient(to right,transparent,#000 ${gutter})`;
  assert.ok(rule.includes(`-webkit-mask-image:${mask}`), 'WebKit feather must cover only the existing gutter');
  assert.ok(rule.includes(`mask-image:${mask}`), 'standard feather must cover only the existing gutter');
  assert.match(rule, /left:var\(--sideW,244px\)/, 'do not cover the sidebar itself');
  assert.match(rule, /pointer-events:none/);
  assert.match(rule, /opacity:0/);
  assert.match(rule, /background:linear-gradient\(180deg/);
  assert.match(css, /\[data-layout="modern"\]\[data-glass\]\[data-lg-scrolled\] #appHeader::after\{opacity:1;\}/);
});

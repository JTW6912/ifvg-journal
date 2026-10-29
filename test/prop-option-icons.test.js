const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeContext, ENGINE_FILES } = require('./load');
const plain = v => JSON.parse(JSON.stringify(v));
function setup() {
  const c = makeContext(ENGINE_FILES, { URL });
  c.run('lang = "zh"');
  c.set('currentProfile', { role: 'admin', active: true });
  c.set('session', { user: { id: 'admin-test' } });
  c.sandbox.document.documentElement.dataset.layout = 'modern';
  return c;
}
function call(c, fn, ...args) { c.sandbox.__args = args; return c.run(`${fn}(...__args)`); }

test('共享图标键识别中英别名，不改写原选项，字段之间隔离', () => {
  const c = setup();
  assert.equal(call(c, 'propIconKey', 'payoutMethods', ' 银行转账 '), call(c, 'propIconKey', 'payoutMethods', 'Bank transfer'));
  assert.equal(call(c, 'propIconKey', 'kycRequirements', '护照'), call(c, 'propIconKey', 'kycRequirements', 'Passport'));
  assert.equal(call(c, 'propIconKey', 'platforms', 'MY CUSTOM'), call(c, 'propIconKey', 'platforms', 'my custom'));
  assert.notEqual(call(c, 'propIconKey', 'paymentMethods', 'Bank transfer'), call(c, 'propIconKey', 'payoutMethods', 'Bank transfer'));
  assert.equal(call(c, 'propIconKey', '__proto__', 'bad'), '');
  assert.equal(call(c, 'propIconKey', 'platforms', '__proto__'), 'platforms:__proto__');
});

test('图片链接只允许安全HTTPS或本地静态资产，不接受脚本、数据URI、凭证和本机地址', () => {
  const c = setup();
  for (const url of ['https://icons.example.com/mark.svg', '/img/prop/lucid.webp', '/img/prop-options/sample.svg']) assert.equal(call(c, 'propIconUrl', url), url);
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,x', '//icons.example.com/a.svg', 'http://icons.example.com/a.png', 'https://user:secret@icons.example.com/a.svg', 'https://localhost/a.png', 'https://127.0.0.1/a.png', 'https://[::1]/a.svg', '/config.js', '/img/prop/../secret.svg', 'https://a.example.com/a\" onerror=\"x', 'https://a.example.com/\\x', 'https://a.example.com:8080/x']) assert.equal(call(c, 'propIconUrl', url), '', url);
});

test('内置图标使用可信SVG，未知品牌默认文字，非法配置安全退回', () => {
  const c = setup();
  const passport = call(c, 'propChoiceIconHtml', 'kycRequirements', 'Passport');
  assert.match(passport, /<svg/);
  assert.match(passport, /currentColor/);
  assert.equal(call(c, 'propChoiceIconHtml', 'platforms', 'Tradovate'), '');
  c.set('propOptionIcons', [{ id: 'platforms:custom', field: 'platforms', option_key: 'custom', label: 'Custom', kind: 'url', value: 'javascript:bad' }]);
  assert.equal(call(c, 'propChoiceIconHtml', 'platforms', 'Custom'), '');
  const row = call(c, 'propIconRow', 'platforms', 'Custom', 'url', 'https://icons.example.com/mark.svg');
  c.set('propOptionIcons', [row]);
  const html = call(c, 'propChoiceIconHtml', 'platforms', 'CUSTOM');
  assert.match(html, /referrerpolicy="no-referrer"/);
  assert.match(html, /alt=""/);
  assert.doesNotMatch(html, /onerror=/);
  assert.equal(call(c, 'propIconRow', 'platforms', 'Custom', 'builtin', '<svg>bad'), null);
});

test('同名自定义图标跨公司复用，不改变各公司的多选数组', () => {
  const c = setup();
  const firms = [{ id: 'a', platforms: ['Shared', 'A only'] }, { id: 'b', platforms: ['Shared'] }];
  c.set('propFirms', firms);
  c.set('propOptionIcons', [call(c, 'propIconRow', 'platforms', 'Shared', 'builtin', 'globe')]);
  for (const f of firms) assert.match(call(c, 'propFirmInfoHtml', f, false), /propOptionIcon/);
  assert.deepEqual(plain(c.run('propFirms')), firms);
  c.sandbox.document.documentElement.dataset.layout = 'classic';
  assert.doesNotMatch(call(c, 'propFirmInfoHtml', firms[0], false), /propOptionIcon/);
});

test('图标配置导出与校验往返；旧目录不附带图标时不生成空配置', () => {
  const c = setup();
  c.set('propFirms', [{ id: 'a', name: 'A', platforms: ['Custom, Suite'] }]);
  c.set('propPlans', []);
  c.set('propOptionIcons', [{ ...call(c, 'propIconRow', 'platforms', 'Custom, Suite', 'builtin', 'chart'), revision: 3 }]);
  const exported = c.run('propCatalogExport()');
  assert.equal(exported.optionIcons.length, 1);
  assert.equal(exported.optionIcons[0].revision, undefined);
  const checked = call(c, 'propValidateCatalog', plain(exported));
  assert.equal(checked.errors.length, 0);
  assert.equal(checked.catalog.optionIcons[0].label, 'Custom, Suite');
  const old = call(c, 'propValidateCatalog', { firms: [{ id: 'a', name: 'A' }], plans: [] });
  assert.equal(Object.hasOwn(old.catalog, 'optionIcons'), false);
  const bad = call(c, 'propValidateCatalog', { firms: [], plans: [], optionIcons: [{ field: 'platforms', label: 'x', kind: 'url', value: 'javascript:bad' }] });
  assert.equal(bad.catalog, null);
});

test('原子保存只发送本次图标改动，成功后再更新全局配置；失败不发布部分结果', async () => {
  const c = setup();
  const row = call(c, 'propIconRow', 'platforms', 'Shared', 'builtin', 'globe');
  let sent;
  c.sandbox.__client = { rpc: async (name, args) => { sent = { name, args: plain(args) }; return { data: { icons: [{ ...row, revision: 1 }] }, error: null }; } };
  c.run('sb = __client');
  assert.equal(await call(c, 'propSaveFirmWithIcons', { id: 'a', name: 'A' }, [{ ...row, expected_revision: 0 }]), true);
  assert.equal(sent.name, 'prop_save_firm_with_icons');
  assert.equal(sent.args.icon_changes.length, 1);
  assert.equal(c.run('propOptionIcons[0].revision'), 1);
  const before = c.run('JSON.stringify(propOptionIcons)');
  c.sandbox.__client.rpc = async () => ({ error: { message: 'icon conflict' } });
  assert.equal(await call(c, 'propSaveFirmWithIcons', { id: 'a', name: 'A' }, [row]), false);
  assert.equal(c.run('JSON.stringify(propOptionIcons)'), before);
  c.sandbox.__client.rpc = async () => { throw new Error('offline'); };
  assert.equal(await call(c, 'propSaveFirmWithIcons', { id: 'a', name: 'A' }, [row]), false);
  assert.equal(c.run('JSON.stringify(propOptionIcons)'), before);
});

test('普通用户、禁用管理员和只读上下文不能提交共享配置', async () => {
  const c = setup();
  c.sandbox.__client = { rpc() { throw new Error('must not call'); } };
  c.run('sb = __client');
  for (const profile of [{ role: 'user' }, { role: 'admin', active: false }]) {
    c.set('currentProfile', profile);
    assert.equal(await call(c, 'propSaveFirmWithIcons', { id: 'a', name: 'A' }, []), false);
  }
  c.set('currentProfile', { role: 'admin' }); c.set('viewingUserId', 'other');
  assert.equal(await call(c, 'propSaveFirmWithIcons', { id: 'a', name: 'A' }, []), false);
});

test('迁移可重复执行且只授权公共配置，不触碰个人数据', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261028000000_prop_option_icons.sql'), 'utf8');
  assert.match(sql, /create table if not exists public\.prop_option_icons/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /for select to authenticated/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /expected_revision/);
  assert.match(sql, /revoke all on function/i);
  assert.doesNotMatch(sql, /(?:update|alter table|create policy[^;]*on)\s+(?:public\.)?(?:trades|prop_accounts|prop_entries|journal_reviews)/i);
});

test('导入RPC异常保留当前目录，并对缺失函数提示迁移', async () => {
  const c = setup(); c.set('propFirms', [{ id: 'a', name: 'A' }]);
  c.sandbox.__client = { rpc: async () => { throw new Error('offline'); } };
  c.run('sb = __client');
  assert.equal(await call(c, 'propImportCatalog', { firms: [], plans: [] }, {}), false);
  assert.equal(c.run('propFirms[0].id'), 'a');
  c.sandbox.__client.rpc = async () => ({ error: { code: 'PGRST202', message: 'missing function' } });
  assert.equal(await call(c, 'propImportCatalog', { firms: [], plans: [] }, {}), false);
  assert.equal(c.run('dbOutdated'), true);
});

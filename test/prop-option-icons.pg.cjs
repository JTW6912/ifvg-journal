// Optional real Postgres/WASM checks. Never reads config.js, environment credentials or a remote database.
// PGLITE_MODULE=/tmp/ifvg-pg-validation/node_modules/@electric-sql/pglite node test/prop-option-icons.pg.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const root = path.join(__dirname, '..');
const admin = '00000000-0000-4000-8000-000000000001';
const user = '00000000-0000-4000-8000-000000000002';
const disabled = '00000000-0000-4000-8000-000000000003';
(async () => {
  const db = new PGlite(); // No dataDir means a disposable, in-memory database.
  let checks = 0;
  try {
    await db.exec(`
      create role authenticated; create role anon;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table public.profiles(id uuid primary key, role text, active boolean default true);
      create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select coalesce((select role='admin' from profiles where id=auth.uid()), false) $$;
      insert into auth.users values ('${admin}'), ('${user}'), ('${disabled}');
      insert into profiles values ('${admin}', 'admin', true), ('${user}', 'user', true), ('${disabled}', 'admin', false);
      grant usage on schema public, auth to authenticated, anon;
      grant select on profiles to authenticated;
    `);
    await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/20261024000000_prop.sql'), 'utf8'));
    const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261028000000_prop_option_icons.sql'), 'utf8');
    await db.exec(migration); await db.exec(migration); checks++;
    // Supabase sets these default grants; reproduce them for its pre-existing catalog tables.
    await db.exec(`grant select,insert,update,delete on prop_firms, prop_plans, prop_accounts, prop_entries to authenticated;
      insert into prop_accounts(id,user_id,firm_name) values ('private-account','${user}','Synthetic owner-only account');`);
    async function as(id, role = 'authenticated') {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
      await db.exec('set role ' + role);
    }
    const icon = (kind = 'builtin', value = 'globe', revision = 0) => ({ id: 'platforms:shared', field: 'platforms', option_key: 'shared', label: 'Shared', kind, value, expected_revision: revision });
    const firm = (name = 'Synthetic Firm') => ({ id: 'sample', name, website: '', logo: '', sort_order: 0, data: { notes: 'Preserved', platforms: ['Shared'] } });
    const save = (f, icons) => db.query('select public.prop_save_firm_with_icons($1::jsonb,$2::jsonb) as saved', [JSON.stringify(f), JSON.stringify(icons)]);
    const rows = async table => (await db.query('select * from ' + table + ' order by id')).rows;
    await as(admin);
    const first = await save(firm(), [icon()]);
    assert.equal(first.rows[0].saved.icons[0].revision, 1); checks++;
    assert.equal((await rows('prop_accounts')).length, 0); checks++;
    await as(user);
    assert.equal((await rows('prop_option_icons')).length, 1);
    await assert.rejects(save(firm('Unauthorized'), []), /admin only/);
    assert.equal((await db.query("update prop_option_icons set value='bank' where id='platforms:shared' returning *")).rows.length, 0);
    assert.equal((await rows('prop_accounts')).length, 1); checks++;
    await as(disabled);
    await assert.rejects(save(firm('Disabled'), []), /admin only/); checks++;
    await as('', 'anon');
    await assert.rejects(rows('prop_option_icons'), /permission denied/);
    await assert.rejects(save(firm(), []), /permission denied/); checks++;
    await as(admin);
    const beforeFirm = await rows('prop_firms'), beforeIcons = await rows('prop_option_icons');
    await assert.rejects(save(firm('Should not publish'), [icon('builtin', 'untrusted-svg', 1)]), /check constraint/);
    assert.deepEqual(await rows('prop_firms'), beforeFirm); assert.deepEqual(await rows('prop_option_icons'), beforeIcons); checks++;
    await assert.rejects(save(firm(''), [icon('builtin', 'bank', 1)]), /invalid firm/);
    assert.deepEqual(await rows('prop_firms'), beforeFirm); assert.deepEqual(await rows('prop_option_icons'), beforeIcons); checks++;
    await save(firm('Second revision'), [icon('builtin', 'bank', 1)]);
    assert.equal((await rows('prop_option_icons'))[0].revision, 2);
    await assert.rejects(save(firm('Stale writer'), [icon('builtin', 'coin', 1)]), /prop_icon_conflict/);
    assert.equal((await rows('prop_firms'))[0].name, 'Second revision'); checks++;
    await assert.rejects(save({ ...firm('Accidental overwrite'), create_only: true }, [icon('builtin', 'coin', 2)]), /prop_firm_conflict/);
    assert.equal((await rows('prop_firms'))[0].name, 'Second revision');
    assert.equal((await rows('prop_option_icons'))[0].revision, 2); checks++;
    const importCatalog = payload => db.query('select public.prop_import_catalog_with_icons($1::jsonb,$2::jsonb)', [JSON.stringify(payload), '{}']);
    await assert.rejects(importCatalog({}), /payload needs firms/);
    assert.equal((await rows('prop_firms'))[0].name, 'Second revision'); checks++;
    await importCatalog({ firms: [{ id: 'sample', name: 'Legacy JSON' }], plans: [] });
    assert.equal((await rows('prop_option_icons'))[0].revision, 2); checks++;
    await assert.rejects(importCatalog({ firms: [{ id: 'bad', name: 'Must roll back' }], plans: [], optionIcons: [icon('url', 'javascript:bad')] }), /check constraint/);
    assert.equal((await rows('prop_firms'))[0].id, 'sample'); checks++;
    await importCatalog({ firms: [{ id: 'sample', name: 'With icons' }], plans: [], optionIcons: [icon('url', 'https://icons.example.com/mark.svg')] });
    assert.equal((await rows('prop_option_icons'))[0].revision, 3);
    assert.equal((await rows('prop_option_icons'))[0].kind, 'url'); checks++;
    for (const value of ['http://icons.example.com/x', 'data:image/svg+xml,x', 'https://user:pass@icons.example.com/x', 'https://127.0.0.1/x', '/img/prop/../secret.svg', 'https://icons.example.com/x" onerror="bad']) {
      await assert.rejects(save(firm(), [icon('url', value, 3)]), /check constraint/, value);
    }
    checks++;
    console.log(JSON.stringify({ engine: 'PGlite/Postgres in-memory', checks, migrationRuns: 2, productionConnected: false, result: 'passed' }, null, 2));
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

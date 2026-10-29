// Optional offline merge verifier: real repository migrations + real history-save code.
// Uses only an in-memory Postgres/WASM instance. No config, URL, real account or network DB.
// PGLITE_MODULE=/tmp/ifvg-pg-validation/node_modules/@electric-sql/pglite node test/prop-merged-schema.pg.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const { makeContext, ENGINE_FILES } = require('./load');
const admin = '00000000-0000-4000-8000-000000000001';
const owner = '00000000-0000-4000-8000-000000000002';
const disabled = '00000000-0000-4000-8000-000000000003';
const plain = v => JSON.parse(JSON.stringify(v));
(async () => {
  const db = new PGlite();
  let checks = 0;
  try {
    await db.exec(`create role authenticated; create role anon;
      create schema auth; create table auth.users(id uuid primary key, email text);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to authenticated, anon;
      alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, anon;
      alter default privileges in schema public grant usage, select on sequences to authenticated;`);
    const dir = path.join(__dirname, '../supabase/migrations');
    const migrations = fs.readdirSync(dir).filter(n => n.endsWith('.sql')).sort();
    for (const file of migrations) await db.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
    checks++;
    const policies = async () => (await db.query("select tablename,policyname,cmd,qual,with_check from pg_policies where schemaname='public' and tablename <> 'prop_option_icons' order by tablename,policyname")).rows;
    const beforePolicies = await policies();
    await db.exec(fs.readFileSync(path.join(dir, '20261028000000_prop_option_icons.sql'), 'utf8'));
    assert.deepEqual(await policies(), beforePolicies); checks++;
    await db.exec(fs.readFileSync(path.join(dir, '20261026010000_admin_trade_counts_definer.sql'), 'utf8'));
    assert.deepEqual(await policies(), beforePolicies); checks++;
    await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/checks/prop_merge_readiness.sql'), 'utf8')); checks++;
    await db.exec(`insert into auth.users values ('${admin}','admin@example.invalid'),('${owner}','owner@example.invalid'),('${disabled}','disabled@example.invalid');
      update profiles set role='admin' where id in ('${admin}','${disabled}');
      update profiles set active=false where id='${disabled}';
      insert into prop_accounts(id,user_id,firm_name,bought_on,status,events,updated_at,balance,balance_peak,balance_on,note)
      values ('history-synthetic','${owner}','Synthetic firm','2026-10-01','funded',
        '[{"to":"eval","day":"2026-10-01"},{"to":"passed","day":"2026-10-03","metadata":"keep"},{"to":"funded","day":"2026-10-05"}]',null,51000,52000,'2026-10-18','keep');
      insert into prop_entries(id,user_id,account_id,kind,amount,day) values ('cash-synthetic','${owner}','history-synthetic','purchase',100,'2026-10-01');
      insert into trades(id,user_id) values ('trade-synthetic','${owner}');
      insert into journal_schema(user_id) values ('${owner}');
      insert into journal_reviews(id,user_id) values ('review-synthetic','${owner}');
      insert into journal_playbook(id,user_id) values ('playbook-synthetic','${owner}');`);
    const as = async (id, role = 'authenticated') => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
      await db.exec('set role ' + role);
    };
    await as(admin);
    for (const table of ['trades', 'journal_schema', 'journal_reviews', 'journal_playbook', 'prop_accounts', 'prop_entries']) {
      assert.equal((await db.query('select * from ' + table)).rows.length, 0, table);
    }
    const privateWrites = { trades: "data='{}'::jsonb", journal_schema: "fields='[]'::jsonb", journal_reviews: "title='forbidden'", journal_playbook: "title='forbidden'", prop_accounts: "note='forbidden'", prop_entries: "note='forbidden'" };
    for (const [table, assignment] of Object.entries(privateWrites)) {
      assert.equal((await db.query(`update ${table} set ${assignment} where user_id=$1::uuid returning user_id`, [owner])).rows.length, 0, table);
      assert.equal((await db.query(`delete from ${table} where user_id=$1::uuid returning user_id`, [owner])).rows.length, 0, table);
    }
    checks++;
    const counts = (await db.query('select * from admin_trade_counts()')).rows;
    assert.equal(counts.length, 1); assert.equal(counts[0].user_id, owner); assert.equal(Number(counts[0].n), 1);
    assert.deepEqual(Object.keys(counts[0]).sort(), ['n', 'user_id']); checks++;
    const icon = { id: 'platforms:shared', field: 'platforms', option_key: 'shared', label: 'Shared', kind: 'builtin', value: 'globe', expected_revision: 0 };
    const firm = { id: 'catalog-synthetic', name: 'Synthetic catalog', sort_order: 0, data: { keySentence: { text: 'Important note' }, updatesPreviewCount: 1, review: 'Keep' } };
    const saveFirm = (f = firm, icons = [icon]) => db.query('select prop_save_firm_with_icons($1::jsonb,$2::jsonb) as saved', [JSON.stringify(f), JSON.stringify(icons)]);
    const saved = (await saveFirm()).rows[0].saved;
    assert.equal(saved.icons[0].revision, 1); assert.equal(saved.firm.data.keySentence.text, 'Important note'); checks++;
    await as(disabled); await assert.rejects(saveFirm(), /admin only/); checks++;
    await as(owner);
    assert.equal((await db.query('select * from admin_trade_counts()')).rows.length, 0); checks++;
    assert.equal((await db.query('select * from prop_option_icons')).rows.length, 1);
    await assert.rejects(saveFirm(), /admin only/); checks++;
    const getAccount = async () => (await db.query("select to_jsonb(a) as account from prop_accounts a where id='history-synthetic'")).rows[0]?.account;
    const getEntries = async () => (await db.query('select to_jsonb(e) as entry from prop_entries e')).rows.map(r => r.entry);
    const original = await getAccount(), ledger = await getEntries();
    assert.equal(original.updated_at, null);
    const c = makeContext(ENGINE_FILES, { URL });
    c.set('session', { user: { id: owner } }); c.set('currentProfile', { active: true, role: 'user' }); c.set('authLoading', false);
    c.set('propAccounts', [original]); c.set('propEntries', ledger);
    const calls = [];
    // Translate the actual narrow client chain into parameterized SQL. This tests
    // PostgreSQL types/RLS/RETURNING, not a live PostgREST HTTP deployment.
    c.sandbox.localClient = { from(table) {
      assert.equal(table, 'prop_accounts'); const filters = []; let payload;
      const allowed = new Set(['id','user_id','bought_on','events','updated_at']);
      const q = {
        update(p) { payload = plain(p); calls.push(payload); return q; },
        eq(k,v) { assert.ok(allowed.has(k)); filters.push([k,v,false]); return q; },
        is(k,v) { assert.ok(allowed.has(k)); assert.equal(v,null); filters.push([k,v,true]); return q; },
        async select(columns) {
          assert.equal(columns,'id,user_id,bought_on,events,updated_at');
          const values = [], param = (k,v) => { values.push(k==='events'&&typeof v!=='string'?JSON.stringify(v):v); return '$'+values.length + ({ events:'::jsonb', user_id:'::uuid', updated_at:'::timestamptz', bought_on:'::date' }[k] || ''); };
          const sets = Object.entries(payload).map(([k,v]) => { assert.ok(['bought_on','events','updated_at'].includes(k)); return k+'='+param(k,v); });
          const where = filters.map(([k,v,isNull]) => isNull ? k+' is null' : k+'='+param(k,v));
          try {
            const r = await db.query(`update prop_accounts set ${sets.join(',')} where ${where.join(' and ')} returning id,user_id,bought_on::text,events,updated_at::text`, values);
            return { data: r.rows, error: null };
          } catch (error) { return { data: null, error: { code:error.code,message:error.message } }; }
        },
      }; return q;
    } };
    c.run('sb=localClient; var draft=propHistoryDraft(propAccounts[0]); draft.rows[1].value.day="2026-10-04";');
    assert.equal((await c.run('propHistorySave(draft)')).ok, true);
    assert.deepEqual(Object.keys(calls[0]).sort(), ['events','updated_at']);
    const afterEvents = await getAccount();
    for (const k of Object.keys(original).filter(k => !['events','updated_at'].includes(k))) assert.deepEqual(afterEvents[k], original[k], k);
    assert.equal(afterEvents.events[1].metadata, 'keep'); assert.deepEqual(await getEntries(), ledger); checks++;
    c.run('draft=propHistoryDraft(propAccounts[0]); draft.bought_on="2026-09-30";');
    assert.equal((await c.run('propHistorySave(draft)')).ok, true);
    assert.deepEqual(Object.keys(calls[1]).sort(), ['bought_on','updated_at']);
    assert.deepEqual((await getAccount()).events, afterEvents.events); assert.deepEqual(await getEntries(), ledger); checks++;
    c.run('draft=propHistoryDraft(propAccounts[0]); draft.rows[1].value.day="2026-10-06";');
    const cached = c.run('JSON.stringify(propAccounts)');
    await db.query("update prop_accounts set updated_at=updated_at+interval '1 second' where id='history-synthetic'");
    assert.equal((await c.run('propHistorySave(draft)')).reason, 'conflict');
    assert.equal(c.run('JSON.stringify(propAccounts)'), cached); checks++;
    await assert.rejects(db.query("update prop_accounts set bought_on=null where id='history-synthetic'"), /null value/);
    assert.equal((await getAccount()).bought_on, '2026-09-30'); checks++;
    const ddl = await db.query("select is_nullable from information_schema.columns where table_schema='public' and table_name='prop_accounts' and column_name='bought_on'");
    assert.equal(ddl.rows[0].is_nullable, 'NO'); checks++;
    await as('', 'anon');
    await assert.rejects(saveFirm(), /permission denied/); checks++;
    await assert.rejects(db.query('select * from admin_trade_counts()'), /permission denied/); checks++;
    console.log(JSON.stringify({ result:'passed', engine:'PGlite/Postgres in-memory', migrations:migrations.length, sharedIconMigrationRuns:2, checks, productionConnected:false, postgrestHttpTested:false },null,2));
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });

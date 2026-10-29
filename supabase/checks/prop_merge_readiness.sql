-- Read-only readiness inspection for the merged prop-test branch.
-- Run only against an explicitly selected target. No personal/catalog records are read.
-- Does not apply migrations, change policies or trigger renewal/history operations.
begin transaction read only;

with expected(name) as (values
  ('public.profiles'), ('public.prop_firms'), ('public.prop_plans'),
  ('public.prop_catalog_imports'), ('public.prop_accounts'), ('public.prop_entries'),
  ('public.prop_option_icons')
)
select name as relation, to_regclass(name) is not null as present
from expected order by name;

with expected(signature) as (values
  ('public.is_admin()'),
  ('public.admin_trade_counts()'),
  ('public.prop_import_catalog(jsonb,jsonb)'),
  ('public.prop_apply_option_icons(jsonb,boolean)'),
  ('public.prop_save_firm_with_icons(jsonb,jsonb)'),
  ('public.prop_import_catalog_with_icons(jsonb,jsonb)')
)
select e.signature, p.oid is not null as present,
  p.prosecdef as security_definer,
  case when p.oid is not null then has_function_privilege('authenticated', p.oid, 'execute') end as authenticated_execute,
  case when p.oid is not null then has_function_privilege('anon', p.oid, 'execute') end as anon_execute
from expected e left join pg_proc p on p.oid = to_regprocedure(e.signature)
order by e.signature;

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and (
  (table_name = 'prop_accounts' and column_name in ('id','user_id','bought_on','events','updated_at','balance','balance_peak','balance_on'))
  or (table_name = 'prop_option_icons' and column_name in ('id','field','option_key','label','kind','value','revision','updated_at'))
) order by table_name, ordinal_position;

select c.relname as relation, c.relrowsecurity as rls_enabled,
  p.polname as policy, p.polcmd as command,
  pg_get_expr(p.polqual, p.polrelid) as using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) as check_expression
from pg_class c join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relname in ('prop_option_icons','prop_accounts','prop_entries')
order by c.relname, p.polname;

-- Expected 0 rows: no admin read policy may be restored on personal tables.
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('trades','journal_schema','journal_reviews','journal_playbook','prop_accounts','prop_entries')
  and (coalesce(qual,'') ilike '%is_admin%' or coalesce(with_check,'') ilike '%is_admin%');

rollback;

-- 共享选项图标与公司编辑事务。仅公共目录元数据，不改变任何个人数据表权限。
-- 幂等；部署新前端之前执行。本文件未自动应用到线上数据库。
begin;

create table if not exists public.prop_option_icons (
  id text primary key,
  field text not null check (field in ('platforms', 'payoutMethods', 'kycRequirements', 'paymentMethods')),
  option_key text not null check (char_length(option_key) between 1 and 512),
  label text not null check (char_length(btrim(label)) between 1 and 512),
  kind text not null check (kind in ('default', 'none', 'builtin', 'url')),
  value text not null default '',
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint prop_option_icons_key check (id = field || ':' || option_key),
  constraint prop_option_icons_value check (
    (kind in ('default', 'none') and value = '') or
    (kind = 'builtin' and value in ('monitor', 'chart', 'globe', 'bank', 'wallet', 'card', 'coin', 'exchange', 'id', 'passport', 'license', 'home', 'face', 'video', 'shield', 'tag', 'puzzle', 'document')) or
    (kind = 'url' and char_length(value) between 1 and 2048
      and value !~ '[[:space:]<>"''\\]'
      and (value ~ '^/img/prop(-options)?/[a-zA-Z0-9_/-]+\.(svg|webp|png|jpe?g)$'
        or value ~ '^https://([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}(:443)?([/?#][^[:space:]]*)?$'))
  )
);
alter table public.prop_option_icons enable row level security;
drop policy if exists "read prop option icons" on public.prop_option_icons;
create policy "read prop option icons" on public.prop_option_icons for select to authenticated using (true);
drop policy if exists "admin write prop option icons" on public.prop_option_icons;
create policy "admin write prop option icons" on public.prop_option_icons for all to authenticated
  using (public.is_admin() and exists (select 1 from public.profiles where id = auth.uid() and active is not false))
  with check (public.is_admin() and exists (select 1 from public.profiles where id = auth.uid() and active is not false));
grant select, insert, update, delete on public.prop_option_icons to authenticated;
revoke all on public.prop_option_icons from anon;

-- 同名项按固定顺序加事务锁，防止两个管理员覆盖各自尚未看到的图标修改。
-- 导入是明确的覆盖动作，check_revision=false；不在导入中的共享图标始终保留。
create or replace function public.prop_apply_option_icons(changes jsonb, check_revision boolean default true)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  item jsonb;
  current_revision bigint;
  changed public.prop_option_icons%rowtype;
  result jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false)
    or not exists (select 1 from public.profiles where id = auth.uid() and active is not false) then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if jsonb_typeof(changes) is distinct from 'array' or jsonb_array_length(changes) > 5000 then
    raise exception 'invalid icon changes';
  end if;
  if exists (select 1 from jsonb_array_elements(changes) x group by x->>'id' having count(*) > 1) then
    raise exception 'duplicate icon keys';
  end if;
  for item in select x from jsonb_array_elements(changes) x order by x->>'id' loop
    if jsonb_typeof(item) is distinct from 'object' or coalesce(item->>'id', '') = '' then
      raise exception 'invalid icon row';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('prop-icon:' || (item->>'id'), 0));
    select revision into current_revision from public.prop_option_icons where id = item->>'id' for update;
    if check_revision and coalesce(current_revision, 0) <> coalesce((item->>'expected_revision')::bigint, 0) then
      raise exception 'prop_icon_conflict';
    end if;
    insert into public.prop_option_icons (id, field, option_key, label, kind, value, revision, updated_at)
      values (item->>'id', item->>'field', item->>'option_key', item->>'label', item->>'kind', coalesce(item->>'value', ''), 1, now())
      on conflict (id) do update set field = excluded.field, option_key = excluded.option_key,
        label = excluded.label, kind = excluded.kind, value = excluded.value,
        revision = public.prop_option_icons.revision + 1, updated_at = now()
      returning * into changed;
    result := result || jsonb_build_array(to_jsonb(changed));
  end loop;
  return result;
end;
$$;

-- 图标先处理、公司后处理；任何一步出错都由Postgres回滚整个RPC，不部分发布。
create or replace function public.prop_save_firm_with_icons(firm jsonb, icon_changes jsonb)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  icons jsonb;
  saved public.prop_firms%rowtype;
begin
  icons := public.prop_apply_option_icons(icon_changes, true);
  if jsonb_typeof(firm) is distinct from 'object' or coalesce(btrim(firm->>'id'), '') = ''
    or coalesce(btrim(firm->>'name'), '') = '' or jsonb_typeof(firm->'data') is distinct from 'object' then
    raise exception 'invalid firm';
  end if;
  insert into public.prop_firms (id, name, website, logo, sort_order, data, updated_at)
    values (firm->>'id', firm->>'name', coalesce(firm->>'website', ''), coalesce(firm->>'logo', ''),
      coalesce((firm->>'sort_order')::integer, 0), firm->'data', now())
    on conflict (id) do update set name = excluded.name, website = excluded.website,
      logo = excluded.logo, sort_order = excluded.sort_order, data = excluded.data, updated_at = now()
    where not coalesce((firm->>'create_only')::boolean, false)
    returning * into saved;
  if saved.id is null then raise exception 'prop_firm_conflict'; end if;
  return jsonb_build_object('firm', to_jsonb(saved), 'icons', icons);
end;
$$;

-- 保持现有目录导入语义；可选optionIcons按键合并，旧JSON完全不改共享图标。
create or replace function public.prop_import_catalog_with_icons(payload jsonb, summary jsonb)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if jsonb_typeof(payload->'firms') is distinct from 'array' or jsonb_typeof(payload->'plans') is distinct from 'array' then
    raise exception 'payload needs firms[] and plans[]';
  end if;
  perform public.prop_apply_option_icons(case when payload ? 'optionIcons' then payload->'optionIcons' else '[]'::jsonb end, false);
  perform public.prop_import_catalog(payload, summary);
end;
$$;

revoke all on function public.prop_apply_option_icons(jsonb, boolean) from public, anon;
revoke all on function public.prop_save_firm_with_icons(jsonb, jsonb) from public, anon;
revoke all on function public.prop_import_catalog_with_icons(jsonb, jsonb) from public, anon;
grant execute on function public.prop_apply_option_icons(jsonb, boolean) to authenticated;
grant execute on function public.prop_save_firm_with_icons(jsonb, jsonb) to authenticated;
grant execute on function public.prop_import_catalog_with_icons(jsonb, jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;

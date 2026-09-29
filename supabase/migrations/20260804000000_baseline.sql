-- ============================================================
-- 基线：profiles / trades / journal_schema / changelog 四张基础表 + 四个数据库函数 + RLS。
--
-- ⚠ 仅用于「全新的 Supabase 项目」。
--   这份是按 PROJECT_HANDOFF.md 第三节的描述重建的，**没有**拿线上库逐条比对过；
--   已经在跑的部署不要执行它——在 Supabase CLI 里把它标成已应用即可：
--     supabase migration repair --status applied 20260804000000
--   （直接在 SQL Editor 里手动跑也行，全部写成了可重复执行，但 create or replace 会覆盖同名函数。）
--
-- 第一个管理员没有自动化：注册后在 SQL Editor 里手动
--     update profiles set role = 'admin' where email = '你的邮箱';
-- ============================================================

-- ---------- profiles ----------
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  role          text not null default 'user' check (role in ('user', 'admin')),
  active        boolean not null default true,
  display_name  text,
  gender        text,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);
alter table profiles enable row level security;

-- 判断当前用户是不是 admin。security definer 是为了让 RLS 策略里调它时不去递归查 profiles 自己
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

drop policy if exists "read own or admin" on profiles;
create policy "read own or admin" on profiles
  for select using (auth.uid() = id or is_admin());

-- 只有 admin 能改任意行（role / active）。普通用户改自己的名字/性别走下面的 update_own_profile
drop policy if exists "admin update" on profiles;
create policy "admin update" on profiles
  for update using (is_admin()) with check (is_admin());

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function update_own_profile(new_display_name text, new_gender text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set display_name = new_display_name, gender = new_gender where id = auth.uid();
end;
$$;

create or replace function touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update profiles set last_seen_at = now() where id = auth.uid();
$$;

grant execute on function is_admin() to authenticated;
grant execute on function update_own_profile(text, text) to authenticated;
grant execute on function touch_last_seen() to authenticated;

-- ---------- trades ----------
-- data 是 jsonb，key 是用户自定义字段的 id：加字段永远不需要迁移
create table if not exists trades (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  mode        text not null default 'backtest' check (mode in ('backtest', 'live')),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table trades enable row level security;

drop policy if exists "own trades" on trades;
create policy "own trades" on trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "admin read trades" on trades;
create policy "admin read trades" on trades
  for select using (is_admin());

-- ---------- journal_schema：每个用户的字段配置 ----------
create table if not exists journal_schema (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  fields       jsonb,
  card_fields  jsonb
);
alter table journal_schema enable row level security;

drop policy if exists "own schema" on journal_schema;
create policy "own schema" on journal_schema
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "admin read schema" on journal_schema;
create policy "admin read schema" on journal_schema
  for select using (is_admin());

-- ---------- changelog：全局共享的更新日志 ----------
create table if not exists changelog (
  id          bigint generated always as identity primary key,
  entry       text not null,
  created_at  timestamptz not null default now()
);
alter table changelog enable row level security;

drop policy if exists "read changelog" on changelog;
create policy "read changelog" on changelog
  for select using (auth.uid() is not null);

drop policy if exists "admin write changelog" on changelog;
create policy "admin write changelog" on changelog
  for insert with check (is_admin());

drop policy if exists "admin delete changelog" on changelog;
create policy "admin delete changelog" on changelog
  for delete using (is_admin());

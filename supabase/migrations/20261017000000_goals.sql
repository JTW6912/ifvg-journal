-- 目标 / 纪律 / 积分 / 使用时长（「目标」页签 + 记录页顶部那张卡片）。可重复执行。
-- 撤掉这一整套：supabase/rollback/20261017000000_goals_down.sql（只删这里新建的东西，不碰交易 / 复盘 / 模型库）。
--
-- 只算实盘：回测的交易、复盘、在回测模式下用网站的时间都不进这几张表。

-- 个人配置：记录节奏（每天 / 每周）、目标清单、纪律规则阈值、自评纪律项、从哪天开始算分
alter table journal_schema add column if not exists goal_prefs jsonb;

-- 每个交易日一行：手动目标的勾选、自评纪律、盘前计划、休息日、结算快照。
-- 每周型的人结算一周时也是按天写（一周 5 行），每周目标的勾选记在那周周一那一行上
create table if not exists goal_days (
  user_id     uuid not null references auth.users(id) on delete cascade,
  day         date not null,
  checks      jsonb not null default '{}'::jsonb,
  self_checks jsonb not null default '{}'::jsonb,
  plan        jsonb,
  off         boolean not null default false,
  settled_at  timestamptz,
  snapshot    jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, day)
);
alter table goal_days enable row level security;
drop policy if exists "goal_days own" on goal_days;
create policy "goal_days own" on goal_days for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "goal_days admin read" on goal_days;
create policy "goal_days admin read" on goal_days for select using (is_admin());

-- 使用时长：每人每天每个区域一行，只存累计秒数。只能通过 add_activity() 往上加（带上限），前端不能直接写
create table if not exists activity_daily (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  area       text not null,
  seconds    integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day, area)
);
alter table activity_daily enable row level security;
drop policy if exists "activity own read" on activity_daily;
create policy "activity own read" on activity_daily for select using (auth.uid() = user_id);
drop policy if exists "activity own delete" on activity_daily;
create policy "activity own delete" on activity_daily for delete using (auth.uid() = user_id);
drop policy if exists "activity admin read" on activity_daily;
create policy "activity admin read" on activity_daily for select using (is_admin());

-- 区域：网站里自动计时的（review / playbook / focus / trades / analytics）每次最多加 15 分钟；
-- 计时器 timer_* 和手动补录 manual_* 一次最多 6 小时。每个区域一天封顶 16 小时。
-- 日期只收最近 8 天（补录用）到明天（时区差）
create or replace function add_activity(p_day date, p_area text, p_seconds integer)
returns void
language plpgsql security definer set search_path = public as $$
declare cap integer;
begin
  if auth.uid() is null then return; end if;
  if p_area is null or p_area !~ '^[a-z_]{1,24}$' then return; end if;
  if p_day is null or p_day < current_date - 8 or p_day > current_date + 1 then return; end if;
  cap := case when p_area like 'timer\_%' or p_area like 'manual\_%' then 21600 else 900 end;
  p_seconds := greatest(0, least(coalesce(p_seconds, 0), cap));
  if p_seconds = 0 then return; end if;
  insert into activity_daily (user_id, day, area, seconds) values (auth.uid(), p_day, p_area, p_seconds)
  on conflict (user_id, day, area)
  do update set seconds = least(activity_daily.seconds + excluded.seconds, 57600), updated_at = now();
end $$;
revoke all on function add_activity(date, text, integer) from public;
grant execute on function add_activity(date, text, integer) to authenticated;

-- 积分流水：(来源, 周期) 唯一，重新结算 / 重新计算就覆盖，不会重复加。
-- period 是 '2026-10-17'（某天）、'w2026-10-12'（某周，周一）或某个页面 id
create table if not exists points_ledger (
  user_id    uuid not null references auth.users(id) on delete cascade,
  source     text not null,
  period     text not null,
  points     integer not null check (points between -100 and 300),
  meta       jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, source, period)
);
alter table points_ledger enable row level security;
drop policy if exists "points own" on points_ledger;
create policy "points own" on points_ledger for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "points admin read" on points_ledger;
create policy "points admin read" on points_ledger for select using (is_admin());

-- 管理员后台用户列表里的「积分」列：一次只回用户数那么多行
create or replace function admin_points_totals()
returns table (user_id uuid, points bigint)
language sql stable security definer set search_path = public as $$
  select l.user_id, sum(l.points)::bigint from points_ledger l where is_admin() group by l.user_id;
$$;
revoke all on function admin_points_totals() from public;
grant execute on function admin_points_totals() to authenticated;

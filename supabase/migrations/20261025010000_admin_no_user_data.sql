-- 管理员不再能看别人的交易数据：去掉管理员对每个用户私有表的读取权限，每人只看得到自己的。
-- 保留：profiles（用户管理要用）、activity_daily（只有每天的使用次数）、changelog / prop 目录（全站共用）。
drop policy if exists "admin read trades"       on trades;
drop policy if exists "admin read all trades"   on trades;
drop policy if exists "admin read schema"       on journal_schema;
drop policy if exists "admin read all schema"   on journal_schema;
drop policy if exists "admin read reviews"      on journal_reviews;
drop policy if exists "admin read playbook"     on journal_playbook;
drop policy if exists "admin read prop accounts" on prop_accounts;
drop policy if exists "admin read prop entries"  on prop_entries;
-- 目标 / 积分功能已经下线，表还在（goals-test 分支），一起收回
do $$ begin
  if to_regclass('public.goal_days') is not null then execute 'drop policy if exists "goal_days admin read" on goal_days'; end if;
  if to_regclass('public.points_ledger') is not null then execute 'drop policy if exists "points admin read" on points_ledger'; end if;
end $$;

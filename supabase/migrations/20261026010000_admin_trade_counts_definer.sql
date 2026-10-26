-- 修复：用户管理页里除自己以外所有人的「交易数」都显示 0。
--
-- 原因：admin_trade_counts() 是 security invoker，靠 trades 上「admin read trades」那条 RLS 策略
-- 才能数到别人的。20261025010000_admin_no_user_data.sql 把那条策略删掉了（管理员不再能看别人的交易数据），
-- 于是这个函数只数得到调用者自己的那一份。
--
-- 做法：函数改成 security definer，在函数里自己用 is_admin() 把关；
-- 只返回「每个用户有几笔」这个聚合数字，不返回任何交易内容。
-- 管理员依旧读不到别人的 trades 行（RLS 策略不动），非管理员调用拿到空结果。
-- 可重复执行。
create or replace function admin_trade_counts()
returns table (user_id uuid, n bigint)
language sql
stable
security definer
set search_path = public
as $$
  select t.user_id, count(*)::bigint
  from trades t
  where is_admin()
  group by t.user_id;
$$;

revoke all on function admin_trade_counts() from public;
grant execute on function admin_trade_counts() to authenticated;

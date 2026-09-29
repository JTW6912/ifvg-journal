-- ============================================================
-- 数据量上来之后的两样东西：
--   1. trades 的索引：前端每次都是「某个用户 + 某个模式 + 按创建时间升序 + id 兜底」分页全量拉取
--   2. admin_trade_counts()：管理后台数每个用户有多少笔交易，在库里聚合，
--      不用再把整张 trades 的 user_id 拉回浏览器里数
-- 可重复执行。
-- ============================================================

create index if not exists trades_user_mode_created_idx on trades (user_id, mode, created_at, id);

-- security invoker（默认）：走调用者自己的 RLS。admin 有「读所有人」的策略所以拿到全部；
-- 普通用户调它只会数到自己那一份，没有任何越权。
create or replace function admin_trade_counts()
returns table (user_id uuid, n bigint)
language sql
stable
as $$
  select t.user_id, count(*)::bigint from trades t group by t.user_id;
$$;
grant execute on function admin_trade_counts() to authenticated;

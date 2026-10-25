-- Prop 账户：记当前余额，卡片上算「离目标还差多少 / 离爆仓线还有多少」
--   balance       最近一次记的账户余额（用户手动更新）
--   balance_peak  记过的最高余额（追踪回撤用它估算爆仓线）
--   balance_on    余额是哪天的
alter table prop_accounts add column if not exists balance      numeric(14,2);
alter table prop_accounts add column if not exists balance_peak numeric(14,2);
alter table prop_accounts add column if not exists balance_on   date;

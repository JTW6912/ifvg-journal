-- ============================================================
-- 复盘 v3：一篇复盘可以关联到「某一天」，而不只是「某一周」
-- 在 Supabase 后台 → SQL Editor 里整段跑一次即可。可重复执行。
--
-- 前置：docs/reviews-migration.sql 和 docs/reviews-groups-migration.sql 都跑过了。
--
-- 不跑也不会坏：前端保存时发现没有这一列，会把它摘掉重存一次，
-- 正文照常落库，只是关联不到具体某天，并在复盘页给一条提示。
-- ============================================================

-- 关联到哪一天。null = 没关联到具体某天。
-- 和 week_start 是互斥的：日复盘只填 day_date，周复盘只填 week_start，
-- 两个都空就是自由帖。前端在切换时会把另一个清掉，
-- 读的时候按「day_date 优先」判断，所以就算哪天数据脏了也有确定的落点。
alter table journal_reviews add column if not exists day_date date;

-- 日复盘天然是按天翻的，给它一条索引
create index if not exists journal_reviews_user_day_idx
  on journal_reviews (user_id, mode, day_date desc);

-- RLS 不用动，沿用这张表原有的策略（自己读写自己的 + admin 只读）。

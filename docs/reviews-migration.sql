-- ============================================================
-- 复盘（Reviews）：用户自己发的复盘帖子，markdown 正文，可以关联到具体交易
-- 在 Supabase 后台 → SQL Editor 里整段跑一次即可。可重复执行。
--
-- 不跑也不会坏：前端拿不到这张表时会捕获 42P01/PGRST205，
-- 在复盘页顶部提示「去跑这段 SQL」，其他页签完全不受影响。
--
-- 设计说明：
--   * 复盘只在「实盘」模式下出现，所以这张表不带 mode 列
--   * week_start 是可选的「关联到哪一周」（周一那天），null = 一篇自由帖子
--   * linked_trade_ids 是保存时从正文 [[trade:xxx]] 里抽出来的冗余索引，
--     给「这笔交易被哪几篇复盘提到」这类反查用，正文永远是唯一真相
-- ============================================================

create table if not exists journal_reviews (
  id               text primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text default '',
  body             text default '',
  week_start       date,
  linked_trade_ids text[] default '{}',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists journal_reviews_user_created_idx
  on journal_reviews (user_id, created_at desc);

alter table journal_reviews enable row level security;

-- 自己读写自己的（和 trades 一样的规则）
drop policy if exists "own reviews" on journal_reviews;
create policy "own reviews" on journal_reviews
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 管理员只读所有人的（只有 select，不能写——和 trades 保持一致）
drop policy if exists "admin read reviews" on journal_reviews;
create policy "admin read reviews" on journal_reviews
  for select
  using (is_admin());

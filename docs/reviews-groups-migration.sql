-- ============================================================
-- 复盘 v2：回测/实盘分开 + 一级分组 + 手动排序
-- 在 Supabase 后台 → SQL Editor 里整段跑一次即可。可重复执行。
--
-- 前置：docs/reviews-migration.sql 已经跑过（journal_reviews 表存在）。
--
-- 不跑也不会坏：前端拿不到这几列时会退回「所有复盘都算实盘、都不分组、
-- 按创建时间倒序」，页面上给一条提示让你来跑这段。
-- ============================================================

-- 1) 回测复盘和实盘复盘彻底分开。
--    已有的复盘全部算实盘（原来这功能就只在实盘下用），所以 default 'live'。
alter table journal_reviews add column if not exists mode text not null default 'live';

-- 2) 归属哪个分组。null / '' = 未分组。
--    分组本身的定义（名字、顺序）存在 journal_schema.review_prefs 里，不单开表：
--    那是纯粹的个人配置，跟 analysis_prefs 存组合分组是同一个路子。
alter table journal_reviews add column if not exists group_id text;

-- 3) 手动拖拽排序用。null = 还没排过，前端按 created_at 倒序兜底。
alter table journal_reviews add column if not exists sort_order double precision;

-- 列表页是「某个用户 + 某个模式」的全量拉取，索引按这个来
create index if not exists journal_reviews_user_mode_idx
  on journal_reviews (user_id, mode, created_at desc);

-- 4) 分组定义存这里。结构：
--    { "groups": [ { "id": "rg_x", "name": "常见错误", "mode": "live" } ] }
--    数组顺序就是分组的显示顺序。缺任何一项前端 normalizeReviewPrefs() 都会补默认值。
alter table journal_schema add column if not exists review_prefs jsonb default '{}'::jsonb;

-- RLS 不用动：两张表原有的策略照旧生效（自己读写自己的 + admin 只读）。

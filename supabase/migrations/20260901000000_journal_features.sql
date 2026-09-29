-- ============================================================
-- 后来陆续加的功能，合并成一份（原来是 docs/ 下五个各自手动跑的 SQL）：
--   界面语言绑账号 / 看图模式 / 分析页配置 / 复盘（表 + 回测实盘分开 + 分组 + 日复盘）
-- 全部可重复执行。老部署已经跑过的部分会被 if not exists 跳过。
--
-- 前端不再为「缺列 / 缺表」做任何降级——这份必须在部署前跑完。
-- ============================================================

-- ---------- 界面语言：绑到账号上，换设备登录后保持一致 ----------
alter table profiles add column if not exists lang text;

-- 单独开一个只能改语言的 RPC，不去动 update_own_profile：
-- security definer + 只更新 auth.uid() 自己那行，改不了别人的，也碰不到 role/active。
create or replace function update_own_lang(new_lang text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_lang is null or new_lang not in ('zh', 'en') then
    raise exception 'unsupported lang: %', new_lang;
  end if;
  update profiles set lang = new_lang where id = auth.uid();
end;
$$;
grant execute on function update_own_lang(text) to authenticated;

-- ---------- journal_schema 上的三份个人配置 ----------
-- 看图模式要额外显示哪些字段。⚠ 刻意不给 default：null = 从没配过（按内置默认），
-- [] = 用户主动清空（一个都不显示），两者必须能区分。
alter table journal_schema add column if not exists focus_fields jsonb;
-- 分析页的拆解显示 / 组合 / 分组 / 时间分段 / 样本下限
alter table journal_schema add column if not exists analysis_prefs jsonb default '{}'::jsonb;
-- 复盘分组的定义：{ "groups": [ { "id", "name", "mode" } ] }，数组顺序就是显示顺序
alter table journal_schema add column if not exists review_prefs jsonb default '{}'::jsonb;

-- ---------- 复盘 ----------
create table if not exists journal_reviews (
  id               text primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text default '',
  body             text default '',                 -- markdown 原文，渲染在前端做
  week_start       date,                            -- 关联到哪一周（周一那天）
  day_date         date,                            -- 关联到哪一天；和 week_start 互斥，都空 = 自由帖
  linked_trade_ids text[] default '{}',             -- 从正文 [[trade:xxx]] 抽出来的冗余索引，正文才是唯一真相
  mode             text not null default 'live',    -- 回测复盘和实盘复盘各一套
  group_id         text,                            -- 归属哪个分组；null / '' = 未分组
  sort_order       double precision,                -- 手动拖拽排序；null = 没排过，前端按 created_at 倒序兜底
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
-- 表是老部署先建的、列是后加的：老库上 create table 会被跳过，所以每一列都再补一遍
alter table journal_reviews add column if not exists day_date   date;
alter table journal_reviews add column if not exists mode       text not null default 'live';
alter table journal_reviews add column if not exists group_id   text;
alter table journal_reviews add column if not exists sort_order double precision;

create index if not exists journal_reviews_user_created_idx on journal_reviews (user_id, created_at desc);
create index if not exists journal_reviews_user_mode_idx    on journal_reviews (user_id, mode, created_at desc);
create index if not exists journal_reviews_user_day_idx     on journal_reviews (user_id, mode, day_date desc);

alter table journal_reviews enable row level security;

drop policy if exists "own reviews" on journal_reviews;
create policy "own reviews" on journal_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 管理员只读所有人的（只有 select，不能写——和 trades 一致）
drop policy if exists "admin read reviews" on journal_reviews;
create policy "admin read reviews" on journal_reviews
  for select using (is_admin());

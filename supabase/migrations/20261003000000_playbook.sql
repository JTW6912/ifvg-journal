-- ============================================================
-- 模型库：交易系统 → 衍生策略 → 错题笔记
--
--   kind = 'system'   交易系统（交易框架 / 交易语言），例：RIFVG、TLD-QM。parent_id 为空
--   kind = 'strategy' 系统衍生出来的 setup，例：趋势延续、猎杀反转。parent_id = 所属系统
--   kind = 'mistake'  错题笔记（便利贴）。parent_id = 所属系统或策略；为空 = 通用错题
--
-- 正文和复盘一样是 markdown，编辑器、折叠、目录全部复用复盘那一套。
-- 跟 journal_reviews 分表而不是加一个 kind 列：复盘按 mode（回测 / 实盘）分两套，
-- 模型库是跨模式的同一份；混在一张表里，复盘那边每一处查询、分组、拖拽都要多排除一次。
--
-- 交易属于哪一页不在这张表上，在 trades.data 里（"__pb" = 页面 id，"__pb_star" = 关注），
-- 不需要迁移：一笔交易只属于一个策略，放在交易身上删交易时自然就没了。
-- 错题涉及哪些交易 = 错题正文里的 [[trade:xxx]]，linked_trade_ids 是它的冗余索引（跟复盘一样）。
--
-- 可重复执行。前端不对缺表做降级——部署前先跑这一份。
-- ============================================================

create table if not exists journal_playbook (
  id               text primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  kind             text not null default 'system',   -- system / strategy / mistake
  parent_id        text,                             -- 见上面
  title            text default '',
  body             text default '',                  -- markdown 原文
  linked_trade_ids text[] default '{}',              -- 正文里 [[trade:xxx]] 的冗余索引，正文才是唯一真相
  sort_order       double precision,                 -- 同级里的顺序；null = 没排过，按创建时间
  folded_headings  jsonb not null default '[]'::jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists journal_playbook_user_idx on journal_playbook (user_id, kind);

alter table journal_playbook enable row level security;

drop policy if exists "own playbook" on journal_playbook;
create policy "own playbook" on journal_playbook
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 管理员只读所有人的（只有 select，不能写——和 trades / journal_reviews 一致）
drop policy if exists "admin read playbook" on journal_playbook;
create policy "admin read playbook" on journal_playbook
  for select using (is_admin());

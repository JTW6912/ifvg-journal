-- ============================================================
-- Prop 账户：公司目录 + 每个用户自己的账号和流水
--
--   prop_firms / prop_plans   公共目录。所有登录用户可读，只有管理员能写。
--                             管理员上传一份 JSON（格式见 src/11d-prop-data.js 顶部），
--                             走 prop_import_catalog() 整份替换——一次事务里删旧插新，不会出现「一半新一半旧」。
--                             计划的具体规则整块放在 data（jsonb）里：规则字段多、各家不一样，还会随时调整，
--                             拆成列只会让每次改格式都要跑迁移。
--   prop_catalog_imports      每次导入留一条记录（谁、什么时候、增删改了几个），payload 是导入的原文，出错时可以拿回来。
--
--   prop_accounts             用户买的账号。plan_snapshot = 购买时那份计划规则的拷贝，目录以后改了也不影响已买的账号。
--                             公司 / 计划可以不在目录里（目录没有的也能记），所以 firm_id / plan_id 都不做外键，
--                             另存 firm_name / plan_name 用来显示。
--   prop_entries              每一笔钱：购买、月费、重置、激活、出金、退款、其他费用。金额一律美元、正数，
--                             方向由 kind 决定（出金是收入，退款冲减投入，其他都是投入）。
--
-- 可重复执行。前端不对缺表做降级——部署前先跑这一份。
-- ============================================================

create table if not exists prop_firms (
  id          text primary key,
  name        text not null,
  website     text default '',
  logo        text default '',
  sort_order  integer not null default 0,
  data        jsonb not null default '{}'::jsonb,   -- faq / notes 等
  updated_at  timestamptz default now()
);

create table if not exists prop_plans (
  id          text primary key,
  firm_id     text not null references prop_firms(id) on delete cascade,
  series      text not null default '',
  size        integer,
  status      text not null default 'current',      -- current / legacy
  sort_order  integer not null default 0,
  data        jsonb not null default '{}'::jsonb,   -- price / eval / funded / payout / options / notes / sources / checkedAt
  updated_at  timestamptz default now()
);
create index if not exists prop_plans_firm_idx on prop_plans (firm_id, sort_order);

create table if not exists prop_catalog_imports (
  id           bigserial primary key,
  imported_at  timestamptz not null default now(),
  imported_by  uuid references auth.users(id) on delete set null,
  summary      jsonb not null default '{}'::jsonb,
  payload      jsonb not null
);

alter table prop_firms enable row level security;
alter table prop_plans enable row level security;
alter table prop_catalog_imports enable row level security;

drop policy if exists "read prop firms" on prop_firms;
create policy "read prop firms" on prop_firms for select to authenticated using (true);
drop policy if exists "admin write prop firms" on prop_firms;
create policy "admin write prop firms" on prop_firms for all using (is_admin()) with check (is_admin());

drop policy if exists "read prop plans" on prop_plans;
create policy "read prop plans" on prop_plans for select to authenticated using (true);
drop policy if exists "admin write prop plans" on prop_plans;
create policy "admin write prop plans" on prop_plans for all using (is_admin()) with check (is_admin());

-- 导入记录：大家都能看「目录什么时候更新的」，只有管理员能写（实际只经由 prop_import_catalog 写）
drop policy if exists "read prop imports" on prop_catalog_imports;
create policy "read prop imports" on prop_catalog_imports for select to authenticated using (true);
drop policy if exists "admin write prop imports" on prop_catalog_imports;
create policy "admin write prop imports" on prop_catalog_imports for all using (is_admin()) with check (is_admin());

create table if not exists prop_accounts (
  id               text primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  firm_id          text,
  firm_name        text not null default '',
  plan_id          text,
  plan_name        text not null default '',
  size             integer,
  nickname         text not null default '',
  group_name       text not null default '',          -- 可选分组（复制交易一批一起买的账号）
  status           text not null default 'eval',      -- eval / passed / funded / failed / blown / closed
  events           jsonb not null default '[]'::jsonb, -- 状态时间线 [{ to, day }]
  bought_on        date not null default current_date,
  billing          text not null default 'one_time',  -- one_time / monthly
  monthly_fee      numeric(12,2),
  renewing         boolean not null default false,
  renewed_through  date,                              -- 月费自动记到哪一天了（删掉自动记的那笔不会被补回来）
  plan_snapshot    jsonb,
  note             text not null default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists prop_accounts_user_idx on prop_accounts (user_id);

create table if not exists prop_entries (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  account_id  text not null references prop_accounts(id) on delete cascade,
  kind        text not null,                          -- purchase / monthly / reset / activation / payout / refund / other
  amount      numeric(12,2) not null check (amount >= 0),
  day         date not null default current_date,
  pending     boolean not null default false,         -- 只对出金有意义：已申请、还没到账
  note        text not null default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists prop_entries_user_idx on prop_entries (user_id, day);
create index if not exists prop_entries_account_idx on prop_entries (account_id);

alter table prop_accounts enable row level security;
alter table prop_entries enable row level security;

drop policy if exists "own prop accounts" on prop_accounts;
create policy "own prop accounts" on prop_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "admin read prop accounts" on prop_accounts;
create policy "admin read prop accounts" on prop_accounts for select using (is_admin());

drop policy if exists "own prop entries" on prop_entries;
create policy "own prop entries" on prop_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "admin read prop entries" on prop_entries;
create policy "admin read prop entries" on prop_entries for select using (is_admin());

-- 整份替换目录。payload = { firms: [...], plans: [...] }，字段见 src/11d-prop-data.js 顶部。
-- 前端已经校验过一遍，这里只做最基本的防护；任何一行出错整个事务回滚，目录保持原样。
create or replace function prop_import_catalog(payload jsonb, summary jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  f jsonb;
  p jsonb;
  i integer := 0;
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;
  if jsonb_typeof(payload->'firms') <> 'array' or jsonb_typeof(payload->'plans') <> 'array' then
    raise exception 'payload needs firms[] and plans[]';
  end if;

  delete from prop_plans;
  delete from prop_firms;

  for f in select * from jsonb_array_elements(payload->'firms') loop
    insert into prop_firms (id, name, website, logo, sort_order, data, updated_at)
    values (f->>'id', f->>'name', coalesce(f->>'website', ''), coalesce(f->>'logo', ''), i,
            f - 'id' - 'name' - 'website' - 'logo', now());
    i := i + 1;
  end loop;

  i := 0;
  for p in select * from jsonb_array_elements(payload->'plans') loop
    insert into prop_plans (id, firm_id, series, size, status, sort_order, data, updated_at)
    values (p->>'id', p->>'firm', coalesce(p->>'series', ''), (p->>'size')::integer,
            coalesce(p->>'status', 'current'), i,
            p - 'id' - 'firm' - 'series' - 'size' - 'status', now());
    i := i + 1;
  end loop;

  insert into prop_catalog_imports (imported_by, summary, payload) values (auth.uid(), coalesce(summary, '{}'::jsonb), payload);
end;
$$;

grant execute on function prop_import_catalog(jsonb, jsonb) to authenticated;

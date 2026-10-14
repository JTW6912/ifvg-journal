-- 截图备份：所有用户的外链截图（只管 FX Replay / TradingView 两种）每天由 GitHub Actions
-- 转成 WebP 80% 存一份到自建图床（Cloudflare R2）。原链接一个字都不改，这张表只是「原图 → 备份」的对照。
-- source_url 存的是网页上 <img> 实际加载的地址（TradingView 快照页已换成 s3 直链，即 imgSrc() 的结果），
-- 前端原图加载失败时拿这个地址来查备份。
create table if not exists image_backups (
  source_url    text primary key,
  backup_url    text,
  backup_key    text,
  kind          text,                       -- fxreplay / tradingview
  orig_bytes    integer,
  backup_bytes  integer,
  status        text not null default 'ok' check (status in ('ok', 'failed')),
  error         text,
  attempts      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- 没有任何 policy：只有 service role（备份脚本）能直接读写。
-- 整张表里有所有用户的截图链接，不能让登录用户随便列。
alter table image_backups enable row level security;

-- 前端只能拿「自己已经知道的原链接」换备份链接，没法枚举别人的图
create or replace function lookup_image_backups(urls text[])
returns table (source_url text, backup_url text)
language sql stable security definer set search_path = public as $$
  select b.source_url, b.backup_url
  from image_backups b
  where auth.uid() is not null
    and b.status = 'ok'
    and b.source_url = any (urls[1:200]);
$$;
revoke all on function lookup_image_backups(text[]) from public;
grant execute on function lookup_image_backups(text[]) to authenticated;

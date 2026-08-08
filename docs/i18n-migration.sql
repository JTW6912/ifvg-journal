-- ============================================================
-- 界面语言：把用户选的语言绑到账号上，换设备登录后保持一致
-- 在 Supabase 后台 → SQL Editor 里整段跑一次即可。可重复执行。
--
-- 不跑也不会坏：前端拿不到这个函数时只会在控制台 warn 一句，
-- 语言照样存在 localStorage 里生效，只是不跨设备同步。
-- ============================================================

-- 1) 存语言的列。null = 还没选过，前端会在首次登录时补写
alter table profiles add column if not exists lang text;

-- 2) 单独开一个只能改语言的 RPC，而不是去动现有的 update_own_profile。
--    好处：现有函数不用改，出问题也牵连不到显示名/性别那条路径。
--    security definer + 只更新 auth.uid() 自己那行，用户改不了别人的，也碰不到 role/active。
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

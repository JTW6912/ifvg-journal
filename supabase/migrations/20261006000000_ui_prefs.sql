-- ============================================================
-- 外观（布局 / 配色 / 日夜）绑到账号上，换设备、换浏览器登录后保持一致。
--   profiles.ui_prefs = {"layout":"classic|modern","palette":"gold|sky|…","theme":"dark|light"}
-- 跟 update_own_lang 一个套路：单独一个只能改自己这一列的 RPC，
-- security definer + 只更新 auth.uid() 那行，碰不到别人的、也碰不到 role/active。
-- 前端在这份没跑之前只会在控制台警告一句，本机 localStorage 那份照常生效。
-- 可重复执行。
-- ============================================================

alter table profiles add column if not exists ui_prefs jsonb;

create or replace function update_own_ui_prefs(new_prefs jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_prefs is null or jsonb_typeof(new_prefs) <> 'object' then
    raise exception 'ui_prefs must be a json object';
  end if;
  -- 就三个短字符串，给个上限防止被当成任意存储用
  if pg_column_size(new_prefs) > 1024 then
    raise exception 'ui_prefs too large';
  end if;
  update profiles set ui_prefs = new_prefs where id = auth.uid();
end;
$$;
grant execute on function update_own_ui_prefs(jsonb) to authenticated;

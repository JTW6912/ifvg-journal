-- 备份改成无损 WebP：截图大多是纯色背景 + 线条文字，无损版比有损 q80 还小一半，画质和原图逐像素一致。
-- encoding 记每份备份是怎么编码的；和脚本里 ENCODING 不一样的行会被重新备份（旧备份先留着，换好再删）
alter table image_backups add column if not exists encoding text;
update image_backups set encoding = 'webp-q80' where encoding is null and status = 'ok';

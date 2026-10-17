-- 撤掉 20261017000000_goals.sql 建的东西（目标 / 纪律 / 积分 / 使用时长）。
-- 只删这一套新建的表、函数和 journal_schema.goal_prefs 这一列；交易、复盘、模型库、字段配置一个字节都不动。
-- 前端要同时退回 backup-before-goals-2026-10-17 那个版本，否则新代码会因为缺表报「去跑迁移」。
drop function if exists admin_points_totals();
drop function if exists add_activity(date, text, integer);
drop table if exists points_ledger;
drop table if exists activity_daily;
drop table if exists goal_days;
alter table journal_schema drop column if exists goal_prefs;

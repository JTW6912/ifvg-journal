# System Architecture & Database Spec

## Overview

IFVG Journal是多用户交易日记与独立Prop账本应用。基础事实取自AGENTS.md、PROJECT_HANDOFF.md、bundle.js、src/01-config.js和src/11d-prop-data.js。本规范描述现有架构与不可突破的边界，不新增服务或数据库能力。

## Application Topology

- Frontend runtime: 浏览器原生JavaScript；index.html加载i18n.js和拼接生成的app.js。
- Backend runtime: Supabase托管Postgres、Auth、PostgREST/RPC，没有自建应用服务器。
- API gateway or edge layer: 浏览器通过Supabase JS client直接调用Supabase，Vercel负责静态发布。
- Background workers: 已有GitHub Actions截图备份；数据库备份在独立私有仓库。此功能不触碰备份。
- External services: Supabase、外链截图源、Cloudflare R2备份图床。
- Local development entrypoints: npm run bundle / npm run dev；纯逻辑npm test；UI使用隔离本地mock。
- Production deployment shape: master push触发正式Vercel部署，prop-test是预览分支；仅已获授权的规范/任务可做本地基线提交，业务源码不擅自提交，所有内容均不推送或发布。

## Module Boundaries

| Module | Responsibility | Public contract | Owned data | Dependencies | Forbidden dependencies | Extension points |
| --- | --- | --- | --- | --- | --- | --- |
| 配置/认证 src/01、07、07b、16 | 会话、账户、加载 | initSupabaseClient/loadAll/bootstrapAuth | session/profile/账户本地状态 | Supabase Auth与用户表 | Secret Key、越权查询 | 已有认证回调和清理入口 |
| Prop领域 src/11d-prop-data.js | 目录转换、财务口径、账本读写 | propSum/propMonthly/propScoped的输入数据来源/loadPropData | propAccounts/propEntries及公共目录缓存 | fetchAllRows、owner会话 | 在派生统计里发请求或写库 | 纯日期范围/走势派生函数 |
| Prop视图 src/11e、11f | 总览、账号、目录与编辑器 | renderProp及data-action | Prop UI选择/弹窗draft | Prop领域、T/esc/ICONS | 将目录导入当作UI刷新 | 可组合的现代概览视图与浮层 |
| 应用外壳 src/14、15 | 区域渲染与事件调度 | render/patchAppShell | tab、区域HTML缓存 | 各页renderer | 绕过缓存重写主要区域 | 渲染后同步浮层/焦点 |
| 主题与词典 | 外观、语言和文案 | CSS变量、T/localeTag | 本机偏好、账号偏好 | profiles中的既有偏好通道 | 硬编码用户配色/中文 | 新增双语键和命名空间组件样式 |
| 其他业务模块 | 交易、分析、复盘、模型库、导出 | 各自renderer/领域函数 | 各模块私有状态 | 共同数据层与权限 | 让Prop过滤影响交易口径 | 本次不修改 |

## Frontend Architecture

Routing由tab/propView等内存状态驱动，无SPA路由库。Rendering为HTML字符串；APP_REGIONS只重绘变化区域。State management是共享全局let/const；文件按数字前缀拼接，函数声明提升，不是ES module。

Form handling使用draft与现有弹窗重绘守卫；不得直接重建未保存表单。Data fetching统一复用fetchAllRows分页与已有数据层；财务概览的日期过滤是客户端派生计算，不新增远端查询。Error handling沿用loadError/propError/dbOutdated，不进行缺表/缺列降级。Design system source为现有主题和已批准的shadcn原生适配。

## Backend Architecture

API style为Supabase表读写及少量RPC。Request validation在客户端做体验校验，在数据库由RLS、类型、FK、CHECK执行安全约束。Auth/session model使用Supabase会话和既有storage adapter；切账号经setSession后整页刷新（src/07b-accounts.js）。

Domain service boundaries固定为各用户自己的账本及管理员公共目录。Background jobs与File/object storage不由本功能新增。Observability沿用现有错误提示与日志；不输出认证信息或用户图片地址到公开日志。

## API Surface

| Route or RPC | Owner | Input | Output | Auth | Side Effects |
| --- | --- | --- | --- | --- | --- |
| select prop_accounts / prop_entries | Prop领域 | user_id、稳定排序、分页 | 用户账号/流水行 | owner RLS | 查询本身无写入 |
| loadPropData → propApplyRenewals | Prop数据层 | 当前账号/续费水位 | 本地缓存 | 当前owner | 既有逻辑可补记月费，不能用于只读UI验证 |
| upsert/delete prop_accounts / prop_entries | Prop写入服务 | 规范化payload | error/成功 | owner RLS | 账本写入；不属于本次UI改动 |
| select prop_firms / prop_plans | 目录 | 排序/分页 | 公共目录 | authenticated | 无写入 |
| prop_import_catalog | 目录管理RPC | catalog、summary | void/error | admin | 事务替换公共目录；本次禁止调用 |
| update_own_ui_prefs | 账户偏好RPC | 既有偏好JSON | 既有返回结构 | owner | 主题偏好写入；组件不另建通道 |
| lookup_image_backups | 截图回退RPC | 已知图片URL集合 | 备份映射 | authenticated | 不允许列出整个备份表 |

## Database Model

DDL真源为supabase/migrations；金额一律USD，不新增汇率、手续费或交易日记关联。

| Entity | Purpose | Owner | Fields | Relationships | Indexes | Constraints | Lifecycle | Migration | Retention/Deletion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| prop_accounts | 私人账号 | Prop | id,user_id,status,events,bought_on,group_name,plan_snapshot,balance等 | user_id→auth.users；firm/plan仅快照引用，不建FK | PK id、user_id索引 | owner RLS；购买日date | 由账本操作管理状态 | 20261024000000_prop.sql及balance迁移 | 用户删除时账号流水级联；本次不删除 |
| prop_entries | 私人收支 | Prop | id,user_id,account_id,kind,amount,day,pending | account_id→prop_accounts，on delete cascade | PK id、(user_id,day)、account_id | numeric(12,2)非负；day非空；owner RLS | 购买/续费/重置/激活/到账/退款 | 20261024000000_prop.sql | 跟随账号删除；不因日期过滤修改 |
| prop_firms | 公共公司 | 目录 | id,name,sort_order,data | plans关联公司 | PK id | 登录读、admin写 | 手工维护推荐顺序 | 同上 | 重导目录会替换，不能自动覆盖 |
| prop_plans | 公共计划 | 目录 | id,firm_id,series,size,status,data | firm FK级联 | PK id、(firm_id,sort_order) | 计划规则JSON | 目录维护 | 同上 | 已购账号快照不随目录变化 |
| prop_catalog_imports | 导入记录 | 目录 | imported_at,imported_by,summary,payload | 导入者可置空 | PK id | authenticated读、admin写 | 导入事务追加 | 同上 | 不由本功能清理 |
| profiles / journal_schema | 用户身份、字段/偏好 | 账户/日记 | 身份、角色、active、ui_prefs；fields及分析偏好JSON | 用户身份关联；具体列以现有DDL为准 | 现有主键及迁移定义 | profiles管理与个人配置权限分离 | 原账户流程 | 现有迁移 | 本次不变更保留/删除规则 |
| trades / journal_reviews / journal_playbook | 交易、复盘、模型库 | 原业务模块 | id,user_id,业务字段/JSON/markdown | 既有用户关联与正文引用 | 以各自迁移为准 | 私有数据仅owner | 原业务CRUD | 现有迁移 | 本次不触碰 |
| changelog / image_backups | 公告/图片回退 | 运维 | 公告内容；来源-备份映射 | 既有RPC边界 | 现有主键 | admin公告写；备份不能枚举 | 现有发布/备份流程 | 现有迁移 | 不删除图床、不改原图片链接 |

## Permissions & Security

User roles为普通用户/admin；admin不能读取别人的交易、复盘、模型库或Prop账本。Permission checks以后端RLS为最终防线，前端同时保留只读/隐藏操作保护。Data isolation按user_id；新派生状态和浮层不能跨账号残留。

Secret handling：前端仅URL和publishable/anon key；数据库密码/secret key不能进入代码、规范、测试或日志。Audit logging沿用既有目录导入记录，无新增追踪服务。Abuse cases包括未转义HTML、跨账号缓存、失效日期与超大值；模板使用esc，计算输入必须验证。

## Integration Boundaries

Third-party APIs仅复用既有服务。Webhooks、Queues、Email/SMS/push、Payments均不由本变更新增。Analytics仅本地统计，不能把模拟预览金额或真实用户数据发送到新服务。所有验证必须用合成离线数据；不得借登录动作触发真实续费写入。

## Operational Constraints

Performance constraints：不能按日无限遍历数十年历史或为每个统计重复全表查询；优先对流水排序/聚合。Availability expectations沿用静态托管和Supabase，不新增SLA承诺。Migration rules：DDL幂等且部署前执行；本变更无DDL。Backup/restore不变。Feature flag rules使用currentLayout区分现代/经典，不新建后端开关。Rollback constraints：只回滚本次前端文件即可，数据结构及既有口径不变。

## Architecture Do's and Don'ts

- 按已确认边界扩展，不迁成React、不直接修改app.js生成物。
- 名称、错误、ARIA文案均经T/esc；private数据仅从当前授权缓存派生。
- 不新增API、表、RLS或管理员查看个人数据功能。
- 不调整目录排名/导入内容，不修复无关业务流程，不进行线上写入测试。

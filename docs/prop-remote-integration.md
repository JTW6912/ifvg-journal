# prop-test 远端合并与数据库适配记录

## 合并范围

- 本地基线：`104149c`（公司目录卡片、独立公司编辑页、共享选项图标、重点提示/优惠/近期更新）。
- 远端目标：`origin/prop-test` 的 `13f4eed`，相对共同基线 `9d4272f` 新增 13 个提交。
- 回退引用：`backup/prop-test-before-remote-13f4eed` 指向 `104149c`。
- 远端新功能：总览范围与账号流程联动、月度现金流视觉、按公司汇总、owner 阶段历史检查/修正。
- 不合入或推送 `master` 的应用代码。数据库对比后，单独纳入 `945c50e` 的 `20261026010000_admin_trade_counts_definer.sql`，字节内容与远端一致；`33e9eb7` 的模型库关联改动未混入。

## 冲突处理

1. `src/11d-prop-data.js`：同时保留 `prop_option_icons` 加载和 `propHistoryAccountFromRow`。错误历史根的证据不会因数组归一化而丢失；新图标表缺失仍显示 dbOutdated，不半加载数据或偷偷降级。
2. `src/14-main-render.js`：保留公司编辑器的独立渲染根/会话守卫及推荐正文测量，同时组合远端 overview before/after render 与浮层清理。没有用任意一侧整文件覆盖另一侧。
3. `theme-modern.css`：完整保留双方独立命名空间，分别补齐末尾媒体规则的闭合括号，避免把远端样式意外包在公司卡片的容器查询里。
4. 新增源文件的数字前缀虽有重复，完整文件名和全局声明检索未见同名冲突。bundle 按完整文件名排序，共 37 个源文件。中英文词典未发现同语言重复键。

## 数据库适配结论

远端 13 个提交没有新增 SQL 迁移。合并后的功能仍分成两个权限域：

- 公共公司目录与 `prop_option_icons`：活跃管理员维护；认证用户读取。
- 个人 Prop 账号/流水：owner-only。没有恢复管理员读取别人的交易、复盘、模型库或 Prop 账本的权限。

相对远端 prop-test，合并后需要核对的增量迁移为：

1. `supabase/migrations/20261026010000_admin_trade_counts_definer.sql`：来自 master，只允许管理员取得用户交易笔数，不返回交易内容、不改个人表 RLS。
2. `supabase/migrations/20261028000000_prop_option_icons.sql`：本地共享图标与公司编辑事务。

它的依赖（profiles、is_admin、prop_firms、prop_import_catalog）与远端现有 DDL 兼容。不需要为此次合并再造一张历史修正表，也没有放宽 `prop_accounts.bought_on NOT NULL`。

### 历史修正的保存边界

`propHistorySave` 现在只把实际改变的 `bought_on` 或 `events` 放入 UPDATE，另加 `updated_at`。无论改哪一项，原 owner/id/版本/购买日期/完整历史的比较条件都保留，返回值仍按完整预期历史校验。

- 只改历史，不重新提交未修改的购买日；只改购买日，不重新提交未修改的 events。
- 没有调用状态流转、续费、账本写入或全行 upsert；不生成日期或资金流水。
- nullable `updated_at` 使用 `IS NULL` 比较；零匹配行是冲突，失败/过期响应不改已保存缓存。
- 原有 null 基线测试实际上会将购买日修复为合法日期，不能据此声称当前数据库支持 NULL 购买日。
- 对旧 nullable 来源的未知日期，事件单独修改仍保留未知事实；这只是兼容输入模型，不是放宽当前 DDL。真实 NOT NULL 库仍拒绝写 NULL，已用本地 Postgres验证。

### 集成检查发现的 Prop 会话缓存边界

退出/直接换身份时清空 Prop 私有账号、流水、弹窗草稿、筛选、选择及撤销引用，并使旧请求代次失效。加载、常规账号/流水保存与删除、续费回填都检查发起身份；同身份重叠加载只接受最新请求。批量删除和撤销闭包也绑定原身份。普通 token 刷新不清空草稿或中断同身份常规保存。

这只保证失效请求不回填当前身份缓存、不接续旧身份的续费/撤销链，**不保证已发出的请求被取消，也不代表旧身份服务器写入回滚**。没有补偿写、自动重试或更改其他业务模块的认证流程。远端历史修正原有的 session/client 引用守卫仍保留。

只读独立复核后补测了直接 A→B、同身份 token 刷新与保存/续费并发、只读上下文变化，以及渲染时月度叠线/公司排序的重置；未据此宣称整个应用登录初始化时序已完成审计。

## 实际部署前的执行顺序

**本轮没有连接线上库，也没有执行线上迁移、推送或部署。**

1. 明确目标 Supabase 项目/环境、备份与执行者。先运行只读检查：
   `supabase/checks/prop_merge_readiness.sql`
   它只查看对象、列、函数权限和 RLS 元数据，不读取用户/目录记录，不触发续费或修正。
2. 对照目标库的实际迁移历史，只执行尚未应用的必要迁移。本轮需核对上述交易计数修复和共享图标迁移；如计数修复已随 master 部署应用，不重复假设它尚未执行。若已应用过某份文件，先确认函数/表结构是否与当前文件一致。
3. **不要在已有线上部署重跑基线文件或盲目重放全部旧迁移。** 基线会重建旧函数/旧策略；尤其 master 已有独立统计 RPC 修复，本次不应以 prop-test 的旧定义覆盖它。
4. 共享图标迁移成功后再次运行只读检查：新对象齐全；新写函数不是匿名可执行；个人表没有 admin 读策略；`bought_on` 约束符合预期。
5. 然后才发布新前端。否则合并后的 `loadPropData` 会明确提示缺少图标表/函数，不进行自愈。
6. 使用有明确授权的测试账号在目标环境进行必要的 API 冒烟验证；不要拿真实个人账本做试写。

## 本地验证

- `npm test`：322 项通过（包括双方原有测试、合并边界与 14 个 Prop 会话隔离回归用例）。
- `npm run bundle`：37 个源文件；`node --check app.js`、`node --check i18n.js`。
- `test/prop-option-icons.pg.cjs`：15 组纯内存数据库检查通过。
- `test/prop-merged-schema.pg.cjs`：串行应用 16 个实际仓库迁移、重复应用共享图标和计数修复迁移，17 组检查通过。使用真实 profiles/RLS 定义验证管理员不能读取/修改/删除其他用户的六类个人数据；正常用户可改自己的历史但不能维护公共图标。计数 RPC 对管理员仅返回 user_id/n，普通用户返回空，匿名调用被拒绝。
- 合并 schema 测试通过参数化 SQL 适配器运行实际 `propHistorySave`，验证 JSONB 比较、NULL 版本、UPDATE RETURNING、字段保护、账本不变、并发冲突和 NOT NULL 约束。
- 差异检查区分代码与历史记录：远端 `openspec/.../development/evidence/` 的日志/diff 原文包含 29 处尾空白，全量 staged `git diff --check` 会报这些位置；相关文件与 `13f4eed` 内容一致，予以保留，不宣称全量检查为零告警。排除这些原有历史证据后的代码/文档/新增 SQL/测试检查通过；没有改写历史批准数据。
- 这不是线上 schema 审计，也不是完整 PostgREST HTTP 集成测试；没有宣称生产迁移已经完成。

复现数据库检查（临时工具不加入项目依赖）：

```bash
npm install --prefix /tmp/ifvg-pg-validation --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.12
PGLITE_MODULE=/tmp/ifvg-pg-validation/node_modules/@electric-sql/pglite node test/prop-option-icons.pg.cjs
PGLITE_MODULE=/tmp/ifvg-pg-validation/node_modules/@electric-sql/pglite node test/prop-merged-schema.pg.cjs
```

## 浏览器与证据边界

- 离线合成场景：`dev/mock.html?scenario=integration`；默认 `dev/mock.html` 仍为公司卡片预览。dev 目录被 Git 忽略，不连接真实配置或 SDK，CSP 禁止 API 网络请求。
- 已核验总览/漏斗/月度/公司汇总同时存在、日期弹层 Escape、月度叠线、历史检查抽屉打开/干净关闭，浏览过程写入次数为零。
- 已核验公司编辑草稿在远端新增生命周期触发的全局 render 后保持同一 DOM、选区和内容；目录的重点提示对齐、一条更新及整块复制按钮仍在。
- 历史修正的确认/丢弃对话框没有被浏览器自动批准；保存边界由单测与隔离数据库验证。移动宽度测试不等于物理触屏测试。
- 远端 OpenSpec 审核记录按原提交保留，不改写冻结断言/批准记录，也不把旧哈希的证据宣称为本次合并已通过正式 SpecNav Verification V2。
- 远端 monthly handoff 引用的 `prototype/design-contract.md` 不在已获取的 Git 树中；没有伪造或补写该历史批准资料。
- 品牌参考素材仍只在 ignored dev 目录，不作为核实过的正式品牌资产发布。

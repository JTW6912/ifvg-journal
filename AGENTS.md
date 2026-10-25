# AGENTS.md — IFVG Journal 协作说明

给 Codex / Claude Code 等 AI 代理读的项目约定。由项目作者（JTW6912）的 Claude Code 记忆整理导出，截至 2026-10-25。
更完整的历史背景、数据库表结构在 `PROJECT_HANDOFF.md`（注意其中“管理员能只读查看任意用户数据”已过时，见下文“隐私”）。

---

## 1. 源码结构（最重要）

- 前端源码在 `src/*.js`，按文件名数字前缀顺序由 `bundle.js` 原样拼接成 `app.js`（同一个全局作用域，不是 ES module）。
- **`app.js` 是生成物（gitignore），永远不要直接改它。**
- 本地命令：
  - `npm run bundle` 拼一次；`npm run dev` 监听 `src/` 自动拼
  - `npm test` 跑 `test/*.test.js`（node 自带 test runner，零依赖）
- Vercel 构建时 `build.js` 先跑 bundle，再用环境变量 `SUPABASE_URL` / `SUPABASE_ANON_KEY` 生成 `config.js`（`config.js` 也 gitignore，本地参考 `config.example.js`）。
- 浏览器报错只给 `app.js` 行号；每个源文件前有 `/* >>> src/xx.js */` 路标，往上找最近的那个就知道是哪个文件。
- 其他文件：`style.css`（经典布局）、`theme-modern.css`（现代布局）、`palettes.css`（配色）、`i18n.js`（中英词典，新文案要同时加 zh + en）。

## 2. 数据库迁移

- 后端是 Supabase（Postgres + Auth），没有自建服务器，前端直接调 Supabase JS client。
- Schema 改动写成 `supabase/migrations/<日期>_xxx.sql`，**必须幂等**。
- 前端不再对缺失的表/列做“自愈兜底”，而是显示 `dbOutdated` 横幅 → **新迁移必须在部署代码之前（或同时）在线上库执行**，否则保存会直接报错。
- 新增表/列时：加新的日期迁移文件，告诉项目作者去跑；不要写兼容缺列的 fallback 代码。
- 截至 2026-10-25，`supabase/migrations/` 里的迁移已全部在线上库执行，包括：
  - `20261024000000_prop.sql`（Prop 账户）
  - `20261025000000_*`（prop_accounts.balance / balance_peak / balance_on）
  - `20261025010000_admin_no_user_data.sql`
- 线上项目 ref：`rylzreigfbfhttcwvxzk`（ap-south-1）。作者本机用 `npx -y supabase@latest db query --linked --project-ref rylzreigfbfhttcwvxzk -o json "<sql>"` 或 `-f file.sql` 执行（走 Management API，绕过 RLS）。协作者需要作者在 Supabase 后台邀请才有权限，否则把 SQL 交给作者执行。

## 3. 隐私规则（2026-10-25 定下，必须遵守）

- **管理员不能读取其他用户的交易数据。** 已删除管理后台的“查看数据”按钮；trades、journal_schema、journal_reviews、journal_playbook、prop_accounts、prop_entries 等表上的 admin 读权限 RLS 已删除。
- 管理员只保留：profiles（用户管理）、activity_daily（使用统计）、changelog、Prop 目录的写权限。
- **不要再加任何 admin 读取个人数据的 policy 或“以某用户身份查看”的功能**；新的个人数据表一律只给 owner 的 RLS。
- 代码里 `viewingUserId` 只读路径还在，但已经走不到了。

## 4. 部署与分支

- GitHub 仓库 `JTW6912/ifvg-journal`（**公开仓库**——不要提交任何密钥、token、用户数据或截图链接）。
- `master` 分支推送后由 Vercel 自动部署到正式站。不需要操作 Vercel CLI。
- 坑：Vercel 偶尔不响应某次 push（GitHub 上该 commit 没有 Vercel 状态）。用 `gh api repos/JTW6912/ifvg-journal/commits/<sha>/status` 检查，没有就推一个空提交 `git commit --allow-empty -m "Trigger deploy"`。
- `prop-test` 分支 = 测试站（Vercel preview，需 Vercel 登录才能看）。**Prop 账户功能目前只在 prop-test 上开发**，是否合进 master 由作者决定。
- 只提交自己改过的文件；仓库里其他未跟踪的东西（如 `api/`、`scripts/discord-register.js`）是别人进行中的工作，别动。
- 每次上线更新会在 `changelog` 表加一行：先中文，空一行，再英文；列表项用 `· ` 开头；`created_at` = commit 时间（UTC）。

## 5. 本地测试（不碰线上库）

- `dev/mock.html`：内存里的假 Supabase（`dev/mock-supabase.js`），不用登录，不会碰线上数据库。所有 UI 改动先在这里验证。
- 注意：`dev/` 整个目录是 gitignore 的，**克隆仓库拿不到**，需要作者单独发给你（`dev/mock.html`、`dev/mock-supabase.js`、`dev/propfirm/`）。
- mock 里 `data:` 截图 URL 不会打开灯箱（灯箱要求 http）。

## 6. 外观系统（2026-10-06 上线）

三个独立维度，在账户菜单里选，存在 localStorage（`journal_layout` / `journal_palette` / `journal_theme`），登录后同步到 `profiles.ui_prefs`（账号里的设置优先）：
- 布局：`classic`（原始顶部标签页）/ `modern`（**默认**，`data-layout="modern"`，theme-modern.css：侧边栏、问候、资金曲线、胜率环、日历热力图等）。作者非常喜欢 modern。
- 配色：`gold`（原黑金，默认，无属性）+ sky / violet / rose / sunset / ocean / graphite（`data-palette`，palettes.css）。
- **classic + gold 必须和原版像素一致**。modern 专属的 markup 用 `currentLayout() === "modern"` 控制，或在 classic 下用 CSS 隐藏。
- 在 theme-modern.css 里重写带状态类（`.active/.on/.complete/.isPicked/.dragOverTarget`…）的控件时，基础/hover 规则包在 `:where()` 里，让 style.css 的状态规则仍然生效（曾出过“选中的筛选 chip hover 时看起来没选中”的 bug）。
- 盈亏颜色：所有盈亏显示（结果标签、R/EV/PF/WR/DD、资金曲线、日历…）用 `--pnlPos/--pnlNeg` + `--pnlPosSoft/--pnlNegSoft`；`--pos/--neg` 只用于状态色（报错、删除、成功）。新 UI 保持这个区分。用户自定义颜色存在 `profiles.ui_prefs.calPos/calNeg`（旧键名，别改；ui_prefs jsonb 上限 1024 字节）。

## 7. 截图备份

- `.github/workflows/image-backup.yml` 每天 19:00 UTC 跑 `scripts/image-backup.mjs`：把所有用户的 FX Replay / TradingView 截图备份成无损 WebP 到作者的 Cloudflare R2 图床。**只备份，永不改原链接。**
- 仓库是公开的，脚本日志只打印数量，绝不打印 URL。所需 secret 只存在 GitHub secrets 里。
- 映射表 `image_backups`（无 RLS policy）；前端 `__imgFallback` 通过 RPC `lookup_image_backups(urls)` 在原图失效时切到备份。
- 不要调用图床的删除接口或修改图床。

## 8. Prop 账户（prop-test 分支，进行中）

为期货 prop firm 做的独立顶级标签页：公开目录（firm → 系列 → 计划卡片和规则）+ 每个用户自己的私有账本（考核 → 通过/失败 → 激活 → 资金账号 → 出金）+ 总花费/出金/ROI/月度回本。
- 代码：`src/11d-prop-data.js`（**目录 JSON 导入格式写在文件顶部**、ROI 规则、Supabase 读写）、`src/11e-prop-view.js`（页面、弹窗）、`src/11f-prop-admin.js`（管理员就地编辑目录）、i18n `prop.*`、style.css “Prop 账户”区块、`test/prop.test.js`。
- 表：prop_firms / prop_plans / prop_catalog_imports（公开读、admin 写），prop_accounts / prop_entries（个人 RLS）。RPC `prop_import_catalog` = admin 整体替换目录。
- 决定：只做期货；金额全部 USD，出金 = 到账美元，不建模手续费和汇率；不和日记里的交易关联。
- 规则值：数字 / `"none"`（没有这条规则）/ `null`（未知）。续费中的月费自动记账，离开考核阶段自动停止续费。通过率统计每一次 "failed"（含 reset）。
- 排行是**我们管理员自定义的顺序**（“推荐排行”），在“编辑目录”开关里调整。**重新导入完整 JSON 会覆盖手动编辑**——不要在未询问的情况下覆盖已经手调过的目录。
- 线上目录目前 18 家 / 228 个计划。数据来源：propfirmvip.com（仅个人参考，付费版不能转载）+ 部分官网数据（FFF、FFN、Phoenix、Topstep、Traders Launch，官网优先）。抓取/转换流水线在 gitignore 的 `dev/propfirm/`（有 README）。
- Logo 在 `img/prop/<slug>.webp|svg`（160px 方形）。
- 价格比较 = 卡片墙（每个 firm×系列×尺寸一张，卡上 chip 切版本，默认最便宜），表格保留为切换视图。用户最关心：尺寸、回撤、目标、价格、一致性规则、出金天数。
- 账户详情 = 右侧抽屉，信息随时可编辑；删除走卡片 ⋯ 菜单 + 10 秒撤销；支持批量选择；余额追踪显示离目标进度和剩余回撤空间。

## 9. 已废弃（不要复活）

- 目标/纪律/积分系统：2026-10-24 作者决定整体放弃。代码只在旧分支 `goals-test`，线上库还残留 goal_days、activity_daily、points_ledger、journal_schema.goal_prefs（正式代码不碰它们；删除前先问作者）。不要基于 goals-test 开发。

## 10. 术语与沟通

- 作者说交易的“标签”/“分类”时，通常指**交易表单里的自定义字段及其选项值**（例如 clean LQ raid = barely、result = BE），不是模型库（playbook）里的 tag 页面。复用通用的筛选条件编辑器（`filterNodeListHtml` + filter ctx）。不确定就先问。
- 和作者沟通一律用简体中文（代码、命令、标识符保持原样）。

## 11. 未来可能的方向（暂不做）

- 可能做付费版（交易课程 + 日记）。若做，迁到 Cloudflare Pages（Vercel Hobby 禁止商用），保留 Supabase；`build.js` 生成 app.js + config.js 的逻辑需要搬过去。作者没提起之前什么都不用做。

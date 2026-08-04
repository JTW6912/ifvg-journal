# IFVG Trade Journal — 项目交接文档

给新开的对话/Claude Code 用的完整背景。这份文档取代之前的 DATABASE.md 和 CODE_CONVENTIONS.md（内容更全、更新），先读这一份。

---

## 一、项目是什么

多用户交易日记网页应用。每个用户可以自定义记录字段、区分回测/实盘、查看统计分析、按月历查看交易分布。管理员有独立后台，能管理用户、只读查看任意用户的数据。

## 二、技术栈

- **前端**：纯 `index.html` 一个文件（HTML + CSS + vanilla JS，~2000+ 行），没有框架，没有构建步骤
- **后端**：Supabase（Postgres 数据库 + Auth 认证），没有自己写的服务器，前端直接调 Supabase JS client
- **部署**：Vercel（免费版），手动拖文件夹部署，没接 Git 自动部署
- **备份/运维**：GitHub Actions 定时任务（跑在一个独立的私有仓库里，跟主项目代码仓库分开）

## 三、数据库结构（当前真实状态）

### profiles（用户资料）
```
id            uuid, 主键, 引用 auth.users(id)
email         text
role          text, 'user' / 'admin'，默认 'user'
active        boolean，默认 true（false = 被禁用，登录后立刻踢出）
display_name  text，可空，用户自定义显示名（标题栏会用）
gender        text，'男' / '女'，可空
last_seen_at  timestamptz，可空，每次登录成功更新一次
created_at    timestamptz
```
- 新用户注册触发器 `handle_new_user()` 自动插入一行
- RLS：自己读自己那行 OR admin 读所有（`is_admin()`）；只有 admin 能 UPDATE 任意行的 role/active
- 普通用户改自己的 display_name/gender 走专用函数 `update_own_profile()`（不暴露 role/active，防越权）
- 更新自己 last_seen_at 走专用函数 `touch_last_seen()`

### trades（交易记录）
```
id          text, 主键
user_id     uuid, 引用 auth.users(id)
mode        text, 'backtest' / 'live'，默认 'backtest'
data        jsonb —— 这笔交易所有字段的值，key 是字段 id
created_at  timestamptz
updated_at  timestamptz
```
- RLS：自己读写自己的（`auth.uid() = user_id`）；另有一条 admin 只读所有人的（`select using (is_admin())`，只读不能写）

### journal_schema（每个用户的字段配置）
```
user_id         uuid, 主键, 引用 auth.users(id)
fields          jsonb —— 数组，每个元素一个字段定义
card_fields     jsonb —— 数组，卡片视图上额外显示哪些字段（空数组=用内置默认）
analysis_prefs  jsonb —— 分析页的所有个人配置，默认 '{}'
```
`analysis_prefs` 结构（缺任何一项都会在前端 `normalizeAnalysisPrefs()` 里补默认值，所以老数据/空列都能正常跑）：
```json
{
  "statScope": { "excludeHumanError": true, "takenOnly": true },
  "breakdownHidden": ["f_xxx"],
  "breakdownOrder": ["f_a", "f_b"],
  "combos": [{ "id": "c_xxx", "name": "…", "tag": "do|avoid|", "scopeTaken": true, "scopeHE": true, "conditions": [ /* 和记录页筛选行同构 */ ] }]
}
```
- **`breakdownHidden` 存的是「隐藏哪些」不是「显示哪些」**，`breakdownOrder` 也只存用户排过序的那部分——这样以后新加的字段会自动出现在拆解列表末尾，不会因为不在白名单里被吞掉
- 这一列要手动加（项目没有迁移工具）：
  ```sql
  alter table journal_schema add column if not exists analysis_prefs jsonb default '{}'::jsonb;
  ```
  RLS 不用动，沿用这张表原有的策略。没跑这条 SQL 的话 app 仍然能用，只是分析页的配置存不下来，前端会捕获 42703/PGRST204 并在页面上提示去跑这条 SQL
字段对象结构：
```json
{ "id": "date", "label": "日期", "type": "date", "role": "date", "options": [...] }
```
- `type`：text / textarea / number / date / time / select / multiselect / url
- `role`：""（无特殊含义）/ date / model / taken / result / r_multiple / max_rr / human_error / screenshot
- **前端所有功能（统计/日历/分析/卡片默认显示）都靠 `role` 识别字段用途，不认字段名叫什么**——改字段名字完全不影响功能
- RLS：跟 trades 一样，自己读写 + admin 只读

### changelog（更新日志，全局共享，不分用户）
```
id          bigint 自增主键
entry       text
created_at  timestamptz
```
- RLS：登录用户都能读；只有 admin 能 INSERT/DELETE

### 数据库函数
- `is_admin()` — security definer，判断当前用户是不是 admin，给其他表的 RLS 策略调用，避免直接查 profiles 造成递归
- `update_own_profile(new_display_name, new_gender)` — 普通用户改自己名字/性别专用，改不了权限
- `touch_last_seen()` — 更新自己的 last_seen_at
- `handle_new_user()` — 触发器，新用户自动建 profiles 行

## 四、前端架构

### 状态管理
全局 `let` 变量存所有状态（`schema`、`trades`、`activeFilters`、`tab`、`recordMode`、`viewingUserId` 等），没有框架式的响应式系统。改动状态后手动调用 `render()` 重新生成 HTML 字符串塞进 DOM。

### 事件委托（重要）
**所有交互靠 `data-action="xxx"` 属性 + 绑在 `document` 上的几个全局监听器**，不是每个元素单独绑事件：
- `document.addEventListener("click", ...)` —— 一长串 `if (action === "xxx") {...}`
- `document.addEventListener("change", ...)` —— select/input 变化
- `document.addEventListener("dragstart"/"dragover"/"dragend"/"drop", ...)` —— 拖拽排序
- `document.addEventListener("keydown", ...)` —— ESC 关闭弹窗

### 渲染根节点
- `#app` —— 主内容区（记录/分析/月度/设置等页签内容）
- `#modalRoot` —— 交易编辑弹窗（新建/编辑交易）
- `#secondaryModalRoot` —— 个人设置弹窗 / 图片灯箱 / 当日交易明细弹窗（互斥，同一时间只显示一个）

### ⚠️ 弹窗重绘保护（防止用户输入被冲掉）
`renderModal(force)` 和 `renderSecondaryModals(force)` 内部都有"已经显示的是同一个东西就跳过重绘"的守卫（`modalRenderedForId` / `secondaryModalState`）。**背景异步操作触发的全局 `render()` 不会无脑重建正在编辑的弹窗**，否则没保存的输入会被清空。新增弹窗类交互要参考这个模式。

### ⚠️⚠️ 最容易踩的坑：不要用 stopPropagation 包住带按钮的容器
**这个错误在项目里已经真实发生过至少两次**（交易编辑弹窗、表格删除按钮）。原理：子元素点击要冒泡到 `document` 才能被处理，中间任何一层用了 `stopPropagation()` 会让子元素按钮**彻底失效且不报错**，非常隐蔽。

- 需要"点背景关闭、点内容不关闭"时，用 `e.target === el`（点击目标就是背景本身）判断，不要用 stopPropagation
- 唯一安全场景：这个元素本身没有 data-action、也没有带 data-action 的子元素，纯粹不想让点击冒泡触发父级动作（比如一个新标签页链接，防止同时触发外层卡片的编辑弹窗）

### 改完代码务必做的两件事
```bash
# 1. 语法检查（提取 script 内容单独跑 node）
node --check extracted.js

# 2. 检查 data-action 声明和处理逻辑是否一一对应
grep -o 'data-action="[a-zA-Z-]*"' index.html | sort -u
grep -o 'action === "[a-zA-Z-]*"' index.html | sort -u
# 两边应该完全对得上
```

## 五、已实现的功能清单（避免重复造轮子）

- **账号**：邮箱注册登录、记住登录（localStorage/sessionStorage 切换）、改密码（需验证当前密码）、改显示名/性别
- **多租户隔离**：每个用户交易数据 + 字段配置完全独立（RLS 强制）
- **回测/实盘模式切换**，数据完全分开
- **自定义字段系统**：增删字段、改类型、改选项（支持拖拽排序）、打角色标签
- **记录页**：卡片视图（4档图片大小 + 可自定义额外显示字段）/ 表格视图切换，都支持分页
- **筛选**：多字段 AND，同字段内多选 OR（多选类型可切换成 AND）、反选、日期/时间区间、文字包含；拖拽调整筛选卡片顺序；结果实时显示胜率/W/L/BE/总R/EV；本地持久化，记录页和月度页共用同一套筛选状态
- **草稿保护**：新建交易（不含编辑已有交易）自动存草稿到本地，意外关闭能恢复
- **ESC 键**：关闭当前最上层的弹窗/灯箱
- **月度页**：月度概览条（R值上色）+ 每日明细热力图（点击查看/新建/删除当天交易，含照片预览）+ 历史回测覆盖总览（仅回测模式，2020至今）
- **分析页**：
  - 总览：胜率 / Setup Quality / 总R / EV / **Profit Factor**（正R之和 ÷ |负R之和|，只统计真的填了 R 的交易，无亏损显示 ∞）/ R捕获率
  - **统计口径开关**：「只算 Taken」「排除人为错误」两个独立勾选，默认都开，存数据库。**同时作用于总览和字段拆解**，但不影响组合
  - **字段拆解**：所有 select/multiselect 字段（只排掉 `result` 角色，因为按结果拆是自我循环）。每行 `n` 是该值下的**全部**笔数（含 BE 系列），**胜率分母只算 W 和 L**，两者口径不同是有意的。可勾选隐藏、拖拽排序，配置存数据库
  - **组合**：一组存下来的筛选条件 + 自定义命名 + 可选「可以做 / 要避免」标记。实时显示胜率/n/W-L-BE/总R/EV/PF，以及相对同口径全局值的差值（`+9.2pp`），n<10 会标「样本仅 N 笔」。可拖拽排序
  - 三个建组合的入口：分析页「新建组合」、记录页筛选栏「把当前筛选存为组合」、字段拆解每行的「+组合」
  - 记录页筛选栏也显示 Profit Factor，算法与分析页一致
- **⚠️ 分析页/记录页数字必须一致的机制**：组合的完整条件由 `comboFilterRows()` 唯一产出（两条可关的口径条件 + 用户条件），组合卡片的统计和「跳到记录页」用的是**同一个函数的返回值**。改这块时不要在任何一边另写一份口径逻辑，否则两边数字会对不上，用户会当成 bug
- **⚠️ `tradeMatchesFilter()` 找不到字段时 `return true`**：意味着删掉字段后，引用它的组合会静默降级成「匹配全部交易」，数字突然变好看却没有任何提示。所以 `comboIssues()` 会在渲染前把失效字段/失效选项挑出来标红并禁掉统计。新增任何「保存下来的条件」类功能都要考虑这个陷阱
- **管理后台**（仅 admin 可见）：API 连接配置、用户管理（禁用/启用、设权限、查看上次在线时间+交易总数）、**只读查看任意用户的数据**（不影响自己的登录状态和本地设置，退出后自动恢复原状）
- **更新日志页**：全局共享，仅 admin 能发布/删除
- **深色/浅色主题**、图片懒加载

## 六、部署流程

- Vercel 免费版，**手动拖文件夹部署**，没接 Git 自动化
- 更新代码后：项目页面 → Deployments → 进某条部署详情 → Source 里的 "Vercel Drop" 链接 → 重新拖整个文件夹
- 不要用 "Redeploy" 按钮，那个只是重跑旧代码，不会读取新文件

## 七、备份与防暂停

- Supabase 免费版：**7 天无数据库活动会自动暂停**（暂停不丢数据，但连续暂停 90 天会释放项目基础设施，需要靠备份手动重建）；免费版本身**不提供任何自动备份**
- 解决方案：**独立的私有 GitHub 仓库**，`.github/workflows/daily-backup.yml` 每天自动跑 `pg_dump`，覆盖式存成 `latest-backup.sql`，靠 Git 的 commit 历史保留每天的快照。这个任务本身也顺带解决了"防暂停"的问题（不需要再单独跑 keepalive 任务）
- 连接 Supabase 用 **Session pooler** 格式的连接串（不是 Direct connection），因为多数网络是 IPv4，Direct connection 默认走 IPv6 容易连不上

## 八、安全模型

- 网页里硬编码的 Supabase URL + anon/publishable key **本来就设计成可以公开**，任何人查看网页源代码都能看到，这不是漏洞
- **真正的安全防线是每张表的 RLS 规则**，不是"藏 key"。新增表/新功能时，RLS 有没有配对才是要仔细检查的地方
- **绝对不能**把 `service_role`/secret key 放进任何前端代码——那个 key 能绕过所有 RLS，等于数据库最高权限
- 如果这份代码要开源：`index.html` 顶部的真实 key 要换回占位符（`PASTE_YOUR_SUPABASE_URL_HERE` 这种），让每个部署者填自己的凭证，避免大家共用同一个数据库

## 九、还没做 / 已知风险点

- **拖拽排序功能（筛选卡片、字段选项池、组合卡片、拆解字段列表）从没在真实浏览器里跑过完整测试**，只做过静态代码检查 + node 里的逻辑测试，可能有边界情况没覆盖到
- **管理员"只读查看他人数据"退出后状态还原**的完整链路也没有真机测试过
- 现在整个项目是单文件、没拆分 HTML/CSS/JS，多人协作或开源会有摩擦（合并冲突、上手门槛），是否要拆分是一个待定的、值得单独作为一轮任务处理的事项，不建议和其他任务混在一起做
- `max_rr` 这个角色目前有支持逻辑但新用户默认字段模板里没给，属于可选功能，缺了不影响核心功能，只是"R捕获率"这一项统计不会显示

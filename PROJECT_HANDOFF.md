# IFVG Trade Journal — 项目交接文档

给新开的对话/Claude Code 用的完整背景。这份文档取代之前的 DATABASE.md 和 CODE_CONVENTIONS.md（内容更全、更新），先读这一份。

---

## 一、项目是什么

多用户交易日记网页应用。每个用户可以自定义记录字段、区分回测/实盘、查看统计分析、按月历查看交易分布。管理员有独立后台，能管理用户、只读查看任意用户的数据。

## 二、技术栈

- **前端**：`index.html` 只是外壳。**源码在 `src/*.js`（按文件名数字前缀的顺序）**，`bundle.js` 把它们原样拼成 `app.js`——同一个全局作用域，跟以前单文件时行为完全一致，不是 ES module。`app.js` 是产物（已 gitignore），**别直接改它**。另有 `style.css` / `i18n.js`（中英词典）。没有框架
  - 本地：`npm run bundle` 拼一次，或者 `npm run dev` 监听 `src/`。Vercel 构建时 `build.js` 会先跑 bundle 再生成 `config.js`
  - 浏览器报错只给 `app.js` 的行号；文件里每个 src 文件前都有一行 `/* >>> src/xx.js */` 路标，往上找最近的一个就知道在哪个文件
  - `npm test` 跑 `test/*.test.js`（node 自带 test runner，零依赖）。`test/load.js` 把 `i18n.js` + 全部 src（除了 `16-init.js`）拼成一个脚本丢进 vm——必须是一个脚本，函数声明要提升到整个文件。目前覆盖：统计引擎、筛选树、markdown 渲染、分页加载、保存/删除的本地更新
- **后端**：Supabase（Postgres 数据库 + Auth 认证），没有自己写的服务器，前端直接调 Supabase JS client
- **部署**：Vercel（免费版），已接 Git —— `git push origin master` 之后自动部署
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
ui_prefs      jsonb，可空，外观 {layout, palette, theme}（20261006000000_ui_prefs.sql）
created_at    timestamptz
```
- 新用户注册触发器 `handle_new_user()` 自动插入一行
- RLS：自己读自己那行 OR admin 读所有（`is_admin()`）；只有 admin 能 UPDATE 任意行的 role/active
- 普通用户改自己的 display_name/gender 走专用函数 `update_own_profile()`（不暴露 role/active，防越权）
- 更新自己 last_seen_at 走专用函数 `touch_last_seen()`
- 外观（布局 / 配色 / 日夜）走专用函数 `update_own_ui_prefs(jsonb)`；登录后账号里存过就以账号为准，没存过就把本机的选择补写上去

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
fields          jsonb —— 数组，每个元素一个字段定义 { id, label, type, role, options?, hidden? }
card_fields     jsonb —— 数组，卡片视图上额外显示哪些字段（空数组=用内置默认）
focus_fields    jsonb —— 数组，看图视图上额外显示哪些字段。⚠ 没有 default：null=没配过（用内置默认），[]=用户主动清空（一个都不显示），两者必须能区分
analysis_prefs  jsonb —— 分析页的所有个人配置，默认 '{}'
```
- `fields[].hidden === true` = **停用**（不是删除，也不需要迁移，jsonb 里多一个键而已）。语义只有一条：
  **hidden 只影响写，不影响读**。录入表单里不出现（`activeSchema()`），新交易在这个字段上留空；
  其余所有地方——`breakdownCandidateFields()` / 组合 / 筛选 / 导出 / 卡片和看图的额外字段——一律用完整的
  `schema`，老数据的统计口径完全不变。恢复时把 `hidden` 键整个删掉，不留 `hidden:false`
  - 编辑**老**交易时，那些 hidden 且这笔填过值的字段（`hasFieldValue()`）会在表单底部单独一段翻出来。
    不这么做的话，当初填过的值就变成只能看不能改的死值——想改个错别字都得去 Supabase 后台。
    新建交易 (`_isNew`) 一律不显示这一段
  - `save-trade` 遍历完整 schema 但只写 `if (inputEl)`，所以表单里没渲染的停用字段不会被空值覆盖；
    `formDraft = { ...editingTrade }` 已经把老值带上了
  - 停用带核心角色（date / result / r_multiple，见 `CORE_ROLES`）的字段会 confirm 一次：
    新交易在这些字段上留空 = 胜率、PF、回撤从下一笔起全部失真
- `focus_fields` 这一列在 `supabase/migrations/20260901000000_journal_features.sql` 里。**没有 default，是刻意的**：null = 没配过（用内置默认），[] = 用户主动清空。
- **为什么不跟 `card_fields` 共用一份**：卡片是缩略图墙、一屏几十张，字段多了就糊；看图模式一屏一笔、右边有整栏空间，正好把长文本挂上去。共用一份的话改一边另一边就被连累
`review_prefs` 结构（复盘分组，缺项由 `normalizeReviewPrefs()` 补默认值）：
```json
{ "groups": [ { "id": "rg_xxx", "name": "常见错误", "mode": "live" } ] }
```
- 数组顺序就是分组的显示顺序；`mode` 决定这个分组属于回测还是实盘
- **只有一级分组**，刻意不做二级：复盘是长文，两级会让「这篇到底在哪」变难找（组合那边是两级，别照抄过来）
- 这一列在 `supabase/migrations/20260901000000_journal_features.sql` 里。

`analysis_prefs` 结构（缺任何一项都会在前端 `normalizeAnalysisPrefs()` 里补默认值，所以老数据/空列都能正常跑）：
```json
{
  "breakdownHidden": ["f_xxx"],
  "breakdownOrder": ["f_a", "f_b"],
  "combos": [{ "id": "c_xxx", "name": "…", "tag": "do|avoid|", "scopeTaken": true, "scopeHE": true, "conditions": [ /* 和记录页筛选行同构 */ ] }],
  "comboGroups": [{ "id": "g_xxx", "name": "…", "parentId": null, "directOrder": 0 }],
  "timeBuckets": ["09:30", "09:45", "10:00", "10:30", "11:00", "12:00"]
}
```
- **`breakdownHidden` 存的是「隐藏哪些」不是「显示哪些」**，`breakdownOrder` 也只存用户排过序的那部分——这样以后新加的字段会自动出现在拆解列表末尾，不会因为不在白名单里被吞掉
- 这一列在 `supabase/migrations/20260901000000_journal_features.sql` 里，RLS 沿用这张表原有的策略。
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

### journal_reviews（复盘帖子）
```
id                text, 主键
user_id           uuid, 引用 auth.users(id)
title             text
body              text —— markdown 原文（不是 HTML，渲染在前端做）
week_start        date, 可空 —— 关联到哪一周（周一那天）
day_date          date, 可空 —— 关联到哪一天。和 week_start 互斥，两个都空 = 自由帖
linked_trade_ids  text[] —— 保存时从正文 [[trade:xxx]] 抽出来的冗余索引
mode              text, 'backtest' / 'live'，默认 'live'
group_id          text, 可空 —— 归属哪个分组，null/'' = 未分组
sort_order        double precision, 可空 —— 手动拖拽排序；null = 没排过，按 created_at 倒序兜底
folded_headings   jsonb, 默认 [] —— 正文里折起来的那几节：[{ l: 级别, t: 标题文字, n: 同级同名里第几个 }]。按文字认不按位置；前端单独 update 这一列、不碰 updated_at
created_at        timestamptz
updated_at        timestamptz
```
- **回测和实盘各一套**（`mode` 列），跟 trades 一样。页签两边都显示，切模式时列表和分组一起换
- **前端不再对缺表 / 缺列做降级**（以前有 `upsertReviewRowsHealing()`「摘列重存」那一整套，已经删了）。库比代码旧时，`isSchemaOutdatedError()`（42P01 / 42703 / PGRST204 / PGRST205）→ `noteDbError()` 置 `dbOutdated`，页面顶部常驻一条「去跑 `supabase/migrations`」。理由：降级写进去的数据是残缺的，比直接报错更难收拾；也省掉了「缺列被误判成缺表」那个坑
- **分组归属放在行上（`group_id`），分组定义放在配置里（`journal_schema.review_prefs`）**。归属是数据，定义是个人配置；这么分之后不会出现「配置里记着某篇在 A 组、那行却已经被删了」这种对不上的情况。`reviewEffectiveGroupId()` 在归属的分组已经不存在时一律退回未分组，卡片不会凭空消失
- `linked_trade_ids` 只是索引，**正文才是唯一真相**。改正文一定要重新抽一遍（`extractTradeRefs()`），别让两边对不上
- RLS：跟 trades 一样，自己读写自己的 + 一条 admin 只读（`select using (is_admin())`）
- **关联到哪一天/哪一周由 `reviewPeriodKind()` 唯一判定**：`day_date` 有值就是日复盘，否则看 `week_start`，都没有就是自由帖。**day_date 优先**——万一两列都有值（正常切换会清另一个，但脏数据难说）也有个确定的落点，不会两处显示不一致
- 建表和后加的列（mode / group_id / sort_order / day_date）都在 `supabase/migrations/20260901000000_journal_features.sql`，可重复执行；`folded_headings` 在 `20261001000000_review_folds.sql`

### journal_playbook（模型库：交易系统 / 衍生策略 / 标签 / 错题 / 待验证）
```
id                text, 主键（p_ 开头）
user_id           uuid, 引用 auth.users(id)
kind              text —— 'system' 交易系统 / 'strategy' 衍生策略 / 'mistake' 错题笔记 / 'verify' 待验证 / 'tag' 标签
parent_id         text, 可空 —— 策略 → 所属系统；错题 / 待验证 / 标签 → 所属系统或策略，空 = 通用
status            text, 可空 —— 只有待验证用：'watching' 观察中 / 'works' 验证可做 / 'rejected' 已否定，null 按观察中读
title / body      text —— body 是 markdown，跟复盘同一套渲染和编辑器
linked_trade_ids  text[] —— 正文里 [[trade:xxx]] 的冗余索引（错题「涉及的交易」就是它）
sort_order        double precision, 可空 —— 同级顺序，null = 按创建先后
folded_headings   jsonb —— 跟复盘一样
trade_marks       jsonb, 默认 {} —— 笔记 / 标签页面上每笔交易的标记：{ 交易id: { fav: true, ev: "pro" | "con" | "key" } }（见下面「交易区」）
created_at / updated_at
```
- 建表在 `supabase/migrations/20261003000000_playbook.sql`，`status` 在 `20261004000000_playbook_verify.sql`。RLS 跟复盘一样：自己读写 + admin 只读
- `pbRowPayload()` **只在待验证上写 `status`**：系统 / 策略 / 错题的保存不依赖这一列，迁移没跑之前那几样照常能存
- **跨回测 / 实盘只有一份**（没有 mode 列）。所以只在 `loadAll()` 里拉，`reloadModeData()` 不拉
- **交易属于哪一页存在交易自己身上**：`trades.data.__pb`（页面 id；`"__none"` = 确认过不属于任何模型）、`trades.data.__pb_star`（关注）、`trades.data.__pb_tags`（打了哪些标签，标签 id 数组）、`trades.data.__pb_note`（归类记录，纯文本）。不是用户字段，不在 schema 里；指向已删除页面的 `__pb` 一律按「未归类」读（`pbTradePageId()`）
- 为什么不跟 journal_reviews 共表：复盘按 mode 分两套、有分组和拖拽，模型库是跨模式的一份，混在一起复盘那边每一处查询都要多排除一次

### 数据库函数
- `is_admin()` — security definer，判断当前用户是不是 admin，给其他表的 RLS 策略调用，避免直接查 profiles 造成递归
- `update_own_profile(new_display_name, new_gender)` — 普通用户改自己名字/性别专用，改不了权限
- `touch_last_seen()` — 更新自己的 last_seen_at
- `handle_new_user()` — 触发器，新用户自动建 profiles 行
- 复盘那张表不需要新函数，RLS 直接复用 `is_admin()`

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
- `#reviewEditorRoot` —— 复盘编辑器（全屏浮层，`z-index:90`，故意低于 `.overlay` 的 100，好让交易弹窗盖在它上面）

### ⚠️ 弹窗重绘保护（防止用户输入被冲掉）
`renderModal(force)`、`renderSecondaryModals(force)` 和 `renderReviewEditor(force)` 内部都有"已经显示的是同一个东西就跳过重绘"的守卫（`modalRenderedForId` / `secondaryModalState` / `reviewEditorRenderedFor`）。**背景异步操作触发的全局 `render()` 不会无脑重建正在编辑的弹窗**，否则没保存的输入会被清空。新增弹窗类交互要参考这个模式。

### ⚠️⚠️ 最容易踩的坑：不要用 stopPropagation 包住带按钮的容器
**这个错误在项目里已经真实发生过至少两次**（交易编辑弹窗、表格删除按钮）。原理：子元素点击要冒泡到 `document` 才能被处理，中间任何一层用了 `stopPropagation()` 会让子元素按钮**彻底失效且不报错**，非常隐蔽。

- 需要"点背景关闭、点内容不关闭"时，用 `e.target === el`（点击目标就是背景本身）判断，不要用 stopPropagation
- 唯一安全场景：这个元素本身没有 data-action、也没有带 data-action 的子元素，纯粹不想让点击冒泡触发父级动作（比如一个新标签页链接，防止同时触发外层卡片的编辑弹窗）

### 改完代码务必做的两件事
```bash
# 1. 语法检查（代码已经拆成独立 js 文件，直接跑）
node --check app.js
node --check i18n.js

# 2. 检查 data-action 声明和处理逻辑是否一一对应
grep -o 'data-action="[a-zA-Z-]*"' app.js | sed 's/.*="//;s/"//' | sort -u
grep -o 'action === "[a-zA-Z-]*"' app.js | sed 's/.*=== "//;s/"//' | sort -u
# 两边应该完全对得上（set-gender-draft / toggle-low-sample 是历史遗留的例外，
# 它们不走 click 委托那条 if 链）

# 3. 中英词典有没有漏词（i18n.js 是浏览器脚本，得在 vm 里跑一下才能拿到 I18N）
node -e "$(cat <<'JS'
const fs=require('fs'), vm=require('vm');
const sb={window:{},navigator:{language:'zh'},localStorage:{getItem:()=>null,setItem(){}},document:{documentElement:{}},console};
vm.createContext(sb);
vm.runInContext(fs.readFileSync('i18n.js','utf8')+';var E=I18N;', sb);
const I=sb.E;
console.log('zh 有 en 没有:', Object.keys(I.zh).filter(k=>!(k in I.en)));
JS
)"
# en 那边会多出若干 *_one 的英文单数形式，是正常的
```

## 五、已实现的功能清单（避免重复造轮子）

- **账号**：邮箱注册登录、记住登录（localStorage/sessionStorage 切换）、改密码（需验证当前密码）、改显示名/性别
- **多租户隔离**：每个用户交易数据 + 字段配置完全独立（RLS 强制）
- **回测/实盘模式切换**，数据完全分开
- **自定义字段系统**：增删字段、改类型、改选项（支持拖拽排序）、打角色标签
- **记录页**：卡片视图（3档图片大小 + 可自定义额外显示字段）/ 表格视图 / **看图视图** 三选一，都支持分页
- **看图视图（focus）**：一行一笔的大图浏览模式，专门用来连着翻几十笔找规律、养盘感，跟卡片视图的取舍**正好相反**——卡片是「找到那一笔」的缩略图墙，看图是「把这一笔看清楚」。详见下面「记录页：看图模式」那一段
- **筛选**：多字段 AND，同字段内多选 OR（多选类型可切换成 AND）、反选、日期/时间区间、文字包含；拖拽调整筛选卡片顺序；结果实时显示胜率/W/L/BE/总R/EV；本地持久化，记录页和月度页共用同一套筛选状态
- **虚拟字段「创建日期 / 修改日期」**（`VF_CREATED` / `VF_UPDATED`，id 是 `__created_at` / `__updated_at`）：不是用户定义的字段，不在 `schema` 里、不落 `trades.data`、交易弹窗和字段设置页都不出现；数据来自 `trades` 表本来就有的两列，`loadAll()` 已经映射成 `t._created_at` / `t._updated_at`。包装成「长得像 date 字段」的对象之后，三套筛选、组合条件、卡片额外字段、表格列、CSV 导出全部免费复用现成代码。**回测模式下这两个日期跟交易日期完全是两回事**：交易日期可能是 2021 年的历史 K 线，创建日期才是「我什么时候做的这笔回测」
  - ⚠ **按 id 找字段一律走 `resolveField()`，不要再直接 `schema.find()`**。漏一处的后果很隐蔽：组合里存了创建日期条件，`comboIssues()` 会把它当成「字段已删除」标红并禁掉整个组合的统计
  - ⚠ **取值一律走 `tradeFieldValue()`，不要直接 `t[field.id]`**。`_created_at` 是完整 UTC ISO（`2026-09-06T20:14:33.921Z`），必须先 `localDateStr()` 折成用户本地时区的自然日才能跟筛选框的 `YYYY-MM-DD` 比。直接比会同时错两处：(a) `"2026-09-06T20:14..." > "2026-09-06"` 恒真，结束日期选当天会把当天的单全部排除；(b) 北京时间晚上 8 点以后录的单 UTC 已经是第二天，整整错开一天
  - `_updated_at` 为空的老数据会回落到 `_created_at`，免得筛「修改日期」时整批凭空消失
  - `created_at` 不会被编辑改写：`persistTrade()` 的 upsert payload 里没有这一列，PostgREST 只更新 payload 里出现过的列。真库上验证过。另外交易 id 本身是 `"t_" + Date.now().toString(36) + 随机串`，创建时间冗余编码在 id 里，万一将来出问题还有得救
- **记录页：看图模式（focus）**（`renderFocusList()` / `.focus*` 样式）：
  - **一行一笔**，左边一张不裁的大图，右边（或底下）挂用户在 `focus_fields` 里选的字段。图片高度三档（`FOCUS_HEIGHTS`，62/78/92vh）+ 字段位置两档（右侧 / 底部），都存 localStorage
  - **⚠ 这里的图刻意不裁、不定宽高比**（`object-fit:contain` + 只给 `max-height`），跟卡片视图的 `aspect-ratio:16/10` + `object-fit:cover` 正好相反。卡片裁是为了网格整齐，这里裁就等于每笔丢掉的 K 线上下文都不一样，看盘最怕这个。**改这块时不要顺手"统一"成 cover**
  - **⚠ `.focusShot` 只写 `max-height` 不写死 `height`**：写死的话，被列宽卡住的宽图（实际没那么高）上下会留出一大片空 letterbox
  - **⚠ 侧栏的内容装在一层 `position:absolute` 的 `.focusSideInner` 里**，所以侧栏自己对行高的贡献是 0——行高永远只由图片决定。改成普通流式布局的话，一篇长 notes 能把整行拉到两屏高。例外有两个，都在 CSS 里显式关掉了 absolute：`.sideBottom`（字段在底下，本来就该由内容撑高）和 `.noShot`（没截图，行高该由侧栏定，否则字段全被挤进 240px 的滚动条）
  - **右侧 vs 底部的实测取舍**（1680×1000 窗口、高度档「大」）：右侧栏吃掉 320px 之后，宽高比 > 1.6 的图（16:9、21:9 都在内）**会先被列宽卡死、根本顶不到设定高度**，实测图高 526~780 不等；好处是一整笔正好一屏，滚动节奏最舒服。底部则是图能吃满整行宽、高度封顶真正生效（实测 669~780、更齐更大），代价是一笔占 900~1100px、超过一屏。**默认右侧**——一屏一笔的翻牌节奏比再大 20% 更值钱
  - **遮挡结果**（`focusMasked`）：盖住 result 和 R、保留日期和模型，点「揭晓」再看。是用来练盘感的，不是查账。**故意只放内存不存 localStorage**——被记住的话第二天打开记录页只看到一排盖住的牌，会莫名其妙。关掉遮挡时连 `focusRevealed` 一起清空，免得再打开是一排已经翻好的牌
  - **⚠ 图片和整行都没有 `data-action="edit-trade"`**：卡片视图整张卡点了就进编辑弹窗，在这儿会变成灾难——一边翻一边看，误触一次就弹一个编辑器。这里点图是开 lightbox 看原图，要改得点右下角那个明确的「编辑」
  - **J / K · ↑ / ↓ 翻笔**（`focusKeyNav()`，排在 Escape 那串处理之前）：自己先把所有"正在输入 / 有弹层"的情况让开，否则搜索框里打不出 j。翻笔时**只改 `isCurrent` 类和序号条的 textContent，不重渲染整页**——重渲染会把所有 `<img>` 拆了重建，滚动中途图会闪
  - 一页固定 10 笔（`FOCUS_PAGE_SIZE`），不跟卡片视图那样按列数算
  - `docs/focus-mode-mockup.html` 是定方案时用的静态 mockup（引项目真的 style.css、现场画假 K 线），上面那组实测数字就是在它上面量的
- **⚠ 卡片视图原来的第 4 档「超大图」(`CARD_SIZES.huge = 500`) 已删除**，被看图模式取代。它还是走 `.grid` 的多列布局、还是被 `object-fit:cover` 裁，在 2200px 的 `.wrap` 里一行照样排四张——是"更宽的缩略图"，不是"看得清的大图"。老用户 localStorage 里还存着 `"huge"`，所以**所有从 localStorage 读枚举的地方一律过 `pickStored()` 白名单**：不校验的话四个尺寸按钮会全都不高亮，还查不出为什么
- **草稿保护**：新建交易（不含编辑已有交易）自动存草稿到本地，意外关闭能恢复
- **ESC 键**：关闭当前最上层的弹窗/灯箱
- **月度页**：月度概览条（R值上色）+ 每日明细热力图（点击查看/新建/删除当天交易，含照片预览）+ 历史回测覆盖总览（仅回测模式，2020至今）
- **分析页**：
  - **「分析范围」面板（`analysisFilters`）**：分析页顶部的筛选器，取代了旧的「统计口径开关 + 模型筛选」。**和记录页 `activeFilters`、月度页完全独立**——独立数组、独立 localStorage key（`journal_analysis_filters`）、独立事件上下文（`data-filter-ctx="analysis"`），两边互不影响。默认只有一条「已入场 = Taken」，所以用户不展开面板时看到的就是 Taken 的数据。面板头常驻一行「全部 412 → 47」的口径链条。里面的「只看 Taken / 排除人为错误」是**快捷按钮**，点一下往条件里加/删一条看得见的普通条件，不是隐藏开关
  - **⚠️ 这一页唯一的口径规则**：总览数字、Faded 那行、字段拆解，全部出自 `computeStats()` 返回的同一个 `list`。**不要再往任何一处加"从别处另算一批"的逻辑**——旧版口径开关就是因为藏在别处，用户老是觉得数字对不上
  - 总览：交易数 / 胜率 / Setup Quality / 总R / EV / **Profit Factor**（正R之和 ÷ |负R之和|，只统计真的填了 R 的交易，无亏损显示 ∞）/ **最大回撤**（`maxDrawdownR()`：按日期把 R 累成资金曲线取峰谷最大跌幅，单位 R，只算填了 R 的交易，没填日期的排最后）
  - 标题栏那行 `taken 30 · WR 51.9%` 走的是**独立的 `headerStats()`**，固定「只算 Taken」口径，故意不吃分析页筛选——它代表账号整体水平，不该被页内临时筛选带偏
  - **近期表现**（`renderRecentPanel()` / `recentWindowStats()`）：总览下面一行四格 —— 最近 3 / 7 / 30 天 + 当前范围全体。问的是「我最近这几天**录进来**的单打得怎么样」，所以按**创建日期**切，不是交易日期
    - 三个窗口**故意重叠**（最近 3 天也在最近 30 天里），读法是「越往右越平滑」。正因为重叠它不能做成拆解卡——拆解卡各行的语义是互斥分桶，混进重叠窗口会让人以为笔数算错了
    - 最右边那格是基准，前三格标相对它的差值。切的是 `computeStats()` 那个 `list`，**不是 `trades`**——跟总览、拆解永远是同一批交易的时间切片，不是"从别处另算一批"
    - 「最近 3 天」= 今天 + 昨天 + 前天（本地自然日，今天算第 1 天）。不用「往回 72 小时」是因为那样同一批交易上午看和下午看结果会不一样
    - `n < BREAKDOWN_MIN_SAMPLE` 的格子降透明度并标「样本少」：3 笔里 2 胜 = 66.7% 是纯噪音，不能长得跟 n=80 那格一样有说服力
  - **字段拆解**：所有 select/multiselect 字段（只排掉 `result` 角色，因为按结果拆是自我循环），**外加所有 `time` 字段**（按时间段分桶，见下条）。每行 `n` 是该值下的**全部**笔数（含 BE 系列），**胜率分母只算 W 和 L**，两者口径不同是有意的。每行右边标「相对当前这批整体胜率的差值」；样本不足的行不画色条、不标差值、整行降透明度并挂「样本少」标签；多选字段卡片带「多选」标记（各行 n 之和 > 总笔数是预期行为）。可勾选隐藏、拖拽排序，配置存数据库，**全局唯一一份**（不按组合分开存——那样新加字段要去每个组合里勾一遍）
  - **显著性排序 + 重点发现** —— 见 app.js 里「显著性」那一整段
    - **⚠️ 绝对不要用 `|胜率 - 整体胜率|` 来找发现**。小样本天生波动大，跑一次蒙特卡洛就能看到：**数据里一点 edge 都没有的时候，按差值排仍然有约 2/3 的概率把 n≤5 的行顶到第一名**。它找的不是发现，是最小的那个样本。排序下拉里那个「按离整体多远」保留着是因为偶尔要用，但默认已经换成显著性
    - 算法是**两比例 z 检验**（胜率口径）/ **Welch t 检验**（R 口径），口径都是**这一行 vs 其余所有交易（补集）**，不是 vs 整体。这一行本身是整体的一部分，跟整体比会把差距稀释——某个值占了 70% 的交易时它跟整体必然接近，但跟另外那 30% 可能差很远
    - **默认按 R 不按胜率**：胜率不是交易者的目标函数（40% 胜率的 +3R 打法比 65% 胜率的 +0.3R 赚得多），而且**胜率完全看不见 BE 的磨损**。两个口径都在下拉里显式列着，**不做隐式切换**——那样用户会问「为什么我的排序自己变了」
    - **⚠️ 多重比较是这块最危险的地方**：10 个字段 × 每个 5 个值 ≈ 50 个组合，按 p<0.05 纯随机也会有 ~2.5 个看起来显著。所以三条一起上：① 分数只用来**排序**，绝不显示 p 值、绝不用「显著」当结论词；② 「强信号」徽章只发给过了 **Benjamini–Hochberg FDR**(q=0.10) 的行；③ 重点发现底下常驻一句「本次检验了 N 个组合，预计有 ~X 个是随机波动」。实测（加密级随机、20 轮）：真 edge 检出率 90%，噪音误标约占全部徽章的 16%，跟 q=0.10 相符
    - **⚠️ `sig.p` 是在 `computeBreakdowns()` 里按当前口径现算的**（胜率口径取 `pWr`，R 口径取 `pR`），不在 `breakdownRowSignificance()` 里写死——用户切了排序口径，该被 FDR 校正的那一批也得跟着换。**漏了这一步的后果是徽章永远不出现而且不报错**（这个 bug 真的写出来过一次，靠端到端测试才抓到）
    - **重点发现**（`topFindings()`）跨所有字段挑最强的几条摆在拆解区顶上，点一条跳到对应卡片并闪一下。**一个字段最多占一条**：二值字段（BW / non-BW）的两行互为补集，是同一个发现的正反两面，都列出来等于用两个名额说同一件事
    - **卡片排序**（`breakdownCardOrder`，localStorage）：`sig` 按显著性自动排 / `manual` 用户拖出来的顺序。一张卡的分数取**卡里最高的那个 |z|，不是平均**——问题是「先看哪个字段」，取平均会让一个爆点被同卡里的平庸值稀释掉。**`sig` 模式下必须把拖拽关掉**（拖了没反应还不报错是本项目明令禁止的那类交互）；反过来，在设置面板里拖字段顺序会**自动切回 manual**，否则用户拖完发现卡片纹丝不动
  - **样本阈值可配置**（`analysisPrefs.minSample`，默认 5，存数据库跟着账号走，因为这是方法论不是设备偏好）。一个旋钮同时管：拆解行的降权折叠、显著性排序的准入、重点发现的准入、「近期表现」那四格
    - **⚠️ 阈值按「各指标自己的分母」算，不统一卡 `n`**。因为 `n` 含 BE 而胜率只算 W/L：一行 `n=20` 里有 18 个 BE 的话，它顶着 n=20 的外表混过 n≥5，但那个胜率其实**只有 2 笔**支撑。所以胜率检验卡 `W+L`，R 检验卡「填了 R 的笔数」，显示层的折叠仍然卡 `n`（卡片上显示的就是 n）
    - 低于阈值的行**只降权折叠、不删除**：删掉的话用户就看不出「这个值存在但只有 2 笔」，而且各行 n 之和对不上总数——项目在别处（「其他时段」那行、失效选项标红）一直坚持不静默丢东西
    - `BREAKDOWN_MIN_SAMPLE` 只是**默认值**，实际生效一律走 `currentMinSample()`，别直接读那个常量。跟 `DEFAULT_TIME_BUCKETS` 一样它必须声明在 STATE 之前，否则 `defaultAnalysisPrefs()` 在模块加载时读它会撞 TDZ
  - **时间段拆解**（`computeTimeBreakdown()` / TIME BUCKETS 那一段）：`time` 字段没法像 select 那样按值拆（每个 09:37 都是独一无二的值，拆出来是几十行 n=1），所以按用户定义的边界切成时间段。边界存 `analysisPrefs.timeBuckets`，默认是美股 RTH 那套（`DEFAULT_TIME_BUCKETS`），在「拆解显示设置」里改，记 London/Asia 时段的用户改成自己的
    - 跟项目其他地方一样**只认 `type === "time"`，不认字段叫什么名字**，所以以后加个「出场时间」会自动多出一张拆解卡。全局一套边界，所有 time 字段共用
    - 段是**左闭右开**：`["09:30","09:45"]` → `[09:30, 09:45)`，09:45 那笔算下一段。落在所有段之外的归到最后一行「其他时段」，**不静默丢掉**，否则用户会觉得笔数对不上
    - ⚠ **行末「+组合」生成的区间要退一分钟**（`timeMinusOneMinute()`）：段是右开的，但筛选行的时间区间**两头都闭**（`tradeMatchesFilter` 里 `tv > rangeEnd` 才排除）。直接把段的 end 填进筛选，09:45 那笔会同时算进 `[09:30,09:45)` 这一行**和**它生成的组合，两个数字对不上——正是项目最忌讳的那种"几边数字不一致"
    - 这张卡带 `ordered: true`，渲染层据此**固定按时间先后排、不吃排序下拉、也不折叠低样本行**。时间轴一旦被重排或者中间挖个洞，「开盘那半小时最好、11 点以后最差」这种趋势就读不出来了。空段不出行（一张全是「—」的卡没意义）
    - `DEFAULT_TIME_BUCKETS` 这个 const **声明在文件最上面的 STATE 之前，不在 TIME BUCKETS 那一段里**：`let analysisPrefs = defaultAnalysisPrefs()` 在模块加载时就会读它，放在下面会撞 TDZ，app.js 整个起不来（改的时候真踩过一次）
  - **组合**：一组存下来的筛选条件 + 自定义命名。实时显示胜率/n/W-L-BE/总R/EV/PF，以及相对全局值的差值（`+9.2pp`），n<10 会标「样本仅 N 笔」。可拖拽排序
  - **点组合卡片上的「分析这个组合」**（`apply-combo-to-analysis`）= 把该组合的条件**复制**进「分析范围」面板，于是总览和全部字段拆解都只算这个组合里的交易。是复制不是绑定：在面板里怎么改都动不到组合本身，改过之后横幅会变成「（条件已改动）」并给出「把改动写回组合」。这条路径**完全不碰记录页**；想跳记录页看明细是旁边那个独立的「查看这 N 笔交易」按钮
  - 三个建组合的入口：分析页「新建组合」、记录页筛选栏「把当前筛选存为组合」、字段拆解每行的「+组合」
  - **分析页 → 记录页/月度页的两座桥**（分析页和记录页各用各的筛选数组，所以要显式搬运）：
    1. 组合卡片的「查看这 N 笔交易」（`open-combo-in-grid`）—— 走 `comboFilterRows()`
    2. 分析范围面板的「去记录页看这 N 笔 / 去月度页」（`apply-analysis-filters`，`data-target` 决定落到哪一页）—— 把 `analysisFilters` **深拷贝**给 `activeFilters`，不用先存成组合
    两条路都会先把跳转前的 `activeFilters` 存进 `preComboFilters`，「还原筛选」靠它原样恢复。**是复制不是共享**：搬过去之后两边各改各的。
  - `activeFromAnalysis` 只用来在记录页/月度页顶上显示「这套筛选是搬过来的」横幅（`renderFilterOriginBanner()`，两页共用），**不参与任何统计**。用户一手动改筛选就连同 `activeComboId` 一起清掉
  - **控制页面长度的几条规则**（这一页天生会很长，下面每条都是为了压高度，改动前先想清楚再动）：
    - `.breakdownGrid` 必须保留 `align-items:start`。CSS grid 默认 `stretch`，一行里所有卡片会被拉到最高那张的高度——12 行的字段旁边那些 1~2 行的卡会陪着空几百像素
    - **当前范围内只有一个值的字段不进网格**，收进底下 `.bdUniform` 那一行灰字。这类字段（通常是被筛选钉死的）拆出来必然单行、差值恒等于 0，信息量数学上就是零
    - **样本不足的行默认折成一行「其他 N 项」**（`breakdownRowsHtml()`），点开才展开，展开状态只在内存里。只在有 2 行以上可折时才折——折 1 行既不省高度又少了信息
    - 拆解排序 `breakdownSort`（按笔数 / 按离整体多远 / 按 EV）在**渲染时**做（`sortBreakdownRows()` 要用整批胜率当基准），`computeBreakdowns()` 里那次按 n 排只是给个稳定初始顺序
    - 组合区支持**卡片 / 列表**两种视图（`comboViewMode`）。列表模式走 `renderComboRow()`，但**刻意保留 `.comboCard` 类名、`draggable` 和 `data-combo-id`**——拖拽排序和投放分组的处理器全靠这三样定位，所以换布局不用动一行拖拽代码
    - 组合区 / 拆解区两个大区块可整块折叠（`collapsedAnalyticsSections`，存 localStorage）
    - 顶部 `.analyticsSticky` 是**纯 CSS 的 `position:sticky`**，没有滚动监听。别改回 `position:fixed` + scroll 事件那套：那样要同步 JS 状态，而且后台标签页/不合成帧的环境里 scroll 事件根本不发。锚点跳转靠 `#anaScope/#anaOverview/#anaCombos/#anaBreakdowns` 上的 `scroll-margin-top` 给粘条让位，不要手算偏移
    - 筛选行的选项超过 `COLLAPSE_CHIPS_OVER`(5) 个时默认只显示已选中的，其余收进「+N 更多」。分析页和记录页/月度页都启用，**组合编辑器不启用**——那是专门展开来编辑条件的地方，正在挑值时把选项藏起来只会碍事。展开状态的 key 必须走 `chipKey(ctx, idx)` 带上下文前缀，否则记录页第 0 行和分析页第 0 行会互相影响
- **三个筛选面板共用一套外壳**（`.filterPanel*`）：分析页的「分析范围」、记录页和月度页的「筛选条件」长一个样。都有折叠时的一行人话摘要（`filterPanelSummaryHtml()`，复用 `comboConditionsText()`）和标题上的「230 → 57」链条（`filterPanelChainHtml()`）。记录页和月度页共用同一份 `activeFilters`，所以也共用 `filterPanelOpen`
- **⚠️ 空条件匹配全部交易**：`tradeMatchesFilter()` 遇到没选值/没填区间/没填文字的条件一律 `return true`。所以「一键清空已选」（把每行清空、保留行）和「把数组清空」筛出来的是同一批交易——曾经并存的「看全部交易」按钮就是因为这个被删掉的。再加同类按钮前先想清楚是不是又在做重复的事
  - 记录页筛选栏也显示 Profit Factor，算法与分析页一致
- **⚠️ 分析页/记录页数字必须一致的机制**：组合的完整条件由 `comboFilterRows()` 唯一产出，组合卡片的统计、「跳到记录页」、「分析这个组合」三条路径用的都是**同一个函数的返回值**。改这块时不要在任何一边另写一份口径逻辑，否则几边数字会对不上，用户会当成 bug
- **⚠️ 三套筛选共用同一套筛选行 DOM，靠元素属性区分改的是哪个数组**（`filterCtxOf()`）：`data-filter-ctx="analysis"` → 分析页 / `data-combo-id="c_xxx"` → 那个组合 / **两个都没有 → 记录页的 `activeFilters`**。新增筛选入口时忘了带自己的上下文属性，会默默把用户的记录页筛选改掉，而且不报错。筛选行的拖拽排序只有记录页那份有，另外两处条件之间是 AND、顺序不影响结果，就没做
- **筛选条件树（嵌套的 且 / 或 / 非）** —— 见 app.js 里「筛选条件树」那一整段。平铺的「所有条件一律 AND」表达不了「排除掉某个组合」：比如 *noticeable 整体胜率低，但 noticeable + BW gap 是能做的*，要写的是 `非( 信号=noticeable 且 gap=non-BW )`，对一个组合取反。`非(noticeable)` 会连好的一起杀掉，`非(non-BW)` 会误伤别的，平铺列表里没有任何写法能表达
  - **模型上的取舍：顶层仍然是数组、仍然是隐式 AND，只是数组元素可以是条件，也可以是分组**。于是 localStorage 里的筛选和数据库里的组合**读上来就是合法的树，零迁移**，没建过分组的界面也跟以前一模一样
    - 叶子 = 原来的筛选行，字段一个没变
    - 分组 = `{ op: "and"|"or", negate: bool, children: [叶子|分组] }`，`isFilterGroup()` 靠 `Array.isArray(n.children)` 认
  - **⚠️ 空分组必须中性，而且要忽略 negate**。项目铁律是「没填的条件匹配全部交易」，照搬到分组上就是「空分组 = 全部」，那么「非(空分组)」= 全部筛掉——用户刚点出一个分组还没来得及填，页面唰地空了，看起来完全像 bug。所以 `nodeMatchesTrade()` 先用 `filterNodeIsEffective()` 数有效子节点，一个都没有直接 `return true`。字段被删掉的条件也算无效，免得它污染外面的取反
  - **⚠️ 定位节点一律用路径不用下标**：`data-idx="1.0.2"` 表示顶层第 1 个 → 它的第 0 个孩子 → 再第 2 个。`filterNodeAt()` / `filterParentAt()` / `filterChildListAt()` 负责解析。**嵌套之后单层下标彻底不够用，混用会改错节点而且不报错**。换字段那条（`data-filter-field`）必须走 `filterParentAt()` 写回父数组的那一位，因为换字段 = 整行重置
  - **⚠️ 凡是遍历条件的地方都要能穿透分组**。已经处理的：`pruneFilterNodes()`（存组合时剪空节点——**不能写成 `arr.filter(f => f.fieldId)`，分组没有 fieldId，那样会把用户搭的整棵子树静默丢掉**）、`cloneFilterNodes()`（深拷贝，两座桥靠它）、`flattenFilterLeaves()`（`comboIssues` 报「第 N 条」用它，编号才跟用户从上往下看的一致）、`countFilterConditions()`、`filterNodeText()`（带括号的人话表达式）、「一键清空已选」（递归清值但**保留分组结构**）
  - **嵌套限死两层**（`MAX_FILTER_GROUP_DEPTH`）：顶层数组 + 分组 + 分组里再一层。到底了就不再显示「添加条件分组」按钮。理由跟组合分组限死两层一样——无限嵌套的 UI 会难读到没人用。深度超限的数据不丢，照常渲染，只是不给继续加
  - **布局上的硬要求：没建分组时界面跟以前像素级一致**。所以分组也活在条件行那个 flex-wrap 容器里：折叠态是跟条件行同样宽的一张卡（`flex:1 1 320px`），能跟条件行并排；展开态才 `flex-basis:100%` 独占一行。**分组默认折叠**，只显示一行 `非(a 且 b)` 的人话摘要——分析页天生就长。新建的分组例外，建完自动展开（`expandedFilterGroups`，纯内存 UI 状态，不落库），否则点完"添加分组"屏幕上只多一行灰字，像没反应
  - 折叠态头上的徽章：取反时只写「排除」（红），不写「非全部满足」——右边摘要已经是「非(a 且 b)」，重复不说，「非全部满足」还容易被误读成「不是全都满足」
  - 拖拽排序只保留**记录页顶层的条件行**，且只能同父换位。跨层拖拽（拖进/拖出分组）的语义说不清楚——"拖到分组标题上"到底是塞进去还是插在它前面，怎么定都有人拖错
  - **数字字段走数值区间，不走字符串包含**（`tradeMatchesFilter` 的 number 分支）。以前数字字段落在 textValue 那条兜底路径上，**填 2 会把 12、2.5 一起捞进来**，而且「R ≥ 2」根本写不出来。现在复用 `rangeStart`/`rangeEnd`：只填左边 = ≥，只填右边 = ≤，都填 = 闭区间；设了边界之后没填值的那批不算满足（跟日期区间一致）
    - 老数据在 `migrateLegacyNumberCondition()` 里就地迁移：数字字段上遗留的 textValue 变成「精确等于」（那正是当初填 `2` 想表达的意思，也比原来的包含匹配更准）。**`tradeMatchesFilter` 里另有兜底**：万一没迁移成功（比如 schema 还没加载），仍按老的包含匹配走，绝不会 `return true` 静默变成「匹配全部」——那种放宽会让数字凭空变好看且毫无提示
  - **⚠️ 回滚代价**：组合存在数据库里。一旦存了带分组的组合，如果代码回滚到没有这段的版本，旧代码会把分组节点当成一条 `fieldId` 为空的条件 → `resolveField` 返回 null → `tradeMatchesFilter` 直接 `return true` → **那个组合悄悄变成「匹配全部交易」，数字突然变好看且毫无提示**。回滚点打在 tag `pre-filter-tree`
- **⚠️ `tradeMatchesFilter()` 找不到字段时 `return true`**：意味着删掉字段后，引用它的组合会静默降级成「匹配全部交易」，数字突然变好看却没有任何提示。所以 `comboIssues()` 会在渲染前把失效字段/失效选项挑出来标红并禁掉统计。新增任何「保存下来的条件」类功能都要考虑这个陷阱
- **管理后台**（仅 admin 可见）：API 连接配置、用户管理（禁用/启用、设权限、查看上次在线时间+交易总数）、**只读查看任意用户的数据**（不影响自己的登录状态和本地设置，退出后自动恢复原状）
- **复盘页**：用户自己发帖，markdown 正文，可以把帖子关联到某一天/某一周，也可以在正文里关联到具体某笔交易。回测/实盘各一套。下面几条是这块最容易改坏的地方：
  - **编辑器是 Notion 式所见即所得（Tiptap 3 / ProseMirror），2026-09 从「textarea + 右侧预览」改过来的**。打 `# ` 变标题、`- [ ] ` 变待办、选中文字浮出格式栏、打 `/`（中文输入法下行首的 `、` 也算）调出插入菜单。没有「只读 / 编辑」两种模式了：自己的帖子打开就能写，只读只留给管理员查看别人数据（`reviewCanEdit()` 为 false 时直接用 `renderMarkdown()` 出静态页，不创建编辑器）
  - **⚠️⚠️ 库里存的仍然是 markdown，`journal_reviews.body` 没有迁移**。打开时 `mdToEditorHtml()`（= `renderMarkdown(src, true)`）→ Tiptap 解析；编辑后停手 300ms 才 `docToMarkdown(editor.getJSON())` 一次（`markReviewBodyChanged()` → `syncReviewBody()`），再接 1.2 秒的写库。**所以编辑器开着时 `editingReview.body` 最多落后 300ms——任何要读它的地方（保存、关闭、`beforeunload`）先调 `syncReviewBody()`**。两个方向共用 `renderMarkdown` / `mdInline` 那一套规则，所以卡片摘要、搜索、`extractTradeRefs()`、管理员只读视图都不用改。**改渲染器或序列化器之后一定要跑往返测试**：markdown → 编辑器 → markdown 两轮结果要一致，而且 `renderMarkdown(原文) === renderMarkdown(往返后)`。在浏览器控制台里 `await loadTiptap()` 之后 `new L.Editor({ element, extensions: reviewExtensions(L), content: mdToEditorHtml(md) })` 就能测，不用登录
  - 往返里会被**规范化**的东西（内容不丢，只是写法变了）：`*`/`+` 列表符号统一成 `-`、有序列表重新从 1 编号、段落中间单独一行的图片被拎成独立块、连续空行合并。第一次编辑老帖子时 body 会因此变一下，这是预期的
  - **反斜杠转义**是这次新加的语法（`MD_ESCAPABLE_RE`）：编辑器里打出字面的 `*` `[` `#` 之类，存回去必须写成 `\*` `\[`，否则下次打开就变成语法了。`mdEscapeText()` 只转义真会被误读的字符，`mdEscapeLineStart()` 负责段落行首长得像块语法的情况（`1. ` `- ` `# ` `> ` `---`）。别为了「markdown 看着干净」把这两个函数删掉
  - **schema 故意收紧了**：列表项里只允许「一段 + 子列表」，引用里只允许段落，表格格子里只放段落，图片是块级节点，下划线扩展关掉了。原因是 markdown 那边只表达得了这些——放宽了的话能在编辑器里做出来、却存不回去。要加新块类型，先想清楚 markdown 怎么写、渲染器认不认
  - 自定义的两样：`mdColor` mark（`{red|文字}`，只输出 `mdC-xxx` 类名）、`tradeRef` 行内原子节点（`[[trade:id]]`，用 node view 画成和只读视图一样的胶囊，id 只收 `[A-Za-z0-9_-]`）。都在 `reviewExtensions()` 里
  - **Tiptap 打成了同源的 `vendor/tiptap.js`**（约 430KB，gzip 后 135KB），入口和重新生成命令在 `vendor/tiptap-entry.mjs`。app.js 里 `loadTiptap()` 第一次打开编辑器时才 `import()`，进复盘页时会在后台预取。**升级 Tiptap 时所有 @tiptap 包必须同一个版本**，并且改 `TIPTAP_URL` 的 `?v=`。加载失败会退回纯文本框（`mountReviewFallback()`）直接写 markdown，照常自动保存
  - **⚠️ 编辑器有自己的根节点 `#reviewEditorRoot`（index.html 里第 4 个根），不在 `#app` 里面**，`renderReviewEditor(force)` 用 `reviewEditorRenderedFor` 守卫，跟 `renderModal` 的 `modalRenderedForId` 同一个套路。编辑器打开期间任何状态变化都不许走会重建它的路径，只能定点更新：保存状态 `updateReviewSaveBadge()`、关联日/周那一行 `refreshReviewWeekRow()`、浮层都画进 `#reviewFloatRoot`（格式栏 `updateBubble()`、插入菜单 `renderSlashMenu()`、小弹框 `openReviewPop()`、提示条 `showReviewToast()`）、交易选择器只换结果区
  - 重建外壳时（`renderReviewEditor(true)`、关闭、切模式）一定会先 `destroyReviewTiptap()`；异步加载回来靠 `reviewMountSeq` 判断还该不该挂载，防止连点两篇时挂出两个编辑器
  - **⚠️ Tiptap 的 `.focus()` 命令是下一帧才真正挪焦点的**（踩过两次）。在它之后同步打开的输入框（图片/链接小框、交易选择器）会被它把焦点抢回去。所以 `applySlashItem()` 删 `/query` 那一步**不带** `.focus()`；标题里回车跳正文先同步 `view.focus()` 再 `commands.focus("start")`
  - 浮层（格式栏、小弹框、插入菜单）都是 `position:fixed`，坐标直接用 `view.coordsAtPos()`，外壳滚动时 `__reviewScroll` 重新定位。浮层容器上的 `__reviewFloatMouseDown` 对按钮 `preventDefault`——点按钮不能让编辑器失焦，否则选区没了；输入框例外。编辑器 `onBlur` 时如果焦点是进了浮层里的输入框（改链接），不算离开
  - 键盘：我们自己的 `reviewEditorKeydown()` 只管插入菜单的上下/回车和 `Ctrl+S` / `Ctrl+K`，**第一行必须先看 `e.isComposing || view.composing`**，否则输入法选词时的回车会被插入菜单吃掉。其余快捷键（加粗、标题、列表、撤销……）全是 Tiptap 自带的。**Escape 不在编辑器里处理**，交给 document 上那条 ESC 链
  - 粘贴（`reviewEditorPaste()`）：光秃秃一个图片链接 → 图片；纯文本里带 markdown 块语法 → 按 markdown 排好版再插；剪贴板里是图片文件本身 → **不上传**，弹提示让用户走外部图床（用户明确要求图片不进数据库）。其余交给 Tiptap（选中文字粘链接 = 加链接）
  - 自动保存靠 `reviewEditRev` 判断「保存途中有没有又改过」：对不上就保持 dirty、补回本地草稿，排着的那次保存照常写。以前是直接标成已保存，排着的保存一看不是 dirty 就跳过，最后几下只留在 localStorage 里
  - **目录和折叠章节在 `src/12b-review-outline.js`**。目录直接读正文 DOM 里顶层的 h1–h6（编辑态、只读态、加载中三种情况共用），宽屏（≥1240px）钉在右边、收没收记在 `journal_review_outline`，窄屏是顶栏按钮的下拉面板。折叠是 ProseMirror 插件 + node decoration（所以 `vendor/tiptap.js` 多导出了 `Decoration` / `DecorationSet`），**纯显示，不进文档、不进撤销栈、不写进 markdown**；光标落进折叠区就自动展开。折了哪几节存在 `folded_headings`（`writeReviewFolds()`，停手 800ms 单独 update；新帖等第一次保存成功后补写），打开时插件 `init` 按标题文字对回位置。**别直接改编辑器 DOM 的 class**（ProseMirror 的 MutationObserver 会当成内容变了重新解析），目录跳转后的闪烁是另画一层 `.outlineFlash`
  - 双击图片看大图（`handleDoubleClickOn` → `renderSecondaryModals(true)`）；单击是选中它（方便删）。Ctrl/⌘ + 点击链接在新标签页打开
  - **⚠️⚠️ markdown 渲染器是整个项目唯一一处把用户输入变成 HTML 的地方**，别处全部走 `esc()`。而管理员能只读查看任意用户的数据，所以一段带 `<img onerror>` 的复盘正文会在**管理员的会话**里执行。`renderMarkdown()` 的铁律是**先 `esc()` 整段、再在已转义的文本上加白名单标签**，链接/图片的 URL 只放行 `^https?://`（挡 `javascript:` 和 `data:`）。任何时候都不要为了支持某个语法把原始 HTML 放回去。编辑器那边是第二道白名单：Tiptap 只认 schema 里定义过的节点，链接 `isAllowedUri`、图片的 parseHTML 都只放行 http(s)
  - `mdInline()` 里生成出来的 HTML（交易胶囊、图片、链接标签、行内代码、转义字符）一律先存进私有区字符包着的占位符（`hold()`），最后递归还原。留在明面上的话，URL 或模型名里的 `*` `_` 会被后面的加粗/斜体规则插进 `<em>`，把属性改坏
  - 交易引用**不需要带 mode**：复盘按模式分开了，回测复盘里引用的必然是回测交易，而 `trades` 本来就只装当前模式那批，所以永远能对上。别因为「跨模式查不到」这个担心去给引用加 mode
  - **点交易胶囊弹的是只读预览（`tradePreviewHtml`），不是编辑弹窗**。跟 focus 视图那条规矩一致：读的时候不该一点就出来一堆输入框。预览挂在 `#secondaryModalRoot`，在 `want` 链里排在 lightbox 后面——这样在预览里点图看原图、关掉原图还能退回预览。要改走底部明确的「编辑这笔交易」
  - **⚠️ 预览里渲染 url 类型字段时必须 `esc(mdSafeUrl(...))`**（已经踩过一次）。`mdSafeUrl()` 只判协议、**不转义**；它在 markdown 渲染器里够用是因为那边整段开头就 esc() 过了，而这里拿的是原始字段值，少一次 esc 就能让 `https://x.com/a" onmouseover="alert(1)` 从 href 里逃出去挂上事件处理器
  - **正文上色**语法是 `{red|文字}`，颜色名走 `MD_COLORS` 白名单，渲染出去的只有我们自己的类名（`mdC-red` 这种），具体色值在 style.css 里按主题定义。**绝不能把用户写的东西当成 CSS 塞进 style**。上色规则放在加粗/斜体**之前**，所以序列化时颜色必须是最外层的 mark（`MD_MARK_ORDER`）；内容不允许跨行，序列化遇到换行会先把所有 mark 关掉
  - **交易引用**语法是 `[[trade:t_xxx]]`，`tradeRefHtml()` 渲染成可点的胶囊（日期 · 模型 · 结果 · R）。**找不到那笔交易时显式标红「已删除的交易」，不静默消失**——组合引用失效字段那个老坑的同款处理
  - **分组的拖拽跟组合分组是同一套路子**：拖卡片落到另一张卡片上 = 插到它前面（同组内重排，跨组就是连搬带插）；落到分组区块的空白处 = 只改归属、排到该组末尾；拖分组标题落到另一个标题上 = 分组换位置。投放区靠 `[data-group-drop]`，白名单在 `DRAGGABLES` 里。「未分组」那个桶复用同一套外壳，但**标题不可拖**（它不是真分组），只能作为投放目标
  - **⚠️ 挪进某个分组时要把目标桶整批重编号**，不能只给挪进来的那几条编号：桶里原有的可能 `sort_order` 还是 null，而 null 在显示顺序里排最后，只编号新来的会让「挪到末尾」反而显示在最前面
  - **⚠️ 删分组不删里面的复盘**，退回未分组。组合那边是级联删的，别照抄——复盘是长文，顺手删掉一整组等于毁掉几个小时的记录
  - 分组标题上的「在这里新建」建出来的帖子**默认不关联日/周**（分组基本是给「常见错误 / 猜想」这类跟某一天无关的条目用的），顶部那个「写复盘」默认关联今天
  - 搜索时**把结果拍平成一个列表、不按分组显示**，每条标出所属分组。否则搜到的东西可能藏在折叠着的分组里，用户会以为没搜到
  - 交易选择器的搜索**没有复用记录页的 `tradeMatchesSearch()`**，另写了 `tradePickerMatches()`。前者只搜 text/textarea/url，而这里最常搜的恰恰是日期和模型（select 类型）
  - **⚠️ 格式栏、插入菜单、交易选择器这些浮层里全是按钮，不要用 `stopPropagation` 包容器**（见第四节那条踩过两次的坑）。「点背景关闭、点内容不关闭」用 `e.target === el` 判断，`close-trade-picker` 就是这么写的；「点浮层外面收起」在 click 委托最开头统一处理
  - 层级：`.reviewEditorOverlay` 是 `z-index:90`，**故意低于 `.overlay` 的 100**——从复盘里点开一笔交易时，交易弹窗要盖在编辑器上面。ESC 的处理顺序是 灯箱 → 图片/链接小框 → 插入菜单 → 格式栏的二级面板 → 交易选择器 → 交易预览 → …… → 交易弹窗 → 复盘编辑器
  - 自动保存：停手 1.2 秒写库（`scheduleReviewSave` / `flushReviewSave`），同时每次输入镜像一份到 localStorage（`journal_review_draft`，跟交易草稿各存各的），另有 `beforeunload` 兜底。**新建的空白帖子直接关掉不会落库**，免得攒一堆空行
  - 还没做、值得做的：左侧 ⋮⋮ 拖动块（官方 drag-handle 扩展依赖 yjs 协作那一套，太重，得自己写一个）；TradingView 快照页链接自动换成图片直链

- **模型库页签**（`src/11b-playbook-data.js` 模型 / `src/11c-playbook-view.js` 界面）：交易系统 → 衍生策略 → 错题笔记。来源是用户反馈：「模型只是一个标签名，没有地方写清楚这个模型到底是什么；旧交易没分类，想一笔笔归进去、标出关注的单子和错题」
  - **页面就是复盘编辑器**：`editingReview` 带 `kind` 就是模型库页面。`persistReview()` / `writeReviewFolds()` 按 `isPbDoc()` 换表，自动保存、草稿、折叠、目录全部复用。正文上面那一行（复盘的「关联日/周」那格 `#reviewWeekRow`）换成属性行（类型、归属下拉、成绩、删除）；正文下面多一块 `#pbPanels`（衍生策略 / 错题集 / 关注的交易 / 全部交易；错题页是 涉及的交易 / 相关错题）。**`#pbPanels` 在 Tiptap 挂载点外面**，`refreshPbPanels()` 随便整块重画，不会碰正在写的正文
  - **成绩默认把所有归进来的交易都算进去**（Taken、Faded、missed、data-gathering 都算）：模型库问的是「这个 setup 本身表现如何」，没做的单也是样本——用户明确要的默认（以前固定排除 Faded，已去掉）。想只看实际做了的，在模型库页顶上「成绩口径」里设（`analysisPrefs.pbScope`，有「只算 Taken」快捷按钮）。`pbCountsInStats()` 是唯一判定，`pbStats()` 走它——卡片、页面、标签对比、导出全部一致。**刻意跟分析页的「分析范围」分开**，代价是两边数字可以不一样，所以口径非默认时面板标题挂「N → M」、页面属性行标「按模型库成绩口径」、导出说明里写出口径。条件行复用记录页那套 DOM，上下文是 `data-filter-ctx="playbook"`（`PB_SCOPE_CTX`，见 `filterCtxOf()`）
  - **数据范围（`analysisPrefs.dataScope`，08 文件里 `dataScopeConditions()` 那一组）是全站的底层过滤**：用户用 schema_version = 2 区分新交易和旧数据，但筛选各页一份，侧栏数字、模型库列表和归类队列里旧数据都还在。设了之后 `scopedTrades()` 代替 `trades` 喂给：顶部 / 侧栏数字（`headerStats` / `navSparkHtml`）、记录页、日历、分析页、组合、模型库（`pbTradesOf` / `pbTagTrades` / 未归类数 / 归类队列），`pbCountsInStats()` 也先看它；各页自己的筛选和模型库成绩口径叠在上面。**交易本身一笔不少**（`trades` 数组不动）：复盘 / 笔记里的胶囊照样能点开；笔记交易区里范围外的单独列在最后、变灰、不算成绩。默认空 = 完全不生效（网站有别的用户）。入口在账号菜单「数据范围…」，生效时顶部数字后面和侧栏底部挂一枚标签。「暂时看全部」（`dataScopeBypass`）只记在本机 localStorage。范围是平铺的「选择字段 是 一个值」时，新建交易自动填上那个值（`applyDataScopeDefaults()`）。导出中心多一个「数据范围内」（两种模式都按范围筛，不看暂停）。条件编辑器上下文 `data-filter-ctx="datascope"`（`DATA_SCOPE_CTX`）
  - **错题 ⇄ 待验证互转**（`pbConvertNote()`，笔记页属性行的「⇄ 转成待验证 / 转成错题」）：两种笔记数据上是同一种东西，转换 = 换 kind，正文、关联交易、归属、别处链到它的 `[[page:id]]` 全部原样保留，随时能转回去。转成待验证时状态从「观察中」开始。默认顺手把正文里**还是模板原样**的标题对调（`pbSwapNoteHeadings()`：错误现象 ↔ 想验证什么、如何规避 ↔ 结论，中英文模板都认，级别不变），不然便利贴按标题取的要点会落空；用户自己写的标题不动，确认框里能取消。待验证标成「已否定」时按钮变成醒目的「转到错题库」——跟「验证可做 → 升级成衍生策略」正好是两个出口。正文是在编辑器外面改的，所以先 flush 再改、存好后重新挂编辑器
  - **执行情况**：不管口径怎么设，每一页「全部交易」上面都有一张按 taken 字段实际值分组的小表（`pbExecGroups()`：Taken / Faded / missed / data-gathering / 没填，各自笔数、胜率、平均 R、总 R），点一行筛下面的列表（`pbExecFilter`）。直接用用户填的值不翻译成「做了 / 没做」——每个人叫法不一样，按值分永远对得上。顺序跟字段选项一致，选项里没有的值接后面，没填的排最后。交易行、归类模式、交易预览上都挂着这笔的 taken 值
  - **错题涉及哪些交易 = 错题正文里的 `[[trade:xxx]]`**，「这笔错在哪」就是紧跟在胶囊后面那句话。归类模式里「加入错题」是往正文「涉及的交易」那一节末尾追加一个 `- [[trade:id]] 错在哪` 列表项（`pbAppendTradeToBody()`），移出只删那一行列表项（`pbRemoveTradeFromBody()`）；正文别处行文里还提到这笔时不动、如实报错——那是用户自己写的句子。认标题时中英文两种模板标题都认（`pbHeadingNames()`），切过语言也找得到
  - **页面引用 `[[page:id]]`**：跟交易胶囊同一个套路（`pageRefHtml()` / 编辑器里的 `PageRef` 节点 / 插入菜单「链接页面」/ 页面选择器），能指向模型库任何一页或一篇复盘。找不到时标红不静默消失。错题页的「相关错题」= 这条链出去的 + 链到这条的
  - 编辑器里从一页点到另一页走 `navigateEditorTo()`：先 `finishEditingDoc()` 存完（新建空白页照旧扔掉），压进 `editorBackStack`，顶栏出一个「←」。面包屑每一级都能点
  - **删页面不连带删长文**：系统下面还有衍生策略时不让删；页面上的错题和待验证挪到上一层（策略 → 系统，系统 → 通用）；归在策略上的交易一次 upsert 整批挪到所属系统（`pbPatchTrades()`），系统上的变回未归类
  - **归类模式**（`pbTriage`）：一屏一笔，数字键归到第几项（0 = 不属于任何模型）、S 关注、E 错题、V 待验证、Enter/→ 下一笔、← 上一笔。队列是开始时拍下来的 id 列表——边归类边从「未归类」里消失的话下标会挪、按「下一笔」会跳过一笔。改交易先改本地再写库（按键节奏，等网络会涩），写失败整批改回去并提示。「建议」先看同一个模型标签以前大多被归到哪一页（学出来的对应关系），没有再按名字匹配（`pbSuggestFor()`）
  - **归类记录**（这笔的记录，`__pb_note`）：归类模式里「属于哪个模型」下面一个文本框，N 进去写，`{Ctrl}+Enter` 存好并下一笔，框里按 Esc 只是收起光标（`stopPropagation`，不然 document 上那条 Esc 链会把整个归类关掉）。**打字时不 render()**：停手 1.2 秒 / 失焦 / 翻笔 / 退出归类时存，只改右上角状态小字；没存的那份放在 `pbTriage.noteFor/noteText`，中途别的操作重画了也不会被库里旧值盖回去。存在交易上而不是页面上，改归到别的策略时跟着走。能看到的地方：页面「全部交易」每行底下一行（带「只看有记录的」开关）、关注的交易截图墙、交易预览、交易表单（模型库一栏里能改）、虚拟字段 `VF_PB_NOTE`（筛选按包含、卡片/看图/表格/导出）、记录页搜索
  - **「也写进页面」**：跨好几笔才看得出来的发现，不该只挂在某一笔上——一键追加到这笔所归页面正文的「归类时的发现」一节（`pbAppendFindingToBody()`，`- 日期 [[trade:id]] 那句话`，没有这一节就在文末补），在页面正文和目录里都看得到
  - **交易表单顶上的「模型库」一栏**只在实盘 + 建过页面（或笔记）时出现；选了策略就把它的错题和待验证（策略自己的 + 所属系统的 + 通用的）摆出来，进场前看一眼。**每条前面能勾**：勾上 = 这笔也算进这条笔记。勾选先记在 `pbFormNotes`（11c），**点保存、`persistTrade()` 返回 true 之后**才由 `pbApplyFormNotes()` 写进各条笔记正文——取消表单笔记不动，新交易也不会先写一个指向不存在交易的胶囊。**要改的那条笔记正开在编辑器里**（在笔记页点开一笔交易 → 编辑，表单盖在编辑器上面）时，`pbSetTradeInNote()` 不改库里那份，而是走 `pbSetTradeInOpenNote()` 给编辑器发一个 ProseMirror 事务（`pbEditorAddTrade` / `pbEditorRemoveTrade`，规则跟 markdown 版一样只认「开头是这笔胶囊」的列表项），能 Ctrl+Z、折叠不乱，然后马上 `flushReviewSave()`。以前这里是悄悄跳过，用户取消勾选后保存什么都不变。笔记页 / 标签页的交易磁贴左上角有 ×（悬停才出现），分别是移出这条笔记、摘掉这个标签。
  - **交易区（`pbTradeAreaHtml()`）**：系统 / 策略 / 错题 / 待验证 / 标签页下面同一套——（待验证）可以下结论了的提示 → 关联交易 → 收藏 → 全部交易（成绩表 + 列表）。列表每一行直接点收藏、点关联、原地改记录（`pbStartRowNote` / `pbSaveRowNote`）、移出，不用进交易编辑表单。上下文在 `pbAreaCtx()`：系统 / 策略页的收藏是交易身上的 `__pb_star`、记录是 `__pb_note`；笔记页的收藏 / 关联存在页面的 `trade_marks`、记录是正文里胶囊后面那句话（改它走 `pbEditorSetLineNote()` 编辑器事务，能 Ctrl+Z），交易自己的归类记录灰色只读挂在下面；标签页收藏存 `trade_marks`、记录是 `__pb_note`
  - **收藏和关联是两回事**（用户明确要求分开）：收藏 = 有意思的单子，不影响结论；关联 = 真正决定这条笔记结论的那几笔（待验证分支持 / 反驳，点一下支持再点反驳；错题只有一种「关联」；标签没有）。成绩、便利贴上「关联」那一行、`pbVerdictHint()` 的提示都只看关联。**`trade_marks` 单独 update 那一列（`pbWriteMarks()`），不走整行 upsert**：笔记开在编辑器里时 `pbPages` 里的正文可能比编辑器旧，整行写会把旧正文写回去；`pbRowPayload()` 也刻意不带它，编辑器的自动保存不会覆盖标记。移出 / 摘标签时 `pbDropMarks()` 一起清；错题 ⇄ 待验证互转时关联值跟着换（key ↔ pro，反驳去掉）
  - 可以下结论的提示：关联笔数 ≥ 分析页「最少样本」、支持占比 ≥ 70% 或 ≤ 30% 时给切换状态的按钮；样本到两倍门槛还五五开时提示拆细。成绩表里少于门槛的行标「样本少」
  - 第一次打开一条笔记时，正文里「涉及的交易」那一节自动折起来（交易区比那串胶囊好用）。每条笔记只自动折一次，记在 localStorage `journal_pb_autofold`；已经存过折叠状态的不动`renderModal` 换一笔交易时清空 `pbFormNotes`。表单里「新建错题 / 新建待验证」是马上建页面（空模板），勾选照样等保存。每条刚勾上的笔记底下各有一个输入框（`pbFormNotes.texts[笔记id]`），保存时各自写成那条笔记里「- [[trade:id]] 那句话」；本来就关联着的不出输入框，去笔记页改
  - **标签（kind = 'tag'）**：已经确认过的条件 / 变体（例：Mech 模型「有 SMT」），用户不想为它单开策略、也不是待验证，只想看有它和没它差多少。**跟笔记不同，归属存在交易身上**（`__pb_tags`，跟 `__pb` 一个套路），所以表单里点标签就是改 `formDraft`、跟交易一起存，不用等保存后再写别处。三类判定：`pbIsPage()`（系统 / 策略，能归交易）、`pbIsNote()`（错题 / 待验证，正文里列交易）、`pbIsChild()`（笔记 + 标签，挂在页面下面、删页面时往上挪）。对比口径在 `pbTagCompare()`：「有」= 所有打了这个标签的交易（归到别处的也算），「没有」= 标签所在那一页（系统含衍生策略）里没打的；通用标签跟全部交易比。还做成了多选虚拟字段 `VF_PB_TAGS`（选项是「Mech · 有 SMT」这种带归属的写法，防同名），筛选、拆解、组合都能用。删标签时内存里的交易摘掉它，另一个模式的交易读的时候按不存在忽略（`pbTradeTagIds()`）
  - **待验证（kind = 'verify'）**跟错题一样是「笔记」（`pbIsNote()`）：归属、候选、涉及的交易、胶囊进出全部共用 `pbNote*` 那一组函数（`pbMistake*` 留着当错题版的简写）。比错题多两样：便利贴和属性行上直接显示关联交易的成绩（`pbStats(pbNoteTrades())`）；有状态（三选一，按状态筛，已否定的不再出现在表单 / 归类的候选里，除非这笔本来就在里面）。状态是「验证可做」时属性行上有「升级成衍生策略」（`pbPromoteVerify()`）：**原地改 kind**（id 不变，别处的 `[[page:id]]` 照样有效），挂到归属所在的系统下，正文里关联的交易一起归过去（策略页看的是交易身上的 `__pb`，不看正文）；只能在实盘模式下升级。归类模式里按 V
  - **虚拟字段 `VF_PLAYBOOK`**（「模型库归属」，select，选项是当前页面名字）：筛选、组合、字段拆解、卡片/看图额外字段、表格、CSV 导出全都能按策略来。`computeBreakdowns()` 因此改成走 `tradeFieldValue()`。改了页面名字，存着旧名字的条件会照常被标红（跟删掉一个选项一样）
  - 回测模式下页签照常在（看系统说明），只是交易不参与归类，页面上有一行说明
- **导出中心**（`src/13b-export.js`）：顶栏「导出」打开的一整页（自己的根节点 `#exportRoot`，z-index 95：盖住复盘编辑器、低于弹窗），取代了以前那个下拉菜单。选模式（实盘/回测）+ 格式，打成一个 zip；只勾一种且只出一个文件时直接下那个文件
  - 五种格式：**Excel 工作簿**（交易 / 模型库页面 / 笔记 / 笔记里的交易 / 标签对比 / 复盘 / 说明 七张表；日期时间存成真正的 Excel 日期，表头加粗冻结、带筛选）、**Markdown**（模型库按 系统 → 策略 分文件夹 + 一份合并的；复盘按 模式 → 分组 + 一份合并的，给 AI 一个文件就够）、**网页报告**（单个 .html，无脚本，带目录，截图用 `<img>` 外链直接显示，能打印）、**完整备份 JSON**（原始数据：两种模式的交易和复盘、模型库、字段和各种设置，`format: "full-backup"`，以后做导入恢复就靠它；不受范围选项影响）、**交易 CSV**（以前那个，当前模式 + 可选列）
  - **zip 和 xlsx 都是自己写的**：不压缩的 zip（文件名 UTF-8 + 0x0800 标记，中文文件名解压不乱码）+ 最小的 SpreadsheetML。没引第三方库——一个 xlsx 就是几份 XML 打成 zip。生成的 xlsx 用 SheetJS 读回来验证过（七张表、日期、筛选都对）。`TextEncoder` 用的时候才建：测试的 vm 沙箱里没有它，模块加载时碰它会让整个测试加载失败
  - **给人看 / 给 AI 看的格式里不留任何 id**：`exResolveMd()` 把 `[[trade:…]]` 换成「日期 · 模型 · 结果 · R」带截图链接，`[[page:…]]` 换成页面名字，上色变加粗；交易的模型库归属、标签、所在笔记都换成名字。只有完整备份保留原样
  - **另一种模式的数据导出时现拉**（`exFetchMode()`）：内存里只有当前模式那批。模型库的成绩永远按实盘算，所以导模型库时实盘那批一定会拉
  - 模型库那些函数读的是全局 `trades` / `reviews`，导出时用 `exWithData()` 临时换成要导出的那批、同步跑完再换回来（中间没有 await）
  - 报告里的 HTML 全部出自 `renderMarkdown()` 和 `esc()`，跟页面上同一道防线；只是把 `data-action` / `onerror` 这些交互属性摘掉（报告里没有脚本）。Markdown 表格格子里用户写的 `< >` 会转义，不然 Markdown 查看器会把它当成 HTML
  - 截图只放链接不打包：图在 TradingView / FX Replay 上，跨域下载大多会被拦
  - 「当前筛选」只对当前模式的交易生效。`exportHasActiveFilters()` 改成按 `filterNodeIsEffective` 判断——记录页默认摆着两行没选值的筛选，以前按「有字段」算，导出会默认成「筛选结果」（其实就是全部）
- **更新日志页**：全局共享，仅 admin 能发布/删除
- **交易预览里 ←/→ 翻笔**（`openTradePreview()` / `stepTradePreview()` / `closeTradePreview()`，在 14 文件里）：范围是「打开它的那个列表」——模型库页面里的某一栏、复盘正文、或者整个 #app——按 DOM 顺序收那里面的交易胶囊 / 交易行 id（去重）。顶上有「3 / 8」和上一笔 / 下一笔。关掉时背后页面滚到最后看的那一笔并挂 `.isPicked`（交易行标整行）。root 存「选择器 + 第几个」不存节点：预览开着时背后那一栏可能被 refreshPbPanels 重画过。键盘走捕获阶段（跟灯箱一样）：从复盘正文里点开时焦点还在编辑器里，不先拦方向键会去挪编辑器光标；灯箱盖在上面时让给灯箱
- **从交易预览里点开大图，←/→ 换的是上一笔 / 下一笔交易的截图**（`lightboxTradeNav()`，灯箱 nav 的 scope 为 `"trade"`，多存一份 `ids`）：范围跟预览的 ←/→ 一样，没截图的那几笔跳过；每翻一笔把 `tradePreviewId` / `tradePreviewNav.index` 一起挪过去，所以 Esc 关掉大图回到的是最后看的那笔的预览，再关预览照常 `.isPicked` 标出来。底部说明条显示那笔的「日期 模型 结果 R」
- **截图链接 → 图片**：所有把截图显示成 `<img>` 的地方（卡片、看图、表格的放大按钮、当日明细、交易预览、交易选择器、录入弹窗的预览、复盘正文里的图片）都经过 `imgSrc()`。它把 TradingView 的快照页面链接（`tradingview.com/x/{id}/`）换成图片直链 `s3.tradingview.com/snapshots/{id 首字符小写}/{id}.png`（2026-09 实测过，就是那个页面 og:image 的地址），其余原样放行（FX Replay 的 `fxr-snapshots-….s3.amazonaws.com/…png` 本来就是直链）。**库里存的仍然是用户粘的原链接**，只在显示时换。以后新加显示截图的地方记得也套一层 `imgSrc()`，`data-fallback-url` 也要用换过的地址——重试加载时用的就是它
- **看大图（灯箱）能 ←/→ 翻图**（`openLightbox()` / `stepLightbox()` / `closeLightbox()`）：打开时把「同一处」的图收成列表——记录页当前这一页、复盘这篇正文、或者当前弹窗（当日明细等）——到头就停不循环。每翻一张就把背后页面滚到那张图（看图模式对齐到行首，并用 `setFocusCursor()` 把 J/K 的当前行一起挪过去），所以关掉时页面停在最后看的那一张上
  - **⚠️ 打开/关闭灯箱只画 `#secondaryModalRoot`，不要改回 `render()`**：render() 会重建 `#app`，看图模式的 `<img>` 全部重建、高度塌掉，刚对齐好的滚动位置就没了
  - 列表里存 URL 不存 DOM 节点：灯箱和弹窗共用 `#secondaryModalRoot`，从弹窗打开时弹窗那层会被灯箱换掉；对齐时按位置重新找节点，弹窗里的图要等灯箱关掉、弹窗画回来之后才对齐
  - **「选中」状态也要跟着翻**（`markLightboxSource()`，已经踩过一次）：复盘编辑器里是 ProseMirror 的节点选区（金色描边，`selectReviewImage()`）；其它地方是键盘焦点——点开大图的放大按钮一直留着焦点，按过方向键/Esc 后浏览器会给它画焦点框，只挪滚动位置的话，关掉灯箱时看着像回到了最开始那张。能拿焦点的挪过去，拿不了的把旧焦点放掉
  - 方向键用**捕获阶段**的 keydown 拦：复盘编辑器里双击图片打开灯箱时焦点还在编辑器里，不先拦下来方向键会去挪编辑器的光标
- **深色/浅色主题**、图片懒加载

## 六、部署流程

- Vercel 免费版，**已经接上 Git 自动部署**：`git push origin master` 之后 Vercel 自己会拉最新代码构建
- 不需要去 Vercel 后台点任何东西，也不要用 "Redeploy"（那个只重跑旧 commit）
- 构建时 `build.js` 会读环境变量 `SUPABASE_URL` / `SUPABASE_ANON_KEY` 生成 `config.js`（这个文件不进 git）

## 七、备份与防暂停

- Supabase 免费版：**7 天无数据库活动会自动暂停**（暂停不丢数据，但连续暂停 90 天会释放项目基础设施，需要靠备份手动重建）；免费版本身**不提供任何自动备份**
- 解决方案：**独立的私有 GitHub 仓库**，`.github/workflows/daily-backup.yml` 每天自动跑 `pg_dump`，覆盖式存成 `latest-backup.sql`，靠 Git 的 commit 历史保留每天的快照。这个任务本身也顺带解决了"防暂停"的问题（不需要再单独跑 keepalive 任务）
- 连接 Supabase 用 **Session pooler** 格式的连接串（不是 Direct connection），因为多数网络是 IPv4，Direct connection 默认走 IPv6 容易连不上

## 八、安全模型

- 网页里硬编码的 Supabase URL + anon/publishable key **本来就设计成可以公开**，任何人查看网页源代码都能看到，这不是漏洞
- **真正的安全防线是每张表的 RLS 规则**，不是"藏 key"。新增表/新功能时，RLS 有没有配对才是要仔细检查的地方
- **绝对不能**把 `service_role`/secret key 放进任何前端代码——那个 key 能绕过所有 RLS，等于数据库最高权限
- 如果这份代码要开源：`index.html` 顶部的真实 key 要换回占位符（`PASTE_YOUR_SUPABASE_URL_HERE` 这种），让每个部署者填自己的凭证，避免大家共用同一个数据库

## 八·五、数据加载的约定（别再退回去）

- **拿全表一律走 `fetchAllRows(makeQuery)`**（`src/07-data-layer.js`）。PostgREST 一次最多回 1000 行，多的**静默截断、没有报错**；回测很容易过千笔，胜率 / PF / 回撤 / 显著性会悄悄基于残缺数据算。makeQuery 每页要返回**新的**、带好 `order` 的查询，order 里必须有 `id` 兜底；总数靠第一页 `count: "exact"`，不能靠「这页不满就停」（服务端 Max rows 被调小时会误停）
- **保存 / 删除只改本地数组，不 `loadAll()`**（`persistTrade` / `removeTrade` / 更新日志）。保存用 `upsert(...).select().single()` 拿回服务端的 created_at / updated_at；保存途中用户切了回测/实盘，这笔不能混进另一批。切模式只走 `reloadModeData()`（交易 + 复盘），不重拉字段配置和更新日志
- **`render()` 分区重绘**（`patchAppShell`）：顶栏 / 只读横幅 / 页签 / 错误提示 / 页签内容五块，每块只在自己的 HTML 跟上次不同才动。所以：**别绕过 render() 直接改这五块里的 innerHTML**（缓存会跟 DOM 对不上）；另外只要这一块里有表单控件被用户改过而 HTML 没记录，仍会整块重写——跟以前行为一致，不是 bug
- 管理后台数笔数优先走 RPC `admin_trade_counts()`，函数没建就退回分页数全表

## 九、还没做 / 已知风险点

- **拖拽排序功能（筛选卡片、字段选项池、组合卡片、拆解字段列表）从没在真实浏览器里跑过完整测试**，只做过静态代码检查 + node 里的逻辑测试，可能有边界情况没覆盖到。**组合的「列表视图」尤其没试过拖**——属性和类名都对得上（拖拽处理器只认 `.comboCard[draggable="true"]` 和 `data-combo-id`），但 HTML5 拖放没法脚本模拟，值得手动验一次
- **README.md / README.zh-CN.md 有约 8 处过时**：还在写「统计口径两个开关」「R 捕获率」「口径和模型筛选是本设备的本地设置」。功能已经换成「分析范围」筛选面板 + 最大回撤，文档还没跟上
- **管理员"只读查看他人数据"退出后状态还原**的完整链路也没有真机测试过
- 源码已经按章节拆进 `src/*.js`（拼接式，同一个全局作用域，不是 ES module）。**137 个顶层 `let` 全局状态还在**——真要模块化，得先把状态收进一个对象，那是单独一轮任务，别和别的混在一起。目前只有纯函数有测试，DOM / 事件层没有
- **复盘功能没有在真实数据库上跑过**：`supabase/migrations/20260901000000_journal_features.sql` 还没在 Supabase 上执行过，所以「建表 → 写入 → 读回 → RLS 拦不拦得住别人」这条完整链路是未验证的。前端逻辑（编辑器、markdown 渲染、插入菜单、交易选择器、只读态、ESC 分层、后台 render 不冲掉正文）已经在浏览器里逐条验过，用的是内存假数据
- **复盘的 markdown 渲染器是自己写的子集**，支持标题/粗斜体/删除线/行内码/代码块/列表/待办/引用/分割线/链接/图片/表格/反斜杠转义。刻意没引 marked + DOMPurify（编辑器用的 Tiptap 在 vendor/ 里，但渲染和存储格式仍然是这份自己写的 markdown）。**代价是它只认这些语法**，写别的（脚注、嵌套引用、HTML 标签）会原样显示。安全性上按"先转义再排版"设计并过了一轮攻击串测试，但它终究是自己写的，以后加语法时要重新审一遍
- `max_rr` 这个角色还留在角色下拉里，但**已经没有任何功能挂在它上面**了（它原来只驱动"R捕获率"，那项统计已经被"最大回撤"取代）。保留是为了不让老数据里 `role: "max_rr"` 的字段变成下拉框里认不出的空值

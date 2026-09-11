# IFVG Trade Journal — 项目交接文档

给新开的对话/Claude Code 用的完整背景。这份文档取代之前的 DATABASE.md 和 CODE_CONVENTIONS.md（内容更全、更新），先读这一份。

---

## 一、项目是什么

多用户交易日记网页应用。每个用户可以自定义记录字段、区分回测/实盘、查看统计分析、按月历查看交易分布。管理员有独立后台，能管理用户、只读查看任意用户的数据。

## 二、技术栈

- **前端**：`index.html` 只是外壳，实际代码拆成 `app.js`（全部逻辑）/ `style.css` / `i18n.js`（中英词典），没有框架，没有打包步骤
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
- `focus_fields` 这一列也要手动加：`alter table journal_schema add column if not exists focus_fields jsonb;`（已经包含在 `docs/focus-mode-migration.sql` 里）。**不跑也不会坏**：看图模式照常能用，只是字段选择存不进去、不跨设备、刷新回默认
- **为什么不跟 `card_fields` 共用一份**：卡片是缩略图墙、一屏几十张，字段多了就糊；看图模式一屏一笔、右边有整栏空间，正好把长文本挂上去。共用一份的话改一边另一边就被连累
`review_prefs` 结构（复盘分组，缺项由 `normalizeReviewPrefs()` 补默认值）：
```json
{ "groups": [ { "id": "rg_xxx", "name": "常见错误", "mode": "live" } ] }
```
- 数组顺序就是分组的显示顺序；`mode` 决定这个分组属于回测还是实盘
- **只有一级分组**，刻意不做二级：复盘是长文，两级会让「这篇到底在哪」变难找（组合那边是两级，别照抄过来）
- 这一列也要手动加：`alter table journal_schema add column if not exists review_prefs jsonb default '{}'::jsonb;`（已经包含在 `docs/reviews-groups-migration.sql` 里）

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
created_at        timestamptz
updated_at        timestamptz
```
- **回测和实盘各一套**（`mode` 列），跟 trades 一样。页签两边都显示，切模式时列表和分组一起换
- 缺列时的自愈走 `upsertReviewRowsHealing()`：**从报错里抠出是哪一列没有，摘掉那一列重存，最多五轮**。这样只缺 day_date 时不会连分组信息一起丢掉。迁移 SQL 可以晚点补，写过的正文不能丢
- **⚠️⚠️ `isMissingTableError()` 必须先把「缺列」摘出去再判「缺表」**（已经踩过一次）。PostgREST 缺列时说的是 `Could not find the 'day_date' column of 'journal_reviews' in the schema cache`——里面同时有表名和 schema cache，只按那两个关键词匹配会把缺列误判成缺表，于是自愈整个被跳过、正文直接存不下来
- **分组归属放在行上（`group_id`），分组定义放在配置里（`journal_schema.review_prefs`）**。归属是数据，定义是个人配置；这么分之后不会出现「配置里记着某篇在 A 组、那行却已经被删了」这种对不上的情况。`reviewEffectiveGroupId()` 在归属的分组已经不存在时一律退回未分组，卡片不会凭空消失
- `linked_trade_ids` 只是索引，**正文才是唯一真相**。改正文一定要重新抽一遍（`extractTradeRefs()`），别让两边对不上
- RLS：跟 trades 一样，自己读写自己的 + 一条 admin 只读（`select using (is_admin())`）
- **关联到哪一天/哪一周由 `reviewPeriodKind()` 唯一判定**：`day_date` 有值就是日复盘，否则看 `week_start`，都没有就是自由帖。**day_date 优先**——万一两列都有值（正常切换会清另一个，但脏数据难说）也有个确定的落点，不会两处显示不一致
- 这张表要手动建，整段 SQL 在 `docs/reviews-migration.sql`，之后再跑 `docs/reviews-groups-migration.sql`（补 mode/group_id/sort_order 三列和 review_prefs）和 `docs/reviews-day-migration.sql`（补 day_date）。没跑也不影响其他功能：前端捕获 42P01/PGRST205 后置 `reviewsTableMissing`，只在复盘页显示一条提示

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
- **复盘页（仅实盘模式）**：用户自己发帖，markdown 正文，可以把帖子关联到某一周，也可以在正文里关联到具体某笔交易。下面几条是这块最容易改坏的地方：
  - **⚠️ 编辑器有自己的根节点 `#reviewEditorRoot`（index.html 里第 4 个根），不在 `#app` 里面**。因为 `render()` 每次都整体重建 `#app` 的 innerHTML，而复盘是一篇能写二十分钟的长文——放进 `#app` 的话，任何后台异步操作触发的 `render()` 都会清空 textarea、丢光标、丢撤销栈。`renderReviewEditor(force)` 里用 `reviewEditorRenderedFor` 做守卫，跟 `renderModal` 的 `modalRenderedForId` 完全同一个套路
  - 由此派生的规矩：**编辑器打开期间，任何状态变化都不许走 `render()`**，只能定点更新某个节点。已经这么做的有：预览区（`updateReviewPreview()`）、保存状态（`updateReviewSaveBadge()`）、关联周那一行（`refreshReviewWeekRow()`）、插入菜单（`renderSlashMenu()`）、交易选择器的结果区（`window.__tradePickerInput`，只换结果不换搜索框，否则输入框自己会被重建、光标丢失）。新加编辑器里的交互要照这个来
  - **编辑区和预览区滚动联动**：`renderMarkdown` 给每个块打了 `data-md-line`（它在源码里的起始行号），联动就是把编辑区里这些行的 y 坐标量出来（隐藏 div 镜像，按「正文 + 宽度」缓存），和预览里对应块的位置一一对上，中间线性插值。**不要退化成按比例硬滚**——正文里有图片或表格时两边高度能差几百像素，按比例对不上任何东西
  - 联动是**单向的**（编辑区带动预览区）。反向联动要处理两边互相触发的死循环，收益不值那个复杂度
  - **⚠️ scroll 事件的 `isTrusted` 永远是 true**，区分不了「用户滚的」和「我自己设的 scrollTop」。所以对预览滚动位置的程序性修改一律走 `setPreviewScrollTop()`，它会打一个时间戳，`__reviewPreviewScroll` 靠 150ms 窗口把自己引发的那次滤掉。用户真的手动滚了预览就抑制联动 1.2 秒，别跟他抢
  - **⚠️⚠️ textarea 的 `onkeyup` 绝对不能关插入菜单**（已经踩过一次）。按键顺序是 keydown → input → keyup，打 `/` 时 input 刚把菜单弹出来，紧接着的 keyup 会立刻关掉它，表现是「斜杠菜单一闪就没」。所以拆成两个：`__reviewCaretMoved`（点击用，关菜单 + 更新高亮）和 `__reviewCaretKey`（keyup 用，只更新高亮）
  - 高亮当前块用的是两层 `box-shadow` 叠出来的竖条，**不要改成 border/padding**：那会改变块的尺寸，联动量出来的位置就跟着跳了
  - **⚠️ 预览区不能用 `box.innerHTML = ...` 整块换掉**（已经踩过一次）。整块替换会把里面的 `<img>` 全换成新元素，而新建的 `<img>` 在图片解码完成前高度是 0，浏览器恰好在这一刻做布局，`scrollHeight` 骤降、`scrollTop` 跟着被夹小；等图片异步恢复高度时滚动位置已经丢了。表现是「长文里一打字预览区就自己往上滚」，实测每次按键掉约 30px。`updateReviewPreview()` 现在的做法是：渲染结果和上次一样就直接 return（`lastPreviewHtml`）；要换就先建离屏树，把旧树里**已经加载完的** `<img>` 按 src 原样搬过去（移动 DOM 节点不会触发重新加载），再 `replaceChildren`，最后把 `scrollTop` 放回去。以后往预览区加任何异步撑高度的东西（视频、iframe、字体导致的回流）都要想到这条
  - **⚠️⚠️ markdown 渲染器是整个项目唯一一处把用户输入变成 HTML 的地方**，别处全部走 `esc()`。而管理员能只读查看任意用户的数据，所以一段带 `<img onerror>` 的复盘正文会在**管理员的会话**里执行。`renderMarkdown()` 的铁律是**先 `esc()` 整段、再在已转义的文本上加白名单标签**，链接/图片的 URL 只放行 `^https?://`（挡 `javascript:` 和 `data:`）。任何时候都不要为了支持某个语法把原始 HTML 放回去
  - 交易引用**不需要带 mode**：复盘按模式分开了，回测复盘里引用的必然是回测交易，而 `trades` 本来就只装当前模式那批，所以永远能对上。别因为「跨模式查不到」这个担心去给引用加 mode
  - **点交易胶囊弹的是只读预览（`tradePreviewHtml`），不是编辑弹窗**。跟 focus 视图那条规矩一致：读的时候不该一点就出来一堆输入框。预览挂在 `#secondaryModalRoot`，在 `want` 链里排在 lightbox 后面——这样在预览里点图看原图、关掉原图还能退回预览。要改走底部明确的「编辑这笔交易」
  - **⚠️ 预览里渲染 url 类型字段时必须 `esc(mdSafeUrl(...))`**（已经踩过一次）。`mdSafeUrl()` 只判协议、**不转义**；它在 markdown 渲染器里够用是因为那边整段开头就 esc() 过了，而这里拿的是原始字段值，少一次 esc 就能让 `https://x.com/a" onmouseover="alert(1)` 从 href 里逃出去挂上事件处理器
  - **正文上色**语法是 `{red|文字}`，颜色名走 `MD_COLORS` 白名单，渲染出去的只有我们自己的类名（`mdC-red` 这种），具体色值在 style.css 里按主题定义。**绝不能把用户写的东西当成 CSS 塞进 style**——那等于把「先转义再排版」那条防线拆了
  - 上色规则放在加粗/斜体**之前**，这样 `{red|**粗红字**}` 里面还能继续排版；内容不允许跨行（`[^}\n]+`），免得一个没闭合的 `{` 把整篇吞掉
  - 换色/清除走 `applyReviewColor()`，它会把已有的那层 `{c|...}` 先吃掉再包新的——不然连点两次颜色就会套出 `{green|{red|x}}`。选中内层文字和选中整段两种情况都要认
  - **⚠️ 颜色浮层只能画进工具栏里的 `#reviewColorRoot`**，不能走 `renderReviewEditor()`：那会把整个编辑器重建一遍，正在写的正文和光标全没了。跟插入菜单是同一条规矩
  - 点工具栏按钮时 textarea 已经失焦，但 `selectionStart/End` 还留着；即便如此，打开浮层那一刻还是把选区抓进 `reviewColorSel` 存着，因为选颜色是**两次点击**，中间隔着一次浮层渲染
  - **交易引用**语法是 `[[trade:t_xxx]]`，`tradeRefHtml()` 渲染成可点的胶囊（日期 · 模型 · 结果 · R），点击打开该笔交易的弹窗。**找不到那笔交易时显式标红「已删除的交易」，不静默消失**——组合引用失效字段那个老坑的同款处理
  - **只读 / 编辑两种模式**，由 `reviewEditMode` 控制，打开已有帖子默认只读（`openReviewEditor` 里置 false，新建的 `openNewReview` 置 true）。注意区分两个判定：`reviewCanEdit()` 是「有没有编辑权」（管理员看别人的数据时为 false，连编辑按钮都不出现），`reviewIsReadOnly()` 是「此刻是不是只读」。**编辑器里所有会改内容的入口都必须守 `reviewIsReadOnly()` 而不是 `viewingUserId`**，否则只读模式下工具栏快捷键还能改到正文。切换模式要 `renderReviewEditor(true)` 强制重建（两种模式骨架不一样），退出编辑前先 `await flushReviewSave()` 立刻落盘
  - **分组的拖拽跟组合分组是同一套路子**：拖卡片落到另一张卡片上 = 插到它前面（同组内重排，跨组就是连搬带插）；落到分组区块的空白处 = 只改归属、排到该组末尾；拖分组标题落到另一个标题上 = 分组换位置。投放区靠 `[data-group-drop]`，白名单在 `DRAGGABLES` 里。「未分组」那个桶复用同一套外壳，但**标题不可拖**（它不是真分组），只能作为投放目标
  - **⚠️ 挪进某个分组时要把目标桶整批重编号**，不能只给挪进来的那几条编号：桶里原有的可能 `sort_order` 还是 null，而 null 在显示顺序里排最后，只编号新来的会让「挪到末尾」反而显示在最前面
  - **⚠️ 删分组不删里面的复盘**，退回未分组。组合那边是级联删的，别照抄——复盘是长文，顺手删掉一整组等于毁掉几个小时的记录
  - 分组标题上的「在这里新建」建出来的帖子**默认不关联周**（分组基本是给「常见错误 / 猜想」这类跟某一周无关的条目用的），顶部那个「写复盘」仍然默认本周
  - 搜索时**把结果拍平成一个列表、不按分组显示**，每条标出所属分组。否则搜到的东西可能藏在折叠着的分组里，用户会以为没搜到
  - 编辑器是 **textarea + 增强输入**，不是 contenteditable 块编辑器。这是刻意的：contenteditable 要自己处理选区和中文输入法组字，本项目是中文用户为主，风险不成比例。**所有 keydown 分支都必须先看 `e.isComposing`**，否则输入法选词时的回车会把没上屏的拼音切碎
  - 编辑器里的输入全走内联 `on*` 属性交给 `window.__reviewBodyInput` / `__reviewKeydown` / `__reviewPaste` / `__reviewTitleInput`，跟项目里 `window.__updateUrlPreview` / `__imgFallback` 一个路子
  - **⚠️⚠️ 改 textarea 内容必须走 `replaceRange()` 里的 `execCommand`，绝对不能写 `ta.value = ...`**（已经踩过一次）。给 value 直接赋值会把浏览器的**原生撤销栈整个清空**，而回车续列表、Tab、工具栏、插入菜单、粘贴全都经过这个函数，结果是编辑器里 Ctrl+Z 完全失效。`execCommand("insertText")` 会被当成一次真实编辑记进撤销栈，撤销/重做于是全是原生行为，一行都不用自己实现。空串 + 有选区要用 `execCommand("delete")`，insertText 传空串各家表现不一致。execCommand 标准上标了 deprecated，但这是目前唯一能保住 textarea 撤销栈的办法，代码里留了直接赋值的兜底
  - 由此派生：`__reviewKeydown` 里 **`Ctrl+Z` / `Ctrl+Y` 一律 return 放行**，我们不维护自己的撤销栈，拦下来只会把原生的弄坏
  - 还有一条：execCommand 会顺带派发一次 `input`，所以 `replaceRange` 期间置 `programmaticEdit`，让 `__reviewBodyInput` 直接返回。**关键是不能在那一路跑 `syncSlashMenu`**——程序性插入之后光标前面可能正好是个 `/`，会莫名其妙把插入菜单又弹出来
  - 改 textarea 内容统一走 `replaceRange()`；**整行整行地改**（缩进、列表、标题）走 `applyLineEdit()`——它会在原本有选区时把改完的几行继续选着，否则 Tab 之后选区一塌，紧接着的 Shift+Tab 只能退最后一行
  - 交易选择器的搜索**没有复用记录页的 `tradeMatchesSearch()`**，另写了 `tradePickerMatches()`。前者只搜 text/textarea/url，而这里最常搜的恰恰是日期和模型（select 类型）
  - **⚠️ 插入菜单、交易选择器这些浮层里全是按钮，不要用 `stopPropagation` 包容器**（见第四节那条踩过两次的坑）。「点背景关闭、点内容不关闭」用 `e.target === el` 判断，`close-trade-picker` 就是这么写的
  - 层级：`.reviewEditorOverlay` 是 `z-index:90`，**故意低于 `.overlay` 的 100**——从复盘里点开一笔交易时，交易弹窗要盖在编辑器上面。ESC 的处理顺序是 灯箱 → 插入菜单 → 交易选择器 → 交易弹窗 → 复盘编辑器
  - 自动保存：停手 1.2 秒写库（`scheduleReviewSave` / `flushReviewSave`），同时每次输入镜像一份到 localStorage（`journal_review_draft`，跟交易草稿各存各的），另有 `beforeunload` 兜底。**新建的空白帖子直接关掉不会落库**，免得攒一堆空行

- **更新日志页**：全局共享，仅 admin 能发布/删除
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

## 九、还没做 / 已知风险点

- **拖拽排序功能（筛选卡片、字段选项池、组合卡片、拆解字段列表）从没在真实浏览器里跑过完整测试**，只做过静态代码检查 + node 里的逻辑测试，可能有边界情况没覆盖到。**组合的「列表视图」尤其没试过拖**——属性和类名都对得上（拖拽处理器只认 `.comboCard[draggable="true"]` 和 `data-combo-id`），但 HTML5 拖放没法脚本模拟，值得手动验一次
- **README.md / README.zh-CN.md 有约 8 处过时**：还在写「统计口径两个开关」「R 捕获率」「口径和模型筛选是本设备的本地设置」。功能已经换成「分析范围」筛选面板 + 最大回撤，文档还没跟上
- **管理员"只读查看他人数据"退出后状态还原**的完整链路也没有真机测试过
- 代码已经拆成 `app.js` / `style.css` / `i18n.js`，但 `app.js` 仍然是一个四千多行的大文件，多人协作会有合并冲突。要不要再往下拆成模块是个待定项，建议单独作为一轮任务处理，不要和其他任务混在一起做
- **复盘功能没有在真实数据库上跑过**：`docs/reviews-migration.sql` 还没在 Supabase 上执行过，所以「建表 → 写入 → 读回 → RLS 拦不拦得住别人」这条完整链路是未验证的。前端逻辑（编辑器、markdown 渲染、插入菜单、交易选择器、只读态、ESC 分层、后台 render 不冲掉正文）已经在浏览器里逐条验过，用的是内存假数据
- **复盘的 markdown 渲染器是自己写的子集**，支持标题/粗斜体/删除线/行内码/代码块/列表/待办/引用/分割线/链接/图片/表格。刻意没引 marked + DOMPurify（项目除 supabase-js 外零依赖）。**代价是它只认这些语法**，写别的（脚注、嵌套引用、HTML 标签）会原样显示。安全性上按"先转义再排版"设计并过了一轮攻击串测试，但它终究是自己写的，以后加语法时要重新审一遍
- `max_rr` 这个角色还留在角色下拉里，但**已经没有任何功能挂在它上面**了（它原来只驱动"R捕获率"，那项统计已经被"最大回撤"取代）。保留是为了不让老数据里 `role: "max_rr"` 的字段变成下拉框里认不出的空值

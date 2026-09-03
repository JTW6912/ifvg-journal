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
fields          jsonb —— 数组，每个元素一个字段定义
card_fields     jsonb —— 数组，卡片视图上额外显示哪些字段（空数组=用内置默认）
analysis_prefs  jsonb —— 分析页的所有个人配置，默认 '{}'
```
`analysis_prefs` 结构（缺任何一项都会在前端 `normalizeAnalysisPrefs()` 里补默认值，所以老数据/空列都能正常跑）：
```json
{
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

### journal_reviews（复盘帖子）
```
id                text, 主键
user_id           uuid, 引用 auth.users(id)
title             text
body              text —— markdown 原文（不是 HTML，渲染在前端做）
week_start        date, 可空 —— 关联到哪一周（周一那天）；null = 自由帖
linked_trade_ids  text[] —— 保存时从正文 [[trade:xxx]] 抽出来的冗余索引
created_at        timestamptz
updated_at        timestamptz
```
- **这张表没有 mode 列**：复盘只在实盘模式下使用（`TABS` 里按 `recordMode === "live"` 决定页签出不出现），所以不存在回测那一份
- `linked_trade_ids` 只是索引，**正文才是唯一真相**。改正文一定要重新抽一遍（`extractTradeRefs()`），别让两边对不上
- RLS：跟 trades 一样，自己读写自己的 + 一条 admin 只读（`select using (is_admin())`）
- 这张表要手动建，整段 SQL 在 `docs/reviews-migration.sql`。没跑也不影响其他功能：前端捕获 42P01/PGRST205 后置 `reviewsTableMissing`，只在复盘页显示一条提示

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
- **记录页**：卡片视图（4档图片大小 + 可自定义额外显示字段）/ 表格视图切换，都支持分页
- **筛选**：多字段 AND，同字段内多选 OR（多选类型可切换成 AND）、反选、日期/时间区间、文字包含；拖拽调整筛选卡片顺序；结果实时显示胜率/W/L/BE/总R/EV；本地持久化，记录页和月度页共用同一套筛选状态
- **草稿保护**：新建交易（不含编辑已有交易）自动存草稿到本地，意外关闭能恢复
- **ESC 键**：关闭当前最上层的弹窗/灯箱
- **月度页**：月度概览条（R值上色）+ 每日明细热力图（点击查看/新建/删除当天交易，含照片预览）+ 历史回测覆盖总览（仅回测模式，2020至今）
- **分析页**：
  - **「分析范围」面板（`analysisFilters`）**：分析页顶部的筛选器，取代了旧的「统计口径开关 + 模型筛选」。**和记录页 `activeFilters`、月度页完全独立**——独立数组、独立 localStorage key（`journal_analysis_filters`）、独立事件上下文（`data-filter-ctx="analysis"`），两边互不影响。默认只有一条「已入场 = Taken」，所以用户不展开面板时看到的就是 Taken 的数据。面板头常驻一行「全部 412 → 47」的口径链条。里面的「只看 Taken / 排除人为错误」是**快捷按钮**，点一下往条件里加/删一条看得见的普通条件，不是隐藏开关
  - **⚠️ 这一页唯一的口径规则**：总览数字、Faded 那行、字段拆解，全部出自 `computeStats()` 返回的同一个 `list`。**不要再往任何一处加"从别处另算一批"的逻辑**——旧版口径开关就是因为藏在别处，用户老是觉得数字对不上
  - 总览：交易数 / 胜率 / Setup Quality / 总R / EV / **Profit Factor**（正R之和 ÷ |负R之和|，只统计真的填了 R 的交易，无亏损显示 ∞）/ **最大回撤**（`maxDrawdownR()`：按日期把 R 累成资金曲线取峰谷最大跌幅，单位 R，只算填了 R 的交易，没填日期的排最后）
  - 标题栏那行 `taken 30 · WR 51.9%` 走的是**独立的 `headerStats()`**，固定「只算 Taken」口径，故意不吃分析页筛选——它代表账号整体水平，不该被页内临时筛选带偏
  - **字段拆解**：所有 select/multiselect 字段（只排掉 `result` 角色，因为按结果拆是自我循环）。每行 `n` 是该值下的**全部**笔数（含 BE 系列），**胜率分母只算 W 和 L**，两者口径不同是有意的。每行右边标「相对当前这批整体胜率的差值」；`n < BREAKDOWN_MIN_SAMPLE`(5) 的行不画色条、不标差值、整行降透明度并挂「样本少」标签；多选字段卡片带「多选」标记（各行 n 之和 > 总笔数是预期行为）。可勾选隐藏、拖拽排序，配置存数据库，**全局唯一一份**（不按组合分开存——那样新加字段要去每个组合里勾一遍）
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
- **⚠️ 三套筛选共用同一套筛选行 DOM，靠元素属性区分改的是哪个数组**（`filterCtxOf()`）：`data-filter-ctx="analysis"` → 分析页 / `data-combo-id="c_xxx"` → 那个组合 / **两个都没有 → 记录页的 `activeFilters`**。新增筛选入口时忘了带自己的上下文属性，会默默把用户的记录页筛选改掉，而且不报错。筛选行的拖拽排序只有记录页那份有（drop 处理器直接绑死 `activeFilters`），另外两处条件之间是 AND、顺序不影响结果，就没做
- **⚠️ `tradeMatchesFilter()` 找不到字段时 `return true`**：意味着删掉字段后，引用它的组合会静默降级成「匹配全部交易」，数字突然变好看却没有任何提示。所以 `comboIssues()` 会在渲染前把失效字段/失效选项挑出来标红并禁掉统计。新增任何「保存下来的条件」类功能都要考虑这个陷阱
- **管理后台**（仅 admin 可见）：API 连接配置、用户管理（禁用/启用、设权限、查看上次在线时间+交易总数）、**只读查看任意用户的数据**（不影响自己的登录状态和本地设置，退出后自动恢复原状）
- **复盘页（仅实盘模式）**：用户自己发帖，markdown 正文，可以把帖子关联到某一周，也可以在正文里关联到具体某笔交易。下面几条是这块最容易改坏的地方：
  - **⚠️ 编辑器有自己的根节点 `#reviewEditorRoot`（index.html 里第 4 个根），不在 `#app` 里面**。因为 `render()` 每次都整体重建 `#app` 的 innerHTML，而复盘是一篇能写二十分钟的长文——放进 `#app` 的话，任何后台异步操作触发的 `render()` 都会清空 textarea、丢光标、丢撤销栈。`renderReviewEditor(force)` 里用 `reviewEditorRenderedFor` 做守卫，跟 `renderModal` 的 `modalRenderedForId` 完全同一个套路
  - 由此派生的规矩：**编辑器打开期间，任何状态变化都不许走 `render()`**，只能定点更新某个节点。已经这么做的有：预览区（`updateReviewPreview()`）、保存状态（`updateReviewSaveBadge()`）、关联周那一行（`refreshReviewWeekRow()`）、插入菜单（`renderSlashMenu()`）、交易选择器的结果区（`window.__tradePickerInput`，只换结果不换搜索框，否则输入框自己会被重建、光标丢失）。新加编辑器里的交互要照这个来
  - **⚠️⚠️ markdown 渲染器是整个项目唯一一处把用户输入变成 HTML 的地方**，别处全部走 `esc()`。而管理员能只读查看任意用户的数据，所以一段带 `<img onerror>` 的复盘正文会在**管理员的会话**里执行。`renderMarkdown()` 的铁律是**先 `esc()` 整段、再在已转义的文本上加白名单标签**，链接/图片的 URL 只放行 `^https?://`（挡 `javascript:` 和 `data:`）。任何时候都不要为了支持某个语法把原始 HTML 放回去
  - **交易引用**语法是 `[[trade:t_xxx]]`，`tradeRefHtml()` 渲染成可点的胶囊（日期 · 模型 · 结果 · R），点击打开该笔交易的弹窗。**找不到那笔交易时显式标红「已删除的交易」，不静默消失**——组合引用失效字段那个老坑的同款处理
  - **只读 / 编辑两种模式**，由 `reviewEditMode` 控制，打开已有帖子默认只读（`openReviewEditor` 里置 false，新建的 `openNewReview` 置 true）。注意区分两个判定：`reviewCanEdit()` 是「有没有编辑权」（管理员看别人的数据时为 false，连编辑按钮都不出现），`reviewIsReadOnly()` 是「此刻是不是只读」。**编辑器里所有会改内容的入口都必须守 `reviewIsReadOnly()` 而不是 `viewingUserId`**，否则只读模式下工具栏快捷键还能改到正文。切换模式要 `renderReviewEditor(true)` 强制重建（两种模式骨架不一样），退出编辑前先 `await flushReviewSave()` 立刻落盘
  - 编辑器是 **textarea + 增强输入**，不是 contenteditable 块编辑器。这是刻意的：contenteditable 要自己处理选区和中文输入法组字，本项目是中文用户为主，风险不成比例。**所有 keydown 分支都必须先看 `e.isComposing`**，否则输入法选词时的回车会把没上屏的拼音切碎
  - 编辑器里的输入全走内联 `on*` 属性交给 `window.__reviewBodyInput` / `__reviewKeydown` / `__reviewPaste` / `__reviewTitleInput`，跟项目里 `window.__updateUrlPreview` / `__imgFallback` 一个路子
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

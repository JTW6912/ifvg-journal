<h1 align="center">IFVG Trade Journal</h1>

<p align="center">
  一个自托管的多用户交易日记 —— 字段结构完全由你自己定义，
  而不是别人家 SaaS 替你决定该记什么。
</p>

<p align="center">
  <a href="README.md">English</a> · <b>简体中文</b>
</p>

<p align="center">
  <img alt="Vanilla JS" src="https://img.shields.io/badge/frontend-vanilla%20JS-f7df1e?logo=javascript&logoColor=black">
  <img alt="Supabase" src="https://img.shields.io/badge/backend-Supabase-3ecf8e?logo=supabase&logoColor=white">
  <img alt="No build step" src="https://img.shields.io/badge/build%20step-none-blue">
  <img alt="Deploy" src="https://img.shields.io/badge/deploy-Vercel-black?logo=vercel">
</p>

<!-- 截图 —— 首屏大图（记录页卡片视图）。把图片放到 docs/screenshots/hero.png，然后删掉下面这行外面的注释符号即可。
<p align="center"><img src="docs/screenshots/hero.png" alt="记录页" width="900"></p>
-->

---

## 这是什么

一个用来记交易、并且搞清楚自己哪些 setup 真的赚钱的网页应用。

每个用户都有自己独立的字段配置、交易数据和分析设置。整个应用没有把任何交易模型写死——
它最初是围绕 IFVG 模型做的，但所有字段、选项、名称都可以改，而统计引擎识别一个字段靠的是
你给它打的**角色标签**，不是字段叫什么名字。你把「RR」改成「R 倍数」再改成「收益率」，所有
统计照样正常运行。

每个账号有两套完全隔离的数据（**回测** 和 **实盘**），可以放心攒几百笔回测样本，不会污染
真实成绩。

**核心思路**

- **字段由你定义** —— 增删字段、调整顺序、改类型、改选项池。
- **角色优先于名字** —— 统计引擎找的是 `result`、`r_multiple`、`taken` 这些角色。
- **组合（saved combo）** —— 把一组筛选条件（「模型=IFVG **且** 目标类型含 BSL」）存下来命名，
  它的胜率 / EV / 盈亏比会实时显示，并和全局基准对比。
- **各处数字必然一致** —— 筛选栏、分析页、组合卡片走的是同一套计算路径，不会两边对不上。
- **不用自己写后端** —— 浏览器直连 Supabase，权限控制交给 Postgres 的行级安全策略（RLS）。

---

## 功能详解

### 记录页

<!-- 截图 —— 记录页表格视图 + 展开的筛选面板 → docs/screenshots/records.png
<p align="center"><img src="docs/screenshots/records.png" alt="记录页" width="900"></p>
-->

- **卡片视图**，4 档图片大小（紧凑 / 标准 / 大图 / 超大图），可自选卡片上额外显示哪些字段，
  日期、模型、R 值固定常显。
- **表格视图** —— 每个字段一列，每页 25 行。
- **全文搜索** —— 搜索所有文本 / 多行文本字段（笔记、复盘笔记等）。
- **筛选** —— 多字段之间 AND，同一字段内多个值之间 OR（多选字段可切成 AND）；条件可反选；
  支持日期、时间区间和文字包含。筛选卡片可拖拽排序，筛选状态本地持久化，记录页和月度页共用。
- **实时汇总** —— 当前结果集的胜率、W/L/BE、总 R、EV、盈亏比，并可一键「把当前筛选存为组合」。
- **排序** —— 按交易日期 / 创建时间 / 修改时间，升序或降序。
- **草稿保护** —— 新建交易填了一半会自动存到本地，误关页面还能恢复（编辑已有交易不存草稿，
  这是有意的）。
- 每笔交易可填截图链接，缩略图懒加载，点击放大成灯箱。

### 分析页

<!-- 截图 —— 分析页总览 + 字段拆解 → docs/screenshots/analytics.png
<p align="center"><img src="docs/screenshots/analytics.png" alt="分析页" width="900"></p>
-->

**总览指标**

| 指标 | 算法 | 说明 |
| --- | --- | --- |
| 交易数 | 当前口径下的笔数 | 开了「只算 Taken」时标题会变成「已入场」 |
| 胜率 | `W / (W + L)` | BE 系列**故意**不进分母 |
| 设置质量 | `(W + BE→W) / (W + L + BE→W + BE→L)` | 抛开管理方式，判断本身对不对 |
| 总 R | `Σ R` | |
| EV / 笔 | `Σ R / 笔数` | 分母是口径内的全部交易，包括 R 没填的 |
| 盈亏比 | `正R之和 / \|负R之和\|` | 只统计真的填了 R 的交易；没有亏损时显示 `∞` |
| R 捕获率 | `Σ R / Σ 最大RR` | 需要同时有 `r_multiple` 和 `max_rr` 两个角色 |

**统计口径** —— 两个独立开关：*只算已入场（Taken）的交易*、*排除标记为人为错误的交易*，
外加一个按模型的筛选。它们同时作用于总览和字段拆解，但**不影响组合**（组合有自己的条件）。
口径和模型筛选是本设备的本地设置；拆解显示配置和组合则存进数据库，跨设备同步。

**字段拆解** —— 所有单选 / 多选字段按取值拆开，显示每个取值下的胜率、样本量、W-L-BE、总 R
和 EV。`result` 角色的字段被排除（按结果拆结果是自我循环）。不关心的字段可以隐藏，剩下的可
拖拽排序；以后新加的字段会自动出现在最后，不会因为不在旧白名单里被吞掉。

**组合分析**

<!-- 截图 —— 分组里的组合卡片 → docs/screenshots/combos.png
<p align="center"><img src="docs/screenshots/combos.png" alt="组合分析" width="900"></p>
-->

组合就是一组存下来并命名的筛选条件，实时显示胜率、n、W-L-BE、总 R、EV、盈亏比，每一项都同时
显示**相对同口径全局值的差值**（`+9.2pp`）。样本太小会标注（`n < 10`）。

- 可以给组合打上 **「可以做」/「要避免」** 标记。
- 三个建法：分析页「新建组合」手搭；记录页调好筛选后「把当前筛选存为组合」；字段拆解每行右边的
  「+组合」。
- **分组 / 二级分组** —— 把组合整理成两级树（比如 `IFVG → 能做 / 不能做`），可折叠、可拖拽换组、
  可拖拽排序。不想分组就完全不用管，它就是个平铺列表。
- 点组合可直接跳到记录页，看它到底匹配了哪些交易。
- **失效引用保护** —— 如果组合引用的字段或选项后来被删了，卡片会标红并禁用统计，而不是悄悄
  降级成「匹配全部交易」、数字突然变好看却没人察觉。

### 月度页

<!-- 截图 —— 月度概览条 + 每日热力图 → docs/screenshots/calendar.png
<p align="center"><img src="docs/screenshots/calendar.png" alt="月度页" width="900"></p>
-->

- **年度概览条** —— 12 个月加一个 YTD 格子，按 R 值上色，点击跳转到该月。
- **每日明细热力图** —— 周一开头，每天显示笔数和 R 并按盈亏上色，右侧还有一列**本周合计**。
  点某天弹出当天的交易列表（缩略图、结果、R），可以从这里打开某笔交易、删除，或者新建一笔
  日期已经填好的交易。
- **历史回测覆盖**（仅回测模式）—— 2020 年至今逐月标注*已完成 / 部分 / 未开始*。规则是当月
  1–10 号和 20 号至月底各至少有一笔记录才算「已完成」，一眼就能看出回测样本哪里有洞。
- 记录页的筛选在这里同样生效。

### 设置页

管理字段结构：改名、改类型、编辑选项池（可拖拽排序）、打分析角色标签、删除字段，字段本身
也可以整条拖拽调整顺序。改动立刻同步到录入表单和所有统计。

**字段类型：** `单行文本` · `多行文本` · `数字` · `日期` · `时间` · `单选` · `多选` · `链接/截图`

**分析角色** —— 每个角色最多给一个字段，这是统计引擎唯一认的东西，所以字段名字随你怎么改：

| 角色 | 用途 |
| --- | --- |
| `date` 日期 | 月历、月度覆盖、排序 |
| `model` 模型 | 按模型拆解、模型筛选 |
| `taken` | `Taken` / `Faded` —— 「只算做了的」这个口径靠它 |
| `result` 结果 | `W` / `L` / `BE` / `BE -> W` / `BE -> L` —— 没有它整个分析页都跑不起来 |
| `r_multiple` R 倍数 | 总 R、EV、盈亏比 |
| `max_rr` 最大 RR | R 捕获率（可选） |
| `human_error` 人为失误 | 「排除人为错误」这个口径靠它 |
| `screenshot` 截图 | 卡片缩略图和灯箱 |

### 账号

邮箱注册 / 登录，可选「下次自动登录」（在 `localStorage` 和 `sessionStorage` 之间切换会话
存储），修改密码需要验证当前密码，可设置显示名（会用在页面标题上）和性别。

### 界面语言

支持中文和英文，在设置页顶部切换，**登录页上也有一个**，所以还没有账号时就能先选语言。第一次
访问按 `navigator.language` 自动判断；之后语言存在账号上，换台设备登录还是同一种语言。

有两样东西**刻意不翻译**：

- **你的字段名。** 新账号的默认字段按注册时的界面语言生成一次 —— 英文是 `Date` / `Session` /
  `Entry Time`，中文是 `日期` / `交易时段` / `入场时间`。生成之后它们就是你自己的数据了，
  切换语言只会换掉周围的界面，不会回头改写你可能已经改过的字段名。想改就去设置页改。
- **选项值**（`London`、`Taken`、`W`/`L`/`BE` 等）。这些存在数据库里、两种语言共用，
  这样不管交易是用哪种语言录入的，统计口径都是一致的、可比的。

语言跨设备同步需要跑一次迁移，见 [docs/i18n-migration.sql](docs/i18n-migration.sql)。
不跑也能用，只是语言只记在当前浏览器里，不会跟着账号走。

### 管理后台 *(仅 admin 可见)*

<!-- 截图 —— 管理后台用户表 → docs/screenshots/admin.png
<p align="center"><img src="docs/screenshots/admin.png" alt="管理后台" width="900"></p>
-->

- Supabase 连接配置覆盖，只保存在这台设备的浏览器里，不会改动源文件。
- **用户管理** —— 禁用 / 启用账号（被禁用的用户下次加载会被踢出）、设置或取消 admin 权限，
  以及一张可排序的表格：交易总数、上次在线、注册时间。
- **只读查看任意用户的数据** —— 浏览别人的交易、字段配置和分析，不影响自己的登录状态和本地
  设置，退出查看后自动还原。
- 发布 / 删除更新日志，所有登录用户都能在「更新日志」页看到。

### 其他

深色 / 浅色主题、CSV 导出、JSON 备份导出、图片懒加载、`Esc` 关闭最上层弹窗或灯箱、响应式布局。

---

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | 纯静态文件 —— `index.html` + `style.css` + `i18n.js` + `app.js`。无框架、无打包器、无构建步骤。 |
| 后端 | [Supabase](https://supabase.com)（Postgres + Auth），浏览器通过 `supabase-js` 直接调用。 |
| 部署 | 任意静态托管均可，仓库里附带了 Vercel 用的 `vercel.json` + `build.js`。 |

**三句话讲清架构。** 所有状态存在模块级 `let` 变量里，改完状态调用 `render()`，重新生成 HTML
字符串塞进 `#app`。所有交互靠 `data-action="…"` 属性 + 绑在 `document` 上的几个委托监听器，
不给每个元素单独绑事件。弹窗渲染在 `#modalRoot` / `#secondaryModalRoot`，并且有重绘守卫——
后台异步刷新永远不会把你正在输入的内容冲掉。

要参与开发的话先读 [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md)，里面写了代码约定、踩过的坑
（重点：**不要用 `stopPropagation()` 包住带按钮的容器**，这会让所有子按钮静默失效）以及改完
代码必做的检查。

### 数据模型

| 表 | 作用 |
| --- | --- |
| `profiles` | 一个用户一行 —— 邮箱、角色（`user`/`admin`）、启用状态、显示名、性别、界面语言、上次在线。注册触发器自动创建。 |
| `trades` | 一笔交易一行 —— `mode`（`backtest`/`live`）加一个以字段 id 为 key 的 `jsonb` 数据块，所以新增字段永远不需要迁移。 |
| `journal_schema` | 每用户的配置 —— `fields`（字段结构）、`card_fields`、`analysis_prefs`（口径默认值、拆解顺序与隐藏项、组合、组合分组）。 |
| `changelog` | 全局共享，所有人可读，只有 admin 能写。 |

真正做隔离的是 RLS：用户只能读写自己的行，admin 额外拥有对所有人数据的**只读**权限。需要提权
的写操作走 `security definer` 函数（`update_own_profile`、`update_own_lang`、
`touch_last_seen`、`is_admin`），前端无法给自己升权。

---

## 快速开始

### 1. 建 Supabase 项目

新建项目，然后按上面的结构建那四张表，配好 RLS 策略和辅助函数。具体的列、类型、策略、触发器写在
[PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) 第三节；仓库里没有附带初始化脚本，按那份文档建表，
或者找项目维护者要 SQL。

如果是升级已有部署，`analysis_prefs` 这一列要手动加：

```sql
alter table journal_schema add column if not exists analysis_prefs jsonb default '{}'::jsonb;
```

没跑这条 SQL 应用照样能用，只是分析页的配置存不下来，页面上会提示你去跑它。

### 2. 本地运行

```bash
cp config.example.js config.js
```

去 **Supabase 后台 → Settings → API** 拿到 Project URL 和 anon / publishable key 填进去，
然后用 HTTP 方式把这个文件夹跑起来（`file://` 下认证会失败）：

```bash
python -m http.server 8000
```

打开 <http://localhost:8000> 就行。没有依赖要装，也没有东西要编译。

### 3. 部署到 Vercel

`config.js` 被 gitignore 排除了，构建时会用环境变量自动生成：

1. **Import Git Repository** → 选这个仓库 → Framework Preset 选 **Other**。
2. **Settings → Environment Variables** → 添加 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`。
3. push 到主分支即可，之后每次 push 自动重新部署。

其他静态托管也一样能用，手写一个 `config.js` 连同整个文件夹传上去即可。

---

## 安全模型

- `config.js` 里的 anon / publishable key **设计上就是可以公开的**，这是 Supabase 官方的说法。
  任何人查看网页源代码都能看到它，这不是漏洞。
- 真正的安全边界是**每张表的 RLS 策略**。新增表或新功能时该问的是「策略配对了吗」，而不是
  「key 藏好了吗」。
- **绝对不要**把 `service_role` / secret key 放进任何前端代码——那个 key 能绕过所有 RLS，
  等于数据库最高权限。

### 免费版运维提示

Supabase 免费版在 7 天无数据库活动后会自动暂停项目（数据不丢，但连续暂停 90 天会释放基础
设施），而且**不提供任何自动备份**。本项目的做法是：另开一个私有仓库，用 GitHub Actions 定时
任务每天 `pg_dump` 一次，覆盖式提交成 `latest-backup.sql`，靠 git 的 commit 历史保留每日快照
——顺带也解决了防暂停的问题。连接串要用 **Session pooler** 那种，不要用 Direct connection，
后者默认走 IPv6，在 CI 里经常连不上。

---

## 已知限制

- 没有自动化测试。验证方式是手动测 + `node --check` + `data-action` 声明与处理的交叉 grep
  （见 [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) 第四节）。
- 管理员「查看他人数据后还原自己状态」这条链路还没有在真实浏览器里完整跑过。
- `max_rr` 有完整支持逻辑，但不在默认字段模板里，不自己加这个字段的话 R 捕获率不会显示。
- `app.js` 是一个大文件，没有模块拆分——一个人维护没问题，多人协作会有摩擦。
- 管理后台只能禁用账号、不能删除账号；真正删掉 auth 用户要去 Supabase 后台操作（这种权限不能
  交给前端）。

---

## License

未附带开源许可证，默认保留所有权利。

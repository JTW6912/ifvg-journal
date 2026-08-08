/* ============================================================
   I18N — 语言字典 + T() 取词函数
   在 index.html 里必须排在 app.js 前面加载（app.js 初始化时就要用 T()）。

   语言解析优先级：
     1. profiles.lang（登录后从数据库读到的账号语言）—— 语言跟着账号走
     2. localStorage journal_lang（这台设备上手动选过的，没登录时也生效）
     3. navigator.language 自动检测
   手动切换时两边同时写：localStorage 立即生效，数据库那份让别的设备也能拿到。

   key 命名用点分命名空间，跟页面/模块对齐，方便按块翻译和查漏。
   带参数的文案用 {name} 占位，T("key", { name: "x" }) 传值。
   ============================================================ */
const I18N_LANGS = ["zh", "en"];

const I18N = {
  zh: {
    /* ---------- 通用 ---------- */
    "common.loading": "加载中…",
    "common.save": "保存",
    "common.saving": "保存中…",
    "common.cancel": "取消",
    "common.close": "关闭",
    "common.delete": "删除",
    "common.add": "加",
    "common.processing": "处理中…",
    "common.noPermission": "没有权限。",
    "common.newTrade": "新建交易",
    "common.confirmDelete": "确定删除",
    "common.tabRenderError": "这个页签渲染出错了：{msg}",

    /* ---------- 语言切换 ---------- */
    "lang.label": "界面语言",
    "lang.zh": "中文",
    "lang.en": "English",
    "lang.switchTitle": "切换语言",
    "lang.hintShort": "已建好的字段名不会被翻译，那是你自己的数据。",

    /* ---------- 登录 / 注册 ---------- */
    "auth.login": "登录",
    "auth.register": "注册",
    "auth.email": "邮箱",
    "auth.password": "密码",
    "auth.rememberMe": "下次自动登录",
    "auth.registerSuccess": "注册成功。如果需要邮箱验证，去邮箱点一下确认链接，然后回来登录；不需要验证的话现在就能直接登录。",
    "auth.newAccountLangHint": "新账号的默认字段会按当前语言创建。",
    "auth.err.badCredentials": "邮箱或密码不对，再试一次。",
    "auth.err.notConfirmed": "邮箱还没验证——去邮箱里点确认链接，再回来登录。",
    "auth.err.alreadyRegistered": "这个邮箱已经注册过了，直接登录就行。",
    "auth.err.passwordShort": "密码太短，至少 6 位。",
    "auth.err.rateLimit": "请求太频繁了，等一会再试。",
    "auth.err.network": "网络连接失败，检查一下网络或者 Supabase 连接设置。",
    "auth.err.generic": "出了点问题，稍后再试一次。",
    "auth.noConfig": "还没配置 Supabase — 展开登录页下面的『登录不了？调整 Supabase 连接』填好再试。",
    "auth.disabled": "这个账号已被管理员禁用。",
    "auth.logout": "退出登录",

    /* ---------- 顶栏 / 页签 ---------- */
    "tab.grid": "记录",
    "tab.analytics": "分析",
    "tab.calendar": "月度",
    "tab.changelog": "更新日志",
    "tab.settings": "设置",
    "tab.admin": "管理后台",
    "header.titleWithName": "{name}的 IFVG Trade Journal",
    "header.toggleTheme": "切换主题",
    "header.export": "导出",
    "header.jsonBackup": "JSON 备份",
    "header.account": "账号",
    "header.profile": "个人设置",
    "header.viewingUser": "正在查看 {email} 的数据（只读）",
    "header.exitViewMode": "退出查看",
    "mode.backtest": "回测",
    "mode.live": "实盘",

    /* ---------- 记录页 ---------- */
    "grid.summaryEmpty": "当前筛选：0 笔 taken",
    "grid.winRate": "胜率",
    "grid.total": "总",
    "grid.pfTitle": "正R之和 ÷ |负R之和|，只统计填了 R 的 {n} 笔",
    "grid.saveFiltersAsCombo": "把当前筛选存为组合",
    "grid.prevPage": "‹ 上一页",
    "grid.nextPage": "下一页 ›",
    "grid.pageInfo": "第 {page} / {total} 页 · 共 {count} 笔",
    "grid.viewingCombo": "正在查看组合 {name} 的交易",
    "grid.backToCombo": "回到分析页",
    "grid.restoreFilters": "还原筛选",
    "grid.searchPlaceholder": "搜索 note 等文本字段…",
    "grid.sort": "排序",
    "grid.sortTradeDate": "交易日期",
    "grid.sortCreated": "创建日期",
    "grid.sortUpdated": "修改日期",
    "grid.sortDesc": "↓ 从新到旧",
    "grid.sortAsc": "↑ 从旧到新",
    "grid.viewCard": "卡片",
    "grid.viewTable": "表格",
    "grid.imageSize": "图片大小",
    "grid.sizeCompact": "紧凑",
    "grid.sizeStandard": "标准",
    "grid.sizeLarge": "大图",
    "grid.sizeHuge": "超大图",
    "grid.cardFields": "卡片显示字段",
    "grid.cardFieldsHint": "日期 / 模型 / R值 默认一直显示，这里选的是在这基础上额外多显示哪些字段",
    "grid.clearExtraFields": "清空额外字段",
    "grid.empty": "还没有记录",
    "grid.viewLarge": "大图查看",
    "grid.tradeCount": "{n} 笔",

    /* ---------- 筛选 ---------- */
    "filter.title": "筛选条件",
    "filter.activeCount": "{n} 个已启用",
    "filter.logicHint": "条件之间 AND，同一条件内多选是 OR",
    "filter.addCondition": "添加筛选条件",
    "filter.clearAllValues": "一键清空已选",
    "filter.selectField": "选字段…",
    "filter.matchAll": "要求同时满足选中的全部",
    "filter.negate": "不是以下任何一个",
    "filter.fieldDeleted": "⚠ 这个字段已经被删掉了，这条条件不起作用，请重选或删掉",
    "filter.ghostOption": "这个选项已经不存在了，点一下移除",
    "filter.rangeTo": "到",
    "filter.timeHint": "24小时制，直接输入数字如 0930 会自动格式化为 09:30",
    "filter.containsPlaceholder": "包含…",
    "common.dragToReorder": "拖动排序",

    /* ---------- 交易录入弹窗 ---------- */
    "modal.viewTrade": "查看交易（只读）",
    "modal.editTrade": "编辑交易",
    "modal.draftRestored": "已恢复上次未完成的草稿",
    "modal.clearDraft": "清除草稿",
    "modal.urlPreviewHint": "拖右下角可以调整预览大小",
    "image.loadFailed": "图片没加载出来",
    "image.openInNewTab": "在新标签打开",

    /* ---------- 分析页：总览 / 口径 ---------- */
    "analytics.noResultRole": "当前没有字段被标记为『结果』角色 — 去设置页给某个字段打上『结果 W/L/BE』角色标签，分析才能算出来。",
    "analytics.noTradesLine1": "当前口径下没有可统计的交易——{source}共 {total} 笔，其中 taken=Taken 的有 {withTaken} 笔，result 填了 W/L 的有 {withResult} 笔。",
    "analytics.sourceModels": "选中的模型",
    "analytics.sourceDb": "数据库里",
    "analytics.noTradesLine2": "要么放宽上面的统计口径，要么新建交易时记得点选 taken=Taken、result 也选一个具体值（不能留空）。",
    "analytics.countTaken": "已入场",
    "analytics.countTrades": "交易数",
    "analytics.setupQuality": "设置质量",
    "analytics.totalR": "总R",
    "analytics.evPerTrade": "EV / 笔",
    "analytics.profitFactor": "盈亏比",
    "analytics.pfBasis": "基于填了 R 的 {n} 笔",
    "analytics.captureRate": "R 捕获率",
    "analytics.fadedLine": "· Faded {n}（本应做的 W {w} / 本应避开的 L {l}）",
    "analytics.byModel": "按模型",
    "scope.title": "统计口径",
    "scope.takenOnly": "只算已入场（Taken）的交易",
    "scope.excludeHumanError": "排除标记为人为错误的交易",
    "scope.model": "模型",
    "scope.clearModels": "清空（=全部）",
    "scope.allModels": "不选=全部",
    "scope.localHint": "这些是本地设置，只存在这台设备上，不会同步给其他登录设备；只影响上面的总览和下面的字段拆解，不影响组合分析（组合用的是自己单独添加的筛选条件）",

    /* ---------- 分析页：字段拆解 ---------- */
    "breakdown.title": "全部字段拆解",
    "breakdown.displaySettings": "显示设置",
    "breakdown.pickerHint": "取消勾选就不显示，拖动 ⠿ 调整顺序。以后新加的字段会自动出现在最后面。",
    "breakdown.reset": "恢复默认（全显示 + 默认顺序）",
    "breakdown.hideField": "不显示这个字段的拆解（想找回去上面『显示设置』里重新勾选）",
    "breakdown.none": "没有可拆解的字段（全被隐藏了，或者当前口径下这些字段都没填过值）。",
    "breakdown.comboFromRow": "用这一条直接建一个组合",
    "breakdown.comboBtn": "组合",

    /* ---------- 组合 ---------- */
    "combo.untitled": "未命名组合",
    "combo.issue.noField": "第 {no} 条还没选字段（不会起任何过滤作用）",
    "combo.issue.fieldDeleted": "第 {no} 条引用的字段已被删除，这条会失效并放行全部交易",
    "combo.issue.missingOptions": "「{label}」的选项 {opts} 已不存在，永远匹配不到",
    "combo.issue.noValues": "「{label}」没选任何值（不会起任何过滤作用）",
    "combo.issue.noRange": "「{label}」没填区间（不会起任何过滤作用）",
    "combo.issue.noText": "「{label}」没填内容（不会起任何过滤作用）",
    "combo.cond.fieldDeleted": "⚠ 字段已删除",
    "combo.cond.and": " 且 ",
    "combo.cond.contains": "{label} 含「{value}」",
    "combo.cond.none": "没有任何条件（= 全部交易）",
    "combo.namePlaceholder": "组合名字…",
    "combo.editorHint": "条件之间 AND，同一条件内多选是 OR，勾上「不是以下任何一个」就是 NOR。想只算 Taken / 排除人为错误，跟其他条件一样在下面加一行。归到哪个分组，收起编辑器后拖卡片到分组标题上就行",
    "combo.addCondition": "添加条件",
    "combo.done": "完成",
    "combo.broken": "条件失效，数字不可信，先修好再看",
    "combo.dragHint": "拖动排序，或拖到分组标题上归类",
    "combo.collapse": "收起",
    "combo.edit": "编辑",
    "combo.smallSampleTitle": "样本太少，胜率的随机波动会很大，别急着下结论",
    "combo.smallSample": "样本仅 {n} 笔，参考意义有限",
    "combo.confirmDelete": "确定删掉「{name}」？",
    "combo.viewTrades": "查看这 {n} 笔交易 →",
    "combos.title": "组合分析",
    "combos.newGroup": "新建分组",
    "combos.newCombo": "新建组合",
    "combos.emptyIntro": "还没有组合。组合就是一组固定的筛选条件（比如「模型=A 且 目标类型含 BSL」），存下来之后这里会实时显示它的胜率、EV、PF，点一下就能跳到记录页看是哪些交易。<br>三个建法：这里点「新建组合」手搭；记录页调好筛选后点「把当前筛选存为组合」；下面字段拆解里每一行右边的「+组合」。<br>组合多了以后可以用「新建分组」把它们归类，比如「IFVG」下面再分「能做」「不能做」两个二级分组——不想分组的话完全不用管这个，就是个平铺列表。",
    "combos.emptyWithGroups": "分组建好了，但还没有组合。点右上角「新建组合」手搭一个，或者在记录页调好筛选后点「把当前筛选存为组合」；建好之后把卡片拖到下面的分组标题上就能归类。",

    /* ---------- 组合分组 ---------- */
    "comboGroup.kindRoot": "分组",
    "comboGroup.kindSub": "二级分组",
    "comboGroup.subCount": "{n} 个二级分组",
    "comboGroup.comboCount": "{n} 个组合",
    "comboGroup.andJoin": "和",
    "comboGroup.cascadeWarn": "，里面的{parts}会一起被删掉，这个操作不可撤销",
    "comboGroup.cascadeEmpty": "（里面是空的）",
    "comboGroup.confirmDelete": "确定删除{kind}「{name}」？{warn}",
    "comboGroup.rename": "改名",
    "comboGroup.addSub": "二级分组",
    "comboGroup.directBucket": "未归入二级分组",
    "comboGroup.ungrouped": "未分组",
    "comboGroup.dropHintSub": "把组合卡片拖到这个标题上，就能归到这个二级分组",
    "comboGroup.dropHintRoot": "把组合卡片拖到这个标题上，就能归到这个分组",
    "comboGroup.dropHintUngroup": "拖到这里可以把组合从分组里移出来",

    /* ---------- 分析设置保存 ---------- */
    "prefs.saveErrorMissingColumn": "分析设置没能保存到数据库——journal_schema 表还缺 analysis_prefs 这一列，去 Supabase SQL Editor 跑一次：alter table journal_schema add column if not exists analysis_prefs jsonb default '{}'::jsonb;",
    "prefs.saveError": "分析设置保存失败：{msg}",
    "combo.newName": "新组合 {n}",
    "combo.fromFilters": "来自筛选 {date}",

    /* ---------- 更新日志 ---------- */
    "changelog.publishLabel": "发布一条更新",
    "changelog.placeholder": "这次更新了什么…",
    "changelog.publish": "发布",
    "changelog.history": "历史更新",
    "changelog.empty": "还没有更新记录。",
    "changelog.confirmDelete": "删除这条更新记录？",

    /* ---------- 月度 / 日历 ---------- */
    "calendar.noDateRole": "当前没有字段被标记为『日期』角色 — 去设置页给某个字段打上『日期』角色标签。",
    "calendar.monthOverview": "月度概览",
    "calendar.winLoss": "{w}胜{l}负",
    "calendar.dayDetail": "每日明细",
    "calendar.weekMon": "周一",
    "calendar.weekTue": "周二",
    "calendar.weekWed": "周三",
    "calendar.weekThu": "周四",
    "calendar.weekFri": "周五",
    "calendar.weekSat": "周六",
    "calendar.weekSun": "周日",
    "calendar.thisWeek": "本周",
    "coverage.title": "历史回测覆盖 2020–{year}",
    "coverage.rule": "规则：当月 1–10 号与 20 号至月底 <b style=\"color:var(--text)\">各至少一笔记录</b> 才算「已完成」；只满足一半算「部分」。",
    "coverage.complete": "已完成",
    "coverage.partial": "部分",
    "coverage.empty": "未开始",
    "dayDetail.summary": "{n} 笔",
    "dayDetail.summaryWithR": "{n} 笔 · 合计 {r}R",
    "dayDetail.empty": "这天还没有记录",
    "dayDetail.newTrade": "新建这天的交易",

    /* ---------- 设置页：字段管理 ---------- */
    "settings.readOnlyNote": "只读查看 {email} 的字段配置，不能编辑。",
    "settings.fieldsHint": "字段的增删改在这里管理，改动会立即同步到录入表单和分析页。「分析角色」决定这个字段在统计里扮演什么。",
    "settings.fieldName": "字段名",
    "settings.type": "类型",
    "settings.role": "分析角色",
    "settings.optionPool": "选项池（可拖动排序）",
    "settings.newOptionPlaceholder": "新选项…",
    "settings.deleteField": "删除字段",
    "settings.confirmDeleteField": "删除这个字段？已有交易里这个字段的数据会保留但不再显示。",
    "settings.addFieldTitle": "+ 新增字段",
    "settings.newFieldPlaceholder": "例如：mentor_confirm",
    "settings.initialOptions": "初始选项（逗号分隔，仅单选/多选需要）",
    "settings.addField": "添加字段",

    /* ---------- 管理后台 ---------- */
    "admin.supabaseTitle": "Supabase 连接设置",
    "admin.usingStored": "使用本地保存的配置",
    "admin.usingFile": "使用文件内默认值",
    "admin.saveReconnect": "保存并重连",
    "admin.resetApi": "恢复文件默认值",
    "admin.apiHint": "保存在这台设备的浏览器里，不会改动 index.html 源文件本身。",
    "admin.usersTitle": "用户管理",
    "admin.clickToLoad": "点击加载",
    "admin.userCount": "{n} 个用户",
    "admin.autoLoad": "展开时自动加载…",
    "admin.colEmail": "邮箱",
    "admin.colName": "名称",
    "admin.colRole": "角色",
    "admin.colStatus": "状态",
    "admin.colTrades": "交易数",
    "admin.colLastSeen": "上次在线",
    "admin.colCreated": "注册时间",
    "admin.neverLoggedIn": "从未登录",
    "admin.active": "正常",
    "admin.disabled": "已禁用",
    "admin.disable": "禁用",
    "admin.enable": "启用",
    "admin.makeAdmin": "设为管理员",
    "admin.removeAdmin": "取消管理员",
    "admin.viewData": "查看数据",
    "admin.disableHint": "「禁用」会立刻阻止该账号登录使用，但不会删除 Supabase 里的账号本体（前端安全限制，无法真正删号）。",

    /* ---------- 个人设置 / 改密码 ---------- */
    "profile.displayName": "显示名称",
    "profile.namePlaceholder": "例如：Timmy",
    "profile.gender": "性别",
    "profile.male": "男",
    "profile.female": "女",
    "profile.saved": "已保存。",
    "profile.saveFailed": "保存失败，请稍后再试。",
    "password.title": "修改密码",
    "password.current": "当前密码",
    "password.new": "新密码",
    "password.confirm": "确认新密码",
    "password.allRequired": "三个都要填。",
    "password.tooShort": "新密码至少 6 位。",
    "password.mismatch": "两次新密码不一致。",
    "password.currentWrong": "当前密码不对。",
    "password.changeFailed": "修改失败：{msg}",
    "password.changed": "密码已修改。",

    /* ---------- 组合分组弹窗 ---------- */
    "comboGroup.modalNewRoot": "新建分组",
    "comboGroup.modalNewSub": "新建二级分组",
    "comboGroup.modalRename": "改名",
    "comboGroup.nameLabel": "分组名字",
    "comboGroup.namePlaceholder": "比如「IFVG」「能做」",

    /* ---------- 通用错误 ---------- */
    "error.loadData": "读取数据失败，请稍后刷新重试。如果一直这样，联系管理员检查一下数据库设置。",
    "error.saveTrade": "保存失败: {msg}",
    "error.publish": "发布失败：{msg}",
    "error.action": "操作失败：{msg}",
    "auth.noDb": "连不上数据库，联系管理员检查一下。",
    "auth.emailPasswordRequired": "邮箱和密码都要填",

    /* ---------- 字段类型 ---------- */
    "fieldType.text": "单行文本",
    "fieldType.textarea": "多行文本",
    "fieldType.number": "数字",
    "fieldType.date": "日期",
    "fieldType.time": "时间",
    "fieldType.select": "单选",
    "fieldType.multiselect": "多选",
    "fieldType.url": "链接/截图",

    /* ---------- 分析角色 ---------- */
    "role.none": "无",
    "role.date": "日期(用于月度覆盖)",
    "role.model": "模型(按模型统计)",
    "role.taken": "Taken / Faded",
    "role.result": "结果 W/L/BE",
    "role.r_multiple": "R 倍数",
    "role.max_rr": "最大 RR",
    "role.human_error": "人为失误",
    "role.screenshot": "截图链接",

    /* ---------- 新账号的默认字段名 ----------
       只在第一次建账号时写进数据库，之后就是用户自己的数据，切语言不会回头改它 */
    "defaultField.date": "日期",
    "defaultField.session": "交易时段",
    "defaultField.entry_time": "入场时间",
    "defaultField.direction": "方向",
    "defaultField.model": "模型",
    "defaultField.entry": "入场方式",
    "defaultField.taken": "做了还是避免",
    "defaultField.result": "结果",
    "defaultField.r_multiple": "RR",
    "defaultField.human_error": "人为错误",
    "defaultField.setup_grade_self": "自评等级",
    "defaultField.target_type": "目标类型",
    "defaultField.notes": "笔记",
    "defaultField.post_note": "复盘笔记",
    "defaultField.screenshot": "截图",
  },

  en: {
    /* ---------- Common ---------- */
    "common.loading": "Loading…",
    "common.save": "Save",
    "common.saving": "Saving…",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.delete": "Delete",
    "common.add": "Add",
    "common.processing": "Working…",
    "common.noPermission": "You don't have access to this.",
    "common.newTrade": "New trade",
    "common.confirmDelete": "Confirm delete",
    "common.tabRenderError": "This tab failed to render: {msg}",

    /* ---------- Language ---------- */
    "lang.label": "Language",
    "lang.zh": "中文",
    "lang.en": "English",
    "lang.switchTitle": "Switch language",
    "lang.hintShort": "Field names you already have stay as they are — those are your data.",

    /* ---------- Sign in / Sign up ---------- */
    "auth.login": "Sign in",
    "auth.register": "Sign up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.rememberMe": "Keep me signed in",
    "auth.registerSuccess": "Account created. If email confirmation is required, click the link in your inbox and come back to sign in; otherwise you can sign in right away.",
    "auth.newAccountLangHint": "New accounts get their default fields in the language selected here.",
    "auth.err.badCredentials": "Wrong email or password — give it another try.",
    "auth.err.notConfirmed": "Email not verified yet — click the confirmation link in your inbox, then come back.",
    "auth.err.alreadyRegistered": "That email is already registered. Just sign in.",
    "auth.err.passwordShort": "Password is too short — 6 characters minimum.",
    "auth.err.rateLimit": "Too many attempts. Wait a moment and try again.",
    "auth.err.network": "Couldn't reach the server. Check your connection or your Supabase settings.",
    "auth.err.generic": "Something went wrong. Try again in a bit.",
    "auth.noConfig": "Supabase isn't configured yet — open \"Can't sign in? Adjust Supabase connection\" below the sign-in form and fill it in.",
    "auth.disabled": "This account has been disabled by an administrator.",
    "auth.logout": "Sign out",

    /* ---------- Header / tabs ---------- */
    "tab.grid": "Trades",
    "tab.analytics": "Analytics",
    "tab.calendar": "Monthly",
    "tab.changelog": "Changelog",
    "tab.settings": "Settings",
    "tab.admin": "Admin",
    "header.titleWithName": "{name}'s IFVG Trade Journal",
    "header.toggleTheme": "Toggle theme",
    "header.export": "Export",
    "header.jsonBackup": "JSON backup",
    "header.account": "Account",
    "header.profile": "Profile settings",
    "header.viewingUser": "Viewing {email}'s data (read-only)",
    "header.exitViewMode": "Exit view",
    "mode.backtest": "Backtest",
    "mode.live": "Live",

    /* ---------- Trades page ---------- */
    "grid.summaryEmpty": "Current filter: 0 taken",
    "grid.winRate": "Win rate",
    "grid.total": "Total",
    "grid.pfTitle": "Sum of positive R ÷ |sum of negative R|, across the {n} trades that have an R value",
    "grid.pfTitle_one": "Sum of positive R ÷ |sum of negative R|, across the 1 trade that has an R value",
    "grid.saveFiltersAsCombo": "Save these filters as a combo",
    "grid.prevPage": "‹ Prev",
    "grid.nextPage": "Next ›",
    "grid.pageInfo": "Page {page} of {total} · {count} trades",
    "grid.viewingCombo": "Showing trades in combo {name}",
    "grid.backToCombo": "Back to analytics",
    "grid.restoreFilters": "Restore filters",
    "grid.searchPlaceholder": "Search notes and other text fields…",
    "grid.sort": "Sort",
    "grid.sortTradeDate": "Trade date",
    "grid.sortCreated": "Created",
    "grid.sortUpdated": "Updated",
    "grid.sortDesc": "↓ Newest first",
    "grid.sortAsc": "↑ Oldest first",
    "grid.viewCard": "Cards",
    "grid.viewTable": "Table",
    "grid.imageSize": "Image size",
    "grid.sizeCompact": "Compact",
    "grid.sizeStandard": "Standard",
    "grid.sizeLarge": "Large",
    "grid.sizeHuge": "Extra large",
    "grid.cardFields": "Card fields",
    "grid.cardFieldsHint": "Date, model and R are always shown. Pick any extra fields to display on top of those.",
    "grid.clearExtraFields": "Clear extra fields",
    "grid.empty": "No trades yet",
    "grid.viewLarge": "View full size",
    "grid.tradeCount": "{n} trades",
    "grid.tradeCount_one": "1 trade",

    /* ---------- Filters ---------- */
    "filter.title": "Filters",
    "filter.activeCount": "{n} active",
    "filter.logicHint": "Conditions are ANDed together; multiple values inside one condition are ORed",
    "filter.addCondition": "Add condition",
    "filter.clearAllValues": "Clear all selections",
    "filter.selectField": "Pick a field…",
    "filter.matchAll": "Must match all selected",
    "filter.negate": "Is none of these",
    "filter.fieldDeleted": "⚠ This field was deleted, so the condition does nothing — pick another field or remove it",
    "filter.ghostOption": "This option no longer exists — click to remove it",
    "filter.rangeTo": "to",
    "filter.timeHint": "24-hour clock. Type digits like 0930 and it becomes 09:30.",
    "filter.containsPlaceholder": "Contains…",
    "common.dragToReorder": "Drag to reorder",

    /* ---------- Trade form modal ---------- */
    "modal.viewTrade": "View trade (read-only)",
    "modal.editTrade": "Edit trade",
    "modal.draftRestored": "Restored your unfinished draft",
    "modal.clearDraft": "Discard draft",
    "modal.urlPreviewHint": "Drag the bottom-right corner to resize the preview",
    "image.loadFailed": "Image didn't load",
    "image.openInNewTab": "Open in new tab",

    /* ---------- Analytics: overview / scope ---------- */
    "analytics.noResultRole": "No field is tagged with the 'Result' role — go to Settings and give a field the 'Result W/L/BE' role so the analytics can be calculated.",
    "analytics.noTradesLine1": "Nothing to measure under the current scope — {source} has {total} trades, of which {withTaken} have taken=Taken and {withResult} have a W/L result.",
    "analytics.sourceModels": "the selected models",
    "analytics.sourceDb": "the database",
    "analytics.noTradesLine2": "Either loosen the scope above, or make sure new trades get taken=Taken and a concrete result — it can't be left blank.",
    "analytics.countTaken": "Taken",
    "analytics.countTrades": "Trades",
    "analytics.setupQuality": "Setup quality",
    "analytics.totalR": "Total R",
    "analytics.evPerTrade": "EV / trade",
    "analytics.profitFactor": "Profit factor",
    "analytics.pfBasis": "Based on the {n} trades with an R value",
    "analytics.pfBasis_one": "Based on the 1 trade with an R value",
    "analytics.captureRate": "R capture rate",
    "analytics.fadedLine": "· Faded {n} ({w} would have won / {l} would have lost)",
    "analytics.byModel": "By model",
    "scope.title": "Scope",
    "scope.takenOnly": "Only count trades that were taken",
    "scope.excludeHumanError": "Exclude trades flagged as human error",
    "scope.model": "Model",
    "scope.clearModels": "Clear (= all)",
    "scope.allModels": "none selected = all",
    "scope.localHint": "These are local settings — they live on this device only and don't sync to your other devices. They affect the overview above and the field breakdowns below, but not combo analysis (combos use their own conditions).",

    /* ---------- Analytics: field breakdowns ---------- */
    "breakdown.title": "All field breakdowns",
    "breakdown.displaySettings": "Display settings",
    "breakdown.pickerHint": "Uncheck to hide, drag ⠿ to reorder. Fields you add later show up at the end automatically.",
    "breakdown.reset": "Reset to default (show all, default order)",
    "breakdown.hideField": "Hide this field's breakdown (re-enable it under 'Display settings' above)",
    "breakdown.none": "No fields to break down — they're all hidden, or none of them have values under the current scope.",
    "breakdown.comboFromRow": "Build a combo straight from this row",
    "breakdown.comboBtn": "Combo",

    /* ---------- Combos ---------- */
    "combo.untitled": "Untitled combo",
    "combo.issue.noField": "Condition {no} has no field selected (it filters nothing)",
    "combo.issue.fieldDeleted": "Condition {no} points at a deleted field — it does nothing and lets every trade through",
    "combo.issue.missingOptions": "Options {opts} on \"{label}\" no longer exist, so this can never match",
    "combo.issue.noValues": "\"{label}\" has no values selected (it filters nothing)",
    "combo.issue.noRange": "\"{label}\" has no range set (it filters nothing)",
    "combo.issue.noText": "\"{label}\" has no text entered (it filters nothing)",
    "combo.cond.fieldDeleted": "⚠ field deleted",
    "combo.cond.and": " and ",
    "combo.cond.contains": "{label} contains \"{value}\"",
    "combo.cond.none": "No conditions (= all trades)",
    "combo.namePlaceholder": "Combo name…",
    "combo.editorHint": "Conditions are ANDed; multiple values inside one condition are ORed; tick \"Is none of these\" for NOR. To count only Taken trades or exclude human error, add those as ordinary conditions below. To file this combo in a group, collapse the editor and drag the card onto a group header.",
    "combo.addCondition": "Add condition",
    "combo.done": "Done",
    "combo.broken": "Conditions are broken — these numbers can't be trusted. Fix them first.",
    "combo.dragHint": "Drag to reorder, or drop onto a group header to file it",
    "combo.collapse": "Collapse",
    "combo.edit": "Edit",
    "combo.smallSampleTitle": "Small sample — win rate swings a lot on chance alone, so don't read much into it",
    "combo.smallSample": "Only {n} trades — limited signal",
    "combo.smallSample_one": "Only 1 trade — limited signal",
    "combo.confirmDelete": "Delete \"{name}\"?",
    "combo.viewTrades": "View these {n} trades →",
    "combo.viewTrades_one": "View this 1 trade →",
    "combos.title": "Combo analysis",
    "combos.newGroup": "New group",
    "combos.newCombo": "New combo",
    "combos.emptyIntro": "No combos yet. A combo is a saved set of filter conditions (say, \"model = A and target type includes BSL\"). Once saved, its win rate, EV and PF show up here live, and one click takes you to the matching trades.<br>Three ways to make one: hit \"New combo\" here; set up filters on the trades page and hit \"Save these filters as a combo\"; or use the \"+Combo\" button on any breakdown row below.<br>Once you have a few, \"New group\" lets you file them — for example an \"IFVG\" group with \"Trade\" and \"Avoid\" subgroups. Don't want groups? Ignore all of it and keep a flat list.",
    "combos.emptyWithGroups": "Groups are set up, but there are no combos yet. Hit \"New combo\" at the top right, or set up filters on the trades page and hit \"Save these filters as a combo\". Once you have one, drag the card onto a group header to file it.",

    /* ---------- Combo groups ---------- */
    "comboGroup.kindRoot": "group",
    "comboGroup.kindSub": "subgroup",
    "comboGroup.subCount": "{n} subgroups",
    "comboGroup.subCount_one": "1 subgroup",
    "comboGroup.comboCount": "{n} combos",
    "comboGroup.comboCount_one": "1 combo",
    "comboGroup.andJoin": " and ",
    "comboGroup.cascadeWarn": " — the {parts} inside will be deleted with it, and this can't be undone",
    "comboGroup.cascadeEmpty": " (it's empty)",
    "comboGroup.confirmDelete": "Delete the {kind} \"{name}\"?{warn}",
    "comboGroup.rename": "Rename",
    "comboGroup.addSub": "Subgroup",
    "comboGroup.directBucket": "Not in a subgroup",
    "comboGroup.ungrouped": "Ungrouped",
    "comboGroup.dropHintSub": "Drag a combo card onto this header to file it in this subgroup",
    "comboGroup.dropHintRoot": "Drag a combo card onto this header to file it in this group",
    "comboGroup.dropHintUngroup": "Drop here to pull a combo back out of its group",

    /* ---------- Saving analysis settings ---------- */
    "prefs.saveErrorMissingColumn": "Analysis settings couldn't be saved — the journal_schema table is missing the analysis_prefs column. Run this once in the Supabase SQL Editor: alter table journal_schema add column if not exists analysis_prefs jsonb default '{}'::jsonb;",
    "prefs.saveError": "Couldn't save analysis settings: {msg}",
    "combo.newName": "New combo {n}",
    "combo.fromFilters": "From filters {date}",

    /* ---------- Changelog ---------- */
    "changelog.publishLabel": "Post an update",
    "changelog.placeholder": "What changed this time…",
    "changelog.publish": "Post",
    "changelog.history": "Past updates",
    "changelog.empty": "No updates yet.",
    "changelog.confirmDelete": "Delete this changelog entry?",

    /* ---------- Monthly / calendar ---------- */
    "calendar.noDateRole": "No field is tagged with the 'Date' role — go to Settings and give a field the 'Date' role.",
    "calendar.monthOverview": "Monthly overview",
    "calendar.winLoss": "{w}W {l}L",
    "calendar.dayDetail": "Daily detail",
    "calendar.weekMon": "Mon",
    "calendar.weekTue": "Tue",
    "calendar.weekWed": "Wed",
    "calendar.weekThu": "Thu",
    "calendar.weekFri": "Fri",
    "calendar.weekSat": "Sat",
    "calendar.weekSun": "Sun",
    "calendar.thisWeek": "Week",
    "coverage.title": "Backtest coverage 2020–{year}",
    "coverage.rule": "Rule: a month counts as \"complete\" only with <b style=\"color:var(--text)\">at least one trade</b> in both the 1st–10th and the 20th–month end. Meeting just one half counts as \"partial\".",
    "coverage.complete": "Complete",
    "coverage.partial": "Partial",
    "coverage.empty": "Not started",
    "dayDetail.summary": "{n} trades",
    "dayDetail.summary_one": "1 trade",
    "dayDetail.summaryWithR": "{n} trades · {r}R total",
    "dayDetail.summaryWithR_one": "1 trade · {r}R total",
    "dayDetail.empty": "Nothing recorded on this day",
    "dayDetail.newTrade": "Add a trade for this day",

    /* ---------- Settings: field management ---------- */
    "settings.readOnlyNote": "Read-only view of {email}'s field setup — you can't edit it.",
    "settings.fieldsHint": "Add, edit and remove fields here. Changes apply immediately to the entry form and the analytics page. The \"Analysis role\" decides what part a field plays in the stats.",
    "settings.fieldName": "Field name",
    "settings.type": "Type",
    "settings.role": "Analysis role",
    "settings.optionPool": "Options (drag to reorder)",
    "settings.newOptionPlaceholder": "New option…",
    "settings.deleteField": "Delete field",
    "settings.confirmDeleteField": "Delete this field? Data already stored on existing trades is kept but no longer shown.",
    "settings.addFieldTitle": "+ Add field",
    "settings.newFieldPlaceholder": "e.g. mentor_confirm",
    "settings.initialOptions": "Initial options (comma separated, only for single/multi select)",
    "settings.addField": "Add field",

    /* ---------- Admin ---------- */
    "admin.supabaseTitle": "Supabase connection",
    "admin.usingStored": "using locally saved config",
    "admin.usingFile": "using built-in defaults",
    "admin.saveReconnect": "Save and reconnect",
    "admin.resetApi": "Restore built-in defaults",
    "admin.apiHint": "Saved in this browser on this device. It does not modify the index.html source itself.",
    "admin.usersTitle": "User management",
    "admin.clickToLoad": "click to load",
    "admin.userCount": "{n} users",
    "admin.userCount_one": "1 user",
    "admin.autoLoad": "Loading on expand…",
    "admin.colEmail": "Email",
    "admin.colName": "Name",
    "admin.colRole": "Role",
    "admin.colStatus": "Status",
    "admin.colTrades": "Trades",
    "admin.colLastSeen": "Last seen",
    "admin.colCreated": "Registered",
    "admin.neverLoggedIn": "never signed in",
    "admin.active": "Active",
    "admin.disabled": "Disabled",
    "admin.disable": "Disable",
    "admin.enable": "Enable",
    "admin.makeAdmin": "Make admin",
    "admin.removeAdmin": "Remove admin",
    "admin.viewData": "View data",
    "admin.disableHint": "\"Disable\" immediately blocks that account from signing in, but it does not delete the account in Supabase — the frontend can't actually delete accounts.",

    /* ---------- Profile / password ---------- */
    "profile.displayName": "Display name",
    "profile.namePlaceholder": "e.g. Timmy",
    "profile.gender": "Gender",
    "profile.male": "Male",
    "profile.female": "Female",
    "profile.saved": "Saved.",
    "profile.saveFailed": "Couldn't save. Try again in a moment.",
    "password.title": "Change password",
    "password.current": "Current password",
    "password.new": "New password",
    "password.confirm": "Confirm new password",
    "password.allRequired": "All three fields are required.",
    "password.tooShort": "New password must be at least 6 characters.",
    "password.mismatch": "The two new passwords don't match.",
    "password.currentWrong": "Current password is wrong.",
    "password.changeFailed": "Couldn't change password: {msg}",
    "password.changed": "Password changed.",

    /* ---------- Combo group modal ---------- */
    "comboGroup.modalNewRoot": "New group",
    "comboGroup.modalNewSub": "New subgroup",
    "comboGroup.modalRename": "Rename",
    "comboGroup.nameLabel": "Group name",
    "comboGroup.namePlaceholder": "e.g. \"IFVG\", \"Trade\"",

    /* ---------- Generic errors ---------- */
    "error.loadData": "Couldn't load your data. Refresh and try again — if it keeps happening, ask an admin to check the database settings.",
    "error.saveTrade": "Save failed: {msg}",
    "error.publish": "Couldn't post: {msg}",
    "error.action": "That didn't work: {msg}",
    "auth.noDb": "Can't reach the database — ask an admin to take a look.",
    "auth.emailPasswordRequired": "Email and password are both required",

    /* ---------- Field types ---------- */
    "fieldType.text": "Text",
    "fieldType.textarea": "Long text",
    "fieldType.number": "Number",
    "fieldType.date": "Date",
    "fieldType.time": "Time",
    "fieldType.select": "Single select",
    "fieldType.multiselect": "Multi select",
    "fieldType.url": "Link / screenshot",

    /* ---------- Analysis roles ---------- */
    "role.none": "None",
    "role.date": "Date (drives monthly coverage)",
    "role.model": "Model (group stats by model)",
    "role.taken": "Taken / Faded",
    "role.result": "Result W/L/BE",
    "role.r_multiple": "R multiple",
    "role.max_rr": "Max RR",
    "role.human_error": "Human error",
    "role.screenshot": "Screenshot URL",

    /* ---------- Default field names for new accounts ----------
       Written to the database once, at account creation. After that they're the
       user's own data and switching language never rewrites them. */
    "defaultField.date": "Date",
    "defaultField.session": "Session",
    "defaultField.entry_time": "Entry Time",
    "defaultField.direction": "Direction",
    "defaultField.model": "Model",
    "defaultField.entry": "Entry Type",
    "defaultField.taken": "Taken / Faded",
    "defaultField.result": "Result",
    "defaultField.r_multiple": "RR",
    "defaultField.human_error": "Human Error",
    "defaultField.setup_grade_self": "Self Grade",
    "defaultField.target_type": "Target Type",
    "defaultField.notes": "Notes",
    "defaultField.post_note": "Review Notes",
    "defaultField.screenshot": "Screenshot",
  },
};

/* 浏览器语言 → 我们支持的语言。zh-CN / zh-TW / zh-Hans 都算中文，其余一律英文。 */
function detectBrowserLang() {
  try {
    const raw = (navigator.languages && navigator.languages[0]) || navigator.language || "";
    return String(raw).toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch (e) { return "en"; }
}
function readStoredLang() {
  try {
    const v = localStorage.getItem("journal_lang");
    return I18N_LANGS.includes(v) ? v : null;
  } catch (e) { return null; }
}

let lang = readStoredLang() || detectBrowserLang();

/* 取词。找不到 key 时按 en → zh → key 本身逐级兜底，
   这样翻译还没补齐的地方会退回另一种语言，而不是在界面上露出一个原始 key。

   单复数：传了 n 且当前语言表里有 "<key>_one" 时用单数版（英文的 "1 combo" vs "2 combos"）。
   刻意只查当前语言表——中文没有单复数、也就不会有 _one，如果放开兜底链，
   中文界面会去捡英文的 _one，冒出一句英文来。 */
function T(key, params) {
  const table = I18N[lang] || I18N.en;
  if (params && Number(params.n) === 1 && table[key + "_one"] !== undefined) key = key + "_one";
  let s = table[key];
  if (s === undefined) s = I18N.en[key];
  if (s === undefined) s = I18N.zh[key];
  if (s === undefined) return key;
  if (params) {
    s = s.replace(/\{(\w+)\}/g, (m, name) =>
      (params[name] === undefined || params[name] === null ? m : String(params[name])));
  }
  return s;
}

/* <html lang> 跟着走：影响浏览器的断行/字体回退，也方便无障碍工具判断语种 */
function applyLangAttr() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
}

/* 日期本地化用的 locale tag，toLocaleString 之类的地方统一走这个 */
function localeTag() { return lang === "zh" ? "zh-CN" : "en-US"; }

/* 列表连接符：中文用顿号，英文用逗号 */
function listJoin(arr) { return (arr || []).join(lang === "zh" ? "、" : ", "); }

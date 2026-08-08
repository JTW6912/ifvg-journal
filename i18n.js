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
    "lang.hint": "语言跟随账号，换设备登录后也会保持。已经建好的字段名不会被翻译——那是你自己的数据，可以在下面手动改。",

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
    "lang.hint": "Language follows your account, so it carries over to other devices. Field names you already have are left alone — they're your data, and you can rename them below.",

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

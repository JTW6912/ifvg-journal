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
   这样翻译还没补齐的地方会退回另一种语言，而不是在界面上露出一个原始 key。 */
function T(key, params) {
  const table = I18N[lang] || I18N.en;
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

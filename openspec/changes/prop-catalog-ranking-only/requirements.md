# Prop 公司计划首页精简

## Feature summary
Modern 公司计划首页只显示现有推荐排行；所有未隐藏公司默认展示，不再显示排行整体展开/收起或首页价格对比。不硬编码8家公司。

## Users and actors
普通用户浏览完整排行；管理员继续管理目录和打开公司详情；只读用户保留既有操作限制。

## In scope
- R1: modern 未选公司时只展示推荐排行（编辑模式沿用排行管理），不调用首页 renderPropCompare。
- R2: modern 排行显示所有未隐藏公司，仍按 propRankOf 排序，不受 propBoardAll 旧值影响，无 prop-board-all 按钮。
- R3: 复用现有推荐卡片、Logo、推荐语、动态、公司详情和购买入口，卡片内长文折叠不变。
- R4: classic 首页和排行输出逐字保持原样，包括价格对比、前6家与展开按钮；公司详情在两种布局都保持原样。
- R5: 空目录、全部隐藏、管理员维护入口、双语主题和响应式沿用现有行为；不修改缓存目录或持久化数据。

## Out of scope
不删除价格对比函数，不改计划数据/推荐顺序/隐藏字段，不改状态、流水、数据库或依赖。初始授权仅含规范基线和本地资源同步；用户后续明确要求“帮我推送代码吧”，已授权将本次排行及Glass兼容实现、测试和精简记录提交并推送prop-test，详见development/git-delivery.md。不得推送master、执行迁移或进行真实写入测试。

## UI design impact
仅移除首页下半区并解除排行截断；复用现有modern卡片与布局，无新配色、字号或文案。light/dark、7配色、zh/en照旧。默认语言沿用账号/本地/浏览器偏好回退en。

## Architecture/database impact
只调整 src/11e-prop-view.js 的两处render组合；无数据库结构或服务调整。

## Frontend-backend data-flow impact
目录缓存 → 原排序隐藏过滤 → 全部推荐卡片。无新请求或写入；真实应用初始化仍有既有续费副作用，同步前告知并保护未保存表单。

## Component architecture impact
复用 renderPropCatalog/renderPropBoard/propRecommendationCard/renderPropBoardAdmin/renderPropFirm；不创建或抽取新组件。classic renderer和价格比较独立实现保留。

## Decisions and approval
用户明确要求只保留推荐排行并默认全展示；2026-10-30回复“允许，并且连接到 Supabase”批准本地规范基线与同步预览。不要求新的视觉设计，采用现有已展示卡片组成。使用component-seam对照验证复用边界，而非重新设计页面。

## Glass compatibility clarification (2026-10-30)
After merging master at 9228f59, the owner reported that Glass loses the developed Prop overview and catalog and explicitly requested the same modern functionality under Glass. R6: modern here means the existing modern DOM structure, including the Glass material (`data-layout=modern` plus `data-glass`). Reuse `isModernLayout()` for structural rendering and interaction guards across the overview, month chart, company table, catalog/detail and existing administrator UI. Do not normalize `currentLayout()` in appearance persistence or in existing context-identity keys. Classic and ordinary modern behavior remain unchanged.

This is a compatibility extension to existing components, not a new design or financial/data-flow change. Additive tasks 2.1–2.3 are covered by `glass-compatibility.md`; preserve all baseline tasks and frozen A1–A4 identities. Original file-count estimates above describe the initial catalog-only slice; the explicit expanded scope is in scope.json. The compatibility request initially authorized implementation only. Later explicit requests authorized connected local-resource sync and this test-branch delivery; neither authorizes live business writes or formal acceptance approval.

## Unresolved gaps
None.

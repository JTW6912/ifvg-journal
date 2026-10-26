# Component Architecture & Reuse Spec

## Overview

本项目的组件是原生HTML字符串函数与命名空间CSS，不是React组件。所有src文件经bundle.js拼到一个全局作用域；边界依靠函数接口、命名与调用约定保持。本规范补录现有结构，并约束已批准的Prop概览扩展，不进行全项目模块化重构。

证据：AGENTS.md、PROJECT_HANDOFF.md、src/03-state.js、src/11d-prop-data.js、src/11e-prop-view.js、src/14-main-render.js、test/load.js。

## Component Taxonomy

| ID | 类型/责任 | 现有来源或扩展边界 |
| --- | --- | --- |
| CMP-APP-SHELL | 页面外壳、区域缓存、浮层收尾 | src/14-main-render.js的render/patchAppShell |
| CMP-PROP-SCOPE | 公司/分组筛选、账号与流水关联 | src/11e-prop-view.js的propScoped/propFilterChips |
| CMP-PROP-FINANCE | USD投入/到账/ROI及纯日期派生 | src/11d-prop-data.js的propSum及待新增纯范围/走势函数 |
| CMP-PROP-OVERVIEW | 页面组合与现代三分区；保留经典指标 | src/11e-prop-view.js的renderPropOverview；允许提取独立Prop概览视图文件 |
| CMP-PROP-RANGE | 日期草稿/已应用状态、快捷范围、双月日历 | 新增Prop域内UI组件；不取数/写库 |
| CMP-PROP-HELP | 六个字段的Tooltip触发/定位/关闭 | 新增Prop域内反馈组件；说明文本由视图提供 |
| CMP-APPEARANCE | 主题、字体、配色与中英词典 | src/04-helpers.js、theme-modern.css、palettes.css、i18n.js |
| CMP-PROP-FORMS | 既有账户/流水表单及草稿保护 | src/11e-prop-view.js、renderSecondaryModals；本次不重做 |

Headless hooks在此项目是普通函数/控制器，不引入React hook或provider。Domain utilities返回值，不触发页面渲染或网络。

## Cohesion Rules

纯财务计算与日期处理留在Prop领域层；视图只格式化和组合结果。日期选择器只处理日期及UI状态；Tooltip只接收触发器和已准备好的文本。数据库读写仍由既有数据层函数拥有。

存量11e文件同时包含视图与事件，允许本次把新的概览交互提取到单独文件，避免继续扩展为巨型页面模块；不借此重构无关目录、账号表单或导出功能。

## Coupling Rules

页面可依赖领域与通用T/esc/ICONS/日期格式函数。低层纯函数不得读document、Supabase、session或localStorage。浮层定位组件不得自行计算投入或调用API。

全局render拥有页面生命周期；新浮层通过明确的同步/清理接口对接，不能依赖轮询或覆盖window事件处理器。只有页面级数据边界允许读取当前筛选和身份；不能把认证对象传播到单个日期格或Tooltip。

## Shared Component Extraction Rules

同一校验、日期换算或求和规则出现两处即抽成纯函数。六个说明字段共用一个提示控制器；快捷日期与日历共用日期范围模型；金额和曲线共用同一统计结果。

只有一个业务页使用的行为先保持Prop域内，不提前建设全站组件框架。若第二个页面需要相同控件，再以不依赖Prop状态的最小接口提取共享版本；禁止复制两套不一致计算。

## Component Public API Rules

- propSum(entries)为既有财务口径真源，不能改变其pending/refund/ROI语义。
- 新范围/走势函数的输入是记录、范围与显式today，输出为新的派生对象；不修改输入数组，不执行读写。
- 新概览的组合入口可以接收propScoped的账号/流水（明确的数据边界），但图表与日期网格子函数只接收必要的派生值。
- Tooltip文本经T/esc生成，显示使用纯文本或转义markup；禁止将任意属性当成HTML执行。
- 控件事件用明确的prop命名空间和data-action，日期值使用ISO日期键，显示语言与数据键分开。

## State Ownership Rules

- Local state: 弹层引用、临时触发器、定时器必须可清理；不保存已失效DOM节点。
- Shared UI state: 账号/页面范围及日期草稿放在显式Prop状态中；确认前不更新已应用范围。
- Server/cache state: propAccounts/propEntries由loadPropData和既有写操作维护；新组件仅消费。
- Form state: 保留propModal.draft和busy守卫，不借重绘清空未保存输入。
- URL state: 无新增URL路由；导航恢复机制不改。
- Derived state: 金额、比例、曲线及阶段计数即时计算，不另存可与源数据脱节的持久副本。

## Composition Patterns

Preferred composition patterns：renderPropOverview先复用公司/分组范围，再按currentLayout选择新面板或原经典HTML；下方漏斗、月度图、公司表继续既有入口。

Forbidden composition patterns：在子组件内加载用户数据；多个组件各算不同财务口径；将浮层放进裁切容器；用stopPropagation阻断文档级click委托；新增不必要框架依赖。

Approved provider/context boundaries：没有框架provider。通过现有全局入口与明确参数传递边界。Approved headless hook patterns：可测试的纯函数加文档级事件控制器，Escape/焦点/清理都属于同一控件责任。

## File & Naming Conventions

源文件保持src数字前缀拼接规则，新增文件可使用11g-prop-overview.js等未占用名；函数/CSS/动作均采用propOverview或同等唯一前缀。新增状态声明放在03-state.js，避免顶层初始化读取尚未执行的const产生TDZ。

Test naming为test/*.test.js，按test/load.js同一VM加载真实源码。隔离浏览器mock放dev/（gitignore），不连接真实配置；生成app.js不能手改。没有ES import/export或barrel。

## Testing Expectations

- Shared component tests：日期范围边界、空范围、退款、pending、0/负投入、币值精度、走势终点与总数一致，全部用合成数据。
- Hook tests：日期草稿取消、重复选择、身份/页面切换清理，不访问真实服务。
- Integration tests：复用实际renderer与事件，验证data-action、主题切换、语言更新、portal与区域重绘；禁用16-init和网络。
- Accessibility checks：i按钮有标签与描述、可聚焦、Escape可关闭、提示可hover阅读；日期键盘和手机目标不能丢失。
- Visual/prototype review：modern浅/深及配色、自定义盈亏色、中英文、桌面/手机；经典分支markup与原有布局不变。

## Refactor Triggers

Duplicate logic detected时合并纯逻辑；Cross-boundary import/全局依赖新增时先明确所有权；接口若泄漏原始DB内部对象则退回页面边界；若控件同时取数、计算、定位则分开；若纯逻辑测试需要大量无关DOM则调整函数接口。

## Component Do's and Don'ts

- 组件保持单一责任、事件与状态可追踪，复用现有格式化和转义函数。
- 日期与金融计算不写在长HTML模板里；render不启动后台任务。
- 经典布局不受现代新CSS选择器影响。
- 不把预览的固定日期、用户金额、主题测试开关或样例覆盖范围复制进生产行为。

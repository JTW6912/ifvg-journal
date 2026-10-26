# Requirements: prop-overview-range-panel

## Summary

将用户最终确认的资金回报主面板落地到prop-test的现代布局：净收益+ROI+区间累计走势、同刻度投入/到账条、当前账号阶段分布。右上日期范围统一控制本面板财务数据，各字段旁独立i提示。用户已明确允许开发，并另行允许仅规范/任务的本地基线提交。

## Users & Actors

- 已登录普通用户和管理员查看自己的Prop账本；管理员在此没有额外个人数据读取能力。
- 用户在既有公司/分组范围内查看资金结果；账本记录和目录管理操作不属于本次改动。

## In Scope

- R1：仅modern替换顶部五指标；保留原页面其他区域和classic输出。
- R2：默认全部时间；自定义、全部时间、最近7天、最近30天、本月、上月。相对日期以用户本地今天为锚点，首尾日期均包含；最近7天含今天共7个日期，本月截至今天。
- R3：保持propSum口径：费用减退款为投入，非pending出金为到账，净收益为到账减投入；投入大于0时才有ROI。
- R4：累计阶梯走势从区间0起算，按收支day汇总，末点与主金额一致；全部时间使用完整已加载流水，不沿用原型缺少历史明细的限制。
- R5：无有效收支时显示零/空态和不适用ROI。退款超过费用时保留负投入，不能强制归零；条形关系不能越界或把退款收益误作到账。无可定位日期的实际收支不能捏造曲线。
- R6：当前账号数与eval/passed/funded分布只受公司/分组范围影响，不随日期伪装成历史状态。
- R7：日期控件为快捷侧栏+桌面双月/手机单月；两次选日后应用，可反向选择；取消未完成草稿不改变已应用结果，支持键盘和焦点返回。
- R8：净收益、投入、到账、ROI、走势、当前账号状态各有i提示；支持hover、focus、Escape和手机点击，不恢复集中说明菜单。
- R9：继承7配色、明暗、自定义盈亏色；新增中英文案完整，金额不截断。
- R10：新范围/浮层是本地UI状态；换页、布局、身份和区域重绘不能留下失效提示、日期浮层或前一账号的范围。

自定义选择是对既有账本day的过滤，不新设账本日期业务限制；合法日期可显示空范围。示例数据的日期上限不是产品规则。下方月度图已有独立年份/月选择，本次不与新面板日期耦合。

## Out of Scope

不改目录、账户表单、状态流转、续费、下方漏斗/月度图/公司表或交易统计。不迁移框架，不新增服务，不改变持久化结构或授权模型。不登录真实账号做业务测试，不写远端数据，不发布或推送。

## UI Design Impact

Foundation: openspec/specs/ui-design/design.md。沿用用户批准的三分区、可读字号、线性标题图标、字段i、shadcn式组件边界。预览专用主题控制和离线样例不能进入产品。

## Theme & Locale Capability Impact

Theme support: light-dark；复用既有开关。Internationalization: enabled。Supported locales: zh,en；Default locale: en回退，保留浏览器检测和账号/本机偏好优先级。原型与离线验证覆盖两种语言、明暗、7配色和自定义盈亏色。

## Architecture & Database Impact

Foundation: openspec/specs/system-architecture/design.md。从既有propScoped缓存派生，不增加取数请求，不调用业务写入方法。保留既有USD与用户隔离规则。

## Frontend-Backend Data Flow Impact

Foundation: openspec/specs/frontend-backend-data-flow/design.md。涉及FLOW-PROP-SCOPE、FLOW-PROP-OVERVIEW、FLOW-PROP-HELP、FLOW-APPEARANCE；其他流程不改。新控件不能触发loadPropData或自动续费。

## Component Architecture Impact

Foundation: openspec/specs/component-architecture/design.md。复用propSum/propScoped/格式化/T/esc及区域渲染；提取Prop域内范围/走势纯函数、现代面板、日期控制器和单一Tooltip控制器，避免复制财务算法或为每个字段重复监听器。

## Unresolved Gaps

无待用户决定的产品问题。布局与交互授权来自此前连续确认及“可以开始开发”；本地规范/任务提交另获“允许”。边界状态的实现不得更改既有财务口径。

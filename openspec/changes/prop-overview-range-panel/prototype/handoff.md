# Prototype Handoff: prop-overview-range-panel

## Approved Branch Variant

- Branch: ui-html.
- Variant: approved-panel.
- Approval basis: 用户在最终字段i提示预览后明确表示“可以了我觉得可以开始开发了”；随后对仅规范/任务的本地基线提交明确回复“允许”。不是从测试结果或沉默推断许可。
- 原批准对象是三分区组件及其交互。此登记版保留该组件，将私人金额替换为合成fixture，并用真实renderer生成应用外壳、补充中英/状态审阅。未声称用户另行审阅过这些工程验证截图。
- 原型验证已通过；不代表生产实现已完成。promotion必须经过development entry。

## Screens Or Flows

IFVG现代Prop总览顶部；日期范围、字段说明与主题/语言呈现。既有导航、记录购买和其他页内容只作真实外壳参照，不在原型中执行业务操作。

## Components To Create

Prop现代资金面板、独立日期范围控制器、单个字段说明控制器、稀疏按日累计走势的展示接口。

## Components To Reuse

propScoped、propSum、propUsd/propPct、T/localeTag/esc、现有主题变量及render/patchAppShell生命周期。账号阶段使用既有PROP_ACTIVE和status枚举。

## Extraction Targets

日期规范化/快捷范围与财务范围统计放纯领域函数；展示与浮层控制保持Prop域内单一职责。六个字段共用一个Tooltip控制器，不复制财务算法。

## API Contracts

没有新增请求或服务；概览交互只消费已加载的当前用户缓存。不得调用loadPropData、自动续费或任何保存方法。

## Data Flows

FLOW-PROP-SCOPE → FLOW-PROP-OVERVIEW；FLOW-PROP-HELP独立于财务计算；FLOW-APPEARANCE沿用现有主题和语言通道。当前账号阶段不受财务日期影响。

## State Behavior

- Loading: 概览筛选为同步派生，不引入局部异步加载；现有全应用加载不变。
- Empty: 已验证合成空收支显示0、ROI不适用、空走势；生产还需保留无账号的现有入口。
- Error: 已查看离线错误提示；生产沿用现有错误通道，不掩盖失败。
- Disabled: 已验证日期触发器禁用与不可用日期样式；fixture日期覆盖不能变成生产限制。
- Permission: 无新增特权操作；原型是普通owner的合成身份，现有认证/禁用页面不改。
- Populated: 六个字段说明、全周期及区间走势、账号阶段在真实项目外壳内可见。

## Theme And Locale Policy

- Theme support: light-dark，继承7配色与自定义盈亏色。
- Theme modes shown in prototype: light、dark；关键状态已由浏览器检查。
- Theme toggle: 既有外壳开关可用于预览，另有仅审阅用的控件；不得复制调试控件进生产面板。
- Internationalization: enabled。
- Locales shown in prototype: zh、en，en为回退，生产保留现有偏好/浏览器检测。
- Locale switcher: 原型审阅控件存在；生产继续现有语言入口，不新增面板语言菜单。

## Out Of Scope Items

经典布局、下方漏斗/月度图/公司表、目录管理、账号编辑、状态流转、续费及持久化结构不改。不连接真实账本验证，不提交业务源码或推送。

## Required Tests

纯日期和金融边界、精确末点、退款/pending/负投入、无有效日期、长区间、不可变输入；classic基线；六提示、日期键盘/取消/反选与身份/重绘清理；7配色、中英、移动布局；禁止联网的实际源码mock；全量离线测试和打包检查；独立规格/质量审阅。

## Open Risks

原型的逐日循环、样例覆盖、DOM语言适配和局部节点更新仅供审阅，不能原样用于生产。生产要用真实日期与稀疏走势、T()、既有区域重绘。退费超过费用的关系条、大金额、异常数据与上下文切换仍需生产代码测试；本原型不替代这些验证。

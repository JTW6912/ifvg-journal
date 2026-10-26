# Frontend-Backend Data Flow Spec

## Overview

现有应用是浏览器直接访问Supabase。此文档明确已存在的读写路径，以及用户批准的新Prop概览如何只消费现有缓存。新增范围与说明交互尚待实现，不把预览完成误写成生产完成。

依据：src/01-config.js、src/07-data-layer.js、src/07b-accounts.js、src/11d-prop-data.js、src/11e-prop-view.js、src/14-main-render.js、src/16-init.js、test/load.js及PROJECT_HANDOFF.md。

## Flow Index

| Flow ID | Trigger | Entry UI | API/Service | Persistence | User Result |
| --- | --- | --- | --- | --- | --- |
| FLOW-AUTH-LOAD | 登录/恢复会话 | 原登录入口 | Auth→loadProfile→loadAll | 原业务表；touch/续费有既有副作用 | 账号数据与导航 |
| FLOW-PROP-LOAD | loadAll | Prop域缓存 | loadPropData、fetchAllRows | 读目录与本人账号/流水，可能补记月费 | propError或已加载Prop视图 |
| FLOW-PROP-SCOPE | 公司/分组选择 | propFilterChips | propScoped，无新增请求 | 无 | 当前公司/分组账号和流水 |
| FLOW-PROP-OVERVIEW | 总览/日期范围选择 | 现代资金概览（已批准扩展） | 纯范围/汇总/走势派生函数 | 无 | 同区间金额、ROI和曲线 |
| FLOW-PROP-HELP | hover/focus/tap | 字段旁i提示（已批准扩展） | 纯UI说明 | 无 | 当前字段解释 |
| FLOW-PROP-EDIT | 记录购买/记账/改状态 | 原Prop表单 | propSaveAccount/propSaveEntries等 | owner账本写入 | 成功更新本地或报错 |
| FLOW-APPEARANCE | 主题/配色/语言操作 | 现有账户菜单 | 原偏好同步通道 | 既有本机/账号偏好 | 主题与语言一致 |

## Boundary Contracts

- UI event contract: 事件委托，通过data-action和稳定属性表达用户意图；不得用容器stopPropagation截断子按钮。
- Client state contract: src/03-state.js拥有共享状态；视图只组合领域结果。新日期范围为纯UI状态，不能覆盖propYear/propMonth、账户状态或交易筛选。
- Request schema: Prop读请求按当前授权user_id，排序带id兜底；写入仍走既有row转换和守卫。本次日期/说明动作请求数为零。
- Response schema: Supabase data/error/count经fetchAllRows聚合；loadPropData映射目录行并规范化events数组。
- Error schema: 使用现有error.message并经noteDbError识别旧库；进入propError/loadError，展示时esc，不把原始HTML注入页面。
- Permission contract: owner RLS，前端readOnly仅为体验守卫；不新增admin读取私人记录的路径。

## State Ownership

- URL state: 当前没有业务URL路由；导航由tab/propView及sessionStorage恢复。
- Local component state: 日期选择草稿、已应用范围、悬停日、弹层开闭、Tooltip触发器/定时器；不得持久化用户金额或DOM节点快照。
- Shared client cache: propAccounts/propEntries/公共目录由数据层更新；本次不改动原数组以执行过滤。
- Server state: 会话、数据库行和原有写入结果。
- Database state: 私有表以owner身份隔离，状态事件/收支日期来自既有字段。
- Derived state: 概览金额、ROI、走势图和条形比例从同一批公司/分组及日期过滤后的流水产生；账号分布仅按当前status，不回放历史。

## Validation Ownership

- Client-side validation: 日期必须是有效的日期键；日期范围规范化与金融求和是纯逻辑，UI只展示结果。文案和属性经过esc。
- Server-side validation: 既有Supabase Auth/RLS/RPC，不为筛选新增服务。
- Database constraints: prop_entries.amount非负numeric(12,2)、day非空date、账号FK；具体以迁移为准。
- Cross-field or cross-entity rules: 出金pending不算到账；退款冲减投入；ROI只在投入大于0时计算；曲线末点必须匹配主净收益。
- Error copy source: i18n.js的zh/en键。缺翻译不能通过硬编码中文绕过。

## Error & Empty States

无账号沿用原propEmpty入口；公司/分组或日期范围没有有效收支时明确显示零/空走势，ROI为“—”，不能把空态绘成盈利。对缺日期或非法值不能捏造时间点，亦不得把缺少数据当作零。

Permission denied与Network/Server error沿用原加载/保存反馈。Schema错误显示dbOutdated，不静默摘列或降级。新组件不能因为一次渲染或范围改变吞掉原错误横幅。Conflict/stale data：异步数据或身份改变后关闭过期UI浮层，派生视图不得继续引用已移除的DOM触发器或上一个账号的选择状态。

## Loading / Optimistic / Retry Behavior

Initial loading由authLoading/loadAll控制；Partial loading和propError沿用现有行为。新概览不自建加载请求，因此没有乐观写入、请求重试或服务取消。范围第二次选日确认前只改草稿，取消保留已应用结果。

原业务写入仍由成功返回更新本地缓存，不在新组件重试。Cancellation rule：Escape/点外部关闭浮层，换页、布局或身份后清理失效触发器。Idempotency rule：同一范围重复选择只产生相同派生结果，不新增流水或修改会话。

## End-to-End Flow Details

### FLOW-PROP-LOAD（现有流程）
1. 用户完成认证，bootstrapAuth/loadAll进入加载。
2. 状态进入加载/错误反馈，读取当时授权的uid。
3. Request payload为目录select和带user_id的账号/流水查询，经过fetchAllRows分页。
4. Backend validation由Auth和RLS执行。
5. Database read返回当前用户数据；现有propApplyRenewals可能按确定ID补月费并移动水位。
6. Response payload映射为propFirms/propPlans/propAccounts/propEntries。
7. render()经renderProp→renderPropOverview显示。
8. Retry/idempotency：原读错误显示；续费ID为账号+日期，不由新UI触发重试。
9. Rollback：不在本次修改旧写入流程；错误必须可见。
10. Logging/metrics/audit event：沿用现有错误处理，不新增用户数据日志。

### FLOW-PROP-OVERVIEW（已批准扩展）
1. 用户打开现代总览，或选择统一的财务日期范围。
2. 选择草稿由日期组件拥有；确认后写入本地已应用范围。
3. Request payload：无。直接读取propScoped返回的账号/流水。
4. Backend validation：不涉及新增请求；不改变已加载数据的权限归属。
5. Database read/write：无。
6. Response payload：纯函数返回同口径的spent/received/net/roi、按日累计点与当前阶段计数。
7. UI render：三分区、同刻度条形图、区间/累计标题、字段Tooltip；classic继续旧五指标markup。
8. Retry/idempotency：同样输入结果一致，无自动续费、保存或刷新全表。
9. Rollback：未完成选择不改已应用范围；空/异常派生状态有明确展示，不保留不匹配的曲线。
10. Logging/metrics/audit event：不记录私人金额，不增加远端统计事件。

### FLOW-PROP-HELP（已批准扩展）
1. 用户hover、键盘聚焦或点击字段i图标。
2. 仅一个提示显示，与触发器建立aria-describedby关联。
3. Request payload、Database read/write：均无。
4. Content来自T()和明确口径，使用文本/转义输出，不读取任意HTML。
5. Escape/离开/切换范围或页面时关闭或重新定位，不影响日期选择与原表单。
6. Logging、retry、rollback：无远端行为，清理本地定时器与DOM关联即可。

## Async / Realtime Flows

Queue/event source仅既有认证事件、保存响应和用户操作；无新增Realtime订阅、队列或dead-letter机制。Subscriber为已有应用渲染器。Consistency expectation是单次派生使用同一批流水和同一日期范围，异步渲染不能让数字与曲线来自不同快照。

账号切换会整页刷新（src/07b-accounts.js），普通退出/重新登录也必须让新增范围和浮层按当前身份重置。真实bootstrap会触发读写，故UI验证必须排除16-init并使用合成数据、空配置/假client及禁止联网的本地页面。

## Flow Do's and Don'ts

- 所有新需求关联上述FLOW标识；不要新建一条隐藏财务口径。
- 保留公司/分组筛选；新日期只控制资金概览，不修改原月度图/漏斗/公司表或交易页筛选。
- 不在render或Tooltip里调用loadAll/loadPropData/propApplyRenewals。
- 不以缺少日期/请求失败为理由编造走势；不对真实数据做测试写入。

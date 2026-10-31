# Modern / Glass 侧栏

## 范围与设计

参考 shadcn/ui Base Sidebar 的组合结构与交互，不安装 React、Base UI 或 Tailwind：
https://ui.shadcn.com/docs/components/base/sidebar

保留现有 Glass 材质、主题与配色；modern / Glass 共用导航结构，classic 保留原头栏与页签。用户已批准提交并发布到 `prop-test` 测试站，使用站点既有 Supabase 配置；不改 master，不需要数据库迁移。实际部署状态以对应提交的 Vercel 回执为准。

### 桌面

- 布局列宽展开 248px、收起 72px；Glass 原有外边距会使可见面板宽度略小。
- 没有手动偏好时，900–1199px 默认图标栏，1200px 起默认展开；手动选择优先于这个默认规则。
- 品牌与折叠按钮在顶部，导航区独立滚动；底部保留可收起的交易摘要及统一账号入口。
- 菜单分组、顺序和管理权限由原有 TABS 产生。不搬迁 Prop 页内子导航，不新增工作区/付费功能。
- 收起后的菜单支持鼠标与键盘焦点 Tooltip；当前页有 aria-current。
- 账号、外观、配色与账号切换复用原菜单和原处理器，弹层挂到独立根，按视口避让。

### 手机 / 窄屏（<900px）

- Glass 保留底部 Dock：记录、分析、Prop、更多。更多打开包含全部现有入口的导航抽屉；非快捷入口页面会让更多显示选中态。
- modern 使用页头菜单按钮打开同一抽屉。
- 抽屉打开后锁定背景滚动并设置背景 inert，头尾保持可见，只有菜单中间滚动。
- Tab 在抽屉内循环；账号弹层打开后在弹层内循环，避免焦点落到被覆盖的按钮。Escape 先关账号弹层，再关抽屉，并恢复触发器焦点。
- 选中导航后沿原 switch-tab 路径切页；桌面标题隐藏时将焦点交给正文。
- 桌面偏好与手机临时打开状态分离；手机打开状态不会持久化。

## 实现与边界

- `src/03-state.js`：侧栏 UI 状态。
- `src/04c-app-sidebar.js`：渲染、折叠、本机偏好、移动抽屉、账号弹层、焦点与清理。
- `src/14-main-render.js`：共享账号菜单、导航区域接线及渲染前后生命周期。
- `src/15-events.js`：modern / Glass 账号菜单开关仅更新弹层，不重建正文；classic 沿用原行为。
- `src/16-init.js`：身份变化时立即清理侧栏私有摘要、弹层与延迟焦点。
- `src/04b-liquid-glass.js`：选中动画只使用可见的 active 项，避免隐藏的桌面/Dock 副本干扰。
- `theme-modern.css`：限定 modern/Glass 的新样式，含 reduced-motion / reduced-transparency 与粗指针目标尺寸。
- `i18n.js`：新增文案均有 zh/en。

本机键：`journal_sidebar`（expanded / collapsed）、`journal_sidebar_summary`（open / closed）。没有向 profiles.ui_prefs 添加字段，不触发新的数据库同步。用户主动选择原有主题/配色时，仍走已有偏好同步逻辑。

折叠、摘要切换和账号菜单开关不调用全局 render，避免重建正在填写的正文。其他正常重绘保留导航滚动位置与焦点；内容尺寸变化时允许浏览器将滚动位置钳制到新的范围。

移动导航捕获处理器注册在公司编辑器守卫之前，只释放抽屉和背景 inert，不阻断原事件。未保存草稿仍由原守卫决定是否允许离开。延迟焦点使用事件分发后的定时回调，并绑定身份代次；不覆盖原有 Ctrl/Cmd+B 加粗快捷键。

没有新增业务请求、数据库对象、权限或管理员读取个人数据入口。账号动作仍是原流程，不通过 DOM 操作绕过认证。

## 验证

- 基线 352 项 + 22 项新增侧栏回归 = **374 项测试通过**。
- 39 个源文件 bundle、app.js / i18n.js 语法、git diff --check 通过。
- classic 头栏与导航的规范化 HTML 哈希与改动前一致；原 modern/classic Prop 屏幕哈希回归保持通过。
- 离线浏览器覆盖 1440、1050、390、320 宽度，以及 600/640px 短视口。
- 已核验手动折叠覆盖中等宽度默认、键盘 Tooltip、底部账号弹层边界、独立滚动、摘要切换、移动背景锁定/释放、Tab/Escape、切页焦点、中英与明暗、普通用户不出现管理入口。
- 公司说明输入框在折叠/打开账号菜单后保持同一个 DOM；全局 render 后文本和选区仍保留，恢复原文后草稿恢复干净；检查期间没有业务保存。
- 未保存导航确认的捕获顺序与状态由单测验证，没有让浏览器自动批准丢弃确认。

## 本地预览与限制

`http://localhost:8765/dev/mock.html?scenario=integration&layout=glass`

预览是 ignored dev 目录中的合成数据，未加载生产配置/SDK，CSP 禁止 API 网络连接。顶栏可切换 classic / modern / Glass、中英与明暗。需要重新启动时：

```bash
npm run bundle
python3 dev/serve.py 8765
```

截图与检查日志保存在 ignored `dev/`，不提交模拟目录、参考品牌图标或私人截图。

视口测试不是物理触屏测试，也不等于全浏览器/完整可访问性认证。未执行真实登录、账号切换或线上业务试写。classic 在 320px 下原有的头栏横向溢出保持原状；本次没有借侧栏改造修改经典布局。

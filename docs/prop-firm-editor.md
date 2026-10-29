# 公司独立编辑页与共享选项图标

## 范围

- `prop-test` 分支，原生 JavaScript 拼接架构；不新增前端框架或运行时依赖。
- modern 布局的「编辑公司」进入站内独立编辑页。classic 保留原来的公司弹窗，价格比较和个人 Prop 账本不改。
- 公司名、官网、Logo、评级、隐藏状态、四组多选、推荐语、优惠、近期更新、魔法政策和说明沿用原有字段。未参与表单编辑的公司字段，以及优惠对象的其它键保留。
- `src/11j-prop-option-icons.js` 负责共享图标；`src/11k-prop-firm-editor.js` 负责独立编辑页。

## 使用

1. 公司计划 → 编辑目录 → 某公司的编辑按钮；详情中的近期更新编辑入口直接打开对应分区。
2. 在「选项与图标」中搜索、勾选或添加自定义项。勾选只改变当前公司的草稿。
3. 选项旁的铅笔打开共享图标设置：默认、内置通用图标、图片链接、仅文字。
4. 点击「应用到草稿」，再点击顶部「保存更改」。公司与本次共享图标改动在一个事务中发布。
5. 同一字段中，同名选项的图标对全部公司生效，不修改其它公司的勾选结果。内置库与图片链接不是图片上传服务。

## 草稿与渲染

- 独立状态 `propFirmEditor`，不借用其它弹窗的 `propModal`。
- `#propFirmEditorMount` 是由编辑器拥有的子渲染根。`patchAppShell` 在外壳不变时不重建它；输入只定点更新预览、计数和保存状态。
- 分区切换不重建表单；切语言从草稿恢复控件。搜索、折叠和预览开关属于界面状态，不算待发布数据。
- 未添加的自定义输入、未应用的图标设置也计入未保存状态。保存前要求先添加/应用或取消，避免静默丢失。
- 切页签、切公司、切账号、退出登录等导航有离开提醒；刷新/关闭使用浏览器 `beforeunload` 保护。明确放弃才执行待定导航。
- 草稿仅在内存中；如果用户在浏览器刷新提示中选择离开，草稿不会在刷新后自动恢复。
- 保存失败保留草稿，不把未确认保存的公司或图标当作已发布。保存成功留在编辑页。
- 保存中禁用编辑和离开入口。账号或管理权限变化后清除编辑器状态，防止不同账号沿用草稿。

## 存储及权限

新增公共目录表 `public.prop_option_icons`：

| 列 | 用途 |
| --- | --- |
| `id` | `field + ':' + option_key`，主键 |
| `field` | `platforms` / `payoutMethods` / `kycRequirements` / `paymentMethods` |
| `option_key` | 去首尾空格、小写后的匹配名；已知中英显示名映射到同一预置项 |
| `label` | 对应选项的文字；不重写公司的原始数组值 |
| `kind` | `default` / `none` / `builtin` / `url` |
| `value` | 内置图标 ID 或图片链接；默认/仅文字时为空 |
| `revision` | 图标配置的乐观并发版本 |
| `updated_at` | 更新时间 |

- 认证用户可读；只有活跃管理员可写。
- 不添加管理员读取交易、复盘、个人 Prop 账号或流水的权限。
- `prop_save_firm_with_icons(firm, icon_changes)` 是 `security invoker`，仍受 RLS 限制。
- 图标改动按键加事务锁，并检查 `expected_revision`；冲突会回滚整笔事务。UI 可刷新共享图标，明确清除图标草稿，但保留公司草稿。
- 新公司使用 `create_only`，并发占用同一 ID 时拒绝覆盖。
- 公司正文沿用既有编辑语义，不是多人协同编辑器；图标版本保护不等于为全部公司字段提供协作合并。

## 图标安全与素材边界

- 内置图标是代码中的固定通用 SVG，使用 `currentColor`，不接受用户粘贴 SVG/HTML。
- 图片链接只允许公开 HTTPS 域名或 `/img/prop/`、`/img/prop-options/` 下的静态图片路径。拒绝脚本、data URI、凭证、IP/常见本机域名和非标准端口。
- 不在服务器获取或代理图片；浏览器用 `<img referrerpolicy="no-referrer">` 加载。图像失效时隐藏装饰，选项文字和勾选值保留。
- 图片 URL 属于公共目录，所有登录用户可见。不要填私密截图或签名凭证链接。
- 品牌图像不强制变色/变形；标签底色继续使用项目主题。没有核实的品牌资产时，生产代码默认显示文字，不伪造官方 Logo。
- 用户开发包的品牌重绘和文字占位仅用于本地排版预览：文件位于被 Git 忽略的 `dev/prop-icons-preview/`，本地服务器映射到 `/img/prop-options/preview/`。它们不是生产资源，不随项目部署。
- 本地预览明确标注「非官方参考稿/文字占位」。不应把预览目录 JSON 当真实目录导入。

## 导入/导出

完整目录导出增加可选的 `optionIcons` 数组，条目包含 `id/field/option_key/label/kind/value`，不导出运行时 `revision`。

```json
{
  "firms": [],
  "plans": [],
  "optionIcons": [
    { "id": "platforms:custom terminal", "field": "platforms", "option_key": "custom terminal", "label": "Custom terminal", "kind": "builtin", "value": "monitor" }
  ]
}
```

`prop_import_catalog_with_icons` 在同一事务中调用现有目录导入和图标合并：

- 公司/计划仍是整份替换，继续警告会覆盖手改资料。
- 附带的共享图标按键合并覆盖，不删除其它共享图标。
- 老 JSON 没有 `optionIcons` 时保留全部共享图标，不做缺表降级。
- `kind: "default"` 恢复默认显示，`kind: "none"` 明确仅显示文字。

## 迁移与发布

先由项目作者在目标 Supabase 库运行：

`supabase/migrations/20261028000000_prop_option_icons.sql`

文件幂等，创建公共表及三个受限函数；不会初始化或更新任何真实公司选项，不会修改个人数据权限。前端不做缺表/缺函数自愈。迁移必须在部署新代码之前完成。

线上迁移、推送和部署需单独确认；下述本地验证不会连接线上库。

## 验证

常规测试继续零依赖：

```bash
npm test
npm run bundle
node --check app.js
node --check i18n.js
git diff --check
```

可选的真实 Postgres/WASM 检查在纯内存中执行，绝不读取生产配置或连接串：

```bash
npm install --prefix /tmp/ifvg-pg-validation --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.12
PGLITE_MODULE=/tmp/ifvg-pg-validation/node_modules/@electric-sql/pglite node test/prop-option-icons.pg.cjs
```

覆盖重复迁移、认证读权限、普通用户/禁用管理员/匿名写入阻断、个人账户隔离、图标/公司任一步失败回滚、图标冲突、新公司 ID 冲突、旧导入保留配置、合并导入及恶意链接拒绝。

浏览器在 `dev/mock.html` 的内存 Supabase 上验证。其 CSP 禁止 API 网络请求和外部图片；本地图片加载验证不等于已验证所有外部 HTTPS 图床的可用性。手机宽度验证不等于真实触屏设备测试。

## 推荐语、优惠卡与更新的展示配置

新增实现：`src/11l-prop-presentation.js`（校验/渲染/复制边界）与 `src/11m-prop-presentation-editor.js`（编辑控件）。新增控件用于 modern 独立编辑页；classic 原有字段保存时会保留这些配置。

- 推荐语和优惠说明支持 `[[icon:star]]` 等固定图标标记，工具栏可直接插入；不会替换掉已经选中的文字。不接受用户 SVG/HTML。
- `keySentence: { text, icon, style }` 对应界面的「重点提示」，最多 800 字符；排行宽屏中位于左侧，推荐正文在右侧，窄屏上下排列。不随推荐语折叠；清空内容会隐藏重点提示列，正文占满。内部字段名保持不变，以兼容已有配置。
- `promo` 保留 `discount/text`，新增可选 `icon/hot/code/url/buttonText/style`。优惠码最多 100 字符；按钮文字最多 80 字符；URL 必须是安全公开 HTTPS。未填代码/链接时不显示对应控件，不推测实际优惠信息。
- `recentUpdates[].style` 控制整条更新卡片。
- `recentUpdates[].callouts` 是局部强调框数组，最多 20 个。每个框为 `{ id, text, icon, style }`，在正文独占一行的 `[[box:ID]]` 位置显示。各框可有不同配色。
- 选中正文后插入强调框，会把选中文字移入框。移除框会将内容放回正文，孤立框内容也不会直接丢弃。框标记缺失、重复、嵌套或无法对应时拒绝保存。排行限制摘要高度；详情和编辑预览显示完整内容。
- `updatesPreviewCount` 按公司保存，可为整数 `1–5` 或字符串 `"all"`。旧记录缺省/空值按 `1` 展示，非法配置拒绝导入或保存。编辑页「近期更新 → 排行默认显示条数」可调整；它只改变排行展示数量，不删除历史，详情仍显示全部。

`style` 格式：

```json
{ "preset": "custom", "border": "#d7a441", "fill": "#fff0ce", "button": "#9c6719" }
```

- 预设：`theme/gold/sky/violet/mint/rose/custom`。颜色只接受六位 HEX；`button` 仅优惠卡控件使用。未配置时跟随主题。
- 配色以柔和的透明渐变和背景模糊呈现，文字仍使用可读的主题前景色。按钮根据颜色自动选择深/浅文字。嵌套框不继承外框自定义配色。
- 所有新配置仍在公司 JSONB 中；本轮没有新增数据库迁移。部署仍需要前述共享图标迁移中的保存 RPC。

### 复制限制

仅推荐/重点提示/优惠/更新的展示内容使用禁止选中与复制/剪切拦截，不影响编辑框、其他模块及正常链接操作。整个优惠码虚线区域是一个原生按钮：文字、图标、空白处均可点击，Enter/Space 也可触发。只有一个复制事件处理入口，不嵌套按钮，优惠跳转链接在区域之外。Clipboard API 只复制当前码；失败时显示失败反馈，不虚报成功。

这不是 DRM，也不是权限隔离：不能阻止截图、OCR、开发者工具、接口读取或关闭脚本。没有禁止整个网站右键，也没有隐藏无障碍文本。浏览器测试对剪贴板使用测试桩，没有读取或覆盖系统剪贴板。

离线示例中的优惠码、链接和配色仅用于预览，不是实际活动，也不应导入生产目录。

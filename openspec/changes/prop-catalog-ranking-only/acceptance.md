# Acceptance

- A1: modern公司计划首页只含完整推荐排行，隐藏公司仍排除，无价格对比面板及排行整体收起按钮；验证0/1/6/8/12家及旧展开状态。
- A2: 排序与现有卡片内容、长文折叠、公司详情跳转不变；点击第8家可进入详情并返回完整列表。
- A3: classic的折叠/展开首页与中英文输出保持相同；公司详情计划卡片、购买、比较和管理员维护入口保留。
- A4: 不改目录/账号/流水，不新增远端操作；空态/双语/主题/桌面手机可用，测试、打包、语法及差异检查通过。

生产正式审阅和验收回执尚未完成；assertions初始为failing，离线检查不冒充正式发布放行。

## Glass compatibility regression supplement
Frozen A1–A4 stay unchanged. Their modern structural presentation also applies to Glass after the owner's 2026-10-30 clarification. Additional compatibility evidence (not a new formal acceptance receipt):
- G1: Glass and modern produce the same Prop overview, account filters, catalog and firm-detail content from identical synthetic inputs; classic snapshots stay unchanged.
- G2: Glass date/help, monthly lines, company sorting, funnel/detail/history navigation and admin editor entry use the same existing handlers and permission/busy guards.
- G3: Switching modern↔Glass preserves applied financial range, month-line toggle and company sort; leaving modern structure or changing owner still resets local state. Existing context-bound modal invalidation is unchanged.
- G4: Stored appearance still distinguishes glass from modern; no business writes, new requests, stylesheet redesign or changes to financial calculations. Offline desktop/mobile checks cover both themes and locales.

# Development Basis: prop-overview-range-panel

## Requirements Reference

- openspec/changes/prop-overview-range-panel/requirements.md
- openspec/changes/prop-overview-range-panel/acceptance.md
- openspec/changes/prop-overview-range-panel/spec-map.json
- openspec/changes/prop-overview-range-panel/component-impact-map.json

requirements-contract已返回ok:true；这是已批准设计的实现，不再重新讨论已确认的布局。

## Prototype Reference

- openspec/changes/prop-overview-range-panel/prototype/prototype-manifest.json
- openspec/changes/prop-overview-range-panel/prototype/artifact/index.html
- openspec/changes/prop-overview-range-panel/prototype/verifier-report.json
- openspec/changes/prop-overview-range-panel/prototype/decision.json
- openspec/changes/prop-overview-range-panel/prototype/handoff.md

prototype-contract已返回ok:true。approved-panel源自用户明确批准的最后设计；新增交接外壳与fixture不包含私人数据，不能直接作为业务实现复制。

## Handoff Reference

采用上述prototype/handoff.md，并受openspec/changes/prop-overview-range-panel/scope.json约束。生产编辑仍须development-contract --mode entry返回ok:true。

## Baseline And Task Ownership

Git HEAD基线6342a805f62faf716cc5a342474e7696826a092d已经跟踪tasks.md。用户明确授权这笔仅规范/任务的本地提交，没有推送。1.1–1.4四项保留不删改编号，统一归001-prop-overview任务；当前均未完成。

## Foundation References

- openspec/specs/ui-design/design.md
- openspec/specs/system-architecture/design.md
- openspec/specs/frontend-backend-data-flow/design.md
- openspec/specs/component-architecture/design.md

## Component Architecture Constraint

遵守openspec/specs/component-architecture/design.md：纯统计不依赖DOM/存储/网络，UI控制不计算另一套财务口径，复用原作用域/转义/主题/渲染接口。明确禁止直接复制fixture、语言DOM适配器、样例日期上限或直接修改应用区域的原型代码。

## Validation Boundary

只用合成离线数据；不连接实际账户，不改远端数据。新增功能通过实际源码mock、节点测试和独立审阅后再汇报，不以原型验证代替业务实现验证。

# Development Basis: prop-overview-linkage

## Requirements Reference

- openspec/changes/prop-overview-linkage/requirements.md
- openspec/changes/prop-overview-linkage/acceptance.md
- openspec/changes/prop-overview-linkage/acceptance.json
- openspec/changes/prop-overview-linkage/spec-map.json
- openspec/changes/prop-overview-linkage/component-impact-map.json

The requirements contract returned ok:true. Requirements use inclusive recorded dates, unique stage accounts and chronological cohort conversion. No unresolved design approval remains.

## Prototype Reference

- openspec/changes/prop-overview-linkage/prototype/prototype-manifest.json
- openspec/changes/prop-overview-linkage/prototype/artifact/index.html
- openspec/changes/prop-overview-linkage/prototype/verifier-report.json
- openspec/changes/prop-overview-linkage/prototype/decision.json
- openspec/changes/prop-overview-linkage/prototype/handoff.md

The prototype contract returned ok:true with direct isolated browser evidence and the user's explicit horizontal-funnel approval. This is not implementation acceptance.

## Handoff Reference

Consume openspec/changes/prop-overview-linkage/prototype/handoff.md under openspec/changes/prop-overview-linkage/scope.json. Reimplement fixture logic against real cached accounts/entries; do not copy fixture identities, preview controls or shell snapshots.

## Baseline And Task Ownership

Git HEAD 108a83536c6799a3fd9870720c26ae1524eeccda tracks the four unchanged checklist IDs in tasks.md. The user authorized only this ten-file specification/task commit, not business code. Task 001-prop-linkage owns 1.1–1.4; all remain pending at entry.

The earlier financial-panel implementation is an explicitly uncommitted worktree dependency. Its original change and frozen assertions are preserved. Capture allowed source hashes/copies before edits so review can distinguish this incremental work from the earlier uncommitted implementation. This snapshot is not a Git checkpoint or review approval.

## Foundation References

- openspec/specs/ui-design/design.md
- openspec/specs/system-architecture/design.md
- openspec/specs/frontend-backend-data-flow/design.md
- openspec/specs/component-architecture/design.md

Historical top-panel-only scope belongs to the preceding change; the approved follow-up design explicitly extends lower reports and local drill-downs without changing architecture or existing data ownership.

## Component Architecture Constraint

Keep domain functions pure in 11d and a single focused new linkage renderer/controller in 11h. Reuse 11e's account detail and modal seam, 11g's date/cleanup hooks, current theme/locale/escaping, and the existing My Accounts filter. No global shared state/render/event edit is currently allowed.

## Validation Boundary

Synthetic offline VM and actual-source browser harness only; exclude init/config and deny network. Tests, build, syntax, UI and independent reviews must complete before claiming implementation acceptance. No live-account operations, business commit, push or deployment.

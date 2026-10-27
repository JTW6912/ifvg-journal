# Tasks: prop-monthly-cashflow-visual

Implement the explicitly approved final modern monthly preview on prop-test. Preserve existing financial semantics, classic layout and private-data boundaries. These pending tasks are the standard-lane development baseline; no implementation or verification completion is claimed.

## 1. Read monthly cash flow clearly without losing the familiar chart

User outcome: the owner keeps the familiar monthly bars, can optionally inspect received and invested trends, understands actual cost recovery, and sees the selected month's three amounts directly beside its date, with existing ledger/detail interactions intact.

- [ ] 1.1 Add actual-source offline regression tests for monthly values, classic output, optional-line eligibility/geometry and zero/refund/pending/range boundaries.
- [ ] 1.2 Implement the modern summary/footer, reusable thin-line icons and left-adjacent selected-month/date/amount header without changing financial helpers or existing account-detail/group interactions.
- [ ] 1.3 Add default-off two-series overlay controls with ephemeral state, responsive geometry, keyboard/focus and safe recovery-help lifecycle; preserve theme/locale/range state and clean up on identity/overview/layout exit.
- [ ] 1.4 Run full offline tests/build/syntax and isolated actual-source browser regressions, obtain independent review evidence, fix findings and record exact remaining verification limitations.

## Boundaries

No new API, schema, dependencies, persisted preference, real-account tests, push or deployment. The owner authorized a local documentation/task-only baseline commit with “允许提交”. Do not include business source, configuration, screenshots, other changes or private data; no push is authorized.

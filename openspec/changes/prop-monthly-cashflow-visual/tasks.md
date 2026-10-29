# Tasks: prop-monthly-cashflow-visual

Implement the explicitly approved final modern monthly preview on prop-test. Preserve existing financial semantics, classic layout and private-data boundaries. Baseline a7b2def tracked all four tasks as pending. Items 1.1–1.3 now have direct implementation, tests and initial browser evidence; the owner has now approved human review, and 1.4 remains open only for native acceptance/handoff bookkeeping. No formal development handoff or Verification V2 completion is claimed.

## 1. Read monthly cash flow clearly without losing the familiar chart

User outcome: the owner keeps the familiar monthly bars, can optionally inspect received and invested trends, understands actual cost recovery, and sees the selected month's three amounts directly beside its date, with existing ledger/detail interactions intact.

- [x] 1.1 Add actual-source offline regression tests for monthly values, classic output, optional-line eligibility/geometry and zero/refund/pending/range boundaries.
- [x] 1.2 Implement the modern summary/footer, reusable thin-line icons and left-adjacent selected-month/date/amount header without changing financial helpers or existing account-detail/group interactions.
- [x] 1.3 Add default-off two-series overlay controls with ephemeral state, responsive geometry, keyboard/focus and safe recovery-help lifecycle; preserve theme/locale/range state and clean up on identity/overview/layout exit.
- [ ] 1.4 Run full offline tests/build/syntax and isolated actual-source browser regressions, obtain independent review evidence, fix findings and record exact remaining verification limitations.

## Boundaries

No new API, schema, dependencies, persisted preference, automated real-ledger write tests, push or deployment. After manual connected-page review, the owner explicitly said “我觉得可以了，提交代码吧，人工已审核”, authorizing this implementation/test/local-record commit in addition to the earlier documentation baseline. Exclude configuration, screenshots, other changes and private data; no push is authorized. See development/human-review.json.

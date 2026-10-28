# Tasks: prop-company-summary-visual

Implement the explicitly approved `company-comparison` variant on prop-test. This is one cohesive user-facing slice: compare company results without losing the seven existing metrics, filters or accounting semantics. Implementation items 1.1–1.3 now have actual-source evidence; 1.4 remains open for native acceptance/handoff receipts; the owner has supplied human approval. Prototype checks are not production implementation evidence.

## 1. Compare company performance clearly

User outcome: compare each company's existing seven metrics at a glance, reorder them locally and read field explanations without changing financial scope, losing values on mobile, or disturbing the rest of the overview.

- [x] 1.1 Add actual-source synthetic regression coverage for seven-field equivalence, classic output, visibility, stable sorting, common-scale geometry and financial/logo/text boundaries.
- [x] 1.2 Implement the modern company comparison table with logo/fallback, full aligned values, net/pass tracks and inherited theme/locale; preserve existing scope/callers and classic behavior.
- [x] 1.3 Integrate local sorting, shared field-help, mobile fixed-column scrolling and focus/lifecycle cleanup without persistence, network calls or interference with existing monthly groups and unsaved forms.
- [ ] 1.4 Run offline tests/build/syntax/diff and actual-source UI regressions; resolve independent review findings and record native acceptance/handoff status honestly.

## Boundaries

No real Supabase testing/writes, API/schema/permissions/dependency changes, private fixture data, unrelated fixes or generated app.js edits. The owner explicitly replied “允许” to the requested local 10-file documentation/tasks/approval baseline. That documentation baseline is 727962c. After connected-page review the owner further said “可以，我已审核通过，请帮我提交吧”, authorizing the local implementation commit and recording human approval. No push or deployment is authorized. Prior changes and their pending formal verification remain untouched.

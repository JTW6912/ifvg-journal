# Requirements: prop-overview-linkage

## Summary

Implement the user-approved follow-up to the modern Prop financial panel: one overview reporting range, a continuous narrowing horizontal funnel, cohort-based conversion drill-down, and precise current-state navigation. The earlier change remains intact, including its frozen nine assertions and pending final review.

## Users & Actors

Authenticated owners, including admins viewing only their own private ledger. Existing company/group scope applies. No new privilege or remote operation.

## In Scope

- R1: In modern layout, the existing date control governs the panel, lower monthly cash flows/detail, company financial summaries and dated account progress. Classic keeps its existing UI and accounting paths.
- R2: Reuse existing inclusive natural-day presets and cancellation rules. Financial values retain propSum cost/refund/pending/ROI semantics. Partial months/years are explicitly labeled as the range intersecting the displayed period, not a whole-year total. Selecting a range moves an out-of-range month/year into that range; navigation cannot escape a bounded range.
- R3: Funnel stages count unique accounts with bought_on, passed event, funded event or a positive nonpending payout day inside the range. Repeated events/payouts do not multiply a stage's account count. Use actual recorded dates, not current status as a historical date or funded dates as invented passed dates. Invalid/missing known dates are disclosed rather than fabricated; unaffected valid records may be listed with an incomplete-data notice.
- R4: Each connection uses the previous stage's same interval cohort as denominator, and a subsequent next-stage record on/after that account's qualifying source date and on/before the inclusive end as numerator. The all-time range has no lower/upper cutoff. Do not divide independent stage totals. Zero denominators display an em dash, not 0% or Infinity. Out-of-order chronology does not prove conversion.
- R5: Stage controls open that exact stage list. Connection controls show converted and not-converted-within-cutoff partitions of their source cohort. Counts and rows share one derived model, include relevant event dates, and rows open existing account detail. Names/attributes are escaped. Empty lists are navigable and explicit.
- R6: Match approved funnel.html v2: continuous left-to-right narrowing, coherent icons, connection controls with percent and numerator/denominator, bottom pass-rate and average-cost summaries with explanations. Narrowing is stage symbolism, not the volume ratio of independent cohorts; mobile uses local horizontal scrolling, never four stacked cards.
- R7: Bottom pass rate uses interval-dated passed accounts plus interval-dated failed attempts (each failed/reset attempt counts), not active/incomplete evaluations. Only actual passed records count as successful evaluations; instant-funded accounts do not manufacture passes. Cost per funded account is the selected-range net investment divided by unique accounts entering funded in that range, with an explicit formula and em dash at zero denominator. Company rows use the same period pass-rate model, current account counts labeled current, and the same financial ROI/null rules.
- R8: Current eval/passed/funded controls in the panel navigate to My Accounts using an exact status filter, retain company/group scope, clear stale batch/menu selection, and do not apply the reporting date to current accounts. The selected status is visible and can be cleared via existing aggregate filters; other account operations are unchanged.
- R9: New drill-down UI is local, using the existing secondary-modal/detail lifecycle. Escape, close/back, focus entry/return and keyboard navigation work. Scope/date/identity/layout/page changes discard stale list state; opening or cancelling it never clears another unsaved form. No new fetching, saving, renewal or preference persistence.
- R10: Reuse the existing native JS architecture, themes, seven palettes, light/dark, custom P&L colors and zh/en. Follow shadcn interaction/style principles without importing React or overriding the global accent semantic. Preserve the prior financial panel's behavior and classic regression baseline.

## Out of Scope

No database/API/RLS/schema, renewal, ledger edit, directory, transaction-journal, framework or deployment changes. No real-account tests, automatic remote operations, business-source commit, push or deployment. Do not change or delete the earlier acceptance freeze to admit this scope.

## UI Design Impact

Foundation: openspec/specs/ui-design/design.md. Approved funnel is in ../prop-overview-range-panel/prototype/artifact/funnel.html; its current-status demo is not a new standalone production card. Keep current statuses in the existing panel. Monthly/company sections retain their composition with accurate range labels rather than a new visual redesign.

## Theme & Locale Capability Impact

Theme support: light-dark; existing theme toggle only. Seven palette tokens and pnlPos/pnlNeg are inherited. Internationalization: enabled; supported locales zh,en; default en fallback with existing user/browser preference precedence. Cover mobile/desktop and both languages.

## Architecture & Database Impact

Foundation: openspec/specs/system-architecture/design.md. Consume propScoped caches and recorded account events/entries. Pure domain selectors compute interval memberships, temporal cohort joins and summaries without DOM/network/storage or input mutation. Keep propFunnel unchanged for classic.

## Frontend-Backend Data Flow Impact

Foundation: openspec/specs/frontend-backend-data-flow/design.md. Extend FLOW-PROP-OVERVIEW via FLOW-PROP-PROGRESS and FLOW-PROP-DRILLDOWN; add FLOW-PROP-CURRENT-NAV. All request counts are zero. Existing account detail is reused, not automatically edited.

## Component Architecture Impact

Foundation: openspec/specs/component-architecture/design.md. Extend the pure Prop domain model; create one focused linkage view/controller, reuse date/format/i18n/escaping/secondary-modal/detail functions. Extend My Accounts filter predicates explicitly. At the page boundary resolve one range and share financial subsets and progress models; do not recompute unrelated totals in each template.

## Unresolved Gaps

No further design approval is required: the user explicitly accepted the horizontal funnel and requested implementation. Date attribution above uses recorded fields only and states data limitations. Formal implementation/review evidence remains to be produced. The existing prior implementation is uncommitted and must remain visibly so; the new local baseline commit is authorized for specifications/tasks only.

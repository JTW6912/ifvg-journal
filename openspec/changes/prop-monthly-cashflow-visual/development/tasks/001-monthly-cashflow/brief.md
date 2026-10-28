# Task Brief: 001-monthly-cashflow

## Goal

Deliver the final user-approved monthly cash-flow presentation without changing its financial meaning, default bar chart, classic layout or existing ledger operations.

## Vertical Slice

User outcome: a modern Prop owner can keep the familiar bars or optionally inspect two monthly cash-flow lines, read cost recovery and its scope, and inspect the selected month's values immediately beside its date before using existing grouped entries/detail. Owns pending checklist IDs 1.1–1.4.

## In Scope

Default-off line toggle and matching geometry; ephemeral display state; consistent monthly SVG icons; neutral actual cost-recovery ratio and field i; left-adjacent month/date/three metrics; native theme/locale and narrow-screen behavior; offline actual-source regressions and lifecycle review.

## Files Allowed

src/03-state.js; src/11e-prop-view.js; src/11g-prop-overview.js; src/11i-prop-months.js; src/14-main-render.js; src/15-events.js; theme-modern.css; i18n.js; test/prop-months.test.js; dev/prop-months-check; the active change's documentation. Shared state, tooltip, render/event and test edits require independent review under scope.json. Financial helpers, auth/data-loading and classic CSS are read-only dependencies.

## Components And Seams

Create one focused monthly presentation/overlay module, reuse propMonthly/propSum, formatting/escaping/i18n and existing grouping/detail actions. Extend the existing field-help lifecycle narrowly rather than duplicating it. Integrate overlay cleanup/redraw with the renderer explicitly, without repeated event registration or polling. Reference the approved prototype but do not copy its synthetic snapshots, mock detail or review settings.

## Data And State

Consume current scoped entries only. No requests, writes, schema change or persisted display setting. Lines start off; retain on month/year/range/theme/locale changes inside the current overview, reset on identity or overview/layout exit. Excluded/unavailable months are not fabricated zeroes; empty periods draw no invented trend. Pending payouts and net refunds use the existing financial model. Recovery is received/net investment, not ROI; preserve the cap and undefined-denominator behavior. Keep original loading/error/form behavior and remove detached overlay resources.

## TDD Requirement

Add failing focused tests for approved behavior and unchanged financial/classic baselines before implementation. Test real source in the existing VM; no production config or init. Browser harness must use synthetic data and deny remote connections.

## Verification Commands

- node --test test/prop-months.test.js test/prop.test.js test/prop-overview.test.js test/prop-linkage.test.js
- npm test
- npm run bundle
- node --check app.js
- node --check i18n.js
- git diff --check

Add browser evidence for toggle on/off/reload, range/year/month changes, recovery help/focus/Escape, identity/layout cleanup, group/detail/form protection, classic output and 375px/desktop zh/en light/dark/seven palettes. Do not equate these with formal V2 completion.

## Stop Conditions

Development entry is not green; task baseline is absent; edit exceeds scope; a product meaning needs a new decision; an operation would reach a real account; review/test failure is unresolved. Do not commit other work or push/deploy. A documentation/task-only baseline commit needs explicit authorization before creating it.

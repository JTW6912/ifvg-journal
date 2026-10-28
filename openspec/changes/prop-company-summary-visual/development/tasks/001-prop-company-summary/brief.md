# Task Brief: 001-prop-company-summary

## Goal

The owner can compare every company's existing seven metrics more clearly, sort locally and inspect field explanations on desktop/mobile without changing scope or disrupting earlier overview behavior.

## Parent Artifacts

Read requirements.md, acceptance.md/json, spec-map.json, component-impact-map.json, scope.json, prototype/decision.json and prototype/handoff.md under openspec/changes/prop-company-summary-visual, plus the four foundation specs. Approved source is prototype/artifact/index.html with source hashes in the decision. Tasks 1.1–1.4 belong solely to this packet.

## Vertical Slice

Enter modern Prop overview → consume existing scoped/report data → view company identity and seven aligned metrics → compare shared-scale net/pass bars → change local sorting or reveal header help → retain full values and focus in the mobile scroller. Classic and all earlier panels remain unchanged.

## In Scope

Implement the approved company-comparison variant after native entry. Preserve grouping/visibility/date and money semantics. Add safe logo fallback, symmetric amount geometry, stable descending sort by net/spent/received/ROI, shared plain-text help, fixed company column on narrow screens and ephemeral context cleanup. Include actual-source tests, offline UI evidence and independent review.

## Out Of Scope

No real account tests/writes/renewals, new backend API or storage, schema/RLS/dependencies, row drilldown, global restyling, prior module fixes, preview controls/fixtures/shell patches, manual app.js editing, Git commit/push/deploy without separate authorization.

## Files Allowed

- src/03-state.js
- src/11e-prop-view.js
- src/11g-prop-overview.js
- src/11j-prop-firms.js
- theme-modern.css
- i18n.js
- test/prop-firms.test.js
- dev/prop-firms-check
- openspec/changes/prop-company-summary-visual

## Interfaces / Seams

Keep renderPropByFirm's current caller and classic output. New modern code receives already filtered entries/range plus full scoped entries for event statistics. Use existing propOverview help resolution and before/after-render seams. Sorting patches only the company area and preserves scroll/focus, monthly details/line state and modal drafts. No edits to 14-main-render/15-events or finance/persistence modules are planned.

## Components To Create

CMP-PROP-COMPANY-COMPARE in one focused 11j module: company presentation model, finite shared-scale bars, null-safe stable sort, renderer and local event/lifecycle controller.

## Components To Reuse

Existing finance/event/formatting helpers, T/esc and icon conventions, public logo identity, product CSS tokens and the overview/monthly field-help portal.

## Components To Extract

Keep new company behavior outside the large legacy 11e renderer; do not duplicate its financial formulas or build another tooltip controller. Only approved copy/icon paths can be adapted from the prototype.

## API / Data Flow Contracts

Zero new backend requests/writes. Current scoped caches → same helper results → derived rows; sorting alters order only. Field help is translated plain text. Current account counts are not historical. Pending/refund/recorded-failure semantics and visibility are inherited unchanged.

## State / Error / Empty / Loading Behavior

Retain existing loading, finance error and no-account guards. The normal fewer-than-two-company visibility rule stays intact unless company-filtered. Disabled single-row sort and unknown ratios stay explicit. Sort defaults to net, survives in-view filter/range/theme/locale redraw, resets on owner/layout/overview exit, and is never persisted. Modal/dirty/busy priority and Escape behavior remain protected.

## TDD Requirement

Add tests before implementation for current renderer/financial/visibility equivalence and classic zh/en baseline. Exercise sort/null/ties, geometry/sign/zero/refunds/pending/large amounts, safe names/logos, help and lifecycle. Capture a focused red result then green without weakening the old contract. Do not treat prototype checks as production tests.

## Verification Commands

- node --test test/prop-firms.test.js
- npm test
- npm run bundle
- node --check app.js
- node --check i18n.js
- git diff --check
- Isolated actual-source browser checks with init/config/Supabase disabled, synthetic data and no remote data calls: theme/locale/mobile, help/scroll/focus, local sorting, monthly expansion/line toggle, classic and dirty-form compatibility.

## Stop Conditions

Stop before production edits unless native entry returns ok:true and approved tasks are tracked by HEAD. Stop on scope drift, required shared-seam review, failing tests or missing product/architecture decisions. No auto-commit/push or real-data test. Keep acceptance failing and tasks pending until direct implementation/verification evidence exists.

## Unsafe Assumptions

Do not assume current counts are active-only; a reset is not an invented failed event; net bars are not rankings or trends; unknown ROI is not zero. Stored display-name groups need not map one-to-one to catalog ids. Missing logos need a safe fallback. Mobile horizontal overflow is local and focus may otherwise hide behind the fixed column. Prototype theme fixes or green checks are not production authorization/acceptance.

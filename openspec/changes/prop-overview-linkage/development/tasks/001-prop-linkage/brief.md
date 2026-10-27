# 001-prop-linkage

## Goal

Let users reconcile the modern overview's selected-period financial results and account progress, inspect exact stage/conversion members and separately navigate current account states.

## Vertical Slice

Own checklist items 1.1–1.4: pure model → modern report/funnel → list/detail/current navigation → offline verification and independent review. No task is complete at entry.

## In Scope

Implement requirements R1–R10 and assertions A1–A8. Create a focused linkage renderer/controller; extract pure date membership, cohort and month-bound helpers; reuse accounting, formatting, escaping, themes, existing secondary modal/detail, date controls and account filters. Preserve legacy propFunnel and classic output. Follow the explicitly approved prototype, not its synthetic business logic.

## Files Allowed

src/11d-prop-data.js, src/11e-prop-view.js, src/11g-prop-overview.js, src/11h-prop-linkage.js, theme-modern.css, i18n.js, test/prop-linkage.test.js, test/prop-overview.test.js, dev/prop-overview-check. Scope source: openspec/changes/prop-overview-linkage/scope.json. No global 03/14/15 or persistence edits.

## Verification Commands

node --test test/prop-linkage.test.js; npm test; npm run bundle; node --check app.js; node --check i18n.js; git diff --check. Browser: loopback-only actual-source synthetic fixture with init omitted and network denied; test range, lists, exact filters, keyboard/focus, stale context, themes/locales/sizes and forms/classic. Record direct outputs and obtain independent specification/quality review.

## Stop Conditions

Stop for failed development entry, out-of-scope changes, unresolved product meaning, missing event dates that would require guessing, real-account testing, or a required business commit not authorized by the user. Do not claim handoff while tests/reviews or formal receipt requirements remain unresolved.

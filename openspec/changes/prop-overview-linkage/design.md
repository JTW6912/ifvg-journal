# Implementation Design

## Context

Follow-up to the locally implemented but uncommitted `prop-overview-range-panel`. Do not claim its final review or business-code checkpoint exists. Its frozen assertions and task IDs remain unchanged. Four foundation specs define the native string-rendered app, owner-only caches, theme/locales and offline testing. Scope statements that previously excluded lower panels remain accurate for the earlier change; this explicitly approved follow-up adds the behaviors below without redefining that historical approval.

## Goals / Non-Goals

One modern reporting range for financial summaries and recorded account progress; explainable cohort drill-down and exact current-state navigation. Preserve classic, account/ledger edit operations, directory and all persistence. No framework, schema, API or remote test.

## Decisions

1. Resolve one range at the modern overview boundary. Share a pure date membership function and filtered entries for lower financial panels; use the existing snapshot to retain invalid-date/amount disclosure. Do not show valid-looking lower zero totals when the financial snapshot is unavailable.
2. Build a pure account progress model from bought_on, dated events and positive nonpending payouts. Index entries by account once. Stage rows are unique account/date pairs; use the earliest qualifying source date in the selected interval and the first chronological matching target through the cutoff. All-time removes bounds, not chronology. Missing/invalid known dates are disclosed, never replaced by today's date or a guessed state date.
3. Pass rate counts successful passed accounts once and each recorded failed attempt within the interval. Instant funding bypasses passing and must not fabricate a success. Cost per funded is selected net investment / interval-funded distinct accounts. These are explicitly labeled period summaries, not acquisition-cohort cost efficiency.
4. Reuse monthly/detail markup with an optional modern range: clamp navigation/selection into bounded months, show partial-period labels, and use the same filtered entries. Company totals share those entries, while their account counts remain explicitly current and pass rate uses the progress model.
5. Add one `src/11h-prop-linkage.js` view/controller. Keep domain functions in 11d. Existing `propModal` owns a dedicated overview-list descriptor (stage or connection, partition, owner/scope/range); reuse existing detail and secondary-modal cleanup. No new remote service or duplicated ledger form.
6. Extend the existing status-filter predicate to exact statuses, show an explicit selected filter and clear via existing aggregate filters. Current-stage navigation preserves company/group but clears stale selection/menu state, never applies the reporting date.
7. Rendering/counts/drill-down consume the same model. UI text/attributes are escaped and localized. Modern CSS is namespaced, uses low-specificity state-friendly selectors and existing tokens. The original current-status card remains within the financial panel; preview controls are excluded.

## Risks / Trade-offs

Legacy histories may not contain an explicit passed event, even when currently funded. Do not manufacture its date; disclose known incomplete histories, show actual recorded stages and separately retain current-state navigation. Conversion geometry is illustrative because independent stage cohorts need not monotonically decrease. Multi-year ranges need bounded navigation and partial-year labels; zero denominators and net refunds must remain honest.

## Validation

Add failing synthetic unit/render/event tests before implementation. Use the isolated actual-source harness with disabled init/config/network for DOM, keyboard, drill-down, stage navigation, partial-month/year, theme, locale, mobile, XSS and existing-form checks. Run npm test, bundle and syntax checks. Independent review remains mandatory; no business commit, push or deployment is authorized.

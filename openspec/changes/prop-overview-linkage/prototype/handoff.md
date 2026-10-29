# Prototype Handoff: prop-overview-linkage

## Approved Branch Variant

Branch ui-html, variant horizontal-funnel-v2. User explicitly approved “好的我同意就这样做吧” following the horizontal narrowing funnel with restored pass-rate and average-cost descriptions. Local specifications/tasks-only baseline separately authorized; 108a835 contains only those ten files. No business-code commit or deployment permission.

## Screens Or Flows

Modern Prop overview funnel → stage or cohort list → existing account detail; current eval/passed/funded → exact My Accounts filter. Keep company/group scope. Overview range also governs lower financial summaries/month detail under requirements.md; those retained compositions are not redesigned by this local prototype.

## Components To Create

Pure dated progress/cohort model and one modern linkage view/controller for the funnel and account list.

## Components To Reuse

propScoped, propSum, propOverviewResolveRange/Day/Snapshot, T/esc/formatting, existing secondary modal and account detail, date/help controller, monthly renderer and theme tokens. Current statuses remain in the financial panel, not a separate new card.

## Extraction Targets

One pure membership/chronological cohort model shared by counts and row IDs. Keep DOM/focus/list state in the linkage controller, not financial calculations. Legacy propFunnel stays for classic.

## API Contracts

No new request, persistence, renewal or preference operation. Consume the owner cache. Do not copy the synthetic accounts, preview controls or snapshot business markup into production.

## Data Flows

FLOW-PROP-SCOPE → FLOW-PROP-OVERVIEW → FLOW-PROP-PROGRESS → FLOW-PROP-DRILLDOWN; FLOW-PROP-CURRENT-NAV is current-state-only and excludes the reporting date. Company/group scope remains preserved.

## State Behavior

Populated and empty stages, zero-denominator disabled connections, list partitions, detail/back and current filter were inspected. Loading/service error/permission transitions are not applicable to this synchronous fixture. Production must disclose incomplete historical dates, respect existing loading/errors and avoid stale identity/scope/modal references. Cancelled date drafts preserve applied results. List opening must not replace an unsaved form.

## Theme And Locale Policy

Theme support light-dark, seven existing palettes; prototype-only theme/locale controls are present. Verified mobile matrix and desktop screenshot. Locales zh/en, existing en fallback in production; prototype defaults zh for review. No new product appearance menu or framework.

## Out Of Scope Items

Classic, directories, ledger/form/status writing, renewals, authentication, database/schema/RLS/API and deployment. No real-account testing or business-source commit. Do not modify the preceding change's frozen acceptance.

## Required Tests

Inclusive date boundaries, cross-year partial months, count/list equality, same-cohort chronology, repeated failed attempts, pending/zero payouts, unknown dates, empty denominators, signed refunds, company/group scope, exact current navigation, list/detail/close/back/Escape/focus, stale context, unsaved forms, classic regression, themes/locales/mobile and build/syntax. Use actual source with synthetic offline fixtures, then independent reviews.

## Open Risks

The approved prototype is intentionally a limited fixture, not proof of the production data model or monthly integration. The existing preceding implementation is still uncommitted and its final review is pending. Promotion must reimplement against the real cache and pass development entry; no direct promotion of fixture logic is permitted. The first mobile pointer attempt missed a below-viewport target; explicit scroll plus click verified the state and the diagnostic is retained.

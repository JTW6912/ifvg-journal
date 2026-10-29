# Requirements: approved company-summary implementation

## Feature Summary
Implement the reviewed `company-comparison` variant in the modern Prop overview on `prop-test`. The owner explicitly said “我觉得可以，开始吧” after the preview was presented. This supersedes the earlier design-only restriction for this change. Subsequent owner instructions authorized the local documentation baseline, a user-operated connected-page review and the local implementation commit (see Unresolved Gaps); pushes, deployment and real-ledger automated tests remain unauthorized. The prototype remains a design reference, not production code or implementation evidence.

## Users & Actors
Owners comparing their own scoped Prop companies. Use already-authorized account/entry caches and existing public directory/logo assets. All automated verification uses synthetic accounts/events/amounts, never the owner's screenshot data or credentials.

## In Scope
- R1: Preserve the seven fields: company, current scoped account count, period pass rate, net investment, received payouts, net result, ROI. Preserve grouping by existing `firm_name || "—"`, company/group filters, and the one page-wide date range. Preserve section visibility: fewer than two companies is hidden unless a company filter is active. No second date picker, duplicate summary cards, company editing or row drilldown.
- R2: Reuse `propSum`, `propLinkageReport`, `propUsd`, `propPct` and existing date filtering. Counts include all currently scoped accounts, including ended accounts; they are not historical or active-only counts. Period pass rate uses unique passed accounts and each recorded failed attempt in range; do not infer unrecorded failures from resets. Pending payouts are excluded; refunds reduce net investment; undefined ROI/pass rate shows — rather than zero. Do not repair unrelated accounting or status-flow behavior.
- R3: Reimplement the approved table: logo/name identity with initials fallback, aligned full monetary values, restrained neutral pass-rate tracks and emphasized signed net values. Net bars use a single symmetric USD scale across visible companies, with zero centered, negative left and positive right. Sorting must not change the scale. These are amount comparisons, not trends, recommendations or risk ratings.
- R4: Use field-adjacent i controls for count, pass rate, investment, receipts, net and ROI. Hover, focus, tap and Escape work; prompts can be hovered/read, have safe viewport placement and aria-describedby, and clean up during redraw/navigation. Reuse the existing Prop help controller rather than creating a second competing portal. No permanent formula block.
- R5: Default net-descending ordering; the approved sort control offers net, investment, receipts and ROI descending. Reorder derived rows only, keep unknown ROI last and preserve stable order for ties. Sort is ephemeral, preserved within the same user's modern overview (including date/company/group/theme/language changes), reset on owner or overview/layout exit. No storage or preference RPC. Preserve focus and table scroll; sorting must not collapse monthly ledger groups or replace an unsaved form.
- R6: Inherit existing typography, light/dark, seven palettes, user P&L colors and zh/en. Keep every column and full values on narrow screens via local horizontal scrolling with the company column fixed. Keyboard help targets must scroll into view without hiding behind the fixed column; touch targets are 44px. Keep production shell and earlier finance/funnel/monthly designs unchanged. Do not copy prototype shell contrast patches, controls, fixed dates, sample data or review kit.
- R7: Only modern company rendering changes. Classic output and accounting behavior remain unchanged, including its existing ROI/in-progress presentation. Handle zero net, empty periods, pending-only, refund-surplus, missing logos, long names, large amounts and a filtered single company. Existing no-account/financial-error/permission behavior remains owned by its current callers; no invented backend state or no-data row in normally hidden sections.
- R8: Lifecycle and security remain local: no new backend/data request, write, renewal, API/schema/RLS/dependency/framework change; no leaked stale identity state. Escape priority and dirty/busy form protection remain intact. Escape interpolated text/attributes, validate numeric geometry/sort keys and safe logo sources; no user-supplied executable markup.

## Out of Scope
Unrequested Supabase access or automated business tests, agent-initiated account writes/renewals, catalog edits, new admin data access, migrations, libraries, global restyling, production `app.js` edits, preview controls/shell contrast patches, unrelated historical verification records, commits/push/deploy without further authorization. Company rows are informational; no new drilldown.

## UI Design Impact
Current IFVG shell/tokens remain authoritative. Apply the approved `company-comparison` preview (shadcn Base Table-inspired restrained separators/hover) only inside modern company summary. No font/framework migration or global `--accent` overrides. Logo is identity and charts are meaningful comparisons.

## Architecture & Database Impact
A dedicated native `src/11j-prop-firms.js` is the planned cohesion boundary for company row derivation, scale/sort, renderer and local lifecycle/controller. `renderPropByFirm` remains the caller seam with its classic path intact. Narrow shared state/help lifecycle changes belong in `03-state`/`11g`; production writes remain in existing data services. No database change.

## Frontend-Backend Data Flow Impact
FLOW-PROP-COMPANY-SUMMARY consumes `accounts`, already range-filtered `report.entries`, the resolved range and full scoped entries for historical event calculations. FLOW-PROP-COMPANY-SORT locally reorders derived rows. FLOW-PROP-HELP consumes translated plain text. All three issue zero backend calls. The current c91489b behavior linking lower reports supersedes the historical foundation text describing a top-panel-only date scope.

## Component Architecture Impact
Create CMP-PROP-COMPANY-COMPARE and a local scale/sort view-model seam; reuse existing finance helpers, formatting, public logos and CMP-PROP-HELP. Keep new UI out of the large legacy page body except the dispatch seam. No general table framework or duplicate tooltip lifecycle.

## Theme & Locale Capability Impact
Theme support: light-dark, seven palettes, existing toggle and P&L settings. Gold uses no palette attribute. Production zh/en and existing account/local/browser precedence with en fallback. Prototype controls are review-only; no new in-panel theme/locale picker. Respect reduced motion and existing state-selector precedence.

## Unresolved Gaps
No product decision remains for the reviewed variant; native development entry passed at documentation baseline 727962c. The owner separately authorized connecting the local app for personal review, then said “可以，我已审核通过，请帮我提交吧”. This records human approval and permission for the local implementation commit only, not push/deployment or real-ledger automated testing. Native acceptance/handoff and Verification V2 receipts remain separate; no gate is bypassed or marked passed by this statement.

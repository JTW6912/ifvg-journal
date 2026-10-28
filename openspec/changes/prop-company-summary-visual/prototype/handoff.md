# Prototype Handoff: prop-company-summary-visual

## Approved Branch Variant

- Prototype branch/type: `ui-html`; variant: `company-comparison`.
- Git development branch: `prop-test`; observed production HEAD: `c91489b2b28c12f6d7fd47abba90ce2a585c2239`.
- Explicit owner approval: “我觉得可以，开始吧”, in response to the final company preview. This approves implementation, not Git publication, real-data tests or final acceptance.
- Entry: `prototype/artifact/index.html`; approved source hashes are recorded in `prototype/decision.json` and `prototype/evidence/source-check.json`.
- Prototype verifier: `prototype/verifier-report.json` is green. 754 helper/format checks and 196 layout/state combinations concern this synthetic design only. Production requirements A1–A7 remain failing until actual implementation evidence.
- Promotion: `requires_development_gate`; no direct prototype-to-production copy.

## Screens Or Flows

Modern Prop → Overview → By firm, after the existing finance/funnel/monthly sections. Preserve seven columns, existing company/group/global-date filtering, grouping by stored display name and section visibility. Add public logo identity, complete aligned money, common-scale net bars, neutral pass tracks, default net-descending and selectable spent/received/ROI sorting, field help and mobile fixed identity/scroll. Company rows do not open accounts or editors.

## Components To Create

- `CMP-PROP-COMPANY-COMPARE`: dedicated native module planned as `src/11j-prop-firms.js` for view-model, shared scale/stable sorting, modern table and local controller.
- CSS scoped to modern company classes in `theme-modern.css`; namespaced zh/en keys.
- Focused `test/prop-firms.test.js` with actual helper/renderer compatibility, geometry, lifecycle and safety fixtures.

## Components To Reuse

- `renderPropByFirm` caller/visibility contract and untouched classic presentation.
- `propSum`, `propLinkageReport`, `propFunnel`, `propUsd`, `propPct`, `T`, `esc`, existing icons and public local logo assets.
- Existing `propOverview` tooltip portal and lifecycle for company help; earlier monthly recovery and overview fields must still work.
- Existing application rendering and modal/dirty-form protection. No whole-app redraw merely to reorder the company list.

## Extraction Targets

Company derivation/sort/scale/view belong in the dedicated module, not in long HTML inside 11e or a general table framework. Shared ephemeral sort declaration belongs in 03-state; only narrow dispatch/help/lifecycle seams are expected in 11e/11g. No extraction of unrelated catalog, ledger or global appearance behavior.

## API Contracts

No new API/RPC/schema/RLS or client. Inputs remain already-authorized scoped accounts, date-filtered entries, resolved range and full scoped entries for event history. Public image identity must use existing safe logo sources or initials; never inject arbitrary image markup. Local asset loading is allowed; no new backend or external service calls.

## Data Flows

- FLOW-PROP-COMPANY-SUMMARY: `propScoped` → `propLinkageReport` → existing `renderPropByFirm(accounts, report.entries, report.range, entries)` boundary → new modern component. All seven values preserve current semantics, including recorded failed attempts and nonhistorical current counts.
- FLOW-PROP-COMPANY-SORT: whitelisted local sort state → copied derived rows → only company-region ordering changes. Unknown ROI last, stable ties, unchanged USD scale.
- FLOW-PROP-HELP: translated plain text → existing common tooltip; no HTML from data, requests or preference writes.
- Current c91489b all-overview date linkage is authoritative over older foundation prose describing top-panel-only range filtering.

## State Behavior

- Loading/error: retain existing auth/Prop/financial-error caller behavior. The prototype did not simulate backend states; no new fetch/retry or fake zero-success fallback.
- Empty: preserve existing no-account and section visibility. Empty-period companies retain current counts with zero finance/unknown ratios; do not copy the standalone demo's empty panel into normally hidden production sections.
- Disabled: sorting unavailable when fewer than two displayed rows. Unknown ratios remain —, not fabricated 0%.
- Permission: display-only owner-cache consumption, no new admin/private-data or row actions.
- Local sort defaults to net descending; persists while the same owner remains in modern overview, including language/theme/range/company/group changes. Reset on identity/layout/overview exit, without storage. Clear stale help/focus nodes on redraw/modal/open/logout boundaries.
- Preserve table scroll/focus, previously expanded monthly groups and dirty/busy forms. Existing Escape priority remains authoritative.

## Theme And Locale Policy

- Theme support: light-dark, seven product palettes (gold = absent data-palette), existing user P&L color overrides. Keep typography and semantic token meanings; classic unchanged.
- Theme modes shown: light and dark with all seven palettes in isolated checks; arbitrary custom color contrast is not certified.
- Theme toggle: existing product controls; preview toolbar is excluded.
- Internationalization: existing T()/locale behavior; zh/en, with account/local/browser precedence and en fallback.
- Locales shown: zh/en; initial prototype zh is review-only. Locale switcher remains the existing product one.
- Narrow screens keep local horizontal scrolling, fixed company names, full financial values, keyboard visibility and 44px help targets. Reduced motion is respected.

## Out Of Scope Items

No real account/database testing, writes, renewals, migrations, permissions, dependencies, React, persisted sort preferences, row drilldown, new metrics, duplicated date control, global shell restyle, previous report changes, generated app.js manual edits or commit/push/deploy. Exclude preview controls/fixtures/original comparison/review kit, placeholder shell, captured top-level buttons and preview-only contrast fixes from production promotion.

## Required Tests

All implementation assertions in `acceptance.md` A1–A7: seven-field equivalence and input immutability; range/group/company and financial boundaries; shared net scale/sign/null/zero and stable sorting; classic zh/en snapshots and visibility; safe names/logos/geometry; hover/focus/touch/Escape and mobile fixed-column scrolling; theme/locale/long value matrix; in-view sort retention/context reset; monthly expansion/line toggle/modal-draft preservation; no persistence/new data calls; full test/bundle/syntax/diff checks. Use isolated actual source with config/init/Supabase disabled, not the connected 8000 session.

## Open Risks

All visual/product decisions for this variant are explicitly approved. Implementation risks requiring tests: logo/name grouping mismatch, null sort order, mobile fixed-column focus overlap, body-tooltip clipping and redraw cleanup, coupled shared-help/03-state changes, large-number geometry, accidental whole-tab replacement. CodeGraph has no loaded local index, so direct source evidence is required rather than fabricated structural claims. Existing Linux formal Verification runtime limitations remain separate; neither this design approval nor direct offline checks waive them. The owner subsequently replied “允许” to the requested 10-file local documentation/tasks/approval baseline. Only that local commit is authorized; native entry must still return ok:true before any production edit. No implementation commit or publication is authorized.

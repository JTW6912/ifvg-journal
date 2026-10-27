# Implementation report — 001-prop-linkage

## Status

IN_PROGRESS

Local implementation checks pass; formal review and authorized checkpoint remain pending. This report is execution evidence, not a completed SpecNav handoff.

## What Changed

- R1–R2: modern overview resolves one range and shares its finance subset with the panel, month detail and firm rows. Partial periods are labeled and month/year navigation is clamped. Classic retains its accounting/funnel path.
- R3–R5: `propLinkageReport` in `src/11d-prop-data.js` computes unique dated stage members, chronological same-cohort edges, converted/unconverted partitions and missing-history warnings. Counts and drill-downs share the model. No status-derived historical dates or remote calls.
- R6–R7: `src/11h-prop-linkage.js` renders the approved narrowing geometry, clickable stages/connections and both explanatory summaries. Pass denominator is passed accounts plus failed attempts in range; funded cost is period investment after refunds divided by interval funded accounts. Firm pass rates use the same model.
- R8: exact current-state controls retain company/group, clear batch/menu state and navigate to existing account cards, with a visible removable status chip. Financial date does not filter current accounts.
- R9–R10: local list/detail navigation uses the existing secondary modal seam; keyboard partitions, focus trapping/return and stale-context cleanup are scoped to linkage-owned UI. Existing editable detail is reused, not automatically saved. Native CSS/i18n preserve theme semantics and classic.

## Files Changed

`../../evidence/implementation.diff` is the incremental diff against the explicitly uncommitted prior-panel snapshot `../../evidence/before-linkage/`. `../../evidence/review-source-manifest.json` records current source hashes and Git HEAD 108a835. This snapshot is not a Git checkpoint and does not satisfy the final clean reviewed-HEAD contract.

Modified: `src/11d-prop-data.js`, `src/11e-prop-view.js`, `src/11g-prop-overview.js`, `theme-modern.css`, `i18n.js`. New: `src/11h-prop-linkage.js`, `test/prop-linkage.test.js`. Existing `test/prop-overview.test.js` remains byte-identical to the pre-linkage snapshot. The ignored actual-source browser fixture gained synthetic linkage data, a `?demo=linkage` entry and fail-closed write-call guards. No changes to 03/14/15 in this increment, migrations, configuration, RLS or persistence functions.

## Verification Commands

- `npm test`: 133 passed, zero failed, including 20 linkage tests and the previous overview/legacy regressions.
- `npm run bundle`, `node --check app.js`, `node --check i18n.js`, `git diff --check`: exit 0.
- Actual logs: `../../evidence/command-results.json`, `tests-final.log`, `bundle.log`, `syntax-app.log`, `syntax-i18n.log`, `diff-check.log`; command executions also appended to `../../validation-log.jsonl`.
- Browser evidence index: `../../evidence/browser-checks.json`, derived from retained raw command/postcondition JSON, not from this narrative.

## Browser evidence map

- A1/A2/A5: `date-reverse-cancel.json` records actual reverse day selections (October 13 then October 1), linked stages 10/8/0/0 and net -100000 cents, disabled out-of-range month/year controls, firm period labels and cancelled draft retention. Unit tests cover cross-year slices, chronology, repeated attempts and interval firm reconciliation.
- A3: `stage-list.json` shows 8 passed accounts; `conversion-partitions.json` shows 3/10 converted and 7 unconverted with keyboard partition changes; `detail-return-focus.json` records detail dialog, keyboard wrap, return to the selected row and Escape focus return. `browser-lifecycle-boundaries.json` covers ten stale-context/auth/loading conditions and escaped hostile names.
- A4: `implementation-final-desktop.png`, `funnel-mobile-start.png`, `list-mobile.png`; `mobile-scroll-sheet.json` records real horizontal scrolling to offset 472 and the last stage visible, then four payout rows in a viewport-bounded sheet. Shape conveys stages, not independent cohort volume ratios.
- A6: `current-navigation.json` records actual firm/group selection, exact funded navigation (2 accounts despite a period with zero funding events), focused status chip and clearing to all 10 scoped accounts.
- A7: `unsaved-forms.json` proves dirty detail Back retains draft and gives a warning, and opening linkage cannot replace an unrelated purchase form or its DOM. Write-call counters remain empty. `final-browser-diagnostics.json` records no remote resources, no page errors and no console messages.
- A8: `theme-locale-matrix.json` covers 7 palettes × 2 themes × 2 locales at widths 1440, 390 and 375 (84 geometry/style checks), without document overflow or missing keys. `browser-lifecycle-boundaries.json` covers empty/negative/refund/large/invalid data and custom P&L color. Read-only independent scouts checked specifications and quality, but did not issue formal approved verdicts. Their findings and fix validation are recorded separately; formal review receipts remain pending.

## TDD Evidence

- Added labelled dialog semantics and focus trapping for the existing detail when entered from the list; `regression-red.log` then `regression-green.log` preserve the unit transition.
- A first unsaved-form click lacked a completed action. `pointer-diagnostic.json` identified a browser-tool below-viewport miss; explicit scrolling was added to checks, not production logic. Separately `back-blur-red.json` proved a visible Back pointerdown triggered a watched-input `change` redraw and swallowed click. Scoped pointerdown focus preservation now lets Back inspect the already-synced draft; `unsaved-forms.json` and a dedicated unit regression pass. No saving was added.
- Loading-state browser check exposed stale sheet DOM after `render()`'s early auth return. `auth-loading-red.log` reproduces this; the linkage cleanup now calls the normal non-forced secondary-modal seam after dropping its owned state. `auth-loading-green.log` and `browser-lifecycle-boundaries.json` pass, including logout/disabled identities, without clearing unrelated forms.
- A trailing CSS blank line was removed after `diff-check-first-red.log`; final diff check passes.
- Independent scout `job_mvqjrmhk_2` identified lost list origin through nested entry/status/balance forms and missing funding-history notices for blown accounts. Both were verified against source and reproduced in `scout-findings-red.log`. Added `propLinkageDetailBack`, shallow nested-origin recognition and linked-only dialog focus/labels; opening nested forms retains the original list while existing save functions remain unchanged. `scout-findings-green.log` covers successful saves using isolated in-memory stubs only. `nested-entry-navigation.json` and `nested-status-balance-navigation.json` directly exercise all four open/cancel paths with zero blocked write calls. Known funded/blown state now triggers missing-date disclosure without creating stage events; dated instant-funded accounts still do not manufacture passes.

## Concerns

All data is synthetic; actual source is loaded with init omitted, empty configuration, memory storage, blocked network APIs and CSP. No Supabase access, real-account tests, business commit, push or deployment occurred. Viewport emulation is not physical-device testing. Existing business form save/delete behavior was not tested or changed. Runtime sample funding without passed history is disclosed, not guessed.

The earlier panel's frozen acceptance remains untouched. This change's assertions are not marked passing until formal review evidence is accepted. Final reviewed HEAD/tree receipt and standard handoff remain unavailable without the user's authorization to commit implementation code locally. The user authorized only specification/task commits so far.

## Scope Deviations

No production-scope deviation. Nested modal back metadata, labels and focus were fixed within the already-allowed 11e/11h files; save routines remain byte-identical (`unchanged-boundaries.json`). No shared 03/14/15 edits in this increment. The main agent's retained execution logs are not substitutes for managed SpecNav v2 receipt authority.

## Follow-up Needed

Obtain explicit local implementation commit authorization; obtain independent formal spec/quality verdict receipts (read-only scout facts are retained but not relabeled approvals); run the managed current-HEAD evidence runner and task acceptance emitter; only then update acceptance statuses/checklists and request handoff. Historical failed checks must be superseded by trusted later evidence, not deleted. Until that process returns ok:true the stage remains incomplete.

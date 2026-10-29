# Task Report: 001-prop-company-summary

## Status

DONE_WITH_CONCERNS

The owner explicitly approved the current connected-page implementation and requested a local code commit: “可以，我已审核通过，请帮我提交吧”. Human approval is recorded in development/human-review.json against the exact unchanged source hashes. Actual-source offline checks are green; native acceptance/handoff and Verification V2 remain separate. This report accompanies the authorized implementation checkpoint based on documentation baseline 727962c. No push, deployment or real-ledger business tests were performed.

## Files Changed

- src/03-state.js: ephemeral propCompanySort declaration.
- src/11e-prop-view.js: one modern-only dispatch after the existing company grouping/calculation.
- src/11g-prop-overview.js: namespaced company help resolution and lifecycle, sharing the existing tooltip.
- src/11j-prop-firms.js: native table rendering, safe local logo/fallback, finite symmetric net geometry, stable sorting by moving existing DOM rows, scroll/focus helpers.
- theme-modern.css: scoped company table styles, responsive fixed identity column and touch targets.
- i18n.js: matching zh/en company controls and explanations.
- test/prop-firms.test.js: 14 focused tests.
- dev/prop-firms-check/: ignored, isolated actual-source synthetic browser harness, no config/init/Supabase or remote network.
- This change's development records only. Earlier dirty workflow artifacts were not modified.

## What Changed

Preserves company/name grouping, current scoped account count, recorded period pass rate, net investment, received payouts, net result and ROI. Existing helpers and range arguments remain authoritative. Logos use restricted local asset paths or initials. Positive/negative net bars share one USD scale; pass tracks are neutral. All six numeric headings have field help through the existing plain-text tooltip. Sorting is descending, stable, null-last and memory-only; it does not replace monthly groups, charts or forms. Classic output remains byte-identical under the zh/en regression fixtures.

## TDD Evidence

- development/evidence/tdd-red.log: initial actual-source tests before implementation.
- development/evidence/tests-first-green.log: first green implementation (159 full tests).
- development/evidence/focused-boundaries.log: added filter, accepted DOM sort and mobile geometry checks.
- Independent scout job_mvs20zwg_1 noted that all original DOM-sort fixture orders coincided. The fixture was strengthened so spent/received reverse the first two rows, while net/ROI differ, and null/ties remain tested. No product code fix was needed.
- development/evidence/focused-final.log: 14/14 focused tests passed.
- development/evidence/tests-final.log: 163/163 full tests passed.

## Verification Commands

Commit-time reruns are in development/evidence/commit-validation.json (14 focused / 163 full tests; six commands exit 0). Earlier results are in development/evidence/command-results.json: focused tests, npm test, npm run bundle, node --check app.js, node --check i18n.js, git diff --check all returned exit code 0. The source hashes and uncommitted HEAD relationship are in review-source-manifest.json. implementation.diff includes tracked changes and both new source/test files.

## Actual-source Browser Evidence

- browser-seven-values.json: actual DOM's seven values equal the unchanged classic renderer across 8 date/group combinations, including empty periods.
- browser-sort-compatibility.json: native select spent sorting preserves row content, data, focus, expanded monthly DOM group and line toggle; no storage or blocked business calls.
- browser-sort-other-keys.json: dispatched change events cover received/ROI/net round trip with data/scale content preserved.
- browser-help-hover.json / browser-help-readable.json / browser-help-all.json: native hover and pointer transfer, native Escape, all six translated safe-text/ARIA descriptions and bounded rectangles.
- browser-mobile-keyboard.json / mobile-keyboard-summary.json / mobile-six-keyboard.json: native Tab through all six headers, 390px and 320px, 44px targets revealed past the fixed first column, valid tooltip geometry and Escape cleanup.
- mobile-help-lifecycle.json: redraw preserves focus and scroll without reopening; first deliberate hover reopens; horizontal clipping removes the tooltip and ARIA relationship.
- mobile-native-tap.json and tap-close-detail-open.json: native iPhone 15 emulation, trusted pointerType=touch opens a pinned tooltip and a second native tap closes it. Not a physical device test.
- browser-form-protection.json / browser-context-lifecycle.json: filled synthetic detail draft and its input node survive sorting attempts/redraw; busy Escape is protected; in-view filters/range/theme/locale retain sort; owner/viewing-user/tab/view/classic/logout clear it.
- browser-existing-guards-final.json: overview/monthly/company share one tooltip, vertical scrolling cleans it; company scroller has no vertical overflow; invalid date suppresses lower financial reports via the existing notice; loading/inactive/error-banner paths preserved.
- theme-locale-matrix.json: 224 actual DOM cases = 4 widths (320/390/1024/1440) × 7 palettes × 2 themes × 2 languages × default/custom P&L colors. Custom sample colors are #3868da/#bb4389. Checks cover seven columns, full numbers, local overflow, fixed column, finite signed bar geometry, target size and inherited computed colors. Not certification of arbitrary user-color contrast.
- browser-boundaries-scoped.json: 14 narrow-screen zh/en states, including empty period/refund/pending/large/long/single/hidden/no accounts.
- browser-logo-fallback.json: an intentionally missing local image returns to visible initials; the expected local 404 is not a service request.
- browser-diagnostics.json: no page errors or console messages at observation, blocked calls empty, no external resource origins.
- implementation-company-final.png / implementation-mobile-help.png: manually inspected nonblank runtime screenshots. A selector-only screenshot was blank due to the browser capture issue; the final artifact was replaced with an inspected full viewport capture, not fabricated or cropped into evidence.

## Independent Read-only Findings

job_mvs20zwg_1 and job_mvs21nnm_2 completed read-only checks. Neither confirmed a production-code defect; both identified test/evidence gaps. Main agent checked the cited locations, strengthened the DOM sort fixture and added native touch, six-field keyboard, form/context, exact seven-value and guard evidence. Scouts did not run tests or issue a formal SpecNav approval. Their findings are leads, not owner acceptance.

## Concerns

- The old top company-filter chip can overflow a 320px viewport with an extreme unbroken synthetic name. The new table wraps the same name and remains contained; page width is unchanged with the company panel hidden (long-name-overflow-scope.json). Existing filter styles are out of scope and were not changed.
- browser-sort-roundtrip.json records a rejected tool script orchestration (explicit sessions are not allowed inside browser script mode); it is not a passed test. Direct native/select and DOM-event checks supersede it.
- browser-existing-guards.json records an incorrect test expectation: invalid dates preserve the existing financialUnavailable notice rather than amount-error class. Source was checked and corrected expectation rerun in browser-existing-guards-final.json, without changing product behavior.
- browser-boundaries.json records the existing top-filter overflow investigation; scoped follow-up explicitly reports that limitation, not a silent passing whole-page claim.
- Headed software-rendered Chromium was used on an isolated local session. No physical-device certification, real-ledger write test, AI/verifier independent approval or Verification V2 receipt is claimed. Subsequent owner approval and local checkpoint authorization are separately recorded.

## Scope Deviations

None in product code. No edit to classic CSS, data/persistence, global render/events, dependencies, schema/RLS, configuration, real data or previous-change records. Generated app.js was produced only by npm run bundle.

## Adjudication

The owner's human decision is the approval source; bounded scout reports and controller test executions are supporting evidence, not invented independent verdicts. Keep task 1.4 open and frozen acceptance assertions unpassed until native acceptance/handoff receipts exist. The local implementation checkpoint is now authorized; no push/deploy. The existing filter-chip edge case remains explicitly out of scope.

## Follow-up Needed

Owner reviewed the connected local page and approved committing the unchanged implementation. Only the local commit is authorized; remote push and deployment still require a separate instruction. Native acceptance/handoff receipts remain pending and all seven frozen assertion identities remain unchanged. Existing local evidence includes synthetic screenshots/logs that are intentionally not all included in this commit; no private page capture or account data is committed.

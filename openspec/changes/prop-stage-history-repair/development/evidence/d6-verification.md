# D6 — funnel account-list logos: local validation

Local validation snapshot: implementation was checked before Git delivery, against baseline `13f4eed`. The source-hash/command record below captures that pre-commit state. Subsequent owner authorization and delivery scope are recorded in `../d6-git-delivery.md`. This is not formal SpecNav acceptance or handoff.

## Scope actually changed

Only the left avatar interpolation in `src/11h-prop-linkage.js` changes from the fixed funded glyph to the existing `propHistoryLogo(a)` presenter. Company-table output, logo resolver, CSS, public assets, translations, main funnel glyphs, financial calculations, filters and write interfaces remain unchanged. Alpha Futures, Nexgen and YRM still use letter placeholders when no catalog logo is available. The initial authorization covered implementation; the later owner request authorizes test-branch Git delivery separately.

Native standard entry: `d6-entry.json` reports `ok:true`, no blockers. Shared seam checked by read-only scout `job_mvtjooee_3` and parent verification of the cited source; the file-level native review override is not formal acceptance. Baseline task IDs/frozen assertions were not changed.

## TDD and commands

- `test/prop-linkage-logos.test.js`: four added synthetic tests. Before source edit: three failures specifically for absent logo markup, one passing unchanged-company/data case (`d6-red.log`). After edit: 4/4 (`d6-green.log`).
- Local path resolution, missing/unsafe/stale-reference letter fallbacks, escaping, image-error fallback, all four stage lists and both partitions on all three conversion edges, report counts/order/detail actions, untouched company table and input data are covered.
- Full suite: 216/216. Bundle, app/i18n syntax and diff format checks all exit 0. `d6-command-results.json` binds the source/test hashes and individual logs. These are local checks, not Verification Runtime receipts.

## Actual-source browser checks

Reused the existing isolated harness `dev/prop-history-check`, serving current src without config or auth/init. URL during this check: `http://127.0.0.1:46589/`. Synthetic fixture only; no connected-site refresh, real-account access or business writes. Browser identity `ifvg-logo-software` is separate from the authenticated application.

- `d6-browser-initial.json`: native funded-stage click opens five rows, all expected local images decode successfully, no writes/blocked calls.
- `d6-browser-return.json`: native click directly on the logo opens the existing detail; native Back returns to the same row focus. Company markup and account/entry/catalog data are byte-identical before/after.
- `d6-browser-fallback.json`: intentionally invalid inline image bytes cause a real decode error; existing capture error handler hides the image and reveals its letter. No external request. Afterwards the fixture was enriched in browser memory with explicit missing-logo demo names for layout checks; no harness or catalog source was edited.
- `d6-browser-layout.json`: 84 cases (7 palettes × light/dark × zh/en × 1440/390/320 widths). Each has seven account rows, four loaded local logos and three letter fallbacks, fixed 38px avatars, no sheet/row overflow, unchanged company output and data. No remote resources or writes.
- `d6-browser-cohort.json`: native conversion-edge and partition clicks on 320px show the correct four unconverted demo rows, two logos/two letter fallbacks; selected-tab focus retained.
- `d6-browser-keyboard.json`: native Home → Tab → Enter switches to converted, focuses a row and opens SIM-A detail with the existing Back control; zero writes.
- `d6-desktop-logo-list.png` and `d6-mobile-logo-list.png`: visually inspected synthetic screenshots. The first selector capture showed an offset/crop artifact; it was replaced by a verified full-viewport capture after returning scroll to zero. Do not treat the earlier crop as UI evidence.

## Remaining boundaries

No image assets or brand-name mappings were added. The isolated validation above did not use the connected Supabase application. Later, at the owner's request, public application resources were synced to the existing connected local preview while preserving configuration and login; only loading/display were inspected, without manually invoking history/status/ledger saves. Normal application initialization can run existing renewal/activity logic. No live business write test or schema change was performed. Physical-device/assistive-technology testing and formal acceptance were not performed. Previous unrelated verification/runtime blockers and data-check limitations remain outside D6. Detailed browser records, screenshots and raw logs referenced here remain local-only; the selected public summary and hash records do not include private browser data.

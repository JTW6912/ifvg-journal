# History drawer styling — approved local delivery

## Scope and final appearance

The only production change is `theme-modern.css`. The history correction drawer now matches the existing modern account-detail drawer: 640px maximum width, consistent heading/body/footer spacing and shared button appearance. The final timeline deliberately replaces the earlier enlarged, horizontally scrolling iteration.

- Date controls use the outer timeline's 12px font and 27px height; state labels use 11px text. Normal capsules match the outer padding, rounding, colors and approximately 37px height.
- Existing connector and stage siblings form multiple paired grid rows: two groups at desktop widths and one on narrow screens. Long removal text wraps within its cell. There is no horizontal timeline scrollbar or clipping mask.
- Compact pointer controls are at least 24px; the coarse-pointer branch retains 44px controls. Mobile footer actions remain 44px and keyboard focus remains visible.
- No JavaScript, templates, account data, cashflow, schema, permissions or classic-layout styles were changed.

Reviewed production CSS SHA-256: `1000093c9ec041a8c443870237e5e1e7a059b0d4b8bb7dd4a2cb7b9977082233`.

## Owner decision

On 2026-10-30, after viewing the compact multiline revision, the owner said:

> 可以请同步链接supabase ，然后进行代码提交

This records approval of this visual revision and authorization to synchronize the existing connected local application and make a local code commit. It is not authorization for remote push, deployment, further business-record writes or approval of older standard-lane feature verification.

## Acceptance evidence

- **LIGHT-001:** `ui-checks.json` records 896 combinations across 1440/1024/390/320px, seven palettes, two themes, two languages and eight drawer states. Checks included drawer/body/timeline containment, styles compared with the actual outer detail, valid/invalid/busy controls and footer visibility. Both classic-theme baselines remained unchanged.
- **LIGHT-002:** The same evidence covers compact typography, control geometry, translated/removed text, focus, pointer remove/restore and keyboard selection. A separate eight-case coarse-pointer CSS branch check verified 44px targets without overflow. It restores the temporary CSSOM change after checking.
- **LIGHT-003:** Normal, long, inserted, removed and confirmation/review states wrap within the drawer, with connector/step pairing and no horizontal overflow. Draft-only interaction checks cover insertion, removal/restoration, Escape and keeping edits. Synthetic account/entry snapshots remained unchanged; no transport requests or external resources were used in these isolated checks.
- `commit-checks.json` binds the same CSS hash to the latest rerun: **326 tests passed**, zero failures/skips/cancellations, successful bundle, both JavaScript syntax checks and `git diff --check`.

Raw local diagnostics and synthetic screenshots are intentionally excluded from this commit. The condensed evidence above contains no live account information. Responsive checks are browser emulation, not physical-device certification; the coarse rule was tested explicitly because the device preset did not report a coarse pointer.

## Connected preview and delivery boundary

Only the stylesheet was copied to the existing connected local application's public-resource copy. Configuration and other resources stayed unchanged. The browser fetched the matching CSS hash through a stylesheet-only update; its authenticated session, account/entry caches and modal state were preserved. No full application reload, historical correction, cashflow edit or database migration was performed for this delivery.

The light-lane development handoff is checked independently for this CSS change. Older feature verification remains separate; these records do not claim full Verification 2.0 completion. The authorized destination is a local `prop-test` commit only, with no remote push.

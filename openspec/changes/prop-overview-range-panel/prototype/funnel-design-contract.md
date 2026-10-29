# Account funnel extension — design review draft

## Status

A local interactive design draft, awaiting user visual review. It is NOT production implementation, formal prototype acceptance, or permission to commit/push. The existing connected application and authenticated browser session have not been changed. The original overview handoff does not approve this new visual artifact.

Entry: `artifact/funnel.html`. Its runtime is `funnel.css`, `funnel.js`, and the existing synthetic `assets/shell-snapshot.js` plus project styles. All 18 accounts are generated synthetic fixtures. CSP denies connections, forms and external resources. No authentication, storage, API, Supabase or real records are loaded.

Read `/root/.cache/ifvg-funnel-preview/server.json` for the running loopback URL and owned PID. Do not assume the port is fixed. Only the prototype artifact directory is served, not the repository or config.js.

## Confirmed user requirements

1. Modern overview's date range also controls lower overview data. Stage counts describe events actually occurring in the selected period, not just a purchase-date cohort.
2. Keep the funnel and conversion percentages. An edge's denominator is the preceding-stage cohort in the period. Its numerator follows those same accounts through the next stage up to the period end. Never divide unrelated displayed stage totals.
3. Stage counts and conversion percentages open their corresponding account lists; an account can lead to its existing detail view.
4. Current account stage counts in the financial panel open My accounts at that exact current status, preserving firm/group scope, not applying historical finance dates.
5. The user explicitly requests https://github.com/shadcn-ui/ui as the funnel design source. Adapt within the existing native JS/CSS product and theme system; no React migration or package installation is authorized.
6. Revision 2: the user rejected four peer cards and requested an unmistakable left-to-right progressively narrowing funnel. Restore the omitted exam pass rate / number of decided attempts and average cost per funded account / formula from the existing footer. Do not copy the private screenshot's numeric values into the synthetic artifact.

The numeric cohort policy is approved. The visual composition below is proposed, not yet approved.

## Official source evidence

Inspected via agent_browser, using a separate public-source session:

- Repository registry README: `https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry` explains authored `bases/base` vs generated style combinations.
- Card: `https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/bases/base/ui/card.tsx` — header/content/footer slots, component composition.
- Button: `https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/bases/base/ui/button.tsx` — outline/ghost variants, disabled and keyboard focus behavior.
- Sheet: `https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/bases/base/ui/sheet.tsx` — portal, right-side popup, labelled title/description, close and footer structure.
- Nova styles: `https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/styles/style-nova.css` — Card 16px spacing/rounded-xl, muted footer with top divider, compact Button controls, secondary/outline Badge, right Sheet with muted backdrop. Relevant Card/Badge/Button/Sheet rules were read directly; this is not a claim to have audited the entire repository.
- License: `https://github.com/shadcn-ui/ui/blob/main/LICENSE.md`; retained in `shadcn-license.txt`.

These URLs track main and are not a pinned vendored dependency. Source was inspected for this design round, not installed. The funnel is a composition of primitives, not a claimed official business-funnel component.

## Mapping / adaptations

- Existing fonts and `--surface`, `--surface2`, `--border`, `--text`, `--muted`, `--accent` remain authoritative.
- Namespaced bridges: `--ui-card`, `--ui-muted`, `--ui-line`, `--ui-ink`, `--ui-subtle`, `--ui-brand`, `--ui-on-brand`.
- Enclosing project panel retains 24px desktop padding and radius 14px. Revision 2 removes the inner Card grid. Four adjacent SVG trapezoids form one continuous left-to-right taper, with native stage buttons and separate outline conversion buttons at their joins. Their gentle tint derives from the user's accent, not hardcoded P&L colors.
- Stage labels 14px; numbers 48px desktop / 42px mobile; count labels and actions 12px. This is not a change to the approved financial-panel typography.
- Each stage button opens event accounts. Inter-stage buttons show the same-cohort percentage and fraction; the keyboard order alternates stage, edge, stage. A visible caption states that the schematic taper represents progression, NOT proportional counts. Period-stage populations may differ, so neither shape heights nor their products claim a numeric survival rate.
- The narrow layout keeps a locally scrollable horizontal funnel (800px internal minimum) instead of a 2×2 grid; the page itself must not overflow, and the scroll area is keyboard-focusable with a descriptive label and visible swipe hint.
- The bottom summary restores pass rate / decided attempt count and cost per funded account / formula. Synthetic extra failed attempts include two separate failures on one account, each counted, and synthetic fees produce auditable values (period: 8 passes + 3 failures, $1,480 invested / 6 funded). Empty denominators show em dashes. These are review fixtures, not production metric implementation.
- The received-payout stage has no invented 100% next edge.
- The right-side roster uses a native `dialog` in this draft, with Escape/focus isolation, a visible close button and account items. This is NOT an installation or behavior-parity claim for Base UI.
- Sheet width is increased from Nova's default to 520px for account/date information; it occupies the viewport width on phones. Mobile controls are enlarged to at least 44px.
- Reduced motion is respected. Theme and language controls affect only the draft and are not shipped business controls.

## Deliberate limits / non-decisions

- This draft reviews the four-stage body and its roster interaction; it does not replace the entire overview page.
- The current-status card is shown separately ONLY to demonstrate the requested jump. Production must keep it within the already approved financial panel, not move it below the funnel.
- Revision 2 restores the legacy auxiliary fields visually. The draft proposes applying the selected range to decided attempts, investment and funding events; all-time copy retains the original total-investment formula. This period cost is a spending/funding activity ratio, not acquisition cost for a matched cohort. Production edge cases and formal range semantics still require requirements/acceptance synchronization; this draft is not that approval.
- Existing month/company finance linkage is not implemented or demonstrated here.
- The visible sample-range selector is review tooling; production retains the approved two-month calendar.
- The detail view contains synthetic read-only fields. Production should reuse the actual account detail entry, not copy this fixture-only form.
- Repeated/reset/instant-account/missing-event-date edge cases still require production-model tests. The simple fixture model is not a replacement for production data derivation.

## Conditional surfaces and anchors

- `funnel/panel`: period/all/empty cases; four phase counts.
- `funnel/directional-flow`: schematic continuous taper, horizontal scroller and proportionality disclaimer.
- `funnel/stage-bought|passed|funded|paid`: count buttons, inter-stage conversion buttons and zero-denominator disabled state.
- `funnel/summary`: restored exam pass rate / completed attempts and average funded cost / formula.
- `#accountSheet`: stage roster; converted/unconverted same-cohort tabs; read-only account detail and return-to-list.
- `funnel/current-status`: current-stage links.
- `funnel/accounts-view`: exact stage filtering, retained firm/group and reset to all statuses.
- Draft themes: seven existing palettes, light/dark, zh/en; a single left-to-right flow on both desktop and narrow screens (locally scrollable when needed).

## Revision 2 checks (draft only)

- `evidence/funnel-v2-rosters.json`: stage Passed opens 8 accounts; first conversion opens 3 converted / 7 unconverted; keyboard tab switching, detail and back preserve lists.
- `evidence/funnel-v2-summary.json`: period, all-time and empty summaries checked against synthetic attempts/fees; zero denominators produce em dashes, not 0% or $0.
- `evidence/funnel-v2-theme-contrast.json`: 28 palette × theme × locale combinations at 1280px without document overflow; newly tinted stage action/count text has at least 4.5:1 contrast on normal and hover surfaces (not a whole-app accessibility audit); taper endpoints join monotonically; DOM keyboard order matches the visual progression.
- `evidence/funnel-v2-mobile-scroll.json`: 390px English dark view scrolls to the final stage without page overflow; complete summary text is present.
- `evidence/funnel-v2-mobile-interaction.json`: scrolled payout stage opens 4 rows; firm B / Batch B funded jump preserves both filters and shows 5 accounts.
- `evidence/funnel-v2-keyboard.json`: at 375px, focus the scroll region, Tab twice, Enter opens the 3-account conversion list; Escape dismisses it. Conversion targets measured 78×62px.
- Screenshots: `funnel-v2-before.png`, `funnel-v2-desktop.png`, `funnel-v2-dark-sky.png`, `funnel-v2-mobile-dark.png`. The browser runs synthetic data only; no connected application interaction.

## Initial four-card checks (historical; superseded visually by revision 2)

- `evidence/funnel-cohort.json`: phase counts 10/8/6/4 vs conversion 3/10, 4/8, 3/6; selected 30% opens exactly 3 synthetic accounts.
- `evidence/funnel-status-navigation.json`: unconverted list contains 7; firm B + funded jump shows My accounts and exactly 5 accounts.
- `evidence/funnel-detail-and-empty.json`: account detail and back return to 3 rows; empty period disables all 3 zero-denominator conversions.
- `evidence/funnel-mobile-layout.json`: English dark at 390px has no page/card horizontal overflow; current-stage targets are 48px.
- `evidence/funnel-theme-layout-matrix.json`: all 28 palette × theme × locale combinations at 1280px have no document or stage-card horizontal overflow (geometry only, not a complete contrast/accessibility audit).
- `evidence/funnel-browser-diagnostics.json`: no page errors or console messages in the isolated prototype session.
- Screenshots: `funnel-desktop-light.png`, `funnel-accounts-sheet.png`, `funnel-mobile-dark.png`.
- `node --check artifact/funnel.js` succeeded. These checks are not formal production verification or physical-device tests.

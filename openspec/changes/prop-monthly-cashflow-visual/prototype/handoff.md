# Prototype Handoff: prop-monthly-cashflow-visual

## Approved Branch Variant

- Prototype branch: `ui-html`; variant: `original-bars-optional-lines`; Git target: `prop-test`.
- Entry: `artifact/index.html`, final source and design direction in `design-contract.md`.
- Owner explicitly approved development with “开始开发吧” after the last requested adjacency adjustment. Approval covers the final preview, not the superseded full-chart redesign or far-right metrics.
- Evidence: `verifier-report.json`, `evidence/monthly-default-final.png`, `evidence/month-header-adjacent.png`, `evidence/header-adjacency-check.json`.
- Production source must be reimplemented under the development entry gate, never served from the prototype snapshot bundle.

## Screens Or Flows

Modern Prop overview / monthly cash flow only: existing twelve month bars and selected-month ledger, annual/range summary, default-off line toggle, field-level recovery help. Existing overview date/company/group filtering is retained. Classic is unchanged.

## Components To Create

- CMP-PROP-MONTHLY-COMBO: narrow presentation controller for optional received/invested line geometry, toggle, resize and selected-month visibility. Keep the existing bars as the geometry/scale reference, with two line series only.
- CMP-PROP-KIND-ICON: namespaced, uniform SVG helper for seven monthly ledger kinds and summary/header decorations.
- Modern monthly summary/footer and date-adjacent metric markup; not new independent dashboard cards.

## Components To Reuse

- `renderPropMonths`, `renderPropMonthDetail`, existing monthly grouping, month/year actions and real account-detail entry.
- `propMonthly`, `propSum`, `propUsd`, `propUsdShort`, `propTone`, date-range/month helpers, `T`, `esc`.
- Existing render lifecycle and Prop field-help controller where feasible; preserve its other field messages and dismissal semantics.
- Existing theme/palette/P&L variables and layout discriminator.

## Extraction Targets

Keep new monthly presentation helpers/controller in a focused Prop source file rather than adding another large UI subsystem to `11e`. Financial calculations stay in existing helpers, not DOM-event handlers. New tooltip text uses the common lifecycle and safe text output; no second uncoordinated portal framework. No unrelated architecture refactor.

## API Contracts

No new backend request, database/RLS change, dependency or preference persistence. Existing owner-authorized caches remain the only data input. Prototype fixtures, mock detail dialog, theme controls, review kit and hardcoded 2026 bounds are never production inputs.

## Data Flows

- FLOW-PROP-MONTHLY-VISUAL: scoped entries -> existing monthly totals -> original bars plus optional matching lines.
- FLOW-PROP-MONTH-SELECT: existing month/year controls -> same values, date intersection and grouped entries.
- FLOW-PROP-HELP: recovery i -> localized formula/range totals -> hover/focus/tap/Escape cleanup, no requests.
- FLOW-PROP-ENTRY-DETAIL: existing ledger row -> existing real detail, without changing draft/back/save behavior.

## State Behavior

- Loading: existing loading path; remove stale overlay observers/portals. No new network loading state.
- Empty: preserve zero/empty ledger behavior; no invented line; omit recovery percentage when net investment is not positive, matching existing rules.
- Error: preserve existing error banners; do not draw non-finite geometry or fabricate missing dates.
- Disabled: retain range-excluded months and year bounds; never connect across excluded months or extrapolate unavailable future zeroes.
- Permission: no new privilege. Identity changes clear ephemeral overlay state and stale resources; owner-only data isolation remains unchanged.
- Toggle: off initially and on reload; retain while selecting month/year/range or changing theme/locale within the same overview; clear when leaving the modern overview or switching identity. No persistence.
- Mobile: default bars remain original. Lines may use local horizontal scrolling and keep the selected month visible; no document overflow. Recovery i target 44px.
- Footer: actual received/net-investment percentage may exceed 100%; bar still caps at 100%. Reporting range may span more than the displayed year; explain through nearby i, not a permanent verdict/footnote.
- Month header: calendar/month/date group immediately followed by invested/received/net; all left-aligned, stacked on mobile. No far-right separation.

## Theme And Locale Policy

- Theme support: `light-dark`; modes shown: light and dark; all seven palettes and custom P&L colors.
- Theme toggle: existing product controls only. The prototype's review controls are intentionally excluded from production.
- Internationalization: enabled; locales shown: zh/en; default: existing en fallback with stored/browser precedence.
- Locale switcher: existing product settings only; no new monthly language switch.
- Use namespaced modern-only CSS and low-specificity hover/base rules so selected states still win.

## Out Of Scope Items

No top finance/funnel redesign, classic changes, accounting/range policy changes, account/status/renewal writes, directory edits, new data requests, schema/migrations, React/Recharts installation, real-account tests, push or deployment. Previous change records remain untouched. The owner separately authorized the local documentation/task-only baseline commit with “允许提交”; no business implementation, configuration, screenshots or other changes enter that commit, and no push is authorized.

## Required Tests

1. Default/off/on/off preserves original bars and amounts; exactly two matching series; range gaps, empty periods, zero values, refunds and pending semantics.
2. Year/range/month interaction preserves global scope and date intersection; header values match original production helpers and stay beside the date.
3. Cost-recovery ratio/progress and safe localized help; hover/focus/tap/Escape, focus restore, resize/redraw and identity/layout/page cleanup.
4. Actual grouping/detail/form compatibility; no business write calls; classic rendering regression.
5. Full offline Node suite, bundle/syntax checks, isolated actual-source browser checks across mobile/desktop, zh/en, seven palettes/light-dark and custom P&L colors.

## Open Risks

- SVG endpoints must follow the live bar geometry after responsive reflow, without creating ghost connecting paths or recursive resize work.
- Shared renderer/tooltip hooks require independent read-only evidence review; review reports must not be fabricated.
- Existing browser driver can miss offscreen clicks and selector screenshots; explicitly scroll and inspect postconditions, prefer full viewport/page images and visually inspect them.
- Earlier prop-overview-linkage formal Verification remains blocked by the separate Linux sandbox-exec compatibility issue. Prototype evidence neither resolves it nor certifies this implementation.
- Visual decisions are settled; documentation/task baseline and development entry are still required before production edits.

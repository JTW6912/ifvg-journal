# Requirements: Prop monthly cash-flow visual implementation

## Feature Summary
Implement the user-approved final monthly preview in the modern layout, preserving the current product rather than redesigning its accounting or navigation. The owner explicitly said “开始开发吧” after reviewing the final date-adjacent metrics. User asked for received and invested lines; these are monthly cash-flow series, not a third profit line or cumulative equity curve.

## Users & Actors
Existing Prop owners (including administrators viewing their own records). Production consumes existing authorized caches; all development tests and preview evidence use synthetic identities/transactions, without real account access.

## In Scope
- R1: Preserve the current monthly panel, twelve month cards, original up/down bars and gradients, selected-month highlight, year navigation, net labels, right-hand annual/range summary and recovery progress, and month-ledger interaction. The user's latest screenshot explicitly confirms these as good. Do not redesign the chart layout. The user's subsequent summary-only request permits adding consistent icons to its labels and replacing the recovery footer's verdict/footnote, while retaining the three financial amounts and the existing progress bar.
- R2: Default to bars only. Add a default-off show-lines button; activating it overlays exactly two monthly cash-flow lines on the existing bars without replacing the chart. Deactivating it restores bars-only. The lines share the existing bars' USD scale and zero axis. Received uses positive P&L color and a solid line; invested uses negative P&L color and a dashed line. Exact values and labels remain available without relying on color. Line endpoints match monthly values, use straight segments without smoothing overshoot, and never extend into out-of-range months. Refunds reduce investment; negative investment is a refund surplus above zero, not received payout.
- R3: Apply shadcn-inspired restraint only to the new toggle, overlay legend and optional overlay tooltip. No new y-axis/grid, rearranged financial rows, faded replacement bars or redesigned month cards. In the summary footer use neutral Cost recovery / 投入回收率 with the actual received/net-investment percentage instead of 已回本; keep the existing capped progress fill. Move the reporting-range/refund/pending explanation and its range-level totals into a nearby hover/focus/tap i tooltip instead of a permanent footnote or duplicated profit verdict. Do not conflate this percentage with ROI or the displayed year's scope. No decorative or invented trend. Preserve net = received minus net investment; pending payouts remain excluded. A zero-activity month within the covered range is zero; excluded months are unavailable, not fabricated zeros.
- R4: Refine the selected-month detail header into a calendar/month/date-range group immediately followed by three compact icon/label/value groups (invested/received/net), all left-aligned together rather than placing metrics at the far right. Preserve the exact selected month, range intersection and all displayed financial values. Do not add three separate cards or another date picker; stack responsively on mobile. Replace mixed emoji/text ledger-kind symbols with consistent 24-viewBox thin-line SVG icons for purchase, monthly, reset, activation, payout, refund and other. Keep text labels, amounts, group expansion, and account-detail affordances.
- R5: Keep current global reporting scope, firm/group scope and private-ledger permissions. Reuse the real existing grouping and account-detail entry points in production; do not promote the prototype's mock dialog. Test full/partial ranges, empty intervals, refunds and pending payouts. The line toggle is ephemeral UI state, off initially/reload, retained during month/year/range/theme/language changes within the same overview, and cleared on identity or overview/layout exit. Do not persist it.
- R6: Reuse project theme tokens, fonts, light/dark, seven palettes and zh/en. Production inherits existing custom P&L preferences; the prototype's theme/color controls are not promoted and no new preference writes are introduced. Desktop and mobile include keyboard focus, monthly selection and readable non-clipped tooltips; narrow screens may scroll the chart locally without overflowing the page.

## Out of Scope
No database/API/RLS changes, new requests, real business tests, account writes, renewal changes, framework/library installation, push or deployment. Do not redesign the approved top panel or funnel. Classic remains unchanged. Production edits require the normal development entry gate. The owner first authorized the documentation/task-only baseline (“允许提交”), then explicitly approved the current implementation after manual connected-page review (“我觉得可以了，提交代码吧，人工已审核”). The local implementation/test/review-record commit is now authorized; exclude configuration, screenshots, other changes and private data. This is not push/deployment or automated real-ledger write-test authorization.

## UI Design Impact
Use openspec/specs/ui-design/design.md, existing shell/CSS, the supplied screenshots as visual-only evidence, and shadcn official chart-line-multiple/chart-bar-multiple. Keep product typography rather than importing Geist; bridge chart and surface tokens, never overwrite project accent semantics. Implement only the monthly presentation within the existing real app shell; the focused synthetic prototype remains the approved visual reference.

## Architecture & Database Impact
Native HTML/CSS/JS and SVG; no React/Recharts migration. Production reuses propMonthly/propSum and the existing render lifecycle. No schema/entity/API change. Historical foundation statements that this view was not range-linked describe the earlier panel-only scope; current e0c7944 and prop-overview-linkage R1/R2/R10 are the current range behavior, retained here.

## Frontend-Backend Data Flow Impact
FLOW-PROP-MONTHLY-VISUAL consumes already range-scoped monthly aggregates. FLOW-PROP-MONTH-SELECT changes a local month and ledger view only. FLOW-PROP-ENTRY-DETAIL remains an existing application seam. No additional request or storage write.

## Component Architecture Impact
Reuse shell, palettes, format conventions, monthly model and ledger structure. Isolate monthly chart geometry/tooltip/selection and a reusable ledger-kind icon helper; avoid adding graph geometry to accounting code. Keep presentation-only state local; model inputs immutable.

## Theme & Locale Capability Impact
Theme light-dark with existing production toggle; preview-only controls permitted. Seven palettes; pnlPos/pnlNeg. Internationalization enabled: zh,en, en fallback with existing user/browser preference precedence. Include both languages and light/dark in preview checks.

## Unresolved Gaps
No unresolved product-design decision. Final prototype was explicitly approved for development by the owner's “开始开发吧”. Local baseline/entry, implementation reviews and validation remain separate obligations; this approval does not claim them complete.

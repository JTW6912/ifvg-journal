# Behavioral acceptance

- A1 / R1–R2: One bounded date selection makes the financial panel, monthly bars/detail and company financial totals agree, including partial months, cross-year ranges, empty periods and cancelled drafts. Verify with pure tests and the offline actual-source browser harness.
- A2 / R3–R4: A fixture with ten interval purchases and eight interval passes, only three belonging to those purchases, shows 30% (3/10) rather than 80%. Repeated events, payout positivity/pending, inclusive boundaries, all time and inverted/missing chronology are tested.
- A3 / R5,R9: Stage and conversion lists have exactly the IDs used in the corresponding counts. Converted/not-converted partitions cover the source cohort without overlap; rows reach existing detail, and close/back/Escape/focus and stale-context cleanup work without writes.
- A4 / R6: The approved continuous horizontal funnel and both bottom summaries/explanations are present; connections are clickable, mobile scroll is local and the diagram is not presented as proportional stage volume.
- A5 / R7: Pass-rate attempt counts, cost per funded account and company pass rates share explicit interval attribution. Reset failures count, instant funding does not invent a pass, zero denominators are not misleading and refunds retain signed investment.
- A6 / R8: Each current-state control navigates to its exact current status, keeps company/group scope and ignores the financial date; selection is visible and clearable, with no stale batch selection.
- A7 / R9–R10: No new remote calls or ledger mutations occur; existing unsaved forms, financial date/help controls, classic output and unrelated Prop paths retain their behavior.
- A8 / R10: Native JS build/syntax, bilingual labels, theme/palette/custom-P&L colors, large numbers, keyboard accessibility, empty/incomplete data and narrow/desktop layouts pass offline checks and independent review.

Only synthetic offline evidence counts. A prototype result is not production acceptance. Keep assertions failing until linked implementation evidence exists; business code remains uncommitted unless separately authorized.

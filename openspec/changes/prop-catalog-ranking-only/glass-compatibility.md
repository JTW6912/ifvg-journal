# Glass compatibility extension

## Owner intent
On 2026-10-30 the owner reported that switching to Glass removes the developed Prop overview/catalog while switching back to modern restores them. They requested Glass to inherit the developed modern functionality. That initial request authorized a local compatibility fix, not a new design or account preference write. Subsequent explicit owner requests authorized connected-preview synchronization and commit/push to prop-test; see development/git-delivery.md. Real business writes and formal acceptance remain outside this delivery.

## Evidence and scope
`src/04-helpers.js:197-221` defines Glass as the same `data-layout="modern"` structure with a separate `data-glass` material. `currentLayout()` returns the actual persisted layout; `isModernLayout()` expresses shared structure. Exact equality checks in Prop choose classic rendering or disable/reset modern-only controllers under Glass.

Replace only structural modern comparisons in `11e-prop-view`, `11f-prop-admin`, `11g-prop-overview`, `11g-prop-recommendation`, `11h-prop-linkage`, `11i-prop-months`, `11i-prop-firm-info`, and `11j-prop-firms`. Keep `currentLayout()` for preference storage and existing context identity (including history drafts). Reuse existing markup, components, finance models, permissions and handlers. No CSS, schema, authentication or financial changes.

## Verification
G1–G4 in acceptance.md add compatibility checks without mutating frozen A1–A4. Use synthetic VM fixtures and the isolated catalog harness, with no config.js/init or external network. Compare ordinary modern and classic outputs against the pre-edit working-tree snapshot (which includes the authorized but uncommitted ranking change). Exercise material switching, date/help, charts/sort, lists/history and admin entry without real saves. Run full tests/bundle/syntax/diff checks and independent read-only source review; formal acceptance remains pending.

## Task/baseline preservation
Tasks 1.1–1.4 remain unchanged from the tracked 7c63118 baseline. Add 2.1–2.3 to the same existing implementation slice and update its scope/context before rerunning requirements, prototype and development entry. No new baseline commit is claimed or made. Component-seam approval means reuse of the already established modern behavior, not a claim of a newly reviewed visual prototype.

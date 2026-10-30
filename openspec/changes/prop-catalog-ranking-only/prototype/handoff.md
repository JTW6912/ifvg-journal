# Catalog composition handoff

## Approved Branch / Variant
component-seam / existing-modern-ranking-only. User requested current ranking alone and confirmed local baseline and connected preview. This is reuse/removal composition approval, not a claim of reviewing new screenshots. Entry: component/component-map.md.

## Screens / Flows
Modern catalog home → full ranked cards → unchanged firm detail → back to complete ranking. Classic home remains unchanged. Admin mode keeps the existing board management and toolbar.

## Components To Create
None. No new visual component or shared state.

## Components To Reuse
renderPropCatalog, renderPropBoard, propRecommendationCard, renderPropBoardAdmin, renderPropFirm. Card-local review/update folding remains distinct from removed board-level fold.

## Extraction Targets
None: three narrow branch conditions; no duplicated renderer or business logic.

## API Contracts
No new calls or changed data shape. Existing catalog and account operations remain untouched.

## Data Flows
propFirms cache → existing hidden filter and rank sort → all visible modern cards. Do not mutate arrays, ranks or company data.

## State Behavior
Ignore propBoardAll in modern; retain its meaning for classic. Keep original empty catalog, all-hidden and administrator behavior; no new loading/error/busy behavior. Selected firm uses the existing independent detail branch.

## Theme and Locale Policy
Existing light/dark, 7 palettes, zh/en and preferences remain; no new theme controls, typography or translation keys. Classic output must remain byte-identical.

## Out Of Scope Items
No data edits, dependency changes, database changes, financial calculations or new card design. Price comparison implementation is retained for classic/detail reuse. No source commit or push authorized.

## Required Tests
Synthetic 0/1/6/8/12 companies, hidden/order, stale fold flag, classic/detail hashes, administrator controls, both languages and desktop/phone navigation. Run full unit suite, bundle and syntax checks. Production entry gate must pass before modifying source.

## Open Risks
All firms make a longer page by design; hidden firms must remain hidden to ordinary browsing. Admin board continues hidden-company management. Offline browser and runtime checks follow implementation. User authorized local connected-page resource sync only; formal production review/acceptance remains pending. Product decisions are explicit and complete.

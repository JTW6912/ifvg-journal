# Catalog composition before / after

## Current
renderPropCatalog -> header -> if no firm: board (or admin board) + renderPropCompare.
renderPropBoard -> visible sorted firms -> propBoardAll ? all : first six -> existing card renderer -> global fold control if >6.
Selected firm -> size/legacy controls + renderPropFirm; independent of the homepage return.

## Approved reuse composition
Modern no firm -> same header/admin controls -> same board/admin board. No comparison append.
Modern board -> same visible sorted firms, no slicing and no global fold control; same propRecommendationCard for each.
Classic -> exact existing composition, six/all selection and fold control.
Firm detail -> identical early branch and renderPropFirm path for either layout.

## Public seams
Inputs remain globals propFirms/propPlans/currentLayout/propEditing/propCatalogFirm. No new arguments/state; no catalog data mutation. propRecommendationCard exposes existing prop-cat-firm buttons, review toggles, firm info and updates. Administrator board includes hidden-company management as before.

## Evidence and risk
Directly read src/11e-prop-view.js renderPropCatalog, propRecommendationCard, renderPropBoard; the exact home append, shown calculation and fold condition are isolated. Longer page is intended, no fixed cap of 8. Tests must prove byte-identical classic/detail markup and nonmutation. Existing price-comparison math differences remain out of scope; price comparison functions are retained.

## Glass shared-structure seam (owner clarification 2026-10-30)
`applyLayout('glass')` sets `data-layout='modern'` and `data-glass`; `currentLayout()` returns 'glass' for preferences/context identity, while `isModernLayout()` covers the shared structure (src/04-helpers.js:197-221). The approved target is the existing modern Prop output, not a new prototype design.

Glass → existing modern Prop overview/finance/funnel/months/company summary/accounts/catalog/details, plus the same administrator editor controls. Ordinary modern and classic continue their current branches. Replace only structural comparisons in the Prop view/controller files enumerated in scope.json; do not redefine currentLayout or change data/persistence helpers. Runtime range/month-line/sort state must survive switching between the two material variants; existing modal context identity and owner/readonly/busy checks are retained. Verify with synthetic parity and interaction tests, not real accounts. This map describes intended reuse; runtime implementation remains unverified until development evidence is produced.

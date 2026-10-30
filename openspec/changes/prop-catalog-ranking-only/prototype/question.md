# Composition question

Can the existing modern catalog recommendation board stand alone and display every visible ranked firm, without changing firm details, price-comparison implementation or classic behavior?

Answer from source seams: yes. renderPropCatalog (src/11e-prop-view.js:464-483) already separates homepage and firm selection; renderPropBoard (:692-724) already filters/sorts firms and chooses a modern-specific card. No new UI design or state machine is needed. Only homepage append and shown/control conditions differ. This component-seam prototype records that before/after assembly; actual source/browser verification follows development gate. No live data.

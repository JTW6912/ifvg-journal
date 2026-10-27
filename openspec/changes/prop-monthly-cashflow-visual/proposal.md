# Prop monthly cash-flow visual exploration

User request: refine the existing monthly cash-flow chart and ledger-kind icons; preserve the approved financial logic and interactions; show one received line and one invested line on the same monthly bar chart, with shadcn/ui design guidance.

The owner has now explicitly approved the final prototype for development (“开始开发吧”), including the final left-adjacent month metrics. Implement it in prop-test after the development entry gate. Keep `prop-overview-linkage` history and its unresolved formal Verification status intact. No real-account tests, Supabase writes, push, framework installation or deployment. The owner has explicitly authorized the documentation/task-only local baseline commit (“允许提交”). Do not include business source, configuration, screenshots or other worktree changes; do not push.

Baseline: prop-test e0c7944. Relevant production entry points: renderPropMonths, renderPropMonthDetail, PROP_KIND_ICON in src/11e-prop-view.js; propMonthly/propSum in src/11d-prop-data.js; .propMo* and .propLed* in style.css; modern theme and palettes.

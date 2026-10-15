# Weekly activity pinned-column styling — October 15, 2026

Pending local source based on parent website `e3a9d76` and BodeeGuard `60cafdce`. This is a parent-dashboard stylesheet update; nothing has been deployed or changed in family records.

The weekly report's pinned labels used the translucent card background, allowing daily time values to show through during horizontal scrolling. General dashboard table rules also overrode its intended layout. The report now uses opaque theme-aware pinned cells, a scoped stacking layer and divider, separate table borders, right-aligned times, a visible caption while scrolling and consistent wrapping for long activity names. The Total label uses the same opaque pinned treatment.

Only `public/guard-admin/cloud-weekly-activity.css` and its versioned import in `cloud-monitoring.css` are synchronized from BodeeGuard. No report API, totals, polling, child runtime or other dashboard features changed.

The isolated real-dashboard visual audit reproduced the overlap before the fix at 320 and 390 pixels wide. After the fix, captured label pixels stayed identical while values scrolled behind them. Phone and 1200-pixel desktop checks passed for no page overflow, readable names, pinned labels and reachable weekly totals; screenshots were inspected. Both stylesheets match the BodeeGuard source hashes. Required focused dashboard verification and source evidence are recorded in BodeeGuard `docs/cloud-weekly-activity-scroll-20261015.md` and ignored `.tmp/weekly-scroll-*` files.

Ready to batch with the pending Parent Assistant improvement in the next requested parent website deployment. This CSS fix needs no child installer or API deployment. A current real phone should be checked after publication.

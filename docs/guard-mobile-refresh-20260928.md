# Mobile duplicate refresh hidden — September 28, 2026

The overview Updated/Refresh group is hidden in the existing mobile parent layout.
The top-bar refresh remains visible. The hidden group leaves no empty row or gap.
The selector also follows the existing coarse-pointer mobile/tablet breakpoint.

- BodeeGuard source: `4ace3f0125996e111b25e756197f7bbb798126e3`.
- Website source: `b6112a8a4c65f77a67d3c217facd747193285370`.
- Deployment: `dpl_Gpf1Q4UubXgvUwYJEZQ1qnt98QCj`.
- Candidate: https://bodeebooks-qt4adddeg-vexonastudios-3984s-projects.vercel.app.
- Public https://guard.bodeebooks.com release ID and normalized stylesheet match.
- cloud-mobile.css SHA-256: `339669f83f5b01f91954e2a696ac66fa299fad9e1a68c9dc0d8101df4b97ffde`.
- Rollback deployment: `dpl_wkKBQ5KK9kxEJY1W66P1M2JjoArx`.

`npm run verify:change -- --area dashboard` passed: static/workspace/lint,
177 unit cases in 35 files and 5 isolated Electron scenarios. This is focused
coverage. The existing monitoring Electron fixture also passed. Desktop, 390-pixel
phone and 320-pixel narrow-phone captures were inspected; mobile has only the
header refresh, while the desktop overview refresh continues to display.

One stylesheet rule changed in each repository. The clean production build and
candidate/public exact-source checks passed. No child installer or API deployment
was required; the existing installer remains 1.2.263. Fixtures used synthetic data.

Evidence: BodeeGuard `.tmp/verify-mobile-hide-refresh.log` and
`out/monitoring-preview/abeka-{desktop,phone,narrow-phone}.png`; website
`.tmp/mobile-refresh-b6112a8/` holds the archive, build log and proofs.

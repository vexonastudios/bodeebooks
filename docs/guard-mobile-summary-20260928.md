# Mobile overview summary hidden — September 28, 2026

The global Studying / Computers connected / Subject goals done summary is hidden
in the existing mobile parent layout. The one CSS rule applies when cloud-mobile
is active, including the existing coarse-pointer tablet breakpoint. Student cards
move up without retaining a blank summary gap.

- BodeeGuard source: `d2991f130c0bd9431168f5b2bc48967ad37a2202`.
- Website source: `9b09ceef6a05a6f028c4064b7783eb5c6481047c`.
- Deployment: `dpl_wkKBQ5KK9kxEJY1W66P1M2JjoArx`.
- Candidate: https://bodeebooks-54m21sret-vexonastudios-3984s-projects.vercel.app.
- Public https://guard.bodeebooks.com release ID and normalized stylesheet match.
- cloud-mobile.css SHA-256: `b209d9e2c212ffd4dab37749f281a5b735c4701ed4a202c1f8dbd9ace56500aa`.
- Rollback deployment: `dpl_CNc3tVx254tKP7grzskvdthGwcET`.

`npm run verify:change -- --area dashboard` passed: static/workspace/lint,
177 unit cases in 35 files and 5 isolated Electron scenarios. This is focused
coverage, not a full-suite result. The existing monitoring Electron fixture also
passed. Desktop, 390-pixel phone and 320-pixel narrow-phone captures were inspected;
the mobile summary is absent and the desktop summary remains visible.

Only one stylesheet line changed in each repository. The clean production build
passed; candidate and public exact-source checks passed before/after promotion.
No child installer or API deployment was required; the existing installer remains
1.2.263. Synthetic test profiles were used; no family records or messages changed.

Evidence: BodeeGuard `.tmp/verify-mobile-hide-summary.log` and
`out/monitoring-preview/abeka-{desktop,phone,narrow-phone}.png`; website
`.tmp/mobile-summary-9b09cee/` contains the clean archive, build log and proofs.

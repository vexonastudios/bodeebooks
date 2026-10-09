# Parent report alert and download buttons — 2026-10-09

The parent dashboard now gives pending student problem reports a red alert container with a warning icon and review arrow. The account's child-app version is a download link, and the main Windows download button is larger, padded and green.

## Published website

- Repository: https://github.com/vexonastudios/bodeebooks.git
- Branch: codex/bible-family
- Source: 941feb4576d7882cd5a04c28941f803d4c847b29
- Included changes: 54c5ec3, 227f0d4, 941feb4.
- Deployment: dpl_9XniHSZXeaNfEcb2CFUhQZUJs757
- Candidate: https://bodeebooks-fdeip3521-vexonastudios-3984s-projects.vercel.app
- Previous production / rollback target: dpl_2S19GWqjRNaMkwZ6M5ftxE3eJ1Zo.
- Both guard.bodeebooks.com and www.bodeebooks.com reported the new deployment at 2026-10-09T13:03:59.756Z.

Built once from a clean git archive, checked before promotion, then promoted to the public aliases. No Windows installer, API deployment, Mac build or paid Windows CI run was started.

## Verification

- Existing targeted account/download tests: 24 passed; lint passed.
- Existing report/dashboard tests: 10 passed.
- Responsive checks at 390px and 320px: no horizontal overflow, red background and both icons present. Report count refresh covers 3, 1 and 0 reports without losing icons.
- Production Next.js build and TypeScript passed.
- Candidate signed feed matched the baseline; candidate report JavaScript and CSS matched the clean archive byte for byte.
- After promotion, all 99 startup/Bible/report assets matched the archived source byte for byte.
- Both public download routes retained their expected canonical redirects and sign-in requirement; the unauthenticated Bible endpoint returned 401.
- Authenticated live dashboard loaded. The live alert element had the expected red background and two SVG icons; with zero pending reports, it was correctly hidden. No browser errors were reported by the verification tab.

Local evidence (ignored): .tmp/report-recovery-deploy/candidate-deploy.log, baseline.json, candidate-feed.json, candidate-mobile.js, candidate-mobile.css and live-verification.json. These are not family records and no credentials are committed here.

## Child recovery boundary

The Windows child release remains 1.2.298. The signed recovery manifest SHA-256 stayed unchanged on both aliases:

`1f8d0e57b41fbe3f068bde1184abff22ba0e5a2bcd5b3eb587baf4543af0aef6`

Child-source commit 153b8e77 separately fixes queued recovery during cooldown and stale staging-failure retries. Its full local verification passed (2,422 tests, native protection checks and all 50 Electron scenarios), as documented in the child repository's docs/cloud-update-recovery-20261009.md. It is not delivered by this website deployment. Its behavior has not yet been verified on the reporting child's actual device, and the original installer failure cause remains unconfirmed.

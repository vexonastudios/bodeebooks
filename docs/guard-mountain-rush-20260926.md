# Mountain Rush in Family Games — September 26, 2026

Published to the existing parent website alongside BodeeGuard Family Beta 1.2.246.

## Source and deployment

- Website: `68755651c85d67210018c0e1992aba67ab3c8670`.
- Cloud feature: `43684517341ed2c2ee454592c573bd8f39b181f9`.
- Packaged child: `ffb9e950d8f64dc35d44158350c91d653ff5776b`.
- Deployment: `dpl_5XtEuWP3ZG4gXdhjNR34u9MVMHUK`.
- Candidate: https://bodeebooks-e9kujcjzc-vexonastudios-3984s-projects.vercel.app
- Previous healthy site: `dpl_9XA8eH4PTq2WpLd1GDKwTNL3n22Z`.
- Clean Git archive: `.tmp/mountain-site-246/`.
- Source backed up to official repositories on `codex/family-games-presence`.

## Changes

The Family Games gallery includes Mountain Rush, two optimized preview images,
the official public Windows ZIP link and extraction/play instructions. Parents
can join as Mom or Dad in the game's LAN lobby. Copy explains matching game
versions, home Wi-Fi and shared progression within one Windows account.

Only the game UI/catalog, two images and release-note mirror were exported.
Existing parent layout, permissions, family settings and unrelated panels are
preserved. Child Download & play, progress, Play and Update / repair ship in
1.2.246. The upstream managed contract ships in Mountain Rush 0.6.1. The cloud
release receipt records ZIP/PID protection, game-time accounting and artifacts.

## Verification and publication

- Child full verification: 1,991 unit/service tests, native checks and all 44
  distinct Electron scenarios passed across full/resumed runs. The gallery
  fixture was corrected to wait for a closing dialog; no failure was waived.
- Parent phone/desktop gallery fixtures passed, including artwork, preview
  paging, download links, installed state and no horizontal overflow.
- Site account/dashboard tests: 18 passed; release/account subset: 13 passed.
- Clean Next build passed: compilation 7.8s, TypeScript 6.9s, overall build 31s.
- Both hosted child installers passed full independent SHA-256 before publishing
  the signed feed. Live feed and full public download verified separately.
- BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION=1.2.246 persisted for production
  and supplied consistently at build/runtime.
- Candidate release identity and all four changed gallery assets matched the
  archive before promotion. Live release identity matched with no-store, and
  all four live assets matched at 2026-09-27T01:13:30.658Z.
- Signed-in account visibly confirmed Family Beta updates · Version 1.2.246.
- Signed-in Family Games visibly showed the Mountain Rush card, public ZIP link,
  parent instructions and readable two-picture preview. No family settings,
  approvals, downloads or installations were triggered in the browser.
- Preview artwork totals 150,426 bytes. Existing Family Downloads entry reused.

Evidence: `.tmp/mountain-site-tests.log`, `mountain-site-release-tests.log`,
`mountain-246-site-deploy.log`, `mountain-246-candidate-assets.json`,
`mountain-246-live-site-verification.json`, `mountain-246-site-promote.log`.

Publishing does not establish household installation. Actual protected child
launch and a race between two physical PCs remain hands-on acceptance checks;
upstream same-PC discovery/direct-IP/six-player tests passed. Family Games must
be enabled by the parent, and available allowance and other existing rules apply.

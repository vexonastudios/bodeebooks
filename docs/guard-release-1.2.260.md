# Family Beta 1.2.260 — Music during Quizlet

The account release notes now explain how permitted pinned Music stays open while a child studies in Quizlet. Start a song, Pin to Bottom, then open Quizlet Study. Music permissions, limits and volume caps remain effective. Child installation and physical Quizlet acceptance must be confirmed separately.

This website change adds only the reviewed version-specific account release notes. Existing dashboard fixes, including Enter to send, remain in place. The signed installer and matching account download are now published; evidence follows.

Verification: all 13 account cases and the production build passed. No generated dashboard assets, API implementation, account authorization or message transport changed. Evidence: `.tmp/quizlet-music-260-account.log` and `.tmp/quizlet-music-260-site-build.log`.

## Publication receipt

- Website source: ec2885a50c976df43a2931832cf071a6d9b1dc0d. Clean whole-repository archive: `.tmp/quizlet-music-260-release/site`.
- Production installer-version variable persisted as 1.2.260 and supplied at both build/runtime. No account entitlements, subscriptions, family settings, real messages or API implementation changed.
- Deployment: dpl_GU2wodWwSvPzsKDsW46eW2q27nRw / https://bodeebooks-qj4nqz9lo-vexonastudios-3984s-projects.vercel.app. Candidate was Ready; release marker matched and the exported Messages module matched source before promotion. The public release identity returned HTTP 200/no-store at 2026-09-28T18:19:14.670Z.
- The previous Enter-to-send Messages module remains byte-identical to source: SHA-256 692f9c1578807324c88b2867367fed1aa726f1e3bb984f3b693a26a146e6d9f6. Evidence: `.tmp/quizlet-music-260-site-live.json` and candidate/deployment/promote logs. Two initial asset probes used incorrect export paths; the confirmed `/guard-admin/cloud-messages.js` check passed before promotion.
- A read-only browser check of the existing signed-in parent account visibly confirmed Family Beta updates, Version 1.2.260 and the Windows child download. The old browser binding required reconnection; the current tab check passed and the tab was returned to its dashboard.
- Child exact packaged source: 87829a264dee0b7214a7dff28ee920422d792d2d. Build ID: 7f6278b3ee3c66db25d133b371405e2a. Size: 161546656 bytes. SHA-256: 17dab6337360b9da6226efc183233d8382b10d37d7e1c340cf5c3a7d4add835f. Full verification passed 2,077 unit/service cases, native checks and all 44 isolated Electron scenarios. Signed build/source/native/tamper verification, both full hosted copies and live pinned-key feed verification passed. Canonical receipt: bodee-guard/docs/cloud-release-1.2.260.md.
- Previous healthy website rollback: dpl_BoBKZnmyb8SLBgk27bd887xV1Sxn / https://bodeebooks-imiumcwed-vexonastudios-3984s-projects.vercel.app.

Children must update to 1.2.260 for Quizlet background music. Installation and physical acceptance remain separate from publication. Existing school-friendly restart choices remain intact; no child installation or forced restart occurred.

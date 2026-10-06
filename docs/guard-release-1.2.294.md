# Parent Family Beta 1.2.294

The matching parent dashboard includes optional noon school check-ins, lesson-check freshness, clearer recorded activity labels and current Windows download notes. Existing report photos, scan-first Poems, assistant, messaging and learning controls remain included.

## Published receipt

Published October 6, 2026 at 19:53:50 UTC (2:53 PM America/Chicago) to the existing Family Beta API, parent website and Windows update feed.

- Windows/API source: 25857d8684b3eea43f7ab26252f8fba7327e05cf. Parent source: 2c2d28f97bcf2b53eccbd99a20fec358a3754b70, deployed from clean checkout C:/Projects/worktrees/bodee-books/family-beta-294.
- Build: 7a9fa4e7f905adf9bf440c86b3256cba. Installer: 161640728 bytes; SHA-256 10241bb4bad2d7804fa2ed24c26428eb05214b13977486318ba2113d923a49a4. One clean tracked-source build passed package/source, private signer and tamper checks; no trust-store changes.
- Source plan passed with 37 required changes and 202 reviewed runtime hashes. Private GitHub prerelease private-validation-7a9fa4e7 verified all six assets.
- Both complete R2 installers (updates/test/BodeeGuard-Cloud-Child-Setup-1.2.294.exe and installers/internal/BodeeGuard-Cloud-Test-1.2.294.exe) and the child-facing backup download matched the installer receipt.
- API deployment: dpl_HpbdAjnvCf1X2xhgnX7Na2X3RnUJ. The school-checkins scope applied and verified the additive migration. Candidate and public database health/live checks passed. Previous healthy API: dpl_F1j5pZEDrSKBULsxKFz5fKNF6W3C.
- Parent deployment: dpl_GJ7DsCMWJzr7NtvcYgbAoV6fxu4o. Both guard.bodeebooks.com and www.bodeebooks.com matched all 14 current parent assets each. Protected workspace and notification routes require authentication. Installer version and recovery manifest persist at build and runtime. Previous healthy parent: dpl_77qYfPohuCBtLY6U2j6gYR6ziYg1.
- Signed feed SHA-256: c605ad976eee914873e6054f78de950c720ab7026f0e6aaf4b82a86ada942ea7. Primary and both parent recovery feeds verified with the pinned key, version 1.2.294 and installer receipt. The feed was published last; previous 1.2.293 feed remains in hosted-verification/previous-feed.json.
- Runtime validation was reused: 2361 unit/service cases across 435 files, native checks and 48 isolated Electron scenarios; the additional migration/revoked-device test and all six check-in cases passed. Parent notification, responsive React fixture, TypeScript and production build passed. Four release-note and 25 parent account/download checks passed for final metadata.
- GitHub combined release/create/upload failed first with HTTP 500 and then an asset-name conflict. The prerelease record was created separately with the exact source and existing notes; the unchanged idempotent publisher then uploaded and verified every asset. No installer was rebuilt, release gate skipped or asset overwritten.
- Publication stage seconds: manifest 0.1; GitHub 20.3; two installers 65.3; backup 13.3; previous feed 0.5; matching parent 70.3; final feed 2.5.
- Evidence in the cloud worktree: .tmp/abeka-checkin-verification.log, .tmp/release-294-build.log, .tmp/release-294-preflight.log, .tmp/release-294-publication-resume.log, .tmp/release-294-public-checks.json, .tmp/release-294-api/api-result.json and out/private-validation/7a9fa4e7f905adf9bf440c86b3256cba/hosted-verification/.

No Stable promotion, Worker deployment, family data/settings change, real notification or child installation occurred. The signed-in production account screen was not visually rechecked; protected-route and account/download integration checks passed. Physical child upgrades, real accredited Abeka playback/completion acceptance and an Android noon notification remain unobserved. Noon check-ins remain opt-in through the parent notification bell. Child timing and Messages changes take effect after each computer updates. Paul's exact missing-completion cause remains unconfirmed; historical idle minutes cannot be reconstructed.

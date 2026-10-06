# Parent Family Beta 1.2.295

Matching download and release notes for the child Messages/White Noise overlap fix. Current parent UI and the 1.2.294 Abeka/noon-check-in changes remain included.

## Published receipt

Published 2026-10-06T21:29:17.3984543Z (4:29 PM America/Chicago, October 6) to the existing private Family Beta Windows feed and matching parent website.

- Child source: d7683b4635b46336e457e79a6fa59e6ab9398dc3. Parent source: 7e5598f2964917cd9e2aa0ecdda64394f95a1957, from clean checkout C:/Projects/worktrees/bodee-books/family-beta-295.
- Build: 10881d34dee9de924a90406af957ca18. Installer: 161641024 bytes; SHA-256 c11180c6247587d08a2256d8075938a1191ef86cf55dfed3a2d9a78bf524a237. Exact-source assembly, sealed payload, private signer and tampered-copy checks passed. One package was built; an earlier source-plan gate caught the outdated release-note hash before assembly, which was reviewed and corrected.
- Source plan preserves 38 required changes and 202 reviewed runtime hashes. The GitHub prerelease private-validation-10881d34 targets the exact source and verifies all six assets. Its record was created separately before the idempotent publisher uploaded the assets.
- Both complete versioned R2 installers and the child-facing backup independently matched the receipt. Previous 1.2.294 feed remains under hosted-verification/previous-feed.json.
- Parent deployment: dpl_EcG7MwfWKqC6egZwgWeyhZoMFzMb. Previous healthy parent: dpl_GJ7DsCMWJzr7NtvcYgbAoV6fxu4o. Both public aliases matched all 14 parent assets each; workspace and notification authentication gates passed. Installer version and signed recovery manifest persisted at build/runtime.
- Signed feed SHA-256: d9a79b1278053a57115e16378d664f975ce195d5cce35c2bd45dd304f1737a82. Primary and both independent parent recovery feeds verified with the installed pinned key and the 1.2.295 installer receipt. Feed publication occurred last.
- API and Worker source/deployments are unchanged; existing API public health/live checks passed. No database migration.
- Focused verification passed 307 unit/service cases across 66 files and 13 isolated Electron scenarios; this is not a full-suite result. The combined actual chat/White Noise fixture passed all five window sizes, nine theme contrast checks, send pointer reachability, real local audio, chooser/focus, screen changes and disable. Four release-note and 25 parent account/download cases passed.
- Publication stage seconds: {"sign manifest":0.3,"private GitHub prerelease":16.3,"two versioned R2 installers":56.5,"child-facing backup installer":8.2,"preserve current signed feed":0.4,"matching parent website":63.7,"signed child update feed":2.7}.
- Evidence: .tmp/chat-white-noise-focused.log, .tmp/verification/electron/fixture-dbFz8F, .tmp/release-295-build.log, .tmp/release-295-preflight.log, .tmp/release-295-publication.log, .tmp/release-295-public-checks.json and out/private-validation/10881d34dee9de924a90406af957ca18/hosted-verification/.

No installed family app, real family messages/settings, trust store or Stable channel was changed. A physical child upgrade remains unobserved. The signed-in production account page was not visually rechecked; protected route/version integration and hosted publication checks passed. Children receive the fixed layout after updating to 1.2.295.

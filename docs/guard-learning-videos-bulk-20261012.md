# Learning Videos bulk additions

Source: BodeeGuard commit f270a956, renderer/js/admin/learning-videos.js and
renderer/css/admin/learning-videos.css. Only their corresponding hosted assets
were exported; generated panels and other controls were preserved.

The parent can paste up to 50 YouTube URLs or IDs, review editable titles, and
approve the list together. Duplicates skip extra metadata requests. Results show
successes and failed links, with selective retry and stop-after-current support.
The existing parent authorization, per-video validation and unlisted-link flow
remain in use. No API or child app changes are required for this feature.

Verified with the actual hosted panel/module/CSS in the isolated BodeeGuard
bulk Electron fixture (desktop and 390px phone), the media focused checks,
changed-file ESLint, and npm run build -- --webpack. The default Turbopack build
has the existing external dependency-junction limitation documented in prior
receipts. Final local source refinements passed static, unit and UI checks again.
All tests used synthetic data, without adding videos to a live household.

Published with Family Beta 1.2.311; see docs/guard-release-1.2.311.md. The live
assets match the verified source on both public aliases. Shared-source details,
exact hashes and commands are in BodeeGuard docs/learning-videos-bulk-20261012.md.

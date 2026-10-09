# Marshland Hunt parent catalog — October 9, 2026

Prepared from website source dede510, preserving the published report alert and download buttons. The reviewed game modules matched the current child baseline before selective export.

The Family Games gallery adds Marshland Hunt with three actual 960x540 WebP screenshots, solo/family LAN details, hunting-content notice, shared-save guidance and exit/return controls. Its explicit repository mapping is vexonastudios/huntinggame-releases. The game key does not determine the URL.

The public latest-release endpoint initially returned 404 at 13:30:22 UTC. Rechecked at 2026-10-09T13:57:56Z: stable standalone v1.5.0 is now published with EXEs, SHA-256 files and a portable ZIP, but no BodeeGuard signed-release envelope. The game handoff confirms it does not claim Authenticode signing. Catalog copy distinguishes this standalone availability; the parent download remains disabled with Awaiting signed release to preserve protected-installation requirements. This source change is not deployed and does not publish or install a child application.

Only public/guard-admin/cloud-games-catalog.js, cloud-games-ui.js, their two workspace manifest hashes and the three marshland*.webp gallery images are exported. No unrelated dashboard asset is replaced.

Validation: 72 workspace/dashboard/startup tests passed. The actual exported gallery fixture tests/guard-marshland-gallery.electron.cjs passed disabled downloads, all three screenshots, required content/save notices and 390px/320px layouts. The fixture uses a local HTTP server and synthetic empty-family responses, not a live household. Fixture lint passed. Ignored evidence is in .tmp/marshland-tests.log and .tmp/marshland/.

The child/API/native contract and full verification receipt live in BodeeGuard's docs/cloud-marshland-hunt-20261009.md. Activation requires verified publication of the signed game release, coordinated source availability flags, physical acceptance and a separately requested BodeeGuard release. No production deployment or source push was performed.

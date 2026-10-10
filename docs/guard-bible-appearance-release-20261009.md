# Bible appearance parent download — 1.2.303

Published 2026-10-10T04:06:53.2067548Z; parent source 99ad78a12135b43b769b11509dd73837fb9099bf, deployment dpl_EaHQTGQUCbSndjRszSmKqTefUy3y, child source cf708046de42c8359a1f9c7d4f21845d004f4c37.

The existing parent download now serves Windows Family Beta 1.2.303, with matching account release notes for Bible theme colors and a saved, per-child Plain white preference. This child-only feature needs no dashboard asset export, API deployment or database migration. Existing parent controls and account access boundaries remain unchanged.

All 13 parent account tests passed. The publisher verified the candidate download requires parent sign-in, confirmed signed recovery metadata, promoted the existing website, checked both public aliases and recovery feeds, then activated the child update feed. Both hosted installer copies and the backup matched SHA-256 d0e70f6ac99f99ee739ba64413a2e8b55880723447ba0cb517a4adb3488cdb47. Signed feed SHA-256: 3c90475290a34e292b8a5966fdcf01715c10cf9b6c29b57ba78b0bb408d19341. The signed-in account was not visually rechecked; physical child update uptake remains unobserved.

The full source, feature tests, package verification and publication record are in bodee-guard/docs/cloud-release-1.2.303.md. The previous parent deployment dpl_J1Bamc7Yeo4yCoKN8kbDLvfD6VMq remains available for rollback; its recovery/download version must stay aligned with any deliberate rollback.

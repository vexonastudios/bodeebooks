# Bible Topics parent download — 1.2.302

Published 2026-10-10T03:14:57.5368698Z; parent source e9c4e1b, deployment dpl_J1Bamc7Yeo4yCoKN8kbDLvfD6VMq, child source 72f7d6f3b12e60a10b902323b79fb7bc67d9536f.

The existing parent download now serves Windows Family Beta 1.2.302, with matching account release notes for Bible Topics. This is a child-only feature; no dashboard asset export, API deployment or database migration was needed. Existing parent controls and account access boundaries remain unchanged.

All 13 parent account tests passed. The publisher verified the candidate download requires parent sign-in, confirmed the signed recovery manifest, promoted the existing website, checked both public aliases and recovery feeds, then activated the child update feed. Both hosted installer copies and the backup matched SHA-256 36b2f371fa74e94062d25917e4a5435b440b457c0f6dbc11ff9378ad89322922. The signed-in account was not visually rechecked, and physical child update uptake remains unobserved.

The full source, feature tests, package verification and publication record are in bodee-guard/docs/cloud-release-1.2.302.md. The previous website deployment dpl_5rXfzFeUcrQjmUs1H6Zm26wrknpt remains available for rollback; its recovery/download version would also need to remain aligned with any deliberate rollback.

# Family Beta parent download 1.2.322

Published October 22, 2026 at 17:57 UTC with the verified Windows Family Beta
release for hidden/collapsed parent-exit update recovery and automatic Earn
Coins spelling narration with Lucide action icons. Parent source `6a3b218`
changes only reviewed release-note data in `shared/guard-cloud-release.ts`.
Existing dashboard source was preserved.

Production deployment: `dpl_BnFG3QihX84dsSHNxj3j6M6kQ8Bq`. Previous healthy
deployment `dpl_6KJRQwbc6Lp1fHZW5CdC5kbfpcP3` is retained for rollback.
The publisher verified both aliases, the authenticated-download gate and the
independent signed recovery metadata. Signed-in browser verification showed
the 1.2.322 download and Software updates version. Expanded notes showed the
hidden-icon fix, automatic spelling and the one-time recovery instructions
for already-stuck 1.2.320/1.2.321 clients. No household controls were changed.

Account/download tests passed 23/23 and TypeScript passed before publication.
The existing publisher completed the clean production build, persisting version
1.2.322 for build and runtime. The signed child feed was switched only after
the parent download and recovery metadata were ready.

Windows exact source: `e3012fe8ec92669818a7e42adfb7905e9d7febf0`, build
`7574e067a61ca941fb6b3c48f30d2f56`, installer SHA-256
`be270394eb982072f751b0c00ce23b26c07bb8ca8a173d276a5f0919ae1ffa19`.
Recorded full verification, source coverage, package equality, private
signature/tamper gates, independent hosted-byte checks and fresh Defender scans
passed. API/Worker source and Stable were unchanged. Complete evidence is in
the BodeeGuard repository's `docs/cloud-release-1.2.322.md`.

Actual child installation remains physical acceptance. Clients already running
the older restart check may need the new parent installer in place or the exit
icon temporarily shown until 1.2.322 is installed. No uninstall or profile
deletion is needed; icon visibility can be restored afterward.

# Parent dashboard and Assistant deployment — October 15, 2026

Status: deployed and verified after the user's “OK deploy” authorization. This is a parent website and commercial API release. Windows remains 1.2.317; no child installer, signed feed, Worker, installed profile or family setting was changed.

## Exact sources and deployments

Both source branches were pushed before deployment. Each candidate was built from a clean Git archive; local scratch files, dependencies and credentials were excluded.

| Component | Source | Live deployment | Previous deployment / rollback target |
| --- | --- | --- | --- |
| Commercial API | BodeeGuard `a3323828f323485c3735a0cec61a0bf1a91256ef`, `codex/headset-reconnect` | `dpl_7fafx3KNXCtCdCqxoRtDB6eBJHeT` | `dpl_Bwrx2kMmwDd2zVdJtE3452quZsJE` |
| Parent website | BodeeBooks `1ba967a9962334c0a8536fc2a84c4b42a1ca9dc0`, `codex/release-310` | `dpl_6FeNDAuWDKrr1ybNCeCDubbkkWMc` | `dpl_5G1CMMwoAUi93gcn3aZHxGw4tnfU` |

API candidate: `https://bodeeguard-commercial-qliftfaiv-vexonastudios-3984s-projects.vercel.app`. Website candidate: `https://bodeebooks-g2ewshzdh-vexonastudios-3984s-projects.vercel.app`.

The API used the whole-repository archive root and existing `assistant-controls` provisioning scope. Existing additive provisioning passed; this batch introduces no schema migration. Both candidates were READY and checked before promotion; the API was promoted first. Website pilot installer version was explicitly retained at 1.2.317. For rollback, promote the prior website and API deployments above together; this release needs no data reversal.

## Published behavior

- Music child selectors and personal playlists load in the hosted parent dashboard. Failed loads offer a retry. Library and child-specific imports accept up to 50 YouTube links/IDs with review before approval, duplicate handling and safe partial retries.
- Message requests can offer quick-unlock controls for all supported assigned activities, including Art Studio and Piano. Independent parent controls queue without requiring a dashboard refresh between clicks and report each result separately.
- Weekly activity labels stay opaque and readable during horizontal scrolling.
- Parent Assistant offers a reviewed action for locking Family Games, BodeeBooks Games or both for all active children, including the reported dictation aliases. The matching API validates and applies the confirmed action.

The printer-wait recovery commit is backed up in the pushed source branch but remains undeployed to children. It requires its separate Windows release and physical-device acceptance.

## Verification and live acceptance

Existing passing verification for unchanged source was reused, rather than rerunning the full suite during deployment:

- Message-control baseline: 2,642 unit/service tests across 471 files, native checks and 51 isolated Electron scenarios; final focused queue/message follow-ups and actual website fixtures passed.
- Assistant baseline: 2,637 tests, native checks and 51 Electron scenarios, plus reviewed-action UI/service cases at desktop and phone widths.
- Weekly report: 226 tests across 39 files, five selected scenarios, and before/after horizontal-scroll pixel checks at 320/390 pixels.
- Final Music scope: 271 tests across 53 files and nine isolated Electron scenarios; final static checks and three targeted service/import tests passed. Actual hosted-loader fixture covered two synthetic children, all destinations, loading failures/retry, duplicates, invalid entries, partial saves and 390px layout. Existing mobile media fixture also passed.
- Parent website: 98 account/workspace/dashboard/idle/refresh tests and final Next Webpack production build passed. Both Vercel production builds passed.

Deployment checks:

- API candidate and public `/v1/live` and `/v1/health` returned 200. Public alias inspection resolves to the exact new API deployment. Anonymous Assistant approval returns 401 `account_auth_required`.
- Candidate and both `guard.bodeebooks.com` / `bodeebooks.com` release routes report the exact new website deployment. All eleven changed shared assets match the clean Git archive byte-for-byte on both live origins. Comparison uses archive bytes rather than Windows checkout line endings.
- Candidate and public Windows download routes still lead to parent sign-in. Signed recovery manifest is unchanged: SHA-256 `23c3de86c962d6d22941b26efcf39390ec17da53ffa8738e4cf455afeb48d12a`.
- Refreshed the existing signed-in live Chrome parent dashboard. Music → Playlists showed all eight child names, enabled the selector, and loaded distinct existing playlists when switching between two children. The direct-add form opened with the selected child's name and the multiline links field. Closed it without entering or saving songs.

No real imports, approvals, unlocks, messages or child settings were performed as smoke tests. A real-phone message unlock with child acknowledgement and physical phone weekly-report check remain user acceptance steps; isolated renderer checks already cover these flows. No new child runtime is claimed.

Evidence: ignored `.tmp/parent-controls-release-20261015/` in both worktrees contains exact Git archives, Vercel build/promote output, deployment metadata, health/auth results, asset checks and feed/download checks. Feature receipts retain their detailed test logs. This receipt supersedes their earlier pending-deployment statements for the four published parent features only.

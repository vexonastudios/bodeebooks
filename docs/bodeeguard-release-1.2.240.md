# Family Beta 1.2.240 — inactivity-aware study time

Published September 24, 2026 to the existing private Family Beta channel under the task's continuing release authorization. No stable promotion, installed family app launch, family installation or historical time correction was performed.

## Behavior and source

Typing keeps the 1.2.238 actual-exercise-keystroke clock, which pauses about 1.5 seconds after typing stops. A previously reported 1.2.235 installation predates that fix; published availability alone does not establish installation.

Other assigned study activities now require recent local input, with a two-minute inactivity allowance. Approved foreground school websites can additionally count advancing visible video in the main page or an embedded frame. Playback evidence expires after three seconds; paused, ended, seeking, stalled or buffering video cannot extend idle time. Answering questions beside a paused video still counts as recent input. Existing sleep/lock/background/break and elapsed-gap protections remain intact. Entertainment game quotas were not rewritten. Playback indicates playing media, not proof of attention.

A bounded local check reads only video playback state, never page text, names, credentials or answers. It introduces no cloud polling. Previously saved totals are preserved because genuine study cannot be reconstructed from an old aggregate.

- Runtime implementation: 538ea7b2f4a0ee2c390df495dc55e5893e17a499.
- Exact packaged source: b9037a5e9e77ea64c9b97de3dfe170ee362c368d, official vexonastudios/bodee-guard, branch codex/study-presence.
- Previous shipped source: 782504864d7686dd7b531eb67ae8a61a3f51ffd0. Source gate verified ancestry, eight required changes, 26 reviewed critical-file hashes and live GitHub backup. Earlier colors, typing, video controls, learning progressions and default modules remain included.

## Validation

- 52 focused timing/session/typing regressions passed, including unattended two-hour intervals, resumed input, ten minutes of advancing video without input, stopped/stale/failed playback, navigation replacement and embedded frames.
- Full check: `npm run verify:change -- --full` passed workspace, syntax/lint, 1,912 unit/service cases across 374 files, native protection and all 43 isolated Electron scenarios. Stage durations: 2.3s, 127.1s, 19.2s and 314.2s. The initial full run exposed a paused-video/resume conflict; recent input now remains valid beside a paused player, and the corrected full run passed without weakening tests.
- Validated runtime source stayed unchanged after that fix; final version/release-note/source-plan metadata passed all four release-note tests. No dependencies changed.
- One installer build verified 630 archive files, 75 sealed payload files, two native resources and exact source/signer identity. Tampered copy returned HashMismatch. Windows trust settings were untouched; the private validation certificate is not publicly trusted.
- Parent website: nine download/release tests passed, and Vercel compiled, type-checked and generated 70 pages from a clean Git archive.

## Publication

- Build ID: 37197f39b563bc8efdb3b740dfe7ff81.
- Installer bytes: 161344016.
- SHA-256: 2f878ec37832a8ca50250ba731e78e1739578bb5395419355eb122dddf29830c.
- Private prerelease: https://github.com/vexonastudios/bodee-guard/releases/tag/private-validation-37197f39 . Six assets confirmed; prerelease, not draft.
- Previously absent immutable objects: updates/test/BodeeGuard-Cloud-Child-Setup-1.2.240.exe and installers/internal/BodeeGuard-Cloud-Test-1.2.240.exe. Both complete hosted copies independently downloaded and matched receipt size/hash before publishing the feed.
- Live manifest verified at 2026-09-24T19:44:31.494Z against the child's pinned key, upgrade from 1.2.239, Cache-Control no-store; installer HEAD 200 with matching size. Previous signed feed retained locally.
- Website source: 3bde68934dd167d8bd5aab31441b5972aa2b450e, official vexonastudios/bodeebooks. Deployment: dpl_139ZxUU7pbCYFrgzqVkujGjwzzQ9, https://bodeebooks-asnnfjtja-vexonastudios-3984s-projects.vercel.app . Installer version persisted and supplied at build/runtime as 1.2.240.
- Candidate and live release identity matched. Authenticated parent Account visibly offers 1.2.240, the Windows download and the expanded matching inactivity notes. Previous healthy website deployment: dpl_DLx5p8rq5MuCMJGwGhf48zmGH9cK.
- Commercial API source was unchanged and not redeployed; public health returned 200/ok. Current API remains dpl_VxB72oT5Z4L5u5R4ERWnZLTVNwvM.

## Remaining physical acceptance

Close student activities and return to the dashboard so the existing safe updater can finish; confirm 1.2.240 on the child before testing. The account still last reported 1.2.235 during release verification. Confirm actual typing, unattended study, lid/sleep and real Abeka playback on the child computer. Published is not installed. Existing ElevenLabs configuration work remains separate and unchanged.

Artifacts/logs: C:/Projects/worktrees/bodee-guard/study-presence/out/private-validation/37197f39b563bc8efdb3b740dfe7ff81/ and its ignored .tmp/ directory. Website archive: C:/Projects/worktrees/bodee-books/study-presence/.tmp/web-deploy-240/.

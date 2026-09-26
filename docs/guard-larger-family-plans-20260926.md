# Family Beta 1.2.242 — larger family and child plans

Published September 26, 2026 under the continuing release authorization.

## Behavior

Removed the hard-coded 30-subject restriction from the family Daily Plan, API
school library, signed child policy/progress, child dashboard response and private
cache. The family-template 60-entry restriction was also removed. Existing bounded
settings, policy and cache byte sizes remain enforced. This is not unlimited
payload storage or a change to the allowed websites, child identity or access
rules. Quick Unlock keeps every existing choice instead of slicing at 30.

Built-in activities are still shared by their family row. Separate school sites,
IDs, sibling assignments, denials and historical records remain intact. No family
plan or production household records were edited during this work. Existing
child installations need version 1.2.242 before using an individual plan beyond
their old 30-entry client contract. Publication does not confirm installation.

## Source and omission audit

- Feature source: `4077623ac7e99d263e725e69931bf738b81f9d34`.
- Exact packaged/API source: `1d75b108785dfdc6ac9133b0ce91dc8e0a2ed29e`.
- Previous shipped child: `bff6a43fdb9ef7fa67a9101b377f2f80f392e89b` (1.2.241).
- Website: `1a816abdd49dab571a40ccbacb1e04ee1c676f93`.
- Both official repositories backed up on `codex/family-games-presence`.
- Source gate passed previous-release ancestry, ten required fixes, 29 reviewed
  file hashes and live GitHub backup. Earlier active typing, study presence,
  colors, learning changes, school video and themed planner/coin fixes remain.
- Current integrated source also carries the recently tested Messages CSS.
  No uncommitted family records or legacy runtime are included.
- Since the last API deployment (`a239f963`), the preexisting API runtime had no
  unrelated pending changes; this release adds the reviewed plan changes.

## Validation

- Full static/workspace/syntax/lint passed. Initial full unit phase ran 1,963
  cases across 385 files: 1,962 passed and one unlock-preservation regression
  failed. Its proposed cleanup had dropped unrelated saved unlock choices.
  That behavior was corrected, then all five assistant/computer-control cases
  passed, including the one additional larger-unlock regression. All 1,964
  distinct cases are covered across the full run and affected rerun.
- Native protection checks passed without installing services or modifying
  Windows protection. All 43 isolated Electron scenarios passed in the resumed
  full verification. Focused final lint and four release-note cases passed.
- New end-to-end test uses the real loopback API and isolated PostgreSQL: a
  40-activity child plan saves, its signed policy loads, the complete dashboard
  syncs, and the encrypted cache reopens. Sibling-only school access is rejected.
- Nine children with two schools each can apply and reapply the full default
  without duplicated modules or changed input records. A 70-entry library and
  template normalize; oversized data remains rejected. School setup can add
  the 31st site without overwriting existing rows. Quick Unlock retains all
  choices beyond 30.
- Website workspace: 49 cases passed; production build/TypeScript passed.
  Candidate model hash and installation page verified before promotion.
- Full log: `.tmp/verification/large-plan-full.log`; resumed native/Electron:
  `.tmp/verification/large-plan-native.log` and `large-plan-electron.log`.
- One isolated child build: 631 archived files, 75 sealed files, two native
  resources; source match, signer match and tampered-copy rejection passed.
  No installed app was launched, enrolled or updated by the validation fixtures.

## Publication

- Build ID: `a4c769225f94a4c73e65c897392cd640`.
- Installer size: **161346352** bytes.
- SHA-256: `90784dbf6d4ac5f460fca5875951815690dac3f6a968a2b40f5f236b22dd284d`.
- Private prerelease: https://github.com/vexonastudios/bodee-guard/releases/tag/private-validation-a4c76922
  (six assets verified, not draft; no stable promotion).
- Both new R2 keys were absent before upload:
  `updates/test/BodeeGuard-Cloud-Child-Setup-1.2.242.exe` and
  `installers/internal/BodeeGuard-Cloud-Test-1.2.242.exe`.
  Complete independent downloads matched size/hash before feed activation.
- Live signed Family Beta manifest verified with the child's pinned public key,
  version 1.2.242 and matching hash, with `Cache-Control: no-store`.
  Previous feed retained at `.tmp/pre-242-update-manifest.json`.
- API: `dpl_4Ss5Hw5XHvVzntyECHBr1xwEioqa`,
  https://bodeeguard-commercial-9oe7zw1u7-vexonastudios-3984s-projects.vercel.app
  built from `.tmp/large-plan-api-242/` using the existing daily-plan-template
  gate. Candidate and promoted-alias health passed using deployment-protection
  access. A plain fetch of the protected Vercel alias returned login HTML and
  was not counted as health evidence.
  Previous healthy API: `dpl_3MZnun1BqRa8aPCNJ28dc8G62Ya8`.
- Website: `dpl_4Pi5ZJbQKfaFNRLBCUSJ9u2dZBXk`,
  https://bodeebooks-gxngo2x44-vexonastudios-3984s-projects.vercel.app
  built from `.tmp/large-plan-site-242/`. Installer version 1.2.242 supplied at
  build/runtime and persisted in the existing production variable.
  Previous healthy website: `dpl_GbKMGQuZFo5L5mka8M7HZGChuuAd`.
- Public dashboard release identity matched. Live `cloud-daily-plan-model.js`
  SHA-256: `69c006738de56b71d4cb552c7c314ee0071a9ada46b5a2583d509356f068625f`,
  matching the committed candidate with revalidation headers.
- Artifact directory: `out/private-validation/a4c769225f94a4c73e65c897392cd640/`.
  Cloudflare Worker code and existing installation/enrollment choices unchanged.

Next physical check: accept the parent Update prompt, let each child reach
1.2.242, then retry Save plan & continue. Real household saving and physical
update acceptance remain with the parent; this release does not claim those
steps have already occurred.

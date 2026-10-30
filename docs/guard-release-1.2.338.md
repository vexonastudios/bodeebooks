# Family Beta 1.2.338 — October 30, 2026

Parent deployment `dpl_86BAze7CMQjBqUfxxjmo26PtSBCH` is live from source
`8674edfe3d2f4a077814060dc406de94fae4c6d0`, including feature commit
`c3c9bb4`, matching Family Beta installer version 1.2.338 and parent notes.
It was deployed from a clean checkout at
`C:/Projects/worktrees/bodee-books/release-338` after the required API.

## Parent changes

- Documents have direct Mark complete and Reopen review actions and a Completed
  filter, separate from printing and grading. Existing grades remain intact.
- Parent exit activity has compact cards with outcome colors and Clear all
  review. History remains available and clearing does not deduct coins.

The API grade-preservation safeguard and existing parent-exit schema gate were
published first in deployment `dpl_5Ahh79JvqTvsz71TP3iYVtSJVJuG`, from cloud
source `494dfcc03ba07cd492f5b6e1a0ec814a6b9cbc4d`. Candidate and public health
passed. No real submissions or coin balances were changed during verification.

## Release verification

The publisher persisted version and signed recovery manifest for production
build/runtime, verified candidate recovery and sign-in download behavior, and
promoted the website before switching the child update feed. Publication
completed at 2026-10-30T15:04:22.8548147Z.

Both public manifests independently returned 1.2.338 with pinned-key signature
verification and envelope SHA-256
`0ce9c4d44ede91f0f630641f6b509578b8b27e9a7ab55b73bb2a5a3ebe593a1b`.
The installer is 164186624 bytes, SHA-256
`4ed38f9ef55f1243ea9486f9f183450105faf420373461c31e4d93874dbaf336`.

All 63 workspace checks, production Webpack build and actual Documents/mobile/
exit fixtures remain applicable to unchanged implementation. Final account,
cloud-download and parent-journey checks: 27 passed. Six changed JS/CSS files on
both `guard.bodeebooks.com` and `bodeebooks.com` matched the clean deployment
checkout byte-for-byte and committed source after CRLF normalization. Existing
signed-in account visual inspection was not repeated in this release.

The Windows release includes preserved Abeka sessions during rule refresh and
recoverable interruption, saved-rule reconnect and a skippable student guide.
Cloud full verification passed 2,850 unit/service cases, native protection and
57 isolated Electron scenarios; installer integrity/tamper, fresh Defender and
all hosted copies were verified. Full receipt:
`docs/cloud-release-1.2.338.md` in `vexonastudios/bodee-guard`.

This updates the existing private Family Beta channel. No public enrollment or
stable-channel setting changed. No family computer was installed or restarted
by publication; the child correction requires running 1.2.338 after restart.

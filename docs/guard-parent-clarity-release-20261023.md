# Parent assessment and poem controls published

October 23, 2026. Promoted at **3:45:52 PM Central (20:45:52 UTC)** and public
verification completed at **3:46:50 PM Central**. This is a parent website
release. Windows remains 1.2.326; the commercial API and signed child feed were
not redeployed or changed. The earlier pending statements in the assessment and
poem feature receipts are superseded by this publication receipt.

## Source and deployment

- Exact website source: `3c347d0866da4f499c44427e6599d122a0fa52c5`, including
  the pending poem changes from `90c6db3` and compact assessment changes from
  `3c347d0`. Pushed to the official `vexonastudios/bodeebooks` repository on
  `codex/release-310` before deployment.
- Matching shared source: `1ec5a6e094e04f4a221b8709beab616733e46dd5`, including
  `f8a5cd06` and `1ec5a6e0`, pushed to official `vexonastudios/bodee-guard` on
  `codex/headset-reconnect`. Its only API changes are tests; no API deployment
  or migration is needed.
- Production deployment: `dpl_9QPaT1QfPNWj5opGiNM4dzMoFCDj`.
- Candidate: `https://bodeebooks-60pbkqfj0-vexonastudios-3984s-projects.vercel.app`.
- Previous healthy parent, retained for rollback:
  `dpl_89mwaVRA6F8QPtuFGumb6HJD8NNy`. Rollback uses promotion of that deployment;
  no family data or schema reversal is required.

The deployment used a new clean Git archive of the exact pushed website source,
not the working tree or the earlier 1.2.326 archive. Only the existing Vercel
project link was added locally. The installer version was explicitly preserved
at 1.2.326 for build and runtime. The existing production signed recovery feed
was retained and independently verified before and after promotion.

The first unscoped deployment request returned Not authorized. Existing login
and project access were checked; the retry used the existing CLI account with
the explicit project scope and without the stale injected GitHub credential.
It built successfully. No new account, token, permission or security exception
was created. No paid GitHub workflow was dispatched; Mac remains disabled.

## Live behavior and acceptance

- The entire desktop Abeka assessment section starts folded. It retains the
  count of genuine attention items, shows neutral missing-report coverage,
  and explains automatic collection and Refresh saved report on expansion.
  The existing phone/tablet exclusion remains intact.
- Poems has a labeled child filter, clear two-assignment page position,
  Refresh poems and an Archive poem button on active assignment cards. Existing
  confirmation, exact retry and retained history/recording behavior are preserved.
- A separate signed-in Chrome tab confirmed a closed assessment row measuring
  about 79 CSS pixels high, the working expansion/empty-report explanation and
  the return to the compact view. The live Poems list showed two Archive poem
  buttons and the new pagination status. No archive, review, import, message,
  account preference or family control was submitted. The user's existing
  Messages tab was left untouched.

Candidate and public checks verified:

- Both `guard.bodeebooks.com` and `bodeebooks.com` resolve to the exact deployment
  through their existing canonical redirects.
- All four changed assets and the unchanged mobile stylesheet match the clean
  archive byte-for-byte on both origins. Normalized LF hashes of the four
  changed files also match the reviewed generated manifest. Cache headers require
  revalidation. The generated workspace HTML is unchanged.
- Anonymous Windows downloads still lead to parent sign-in.
- Recovery manifests on both origins validate with the child's pinned public
  key for 1.2.326. Both recovery manifests and the actual child-facing feed keep
  SHA-256 `291ca5c4118694bc2da9ba9807c5021928c18a073434affd4085f971b448107d`.

Recorded feature checks were reused for unchanged source: the assessment change
passed 585 cases/83 files and six selected Electron scenarios plus its explicit
UI fixture; Poems passed 598 cases/113 files and 18 selected scenarios. Parent
checks passed all 65 workspace/spelling cases and the production Webpack build.
The Vercel production candidate build passed as well. These are focused results,
not a new full-suite or physical phone acceptance claim.

Evidence: ignored `.tmp/parent-clarity-release-20261023/` contains the clean
source archive, deploy/promote logs, candidate and live asset/feed/auth checks.
The final live overview screenshot contains only the compact assessment row,
without child identities or household records. No Windows installer was built,
installed or launched for this release. Stable was not promoted.

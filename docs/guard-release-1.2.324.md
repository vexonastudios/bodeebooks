# Parent assessment reporting and Windows 1.2.324

The reporting panel and dedicated reviewed permissions import were deployed
first from `2e387547b890047f694a9ac099c33ababcb27481` to production
`dpl_HceV5kqHjmV3Z7LsXBinfXyhCAxa`. Both public aliases and the three new asset
hashes passed; anonymous import access returned 401. The API deployment
`dpl_B5mZED8LcLsTbEWbVQC6QHnChy2n` was healthy before this promotion.

The matching Windows release is 1.2.324. Parent download notes mirror its
reviewed release-note data; 13 account tests and TypeScript passed. The final
publisher will deploy the matching download and independent recovery metadata
before switching the signed child feed. Source and deployment evidence for
the first stage is in `.tmp/abeka-assessments-parent-publication.json`.

Parent feature verification passed the recorded full site suite, final 63
workspace tests including a realistic 500-item import, and isolated phone UI
checks. Fixed routes retain parent sign-in, same-origin checks, confirmation,
request bounds and API authority. Parent/student Abeka logins stay separate;
permissions use an explicit reviewed metadata import. Child reporting needs
the new Windows release. Missing history does not establish completion and
previously unseen grades cannot be backfilled. No household review preference
or official Abeka assessment/grade was changed during deployment.

## Completed publication

Published October 22, 2026 at 21:09 UTC (4:09 PM Central). Matching source
`62f246a`, production `dpl_HnoJSrappSMJ6txLtk9VXUWL3Gx3`. Both public aliases,
the authenticated download, independent signed recovery metadata and all three
assessment asset hashes passed. Signed-in browser verification confirmed
1.2.324, its expanded assessment notes and the authenticated reporting panel's
first-check/empty-history guidance. No household preference was changed.

Windows source `d9400aa08ee4d37764399f186fb58cb0c9900e8b`, build
`57ea23f539cd0821b71e2753b24ffeae`, installer SHA-256
`c14a9b2c7565c3673e6b0710528998eee8d57ba778e975f3b149d4720a79e7a0`.
Defender scans were clean. Both immutable installer keys and the child-facing
backup matched the receipt. Signed child feed SHA-256
`3d441d4a92f931ca9f75f71e77e3ea60b712192614ace3abf9fdbe61788b60df`
was switched last and verified with the pinned key. Previous feeds/deployments
remain available for rollback. No family computer was installed, Stable
promotion performed or additional paid GitHub Actions run.

Actual child uptake and live provider capture/import remain acceptance checks.

## October 22 mobile layout correction

Published the desktop-only assessment overview from website source `b747a4d`
to `dpl_E2roLBfKzJHEKntUdxqiTdrSdShq`. The existing `cloud-mobile` layout now
hides the complete Abeka quizzes/tests panel. Desktop reporting and the site's
curated mobile spacing, navigation and controls are retained. Only the mobile
stylesheet and its recorded export hash changed. Matching shared source is
local BodeeGuard commit `5834a242`.

Retained verification covers static checks, 226 focused dashboard unit cases,
five isolated desktop scenarios, and 63 website workspace cases. The candidate
was built from a clean Git archive. Its release identity, exact archived CSS
bytes, installer sign-in requirement and unchanged signed 1.2.324 recovery feed
passed before promotion. Both public aliases independently resolved to the new
deployment and served the reviewed CSS afterward. Served CSS SHA-256:
`090a4183ffd756480ac57b1192a62c8990558c310eb354be0991559701ae417f`.

Publication evidence is retained in
`.tmp/mobile-assessment-publication-b747a4d/publication.json`. Previous deployment
`dpl_HnoJSrappSMJ6txLtk9VXUWL3Gx3` remains available for rollback. The API, Windows
installer, child update feed and family preferences were not changed. Existing
open dashboard tabs need to refresh/reopen to load the new stylesheet.

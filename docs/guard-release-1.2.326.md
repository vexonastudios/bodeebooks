# Matching parent dashboard and Windows download 1.2.326

Published October 23, 2026 at **14:01:04 UTC (9:01 AM Central)**. Parent source
`bc03be3d9a0b51d77f15020da97574ba9948790c` contains the spelling review cards,
printable dictation sheet, parent-reported school-result form/proxy and matching
account release notes. Its implementation evidence is recorded in
[the spelling review receipt](guard-spelling-daily-review-20261023.md).

The API deployed first as `dpl_FkLrtkEi6e2i9DVE2VZvVMdiWPfu`, with the existing
scoped spelling gate extended to provision and verify the school-result column
idempotently. Candidate and actual child-domain health/live checks passed, and
anonymous parent spelling access returned 401. The first parent deployment,
`dpl_BdMGEsdCKJymrD7X6zxauMDCzpFc`, served the new spelling features on both
public domains before Windows packaging began, while retaining the 1.2.325
download until the new installer was verified.

Final matching parent deployment: `dpl_89mwaVRA6F8QPtuFGumb6HJD8NNy`, with
installer version 1.2.326 and independently verified signed recovery metadata.
Both public domains resolve to this deployment. Spelling assets match the clean
archive exactly; normalized LF source hashes also matched the reviewed manifest
before promotion. The existing desktop-only Abeka assessment overview and mobile
layout are preserved. Mobile CSS SHA-256:
`090a4183ffd756480ac57b1192a62c8990558c310eb354be0991559701ae417f`.

The signed-in Chrome account visibly showed download **1.2.326** and the complete
spelling release notes after publication. Anonymous downloads still reach sign-in
through the site's canonical domain/path redirects. No household settings,
assignments, results or balances were changed by release checks.

Windows source `1cc79e5592937d3be566d450e39623150b1f9250`, build
`4459564683039f0577ee0b4c95377ba3`, installer **163,761,384 bytes**, SHA-256
`bb1b70e0563f7778804b2ea4ec188c59c5dba2eecf581b2c6603ce31d07c3426`.
Defender found no threats in the new Guardian or installer, definitions
`1.461.163.0`, with protection enabled. All GitHub assets, both immutable installers
and the backup installer passed independent hashes. The signed child feed was
switched last and verified with the pinned public key; feed SHA-256:
`291ca5c4118694bc2da9ba9807c5021928c18a073434affd4085f971b448107d`.

Parent verification: 21 feature cases, production webpack build and TypeScript;
15 release-preparation cases and TypeScript. Child source checks, bounded
all-wrong completion, durable deferrals, Continue school and old-client handling
are recorded in the cloud repository's `docs/cloud-release-1.2.326.md`. No new
per-answer AI calls or polling were introduced.

Previous parent `dpl_AYmtHKYy2t6PMQaBNd9zp34FnRdg`, previous API
`dpl_4z8x7GbQz8UJiAzegRBqYbNV9HjS` and prior feed bytes remain available for
rollback. No family app was installed, Stable promoted or Mac workflow enabled.
Actual child uptake and school-test improvement remain physical acceptance work.

Public evidence is retained in the child checkout's
`.tmp/release-326/public-surface-verification.json`; publication evidence is under
`out/private-validation/4459564683039f0577ee0b4c95377ba3/hosted-verification/`.

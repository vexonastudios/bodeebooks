# Matching parent download for Windows 1.2.325

Published October 23, 2026 at 02:04:43 UTC (October 22, 9:04 PM Central).
Parent source `c86751f` deployed from a clean Git archive to
`dpl_AYmtHKYy2t6PMQaBNd9zp34FnRdg`. Both public aliases resolved to that
deployment. Installer sign-in and the independent signed recovery metadata
passed before the children's signed update feed switched to 1.2.325.

The API was deployed first as `dpl_4z8x7GbQz8UJiAzegRBqYbNV9HjS` and verified
through the actual installed-child host `guard-api.bodeebooks.com`. This fixes
observed Abeka completion being lost when the provider advances, and prevents
partial future lists from resetting a confirmed day. The Windows release also
delivers coalesced sync wakes; the API combines repeated connection-hint reads.

Matching account notes passed all 13 account tests and TypeScript. Both domains
served the existing reviewed mobile stylesheet, retaining desktop-only Abeka
assessment overview visibility and the curated parent layout. CSS SHA-256:
`090a4183ffd756480ac57b1192a62c8990558c310eb354be0991559701ae417f`.

Windows source `044f6af362219400cfcf1a8f410d49ee7bfe7d03`, build
`b62d5c0082655349210565fb3a6132f0`; installer SHA-256
`2d8460e370660297b9b6c983086630c037b874d1f3c6171c6dbf0d1a9be996be`.
Defender scans were clean. All GitHub assets, two immutable installer copies,
the child-facing backup and the pinned-key signed feed were verified.
Signed feed SHA-256:
`42e4299eb85c4207ded2bdc9b7c1356a9037fd7df3838ded48c33bd4a89721d1`.

Previous healthy parent `dpl_E2roLBfKzJHEKntUdxqiTdrSdShq` and prior feed bytes
remain available for rollback. No family computer was installed or family
preference changed by publication. Stable and Mac publication remain unchanged.
Real child uptake and provider behavior remain physical acceptance checks.

Public-surface evidence is retained in the child source checkout's
`.tmp/release-325/public-surface-verification.json`; detailed publication evidence
is beside its build receipt under `out/private-validation/b62d5c0082655349210565fb3a6132f0/hosted-verification/`.

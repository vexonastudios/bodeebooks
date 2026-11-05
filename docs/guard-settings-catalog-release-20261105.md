# Parent assistant settings catalog release — November 5, 2026

Website source `ded6b6b4317378d6bcc47bee1db299250a80ebac` is live on
guard.bodeebooks.com and bodeebooks.com in deployment
`dpl_2WRw3SKYXMVkcgkro4xYnUYbgnwY`. API source
`4f317a799a02878ef92aa110d5fc30cd0ec0fb6a` was deployed and verified first in
`dpl_9WynwjeFNQjgddErDWvsLNpsaxUk`.

The assistant can prepare supported recurring family and per-child settings
changes, show the current and proposed values, and save only after confirmation.
Browse settings loads current children and typed fields from the shared catalog;
unsupported content, account and security workflows keep their dedicated editors.
The bridge passes the signed review token without client-supplied storage authority.

Verification reused the recorded 64 website tests, desktop/390px/320px isolated
review fixtures and production build. Cloud verification passed 3,006 unit tests,
native protection and all 58 isolated Electron scenarios, with 29 focused tests
and static checks covering final adapter refinements. The hosted candidate build,
release identity, four changed asset hashes, protected downloads, installer hints
and unchanged recovery metadata passed before promotion. Both public domains
serve the new release and exact versioned assets (`20261105-settings-catalog1`).

Signed-in live browser verification used the Johnson tutorial household: Billy's
Music limit review displayed current 60 and proposed 90 minutes. The review was
canceled, and Browse settings loaded the current children and catalog. No live
save or settings approval was submitted. Production saves were not exercised;
transactional save/retry/sibling checks use isolated synthetic families.

Windows Stable and Family Beta remain 1.2.346. No installer or signed child feed
was changed. No new schema migration was needed; the existing API provisioning
scope completed. Previous healthy deployments remain available: website
`dpl_7YrU5dbj9gDFApfjCoTEyJXL7Qdc`, API
`dpl_8sFLz1LWDQQq8XWR1wAYsNHJWtRV`.

Clean source archives, build/promote logs and published asset/feed checks are in
`.tmp/settings-catalog-release-20261105/` in both worktrees. The cloud repository's
`docs/parent-settings-catalog-20261105.md` contains the full coverage and receipt.

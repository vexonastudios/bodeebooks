# Parent assistant guidance release — November 5, 2026

Website source `01b8404560a7fc83e58aa7d9e773f9bf5c3effe9` is live in deployment
`dpl_7YrU5dbj9gDFApfjCoTEyJXL7Qdc` on both guard.bodeebooks.com and bodeebooks.com.
The commercial API was deployed and checked first: source
`72f0327d02baf0e9768360be8282e4f6d3f59787`, deployment
`dpl_8sFLz1LWDQQq8XWR1wAYsNHJWtRV`.

The assistant now uses the updated product guide, named navigation buttons and
mobile-aware instructions. Learning Videos guidance can open Daily plan with its
activity filter, without changing a child or saving settings. Follow-up context,
first-step visibility and closed-drawer behavior were verified. Existing reviewed
settings actions retain their confirmation and authentication boundaries.

Validation: 64 website tests, the isolated desktop/390px/320px browser fixture,
and the hosted production build passed. The cloud repository records the bounded
dashboard and API tests. Candidates came from clean Git archives and the existing
hosting projects. Published assistant/bootstrap assets match the reviewed source
byte-for-byte on both public domains. Their cache version is
`20261105-parent-guide1`.

Candidate download access correctly required parent sign-in. Both installer hints
remain at 1.2.346, and candidate/live recovery feeds match the previous signed
feed byte-for-byte. No installer was built or updated. No signed-in production
conversation or live paid-model answer test is claimed.

Previous healthy website deployment: `dpl_w7867XTYgUXGNSFJpjNAa8gppWcr`.
Previous healthy API deployment: `dpl_HYJdedXhX9dCsBMXNP5pD167RB1h`.
Deployment logs and verification receipts are retained in
`.tmp/assistant-guide-release-20261105/` in each worktree.

# Parent setup deployment and Family Beta 1.2.341 — November 3, 2026

The owner authorized parent dashboard deployment first, followed by the Windows setup fixes. Website source 4e2d9aacabc2b4988126063478206ef91bfff5b7 is live. Customer Stable remains 1.2.339; the private Family Beta download/recovery manifest is 1.2.341.

- Family setup now starts with the parent password before children/computer connection. Readiness describes saved versus delivered passwords accurately; existing saved choices and step identities are preserved.
- /install focuses, scrolls to and highlights the ready download with reduced-motion support. /activate identifies the child's computer code and removes the separate Paste code control.
- The website was deployed first as dpl_8eYAKj1FvJg8ua7R51XPT3dx2JQC from 7c42542. Both aliases and changed source assets were verified before publishing Windows.
- Final deployment dpl_DWHP5rRJYymhyuHrQAonYiYLMsMZ adds matching 1.2.341 parent release notes and signed Family Beta recovery metadata. Candidate sign-in protection and both live aliases passed. Previous deployment: dpl_J4WQrUfF1zemjPYYAk6GhCDy6w82.
- Reused implementation verification: production build, lint, 94 unit cases, four isolated onboarding fixtures and desktop/phone visual review. Final notes: 32 account/download cases and scoped lint passed. New Vercel production builds passed.
- The live cloud-parent-start.js, cloud-setup-password.js, cloud-parent-readiness.js and cloud-parent-setup.css match reviewed source after newline normalization. API health and anonymous dashboard 401 passed; no API or Worker deployment was needed.
- No real account password, household setting or child installation was changed during verification. The clearer child setup screen and native Close repair require installing Family Beta 1.2.341. Exact artifact, scan, hosted-hash and signed-feed evidence is in the cloud repository's docs/cloud-release-1.2.341.md.

Local website logs: .tmp/setup-release-341/. Final publication and independent live verification are retained under .tmp/release-341/ and the installer build's hosted-verification directory in the cloud worktree.

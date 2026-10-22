# Family Beta parent download 1.2.321

Published October 22, 2026 at 15:48 UTC with the verified Windows Family Beta
release for Math Coach beside Abeka and test/quiz restrictions on Writing and
math help. Parent source `93b89fd` changes only reviewed release-note data in
`shared/guard-cloud-release.ts`. Existing dashboard changes were preserved.

Parent deployment: `dpl_6KJRQwbc6Lp1fHZW5CdC5kbfpcP3`. Previous healthy
deployment `dpl_E4gsUpUEoTEAXPmezQVHnpXhQmCq` is retained for rollback.
Both aliases, authenticated-download gate and signed recovery feeds passed the
existing Family Beta publisher's checks. Signed-in browser verification showed
the 1.2.321 download and Software updates label; expanded notes showed the Math
Coach and assessment changes. No household setting was changed as a test.

Account/download tests passed 13/13 and TypeScript passed before publication.
The production build completed through the existing publisher. Installer
version is persisted for build and runtime. Only after the parent was ready
was the child's signed feed switched.

Windows exact source `a3c2f1f94312a849405e7f1401e461729ff7aaeb`, build
`91e6369049dd7dd91226163dfc2adfae`, installer SHA-256
`27259771fae8c309fcbf20ef0c6fc2fb8ef961591d2f3e4abe2faa1b4534e53d`.
Full source/runtime verification, source coverage, signatures/tamper, hosted-byte
checks and Defender scans passed. API/Worker code and Stable were unchanged.
The complete release receipt is in the BodeeGuard repository at
`docs/cloud-release-1.2.321.md`. Actual child installation and real Abeka
acceptance remain physical checks.

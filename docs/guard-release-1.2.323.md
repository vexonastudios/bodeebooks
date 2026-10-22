# Family Beta parent dashboard and download 1.2.323

Published October 22, 2026 at 19:33 UTC. Parent implementation
`0fc4364` adds Overview → Quizlet AI questions with per-child opt-in, bounded
private question history, computer coverage status and confirmed history clear.
Fixed same-origin authenticated bridge actions strip caller-supplied household
or question content. Existing site-only dashboard integrations are preserved.

Complete site tests passed 275/275 and TypeScript passed. Matching release-note
data then passed 13 account tests and TypeScript. Mobile layout and inert text
rendering passed isolated Electron fixture verification using synthetic data.

The API must be deployed first. The existing Family Beta publisher builds clean
website source and verifies the parent download and signed recovery metadata
before advancing the child feed. Question review requires Windows 1.2.323 and
per-child opt-in; it records newly observed questions/send attempts, not past
chats, AI replies, drafts or uploaded files. Capture is best effort and its
status is displayed. No automatic household-wide enablement or family-computer
installation is implied by publication. Detailed evidence and physical-device
acceptance are in BodeeGuard's `docs/cloud-release-1.2.323.md` and
`docs/cloud-quizlet-review.md`.

Production source `59834f4`, deployment `dpl_41Vjxf59CVq3GMyBLeiRpdawLd8C`;
previous healthy `dpl_BnFG3QihX84dsSHNxj3j6M6kQ8Bq` is retained. Both aliases,
authenticated download and independent recovery metadata passed publisher checks.
The signed child feed was switched last. Signed-in browser verification loaded
Overview → Quizlet AI questions and the authenticated OFF state successfully.
The parent chose review only for children they name; those names are pending.
No review preference has been changed yet.

API deployment `dpl_HartbwXgriFc12hF2xKJGz9UhvA5` was live before publication.
Windows exact source `8d40deddea86be584ac6dff25ecb1f08d9f188de`, build
`e37b116dcee3932f557ed6ce4d1d1a2a`, installer SHA-256
`e2486e9115b1884cc44dd8fdb86a304faa605f55d31e9d6f49eaff8c6767ece6`.
Fresh Defender scans found no threats. Parent dashboard tests, full recorded
Windows verification, source/artifact/signature/hosted-byte checks passed as
documented in the BodeeGuard release receipt. No physical installation or
Stable promotion was performed.

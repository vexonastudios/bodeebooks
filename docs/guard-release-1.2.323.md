# Family Beta parent dashboard and download 1.2.323

Prepared October 22, 2026; publication is pending. Parent implementation
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

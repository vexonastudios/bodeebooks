# One group per set of children and archived conversations

October 5, 2026. API and parent dashboard change; no Windows installer change is required.

## Behavior

A parent or child selecting the same exact children reuses the existing fixed-audience group, regardless of order or whether the parent or a child originally created it. Separate one-to-one parent conversations and the dynamic Family conversation retain their existing meanings.

Closed groups move out of the parent's active Groups list and count into Archived. Their history stays readable. The parent can explicitly reopen the canonical conversation; creating it again does not reopen it. Earlier duplicate histories have an Open existing chat action instead of creating or reopening a duplicate.

The additive audience migration keeps one canonical group and archives extras without moving or deleting messages, membership, attachments or reactions. Initially it prefers an open parent-created group, then the oldest group. Subsequent runs retain the established canonical group, even when closed. A unique audience index, household transaction lock and creation-request receipt prevent duplicate creation and changed-audience retries. Legacy in-flight creations are reconciled on the next create/reopen.

The parent composer accepts the canonical ID returned by the API only after validating the exact recipients. Interrupted sends retain their draft and stable message ID. Existing child clients already use the returned group ID and keep access to closed history; this change does not replace their conversation-list UI.

## Verification and publication

Five focused API cases pass, including parent-to-sibling and sibling-to-parent reuse, reordered recipients, lost replies, foreign children, explicit reopen, duplicate cleanup replay, unchanged message records and closure preservation. The extended parent Electron fixture passes phone sizes 320/390/768, desktop split view, archive isolation, read-only history and a failed-send/retry into an existing conversation. Screenshots are synthetic. Parent TypeScript, targeted route ESLint and 15 account/bridge cases pass. The full cloud verification passed; exact source and deployment identifiers appear below.

Only Messages JS/CSS, the workspace import cache key and the protected route's cache keys are changed in the parent project. Earlier parent desktop and mobile style improvements are retained. The schema is provisioned using the existing family-messages scope, then API candidate health is checked before promotion. The website is deployed from a clean whole-repository archive with Windows installer 1.2.290 retained. Exact asset hashes, both aliases and the unchanged pinned signed update feed are verified before reporting publication.

Ignored evidence: cloud .tmp/chat-audiences-full.log and .tmp/chat-audiences-focused.log; parent .tmp/messages-archived-groups.png and .tmp/messages-groups.png. Publication artifacts belong in .tmp/chat-audiences-20261005/ in each active worktree.

## Published to existing Family Beta

Verified 2026-10-05T19:08:37.527Z. Cloud feature source b2b6269e0ca73907f5ed003a4f7ea28bcddd2658; parent source 1082239c3eda5633de58d4c6843ff029fa7dc457. API deployment dpl_9r5YG8D3k3uHG3bpHcjqRNxdkSzK passed candidate and public liveness/database health. Its family-messages provisioning transaction completed successfully. Parent deployment dpl_2DXt6671NJcRwCNAVtM1VATnAgWj passed the production build, protected candidate asset/authentication/feed checks and both public aliases. Eleven dashboard assets match the clean archive; unrelated recent fixes retain their preceding live bytes. The Windows 1.2.290 primary feed and independent website recovery feeds still match SHA-256 6e5afd94e9c1adb3680b372ea3a2848f4b7813ef8568ec79670975c3746e42b0 and verify against the child's pinned public key. No child installer was rebuilt.

Full verification passed: 2,306 unit/service cases across 431 files, native protection and 48 isolated Electron scenarios (approximately 628 seconds total). The parent mobile fixture also passed after the cache-key update. TypeScript, route ESLint, 15 account/bridge cases and four release-note regressions passed. The close/reopen fixture now navigates through Archived. No real household messages were posted during testing. An installed Android PWA refresh remains a physical acceptance step.

Prior healthy deployments retained for rollback: API dpl_44zFyHajYkFfTgbeDVoJfX7yJG6b; website dpl_E1poSHYwSfzjAj4dxzCQFoRxKKmv. Keep the additive schema and original history records if rolling back application code; do not delete archived groups. Source archives, candidate probes, exact asset hashes and publication results are preserved in each worktree's ignored .tmp/chat-audiences-20261005/.

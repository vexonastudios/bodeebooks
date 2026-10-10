# Parent dashboard idle checks — October 10, 2026

Status: implemented locally; not pushed or deployed. Include in the next authorized parent website release. No child installer or API/schema change is needed for this feature.

## Behavior

- While the visible dashboard is being used, small connection-status reads run every 30 seconds after the previous check finishes.
- After three minutes without interaction, recurring connection checks stop completely. There is no five-minute idle polling. The full dashboard snapshot timer, its retries, PWA release polling and selected-chat fallback polling also pause.
- Returning by mouse, keyboard, touch, scrolling, focus or reopening refreshes current information and restores normal active checks. Input is captured before individual controls stop event propagation. Same-origin PWA header activity counts too. Ordinary typing/movement creates no extra requests; overlapping checks coalesce.
- The selected chat releases its reading lease once when idle, then stops its 15-second heartbeat. New messages are not automatically marked read or suppressed as though an absent parent were reading them.
- Incoming messages still use the live socket/service-worker notification path. Event-driven unread updates do not restart recurring idle polling. Push delivery retains its own connection maintenance; this change does not claim zero network traffic.
- Hidden/minimized pages retain their existing stop/abort and resume lifecycle. Child tracking, parent authority and message delivery permissions are unchanged.
- Idle state is transient and shared only with the same-origin PWA frame host. Monotonic time avoids wall-clock changes affecting inactivity. Existing connection freshness expiry remains: stale observations must not be presented as current.
- The status label says “Connections checked automatically.”

## Source and export

The shared owner is renderer/js/admin/cloud-connection-refresh.js in the BodeeGuard repository. That helper, cloud-dashboard-refresh.js and the idle-related edits in cloud-messages.js are also present in website public/guard-admin/. Each repository has its own cloud-workspace.js integration; preserve their differences rather than using a blanket export. Website ParentNotifications.tsx and parentRelease.ts observe the same local activity state.

Regression tests simulate 12 hours left visible: no further connection or full-dashboard reads after the idle threshold, including failure/retry paths. Tests also cover immediate return, all input types, iframe focus, in-flight coalescing, stale responses, chat lease release, idle release checks and uninterrupted message delivery. Initial loads, manual actions, real push events and delivery connection maintenance are separate from idle polling.

Exact source hashes and results are retained in ignored .tmp/parent-idle-stop-20261010/source-evidence.json. Earlier API optimization/policy-sync changes remain a separate pending batch with their own receipts. The stricter stop policy supersedes the earlier five-minute interval recorded in .tmp/parent-idle-20261010/.

Validation: 301 focused dashboard/messaging unit cases and all 8 selected isolated Electron scenarios passed. The website passed 72 tests, TypeScript and focused ESLint; the final exported activity helper also passed its 11 overnight/activity/message/presence cases. No production deployment or GitHub Actions run.

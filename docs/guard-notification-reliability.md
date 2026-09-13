# Parent notification reliability

The follow-up adds notification health warnings, device names and remote removal,
local/server opt-out during BodeeGuard sign-out, per-child notification grouping,
parent-specific unread counts, supported app badges, and Staff → Notifications.
Phone settings remain under Messages/Settings → Phone notifications.

Visible-page checks replace idle polling. Remote removal cannot be undone by
background renewal. Notification forms defer automatic PWA reloads. A notification
tap keeps the selected conversation through sign-in and focuses an existing app
without reloading message drafts. Read clearing requires the visible conversation
at its latest messages, and preserves newer/sibling alerts on that phone.

The companion API and existing Cloudflare Worker provide pending-only per-family
alarms with retries starting at 30 seconds, capped at five minutes. The hourly
maintenance sweep remains as recovery for lost/unavailable wake requests.
Provider acceptance is not phone display or human reading. No paid notification
vendor or Windows installer update is required; ordinary hosting usage applies.

Backend deployment/security/retention details live in
bodee-guard/docs/parent-notification-reliability.md. Deploy the Worker and migrated
API before this website, retaining stable VAPID keys. Physical iPhone/Android
opt-in, locked-phone delivery and tap-to-conversation checks remain necessary.


## Production receipt — September 13, 2026

- Final source 42ed020, including 1ec2290, pushed to codex/notification-reliability.
- Final deployment dpl_9QCmEaAKerFKzTSxHYkhGTGKgb2D:
  bodeebooks-h90dzy8is-vexonastudios-3984s-projects.vercel.app.
  Parent app fingerprint starts 12ed2bc9729a.
- The follow-up makes Sign out of this device directly available under Parent
  identity on the account page; it reuses the same notification-aware logout as
  the public page's account menu.
- All 133 website tests, final local Webpack and hosted production builds passed.
  A synthetic real Electron fixture tested renaming/removing a phone, retained
  dialog state, desktop/390px phone layouts and 44px controls.
- Signed-in live phone settings load without error, unread navigation badges
  render, the new account sign-out button is present, and Staff → Notifications
  loads queue/acceptance/failure counts with no configuration warning.
- Worker, version JSON and dashboard modules match source with no-store or
  revalidation headers. The older first candidate CGAK1jcpkCX4xvZrfaB5rBZZYhdu
  was superseded by the final account-sign-out deployment above.
- Companion API source 2482fb4, deployment dpl_9VarejRWBJ7KaJysa67Zi9DuWSwy;
  Worker version 707f8d71-1a34-471b-98a7-74054a36d54e. See the backend receipt
  for full unit/native/Electron and durable alarm verification.
- No real notification permission, enrollment, logout, device removal or message
  was performed by the agent. Actual phone opt-in, lock-screen delivery and
  tap-to-conversation confirmation remain pending the parent's check.

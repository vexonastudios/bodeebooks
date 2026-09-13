# Parent phone notifications

Messages and Settings now offer **Phone notifications**. The top-level PWA owns
notification permission and enrollment because a permission prompt must follow
the parent's click in the top-level page. The embedded workspace opens this
dialog through checked same-origin postMessage events.

Parents choose **Enable notifications**, accept permission and use **Send test
notification** on each device. iPhone/iPad requires opening the Home Screen web
app (iOS/iPadOS 16.4+). Android Chrome supports the parent PWA. No child EXE update
is needed. Phone Focus, connectivity and OS notification settings still govern
whether an alert appears; provider acceptance is not display confirmation.

The existing API saves encrypted Web Push subscriptions against the authenticated
parent, enqueues only newly inserted child messages, then sends through the
browser's push service. There is no paid notification provider or extra polling;
ordinary existing hosting usage remains. Subscription keys are not in Git or
browser bundles. The public VAPID key comes from the authenticated bridge config.

Payloads contain only notification type and an opaque student ID. The lock screen
shows a generic message alert. Tapping focuses an open dashboard and selects the
accessible child's Messages without reloading drafts, or opens a new dashboard
with a validated conversation fragment. Parents may turn alerts off even while
the API is unreachable; changing parent accounts unsubscribes the previous one
instead of silently opting in the next account. Existing subscribers renew once
per day on visible launch/resume, with no background timer.

Relevant source: `ParentNotifications.tsx`, `parent-notifications-client.js`,
`bridge/route.ts`, `public/guard-admin/cloud-workspace.js`, and
`public/guard-parent-sw.js`. The worker still does not cache private navigation;
the parent app's automatic version checks include the new source and worker.

The API must be deployed first with its additive parent-notifications migration
and stable VAPID variables. Backend details and retention/retry limits live in
`bodee-guard/docs/parent-phone-notifications.md`. Ordinary dispatch is immediate;
after transient provider failures, the existing hourly maintenance retries the
retained jobs. Jobs expire after 24 hours.

Seven client/worker tests exercise click-bound permission, iPhone installation,
daily visible-only renewal, account switching, offline unsubscribe, generic
payloads, safe navigation and no reload of open drafts. Full website tests and
the production build are required before deployment. Phone lock-screen delivery
still needs an actual parent's opt-in and test notification.

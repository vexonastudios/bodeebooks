# Active parent chat notification fix

September 28, 2026. Selective parent website update; Windows download remains 1.2.260.

The parent page reports the loaded visible child's conversation for this
notification device only, using fresh trusted-frame reports and serialized
15-second heartbeats. The API holds its push queue under a server-time 40-second
lease until the actual read acknowledgement or chat closure/expiry. Other
children, parent accounts and devices retain their alerts. Presence never enrolls
a phone or reads unseen messages.

The website now connects the existing cloud live-message client so replies
refresh the open conversation directly. Hidden pages stop the connection and
release their view. Existing sign-in recovery, message drafts, Enter-to-send,
broadcast controls, service-worker display and notification preferences remain.

Verification: 99 relevant website tests passed together; the additional actual
parent lifecycle test also passed (seven session/navigation/lifecycle cases).
Scoped lint and final Webpack production build passed. Three isolated Electron
fixtures passed: mobile live chat and presence/reconnect, broadcast voice/drafts,
and real iframe sign-in recovery. Database and full app verification are recorded
in the canonical repository's cloud-active-chat-notifications-20260928.md.

The earlier mobile fixture first caught an invalid use of the GET-only session
recovery helper for a push-ticket POST; this was corrected before publishing.
Adding a synthetic incoming reply also required updating expected history counts.
No family messages/test pushes, real phone enrollment or settings changes occurred.

Deployments and public release/asset checks will be appended after publication.
Physical Android/iPhone foreground/background acceptance remains unconfirmed.

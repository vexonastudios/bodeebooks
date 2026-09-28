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

## Published receipt

- Exact website source: 304dbe5fa6fb2bb4848399f18ea7e94bbcb6760e.
- API exact source: 6e5a22a9f7645497468c8d28579978ff94e3c441.
  Production dpl_C4G5YJ7m52ix54pgFmStax7TRk3c, healthy before/after promotion;
  anonymous notification access 401; scoped additive schema gate passed.
- Website production: dpl_9Y6xw3qDKVVe5AUJbSjwNZjnocgR /
  https://bodeebooks-5nlh6xyvp-vexonastudios-3984s-projects.vercel.app.
  Vercel Turbopack build/type check passed. Candidate release identity, exact
  archive bytes for both changed modules and bridge sign-in protection passed.
- Promoted guard.bodeebooks.com/dashboard/release/ returned the same deployment
  ID with no-store. Both live dashboard modules match the released Git archive.
  Evidence: .tmp/active-chat-site-live-release.json and
  .tmp/active-chat-live-assets.json. Git's Windows archive uses CRLF; normalized
  deployed content also matches the tested working files.
- Clean tracked archive: .tmp/active-chat-release/site. Build/runtime installer
  selection remains 1.2.260. API was promoted before the parent website.
- Healthy rollback: dpl_GU2wodWwSvPzsKDsW46eW2q27nRw.
- Physical Android/iPhone foreground/background acceptance remains unconfirmed.
  Parent should reopen/refresh the app to load the changed frontend. No real
  message/test push, phone enrollment or notification preference was changed.

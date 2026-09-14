# Student song requests

Implemented September 14, 2026. Parent access is under **Music → Song Requests**
on desktop, or **Add media → Music → Song requests** on the parent phone app.

Submitting a song saves a household/child-scoped request and a conversation
message in the same transaction. The existing message trigger creates the
durable encrypted Web Push outbox for subscribed parent devices. After commit,
live hints refresh messages and the song-request badge. The phone notification
opens the conversation, which includes a Review song requests shortcut.
Notification delivery depends on the parent's existing browser permission and
phone settings; saving a request does not depend on immediate push delivery.

Parents choose an existing family recording or paste a YouTube recording link,
preview it and explicitly confirm screening. Approval atomically screens/adds
the recording, assigns it only to the requesting child, resolves the request,
and saves the child's decision message. Declining saves a decision without
adding music. Daily plans, computer locks and media budgets still apply.
The dialog stays open on save failure and retries the same decision receipt.
Multiple request cards can be reviewed without reloading the entire queue.

The Add media badge combines pending music and coloring requests. Counts use a
small scoped catalog query, without downloading the music library or rebuilding
the media adapter for converted families. Counts refresh on visible dashboard
load/reconnect, manual refresh and existing push hints; no new polling timer.
Open queues show a refresh notice when the count changes elsewhere.

Request input is bounded to 80 characters per field and rendered as text. Each
child can have at most 20 pending songs. Same-title/artist pending duplicates
are suppressed, including submissions from older app versions with fresh retry
IDs. A child cannot approve, inspect another child's history or choose another
household. Failed/contradictory decisions preserve the original request.
Old pending security-alert records remain visible and reviewable. Additional
request fields live in the existing normalized media catalog rows; no new
production PostgreSQL migration is required.

Child source also fixes false success on HTTP errors, retains an uncertain
request and its receipt on the device, displays recent decisions, allows a first
request from an empty library, and refreshes an open song list on a media hint
without pausing a still-approved recording. These installed-file changes need
a new Windows release. This feature deployment does not publish an installer;
the currently published child version remains 1.2.222.

Verification used synthetic family data only: PostgreSQL integration covers
storage/outbox atomicity, scoped approval, retries, declines, archive boundaries
and push outage recovery. The actual parent and child pages were exercised in
an isolated Electron profile, with external traffic blocked: mobile badges,
HTML safety, explicit recording review, failed saves, same-ID retries, desktop
dialog, empty library, persisted child draft, HTTP error feedback and preserving
current playback during a library refresh. Existing coloring and all three
mobile media add forms passed regression checks.

Full verification passed 1,748 unit/API cases and native checks. After the added
cache regression, its focused tests passed (1,749 total cases in source). All
40 Electron scenarios passed across the full run and its resumed 28 scenarios;
the parent fixture was updated to classify the new count request as a read.
Website tests passed 133 cases and its production build passed. Logs and the
deployment receipt are retained in the ignored `.tmp/song-*` files.

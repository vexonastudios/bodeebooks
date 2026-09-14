# Parent Coloring Studio approvals and mobile navigation

Mobile More uses Lucide icons for every entry. Add Media includes Coloring Studio,
with a pending-approval badge in the bottom navigation and on its card. When
reviews are waiting, its card moves to the top of Add Media.

The same Coloring Studio screen serves desktop and mobile. Reviews come first,
with a thumbnail, full-image preview, approval/rejection buttons and a per-image
"Share with all my children" checkbox. Successful actions update the individual
card and count without reloading the gallery or resetting another page's choice.
Failed actions retain the request, choice and badge. Approval waits for a loaded
preview; image errors can be retried. Saved pages and child settings are collapsible.

## Family sharing

The family setting "Automatically share new pages with all my children" is opt-in
and defaults off. Save family settings to apply it. Future successfully generated
or reused pages share when ready if image review is disabled. When review is
required, they stay private until a parent approves the finished image. The
per-image checkbox can override the family default in either direction.
The setting is read at the final database write, including after slow generation.
Older parent clients omitting the new setting preserve its current value.

Turning the setting on does not bulk-share old pages. Parents can still share or
stop sharing individual saved pages. Sharing reuses the same household-private
asset receipt; it generates no sibling copies or additional paid render. It does
not enable Coloring Studio for a child or bypass their school access controls.
Unapproved/blocked images remain inaccessible to siblings and other households.

## Resource use and delivery

A new parent-authenticated `coloring-studio/pending` endpoint returns only a count.
It uses a read transaction and partial review index, excludes archived children,
and is accurate beyond the gallery's 250-row limit. Pending requests sort before
history so that older reviews are reachable. The full parent overview also uses a
read transaction and one grouped usage query instead of per-child counts.

Opening/resuming or refreshing the dashboard requests this count. Successful
coloring requests and parent actions publish an existing, signed `media` hint to
connected parent sockets. The web client requests the count on that hint. There
is no new polling timer, background gallery fetch or image download for the badge.
Existing visible dashboard refreshes provide recovery after a missed hint.
Hidden pages abort pending-count work; first reads coalesce. New requests arriving
during a review offer a refresh button without discarding the parent's choices.

Gallery previews request thumbnails only as they approach the viewport; collapsed
saved pages are not fetched. Full image bytes load on demand. Repeated previews
within the open screen reuse the request and leave no persistent parent cache.

## Release and verification

API migration: `schema/migrations/2026-09-24-coloring-family-sharing.sql`.
Deploy scope `coloring-sharing` applies only the additive boolean and partial
index, with transaction/lock timeouts. Existing records and opt-ins survive
reapplication. Deploy/promote the API before the parent website.
No child EXE or Cloudflare Worker release is required.

API tests exercise opt-in, current preference during generation, both per-image
exceptions, image review, reuse, moderation failures, unshare, household isolation,
no duplicate assets, push hint scope, archived children, more than 250 requests,
read-only counts and migration reapplication.

Website `scripts/test-coloring-parent-electron.mjs` uses fictional requests and
local WebP images in an isolated profile. It covers every More icon, count badges,
lazy/full previews, failed approval, consecutive approvals without gallery reload,
sharing choices/settings and 320px/desktop layouts. The original mobile messages
and three real media-add forms remain covered by their existing fixtures.

Release results and deployment IDs are recorded in the ignored local release
receipt after publication. No real family images, messages or AI calls are used
in acceptance tests.

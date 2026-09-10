# Parent dashboard refresh behavior

The parent dashboard requests current child stats on opening, returning to a
visible tab, and browser back/forward restoration. While visible, it refreshes
every 30 minutes; the Refresh button requests another update immediately.

When hidden or navigated away, the dashboard cancels its refresh timer and pending
stats requests, cancels the short wait for child responses, and closes its parent
notification connection. Returning starts a new request. An old response cannot
render a hidden dashboard or schedule another refresh. Requests already received
by the server may finish there. Child activity tracking and synchronization are
separate and are not disabled by the parent closing the dashboard.

The outer Clerk page also waits for visibility before initializing the workspace.
Hidden screenshot results cannot initiate thumbnail downloads. Family Watch no
longer fetches students/session state during dashboard initialization; it loads on
opening its panel and polls only while that panel is visible and a watch is active.

## Validation

- `node --test tests/guard-dashboard-refresh.test.mjs tests/guard-reconnection.test.mjs tests/guard-parent-pwa.test.mjs`: 15 passed.
- Isolated Electron browser fixture loaded the actual workspace route HTML and
  website scripts with a synthetic family, temporary profile and loopback-only
  network access. Verified zero initial background API requests, fresh computer
  requests and snapshots on opening/return, push socket closure, and cancellation
  of a pending refresh. No runtime errors.
- Changed-file lint: no errors (six existing warnings).
- `tests/guard-workspace.test.mjs`: 34 pass and 8 existing failures, reproduced
  against unchanged release `36ad3c3`. These concern old scan limits, route test
  loaders, the moved iframe assertion, and image-delivery expectations.

This is a website update. The child installer and auto-update version stay at
1.2.200.

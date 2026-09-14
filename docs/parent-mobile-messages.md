# Parent mobile controls and messages

On phones, Daily plan is omitted from Quick controls and More. The header owns
the single Refresh control, with an in-progress state. Quick controls retains
Lock all computers and its last-updated timestamp. Desktop keeps Daily plan and
the overview Refresh button.

Messages uses a conversation list, then a dedicated chat with a Back button.
The composer stays above navigation; text, attachments, voice recording and Send
share one compact row. Attachment removal appears only when needed. Recording
previews remain playable, and the assistant launcher does not cover the chat.
The outer iframe follows the phone's visual viewport when the keyboard opens.

Unread counts sit beside the navigation icon and use `99+` for large counts;
accessible labels retain the full count. Opening the list alone neither fetches
the selected thread nor marks it read. Switching children preserves each draft.
Existing authenticated transport, message IDs, attachment validation, recording
limits and audio element reuse remain in place. No new polling or per-child
preview downloads were added.

Validation:

- `node --test tests/*.test.mjs` — 133 passing.
- `npm run build -- --webpack` — passing.
- Run `scripts/test-parent-mobile-electron.mjs` with Electron: synthetic family,
  320/390px phones, reduced keyboard viewport, desktop, refresh, badges, list and
  chat switching, drafts, hidden-thread read protection, attachments, synthetic
  microphone recording, media element stability and retry identity.
- Cloud repository voice fixture also supports `--site=<this checkout>` and
  checks complete playback, recording limits, lost responses and sibling isolation.

Real iOS/Android keyboard and microphone permission behavior still deserves a
phone acceptance check. Fixtures never send messages to a real family.

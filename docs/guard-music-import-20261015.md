# Guard Music playlists and bulk paste — October 15, 2026

Implemented in `codex/release-310`; not pushed or deployed. Paired cloud source
and tests: `C:/Projects/worktrees/bodee-guard/headset-reconnect`, receipt
`docs/cloud-music-import-20261015.md`.

The empty child picker was caused by the Music module calling an avatar helper
that the hosted dashboard does not load. The module now owns its child selector,
waits for initialization, and shows retryable failures instead of empty columns.
Settings and History use the same corrected child loading. The media loader
allows initialization retry and handles rejected loads without a stuck promise.

Music accepts lists of up to 50 YouTube links/IDs. Parents review titles/artists
and approve for the library, a named child or every child. Personal imports keep
the reviewed child identity. Duplicate links and existing tracks are reused;
failed entries/assignments can be retried without repeating confirmed saves.
No family data or existing assignments were changed during development.

Selective asset update: `media-music.js`, `cloud-media-admin.js`, and its workspace
route cache version. Existing visibility, Family Watch, mobile and other media
loader differences were preserved; no blanket export was performed.

Verification:
- Cloud focused media checks: 271 tests/53 files and 9 isolated runtime scenarios.
- Final Music UI fixture: startup failure/retry, two children, selectors,
  individual/all/library-only imports, duplicate/invalid inputs, missing title,
  partial saves, safe retries, removal failure, title escaping and 390px layout.
- Existing `tests/guard-mobile-media.electron.cjs`: all media search/review/save
  flows, including Music single-song add to every child.
- 98 account/workspace/dashboard/refresh/idle tests passed.
- `npx next build --webpack` production build passed. Webpack is required in this
  worktree because its dependency junction is outside the Turbopack root.
- Logs: `.tmp/music-website-tests.log`, `.tmp/music-webpack-final.log`;
  synthetic screenshots/fixture logs are in the paired cloud worktree.

Publish with the next authorized parent website deployment. No new API or child
installer is required for this change. Refresh the parent dashboard afterward
and confirm Music → Playlists lists children before importing real songs.

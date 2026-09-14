# Mobile Add media

The bottom Add media button opens three choices: Music, Videos and Audiobooks.
Each opens the existing YouTube search/link form in a focused phone layout.
View library restores that category's full library, playlists and student access
controls; Add media stays selected in bottom navigation. Schoolwork is not
listed in this hub.

Forms retain their nodes and drafts when the parent goes back. Existing preview,
screening, assignment and authenticated media transport behavior are preserved.
The assistant launcher is hidden while adding so it cannot cover Save. Desktop
retains the full category pages. Music waits for its existing event handlers to
finish initializing before accepting input.

The hub itself makes no requests. Video and audiobook add views use already
wired forms without downloading unrelated settings, channels or library lists.
Those lists load when View library is selected. No polling was added.

Validation: `scripts/test-mobile-media-electron.mjs` runs actual parent media
modules with a fictional household and blocked external traffic. It verifies all
three save routes, unscreened defaults, Back/draft retention, library navigation,
the active bottom button, no hub requests, and layouts at 320/390px and desktop.
Also checked: existing mobile chat fixture, 133 website tests, webpack production
build, and the shared repository's focused dashboard/media checks.

# White Noise parent release — September 14, 2026

Source `0dbc6c415051adc7c002b09aacbcac1731866523` is published to production as
`dpl_7Egz2pQ1HQvjuWTKdrz4g3sAmywx`
(`bodeebooks-2h3xw6ikm-vexonastudios-3984s-projects.vercel.app`).

The dashboard adds White Noise under Media & Family and mobile Add media, MP3
uploads, inline previews and per-child switches. The seven shared starter tracks
are live. Child playback requires Windows update 1.2.225.

The previous local production build and 13 account checks were reused for
unchanged source. Vercel's production build passed. Live White Noise JS/CSS,
mobile/workspace JS and the PWA version fingerprint match source exactly.
Authenticated Chrome showed all seven titled shared tracks and per-child
switches. No family settings were changed during verification.

The installer objects and signed child feed were verified before parent promotion.
Both the deployment and saved production environment specify
`BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION=1.2.225`. The authenticated account
page visibly shows Family Beta updates · Version 1.2.225 and the Windows download.

API deployment: `dpl_215KBATUzqxLQK42S7m7v2WYPjmw`. API health returned 200;
unauthenticated White Noise returned 401. Unauthenticated dashboard requests
redirect to sign-in and the inner workspace returns 401.

Installer integrity and full hosted download receipts are recorded in the
BodeeGuard repository's `docs/cloud-release-1.2.225.md`. Physical child installation
and acceptance remain to be confirmed. No Stable/customer promotion occurred.

Deployment logs are retained in `.tmp/white-noise-225-website-*.log`.

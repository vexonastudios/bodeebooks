# Overview clarity — November 3, 2026

The parent dashboard now has consistent compact disclosure headers for exit
reports, Quizlet question review and computer setup/recovery. Exit reports stay
collapsed with a visible count; empty history no longer takes up an expanded
panel or shows a disabled Clear all button.

Quizlet review stays on Overview for families with an active child allowed to
use Quizlet. Otherwise its optional settings/history live under Settings.
Existing preferences and history are retained and no new background request or
automatic opt-in is introduced. Visibility comes from the existing snapshot.

Selective source transfer preserves website-specific changes. Workspace JS/CSS
cache version: `20261103-overview1`. All 286 website tests and the production
Next webpack build passed. Isolated desktop/mobile, exit-report, Quizlet and
focused dashboard checks are recorded in the cloud repository's
`docs/overview-disclosures-20261103.md`.

Published with the authorized optional-school-sites batch on November 3, 2026.
See `docs/guard-optional-school-sites-20261103.md` for exact source/deployment
identities and live verification. No Windows release was needed.

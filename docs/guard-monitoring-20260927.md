# Staff health dashboard — September 27, 2026

Source f15bd46 is published as dpl_7fkDAw8VyeatrGN4ZsuytDKEC55q:
https://bodeebooks-nu48runlw-vexonastudios-3984s-projects.vercel.app

Clean archive: .tmp/monitor-site-f15bd46. The live release endpoint returned
that deployment after promotion. BODEEGUARD_MONITOR_RELEASE=f15bd46 labels
browser errors; the installer stays 1.2.251 at build/runtime. No child release
was created for these web/cloud changes.

Added /admin/health/ (staff authentication), automatic refresh, explicit stale
health, open/investigating/resolved incidents, recurrence counts and diagnostic
details. Parent/mobile uncaught errors use a bounded retry queue and same-origin
signed-in relay. Content, URLs, credentials and full stacks are excluded.

Verification: production build; changed-file ESLint; 13 account tests; three
new browser privacy/authentication/retry cases. Cloud monitor fixtures and
publication details live in the bodee-guard repository at
 docs/cloud-monitoring-20260927.md.

The live signed-in staff page and synthetic diagnostic receipt were verified.
A monitoring self-test is explicitly labelled operations-self-test. It is not a
family error. The previous healthy deployment remains available for rollback.

Final visual correction: source 9de0450 gives the monitor its own dark background
so headings and help text remain readable under the existing website layout.
Changed-file ESLint and another production build passed. Deployment
`dpl_7vcHi3yazXUYRLBT17GZa9kewjaQ` is live:
https://bodeebooks-nwgtum7fs-vexonastudios-3984s-projects.vercel.app

Candidate release identity was verified before promotion. The signed-in live
staff page was refreshed and visually checked afterward: readable text, persisted
Investigating state and successful 14:30 UTC API/database, parent and update-feed
checks. No family documents or settings were changed. BODEEGUARD_MONITOR_RELEASE
is 9de0450; the parent installer version remains 1.2.251.

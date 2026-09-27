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

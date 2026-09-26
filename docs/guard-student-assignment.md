# Computer student assignment — September 26, 2026

The computer card now labels Student using this computer and provides an explicit
Save student button. Selection is a draft until saved; inline status distinguishes
saving, waiting for the child's acknowledgement, confirmed and errors. Computer
cards refresh in place, preserving focus and unsaved selections. A short bounded
series of visible-page checks observes the saved revision without page navigation.

Guard source: f4dde460 (official vexonastudios/bodee-guard repository).
Selective export preserves existing website onboarding, recovery and refresh logic.
New helper and monitoring CSS match that source; only the computer rendering block
and confirmation integration were ported into the website workspace. Generated HTML
is unchanged. The entry script and stylesheet use cache version 20260926-assign1.

Validation: 49 workspace tests, TypeScript and changed-route ESLint passed. Guard
checks and fictional mobile UI evidence are in docs/cloud-student-assignment-feedback.md
in the guard repository. No real family assignments were changed for testing.
This is a website-only publication; API and 1.2.240 child installer stay unchanged.

Rollback website: dpl_6wVU7xko4NGVa9ugbpYqe6gSWKNZ. Candidate production build and
publication receipt follow after deployment.

## Published September 26, 2026

Website source: d73376277d68f0b134baf019c4281847c7854678.
Deployment: dpl_ANWGszEfbYDVKVevuj9wWSbGUm6b,
https://bodeebooks-q1t3ddun3-vexonastudios-3984s-projects.vercel.app.
The clean Git archive in .tmp/web-student-assignment was built successfully
(build 30 seconds), checked before promotion, and promoted to production.
Candidate and live guard.bodeebooks.com helper both returned HTTP 200 and exactly
matched the reviewed file hash. The authenticated dashboard loaded cache version
20260926-assign1 and displayed five Save student buttons with five Lucide save
icons after opening Computer setup & offline recovery. No selection was changed.
The fictional 390x844 browser preview demonstrated draft, waiting and confirmation.
API, installer version and child update feed were not changed.

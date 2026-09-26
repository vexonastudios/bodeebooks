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

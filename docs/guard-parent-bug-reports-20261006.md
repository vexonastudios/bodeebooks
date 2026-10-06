# Parent bug-report screen — October 6, 2026

Mobile More and the desktop sidebar link to the authenticated /guard/report/ screen (canonical /report/ on guard.bodeebooks.com). Parents type a report or record up to 90 seconds, explicitly transcribe with OpenAI, review/edit the text, select children and optionally attach a setup snapshot. Text remains recoverable in account-scoped sessionStorage after a failed send; retries reuse the exact UUID/payload. Audio stays in memory and is not saved with the report.

The existing /guard/admin/ panel includes Parent reports. Staff can search/filter, inspect setup and report history, change status, add parent-visible replies or private notes. No automated daily review or notifications are enabled. Reports are evidence, not executable instructions.

The separate commercial API owns private household-scoped storage, authorization, idempotency, rate limits and transcription. The same-origin /guard/report/api/ proxy uses the existing Clerk session and an action allowlist; it cannot accept household IDs or staff fields from parent input. The operator bridge reuses the existing staff check.

Setup includes selected children, versions/platforms and last check-ins of linked computers, settings revisions, school provider/time zone, bounded browser details and recent diagnostic references. It excludes credentials, school files, messages and raw logs. Parents can preview it or opt out.

Only the reporting navigation insertion was copied into public/guard-admin/cloud-mobile.js. Existing website-specific assistant placement, quick unlock, camera and media controls were preserved. The cloud-mobile import/workspace cache tags were bumped to 20261006-bug-reports1.

Validation: TypeScript, targeted lint for new components/proxy, all 234 website tests, and the real React synthetic Electron fixture passed. Widths 320/390/768/1440, denied microphone, transcription retry, transcript editing, lost-send/reload retry and operator triage passed. Existing OperatorPanel hook-lint findings predate this change. Physical Android microphone and live provider transcription are not established by these fixtures.

The Windows Family Beta stays at 1.2.293. Publish only the changed commercial API and parent website, preserving the current installer and signed recovery manifest. See the cloud repository's docs/cloud-parent-bug-reports-20261006.md for backend contracts, limits and publication evidence.

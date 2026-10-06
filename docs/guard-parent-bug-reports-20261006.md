# Parent bug-report screen — October 6, 2026

Mobile More and the desktop sidebar link to the authenticated /guard/report/ screen (canonical /report/ on guard.bodeebooks.com). Parents type a report or record up to 90 seconds, explicitly transcribe with OpenAI, review/edit the text, select children and optionally attach a setup snapshot. Text remains recoverable in account-scoped sessionStorage after a failed send; retries reuse the exact UUID/payload. Audio stays in memory and is not saved with the report.

The existing /guard/admin/ panel includes Parent reports. Staff can search/filter, inspect setup and report history, change status, add parent-visible replies or private notes. No automated daily review or notifications are enabled. Reports are evidence, not executable instructions.

The separate commercial API owns private household-scoped storage, authorization, idempotency, rate limits and transcription. The same-origin /guard/report/api/ proxy uses the existing Clerk session and an action allowlist; it cannot accept household IDs or staff fields from parent input. The operator bridge reuses the existing staff check.

Setup includes selected children, versions/platforms and last check-ins of linked computers, settings revisions, school provider/time zone, bounded browser details and recent diagnostic references. It excludes credentials, school files, messages and raw logs. Parents can preview it or opt out.

Only the reporting navigation insertion was copied into public/guard-admin/cloud-mobile.js. Existing website-specific assistant placement, quick unlock, camera and media controls were preserved. The cloud-mobile import/workspace cache tags were bumped to 20261006-bug-reports1.

Validation: TypeScript, targeted lint for new components/proxy, all 234 website tests, and the real React synthetic Electron fixture passed. Widths 320/390/768/1440, denied microphone, transcription retry, transcript editing, lost-send/reload retry and operator triage passed. Existing OperatorPanel hook-lint findings predate this change. Physical Android microphone and live provider transcription are not established by these fixtures.

The Windows Family Beta stays at 1.2.293. Publish only the changed commercial API and parent website, preserving the current installer and signed recovery manifest. See the cloud repository's docs/cloud-parent-bug-reports-20261006.md for backend contracts, limits and publication evidence.

## Publication

Published 2026-10-06; website source ee3e6f30ad7865ce81c3ed281f543782f81916dd, deployment dpl_4SAnUBJhyMzSNSGD7uCa5mvkHsyG, clean checkout C:/Projects/worktrees/bodee-books/parent-bug-reports-20261006. Production Next build succeeded. API source d4cfaad70826daa8462dd48968189be007f2d8dd, deployment dpl_DLSf6oCa5hU68GvkbKCrfadvL9oX, was healthy and promoted first; reporting uses the existing configured assistant OpenAI key when OPENAI_API_KEY is absent.

Public checks at 2026-10-06T17:31:54.992Z verified all 14 dashboard assets on guard.bodeebooks.com and www.bodeebooks.com, the new deployment identity, report sign-in redirects, and 401 responses for unauthenticated parent/staff report POSTs. Bare bodeebooks.com keeps its www redirect. Windows remains 1.2.293; primary and parent backup feed SHA-256 remains 544859af60b4815276a49e6c64d010a6ea99203619b11885a659efa07f85a20f. Previous parent deployment dpl_3kFBE7FazCwuS8m7nH5VdgYJpBNf retained for rollback.

Cloud full regression: 2,347 cases, native protection, all 48 Electron scenarios. The final key-name-only correction passed syntax/lint and six relevant reporting tests. Website: 234 tests, TypeScript, targeted new-code lint and synthetic real-component UI fixture. No real household report/audio was submitted. Physical Android microphone and live provider transcription remain unobserved; no daily review automation was enabled.

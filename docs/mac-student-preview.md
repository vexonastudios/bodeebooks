# Mac student preview integration

**Paused October 3, 2026 at the user's request; Windows is the priority.**
The authoritative handoff is [bodee-guard/docs/mac-paused-handoff.md](https://github.com/vexonastudios/bodee-guard/blob/codex/mac-student-port/docs/mac-paused-handoff.md).
Both Mac branches and existing test evidence are retained. The API/dashboard
preparation below is already live; Mac enrollment remains disabled. No Mac or
iPad release, Apple purchase or additional deployment is authorized by this note.
Read the handoff before resuming so older Mac sources do not replace newer Windows work.

Isolated branch codex/mac-student-port, based on b2dc674. Only the reviewed monitoring Mac patch and generated hashes are transferred from bodee-guard codex/mac-student-port. Website-specific media bypass labels and action feedback are preserved. Mac devices are labeled as app-only previews; Pause affects BodeeGuard activities; Sleep is hidden; Close requires confirmed capability. Windows controls retain their existing labels and version checks.

The API and parent integration were deployed on October 3, 2026, with Mac enrollment explicitly disabled. See the rollout receipt below and bodee-guard/docs/mac-test-session.md before enabling a designated test window. Do not export older unrelated dashboard files over this branch.

## Parent setup follow-through — October 2, 2026

Pairing success now uses the authenticated API platform to explain the Mac preview. The account computer list, Settings computer list, and family setup checklist identify Mac previews and explain that completed setup confirms app rules, not whole-computer protection. Existing Windows installer links remain Windows-only. Recovery, password, assignment and policy acknowledgement prerequisites are preserved.

Validated: 89 account/activation/readiness/workspace tests; real Electron setup at phone and desktop sizes (including an offline, paused Mac with confirmed setup); changed-code lint; Next production build using the supported webpack option. The default Turbopack build cannot follow the development worktree’s external node_modules junction; no product configuration was changed for that local build limitation. This remains a private source branch with no deployment.

## Hosted preparation rollout — October 3, 2026

Parent source a175bb977954df0f1a519b87a9e4027ed2efe776 was deployed from a clean Git archive to the existing bodeebooks project and promoted as dpl_9LxU72R3QDdwncvVKC5L9RD7kxSy after candidate checks. Both guard.bodeebooks.com and bodeebooks.com report that release ID. Four changed public dashboard assets match the archive bytes on candidate and live. Windows installer configuration remains 1.2.283, and the download remains sign-in protected. The prior deployment dpl_GCRNpzBYPZyCNWBdCnMuBUHfSdEv is retained for rollback.

The matching API source baa8e82a1f1f9a14632073979024762af14b9bd6 is live as dpl_AtFF9fzc49Fa7QzN7wyQQEG8qtAe after its additive capability migration and candidate/live health checks. Mac enrollment remains off. No real Mac child pairing, signed Mac installer, iPad app, Windows installer/feed publication, or Apple membership purchase was performed. Unchanged parent source reused the 89 tests and phone/desktop fixture evidence above; the new hosted production build passed.

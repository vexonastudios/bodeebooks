# Mac student preview integration

Isolated branch codex/mac-student-port, based on b2dc674. Only the reviewed monitoring Mac patch and generated hashes are transferred from bodee-guard codex/mac-student-port. Website-specific media bypass labels and action feedback are preserved. Mac devices are labeled as app-only previews; Pause affects BodeeGuard activities; Sleep is hidden; Close requires confirmed capability. Windows controls retain their existing labels and version checks.

This branch is not deployed. Coordinate with the cloud API capability migration and explicit Mac beta enrollment enablement in bodee-guard/docs/mac-student-port.md before real Mac testing. Do not export older unrelated dashboard files over this branch.

## Parent setup follow-through — October 2, 2026

Pairing success now uses the authenticated API platform to explain the Mac preview. The account computer list, Settings computer list, and family setup checklist identify Mac previews and explain that completed setup confirms app rules, not whole-computer protection. Existing Windows installer links remain Windows-only. Recovery, password, assignment and policy acknowledgement prerequisites are preserved.

Validated: 89 account/activation/readiness/workspace tests; real Electron setup at phone and desktop sizes (including an offline, paused Mac with confirmed setup); changed-code lint; Next production build using the supported webpack option. The default Turbopack build cannot follow the development worktree’s external node_modules junction; no product configuration was changed for that local build limitation. This remains a private source branch with no deployment.

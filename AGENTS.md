<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Source and deployment baseline — October 28, 2026

`main` and `codex/release-310` share the reconciled website source. The unrelated
April starter history is retained by `archive/main-before-cleanup-20261028` and
the reconciliation merge. Start from current `main` or the current production
receipt, never an old worktree merely because its folder looks canonical.

Git pushes to these two integration branches do not deploy automatically.
Use the existing explicit Vercel candidate/check/promote release procedure.
Other branch deployment settings are unchanged. Source cleanup is not a site
deployment or a Windows release. See `docs/source-baselines.md`.

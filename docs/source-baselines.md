# Website source baselines — October 28, 2026

## Published release follow-up

Parent release 1.2.332 is live from 194e37e7c0c1e9fb414d6513a421fa8be4310875. The release branch and GitHub main are fast-forwarded together with the receipt. See [deployment and verification](guard-release-1.2.332.md). The cleanup snapshot below records the earlier baseline.

The production website code baseline is `868f95284afb05e21b11464809ebfea850b11c5e`
from `codex/release-310`, including the current BodeeGuard header/back link,
wording, parent dashboard, account and download flows. The cleanup intentionally
preserves that application tree.

The previous GitHub default `main` was an unrelated five-commit April 11–12
starter, ending at `26e909bf0991ef705b15078f72a9de4fd88744c3`. It has a separate
`src/app` layout with 28 files; production uses the root `app/` layout and 970
tracked files. Mixing those application/configuration trees is not the cleanup.
Its entire history and file contents remain available under the annotated tag
`archive/main-before-cleanup-20261028` and as the second ancestry of the
reconciliation merge. No history was rewritten or force-pushed.

The history reconciliation keeps the production application tree and joins both
lineages. `main` and `codex/release-310` advance together. Cleanup changes are
limited to source/deployment documentation and the Git trigger policy in
`vercel.json`; application files, assets, dependencies, routing configuration and
the existing redirects remain the production baseline.

## Publishing

Vercel is linked to GitHub `main`, but production is currently published through
the explicit CLI candidate/check/promote workflow. Git-based automatic deployments
are disabled only for `main` and `codex/release-310` so source backup and branch
maintenance cannot publish a website unexpectedly. Other branch settings remain
unchanged. Explicit CLI deployments remain available:

- [Vercel Git deployment configuration](https://vercel.com/docs/project-configuration/git-configuration)
- [Vercel explicit CLI deployment](https://vercel.com/docs/cli/deploy)

Do not infer what is live from a pushed branch. Check the current Vercel production
deployment and the release receipt. The production deployment at cleanup start
was `dpl_EkdwdLH3oAUTwRE6kSRYCWxu5rdr`; branch reconciliation is not permission to
replace it, start a customer trial or publish a Windows installer.

## Local checkouts

The website remains separate from `vexonastudios/bodee-guard`. That repository
owns the Windows child and commercial API. Do not overwrite the newer website
shell with an indiscriminate parent-dashboard export.

Existing dirty or detached worktrees and their ignored files remain intact.
Local Git bundles and working/untracked snapshots were verified before cleanup.
Only unoccupied local branches whose exact heads were already backed up remotely
and were ancestors of the integrated source are eligible for removal. Remote
feature branches, unique work, Mac work, records and old checkouts are preserved.

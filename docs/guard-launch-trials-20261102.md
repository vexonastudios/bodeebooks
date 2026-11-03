# Parent trial dates — November 2, 2026

Prepared locally on codex/launch-trial-policy from f977824. Not deployed.

The account consumes trialOffer from the commercial API to distinguish the
extended prelaunch offer from the ordinary 30-day trial. Once a trial starts,
its confirmed Stripe/local end date remains authoritative. Invalid or absent
offer dates render the normal trial safely. General signup copy says at least
30 days and refers to the account's actual dates; no card or automatic paid
renewal is introduced.

Policy: the later of January 1, 2027 at midnight America/Chicago and 30 days
from the trial's actual start. Trials beginning on or after launch are 30 days.
The API implementation and existing-trial reconciliation are in the bodee-guard
repository, docs/launch-trial-policy-20261102.md. Deploy that API before this
website and run its existing-trial reconciliation; website wording alone does
not extend a family's access.

Validation:
- Real account-component rendering: 16 tests passed, covering early, ordinary,
  active, invalid/absent offer, no automatic billing and existing account cases.
- Scoped ESLint: passed.
- Production build: npx next build --webpack passed.
- Default Turbopack build could not use this worktree's shared node_modules
  junction outside its filesystem root. The supported webpack builder completed
  with the same source; production configuration was not changed to work around
  the local worktree layout.

No deployment, billing mutation or account enrollment was performed here.

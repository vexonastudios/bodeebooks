# Cloud-only account onboarding — 2026-09-07

The public website now describes the cloud journey only:

1. Create and verify the parent account; deliberately activate eligible access.
2. Install the cloud child application on each child's Windows computer.
3. Approve its pairing code from the parent's phone/browser.
4. Assign a child and save offline recovery in the dashboard; confirm recovery
   in the child application before school.

Parents use guard.bodeebooks.com. There is no parent desktop installer, local
installer URL, network discovery, or requirement for a parent computer to stay
awake. Account greetings, trial/billing controls, cancellation and resumption,
invoices, child device management, and inline release notes remain available.
Legacy parent-role registrations are not displayed as child slots; no records
are deleted or migrated by these presentation changes.

## Download boundary

Both the account page and Windows download route use `cloudAccountRelease`.
Only the existing authenticated account response's release can be selected;
its URL must exactly match the account channel's dedicated
`cloud-child-vX.Y.Z/BodeeGuard-Cloud-Child-Setup-X.Y.Z.exe` artifact.
Old `BodeeGuard-Setup` releases, private validation/source repository links,
cross-channel releases, arbitrary URLs, and malformed versions are rejected.
Old release notes/version labels are also not presented as cloud updates.

**This selector is not cryptographic verification or release approval.** The
commercial service still has a schema-2 legacy catalog. Therefore current
catalog responses fail closed, and the website shows that the cloud installer
has not been released. Trial/subscription enrollment buttons are not offered
on the strength of a legacy installer. Existing paid cancellation/resumption
and payment management remain accessible.

Before enabling a cloud download, migrate the commercial catalog to the
schema-3 signed cloud manifest plus rollout-readiness/household eligibility
checks; do not merely rename its old URL. Private validation remains outside
customer catalogs and Stable promotion. This website change does not publish
an installer, open enrollment, alter backend billing policies, modify the old
repositories/feeds, or touch any installed family data/services.

Validation: 50 website tests and the production build pass. Deployment must
use a clean checkout of the scoped website commit so unrelated audiobook and
homepage working-tree changes are not included.

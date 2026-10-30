# Compact exit activity — October 29, 2026

Prepared parent website source, not deployed. Website baseline dbdd387; cloud
baseline 594158e8. Deploy the commercial API change first, then the parent site.
No Windows child release or schema migration is required.

The exit area has compact outcome-colored cards and a Clear all action. Accepted
passwords are green, failed outcomes red, opened/service events amber and closed
controls without a failed password neutral. Extra details, reviewed history and
settings/help use collapsed disclosures. Clear all marks only the displayed
report revisions reviewed, preserves history and never changes coins. Newer
results remain unreviewed; subsequent password failures reopen dismissed reports.

Only the exit component was transferred into the existing combined stylesheet;
other website-only styles and workspace behavior were preserved. Module/CSS
cache versions were advanced. The bridge forwards only confirmation and each
report's ID, student ID and sequence to the fixed parent clear endpoint.

Validation: all 63 bridge/workspace cases passed; the full-dashboard phone,
desktop and scaled exit fixture passed against these actual website assets;
the existing coin-confirmation/setting fixture passed against these assets.
The production build passed using the documented --webpack option after the
default bundler rejected this local worktree's existing external node_modules
junction. No build configuration or dependencies changed. Full retained cloud
verification and exact source hashes are recorded in the sibling cloud repo's
docs/cloud-parent-exit-review-20261029.md.

Build log: .tmp/parent-exit-build-webpack.log; bridge log:
.tmp/exit-cards-bridge-tests.log. Synthetic preview screenshots are in the cloud
worktree out/parent-exit-cards-390-1.png and out/parent-exit-cards-1365-1.png.

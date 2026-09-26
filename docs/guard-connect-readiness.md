# Pairing return opens child assignment and readiness — September 26, 2026

Problem: activation and account links included ?setup=connect, but the outer
Next dashboard ignored setup and gave its inner workspace a fixed URL. Parents
landed on Overview with no assignment/checklist. The guide also clamped direct
connection requests to earlier unfinished family setup.

The dashboard now allowlists setup=1/connect and valid conversation IDs, preserves
them through server/client sign-in redirects and passes them into the inner
workspace. Connect opens Step 4 immediately for families with children. Missing
school/activity choices remain incomplete and link to their respective steps.
Families with no child profiles still start at Add your children.

Unassigned computers show their name, Who uses this computer?, an explicit Save
student and inline draft/save/error feedback. Closing or refreshing cannot silently
discard a selected child. Existing computer assignments are not modified by opening
the guide. Check again is near the top, and installation instructions start collapsed
once a computer is present. The checklist never treats a pending acknowledgement as
ready, and school website sign-in still requires checking the child's screen.

Validation: 56 navigation, activation, parent-journey and workspace tests passed;
TypeScript and changed Next files' ESLint passed. The new fictional-family Electron
fixture verified direct connection entry before school selection, named computer,
explicit save/retry, acknowledgement, retained missing prerequisites and phone/
desktop fit. The existing full parent-start Electron fixture also passed against
these website assets. A 390x844 browser preview verified the child selector/save UI.
No real family computer was approved, assigned, installed or changed during checks.

Website-only change in C:/Projects/worktrees/bodee-books/family-migration-readiness.
Guard scripts were run against that website using BODEEGUARD_SETUP_WEBSITE_ROOT;
API and child source, installer and feed are unchanged. Logs are ignored in .tmp/
in the website and guard family-migration-readiness worktrees. Cache version:
20260926-connect1. Previous healthy website: dpl_ANWGszEfbYDVKVevuj9wWSbGUm6b.
Publication evidence follows.

## Published September 26, 2026

Website source: ba57458be25e950e98ff30f1fefe73c4441e88ea.
Deployment: dpl_BrrNK656ti72jto1W7DA6U1dnQPd,
https://bodeebooks-hy3ktwphr-vexonastudios-3984s-projects.vercel.app.
Clean tracked-source archive: .tmp/web-connect-readiness. Hosted production build
passed in 30 seconds. Candidate and public setup helper returned HTTP 200 with
exact reviewed bytes before/after promotion. The live signed-in parent dashboard
at 390x844 preserved /guard/dashboard/workspace/?setup=connect and automatically
opened Connect & check readiness, with Check again and eight child checklists.
No real approval, assignment, readiness save, installer or child update occurred.
The browser check used Close without saving. Rollback remains the previous
 dpl_ANWGszEfbYDVKVevuj9wWSbGUm6b deployment.

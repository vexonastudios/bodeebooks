# Parent control feedback — September 24, 2026

Monitoring controls now show an inline pending/result message and a centered, non-modal confirmation. Each result names the child and action and distinguishes saving from child delivery. Success notices dismiss automatically while inline details remain; errors persist and do not trigger automatic retries. The old unstyled status paragraph is hidden. Quick Unlock retains feedback within its dialog.

Source: the reviewed feedback/monitoring/style assets from BodeeGuard e5f6f78d1c437efb386a67094908e8e9d98b4240, with narrow workspace edits preserving this website's existing onboarding and refresh implementation. This is a parent-only release. Child download remains Family Beta 1.2.239; the API and installer are unchanged.

Validated before publication: real monitoring UI with synthetic data against these website assets, desktop and phone centered layout, pending/duplicate prevention, refresh persistence, no focus theft, safe persistent errors and success dismissal. Three focused website loading/connection/release-note checks passed. Source dashboard validation and screenshot evidence are recorded in the BodeeGuard docs/cloud-parent-action-feedback.md receipt.

Deployment identity and public verification will be appended after publication. Previous live deployment dpl_D9fyTc2rSkqRyq5bWQ2SLeaiqucR remains the rollback target.

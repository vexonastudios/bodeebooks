# Account installer freshness — November 4, 2026

The account server component previously rendered its verified installer version
once. An already-open page could continue to display that version after a new
release, even though the download route resolves the account's current release
again when clicked.

The account now checks a small public, channel-specific version hint on mount,
when returning to the page, and every minute while visible. Hidden pages stop
polling. Concurrent focus events coalesce; temporary failures back off to five
minutes. A changed version triggers a Next router refresh, updating the summary,
release notes and installer information while preserving unaffected client state
and scroll position. The verified catalog's existing one-minute cache may take
one further check to converge after publication.

The hint route performs no account, billing, database or session reads. It shares
upstream requests within a thirty-second cache per channel, limits response size
and time, and never exposes installer links. Its decoded version is only a cache
invalidation hint, not signature verification or download authority. The existing
authenticated catalog and download route still verify release metadata, enforce
access, select the correct channel and resolve the installer on each click.
Public Stable, invited Beta and private Family Beta remain separate. The browser
never substitutes the newest Beta installer for a public customer's Stable app.

Validation: 55 focused account, refresh, download, feedback and download-code
checks; TypeScript and scoped ESLint pass. Tests include publication during an
open session, stale initial pages, catalog convergence, hidden/back-forward
navigation, late responses, failures and channel isolation. No Windows build or
API deployment is required. Production publication is recorded below when done.

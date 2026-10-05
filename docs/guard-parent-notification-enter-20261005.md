# Parent Windows notification reply investigation - 2026-10-05

## Scope and limit

The screenshot shows the Windows native web-push toast, not the dashboard composer or the child Electron quick-chat window. The text reply already sends through the authenticated service worker when its action button is selected. Enter in the toast input is handled by the browser/Windows, not by page JavaScript. No native Enter fix is claimed.

Chromium's Windows notification template builder writes the text input and ordinary actions, but does not associate an Enter/default submit action or expose that binding to the site. The Notifications API exposes action activation, not native keyboard events. Adding a DOM keydown listener to the page or service worker cannot fix this field.

References reviewed:
- https://raw.githubusercontent.com/chromium/chromium/main/chrome/browser/notifications/win/notification_template_builder.cc (AddActions, WriteActionElement)
- https://notifications.spec.whatwg.org/#dictdef-notificationaction

## Prepared fallback

- Native button label: Send reply. Placeholder explicitly tells the parent to choose it after typing.
- Reply in app opens the child's authorized conversation. On the desktop layout it focuses the composer, where Enter sends and Shift+Enter inserts a newline.
- Existing in-app drafts remain intact. Ordinary conversation navigation and phone heading focus retain their behavior.
- Foreground the existing PWA before requesting composer focus; still route the conversation if the browser denies foreground focus.
- Selecting Open/Reply in app never silently sends text entered in the native alert. Unsubmitted native text is not transferred to the app; choose Reply in app before typing there. Existing failed-send recovery still preserves its separate pending reply with the same retry ID.
- The two shared admin modules were selectively synchronized; website module cache keys are 20261005-reply-focus1.

## Validated source

- Cloud source: a5ff5f8f0cfbf1d1551cd88572f8d466a49baed2 on codex/student-today-dashboard.
- Parent website: da3e9f308ae3e901d94db035a4097174b95ffe4e on codex/chore-library-parent.
- Parent notification tests: 39 passed, including warm/cold navigation, focus refusal, authorized child lookup, no send on Open, exact-ID retry, authentication and unread state.
- Parent Chromium fixture: passed with notification-triggered composer focus, preserved in-app draft, Enter send, Shift+Enter, IME/repeat/empty guards and mobile layouts. Diagnostics: fixture-yEa6h6.
- Parent production build: passed. Changed production files lint with zero errors and two existing warnings. General lint against the old CommonJS fixture reports its existing require-import errors; no full-site lint pass is claimed.
- Cloud focused messages verification: workspace/syntax/lint, 111 tests across 26 files, and all 6 selected Electron scenarios passed. Durations 28.1s / 12.5s / 146.1s. This is not a full-suite pass.
- One initial parent fixture invocation used a relative path against the launcher's cloud cwd and timed out. The corrected absolute-path invocation passed. No installed family app, real messages or notification permissions were used for tests.

## Publication

Source prepared for the next parent website deployment; not deployed by this task. No Windows installer, API deployment or update feed changed. Child quick-chat work in cloud source 11819f25 remains separately queued. Native toast Enter remains a browser/platform limitation and must not be described as resolved by this fallback.

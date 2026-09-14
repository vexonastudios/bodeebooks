# Inline voice messages

Audio attachments in parent Messages use a Play voice message button followed by
inline play/pause, progress, duration and seek controls. Image/PDF previews retain
their existing behavior.

The existing authenticated read-file action is used only after Play is tapped.
File identity, supported audio MIME and bounded size are validated. Replaying
uses the downloaded in-memory blob. Message updates retain the player; switching
children or deleting/replacing its row pauses it and revokes the private URL.
Hidden or detached messages cannot start late playback. Only one inline message
plays at once. Browser autoplay restrictions leave a clear Play fallback.

Checked with `scripts/test-parent-mobile-electron.mjs` using a real synthetic WAV
attachment on phone-sized layouts. The cloud repository's
`scripts/test-cloud-voice-electron.js --site=<this checkout>` verifies full
six-second playback, lazy reads, local replay, receipt/neighbor stability,
private URL cleanup, recordings and retries. Website tests and the production
build are also required before promotion.

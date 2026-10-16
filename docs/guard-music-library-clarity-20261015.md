# Clarify individual songs and YouTube playlists — October 15, 2026

Status: published to the parent website October 16, 2026. See [deployment receipt](guard-assistant-time-release-20261016.md). Based on cloud 30197ad2 and website ff0b2df. Parent presentation only; no API, storage, assignments, child runtime or family data changed.

## Finding

The recently repaired child selector exposed the existing individual-song library. It did not convert YouTube playlists into individual assignments. The unchanged music service has allowed a child to save a song from an assigned, approved YouTube playlist into a named mix since dbed17e1 (September 17). That path reuses or creates a music_tracks entry and assigns it to the requesting child. The parent library can therefore show that song as an individual entry available to assign to another child. Whole-playlist access remains separately stored and controlled.

The screenshot's right column shows songs not individually assigned to the selected child, not a complete picture of music that child can access. That child may already have the same song through an approved YouTube playlist. No historical source association is stored on music_tracks, so this investigation does not claim a specific origin for every displayed row.

## Changes

- Rename the ambiguous Playlists tab to Individual songs, clarify the child heading and available-song count, and label the add action Add song.
- Explain why saved playlist songs can appear individually and provide a Manage YouTube playlists shortcut that selects the correct navigation tab.
- Explain that individual assignments and whole-playlist access are separate, including when removing an individual assignment.
- Preserve bulk review, all existing records and permissions. Add no reads, external playlist lookups, polling or writes. Selectively copy the shared module and bump the existing website import versions.

## Verification

- Required focused media verification: workspace/static checks and 271 tests across 53 files passed. Startup, parent exit and notifications passed. The first child workspace run stopped with a non-specific renderer error reported as an empty object after lesson-retention and volume checks. Logs were inspected; no child source is changed by this work. Rerunning workspace and the five remaining selected scenarios passed all six. Combined evidence covers all nine selected scenarios, not a full-suite claim.
- Existing hosted Music fixture extended for separate individual/whole-playlist navigation and zero writes on viewing. It passed the final source, including startup retry, two synthetic children, all bulk destinations, duplicate/invalid inputs, partial retry, failed removal and phone layout. Final static checks passed after the shortcut selected-tab follow-up.
- Existing cloud-music-playlist-copy service regression passed, confirming the saved-song behavior against isolated data. No real household records were queried or altered.
- Website account tests: 13 passed. Next Webpack production build passed. Final public-module follow-up was rechecked with the actual hosted loader fixture; application build code was unchanged after the build.
- Screenshots at 1300px and 390px inspected. The fixture deliberately blocks remote thumbnails and renders additional media panels; these are fixture-only conditions.

Evidence: cloud .tmp/music-library-clarity-{media,runtime,ui,static,copy}.log and .tmp/music-library-clarity/{desktop,mobile}.png; website .tmp/music-library-clarity-{account,build}.log. The UI fixture's initial added selector assertion had a quoting error, corrected before the final passing run. No product gate was weakened.

The parent website deployment is complete. No child installer was needed for this change. Do not delete or reassign saved music to make the list shorter.

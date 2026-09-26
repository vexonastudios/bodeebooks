# School setup error and mobile dismissal

The four-step family guide now keeps mutation errors inline and exposes Close
without resubmitting failed saves. Escape has the same meaning. Previously Save
and close retried the rejected school save, keeping the parent trapped. The
inline school editor also suppresses the duplicate global error notification.
Generic feedback displayed during any modal is now attached inside that modal
so its dismiss button receives pointer input. It clears when the modal closes.

Companion API behavior preserves unchanged shared schools and reuses a matching
family school for a new child. A real full-library error explains that the 30-item
limit includes built-in activities; parents are not being asked to add 30 subjects.
No existing family subjects, records or assignments were deleted by this repair.

Before publication: 49 website workspace cases passed. Hidden synthetic phone
and desktop fixtures verified real pointer dismissal, inline failed-school saves,
closing without a retry, and preserved prior saved choices. Maintained-source
focused verification passed 263 unit cases and six Electron scenarios; nine
specific school-setup regressions passed. Exact source and deployment follow.

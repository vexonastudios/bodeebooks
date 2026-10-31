export type GuardAccountRelease = {
  version: string;
  downloadUrl: string;
  notes?: {
    title: string;
    sections: Array<{ heading: string; headline: string; summary: string; highlights: string[] }>;
  } | null;
};

// Version-specific parent notes mirror the reviewed child release notes.
const familyBetaNotes: Record<string, NonNullable<GuardAccountRelease["notes"]>> = {
  "1.2.339": {
  "title": "Your approved sites, inside BodeeGuard",
  "sections": [
    {
      "heading": "Version 1.2.339",
      "headline": "Add Sites and local web apps for selected children",
      "summary": "Open a parent-approved website or local audiobook editor inside BodeeGuard, with a strict browsing boundary and simpler everyday controls.",
      "highlights": [
        "Choose Site or Local web app in Add activity, enter the address and select the children. Optional access starts with no daily time goal; Daily Plan controls still apply.",
        "Outside links, redirects, pop-ups and embedded pages are blocked. Local web apps stay on the approved address and port. The new choices require this Windows update.",
        "Family Game Room now has per-child Unlock today in Quick Unlock, on the child card and in its own tab. Daily limits, chores and computer locks still apply.",
        "Update notices are compact, dismissible and back at the bottom. The What’s new button fits its label without overlapping nearby controls."
      ]
    }
  ]
},
  "1.2.338": {
  "title": "Keep your place in school",
  "sections": [
    {
      "heading": "Version 1.2.338",
      "headline": "Abeka lessons stay open through background refreshes",
      "summary": "Routine rule refreshes preserve the live school page. Temporary recovery pauses it in place, with clearer parent review controls.",
      "highlights": [
        "Normal school-rule refreshes no longer remove an active Abeka page. Recoverable interruptions keep the same paused lesson or quiz page for Resume school.",
        "School reconnect retries valid saved rules before waiting for a slow cloud request. Parent locks, changed permissions and child identity remain enforced.",
        "Documents now offer Mark complete and Reopen review directly, with existing grades preserved.",
        "Parent exit activity uses compact outcome-colored cards and Clear all for reviewing the displayed reports without changing coins or deleting history."
      ]
    }
  ]
},
  "1.2.337": {
  "title": "Clear update notices and easier setup",
  "sections": [
    {
      "heading": "Version 1.2.337",
      "headline": "Readable update notices and easier Windows setup",
      "summary": "The update notice stays below the dashboard header, and new setup has normal window controls and a clear exit.",
      "highlights": [
        "Update notices remain fully visible when the White Noise player is available, with a reachable close button. Restart warnings still stay above the player.",
        "Initial setup opens in a normal window so a parent can use the approval page in their browser and close setup when needed. Protected computers retain their parent-password exit.",
        "Installer downloads use a clean customer-facing filename. Setup includes sharper artwork and native Windows text."
      ]
    }
  ]
},
  "1.2.336": {
  "title": "Clearer Windows setup",
  "sections": [
    {
      "heading": "Version 1.2.336",
      "headline": "Cleaner downloads and sharper setup",
      "summary": "Installer downloads use a customer-facing filename, and the setup sidebar uses sharper artwork and native text.",
      "highlights": [
        "Parent downloads save as BodeeGuard-Cloud-Child-Setup followed by the version, without Test in the saved filename.",
        "Setup uses higher-resolution artwork and native Windows text instead of stretching bitmap lettering.",
        "Windowed setup, same-computer browser approval and the clear setup exit remain included."
      ]
    }
  ]
},
  "1.2.335": {
  "title": "Windowed parent setup",
  "sections": [
    {
      "heading": "Version 1.2.335",
      "headline": "Set up BodeeGuard beside your browser",
      "summary": "Fresh setup opens in a normal window so parents can approve the computer in their browser.",
      "highlights": [
        "During initial setup, minimize, move or close BodeeGuard using the normal Windows controls.",
        "Open parent approval in the browser on the same computer, then return to setup. You can also approve from a phone.",
        "Fullscreen protection starts when child protection is enabled. Already protected computers keep their parent-password exit."
      ]
    }
  ]
},
  "1.2.334": {
  "title": "A clear way out of setup",
  "sections": [
    {
      "heading": "Version 1.2.334",
      "headline": "Close setup whenever you need to",
      "summary": "Parent setup now has an easy-to-find way to close BodeeGuard and return to Windows.",
      "highlights": [
        "Choose Close BodeeGuard and return to Windows during pairing or the later setup steps.",
        "A fresh, unprotected setup closes normally; an already protected computer asks for the parent password.",
        "You can reopen BodeeGuard and continue setup later."
      ]
    }
  ]
},
  "1.2.333": {
  "title": "More reliable updates",
  "sections": [
    {
      "heading": "Version 1.2.333",
      "headline": "Keep BodeeGuard updates moving",
      "summary": "Update downloads can resume after a connection interruption, and prepared updates are easier to finish.",
      "highlights": [
        "Interrupted update downloads can resume instead of always starting over.",
        "BodeeGuard remembers prepared updates after reopening and continues checking for newer releases.",
        "The update notice distinguishes a downloaded update from the version currently running. Saved work still receives protection before a restart."
      ]
    }
  ]
},
  "1.2.332": {
  "title": "Clear document alerts and easier everyday recovery",
  "sections": [
    {
      "heading": "Version 1.2.332",
      "headline": "See submitted work and help children stay on track",
      "summary": "Child documents now call for parent attention, with clearer chore reminders and better Wi-Fi and printer recovery.",
      "highlights": [
        "When a child sends a document, it appears in Messages with a direct review or printing action. Enabled parent push notifications announce it, and the dashboard and Papers count keep unreviewed documents visible until reviewed.",
        "Chore reminders stay open until dismissed, repeat after 15 minutes if unfinished, and let children open the chore or mark it done directly.",
        "Devices & Sound offers clearer Wi-Fi connection steps, password correction and internet checks, plus printer connection and print-job recovery without leaving BodeeGuard.",
        "Ordinary update recovery notices can be dismissed and revisited in Updates. Typing-speed digits remain together on narrow dashboard cards.",
        "Video collections explain when a saved search or filter hides videos. Vocabulary scans preserve visible definitions and parent edits, and flag definitions that still need review."
      ]
    }
  ]
},
  "1.2.330": {
  "title": "Student walkthroughs and learning beside Abeka",
  "sections": [
    {
      "heading": "Version 1.2.330",
      "headline": "Help children discover new features after updating",
      "summary": "A dismissible illustrated walkthrough introduces updates, with Learning Videos and corrected Math Coach panels beside Abeka.",
      "highlights": [
        "Children see an illustrated walkthrough when the updated dashboard is ready. Next, Back, Skip for now and Close are always available, and What’s new reopens it later.",
        "Any approved Learning Video, including Crochet, can be pinned beside school. Open it from the Abeka toolbar or pin before entering school; playback keeps its position.",
        "The blank Math Coach panel is repaired using corrected Windows native view composition. Learning Videos, Writing and Math Coach remain unavailable during tests and quizzes.",
        "Recovery status no longer sits over student input areas. Recent Bible audio, computer game practice and personal spelling improvements remain included."
      ]
    }
  ]
},
  "1.2.329": {
  "title": "More reliable updates and less idle background work",
  "sections": [
    {
      "heading": "Version 1.2.329",
      "headline": "Recover update attempts and keep school available",
      "summary": "Removes unnecessary restart blockers and reduces repeated background work while computers are idle.",
      "highlights": [
        "Saved conversations, unchanged planners and idle device settings no longer hold up an update. Unsent messages, active lessons and unfinished work stay protected.",
        "The Windows updater retries brief handoff file-read failures and safely retires abandoned pre-install attempts when no installer or unfinished recovery is active.",
        "A server compatibility fix helps versions 1.2.320 and 1.2.321 past their hidden parent-exit icon defect. The saved parent preference returns after the new version is reported.",
        "Quiet computers pause unchanged Bible and dashboard refreshes. Parent updates, saved progress, reconnect and Close/Sleep remain available; heartbeat checks perform fewer database queries."
      ]
    }
  ]
},
  "1.2.328": {
  "title": "Practice Family Games against the computer",
  "sections": [
    {
      "heading": "Version 1.2.328",
      "headline": "Computer opponents for all four board games",
      "summary": "Children can practice Chess, Checkers, Connect Four and Fleet Battle on their own.",
      "highlights": [
        "Each built-in board game now offers Easy and Challenge computer opponents, a short practice tip and Practice again after the game.",
        "Practice uses the existing Family Games allowance, hours and parent locks. Computer moves run locally without paid AI calls.",
        "Children can leave while the computer is thinking. A failed turn has a clear retry; the lobby buttons remain available after completed actions.",
        "Choose Host or Find sibling games to play over home Wi-Fi. Computer practice does not require home-network setup."
      ]
    }
  ]
},
  "1.2.327": {
  "title": "Listen to the Bible and follow each verse",
  "sections": [
    {
      "heading": "Version 1.2.327",
      "headline": "Chapter audio with verse-by-verse highlighting",
      "summary": "Children can listen to the Berean Standard Bible and follow the verse being read.",
      "highlights": [
        "All 1,189 chapters use the existing Bob Souer recordings. Open Bible, choose a chapter and select Listen to chapter; listening requires an internet connection.",
        "The current verse is highlighted as the recording plays. Follow reading keeps it visible; scrolling pauses following, and Go to current verse brings it back.",
        "Playback speed, seeking and chapter repeat stay aligned. Listening positions are remembered, and saved notes and highlights are preserved.",
        "If audio fails, children can retry or keep reading. This release retains the compact desktop assessment overview and clearer parent poem archive controls."
      ]
    }
  ]
},
  "1.2.326": {
  "title": "Personal spelling review that keeps school moving",
  "sections": [
    {
      "heading": "Version 1.2.326",
      "headline": "Help each child learn and retain spelling words",
      "summary": "Personal daily reviews teach missed words, revisit earlier learning and show clear progress without a perfect-score gate.",
      "highlights": [
        "Each child receives up to 12 word checks from assigned words and earlier reviews. Independent successes spread later review over time; difficult words return sooner.",
        "Word workshops explain tricky spelling, offer spoken explanations and letter building, and allow at most four optional memory retries. Children can save unheard words or skip retries and continue school even with mistakes.",
        "Parent Spelling cards separate practice completion, independent recall and later retention, with difficult words and coverage warnings before the scheduled test.",
        "Print an optional paper practice sheet and record actual school test results separately from BodeeGuard practice, mastery and coins. Existing parent locks and saved-work recovery remain in place."
      ]
    }
  ]
},
  "1.2.325": {
  "title": "Reliable Abeka completion and lighter syncing",
  "sections": [
    {
      "heading": "Version 1.2.325",
      "headline": "Keep completed schoolwork counted",
      "summary": "Preserve observed Abeka completion when future lessons appear, with less repeated background syncing.",
      "highlights": [
        "Abeka advancing to a future lesson no longer discards a checkmark observed moments earlier or clears an already confirmed completed day when a later page is partial.",
        "School coins still require all assigned daily requirements to finish and are paid only once. Previously unobserved completion cannot be reconstructed from lesson numbers.",
        "Connection and settings checks make fewer repeated database reads and consume duplicate sync wakes together. Parent updates and Close/Sleep retain their existing delivery and acknowledgements.",
        "The Abeka quizzes and tests overview appears on desktop, keeping the mobile parent layout compact."
      ]
    }
  ]
},
  "1.2.324": {
  "title": "Abeka quiz and test reporting",
  "sections": [
    {
      "heading": "Version 1.2.324",
      "headline": "See unfinished Abeka assessments by child",
      "summary": "Review outstanding, locked, submitted and graded assessments with clear coverage status.",
      "highlights": [
        "Open Overview → Abeka quizzes & tests to review each child’s known outstanding or locked assessments, submitted work awaiting a grade, and recorded grades.",
        "Updated Windows computers can check the Abeka student dashboard during lessons. Missing or stale checks stay visible; an empty list or checked box does not prove a quiz was submitted.",
        "Accredited families can export a metadata summary from Abeka’s separate parent Assessment Permissions page, then choose the child and school year and review it before importing.",
        "Parent review flags and earlier-year outstanding work remain visible. Reporting problems do not block school, alter grades or unlock assessments. History starts with observed records; previously unseen grades cannot be reconstructed."
      ]
    }
  ]
},
  "1.2.323": {
  "title": "Private Quizlet question review",
  "sections": [
    {
      "heading": "Version 1.2.323",
      "headline": "Review questions sent to Ask Quizlet",
      "summary": "Optional per-child question history with a visible child notice and clear capture status.",
      "highlights": [
        "Open Overview → Quizlet AI questions to turn review on for a child and read newly observed questions sent to Ask Quizlet. Existing families remain off until a parent enables it.",
        "Children see a notice when review is active. This records submitted questions or observed send attempts, not drafts, passwords, ordinary study answers, AI replies or uploads.",
        "Review needs this Windows update and applies inside BodeeGuard only. Status is best effort: an empty history or unsupported page does not prove there was no activity.",
        "Questions are limited to 2,000 characters and kept for 30 days. Interrupted connections retry from encrypted local storage; duplicate receipts do not duplicate history. Turn review off or clear history from the same panel."
      ]
    }
  ]
},
  "1.2.322": {
  "title": "Reliable update restarts and automatic spelling audio",
  "sections": [
    {
      "heading": "Version 1.2.322",
      "headline": "Updates work with the parent exit icon hidden",
      "summary": "Repairs update restart preparation and makes Earn Coins spelling words play automatically.",
      "highlights": [
        "Updates can restart when the parent exit icon is hidden or inside a collapsed toolbar. Your chosen icon visibility and password-protected recovery are preserved.",
        "Already stuck on 1.2.320 or 1.2.321? Temporarily show the affected child’s exit icon under Overview → Parent exit & activity, or use this release’s parent-account installer for an in-place update. Hide the icon again after 1.2.322 is installed.",
        "Earn Coins reads each spelling word as its question opens. Hear the word remains available for replay, and hints or refreshes do not repeatedly start narration.",
        "Earn Coins action buttons have Lucide icons alongside their labels. Leaving the activity or switching children cancels pending narration."
      ]
    }
  ]
},
  "1.2.321": {
  "title": "Math Coach beside Abeka, with test safeguards",
  "sections": [
    {
      "heading": "Version 1.2.321",
      "headline": "Math help alongside lessons",
      "summary": "Children can open Math Coach beside Abeka, while tests and quizzes keep both Math Coach and Writing unavailable.",
      "highlights": [
        "Math Coach joins Writing on the school toolbar and opens beside the lesson without reloading its video or starting a second study clock.",
        "During a test or quiz, both tools are blocked, including tools that were already open. Writing drafts stay saved.",
        "Existing Math Coach permissions, question allowances and parent locks still apply. Closing the panel restores the full lesson view.",
        "Returning to a lesson makes the tools available again. Use Reload in Math Coach to reconnect after a test."
      ]
    }
  ]
},
  "1.2.320": {
    "title": "Parent exit controls, Grammar and quiz returns",
    "sections": [
      {
        "heading": "Version 1.2.320",
        "headline": "Choose how children reach parent controls",
        "summary": "Hide the parent exit icon, review exit attempts, and use the Grammar and Abeka improvements.",
        "highlights": [
          "The parent exit icon is hidden by default on updated children. Use Ctrl+Alt+Q to open parent controls, or show the icon for selected children under Live Monitoring → Parent exit & activity.",
          "Review possible exit attempts without recording passwords. You can dismiss a report or explicitly confirm a one-time 100-coin deduction; nothing is deducted automatically.",
          "Grammar starts in Not allowed. Assign it to selected children through the existing learning plan, with your chosen hours and expectations.",
          "Completed Abeka assessments offer Back to Abeka, and returning to Grades no longer reveals an older retained quiz page. Submit inside Abeka and check its recorded result before starting the next quiz.",
          "Failed assessment returns have clearer retry guidance and a specific, bounded diagnostic category. Staff reports also identify Driver’s Education usage and known media-provider errors more clearly."
        ]
      }
    ]
  },
  "1.2.319": {
    title: "PDF worksheets, easier playlists and a school clock",
    sections: [{
      heading: "Version 1.2.319",
      headline: "Simpler family tools and clearer school controls",
      summary: "Import PDF worksheet pages, find child playlist creation easily and check the time inside Abeka.",
      highlights: [
        "Choose PDF pages in the parent Worksheet Library. Selected pages become separate JPG worksheets; conversion stays on your device.",
        "The Assistant follows the child name in extra-time requests, including Driver’s Education, instead of choosing a previous example.",
        "Children have an always-visible Create playlist button in Music and a current-time clock beside the Abeka lesson controls.",
        "Printing has bounded waits and Stop waiting controls. The 22-day driving course and saved progress from 1.2.318 remain included."
      ]
    }]
  },
  "1.2.318": {
  "title": "Shorter driving days with saved progress",
  "sections": [
    {
      "heading": "Version 1.2.318",
      "headline": "A shorter trip, one skill at a time",
      "summary": "The family driving route is now three lessons within a 22-day self-paced course. Earlier course work remains saved.",
      "highlights": [
        "Days 7, 8 and 9 cover home to Roland, Roland to the Rigsby approach, and onward to 311 Hedges, with separate questions.",
        "Completed older lessons and actual quiz answers keep their credit as later days move forward two places.",
        "Texas Road School 0.58 improves traffic pacing and includes progressive scenery loading, clearer night and tire-trouble teaching, and more forgiving curb feedback.",
        "Students can complete several course days today. Updates remain private and assigned to the same family."
      ]
    }
  ]
},
  "1.2.317": {
  "title": "Videos and audiobooks remember your place",
  "sections": [
    {
      "heading": "Version 1.2.317",
      "headline": "Easier browsing and more reliable listening",
      "summary": "Videos and Audiobooks remember expanded collections, searches and saved choices, with clearer playback and parent settings feedback.",
      "highlights": [
        "Children can return to expanded collections, save items for later, choose favorites and continue from a saved position.",
        "Video buffering no longer uses the daily allowance. Next stays inside the chosen collection with a visible Cancel option.",
        "Finished audiobooks stay available to replay. Continuous listening and next-chapter controls also work in the pinned player.",
        "Failed collection loads and parent settings saves offer clear retry messages. Parent limits, approved collections and child identity remain enforced."
      ]
    }
  ]
},
  "1.2.316": {
  "title": "Learning video categories, daily driving limits and easier school recovery",
  "sections": [
    {
      "heading": "Version 1.2.316",
      "headline": "Organize learning and keep children moving",
      "summary": "Group Learning Videos into categories, set a daily Driver’s Education allowance, and improve printer setup and Abeka session handling.",
      "highlights": [
        "Choose Educational, Crochet, Drawing or custom categories when adding videos, including pasted lists. Select existing videos and move them together.",
        "Set each child’s daily Driver’s Education time limit, including a 15-minute option. Driving is an extra activity; time limits do not award course completion or consume Family Games time.",
        "Devices & Sound reuses installed printers and can prepare compatible Windows IPP network printers without a parent password. Failed connections offer a clear retry.",
        "Leaving an unfinished assessment offers Keep working or Pause and return. Completed Abeka sessions return to Grades using the provider’s actual controls, and Grades shortcuts reuse the existing lesson."
      ]
    }
  ]
},
  "1.2.315": {
  "title": "Reliable driving installation and audio during learning videos",
  "sections": [
    {
      "heading": "Version 1.2.315",
      "headline": "Recover driving installations and keep learning moving",
      "summary": "Driver’s Education retains verified downloads for installation retries, and pinned Music or Audiobooks can continue during Learning Videos.",
      "highlights": [
        "Failed driving installations keep a visible explanation and a Retry installation button, including after Refresh. Saved course progress is preserved.",
        "Windows file-lock retries and background backup copying reduce interrupted installations and repeated downloads.",
        "Pinned Music or Audiobooks can play beside Learning Videos with separate controls and the existing parent time limits.",
        "The protection helper stays responsive when a lesson window is busy; diagnostic categories help identify connection and storage failures."
      ]
    }
  ]
},
  "1.2.314": {
    "title": "Clear driving course steps and reliable lesson launch",
    "sections": [
      {
        "heading": "Version 1.2.314",
        "headline": "See what remains before the next driving day",
        "summary": "Driver’s Education shows each child’s driving, question and review progress, and fixes a protected-launch failure that could stop the game opening.",
        "highlights": [
          "The child sees exactly which steps remain in the current Day and a clear Start Day 2 action as soon as Day 1 is finished.",
          "Course Days are lesson sets; children may complete several on the same calendar date.",
          "Protected game launches wait for verification and give a useful retry or repair message instead of leaving the child stuck at an unexplained timeout."
        ]
      }
    ]
  },
  "1.2.313": {
    "title": "Private Texas Road School update",
    "sections": [
      {
        "heading": "Version 1.2.313",
        "headline": "Update Driver’s Education without losing lessons",
        "summary": "BodeeGuard can offer the verified private Texas Road School 0.54 build to the assigned family while preserving earlier course progress.",
        "highlights": [
          "The assigned child receives the private game update through BodeeGuard’s signed, family-only download when starting the module.",
          "Completed days, saved answers and an already-started Day 6 keep their accepted plan; a new Day 6 includes school-bus practice.",
          "Older BodeeGuard clients keep their previous course release until the child app itself updates."
        ]
      }
    ]
  },
  "1.2.312": {
  "title": "School reconnection and reliable update recovery",
  "sections": [
    {
      "heading": "Version 1.2.312",
      "headline": "Recover school access without logging out",
      "summary": "Repairs several startup, reconnection and update-wait failures that could leave children unable to open school.",
      "highlights": [
        "School reconnects independently of background uploads and update preparation, with a clearer Reconnect and open school button.",
        "Temporary protection-service and local-control failures can recover in place; retries continue after an interrupted startup.",
        "Invisible or failed message windows no longer falsely block restarting for an update; real unfinished replies remain protected.",
        "Parent help stays reachable, and signed remote exit retries temporary connection failures without overriding parent locks or losing saved work."
      ]
    }
  ]
},

  "1.2.311": {
  "title": "Resume driving lessons and add learning videos together",
  "sections": [
    {
      "heading": "Version 1.2.311",
      "headline": "Resume unfinished driving lessons and add a list of videos",
      "summary": "Fixes a progress-timing rejection that could block Driver’s Education from reopening and adds bulk Learning Videos approval.",
      "highlights": [
        "Driver’s Education accepts legitimate rounded practice reports without losing the unfinished lesson or granting false completion.",
        "The centered lesson dialog shows course progress, a clear Resume lesson action and reachable Close controls.",
        "Paste up to 50 YouTube links in Learning Videos, review them together and approve in one step.",
        "Duplicate videos are skipped; unsuccessful links stay available to correct or retry."
      ]
    }
  ]
},

  "1.2.310": {
  "title": "School recovery and clearer app downloads",
  "sections": [
    {
      "heading": "Version 1.2.310",
      "headline": "Keep school moving and see installation progress",
      "summary": "Improves school reconnection, Driver’s Education downloads, printer discovery and coloring-page review.",
      "highlights": [
        "School access and retry no longer wait behind unrelated background uploads or update checks.",
        "Driver’s Education shows real download progress, cancellation and clear retry messages.",
        "Devices & Sound can find a printer by address when automatic discovery misses it.",
        "Future occasional Abeka Art lessons stay separate from today’s required work.",
        "Coloring review distinguishes ideas awaiting rendering from finished images."
      ]
    }
  ]
},

  "1.2.309": {
  "title": "Clearer Bluetooth headset connections",
  "sections": [
    {
      "heading": "Version 1.2.309",
      "headline": "More reliable headset reconnect controls",
      "summary": "Devices & Sound requests an audio reconnect and checks whether the selected headset is ready to play sound.",
      "highlights": [
        "Bluetooth connection and audio readiness are shown separately.",
        "Children can retry Connect when Bluetooth is linked but sound is not ready.",
        "Readable device cards follow the child theme, with a Sound controls shortcut."
      ]
    }
  ]
},

  "1.2.305": {
  "title": "Less background activity, responsive family controls",
  "sections": [
    {
      "heading": "Version 1.2.305",
      "headline": "Your dashboard rests when you do",
      "summary": "BodeeGuard uses fewer background requests while keeping your family controls and message notifications available.",
      "highlights": [
        "Routine dashboard checks stop after three minutes without interaction and refresh when you return.",
        "Child computers reuse unchanged settings and send smaller school updates.",
        "Media and game requests do less repeated work; failed diagnostic uploads retry more gently."
      ]
    }
  ]
},
  "1.2.304": {
    "title": "Find Bible topics in everyday words",
    "sections": [
      {
        "heading": "Version 1.2.304",
        "headline": "Bible Topics understands more familiar words",
        "summary": "Children can find topics using everyday words and phrases across the full Bible topic index.",
        "highlights": [
          "Sad, unhappy and feeling sad now find Sorrow; getting left out finds Rejection.",
          "Expanded vocabulary covers all 5,684 topic headings, including familiar alternatives for older terms.",
          "Exact topic names still rank first, and the improved search works offline."
        ]
      }
    ]
  },
  "1.2.303": {
    "title": "Your Bible, your colors",
    "sections": [
      {
        "heading": "Version 1.2.303",
        "headline": "A comfortable Bible for every child",
        "summary": "Children can choose their own theme colors or a simple white Bible.",
        "highlights": [
          "Bible reading, Topics, plans and memory practice now follow the child’s selected theme.",
          "Theme colors and Plain white buttons are easy to reach at the top of the Bible.",
          "Each child’s Bible appearance is remembered on that computer without changing their dashboard theme.",
          "Verse highlights stay readable, and the verse editor is centered."
        ]
      }
    ]
  },
  "1.2.302": {
    "title": "Explore the Bible by topic",
    "sections": [
      {
        "heading": "Version 1.2.302",
        "headline": "Help children find Scripture by topic",
        "summary": "The Bible now includes an offline Topics index with passages from the Berean Standard Bible.",
        "highlights": [
          "Explore twelve starting topics or search more than 5,600 historical topic headings.",
          "Read passages in context, bookmark a verse or add it to Scripture memory.",
          "Topic search works offline and keeps each child’s existing Bible notes and memory collection."
        ]
      }
    ]
  },
  "1.2.297": {
    "title": "School progress and faster family controls",
    "sections": [{
      "heading": "Version 1.2.297",
      "headline": "Clearer school checks and easier family tools",
      "summary": "See why Earn Coins is waiting, check Abeka activities more accurately, and manage children with fewer steps.",
      "highlights": [
        "Abeka Activities now distinguishes the current lesson from an upcoming one; Earn Coins lists the school tasks still waiting for confirmation.",
        "Parents can choose a daily Earn Coins opening time, such as 11:45 a.m., while allowing children through as soon as school is finished.",
        "Preview a child's assigned dashboard safely, update a profile photo from the student card, or delete an archived student with confirmation.",
        "Review a child's screenshot bug report and send it to support, or unlock requested music, videos and audiobooks directly from a message.",
        "Assign Long Division as its own daily activity while retaining it in Math Coach; Daily Verse and Brain Teaser have more questions."
      ]
    }]
  },
  "1.2.296": {
    "title": "Child-controlled message sounds",
    "sections": [
      {
        "heading": "Version 1.2.296",
        "headline": "Children can mute message sounds",
        "summary": "Each child can turn message chimes off or on without missing family conversations.",
        "highlights": [
          "A bell button in Messages and the quick conversation controls the alert sound.",
          "Muted messages still arrive and remain visible in their conversations.",
          "The sound choice stays with each child across app restarts."
        ]
      }
    ]
  },
  "1.2.295": {
  "title": "Keep Send clear in child Messages",
  "sections": [
    {
      "heading": "Version 1.2.295",
      "headline": "White Noise no longer covers Send",
      "summary": "White Noise controls move into the Messages header so children can reach the full composer.",
      "highlights": [
        "Private, family and group chats keep Send reachable, including on smaller or scaled screens.",
        "White Noise keeps playing while the controls move between Messages and the dashboard.",
        "Children can pause, resume or choose White Noise directly from the Messages header."
      ]
    }
  ]
},
  "1.2.294": {
  "title": "Clearer school progress and child conversations",
  "sections": [
    {
      "heading": "Version 1.2.294",
      "headline": "Abeka time follows the video, with clearer progress checks",
      "summary": "Abeka time requires advancing video, confirmed daily lessons stay checked when the next lesson appears, and child Messages has a clearer conversation layout.",
      "highlights": [
        "Paused or stalled Abeka video no longer keeps counting from mouse or keyboard activity. The dashboard shows when lessons were last verified.",
        "Optional noon school check-ins distinguish low recorded activity, offline computers and tracking that needs checking. Enable them in notification settings.",
        "Child Messages has a searchable conversation list, a larger chat history and a compact composer. Parent bug reports accept reviewed photos of the child’s screen."
      ]
    }
  ]
},
  "1.2.293": {
  "title": "Keep your Abeka lesson while checking Grades",
  "sections": [
    {
      "heading": "Version 1.2.293",
      "headline": "Grades no longer restarts the open video",
      "summary": "Abeka Grades & To-Do opens separately while the current lesson remains paused in place.",
      "highlights": [
        "Video Lessons returns to the same player, watched range and unfinished answers without reloading or autoplay.",
        "Dashboard and breaks preserve the selected school page; hidden pages cannot play, count school time or request fullscreen.",
        "If Grades crashes, children can return to the intact lesson. Parent locks, child changes and explicit reopening still close both pages."
      ]
    }
  ]
},
  "1.2.292": {
  "title": "Responsive school controls and scheduled restarts",
  "sections": [
    {
      "heading": "Version 1.2.292",
      "headline": "Keep paused schoolwork safe and responsive",
      "summary": "The paused-school close prompt stays inside BodeeGuard, and the thirty-minute restart choice now schedules a warned restart.",
      "highlights": [
        "Keep school paused and Escape cancel the close prompt without reloading the lesson or losing unfinished answers.",
        "A slow or failed close request leaves the dashboard responsive. Changed school sessions dismiss outdated confirmations.",
        "Restart in 30 minutes schedules the restart; open schoolwork and drafts still delay it until they are safe."
      ]
    }
  ]
},
  "1.2.291": {
  "title": "Clearer conversations and fairer Earn Coins rounds",
  "sections": [
    {
      "heading": "Version 1.2.291",
      "headline": "Conversation history, accurate progress and fair practice",
      "summary": "Child quick chat keeps the conversation visible, and Earn Coins avoids repeating earning questions within a round.",
      "highlights": [
        "Open child quick chats show conversation history and replies without repeated popups.",
        "Completed school rings now fill the whole circle. Windows notification Reply in app opens and focuses the message composer.",
        "Writing has visible Trash, Restore and Delete forever controls. Earn Coins excludes reserved questions and uses other enabled subjects when a mixed pool is short."
      ]
    }
  ]
},
  "1.2.290": {
  "title": "Spelling practice without a perfect-score gate",
  "sections": [
    {
      "heading": "Version 1.2.290",
      "headline": "Finish a spelling pass, then review the misses",
      "summary": "Children can try every word once and finish daily Practice even when some answers are wrong.",
      "highlights": [
        "After a miss, compare the highlighted letters and choose Next word without being forced to retype it.",
        "Missed words lead the next practice, with help at the child’s current level and no extra AI call.",
        "Copied words and mistakes do not earn mastery. Ordinary practice has no separate coin reward or deduction; pre-test rules stay the same."
      ]
    }
  ]
},
  "1.2.289": {
  "title": "Keep your place during a school break",
  "sections": [
    {
      "heading": "Version 1.2.289",
      "headline": "Dashboard keeps the paused school page open",
      "summary": "Children can pause a lesson, visit Dashboard or Music, then resume the same school page without restarting the player.",
      "highlights": [
        "Resume school returns to the existing paused lesson and unfinished answers.",
        "Hidden lessons stay paused and do not add school time; Abeka playback restrictions remain in place.",
        "End session warns before closing the paused page. Parent locks and school access rules still apply."
      ]
    }
  ]
},
  "1.2.288": {
  "title": "Abeka progress survives clock differences",
  "sections": [
    {
      "heading": "Version 1.2.288",
      "headline": "Abeka lesson results can keep syncing",
      "summary": "Abeka lesson reporting handles a computer clock that is slightly behind, and older rejected reports no longer block fresh results.",
      "highlights": [
        "Abeka lesson checks use the signed school connection's time when Windows is behind.",
        "Rejected earlier reports stay saved safely while newer lesson results can reach your dashboard.",
        "Provider completion checks and parent access rules keep their existing meaning."
      ]
    }
  ]
},
  "1.2.287": {
  "title": "A compact student wallet",
  "sections": [
    {
      "heading": "Version 1.2.287",
      "headline": "Clearer wallet controls with less clutter",
      "summary": "Store and Earn coins share a compact row, History sits beside the wallet title, and extra earned time appears as small music/video badges.",
      "highlights": [
        "Lucide icons and the child's theme make wallet actions easier to recognize.",
        "Wallet controls fit narrow screens and display scaling; touch buttons stay easy to tap.",
        "Extra earned minutes now appear correctly, and empty bonus-time rows stay hidden."
      ]
    }
  ]
},
  "1.2.286": {
  "title": "Student update recovery and backup downloads",
  "sections": [
    {
      "heading": "Version 1.2.286",
      "headline": "Recovery paths for Windows updates",
      "summary": "Recoverable Windows update failures get bounded automatic retries and a child-accessible recovery action, with verified backup downloads and retained recovery copies.",
      "highlights": [
        "Transient installer failures retry after a cooldown while schoolwork stays open until restart is safe.",
        "Children can use Updates → Recover update to download fresh verified bytes without a parent password.",
        "Healthy-startup failures keep the previous app and wait for a newer verified release; failure reports remain available to support."
      ]
    }
  ]
},
  "1.2.273": {
    title: "Return to Grades after an Abeka quiz",
    sections: [{
      heading: "Version 1.2.273",
      headline: "Completed assignments return to Abeka Grades",
      summary: "Recognizes both Start Another Assignment and Start another session on LinkIt's completed-session screen.",
      highlights: [
        "Returns to Abeka Grades inside BodeeGuard without repeating the quiz submission.",
        "Unfinished quizzes and Submit or Review controls keep their normal behavior.",
        "Includes the requested hide/restore controls for optional child modules and compact message reactions."
      ]
    }]
  },
  "1.2.267": {
    "title": "Keep typing after sending a message",
    "sections": [
      {
        "heading": "Version 1.2.267",
        "headline": "Send another message without clicking the box",
        "summary": "After Enter or Send confirms a message, the cursor returns to that conversation’s message field.",
        "highlights": [
          "Type several messages in a row from the parent dashboard.",
          "The child Messages composer behaves the same way.",
          "Switching conversations or clicking another control during a send keeps your new focus."
        ]
      }
    ]
  },
  "1.2.265": {
  "title": "Put a child computer to sleep remotely",
  "sections": [
    {
      "heading": "Version 1.2.265",
      "headline": "Put a child computer to sleep from your phone",
      "summary": "Adds Sleep computer beside Close BodeeGuard on each child card in the parent dashboard.",
      "highlights": [
        "Expand a child card to find Sleep computer beside Close BodeeGuard.",
        "Connected computers with child app 1.2.265 or newer can receive sleep requests.",
        "BodeeGuard and open work remain ready when Windows wakes.",
        "Unreceived requests expire in two minutes, and waking does not replay a previous request."
      ]
    }
  ]
},
  "1.2.264": {
  "title": "School progress keeps syncing",
  "sections": [
    {
      "heading": "Version 1.2.264",
      "headline": "An older time record will not hold up new work",
      "summary": "Keeps approved school time and completion reports syncing when an older saved record needs review.",
      "highlights": [
        "Valid records receive their own upload receipts instead of waiting behind a rejected record.",
        "Original rejected records remain encrypted on the computer for review.",
        "School permissions and completion requirements still apply.",
        "Updates continue to wait during school and open activities."
      ]
    }
  ]
},
  "1.2.262": {
  "title": "School links and family plans",
  "sections": [
    {
      "heading": "Version 1.2.262",
      "headline": "School plans apply to the intended activities",
      "summary": "Corrects imported Quizlet and Science Spelling plan matching and improves Abeka assessment navigation.",
      "highlights": [
        "Quizlet follows its own saved family choice instead of inheriting Abeka requirements.",
        "Science Spelling no longer inherits the regular Spelling requirement. Refresh Daily Plan and apply your default once to correct previously applied plans.",
        "Abeka can use the documented LinkIt student entry, and blocked links keep the current approved school page open.",
        "Quiz submissions are never automatically replayed. The 1.2.261 installer recovery fixes remain included."
      ]
    }
  ]
},
  "1.2.261": {
  "title": "More reliable update recovery",
  "sections": [
    {
      "heading": "Version 1.2.261",
      "headline": "Updates recover from temporary Windows file locks",
      "summary": "Improves installation and recovery when Windows is still releasing application files.",
      "highlights": [
        "The installer waits for computer protection to finish closing before replacing files.",
        "Temporary file locks during rollback retry automatically while keeping the verified previous app.",
        "A healthy reopened app can clear the update screen after a delayed protection connection.",
        "Updates continue to wait during school and open activities; restart choices remain available."
      ]
    }
  ]
},
  "1.2.260": {
  "title": "Music while studying in Quizlet",
  "sections": [
    {
      "heading": "Version 1.2.260",
      "headline": "Keep music playing during Quizlet",
      "summary": "Permitted pinned Music stays open when your child opens Quizlet Study.",
      "highlights": [
        "Start a song, Pin to Bottom, then open Quizlet.",
        "Parent music permissions, daily listening limits and volume caps still apply.",
        "Quizlet records its own study time while music listening keeps its existing usage counter.",
        "Updates continue to wait during school and open activities."
      ]
    }
  ]
},
  "1.2.259": {
  "title": "Abeka volume controls work in full screen",
  "sections": [
    {
      "heading": "Version 1.2.259",
      "headline": "Lesson volume stays where your child sets it",
      "summary": "Abeka native volume and mute controls remain responsive in normal and full-screen lessons.",
      "highlights": [
        "Player redraws, speed changes and breaks no longer restore an old volume.",
        "The BodeeGuard toolbar still adjusts volume, including nested lesson players.",
        "Updates continue to wait while school or another activity is open."
      ]
    }
  ]
},
  "1.2.258": {
  "title": "Updates wait for school",
  "sections": [
    {
      "heading": "Version 1.2.258",
      "headline": "Choose when the child app restarts",
      "summary": "Downloaded updates wait during school and open activities. Children can restart when ready or postpone.",
      "highlights": [
        "Restart now and Later (30 minutes) are available on the ready-update notice.",
        "Automatic restart requires ten minutes on an unused dashboard, followed by a sixty-second warning.",
        "School, writing, drafts and other open activities keep the update waiting.",
        "The installer retries brief Windows file contention and reports specific Windows error codes to staff.",
        "Includes automatic computer-protection reconnection from version 1.2.256."
      ]
    }
  ]
},
  "1.2.257": {
  "title": "School time sync recovers cleanly",
  "sections": [
    {
      "heading": "Version 1.2.257",
      "headline": "Clearer school time and fewer confusing warnings",
      "summary": "Fixes a timestamp error that could leave a school-time warning visible over Abeka even while the approved school page worked.",
      "highlights": [
        "New study intervals never begin before the signed parent approval timestamp.",
        "Older intervals affected by this timing bug are repaired after an explicit server rejection; exact originals stay encrypted on the child computer.",
        "Only authorized time is uploaded. Other permission checks and saved work remain in place.",
        "Recovered sync warnings disappear automatically, and staff diagnostics identify persistent checkpoint failures.",
        "Logic Coach vocabulary stays readable on light and dark themes."
      ]
    }
  ]
},
  "1.2.256": {
  "title": "Computer protection reconnects automatically",
  "sections": [
    {
      "heading": "Version 1.2.256",
      "headline": "Routine protection recovery no longer needs a parent restart",
      "summary": "BodeeGuard retries its local protection helper automatically, then restores activities and lets a waiting update proceed when work is saved.",
      "highlights": [
        "A missed protection heartbeat or helper exit triggers automatic reconnection without a parent password.",
        "Clock corrections and delayed heartbeat reads no longer cause false protection failures.",
        "Open writing and art drafts remain in place while access is paused.",
        "Updates still verify protection and saved work before restarting; persistent faults keep retrying and appear in staff diagnostics."
      ]
    }
  ]
},
  "1.2.255": {
  "title": "Easier touchscreen learning",
  "sections": [
    {
      "heading": "Version 1.2.255",
      "headline": "Larger controls and better tablet layouts",
      "summary": "Touch controls, portrait layouts and typing input are improved throughout the child app.",
      "highlights": [
        "Common child controls have larger tap targets on touch and hybrid devices.",
        "Logic questions and music playlists offer up/down buttons for reordering.",
        "Typing exercises accept touch keyboard text and count active practice time.",
        "Piano supports simultaneous touches and a scrollable keyboard in portrait.",
        "Art Studio protects an active stroke from other fingers and adds Hand to move zoomed paper."
      ]
    }
  ]
},
  "1.2.254": {
  "title": "Voice messages keep the child app in place",
  "sections": [
    {
      "heading": "Version 1.2.254",
      "headline": "Listen and reply inside BodeeGuard",
      "summary": "Voice playback and message pop-up activation now restore the protected full-screen layer without taking focus away from the message controls.",
      "highlights": [
        "Restores the child app above the Windows shell when a message pop-up is activated or audio starts.",
        "Keeps Play/Pause and the reply field usable while the message window stays compact.",
        "Parent locks, authorized exit and approved external games retain their existing behavior."
      ]
    }
  ]
},
  "1.2.253": {
  "title": "Math Coach follows each child's settings",
  "sections": [
    {
      "heading": "Version 1.2.253",
      "headline": "Only enabled children see Math Coach",
      "summary": "The child dashboard now checks the saved Math Coach setting for that child before showing its card.",
      "highlights": [
        "Disabled Math Coach stays off both assigned activities and extra shortcuts.",
        "Enabled children who need approval for today see a clear locked card.",
        "Changes refresh on the next sync; another child's or an outdated snapshot cannot expose Math Coach."
      ]
    }
  ]
},
  "1.2.252": {
  "title": "Clearer help when pairing cannot finish",
  "sections": [
    {
      "heading": "Version 1.2.252",
      "headline": "Know what is installed and what needs attention",
      "summary": "Connection help explains when an incorrect Windows clock makes a new pairing code appear expired.",
      "highlights": [
        "Confirms BodeeGuard is already installed when setup needs a clock correction.",
        "Explains the ten-minute pairing code and gives the exact date/time and Retry pairing steps.",
        "Fixes garbled apostrophes throughout connection help and keeps private support reports available."
      ]
    }
  ]
},
  "1.2.251": {
  "title": "More ways to create in Art Studio",
  "sections": [
    {
      "heading": "Version 1.2.251",
      "headline": "Creative tools without a crowded canvas",
      "summary": "Select and edit your own marks, add shapes and text, try mirrored drawing, or trace an approved coloring page.",
      "highlights": [
        "Move, resize, rotate, duplicate or delete a selected part of a drawing, with Undo and Cancel.",
        "Shapes, text, color picking and symmetry live in More tools; brush settings appear only when needed.",
        "Marker, pencil, crayon and watercolor-style brushes give children different ways to draw.",
        "Approved library pages can become faint tracing guides that stay separate from printed artwork.",
        "Save a copy keeps the original safe. Existing drawings and protected coloring outlines are preserved."
      ]
    }
  ]
},
  "1.2.250": {
  "title": "Smarter coloring and new page creation",
  "sections": [
    {
      "heading": "Version 1.2.250",
      "headline": "Coloring with protected outlines and fewer spills",
      "summary": "Open saved pages in Draw & paint, with gap-aware fills and automatic local saves.",
      "highlights": [
        "Fill closes small gaps and asks before coloring a large area that reaches the page edge.",
        "Protected outlines, Undo/Redo, an eraser, color picker, custom colors and zoom make detailed coloring easier.",
        "Existing drawings remain in the local gallery; coloring copies save separately from the original pages.",
        "Cloud page generation is connected to the existing hosted image service, with family limits and parent approval preserved."
      ]
    }
  ]
},
  "1.2.249": {
  "title": "One Art & Coloring Studio",
  "sections": [
    {
      "heading": "Version 1.2.249",
      "headline": "Drawing, coloring pages and simple printing together",
      "summary": "The child dashboard now opens one Art & Coloring Studio, keeping existing artwork and family rules.",
      "highlights": [
        "Browse larger coloring previews, search your library and open twelve pages at a time.",
        "Print one fitted Letter portrait copy without the Windows print dialog or duplicate clicks.",
        "Drawings save when switching sections or closing; existing artwork stays on the child computer.",
        "Printer setup handles delayed registration and explains permission, driver and Print Spooler problems.",
        "Creating new coloring pages shows its availability clearly. The cloud image service still needs configuration."
      ]
    }
  ]
},
  "1.2.248": {
  "title": "Compact White Noise controls",
  "sections": [
    {
      "heading": "Version 1.2.248",
      "headline": "Less clutter while children study",
      "summary": "White Noise remembers first use and keeps its floating controls small.",
      "highlights": [
        "After the child opens White Noise once, the label stays hidden on that computer, including after reopening.",
        "The wave icon opens sound choices. One Play/Pause button controls the selected sound; the extra Stop button is removed.",
        "White Noise still works during Abeka and keeps its saved sound and volume."
      ]
    }
  ]
},
  "1.2.247": {
  "title": "Update and wake-up reliability",
  "sections": [
    {
      "heading": "Version 1.2.247",
      "headline": "Clearer restart status and more reliable updates",
      "summary": "Fixes a Windows folder lock during automatic installation and false protection failures after sleep or delayed heartbeats.",
      "highlights": [
        "Update helpers no longer hold the installed application folder open.",
        "Downloaded updates wait for saved work and closed activities while the dashboard remains usable.",
        "Protection failures have a clear parent recovery message and a support report instead of a misleading safe-restart message.",
        "Computers stuck on an older version may need this one-time manual upgrade; publishing does not confirm installation."
      ]
    }
  ]
},
  "1.2.246": {
  "title": "Mountain Rush joins Family Games",
  "sections": [
    {
      "heading": "Version 1.2.246",
      "headline": "Race together in Mountain Rush",
      "summary": "Children can download and play Mountain Rush from Family Games, with the same access rules and game-time limits.",
      "highlights": [
        "Verified downloads, automatic update checks and Update / repair are built in.",
        "Parents can download the Windows game and join the same-version LAN race as Mom or Dad.",
        "Game time, parent locks and Return to BodeeGuard stay active during play and graphics startup.",
        "Players who share a Windows account share Mountain Rush saved progress."
      ]
    }
  ]
},
  "1.2.245": {
  "title": "Connection help on child computers",
  "sections": [
    {
      "heading": "Version 1.2.245",
      "headline": "Clear answers when setup cannot connect",
      "summary": "Run connection checks inside the child app before pairing, with specific results and useful next steps.",
      "highlights": [
        "Checks Windows date/time, BodeeGuard server access, the signed app release and the protection service.",
        "A failed pairing attempt opens the checks and explains what needs attention.",
        "Open date/time settings during setup, retry pairing or copy a technical support report.",
        "Support reports exclude names, documents, passwords and pairing codes."
      ]
    }
  ]
},
  "1.2.244": {
  "title": "Faster media and a personal music library",
  "sections": [
    {
      "heading": "Version 1.2.244",
      "headline": "Music that is easier to manage",
      "summary": "Music, Audiobooks and Videos show the initial library with fewer cloud requests.",
      "highlights": [
        "Music collections load when opened, without holding up the whole library.",
        "Each child can find songs in New to you, hide songs and restore them later.",
        "Browsing a playlist keeps the current song playing.",
        "Pinned players have Stop & close; school opening stops music, while White Noise remains available."
      ]
    }
  ]
},
  "1.2.241": {
  "title": "Themed planner and readable coin balances",
  "sections": [
    {
      "heading": "Version 1.2.241",
      "headline": "A planner that matches each child",
      "summary": "My planner now follows the selected student theme, with a clearer coin balance on smaller or scaled screens.",
      "highlights": [
        "The dashboard planner and assignment form use the selected theme, including light themes.",
        "Coin amounts use lighter text and fit on one line without cutting off digits.",
        "Wallet headings and buttons stay readable in light and dark themes.",
        "Includes the earlier activity colors, learning improvements and inactivity-aware study timing."
      ]
    }
  ]
},
  "1.2.240": {
    "title": "Study time pauses when a child is inactive",
    "sections": [
      {
        "heading": "Version 1.2.240",
        "headline": "More accurate school time",
        "summary": "Unattended study pages stop adding time, while playing video lessons can continue without mouse or keyboard activity.",
        "highlights": [
          "Typing School counts actual exercise typing and pauses shortly after typing stops.",
          "Other assigned study activities pause after two minutes without input.",
          "School websites can keep counting while a visible lesson video advances; paused, stalled or finished video does not extend idle time.",
          "Sleep, lock, breaks and background windows pause school time. Previously saved history stays unchanged.",
          "Includes the earlier activity colors and learning improvements. Update the child app to apply these rules."
        ]
      }
    ]
  },
  "1.2.239": {
    "title": "Learning improvements and the complete pending update",
    "sections": [
      {
        "heading": "Version 1.2.239",
        "headline": "Your requested learning improvements are included",
        "summary": "This cumulative release brings together the pending school video, Spelling, Vocabulary, Poems and default activity changes.",
        "highlights": [
          "Spelling progresses per word from copying to rotating letter hints and unaided recall.",
          "Vocabulary distinguishes practice, test readiness and later retention.",
          "Daily Plan includes Letters handwriting and Numerals; existing child choices stay intact until you apply changes.",
          "School video fullscreen and caption controls are repaired. Poem narration supports a shared ElevenLabs voice and family audio caching when the provider is configured.",
          "Active typing time, individual activity colors and Mom/Dad family games remain included."
        ]
      }
    ]
  },
  "1.2.238": {
    "title": "Typing time counts actual practice",
    "sections": [
      {
        "heading": "Version 1.2.238",
        "headline": "Typing goals require active practice",
        "summary": "Leaving Typing School open no longer counts toward a daily schoolwork goal.",
        "highlights": [
          "Time begins when the child types in a lesson or speed test.",
          "The school timer pauses shortly after typing stops and when the window loses focus.",
          "Holding down a key does not earn practice time. Activity colors and family board games remain included."
        ]
      }
    ]
  },
  "1.2.237": {
    "title": "Play board games with Mom and Dad",
    "sections": [
      {
        "heading": "Version 1.2.237",
        "headline": "Join your children in Family Games",
        "summary": "Parents can play as Mom or Dad from the parent dashboard, with clearer Windows game downloads.",
        "highlights": [
          "Play Chess, Connect Four, Checkers and Fleet Battle in a private family room.",
          "Children retain their Family Games hours and daily time limits.",
          "Includes the student activity colors from version 1.2.236."
        ]
      }
    ]
  },
  "1.2.236": {
    "title": "Colorful student activity cards",
    "sections": [
      {
        "heading": "Version 1.2.236",
        "headline": "Activity colors now match your Daily Plan",
        "summary": "Children can find familiar activities by the same colors used in the parent plan.",
        "highlights": [
          "Student dashboard cards use each built-in activity color from Daily Plan.",
          "Custom subject colors stay intact.",
          "Required and completed schoolwork still show their clear status labels."
        ]
      }
    ]
  }
};

type InternalPilotAccount = {
  billingMode?: string;
  entitlementStatus?: string;
  releaseChannel?: string;
};

function validVersion(value: string) {
  return /^(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})$/.test(value)
    && value.split(".").every(part => Number(part) <= 65535);
}

// The authenticated account service owns signature verification and rollout
// eligibility. This is an additional product/channel boundary, not a verifier.
// The catalog and child updater share the signed cloud manifest. Older LAN
// artifacts return null. Never substitute a private build or generic latest release.
export function cloudAccountRelease(account: {
  releaseChannel: string;
  release?: GuardAccountRelease | null;
}): GuardAccountRelease | null {
  const { release, releaseChannel } = account;
  if (!release || !["beta", "stable"].includes(releaseChannel)) return null;
  if (typeof release.version !== "string" || !validVersion(release.version)) return null;
  const expected = `https://github.com/vexonastudios/bodeeguard-${releaseChannel}-releases/releases/download/cloud-child-v${release.version}/BodeeGuard-Cloud-Child-Setup-${release.version}.exe`;
  return release.downloadUrl === expected ? release : null;
}

// This offers the current internal Family Beta installer only to the same
// complimentary cloud household that is already permitted to use the cloud
// dashboard. Public and invited-family accounts continue through the signed
// channel catalog above.
export function internalPilotRelease(account: InternalPilotAccount, version: string | undefined): GuardAccountRelease | null {
  const normalizedVersion = String(version || "").trim();
  if (account.billingMode !== "complimentary" || account.entitlementStatus !== "active" || account.releaseChannel !== "beta" || !validVersion(normalizedVersion)) return null;
  return {
    version: normalizedVersion,
    downloadUrl: "/guard/download/windows",
    notes: familyBetaNotes[normalizedVersion] || {
      title: "Cloud Family Beta",
      sections: [{
        heading: "Install on a child computer",
        headline: "Download the Windows child app, then approve its pairing code from this parent account.",
        summary: "The app connects directly to your online dashboard. A parent computer and home network server are not required.",
        highlights: ["Install on each child Windows computer", "Approve the code from your phone or browser", "Assign the computer and confirm its offline recovery code"]
      }]
    }
  };
}

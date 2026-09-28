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
// Until its catalog supports the cloud manifest, existing LAN releases return
// null. Never substitute a private validation build or a generic latest release.
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

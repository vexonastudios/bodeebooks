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

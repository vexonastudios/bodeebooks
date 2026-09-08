export type GuardAccountRelease = {
  version: string;
  downloadUrl: string;
  notes?: {
    title: string;
    sections: Array<{ heading: string; headline: string; summary: string; highlights: string[] }>;
  } | null;
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
    notes: {
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

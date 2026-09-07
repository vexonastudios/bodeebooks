export type GuardAccountRelease = {
  version: string;
  downloadUrl: string;
  notes?: {
    title: string;
    sections: Array<{ heading: string; headline: string; summary: string; highlights: string[] }>;
  } | null;
};

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
  if (typeof release.version !== "string" || !/^(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})$/.test(release.version)
      || release.version.split(".").some(part => Number(part) > 65535)) return null;
  const expected = `https://github.com/vexonastudios/bodeeguard-${releaseChannel}-releases/releases/download/cloud-child-v${release.version}/BodeeGuard-Cloud-Child-Setup-${release.version}.exe`;
  return release.downloadUrl === expected ? release : null;
}

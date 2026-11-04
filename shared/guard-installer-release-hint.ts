// Public freshness hints only. The authenticated account catalog and download
// route remain the authority for signature verification, eligibility and URLs.
// Never use this response to select or authorize an installer.
export type InstallerChannel = "stable" | "beta" | "family-beta";
export function installerVersionHint(bytes: string, channel: InstallerChannel): string | null {
  try {
    if (Buffer.byteLength(bytes) > 32768) return null;
    const envelope = JSON.parse(bytes);
    if (envelope.schemaVersion !== 3 || Object.keys(envelope).sort().join(",") !== "payload,schemaVersion,signature"
      || typeof envelope.payload !== "string" || typeof envelope.signature !== "string" || !envelope.signature) return null;
    const body = JSON.parse(Buffer.from(envelope.payload, "base64").toString("utf8"));
    if (body.purpose !== (channel === "family-beta" ? "bodeeguard-cloud-child-test-update" : "bodeeguard-cloud-child-update")
      || body.channel !== (channel === "family-beta" ? "beta" : channel)
      || body.product !== "com.vexonastudios.bodeeguard.cloudchild" || body.platform !== "win32" || body.arch !== "x64"
      || typeof body.version !== "string" || !/^(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})$/.test(body.version)
      || body.version.split(".").some((part: string) => Number(part) > 65535)) return null;
    return body.version;
  } catch { return null; }
}

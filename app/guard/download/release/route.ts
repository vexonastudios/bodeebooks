import { installerVersionHint, type InstallerChannel } from "../../../../shared/guard-installer-release-hint";
import { familyBetaRecoveryManifest } from "../../../../shared/guard-update-recovery";

export const dynamic = "force-dynamic";
const cache = new Map<InstallerChannel, { version: string | null; expires: number }>();
const pending = new Map<InstallerChannel, Promise<string | null>>();

async function load(channel: InstallerChannel) {
  let version: string | null = null;
  try {
    // Fixed public URLs only. No account, billing, database or session reads.
    const response = await fetch(
      "https://github.com/vexonastudios/bodeeguard-" + channel + "-releases/releases/download/cloud-child-" + channel + "/bodeeguard-cloud-child-update.json",
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok || !response.body) throw Error("Release unavailable");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 32768) throw Error("Release too large");
        chunks.push(value);
      }
      version = installerVersionHint(Buffer.concat(chunks).toString("utf8"), channel);
    } finally { await reader.cancel(); }
  } catch { /* A failed hint never replaces the account's last verified release. */ }
  cache.set(channel, { version, expires: Date.now() + (version ? 30000 : 5000) });
  return version;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const channel = params.get("channel") as InstallerChannel;
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (!["stable", "beta", "family-beta"].includes(channel) || [...params.keys()].length !== 1)
    return Response.json({ error: "Unknown release channel" }, { status: 400, headers });
  let version: string | null;
  if (channel === "family-beta") {
    const bytes = familyBetaRecoveryManifest(process.env.BODEEGUARD_INTERNAL_PILOT_UPDATE_MANIFEST,
      process.env.BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION);
    version = bytes ? installerVersionHint(bytes.toString("utf8"), channel) : null;
  } else {
    const cached = cache.get(channel);
    if (cached && cached.expires > Date.now()) version = cached.version;
    else {
      if (!pending.has(channel)) pending.set(channel, load(channel).finally(() => pending.delete(channel)));
      version = await pending.get(channel)!;
    }
  }
  return Response.json({ channel, version }, { status: version ? 200 : 503, headers });
}

import { auth } from "@clerk/nextjs/server";
import { createHmac, randomUUID } from "node:crypto";
import { after, NextResponse } from "next/server";
import { cloudAccountRelease, internalPilotRelease } from "../../../../shared/guard-cloud-release";

type AccountDownloadStatus = {
  billingMode: "stripe" | "complimentary";
  entitlementStatus: "inactive" | "trial" | "active" | "grace";
  releaseChannel: "beta" | "stable";
  release?: { version: string; downloadUrl: string } | null;
};

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

function backToAccount(request: Request, reason: "access" | "unavailable", share = false) {
  if (share) return Response.json({ error: reason === "access" ? "Your family needs active access to download the child app." : "The child download is unavailable. Please try again from your parent account." }, { status: reason === "access" ? 403 : 503, headers: privateHeaders });
  const destination = new URL("/guard/account/", request.url);
  destination.searchParams.set("download", reason);
  return NextResponse.redirect(destination, { status: 303, headers: { "Cache-Control": "private, no-store" } });
}

function internalPilotDownloadUrl(version: string) {
  const origin = String(process.env.BODEEGUARD_INTERNAL_PILOT_ASSET_ORIGIN || "").trim();
  const secret = String(process.env.BODEEGUARD_INTERNAL_PILOT_DOWNLOAD_SECRET || "");
  let assetUrl: URL;
  try { assetUrl = new URL(origin); }
  catch { return null; }
  if (assetUrl.protocol !== "https:" || assetUrl.username || assetUrl.password || assetUrl.pathname !== "/" || assetUrl.search || assetUrl.hash || !secret) return null;
  const filename = `BodeeGuard-Cloud-Test-${version}.exe`;
  assetUrl.pathname = `/v1/installers/internal/${filename}`;
  const expires = Math.floor(Date.now() / 1000) + 300;
  const message = ["bodeeguard-installer-download-v1", "GET", assetUrl.pathname, String(expires)].join("\n");
  assetUrl.searchParams.set("expires", String(expires));
  assetUrl.searchParams.set("signature", createHmac("sha256", secret).update(message).digest("hex"));
  return assetUrl.toString();
}

async function download(request: Request, share = false) {
  const session = share ? await auth() : await auth.protect();
  if (share && !session.isAuthenticated) return Response.json({ error: "Please sign in to your parent account again." }, { status: 401, headers: privateHeaders });
  const token = await session.getToken();
  const apiBase = process.env.BODEEGUARD_COMMERCIAL_API_URL?.replace(/\/$/, "");
  if (!token || !apiBase) return backToAccount(request, "unavailable", share);
  try {
    const response = await fetch(`${apiBase}/v1/account`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return backToAccount(request, "unavailable", share);
    const account = await response.json() as AccountDownloadStatus;
    if (account.billingMode !== "complimentary" && !["trial", "active", "grace"].includes(account.entitlementStatus)) {
      return backToAccount(request, "access", share);
    }
    const release = cloudAccountRelease(account);
    function trackDownload(version: string) {
      after(async () => {
        try {
          const tracked = await fetch(`${apiBase}/v1/account/downloads`, {
            method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ id: randomUUID(), version, channel: account.releaseChannel }),
            cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000),
          });
          if (!tracked.ok) console.warn("BodeeGuard download metric unavailable", tracked.status);
        } catch { console.warn("BodeeGuard download metric unavailable"); }
      });
    }
    if (release) {
      trackDownload(release.version);
      return share ? Response.json({ url: release.downloadUrl, version: release.version, expiresAt: null }, { headers: privateHeaders })
        : NextResponse.redirect(release.downloadUrl, { status: 307, headers: privateHeaders });
    }
    const pilot = internalPilotRelease(account, process.env.BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION);
    const downloadUrl = pilot && internalPilotDownloadUrl(pilot.version);
    if (!downloadUrl) return backToAccount(request, "unavailable", share);
    trackDownload(pilot.version);
    return share ? Response.json({ url: downloadUrl, version: pilot.version, expiresAt: new Date(Number(new URL(downloadUrl).searchParams.get("expires")) * 1000).toISOString() }, { headers: privateHeaders })
      : NextResponse.redirect(downloadUrl, { status: 307, headers: privateHeaders });
  } catch {
    return backToAccount(request, "unavailable", share);
  }
}


export async function GET(request: Request) { return download(request); }

// The shared link grants only a download of the same eligible installer.
// It never enrolls a computer or carries a parent session or family records.
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Create the download link from your parent account." }, { status: 403, headers: privateHeaders });
  }
  return download(request, true);
}

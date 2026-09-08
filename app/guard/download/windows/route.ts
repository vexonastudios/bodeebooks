import { auth } from "@clerk/nextjs/server";
import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { cloudAccountRelease, internalPilotRelease } from "../../../../shared/guard-cloud-release";

type AccountDownloadStatus = {
  billingMode: "stripe" | "complimentary";
  entitlementStatus: "inactive" | "trial" | "active" | "grace";
  releaseChannel: "beta" | "stable";
  release?: { version: string; downloadUrl: string } | null;
};

function backToAccount(request: Request, reason: "access" | "unavailable") {
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

export async function GET(request: Request) {
  const session = await auth.protect();
  const token = await session.getToken();
  const apiBase = process.env.BODEEGUARD_COMMERCIAL_API_URL?.replace(/\/$/, "");
  if (!token || !apiBase) return backToAccount(request, "unavailable");
  try {
    const response = await fetch(`${apiBase}/v1/account`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return backToAccount(request, "unavailable");
    const account = await response.json() as AccountDownloadStatus;
    if (account.billingMode !== "complimentary" && !["trial", "active", "grace"].includes(account.entitlementStatus)) {
      return backToAccount(request, "access");
    }
    const release = cloudAccountRelease(account);
    if (release) return NextResponse.redirect(release.downloadUrl, { status: 307, headers: { "Cache-Control": "private, no-store" } });
    const pilot = internalPilotRelease(account, process.env.BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION);
    const downloadUrl = pilot && internalPilotDownloadUrl(pilot.version);
    if (!downloadUrl) return backToAccount(request, "unavailable");
    return NextResponse.redirect(downloadUrl, { status: 307, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return backToAccount(request, "unavailable");
  }
}

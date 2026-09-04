import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type AccountDownloadStatus = {
  billingMode: "stripe" | "complimentary";
  entitlementStatus: "inactive" | "trial" | "active" | "grace";
  releaseChannel: "beta" | "stable";
  release?: { version: string; downloadUrl: string } | null;
};

function backToAccount(request: Request, reason: "access" | "unavailable") {
  const destination = new URL("/guard/account/", request.url);
  destination.searchParams.set("download", reason);
  return NextResponse.redirect(destination, 303);
}

export async function GET(request: Request) {
  const session = await auth.protect();
  const token = await session.getToken();
  const apiBase = process.env.BODEEGUARD_COMMERCIAL_API_URL?.replace(/\/$/, "");
  if (!token || !apiBase) return backToAccount(request, "unavailable");
  try {
    const response = await fetch(`${apiBase}/v1/account`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    if (!response.ok) return backToAccount(request, "unavailable");
    const account = await response.json() as AccountDownloadStatus;
    if (account.billingMode !== "complimentary" && !["trial", "active", "grace"].includes(account.entitlementStatus)) {
      return backToAccount(request, "access");
    }
    const release = account.release;
    if (!release || !/^\d+\.\d+\.\d+$/.test(release.version)) return backToAccount(request, "unavailable");
    const channel = account.releaseChannel === "beta" ? "beta" : "stable";
    const expected = `https://github.com/vexonastudios/bodeeguard-${channel}-releases/releases/download/v${release.version}/BodeeGuard-Setup-${release.version}.exe`;
    if (release.downloadUrl !== expected) return backToAccount(request, "unavailable");
    // The account service verifies the signed bundle and asset digests and
    // filters household-only builds before exposing this URL.
    return NextResponse.redirect(expected, { status: 307, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return backToAccount(request, "unavailable");
  }
}

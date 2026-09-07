import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cloudAccountRelease } from "../../../../shared/guard-cloud-release";

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
    if (!release) return backToAccount(request, "unavailable");
    return NextResponse.redirect(release.downloadUrl, { status: 307, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return backToAccount(request, "unavailable");
  }
}

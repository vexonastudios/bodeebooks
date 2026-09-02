import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type AccountDownloadStatus = {
  billingMode: "stripe" | "complimentary";
  entitlementStatus: "inactive" | "trial" | "active" | "grace";
  releaseChannel: "beta" | "stable";
};

type GitHubRelease = {
  assets?: Array<{
    name?: string;
    browser_download_url?: string;
  }>;
};

const DEFAULT_RELEASE_REPOSITORIES = {
  beta: "vexonastudios/bodeeguard-beta-releases",
  stable: "vexonastudios/bodeeguard-stable-releases",
} as const;

function backToAccount(request: Request, reason: "access" | "unavailable") {
  const destination = new URL("/guard/account/", request.url);
  destination.searchParams.set("download", reason);
  return NextResponse.redirect(destination, 303);
}

function releaseRepository(channel: "beta" | "stable") {
  const configured = channel === "beta"
    ? process.env.BODEEGUARD_BETA_RELEASE_REPOSITORY
    : process.env.BODEEGUARD_STABLE_RELEASE_REPOSITORY;
  const repository = configured?.trim() || DEFAULT_RELEASE_REPOSITORIES[channel];
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repository)) {
    throw new Error("The BodeeGuard release repository is invalid");
  }
  return repository;
}

export async function GET(request: Request) {
  const session = await auth.protect();
  const token = await session.getToken();
  const apiBase = process.env.BODEEGUARD_COMMERCIAL_API_URL?.replace(/\/$/, "");
  if (!token || !apiBase) return backToAccount(request, "unavailable");

  try {
    const accountResponse = await fetch(`${apiBase}/v1/account`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!accountResponse.ok) return backToAccount(request, "unavailable");

    const account = await accountResponse.json() as AccountDownloadStatus;
    const entitled = account.billingMode === "complimentary"
      || ["trial", "active", "grace"].includes(account.entitlementStatus);
    if (!entitled) return backToAccount(request, "access");

    const channel = account.releaseChannel === "beta" ? "beta" : "stable";
    const releaseResponse = await fetch(`https://api.github.com/repos/${releaseRepository(channel)}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "BodeeGuard-Account-Portal",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 60 },
    });
    if (!releaseResponse.ok) return backToAccount(request, "unavailable");

    const release = await releaseResponse.json() as GitHubRelease;
    const installer = release.assets?.find(asset => /^BodeeGuard-Setup-[0-9A-Za-z.+-]+\.exe$/.test(asset.name || ""));
    const downloadUrl = installer?.browser_download_url;
    if (!downloadUrl) return backToAccount(request, "unavailable");

    const destination = new URL(downloadUrl);
    if (destination.protocol !== "https:" || destination.hostname !== "github.com") {
      return backToAccount(request, "unavailable");
    }
    return NextResponse.redirect(destination, 307);
  } catch {
    return backToAccount(request, "unavailable");
  }
}

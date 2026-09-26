import { createHmac } from "node:crypto";

export function internalPilotDownloadUrl(version: string) {
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


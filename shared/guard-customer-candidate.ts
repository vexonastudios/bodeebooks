import { createHmac } from "node:crypto";

// Temporary owner-only delivery for the exact Stable acceptance candidate.
// This is not the public update catalog or the private Family Beta installer.
export const candidatePath = "/v1/installers/candidates/f7fad65465130af86e25e735d18196aa/BodeeGuard-Cloud-Child-Setup-1.2.339.exe";
type CandidateUser = { primaryEmailAddress?: { emailAddress?: string; verification?: { status?: string } | null } | null } | null;
export function canDownloadCandidate(user: CandidateUser) {
  const allowed = process.env.BODEEGUARD_CUSTOMER_CANDIDATE_EMAIL?.trim().toLowerCase();
  const email = user?.primaryEmailAddress;
  return Boolean(allowed && email?.verification?.status === "verified" && email.emailAddress?.trim().toLowerCase() === allowed);
}
export function candidateDownloadUrl() {
  const secret = process.env.BODEEGUARD_INTERNAL_PILOT_DOWNLOAD_SECRET || "";
  let url: URL;
  try { url = new URL(process.env.BODEEGUARD_INTERNAL_PILOT_ASSET_ORIGIN || ""); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || !secret) return null;
  url.pathname = candidatePath;
  const expires = String(Math.floor(Date.now() / 1000) + 300);
  const message = ["bodeeguard-installer-download-v1", "GET", url.pathname, expires].join("\n");
  url.searchParams.set("expires", expires);
  url.searchParams.set("signature", createHmac("sha256", secret).update(message).digest("hex"));
  return url.toString();
}

// Only this exact verified Stable release is mirrored in the candidate R2 key.
// Later versions use the signed catalog URL until their own mirror is configured.
export function releasedCustomerR2Url(channel: string, version: string) {
  return channel === "stable" && version === "1.2.339" ? candidateDownloadUrl() : null;
}

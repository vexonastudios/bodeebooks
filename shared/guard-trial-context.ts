import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";

// Used exclusively by the authenticated Start trial server action. Vercel
// overwrites this platform header; never trust a browser-supplied custom IP.
export function trialContextHeaders(incoming: Pick<Headers, "get">, token: string,
  env = process.env, now = Date.now()) {
  const ip = env.VERCEL === "1" ? incoming.get("x-vercel-forwarded-for") : "127.0.0.1";
  const secret = env.CLERK_SECRET_KEY;
  if (!ip || !isIP(ip) || ip.length > 45 || !secret || secret.length < 32 || !token) {
    throw new Error("Trial request could not be verified. Please refresh and try again.");
  }
  const time = String(now);
  const signature = createHmac("sha256", secret)
    .update(["bodeeguard-trial-context-v1", time, ip, `Bearer ${token}`].join("\n")).digest("hex");
  return { "x-bg-trial-ip": ip, "x-bg-trial-time": time, "x-bg-trial-signature": signature };
}

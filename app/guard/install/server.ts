import { cloudAccountRelease, internalPilotRelease } from "../../../shared/guard-cloud-release";
import { internalPilotDownloadUrl } from "../../../shared/guard-installer-download";
export const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site";
}
export function installerLink(descriptor: {kind?: string; channel?: string; version?: string} | undefined) {
  if (descriptor?.kind === "internal") {
    // Only the authenticated API's download grant can select this branch.
    const pilot = internalPilotRelease({billingMode:"complimentary",entitlementStatus:"active",releaseChannel:"beta"}, process.env.BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION);
    const url = pilot && internalPilotDownloadUrl(pilot.version);
    if (url) return {url,version:pilot.version,expiresAt:new Date(Number(new URL(url).searchParams.get("expires"))*1000).toISOString()};
  } else if (descriptor?.kind === "catalog") {
    const {channel = "",version = ""} = descriptor;
    const url = `https://github.com/vexonastudios/bodeeguard-${channel}-releases/releases/download/cloud-child-v${version}/BodeeGuard-Cloud-Child-Setup-${version}.exe`;
    const release = cloudAccountRelease({releaseChannel:channel,release:{version,downloadUrl:url}});
    if (release) return {url,version,expiresAt:null};
  }
  throw Error("download_unavailable");
}
export async function installerApi(path: string, body: object, token?: string) {
  const base = process.env.BODEEGUARD_COMMERCIAL_API_URL?.replace(/\/$/, "");
  if (!base) throw Error("download_unavailable");
  const response = await fetch(`${base}${path}`, {method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(10000)});
  const result = await response.json();
  if (!response.ok) {
    const status = [400,401,403,429].includes(response.status) ? response.status : 503;
    const error = status === 400 ? "That download code is incorrect or expired. Check it on the parent’s phone, or create a new code."
      : status === 429 ? "Too many attempts. Please wait a minute before trying again."
      : status === 401 ? "Sign in to your parent account to create a download code."
      : status === 403 ? "An active parent account is needed to create a download code."
      : "Downloads are temporarily unavailable. Please try again.";
    return {error:Response.json({error},{status,headers:privateHeaders}),result:null};
  }
  return {result,error:null};
}
export function unavailable() { return Response.json({error:"Downloads are temporarily unavailable. Please try again."},{status:503,headers:privateHeaders}); }

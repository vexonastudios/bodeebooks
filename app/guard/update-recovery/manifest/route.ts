import { familyBetaRecoveryManifest } from "../../../../shared/guard-update-recovery";

export const dynamic = "force-dynamic";
function response(request: Request) {
  const headers = { "Cache-Control": "no-store", "Content-Type": "application/json", "X-Content-Type-Options": "nosniff" };
  if (new URL(request.url).search) return new Response(null, { status: 404, headers });
  const bytes = familyBetaRecoveryManifest(process.env.BODEEGUARD_INTERNAL_PILOT_UPDATE_MANIFEST,
    process.env.BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION);
  if (!bytes) return new Response(null, { status: 503, headers });
  return new Response(request.method === "HEAD" ? null : new Uint8Array(bytes), { headers });
}
export function GET(request: Request) { return response(request); }
export function HEAD(request: Request) { return response(request); }

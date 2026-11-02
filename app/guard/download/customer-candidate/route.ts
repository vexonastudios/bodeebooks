import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { canDownloadCandidate, candidateDownloadUrl } from "../../../../shared/guard-customer-candidate";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!(await auth()).isAuthenticated || !canDownloadCandidate(await currentUser())) return new Response(null, { status: 404, headers });
  const url = candidateDownloadUrl();
  if (!url) return new Response("Customer installer download is temporarily unavailable.", { status: 503, headers });
  return NextResponse.redirect(url, { status: 307, headers });
}

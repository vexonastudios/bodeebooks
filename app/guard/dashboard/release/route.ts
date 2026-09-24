// Contains no account data and performs no database or commercial API reads.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ release: process.env.NEXT_PUBLIC_GUARD_RELEASE }, {
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}

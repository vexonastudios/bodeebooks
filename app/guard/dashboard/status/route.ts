import { cloudApi, type CloudDashboard } from "../cloud-api";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  if (!(await auth()).isAuthenticated) return Response.json({ error: "Please sign in again." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try { return Response.json(await cloudApi<CloudDashboard>(), { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return Response.json({ error: "Status could not be refreshed. Please check your connection or sign in again." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}

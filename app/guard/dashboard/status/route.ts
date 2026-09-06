import { cloudApi, type CloudDashboard } from "../cloud-api";

export async function GET() {
  try { return Response.json(await cloudApi<CloudDashboard>(), { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return Response.json({ error: "Status could not be refreshed. Please check your connection or sign in again." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}

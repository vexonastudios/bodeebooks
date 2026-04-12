import { getLatestAudiobooks } from "@/lib/youtube";

export const revalidate = 1800;

export async function GET() {
  const result = await getLatestAudiobooks(12);

  return Response.json(result);
}

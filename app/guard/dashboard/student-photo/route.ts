import { auth } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";

const noStore = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  if (!(await auth()).isAuthenticated) return new Response(null, { status: 401, headers: noStore });
  const params = new URL(request.url).searchParams, student = params.get("student"), version = params.get("v");
  if (!/^[a-f0-9-]{36}$/i.test(student || "") || !/^[a-f0-9]{64}$/.test(version || "")) return new Response(null, { status: 400, headers: noStore });
  try {
    const photo = await cloudApi<{ mime: string; data: string; version: string }>(`/students/${student}/photo/${version}`);
    if (photo.mime !== "image/webp" || photo.version !== version || typeof photo.data !== "string" || photo.data.length > 44000) throw new Error("Invalid portrait");
    const bytes = Buffer.from(photo.data, "base64");
    if (!bytes.length || bytes.length > 32768) throw new Error("Invalid portrait");
    return new Response(bytes, { headers: {
      "Content-Type": "image/webp", "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=86400, immutable", "Vary": "Cookie",
      "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin"
    } });
  } catch (error) { return new Response(null, { status: error instanceof CloudApiError ? error.status : 503, headers: noStore }); }
}

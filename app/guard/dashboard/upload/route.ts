import { auth } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";
export const maxDuration = 30;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Open the BodeeBooks dashboard to upload files." }, 403);
  if (!(await auth()).isAuthenticated) return reply({ error: "Please sign in again." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ error: "Send a JSON file upload." }, 415);
  let input: Record<string, unknown>;
  const reader = request.body?.getReader(); if (!reader) return reply({ error: "Choose a file to upload." }, 400);
  try {
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.length; if (length > 3 * 1024 * 1024) { await reader.cancel(); return reply({ error: "Choose a file up to 2 MB." }, 413); } chunks.push(next.value); }
    const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    input = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || input.action !== "upload-file") return reply({ error: "This endpoint accepts only private file uploads." }, 400);
  } catch { return reply({ error: "The upload was invalid." }, 400); }
  finally { reader.releaseLock(); }
  try {
    return reply(await cloudApi("/files/upload", { method: "POST", body: JSON.stringify({ id: input.id, studentId: input.studentId, purpose: input.purpose, name: input.name, mime: input.mime, data: input.data }) }));
  } catch (error) { return reply({ error: error instanceof CloudApiError ? error.message : "The upload could not be confirmed. Keep this page open and retry the same file." }, error instanceof CloudApiError ? error.status : 503); }
}

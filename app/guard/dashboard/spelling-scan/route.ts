import { auth } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Open the parent Spelling editor to scan a photo." }, 403);
  if (!(await auth()).isAuthenticated) return reply({ error: "Please sign in again." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ error: "Send a JSON spelling photo." }, 415);
  let input: Record<string, unknown>;
  const reader = request.body?.getReader(); if (!reader) return reply({ error: "Choose a spelling photo." }, 400);
  try {
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.length; if (length > 4 * 1024 * 1024) { await reader.cancel(); return reply({ error: "Choose up to 6 smaller photos." }, 413); } chunks.push(next.value); }
    const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    input = JSON.parse(new TextDecoder().decode(bytes));
    if (input?.prompt !== undefined && (typeof input.prompt !== "string" || input.prompt.length > 500)) return reply({ error: "Keep scan instructions to 500 characters or fewer." }, 400);
    if (!input || typeof input.id !== "string" || (input.images !== undefined ? !Array.isArray(input.images) || input.images.length < 1 || input.images.length > 6 : typeof input.data !== "string")) return reply({ error: "Choose a supported spelling photo." }, 400);
  } catch { return reply({ error: "The spelling photo request is invalid." }, 400); }
  finally { reader.releaseLock(); }
  try { return reply(await cloudApi("/spelling/scan", { method: "POST", body: JSON.stringify({ id: input.id, prompt: input.prompt, ...(input.images !== undefined ? { images: input.images } : { mime: input.mime, data: input.data }) }) })); }
  catch (error) { return reply({ error: error instanceof CloudApiError ? error.message : "The scan reply was lost. Keep the editor open and retry this scan." }, error instanceof CloudApiError ? error.status : 503); }
}

import { auth } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Open the parent Gradebook to scan a paper." }, 403);
  if (!(await auth()).isAuthenticated) return reply({ error: "Please sign in again." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ error: "Send a JSON paper request." }, 415);
  let input: Record<string, unknown>;
  const reader = request.body?.getReader(); if (!reader) return reply({ error: "Choose a saved paper." }, 400);
  try {
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.length; if (length > 4096) { await reader.cancel(); return reply({ error: "The paper request is too large." }, 413); } chunks.push(next.value); }
    const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    input = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || typeof input.id !== "string" || !uuid.test(input.id) || typeof input.fileId !== "string" || !uuid.test(input.fileId) || !["read","suggest"].includes(String(input.mode))) return reply({ error: "Choose a saved paper and scan option." }, 400);
  } catch { return reply({ error: "The paper request is invalid." }, 400); }
  finally { reader.releaseLock(); }
  try { return reply(await cloudApi("/grades/scan", { method: "POST", body: JSON.stringify({ id: input.id, fileId: input.fileId, mode: input.mode }) })); }
  catch (error) { return reply({ error: error instanceof CloudApiError ? error.message : "The scan reply was lost. Keep this editor open and retry the same scan." }, error instanceof CloudApiError ? error.status : 503); }
}

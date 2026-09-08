import { auth } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";
export const maxDuration = 30;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
function pick(input: Record<string, unknown>, fields: string[]) { return Object.fromEntries(fields.filter(key => input[key] !== undefined).map(key => [key, input[key]])); }
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Open the parent Poems editor." }, 403);
  if (!(await auth()).isAuthenticated) return reply({ error: "Please sign in again." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ error: "Send a JSON poem request." }, 415);
  let input: Record<string, unknown>;
  const reader = request.body?.getReader(); if (!reader) return reply({ error: "Choose a poem action." }, 400);
  try {
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.length; if (length > 128 * 1024) { await reader.cancel(); return reply({ error: "Keep the poem request within 128 KB." }, 413); } chunks.push(next.value); }
    const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    input = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || typeof input !== "object" || Array.isArray(input) || !["list", "command", "recording"].includes(String(input.action))) return reply({ error: "Choose a supported poem action." }, 400);
  } catch { return reply({ error: "The poem request is invalid." }, 400); }
  finally { reader.releaseLock(); }
  let body: Record<string, unknown>;
  if (input.action === "list") body = pick(input, ["studentId", "offset"]);
  else if (input.action === "recording") { if (!["manifest", "part"].includes(String(input.view))) return reply({ error: "Choose a received recitation." }, 400); body = pick(input, ["view", "studentId", "recordingId", "position"]); }
  else if (input.kind === "assignment") body = pick(input, ["id", "kind", "studentId", "assignmentId", "revision", "title", "author", "poem_text", "start_date", "due_date", "status", "required_daily", "daily_new_lines"]);
  else if (input.kind === "review") body = pick(input, ["id", "kind", "studentId", "recitationId", "revision", "approved", "notes"]);
  else return reply({ error: "Choose a parent assignment or recitation review." }, 400);
  try { return reply(await cloudApi(`/poems/${input.action}`, { method: "POST", body: JSON.stringify(body) })); }
  catch (error) { return reply({ error: error instanceof CloudApiError ? error.message : "The poem reply was lost. Keep the editor open and retry the saved change." }, error instanceof CloudApiError ? error.status : 503); }
}

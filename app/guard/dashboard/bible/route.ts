import { auth } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";
export const maxDuration = 30;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
function pick(input: Record<string, unknown>, fields: string[]) { return Object.fromEntries(fields.filter(key => input[key] !== undefined).map(key => [key, input[key]])); }
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Open Bible in your parent dashboard." }, 403);
  if (!(await auth()).isAuthenticated) return reply({ error: "Please sign in again." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ error: "Send a JSON Bible request." }, 415);
  const reader = request.body?.getReader(); if (!reader) return reply({ error: "Choose a Bible action." }, 400);
  let input: Record<string, unknown>;
  try {
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.length; if (length > 32 * 1024) { await reader.cancel(); return reply({ error: "Keep the Bible request within 32 KB." }, 413); } chunks.push(next.value); }
    const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    input = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || typeof input !== "object" || Array.isArray(input) || !["list", "command"].includes(String(input.action))) return reply({ error: "Choose a supported Bible action." }, 400);
  } catch { return reply({ error: "The Bible request is invalid." }, 400); }
  finally { reader.releaseLock(); }
  let body: Record<string, unknown>;
  if (input.action === "list") body = {};
  else if (input.kind === "assign") body = pick(input, ["id", "kind", "studentIds", "title", "passages"]);
  else if (input.kind === "archive") body = pick(input, ["id", "kind", "studentId", "assignmentId"]);
  else if (input.kind === "sync") body = pick(input, ["id", "kind", "studentId", "enabled", "epoch"]);
  else return reply({ error: "Choose an assignment or backup setting." }, 400);
  try { return reply(await cloudApi(`/bible/${input.action}`, { method: "POST", body: JSON.stringify(body) })); }
  catch (error) { return reply({ error: error instanceof CloudApiError ? error.message : "The reply was lost. Retry the saved Bible change." }, error instanceof CloudApiError ? error.status : 503); }
}

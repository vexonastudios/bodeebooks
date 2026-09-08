import { auth } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";
export const maxDuration = 30;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
function pick(input: Record<string, unknown>, fields: string[]) {
  return Object.fromEntries(fields.filter(key => input[key] !== undefined).map(key => [key, input[key]]));
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Open the parent Science Spelling editor." }, 403);
  if (!(await auth()).isAuthenticated) return reply({ error: "Please sign in again." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ error: "Send a JSON Science Spelling request." }, 415);
  let input: Record<string, unknown>;
  const reader = request.body?.getReader(); if (!reader) return reply({ error: "Choose a Science Spelling action." }, 400);
  try {
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.length; if (length > 1024 * 1024) { await reader.cancel(); return reply({ error: "Keep the science list request within 1 MB." }, 413); } chunks.push(next.value); }
    const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    input = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || typeof input !== "object" || Array.isArray(input) || !["list", "command"].includes(String(input.action))) return reply({ error: "Choose a supported Science Spelling action." }, 400);
  } catch { return reply({ error: "The Science Spelling request is invalid." }, 400); }
  finally { reader.releaseLock(); }
  let body: Record<string, unknown>;
  if (input.action === "list") {
    if (input.view !== undefined && !["history", "defaults"].includes(String(input.view))) return reply({ error: "Choose a supported Science Spelling view." }, 400);
    body = pick(input, ["studentId", "view", "search", "offset", "terms", "category"]);
  } else {
    if (!["list", "config", "reset"].includes(String(input.kind))) return reply({ error: "Choose a parent Science Spelling change." }, 400);
    body = pick(input, input.kind === "config" ? ["id", "kind", "revision", "independent_retrievals", "delayed_interval_days"] : input.kind === "reset" ? ["id", "kind", "revision", "studentId"] : ["id", "kind", "listId", "revision", "title", "category", "test_date", "status", "notes", "student_ids"]);
    if (input.kind === "list") {
      if (!Array.isArray(input.words) || input.words.length < 1 || input.words.length > 150 || input.words.some(word => !word || typeof word !== "object" || Array.isArray(word))) return reply({ error: "Use one to 150 science terms." }, 400);
      body.words = input.words.map(word => pick(word as Record<string, unknown>, ["word", "pronunciation_text", "definition", "example_sentence", "category", "chunks", "morphemes", "difficulty", "common_misspellings", "notes"]));
    }
  }
  try { return reply(await cloudApi(`/science-spelling/${input.action}`, { method: "POST", body: JSON.stringify(body) })); }
  catch (error) { return reply({ error: error instanceof CloudApiError ? error.message : "The Science Spelling reply was lost. Keep the editor open and retry the saved change." }, error instanceof CloudApiError ? error.status : 503); }
}

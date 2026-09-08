import { auth } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";
export const maxDuration = 30;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
function pick(input: Record<string, unknown>, fields: string[]) {
  return Object.fromEntries(fields.filter(key => input[key] !== undefined).map(key => [key, input[key]]));
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Open the parent Vocabulary editor." }, 403);
  if (!(await auth()).isAuthenticated) return reply({ error: "Please sign in again." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ error: "Send a JSON Vocabulary request." }, 415);
  let input: Record<string, unknown>;
  const reader = request.body?.getReader(); if (!reader) return reply({ error: "Choose a Vocabulary action." }, 400);
  try {
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.length; if (length > 1024 * 1024) { await reader.cancel(); return reply({ error: "Keep the Vocabulary request within 1 MB." }, 413); } chunks.push(next.value); }
    const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    input = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || typeof input !== "object" || Array.isArray(input) || !["list", "command"].includes(String(input.action))) return reply({ error: "Choose a supported Vocabulary action." }, 400);
  } catch { return reply({ error: "The Vocabulary request is invalid." }, 400); }
  finally { reader.releaseLock(); }
  let body: Record<string, unknown>;
  if (input.action === "list") body = pick(input, ["studentId", "offset"]);
  else {
    if (input.kind !== "list") return reply({ error: "Choose a parent Vocabulary list change." }, 400);
    if (!Array.isArray(input.terms) || input.terms.length < 3 || input.terms.length > 60 || input.terms.some(term => !term || typeof term !== "object" || Array.isArray(term))) return reply({ error: "Use three to 60 Vocabulary terms." }, 400);
    body = pick(input, ["id", "kind", "studentId", "listId", "revision", "title", "start_date", "test_date", "status", "required_daily", "daily_term_limit", "retention_enabled", "source_notes"]);
    body.terms = input.terms.map(term => pick(term as Record<string, unknown>, ["word", "pronunciation", "part_of_speech", "exact_definition", "definition", "source_sentence", "synonyms", "antonyms", "related_forms", "source_notes", "missing_fields", "completeness"]));
  }
  try { return reply(await cloudApi(`/vocabulary/${input.action}`, { method: "POST", body: JSON.stringify(body) })); }
  catch (error) { return reply({ error: error instanceof CloudApiError ? error.message : "The Vocabulary reply was lost. Keep the editor open and retry the saved change." }, error instanceof CloudApiError ? error.status : 503); }
}

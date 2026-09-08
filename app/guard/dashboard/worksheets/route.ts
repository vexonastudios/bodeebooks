import { auth } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";
export const maxDuration = 30;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
function pick(input: Record<string, unknown>, fields: string[]) { return Object.fromEntries(fields.filter(key => input[key] !== undefined).map(key => [key, input[key]])); }
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Open the parent Worksheet Library." }, 403);
  if (!(await auth()).isAuthenticated) return reply({ error: "Please sign in again." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ error: "Send a JSON worksheet request." }, 415);
  const reader = request.body?.getReader(); if (!reader) return reply({ error: "Choose a worksheet action." }, 400);
  let input: Record<string, unknown>;
  try {
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.length; if (length > 1500 * 1024) { await reader.cancel(); return reply({ error: "Send one worksheet image part at a time." }, 413); } chunks.push(next.value); }
    const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    input = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || typeof input !== "object" || Array.isArray(input) || !["list", "command", "file", "upload"].includes(String(input.action))) return reply({ error: "Choose a supported worksheet action." }, 400);
  } catch { return reply({ error: "The worksheet request is invalid." }, 400); }
  finally { reader.releaseLock(); }
  let body: Record<string, unknown>;
  if (input.action === "list") body = {};
  else if (input.action === "file") body = pick(input, ["worksheetId", "view", "position"]);
  else if (input.action === "command") body = pick(input, ["id", "worksheetId", "revision", "metadata"]);
  else if (input.kind === "begin") body = pick(input, ["kind", "worksheetId", "size", "mime", "sha256", "parts", "metadata"]);
  else if (input.kind === "put") body = pick(input, ["kind", "worksheetId", "position", "data"]);
  else if (input.kind === "complete") body = pick(input, ["kind", "worksheetId"]);
  else return reply({ error: "Choose a supported worksheet upload action." }, 400);
  try { return reply(await cloudApi(`/worksheets/${input.action}`, { method: "POST", body: JSON.stringify(body) })); }
  catch (error) { return reply({ error: error instanceof CloudApiError ? error.message : "The worksheet reply was lost. Retry the saved change or resume the original image." }, error instanceof CloudApiError ? error.status : 503); }
}

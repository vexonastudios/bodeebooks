import { auth } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";
export const maxDuration = 30;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
const fields: Record<string, string[]> = {
  create: ["manifest"], status: ["id"], put: ["id", "sha256", "data"], verify: ["id", "key"], complete: ["id"],
  browse: ["id"], records: ["id", "table", "part"], downloadPart: ["id", "sha256"], list: [], withdraw: ["id"],
  inspectActivation: ["id"], planActivation: ["id", "requestId", "mappings"], applyActivation: ["planId", "digest"], activationHistory: [], rollbackActivation: ["planId"],
  inspectTypingTransfer: ["id"], planTypingTransfer: ["id", "requestId", "sourceId"], applyTypingTransfer: ["planId", "digest"], typingTransferHistory: [], rollbackTypingTransfer: ["planId"],
  inspectDailyTransfer: ["id"], planDailyTransfer: ["id", "requestId", "sourceId"], applyDailyTransfer: ["planId", "digest"], dailyTransferHistory: [], rollbackDailyTransfer: ["planId"],
};
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Open the parent dashboard to transfer original records." }, 403);
  if (!(await auth()).isAuthenticated) return reply({ error: "Please sign in again." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ error: "Send a JSON transfer request." }, 415);
  const reader = request.body?.getReader(); if (!reader) return reply({ error: "Choose a transfer action." }, 400);
  let input: Record<string, unknown>;
  try {
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) { const item = await reader.read(); if (item.done) break; size += item.value.length; if (size > 3 * 1024 * 1024) { await reader.cancel(); return reply({ error: "The transfer part is too large." }, 413); } chunks.push(item.value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    input = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || typeof input.action !== "string" || !Object.hasOwn(fields, input.action) || !["create", "put"].includes(input.action) && size > 96000) return reply({ error: "Choose a supported transfer action." }, 400);
  } catch { return reply({ error: "The transfer request is invalid." }, 400); }
  finally { reader.releaseLock(); }
  const action = input.action as string;
  try { return reply(await cloudApi(`/legacy/${action}`, { method: "POST", body: JSON.stringify(Object.fromEntries(fields[action].map(key => [key, input[key]]))) })); }
  catch (error) { return reply({ error: error instanceof CloudApiError ? error.message : "The transfer reply was lost. Resume the same package to retain verified progress." }, error instanceof CloudApiError ? error.status : 503); }
}

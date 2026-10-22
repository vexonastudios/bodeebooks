import { auth } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Open this dashboard on BodeeBooks to import assessments." }, 403);
  if (!(await auth()).isAuthenticated) return reply({ error: "Please sign in again." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ error: "Send a JSON assessment summary." }, 415);
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: "Choose an assessment summary." }, 400);
  let input: Record<string, unknown>;
  try {
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) {
      const next = await reader.read(); if (next.done) break;
      length += next.value.length;
      if (length > 512 * 1024) { await reader.cancel(); return reply({ error: "Choose an assessment summary smaller than 512 KB." }, 413); }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    input = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || input.action !== "abeka-assessments-import" || input.confirmation !== true) return reply({ error: "Review and confirm an assessment summary before importing." }, 400);
  } catch { return reply({ error: "The assessment summary was invalid." }, 400); }
  finally { reader.releaseLock(); }
  try {
    return reply(await cloudApi("/abeka-assessments/import", { method: "POST", body: JSON.stringify({ id: input.id, studentId: input.studentId, snapshot: input.snapshot, confirmation: input.confirmation }) }));
  } catch (error) { return reply({ error: error instanceof CloudApiError ? error.message : "The import could not be confirmed. Keep the reviewed summary and retry." }, error instanceof CloudApiError ? error.status : 503); }
}

import { auth } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const result = (body: unknown, status = 200) => Response.json(body, { status, headers });
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') return result({ error: 'Open BodeeGuard to reply.' }, 403);
  const session = await auth();
  if (!session.isAuthenticated) return result({ error: 'Sign in to send this reply.' }, 401);
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return result({ error: 'Send a JSON reply.' }, 415);
  const reader = request.body?.getReader();
  if (!reader) return result({ error: 'A reply is required.' }, 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > 12000) { await reader.cancel(); return result({ error: 'Use a shorter reply.' }, 413); }
      chunks.push(part.value);
    }
  } catch { return result({ error: 'Could not read the reply.' }, 400); }
  finally { reader.releaseLock(); }
  let input;
  try { const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; } input = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { return result({ error: 'Invalid reply.' }, 400); }
  // The account in the notification is only a comparison; never an authority.
  if (!input || input.accountUserId !== session.userId) return result({ error: 'Sign in with the parent account that received this notification.' }, 409);
  if (typeof input.studentId !== 'string' || !uuid.test(input.studentId) || typeof input.id !== 'string' || !uuid.test(input.id) || typeof input.body !== 'string' || !input.body.trim() || input.body.length > 2000) return result({ error: 'Use a reply of 1–2,000 characters.' }, 400);
  try {
    const receipt = await cloudApi('/messages/send', { method: 'POST', body: JSON.stringify({ studentId: input.studentId, id: input.id, body: input.body.trim() }) }) as { saved?: boolean; id?: string; studentId?: string };
    if (receipt.saved !== true || receipt.id !== input.id || receipt.studentId !== input.studentId) return result({ error: 'Sending was not confirmed. Retry the same reply.' }, 503);
    return result({ saved: true, id: receipt.id, studentId: receipt.studentId });
  } catch (error) { return result({ error: error instanceof CloudApiError ? error.message : 'Sending was not confirmed. Retry the same reply.' }, error instanceof CloudApiError ? error.status : 503); }
}

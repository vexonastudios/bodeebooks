import { auth } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const response = (body: unknown, status = 200) => Response.json(body, { status, headers });
function failure(error: unknown) {
  return response({ error: error instanceof CloudApiError ? error.message : "The cloud service could not be reached. Your current installation is unchanged." }, error instanceof CloudApiError ? error.status : 503);
}
export async function GET() {
  if (!(await auth()).isAuthenticated) return response({ error: "Please sign in again." }, 401);
  try { return response(await cloudApi()); } catch (error) { return failure(error); }
}
async function readBoundedJson(request: Request, maximum = 96000): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_json");
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.length;
      if (total > maximum) { await reader.cancel(); throw new Error("body_too_large"); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const value = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_json");
  return value;
}
export async function POST(request: Request) {
  return handleDashboardPost(request);
}
async function handleDashboardPost(request: Request, uploadOnly = false) {
  // Cookie-authenticated mutations must originate from this website. Never
  // accept submitted paths, household IDs, tokens, or LAN keys as authority.
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return response({ error: "Open this dashboard on BodeeBooks to make changes." }, 403);
  if (!(await auth()).isAuthenticated) return response({ error: "Please sign in again." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return response({ error: "Send a JSON dashboard request." }, 415);
  let input: Record<string, unknown>;
  try { input = await readBoundedJson(request, uploadOnly ? 3 * 1024 * 1024 : 96000); }
  catch (error) { return response({ error: "The dashboard request is invalid or too large." }, error instanceof Error && error.message === "body_too_large" ? 413 : 400); }
  let path: string;
  let method: string;
  let body: unknown;
  if (uploadOnly !== (input.action === "upload-file")) return response({ error: "Use the designated file upload endpoint." }, 400);
  switch (input.action) {
    case "assistant-welcome": path = "/assistant/welcome"; method = "POST"; body = {}; break;
    case "assistant-ask": path = "/assistant/ask"; method = "POST"; body = { prompt: input.prompt, requestId: input.requestId, ai: input.ai, history: input.history, topicId: input.topicId, contextTab: input.contextTab }; break;
    case "list-learning-videos": path = "/learning-videos/list"; method = "POST"; body = {}; break;
    case "save-learning-video": path = "/learning-videos/save"; method = "POST"; body = { id: input.id, revision: input.revision, url: input.url, title: input.title, folder: input.folder, order: input.order, active: input.active, approved: input.approved }; break;
    case "game-room": path = "/games/room"; method = "POST"; body = {}; break;
    case "game-settings": path = "/games/settings"; method = "POST"; body = { studentId: input.studentId, revision: input.revision, settings: input.settings }; break;
    case "game-action": path = "/games/action"; method = "POST"; body = { id: input.id, action: input.gameAction, matchId: input.matchId, revision: input.revision }; break;
    case "upload-file": path = "/files/upload"; method = "POST"; body = { id: input.id, studentId: input.studentId, name: input.name, mime: input.mime, purpose: input.purpose, data: input.data }; break;
    case "list-files": path = "/files/list"; method = "POST"; body = { studentId: input.studentId }; break;
    case "read-file": path = "/files/read"; method = "POST"; body = { id: input.id }; break;
    case "remove-file": path = "/files/remove"; method = "POST"; body = { id: input.id }; break;
    case "review-file": path = "/files/review"; method = "POST"; body = { id: input.id, rotation: input.rotation, reviewed: input.reviewed, gradeId: input.gradeId }; break;
    case "list-grades":
    case "school-report": {
      path = input.action === "list-grades" ? "/grades/list" : "/reports/school-time";
      method = "POST";
      body = { studentId: input.studentId, subjectId: input.subjectId, start: input.start, end: input.end, before: input.before };
      break;
    }
    case "save-grade": {
      path = "/grades/save"; method = "POST";
      body = { id: input.id, revision: input.revision, studentId: input.studentId, title: input.title, course: input.course,
        date: input.date, category: input.category, scoreEarned: input.scoreEarned, scorePossible: input.scorePossible,
        childFeedback: input.childFeedback, parentNotes: input.parentNotes };
      break;
    }
    case "remove-grade": path = "/grades/remove"; method = "POST"; body = { id: input.id, revision: input.revision }; break;
    case "archive-student": {
      if (typeof input.studentId !== "string" || !uuid.test(input.studentId) || typeof input.archived !== "boolean") return response({ error: "Choose a child and archive or restore." }, 400);
      path = `/students/${input.studentId}/archive`; method = "POST"; body = { archived: input.archived }; break;
    }
    case "list-messages":
    case "send-message": {
      if (typeof input.studentId !== "string" || !uuid.test(input.studentId)) return response({ error: "Choose a child from your family." }, 400);
      path = input.action === "send-message" ? "/messages/send" : "/messages/list";
      method = "POST";
      body = input.action === "send-message" ? { studentId: input.studentId, id: input.id, body: input.body, fileId: input.fileId }
        : { studentId: input.studentId, before: input.before, receivedIds: input.receivedIds, version: input.version };
      break;
    }
    case "add-student": path = "/students"; method = "POST"; body = { name: input.name, grade: input.grade }; break;
    case "edit-student": {
      if (typeof input.studentId !== "string" || !uuid.test(input.studentId)) return response({ error: "Choose a child from your family." }, 400);
      path = `/students/${input.studentId}`; method = "PATCH"; body = { name: input.name, grade: input.grade };
      break;
    }
    case "save-subjects": path = "/school-rules"; method = "PUT"; body = { subjects: input.subjects, schedule: input.schedule, revision: input.revision }; break;
    case "assign-student":
    case "set-school-pause":
    case "create-recovery": {
      if (typeof input.deviceId !== "string" || !uuid.test(input.deviceId)) return response({ error: "Choose a computer from your family." }, 400);
      path = `/devices/${input.deviceId}`;
      method = "PATCH";
      if (input.action === "create-recovery") { path += "/recovery"; method = "POST"; body = {}; }
      else if (input.action === "assign-student") body = { studentId: input.studentId };
      else {
        if (typeof input.locked !== "boolean") return response({ error: "Choose pause or resume." }, 400);
        body = { locked: input.locked };
      }
      break;
    }
    default: return response({ error: "That dashboard feature is not connected to cloud yet." }, 400);
  }
  try { return response(await cloudApi(path, { method, body: JSON.stringify(body) })); }
  catch (error) { return failure(error); }
}

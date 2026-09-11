import "server-only";
import { auth } from "@clerk/nextjs/server";

export type CloudStudent = { id: string; name: string; grade: string; photo_version?: string | null };
export type CloudSubject = { id: string; title: string; url: string };
export type CloudDevice = {
  id: string; computer_name: string; app_version: string; student_id: string | null;
  locked: boolean; revision: number; acknowledged_revision: number;
  last_seen_at: string | null; current_subject: string;
  recovery_configured?: boolean;
};
export type CloudDashboard = {
  students: CloudStudent[]; devices: CloudDevice[];
  rules: { revision: number; subjects: CloudSubject[] }; serverTime: string;
  activity?: { student_id: string; subject_id: string; date_utc: string; seconds: number }[];
};

export class CloudApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function cloudApi<T>(path = "", init: RequestInit = {}): Promise<T> {
  const session = await auth();
  if (!session.isAuthenticated) throw new CloudApiError("Please sign in to your parent account.", 401);
  const apiBase = process.env.BODEEGUARD_COMMERCIAL_API_URL?.replace(/\/$/, "");
  if (!apiBase) throw new Error("The BodeeGuard account service is not configured.");
  const apiUrl = new URL(apiBase);
  if (apiUrl.protocol !== "https:" || apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) {
    throw new Error("The BodeeGuard account service must use a secure HTTPS address.");
  }
  const token = await session.getToken();
  if (!token) throw new CloudApiError("Please sign in again to continue.", 401);
  const response = await fetch(`${apiBase}/v1/account/dashboard${path}`, {
    ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(path === "/screenshots/request" || path === "/screenshots/overview" ? 10000 : path === "/media" || path.startsWith("/setup/") || path.startsWith("/coloring-studio/") || path.startsWith("/screenshots/") || path.startsWith("/files/") || path.startsWith("/assistant/") || path.startsWith("/legacy/") || path.startsWith("/science-spelling/") || path.startsWith("/poems/") || path.startsWith("/worksheets/") || path === "/spelling/scan" ? 180000 : 10000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new CloudApiError(response.status < 500 && typeof payload.error === "string"
    ? payload.error.slice(0, 600) : "BodeeGuard is temporarily unavailable. Please try again shortly.", response.status);
  return payload as T;
}

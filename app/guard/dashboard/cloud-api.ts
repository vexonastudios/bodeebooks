import "server-only";
import { auth } from "@clerk/nextjs/server";

export type CloudStudent = { id: string; name: string; grade: string };
export type CloudSubject = { id: string; title: string; url: string };
export type CloudDevice = {
  id: string; computer_name: string; app_version: string; student_id: string | null;
  locked: boolean; revision: number; acknowledged_revision: number;
  last_seen_at: string | null; current_subject: string;
};
export type CloudDashboard = {
  students: CloudStudent[]; devices: CloudDevice[];
  rules: { revision: number; subjects: CloudSubject[] }; serverTime: string;
};

export async function cloudApi<T>(path = "", init: RequestInit = {}): Promise<T> {
  const session = await auth();
  if (!session.isAuthenticated) throw new Error("Please sign in to your parent account.");
  const apiBase = process.env.BODEEGUARD_COMMERCIAL_API_URL?.replace(/\/$/, "");
  if (!apiBase) throw new Error("The BodeeGuard account service is not configured.");
  const token = await session.getToken();
  if (!token) throw new Error("Please sign in again to continue.");
  const response = await fetch(`${apiBase}/v1/account/dashboard${path}`, {
    ...init, cache: "no-store", signal: AbortSignal.timeout(10000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The cloud dashboard could not be reached. Your current installation is unchanged.");
  return payload as T;
}

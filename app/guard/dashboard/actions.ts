"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cloudApi } from "./cloud-api";

async function mutate(path: string, method: string, body: unknown) {
  try { await cloudApi(path, { method, body: JSON.stringify(body) }); }
  catch (error) {
    redirect(`/guard/dashboard?error=${encodeURIComponent(error instanceof Error ? error.message : "That change could not be saved.")}`);
  }
  revalidatePath("/guard/dashboard");
  redirect("/guard/dashboard?saved=1");
}

export async function addCloudStudent(form: FormData) {
  await mutate("/students", "POST", { name: form.get("name"), grade: form.get("grade") });
}

export async function assignCloudStudent(form: FormData) {
  await mutate(`/devices/${encodeURIComponent(String(form.get("deviceId") || ""))}`, "PATCH", { studentId: form.get("studentId") || null });
}

export async function setCloudComputerLock(form: FormData) {
  await mutate(`/devices/${encodeURIComponent(String(form.get("deviceId") || ""))}`, "PATCH", { locked: form.get("locked") === "true" });
}

export async function createCloudRecoveryCode(deviceId: string, password: string): Promise<{ saved?: boolean; revision?: number; error?: string }> {
  if (typeof deviceId !== "string" || !deviceId || deviceId.length > 128) return { error: "Choose a computer from your family." };
  try {
    // cloudApi verifies the Clerk session; the API checks household ownership.
    // Password is sent only in the authenticated HTTPS body, never a URL/log.
    return await cloudApi<{ saved: boolean; revision: number }>("/parent-password", { method: "POST", body: JSON.stringify({ password }) });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The parent password could not be saved." };
  }
}

export async function saveCloudSubjects(form: FormData) {
  const ids = form.getAll("subjectId");
  const titles = form.getAll("subjectTitle");
  const urls = form.getAll("subjectUrl");
  const subjects = ids.map((id, index) => ({ id, title: titles[index], url: urls[index] }));
  const title = String(form.get("newTitle") || "").trim();
  const url = String(form.get("newUrl") || "").trim();
  if (title || url) subjects.push({ id: crypto.randomUUID(), title, url });
  const removed = new Set(form.getAll("removeSubject"));
  await mutate("/school-rules", "PUT", { revision: Number(form.get("revision")), subjects: subjects.filter(subject => !removed.has(subject.id)) });
}

"use server";

import { auth } from "@clerk/nextjs/server";

export type ActivationState = { status: "idle" | "error" | "success"; message: string };

export async function approveComputer(_state: ActivationState, formData: FormData): Promise<ActivationState> {
  const session = await auth();
  if (!session.isAuthenticated) return { status: "error", message: "Please sign in before approving a computer." };

  const userCode = String(formData.get("userCode") || "").trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{3,19}$/.test(userCode)) {
    return { status: "error", message: "Enter the pairing code exactly as BodeeGuard displays it." };
  }

  const apiBase = process.env.BODEEGUARD_COMMERCIAL_API_URL?.replace(/\/$/, "");
  if (!apiBase) {
    return { status: "error", message: "Computer activation is not online yet. Your account is ready; the secure activation service is the next deployment step." };
  }

  try {
    const token = await session.getToken();
    if (!token) return { status: "error", message: "Your secure session could not be verified. Please sign in again." };
    const response = await fetch(`${apiBase}/v1/account/device-activations/${encodeURIComponent(userCode)}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return { status: "error", message: payload.error || "BodeeGuard could not approve that computer." };
    return { status: "success", message: "Computer approved. BodeeGuard will finish connecting it automatically." };
  } catch {
    return { status: "error", message: "The BodeeGuard activation service could not be reached. Please try again." };
  }
}

"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export type ActivationState = { status: "idle" | "error" | "success"; message: string };

type ApiErrorPayload = { error?: string };
type AccountApiResult = { error: string } | { payload: ApiErrorPayload & { started?: boolean; trialEndsAt?: string; url?: string } };

async function callAccountApi(path: string, init: RequestInit = {}): Promise<AccountApiResult> {
  const session = await auth();
  if (!session.isAuthenticated) return { error: "Please sign in to continue." } as const;
  const apiBase = process.env.BODEEGUARD_COMMERCIAL_API_URL?.replace(/\/$/, "");
  if (!apiBase) return { error: "The BodeeGuard account service is not online yet." } as const;

  try {
    const token = await session.getToken();
    if (!token) return { error: "Your secure session could not be verified. Please sign in again." } as const;
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload & { url?: string };
    if (!response.ok) return { error: payload.error || "BodeeGuard could not complete that request." } as const;
    return { payload } as const;
  } catch {
    return { error: "The BodeeGuard account service could not be reached. Please try again." } as const;
  }
}

function accountNotice(message: string) {
  return `/guard/account?billingError=${encodeURIComponent(message)}`;
}

export async function startBodeeGuardTrial() {
  if (process.env.BODEEGUARD_CUSTOMER_LAUNCH_OPEN !== "true") {
    redirect(accountNotice("BodeeGuard trials are not open yet. Your parent account remains free, and no payment information has been collected."));
  }
  const result = await callAccountApi("/v1/account/trial", { method: "POST", body: "{}" });
  if ("error" in result) redirect(accountNotice(result.error));
  if (!result.payload.started) redirect(accountNotice("BodeeGuard did not confirm that the free trial started."));
  redirect("/guard/account?trial=started");
}

export async function subscribeToBodeeGuard() {
  if (process.env.BODEEGUARD_CUSTOMER_LAUNCH_OPEN !== "true") {
    redirect(accountNotice("BodeeGuard subscriptions are not open yet. No payment information has been collected."));
  }
  const result = await callAccountApi("/v1/account/checkout", { method: "POST", body: "{}" });
  if ("error" in result) redirect(accountNotice(result.error));
  if (!result.payload.url) redirect(accountNotice("Stripe did not return a secure checkout page."));
  redirect(result.payload.url);
}

export async function openBodeeGuardBilling() {
  const result = await callAccountApi("/v1/account/billing-portal", { method: "POST", body: "{}" });
  if ("error" in result) redirect(accountNotice(result.error));
  if (!result.payload.url) redirect(accountNotice("Stripe did not return a billing-management page."));
  redirect(result.payload.url);
}

export async function scheduleBodeeGuardCancellation() {
  const result = await callAccountApi("/v1/account/subscription/cancel", { method: "POST", body: "{}" });
  if ("error" in result) redirect(accountNotice(result.error));
  redirect("/guard/account?subscription=canceled");
}

export async function resumeBodeeGuardSubscription() {
  const result = await callAccountApi("/v1/account/subscription/resume", { method: "POST", body: "{}" });
  if ("error" in result) redirect(accountNotice(result.error));
  redirect("/guard/account?subscription=resumed");
}

export async function removeBodeeGuardComputer(formData: FormData) {
  const deviceId = String(formData.get("deviceId") || "").trim();
  if (!deviceId) redirect(accountNotice("That computer could not be identified."));
  const result = await callAccountApi(`/v1/account/devices/${encodeURIComponent(deviceId)}`, { method: "DELETE" });
  if ("error" in result) redirect(accountNotice(result.error));
  redirect("/guard/account?computerRemoved=1");
}

export async function approveComputer(_state: ActivationState, formData: FormData): Promise<ActivationState> {
  const session = await auth();
  if (!session.isAuthenticated) return { status: "error", message: "Please sign in before approving a computer." };

  const userCode = String(formData.get("userCode") || "").trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{3,19}$/.test(userCode)) {
    return { status: "error", message: "Enter the pairing code exactly as BodeeGuard displays it." };
  }

  const result = await callAccountApi(`/v1/account/device-activations/${encodeURIComponent(userCode)}/approve`, {
    method: "POST",
    body: "{}",
  });
  if ("error" in result) return { status: "error", message: result.error };
  return { status: "success", message: "Computer approved. BodeeGuard will finish connecting it automatically." };
}

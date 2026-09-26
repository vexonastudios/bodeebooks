// Only supported dashboard destinations survive sign-in and the inner workspace handoff.
export type DashboardQuery = { setup?: string | string[]; conversation?: string | string[] };
export function dashboardQuery({ setup, conversation }: DashboardQuery = {}) {
  const query = new URLSearchParams();
  if (setup === "1" || setup === "connect") query.set("setup", setup);
  if (typeof conversation === "string" && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(conversation)) query.set("conversation", conversation);
  return query.size ? "?" + query.toString() : "";
}

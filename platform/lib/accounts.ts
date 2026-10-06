"use client";

import { LIVE, sb } from "./supabase";
import { uid } from "./store";

// Account actions the coach takes. In demo mode they only touch local data (the
// caller still writes the client record); live they go through /api/accounts,
// which uses the Supabase service key on the server.

async function call(body: Record<string, string>) {
  const { data } = await (await sb()).auth.getSession();
  const res = await fetch("/api/accounts", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as { id?: string };
}

/** the server's reason in words the coach can act on */
export function accountError(e: unknown, t: (k: "accountFailed" | "keyMissing" | "notCoach") => string) {
  const m = e instanceof Error ? e.message : String(e);
  if (m === "not configured") return t("keyMissing");
  if (m === "forbidden" || m === "unauthorized") return t("notCoach");
  return `${t("accountFailed")}: ${m}`;
}

/** returns the new client's id (the auth user id when live) */
export async function createAccount(phone: string, password: string) {
  if (!LIVE) return uid("c");
  return (await call({ action: "create", phone, password })).id!;
}

export async function setAccountPassword(id: string, password: string) {
  if (LIVE) await call({ action: "password", id, password });
}

export async function deleteAccount(id: string) {
  if (LIVE) await call({ action: "delete", id });
}

/** the trainee changing their own password */
export async function changeOwnPassword(password: string) {
  if (!LIVE) return;
  const { error } = await (await sb()).auth.updateUser({ password });
  if (error) throw error;
}

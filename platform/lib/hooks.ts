"use client";

import { useStore } from "./store";
import { daysLeft } from "./calc";
import type { DB, ID } from "./types";

export function useMe() {
  const { db, session } = useStore();
  const id = session?.role === "client" ? session.clientId : undefined;
  return db.clients.find((c) => c.id === id);
}

export type Notice = { kind: "sub" | "form" | "msg"; n: number; href: string };

/** things waiting on the client, used by the bell and the home "action needed" list */
export function clientNotices(db: DB, clientId: ID): Notice[] {
  const c = db.clients.find((x) => x.id === clientId);
  if (!c) return [];
  const out: Notice[] = [];
  const left = daysLeft(c.subEnd);
  if (left <= 7) out.push({ kind: "sub", n: left, href: "/app" });
  const forms = db.assignments.filter((a) => a.clientId === clientId && a.status === "pending").length;
  if (forms) out.push({ kind: "form", n: forms, href: "/app/forms" });
  const msgs = db.messages.filter((m) => m.clientId === clientId && m.from === "coach" && !m.read).length;
  if (msgs) out.push({ kind: "msg", n: msgs, href: "/app/messages" });
  return out;
}

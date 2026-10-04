import type { DB, ID } from "./types";
import { daysLeft } from "./calc";

// Notifications are worked out from the data (nothing stored), so the bell, the
// dashboard and the daily phone push all agree. `key` changes when the reason
// changes, which lets the bell mark what the person has already seen.

export type Notice = { key: string; kind: "sub" | "form" | "workout" | "weigh" | "plan"; n: number; href: string };
export type CoachNotice = { key: string; kind: "waiting" | "expiring" | "photos" | "form"; clientId: ID; n: number };

const DAY = 864e5;
const ago = (iso: string, now: number) => (now - new Date(iso).getTime()) / DAY;

export function traineeNotices(db: DB, clientId: ID, now = Date.now()): Notice[] {
  const c = db.clients.find((x) => x.id === clientId);
  if (!c) return [];
  const today = new Date(now).toISOString().slice(0, 10);
  const out: Notice[] = [];
  const left = daysLeft(c.subEnd);
  if (left <= 7) out.push({ key: `sub:${c.subEnd}:${left <= 3 ? 3 : 7}`, kind: "sub", n: left, href: "/app" });
  const forms = db.assignments.filter((a) => a.clientId === clientId && a.status === "pending").length;
  if (forms) out.push({ key: `form:${forms}`, kind: "form", n: forms, href: "/app/forms" });
  if (!c.active || left < 0) return out;
  if (c.planAt && ago(c.planAt, now) < 3) out.push({ key: `plan:${c.planAt}`, kind: "plan", n: 0, href: "/app/training" });
  if (c.trainingPlanId && !db.logs.some((l) => l.clientId === clientId && l.date.slice(0, 10) === today)) out.push({ key: `workout:${today}`, kind: "workout", n: 0, href: "/app/training" });
  const lastW = db.measurements.filter((m) => m.clientId === clientId).map((m) => m.date).sort().at(-1);
  if (!lastW || ago(lastW, now) >= 7) out.push({ key: `weigh:${lastW ?? "none"}`, kind: "weigh", n: 0, href: "/app" });
  return out;
}

export function coachNotices(db: DB, now = Date.now()): CoachNotice[] {
  const out: CoachNotice[] = [];
  for (const c of db.clients.filter((x) => !x.pending && x.active)) {
    const left = daysLeft(c.subEnd);
    if (left <= 3) out.push({ key: `exp:${c.id}:${c.subEnd}`, kind: "expiring", clientId: c.id, n: left });
    const starter = db.assignments.find((a) => a.clientId === c.id && a.status === "submitted" && a.submittedAt && db.forms.find((f) => f.id === a.formId)?.starter);
    if (starter && (!c.trainingPlanId || !c.nutritionPlanId)) {
      const d = Math.floor(ago(starter.submittedAt!, now));
      out.push(d >= 5 ? { key: `wait:${c.id}:late`, kind: "waiting", clientId: c.id, n: d } : { key: `form:${starter.id}`, kind: "form", clientId: c.id, n: d });
    }
    const pics = (db.photos ?? []).filter((p) => p.clientId === c.id && ago(p.date, now) < 2);
    if (pics.length) out.push({ key: `pics:${c.id}:${pics.map((p) => p.date).sort().at(-1)}`, kind: "photos", clientId: c.id, n: pics.length });
  }
  return out;
}

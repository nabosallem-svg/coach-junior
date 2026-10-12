"use client";

import type { DB, ID } from "./types";
import { sb } from "./supabase";

// Live storage: every record is one row in public.docs (coll, id, client_id, data).
// The app keeps working on the same DB object; after each change we upsert the rows
// that changed and delete the ones that disappeared. RLS decides who sees what.

type Coll = Exclude<keyof DB, "eaten">;
const COLLS: Coll[] = ["clients", "photos", "measurements", "exercises", "trainingPlans", "logs", "foods", "nutritionPlans", "swaps", "forms", "assignments", "messages"];

type Row = { coll: string; id: string; client_id: string | null; data: unknown };

export const emptyDB = (): DB => ({ clients: [], photos: [], measurements: [], exercises: [], trainingPlans: [], logs: [], foods: [], nutritionPlans: [], swaps: [], forms: [], assignments: [], messages: [], eaten: [] });

/** all rows for a DB, keyed `coll/id`; passwords never leave the browser */
function rows(db: DB, me?: ID): Map<string, Row> {
  const out = new Map<string, Row>();
  const put = (coll: string, id: string, client_id: string | null, data: unknown) => out.set(`${coll}/${id}`, { coll, id, client_id, data });
  for (const coll of COLLS) {
    for (const item of (db[coll] ?? []) as Record<string, unknown>[]) {
      if (coll === "clients") {
        const { password: _pw, ...rest } = item;
        put(coll, item.id as string, item.id as string, rest);
      } else if (coll === "swaps") put(coll, `${item.clientId}:${item.itemId}`, item.clientId as string, item);
      else put(coll, item.id as string, (item.clientId as string) ?? null, item);
    }
  }
  if (me) for (const e of db.eaten) put("eaten", `${me}|${e}`, me, e);
  return out;
}

const DAY = 864e5;
/** how much workout history the coach loads; the trainee always gets all of their own */
export const COACH_LOG_DAYS = 120;

/** pages of 1000 rows, fetched a few at a time instead of one after another */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readAll(where: (q: any) => any, into: Record<string, unknown[]>) {
  const c = await sb();
  const { count, error } = await where(c.from("docs").select("coll", { count: "exact", head: true }));
  if (error) throw error;
  const pages = Math.ceil((count ?? 0) / 1000);
  for (let p = 0; p < pages; p += 6) {
    const batch = await Promise.all(Array.from({ length: Math.min(6, pages - p) }, (_, i) => where(c.from("docs").select("coll,data")).order("coll").order("id").range((p + i) * 1000, (p + i) * 1000 + 999)));
    for (const { data, error } of batch) {
      if (error) throw error;
      for (const r of data as { coll: string; data: unknown }[]) (into[r.coll] ??= []).push(r.data);
    }
  }
}

/**
 * Coach: everything except ticked meals (only the trainee uses them) and workout logs older
 * than COACH_LOG_DAYS, so the dashboard stays the same size however long the coach has run.
 * Trainee: their own rows (RLS), with ticked meals from the last two days only; older ones
 * are deleted so the table does not grow by ~15 rows per trainee per day forever.
 */
export async function loadDB(me?: ID): Promise<DB> {
  const db = emptyDB() as unknown as Record<string, unknown[]>;
  if (!me) {
    const since = new Date(Date.now() - COACH_LOG_DAYS * DAY).toISOString();
    await readAll((q) => q.not("coll", "in", "(eaten,logs)"), db);
    await readAll((q) => q.eq("coll", "logs").gte("updated_at", since), db);
  } else {
    await readAll((q) => q.neq("coll", "eaten"), db);
    const day = (n: number) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
    await readAll((q) => q.eq("coll", "eaten").eq("client_id", me).gte("id", `${me}|${day(2)}`), db);
    (await sb()).from("docs").delete().eq("coll", "eaten").eq("client_id", me).lt("id", `${me}|${day(7)}`).then(() => {}, () => {});
  }
  return db as unknown as DB;
}

export async function saveDiff(prev: DB, next: DB, me?: ID) {
  const a = rows(prev, me), b = rows(next, me);
  const up: Row[] = [];
  for (const [k, r] of b) if (JSON.stringify(a.get(k)?.data) !== JSON.stringify(r.data)) up.push(r);
  const gone = [...a.keys()].filter((k) => !b.has(k)).map((k) => a.get(k)!);
  if (up.length) {
    const { error } = await (await sb()).from("docs").upsert(up);
    if (error) throw error;
  }
  for (const r of gone) {
    const { error } = await (await sb()).from("docs").delete().eq("coll", r.coll).eq("id", r.id);
    if (error) throw error;
  }
}

/** first coach login on an empty project: copy the starter library (foods, exercises, plan templates) */
export async function seedIfEmpty(seed: DB) {
  const { count, error } = await (await sb()).from("docs").select("id", { count: "exact", head: true });
  if (error || count !== 0) return false;   // on any doubt do nothing: re-seeding would overwrite the coach's own exercises and videos
  const lib: DB = { ...emptyDB(), foods: seed.foods, exercises: seed.exercises.map(({ videoKey: _v, ...e }) => e), trainingPlans: seed.trainingPlans.filter((p) => !p.ownerId), nutritionPlans: seed.nutritionPlans.filter((p) => !p.ownerId), forms: seed.forms };
  await saveDiff(emptyDB(), lib);
  return true;
}

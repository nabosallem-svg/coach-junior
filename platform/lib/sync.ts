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

export async function loadDB(): Promise<DB> {
  const db = emptyDB() as unknown as Record<string, unknown[]>;
  // page through in case the coach has many rows
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb().from("docs").select("coll,data").range(from, from + 999);
    if (error) throw error;
    for (const r of data) (db[r.coll] ??= []).push(r.data);
    if (data.length < 1000) break;
  }
  return db as unknown as DB;
}

export async function saveDiff(prev: DB, next: DB, me?: ID) {
  const a = rows(prev, me), b = rows(next, me);
  const up: Row[] = [];
  for (const [k, r] of b) if (JSON.stringify(a.get(k)?.data) !== JSON.stringify(r.data)) up.push(r);
  const gone = [...a.keys()].filter((k) => !b.has(k)).map((k) => a.get(k)!);
  if (up.length) {
    const { error } = await sb().from("docs").upsert(up);
    if (error) throw error;
  }
  for (const r of gone) {
    const { error } = await sb().from("docs").delete().eq("coll", r.coll).eq("id", r.id);
    if (error) throw error;
  }
}

/** first coach login on an empty project: copy the starter library (foods, exercises, plan templates) */
export async function seedIfEmpty(seed: DB) {
  const { count } = await sb().from("docs").select("id", { count: "exact", head: true });
  if (count) return false;
  const lib: DB = { ...emptyDB(), foods: seed.foods, exercises: seed.exercises.map(({ videoKey: _v, ...e }) => e), trainingPlans: seed.trainingPlans.filter((p) => !p.ownerId), nutritionPlans: seed.nutritionPlans.filter((p) => !p.ownerId), forms: seed.forms };
  await saveDiff(emptyDB(), lib);
  return true;
}

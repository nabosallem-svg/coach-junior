import type { DB } from "./types";
import { uid } from "./store";

export type PlanKind = "training" | "nutrition";

/** Give a client their own editable copy of their current plan (no-op if it already is theirs). Returns the plan id. */
export function personalize(d: DB, clientId: string, kind: PlanKind, newId = uid(kind === "training" ? "tp" : "np")): string | undefined {
  const c = d.clients.find((x) => x.id === clientId);
  if (!c) return;
  const first = c.name.split(" ")[0];
  if (kind === "training") {
    const p = d.trainingPlans.find((x) => x.id === c.trainingPlanId);
    if (!p) return;
    if (p.ownerId === clientId) return p.id;
    const copy = { ...structuredClone(p), id: newId, name: `${p.name} - ${first}`, ownerId: clientId };
    d.trainingPlans.push(copy);
    c.trainingPlanId = copy.id;
    return copy.id;
  }
  const p = d.nutritionPlans.find((x) => x.id === c.nutritionPlanId);
  if (!p) return;
  if (p.ownerId === clientId) return p.id;
  const copy = { ...structuredClone(p), id: newId, name: `${p.name} - ${first}`, ownerId: clientId };
  d.nutritionPlans.push(copy);
  c.nutritionPlanId = copy.id;
  return copy.id;
}

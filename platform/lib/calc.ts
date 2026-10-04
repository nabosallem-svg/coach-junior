import type { DB, Food, Meal, MealItem, ID, WorkoutLog } from "./types";

export type Macros = { kcal: number; c: number; f: number; p: number };
const zero = (): Macros => ({ kcal: 0, c: 0, f: 0, p: 0 });

export function itemMacros(food: Food, qty: number): Macros {
  const k = qty / food.per;
  return { kcal: food.kcal * k, c: food.c * k, f: food.f * k, p: food.p * k };
}

export function add(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal + b.kcal, c: a.c + b.c, f: a.f + b.f, p: a.p + b.p };
}

/** the item as the client should eat it, after any swap they made */
export function effectiveItem(db: DB, clientId: ID | undefined, item: MealItem): { food: Food; qty: number; swapped: boolean } {
  const swap = clientId ? db.swaps.find((s) => s.clientId === clientId && s.itemId === item.id) : undefined;
  const foodId = swap?.foodId ?? item.foodId;
  const food = db.foods.find((f) => f.id === foodId)!;
  return { food, qty: swap?.qty ?? item.qty, swapped: !!swap };
}

export function mealMacros(db: DB, meal: Meal, clientId?: ID): Macros {
  return meal.items.reduce((acc, it) => {
    const { food, qty } = effectiveItem(db, clientId, it);
    return food ? add(acc, itemMacros(food, qty)) : acc;
  }, zero());
}

export function planMacros(db: DB, meals: Meal[], clientId?: ID): Macros {
  return meals.reduce((acc, m) => add(acc, mealMacros(db, m, clientId)), zero());
}

/** same-group foods with the quantity that matches the original calories */
export function swapOptions(db: DB, food: Food, qty: number) {
  const kcal = itemMacros(food, qty).kcal;
  return db.foods
    .filter((f) => f.group === food.group && f.id !== food.id)
    .map((f) => {
      const raw = (kcal / f.kcal) * f.per;
      const q = f.unit === "piece" || f.unit === "scoop" ? Math.max(0.5, Math.round(raw * 2) / 2) : Math.max(5, Math.round(raw / 5) * 5);
      return { food: f, qty: q, macros: itemMacros(f, q) };
    });
}

export const r0 = (n: number) => Math.round(n);

export function daysLeft(isoDate: string) {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000);
}

export function fmtDate(iso: string, lang: "ar" | "en", opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", opts);
}

export function fmtTime(iso: string, lang: "ar" | "en") {
  return new Date(iso).toLocaleTimeString(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { hour: "numeric", minute: "2-digit" });
}

export const unitLabel = (u: Food["unit"], lang: "ar" | "en") =>
  lang === "ar" ? { g: "جم", piece: "حبة", ml: "مل", scoop: "سكوب" }[u] : { g: "g", piece: "pc", ml: "ml", scoop: "scoop" }[u];

/** the last logged sets for a plan exercise, for the PREV column */
export function prevSets(logs: WorkoutLog[], peId: string) {
  return logs.filter((l) => l.sets[peId]?.some((s) => s.done)).sort((a, b) => b.date.localeCompare(a.date))[0]?.sets[peId];
}

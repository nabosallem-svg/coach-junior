"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { itemMacros, mealMacros, planMacros, unitLabel } from "@/lib/calc";
import { BuilderHeader } from "@/components/BuilderHeader";
import { MacroRing } from "@/components/charts";
import { MacroLine } from "@/components/MacroLine";
import { Sheet } from "@/components/ui";
import type { NutritionPlan } from "@/lib/types";

function NutritionBuilder() {
  const id = useSearchParams().get("id") ?? "";
  const { db, update } = useStore();
  const { t, lang } = useI18n();
  const plan = db.nutritionPlans.find((p) => p.id === id);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [q, setQ] = useState("");
  if (!plan) return null;

  const edit = (fn: (p: NutritionPlan) => void) => update((d) => fn(d.nutritionPlans.find((p) => p.id === id)!));
  const total = planMacros(db, plan.meals);
  const name = (f: { nameAr: string; nameEn: string }) => (lang === "ar" ? f.nameAr : f.nameEn);

  return (
    <div>
      <BuilderHeader backTab="nutrition" label={t("planName")} value={plan.name} onChange={(v) => edit((p) => { p.name = v; })} onDelete={() => update((d) => {
        d.nutritionPlans = d.nutritionPlans.filter((p) => p.id !== id);
        d.clients.forEach((c) => { if (c.nutritionPlanId === id) c.nutritionPlanId = undefined; });
      })} />
      {plan.ownerId ? (
        <p className="mt-2 inline-flex rounded-full border border-line-gold bg-gold-soft px-3 py-1 text-sm font-bold text-gold">{t("personalFor", { name: db.clients.find((c) => c.id === plan.ownerId)?.name ?? "" })}</p>
      ) : (
        <p className="mt-2 text-sm text-muted">{t("templateNote", { n: db.clients.filter((c) => c.nutritionPlanId === id).length })}</p>
      )}

      <div className="card mt-5 flex items-center gap-5 p-4">
        <MacroRing {...total} label={t("kcal")} />
        <div className="grid flex-1 grid-cols-3 gap-2 text-center">
          <div><p className="num whitespace-nowrap text-2xl font-black text-carbs">{Math.round(total.c)}<span className="text-base font-medium text-muted"> {t("gram")}</span></p><p className="text-sm text-muted">{t("carbs")}</p></div>
          <div><p className="num whitespace-nowrap text-2xl font-black text-fat">{Math.round(total.f)}<span className="text-base font-medium text-muted"> {t("gram")}</span></p><p className="text-sm text-muted">{t("fat")}</p></div>
          <div><p className="num whitespace-nowrap text-2xl font-black text-protein">{Math.round(total.p)}<span className="text-base font-medium text-muted"> {t("gram")}</span></p><p className="text-sm text-muted">{t("protein")}</p></div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {plan.meals.map((meal, mi) => {
          const mm = mealMacros(db, meal);
          return (
            <section key={meal.id} className="card p-4">
              <div className="flex items-center gap-2">
                <input aria-label={t("mealName")} className="input font-bold" dir="auto" value={meal.name} onChange={(e) => edit((p) => { p.meals[mi].name = e.target.value; })} />
                <button aria-label={t("delete")} onClick={() => { if (confirm(t("confirmDelete"))) edit((p) => { p.meals.splice(mi, 1); }); }} className="grid size-11 shrink-0 place-items-center rounded-xl border border-line text-muted hover:text-danger"><Trash2 size={16} /></button>
              </div>
              <p className="mt-2 text-sm text-muted"><span className="num">{Math.round(mm.kcal)}</span> {t("kcal")} · <MacroLine m={mm} /></p>
              <textarea className="input mt-3 min-h-16 text-sm" placeholder={t("note")} value={meal.note ?? ""} onChange={(e) => edit((p) => { p.meals[mi].note = e.target.value || undefined; })} />
              <ul className="mt-3 divide-y divide-line">
                {meal.items.map((it, ii) => {
                  const food = db.foods.find((f) => f.id === it.foodId)!;
                  const m = itemMacros(food, it.qty);
                  return (
                    <li key={it.id} className="flex items-center gap-2 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{name(food)}</span>
                        <span className="text-xs text-muted"><span className="num">{Math.round(m.kcal)}</span> {t("kcal")} · <MacroLine m={m} /></span>
                      </span>
                      <input aria-label={t("qty")} className="input num w-20 px-2 py-2 text-center" inputMode="decimal" value={it.qty} onChange={(e) => edit((p) => { p.meals[mi].items[ii].qty = parseFloat(e.target.value) || 0; })} />
                      <span className="w-10 text-sm text-muted">{unitLabel(food.unit, lang)}</span>
                      <button aria-label={t("delete")} onClick={() => edit((p) => { p.meals[mi].items.splice(ii, 1); })} className="grid size-8 place-items-center text-muted hover:text-danger"><Trash2 size={15} /></button>
                    </li>
                  );
                })}
              </ul>
              <button onClick={() => setPickFor(meal.id)} className="mt-2 flex items-center gap-1 text-sm font-bold text-gold"><Plus size={16} /> {t("addFood")}</button>
            </section>
          );
        })}
      </div>

      <button onClick={() => edit((p) => p.meals.push({ id: uid("m"), name: `${t("mealName")} ${p.meals.length + 1}`, items: [] }))} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-gold p-4 font-bold text-gold hover:bg-gold-soft"><Plus size={20} /> {t("addMeal")}</button>

      <Sheet open={!!pickFor} onClose={() => setPickFor(null)} title={t("pickFood")}>
        <div className="relative mb-3">
          <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input ps-10" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
        <ul className="space-y-1.5">
          {db.foods.filter((f) => !q || f.nameAr.includes(q) || f.nameEn.toLowerCase().includes(q.toLowerCase())).map((f) => (
            <li key={f.id}>
              <button
                onClick={() => { edit((p) => { p.meals.find((m) => m.id === pickFor)!.items.push({ id: uid("mi"), foodId: f.id, qty: f.per }); }); setPickFor(null); setQ(""); }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-card-hi"
              >
                <span className="font-bold">{name(f)}</span>
                <span className="text-sm text-muted"><span className="num">{f.kcal}</span> {t("kcal")} / <span className="num">{f.per}</span> {unitLabel(f.unit, lang)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

export default function NutritionBuilderPage() {
  return <Suspense><NutritionBuilder /></Suspense>;
}

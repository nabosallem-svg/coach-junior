"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ArrowLeftRight, ShoppingCart, Check, Salad, Undo2, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/hooks";
import { effectiveItem, itemMacros, mealMacros, planMacros, swapOptions, unitLabel } from "@/lib/calc";
import { MacroRing } from "@/components/charts";
import { MacroLine } from "@/components/MacroLine";
import { MealScan } from "@/components/MealScan";
import { Divider, Empty, Sheet } from "@/components/ui";
import type { MealItem } from "@/lib/types";

function shopQty(qty: number, unit: "g" | "piece" | "ml" | "scoop", lang: "ar" | "en") {
  if ((unit === "g" || unit === "ml") && qty >= 1000) {
    const big = unit === "g" ? (lang === "ar" ? "كجم" : "kg") : lang === "ar" ? "لتر" : "L";
    return `${Math.round(qty / 100) / 10} ${big}`;
  }
  return `${Math.round(qty * 10) / 10} ${unitLabel(unit, lang)}`;
}

const HINT_KEY = "cj-swap-hint-seen";

export default function Nutrition() {
  const { db, update } = useStore();
  const { t, lang } = useI18n();
  const me = useMe()!;
  const plan = me.active ? db.nutritionPlans.find((p) => p.id === me.nutritionPlanId) : undefined;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [swapItem, setSwapItem] = useState<MealItem | null>(null);
  const [shop, setShop] = useState(false);
  const [hint, setHint] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    try { setHint(!localStorage.getItem(HINT_KEY)); } catch {}
  }, []);
  const dismissHint = () => {
    setHint(false);
    try { localStorage.setItem(HINT_KEY, "1"); } catch {}
  };

  if (!plan) return <Empty icon={<Salad size={36} />} title={t("noPlanYet")} sub={t("noPlanYetSub")} />;

  const total = planMacros(db, plan.meals, me.id);
  const kc = total.c * 4 + total.f * 9 + total.p * 4 || 1;
  const pct = (v: number) => Math.round((v / kc) * 100);
  const name = (f: { nameAr: string; nameEn: string }) => (lang === "ar" ? f.nameAr : f.nameEn);

  // weekly shopping list: sum of effective items x 7
  const shopping = new Map<string, { label: string; qty: number; unit: (typeof db.foods)[number]["unit"] }>();
  plan.meals.forEach((m) =>
    m.items.forEach((it) => {
      const { food, qty } = effectiveItem(db, me.id, it);
      const row = shopping.get(food.id) ?? { label: name(food), qty: 0, unit: food.unit };
      row.qty += qty * 7;
      shopping.set(food.id, row);
    }),
  );

  const swapCtx = swapItem ? effectiveItem(db, me.id, swapItem) : null;
  const original = swapItem ? db.foods.find((f) => f.id === swapItem.foodId)! : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="h1 min-w-0" dir="auto">{plan.ownerId ? plan.name.replace(/ - [^-]+$/, "") : plan.name}</h1>
        <button onClick={() => setShop(true)} aria-label={t("shoppingList")} className="btn-ghost size-11 shrink-0 p-0"><ShoppingCart size={20} /></button>
      </div>

      <div className="mt-6 flex items-center gap-5">
        <MacroRing {...total} label={t("kcal")} />
        <div className="grid flex-1 grid-cols-3 gap-2 text-center">
          {[
            { k: "carbs", v: total.c, p: pct(total.c * 4), cls: "text-carbs" },
            { k: "fat", v: total.f, p: pct(total.f * 9), cls: "text-fat" },
            { k: "protein", v: total.p, p: pct(total.p * 4), cls: "text-protein" },
          ].map((x) => (
            <div key={x.k}>
              <p className={`num text-sm font-bold ${x.cls}`}>{x.p}%</p>
              <p className="num whitespace-nowrap text-2xl font-black">{Math.round(x.v)}<span className="text-xs font-medium text-muted"> {t("gram")}</span></p>
              <p className="text-sm text-muted">{t(x.k as "carbs")}</p>
            </div>
          ))}
        </div>
      </div>

      <MealScan />

      <Divider>{t("meals")}</Divider>

      <div className="space-y-3">
        {plan.meals.map((meal, mi) => {
          const isOpen = open[meal.id] ?? mi === 0;
          const mm = mealMacros(db, meal, me.id);
          return (
            <section key={meal.id} className="card overflow-hidden rounded-3xl">
              <button className="flex w-full items-center justify-between p-5 text-start" onClick={() => setOpen({ ...open, [meal.id]: !isOpen })} aria-expanded={isOpen}>
                <span>
                  <span className="block text-lg font-bold">{meal.name}</span>
                  <span className="text-sm text-muted"><span className="num">{Math.round(mm.kcal)}</span> {t("kcal")} · <MacroLine m={mm} /></span>
                </span>
                <ChevronDown size={20} className={`text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="px-5 pb-3">
                  {meal.note && <p className="mb-3 border-s-2 border-gold ps-3 text-text-2">{meal.note}</p>}
                  <ul className="divide-y divide-line">
                    {meal.items.map((it, ii) => {
                      const { food, qty, swapped } = effectiveItem(db, me.id, it);
                      const m = itemMacros(food, qty);
                      const key = `${today}:${it.id}`;
                      const done = db.eaten.includes(key);
                      const orig = db.foods.find((f) => f.id === it.foodId)!;
                      return (
                        <li key={it.id} className="relative py-3">
                          <div className="flex items-start gap-3">
                            <button
                              aria-label={name(food)}
                              aria-pressed={done}
                              onClick={() => update((d) => { d.eaten = done ? d.eaten.filter((x) => x !== key) : [...d.eaten, key]; })}
                              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border ${done ? "border-gold bg-gold text-bg" : "border-muted"}`}
                            >
                              {done && <Check size={16} strokeWidth={3} />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className={`font-bold ${done ? "text-muted line-through" : ""}`}>{name(food)}</p>
                              <p className="text-sm text-muted"><span className="num">{qty}</span> {unitLabel(food.unit, lang)}{swapped && <> · {t("swappedFrom", { x: name(orig) })}</>}</p>
                            </div>
                            <div className="text-end text-sm">
                              <p className="text-text-2"><span className="num">{Math.round(m.kcal)}</span> {t("kcal")}</p>
                              <MacroLine m={m} />
                            </div>
                          </div>
                          <button onClick={() => { setSwapItem(it); dismissHint(); }} className="ms-9 mt-1.5 flex items-center gap-1.5 text-sm font-bold text-gold">
                            <ArrowLeftRight size={15} /> {t("swapFood")}
                          </button>
                          {hint && mi === 0 && ii === 0 && (
                            <div className="absolute inset-x-0 top-full z-10 -mt-1 rounded-2xl border border-line-gold bg-card-hi p-4 shadow-xl">
                              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-xs font-bold text-gold"><Sparkles size={14} /> {t("newFeature")}</span>
                              <p>{t("swapHint")}</p>
                              <div className="text-end"><button onClick={dismissHint} className="mt-2 font-bold text-gold">{t("gotIt")}</button></div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>


      <Sheet open={!!swapItem} onClose={() => setSwapItem(null)} title={t("swapTitle")}>
        {swapItem && swapCtx && original && (
          <div className="space-y-2">
            <p className="mb-3 text-sm text-muted">{name(swapCtx.food)} · <span className="num">{swapCtx.qty}</span> {unitLabel(swapCtx.food.unit, lang)} · <span className="num">{Math.round(itemMacros(swapCtx.food, swapCtx.qty).kcal)}</span> {t("kcal")}</p>
            {swapCtx.swapped && (
              <button className="btn-quiet mb-2 w-full" onClick={() => { update((d) => { d.swaps = d.swaps.filter((s) => !(s.clientId === me.id && s.itemId === swapItem.id)); }); setSwapItem(null); }}>
                <Undo2 size={16} /> {t("undoSwap")}: {name(original)}
              </button>
            )}
            {swapOptions(db, original, swapItem.qty).filter((o) => o.food.id !== swapCtx.food.id).map((o) => (
              <button
                key={o.food.id}
                className="card flex w-full items-center justify-between gap-3 p-3 text-start hover:border-line-gold"
                onClick={() => {
                  update((d) => {
                    d.swaps = d.swaps.filter((s) => !(s.clientId === me.id && s.itemId === swapItem.id));
                    d.swaps.push({ clientId: me.id, itemId: swapItem.id, foodId: o.food.id, qty: o.qty });
                  });
                  setSwapItem(null);
                }}
              >
                <span>
                  <span className="block font-bold">{name(o.food)}</span>
                  <span className="text-sm text-muted"><span className="num">{o.qty}</span> {unitLabel(o.food.unit, lang)}</span>
                </span>
                <span className="text-end text-sm">
                  <span className="block text-text-2"><span className="num">{Math.round(o.macros.kcal)}</span> {t("kcal")}</span>
                  <MacroLine m={o.macros} />
                </span>
              </button>
            ))}
          </div>
        )}
      </Sheet>

      <Sheet open={shop} onClose={() => setShop(false)} title={t("shoppingList")}>
        <p className="mb-3 text-sm text-muted">{t("forWeek")}</p>
        <ul className="divide-y divide-line">
          {[...shopping.values()].map((r) => (
            <li key={r.label} className="flex justify-between py-2.5">
              <span>{r.label}</span>
              <span className="text-text-2">{shopQty(r.qty, r.unit, lang)}</span>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

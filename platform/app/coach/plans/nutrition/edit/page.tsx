"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Plus, Trash2, Search, Pencil, Sparkles, Loader2, ArrowLeftRight } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { itemMacros, mealMacros, planMacros, swapOptions, unitLabel } from "@/lib/calc";
import { TargetBars } from "@/components/TargetBars";
import { clientTargets } from "@/lib/intake";
import { BuilderHeader } from "@/components/BuilderHeader";
import { MacroRing } from "@/components/charts";
import { MacroLine } from "@/components/MacroLine";
import { Field, Sheet } from "@/components/ui";
import type { Food, FoodGroup, NutritionPlan } from "@/lib/types";

type NewFood = { name: string; group: FoodGroup; unit: Food["unit"]; per: string; kcal: string; p: string; c: string; f: string };
const GROUPS: FoodGroup[] = ["protein", "carb", "fat", "veg", "fruit", "dairy", "supplement"];

function NutritionBuilder() {
  const id = useSearchParams().get("id") ?? "";
  const { db, update } = useStore();
  const { t, lang } = useI18n();
  const plan = db.nutritionPlans.find((p) => p.id === id);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [nf, setNf] = useState<NewFood | null>(null);
  const [ai, setAi] = useState<"idle" | "busy" | "nokey" | "fail">("idle");
  const [swap, setSwap] = useState<{ mi: number; ii: number } | null>(null);
  if (!plan) return null;

  const edit = (fn: (p: NutritionPlan) => void) => update((d) => fn(d.nutritionPlans.find((p) => p.id === id)!));
  const total = planMacros(db, plan.meals);
  const name = (f: { nameAr: string; nameEn: string }) => (lang === "ar" ? f.nameAr : f.nameEn);
  const closePicker = () => { setPickFor(null); setQ(""); setNf(null); setAi("idle"); };
  // asks the server (Claude) for the macros of the typed food and amount; coach can still edit them
  const estimate = async () => {
    if (!nf?.name.trim()) return;
    setAi("busy");
    try {
      const r = await fetch("/api/macros", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: nf.name, unit: nf.unit, per: nf.per }) });
      if (r.status === 503 || r.status === 404) return setAi("nokey");
      if (!r.ok) return setAi("fail");
      const j = await r.json();
      setNf((x) => x && { ...x, kcal: String(j.kcal), p: String(j.p), c: String(j.c), f: String(j.f) });
      setAi("idle");
    } catch { setAi("fail"); }
  };
  const addItem = (foodId: string, qty: number) => edit((p) => { p.meals.find((m) => m.id === pickFor)!.items.push({ id: uid("mi"), foodId, qty }); });
  const saveNew = () => {
    if (!nf || !nf.name.trim()) return;
    const n = (v: string) => parseFloat(v) || 0;
    const per = n(nf.per) || (nf.unit === "g" || nf.unit === "ml" ? 100 : 1);
    const kcal = n(nf.kcal) || Math.round(4 * n(nf.p) + 4 * n(nf.c) + 9 * n(nf.f));
    const fid = uid("f");
    update((d) => { d.foods.push({ id: fid, nameAr: nf.name.trim(), nameEn: nf.name.trim(), group: nf.group, unit: nf.unit, per, kcal, p: n(nf.p), c: n(nf.c), f: n(nf.f) }); });
    addItem(fid, per);
    closePicker();
  };

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

      <div className="card mt-5 flex items-center gap-3 p-4">
        <MacroRing {...total} label={t("kcal")} />
        <div className="grid flex-1 grid-cols-3 gap-2 text-center">
          <div><p className="num whitespace-nowrap text-xl font-black text-carbs">{Math.round(total.c)}<span className="text-xs font-medium text-muted"> {t("gram")}</span></p><p className="text-sm text-muted">{t("carbs")}</p></div>
          <div><p className="num whitespace-nowrap text-xl font-black text-fat">{Math.round(total.f)}<span className="text-xs font-medium text-muted"> {t("gram")}</span></p><p className="text-sm text-muted">{t("fat")}</p></div>
          <div><p className="num whitespace-nowrap text-xl font-black text-protein">{Math.round(total.p)}<span className="text-xs font-medium text-muted"> {t("gram")}</span></p><p className="text-sm text-muted">{t("protein")}</p></div>
        </div>
      </div>

      {plan.ownerId && (() => {
        const owner = db.clients.find((c) => c.id === plan.ownerId);
        const target = owner && clientTargets(db, owner);
        return (
          <div className="card mt-3 p-4">
            <p className="mb-3 text-sm font-bold text-gold">{t("vsTarget")}</p>
            {target ? <TargetBars have={total} target={target} /> : <p className="text-sm text-muted">{t("noTargetYet")}</p>}
          </div>
        );
      })()}

      <div className="mt-5 space-y-3">
        {plan.meals.map((meal, mi) => {
          const mm = mealMacros(db, meal);
          return (
            <section key={meal.id} className="card p-4">
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Pencil size={15} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gold" />
                  <input aria-label={t("mealName")} placeholder={t("mealNamePh")} className="input pe-9 text-lg font-bold" dir="auto" value={meal.name} onChange={(e) => edit((p) => { p.meals[mi].name = e.target.value; })} />
                </div>
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
                      <button aria-label={t("swapFood")} title={t("swapFood")} onClick={() => setSwap({ mi, ii })} className="grid size-8 place-items-center text-gold"><ArrowLeftRight size={15} /></button>
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

      <button onClick={() => edit((p) => p.meals.push({ id: uid("m"), name: t("mealN", { n: p.meals.length + 1 }), items: [] }))} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-gold p-4 font-bold text-gold hover:bg-gold-soft"><Plus size={20} /> {t("addMeal")}</button>

      <Sheet open={!!swap} onClose={() => setSwap(null)} title={t("swapTitle")}>
        {swap && (() => {
          const it = plan.meals[swap.mi]?.items[swap.ii];
          const food = it && db.foods.find((f) => f.id === it.foodId);
          if (!it || !food) return null;
          const opts = swapOptions(db, food, it.qty);
          return opts.length ? (
            <ul className="space-y-1.5">
              {opts.map((o) => (
                <li key={o.food.id}>
                  <button onClick={() => { edit((p) => { const x = p.meals[swap.mi].items[swap.ii]; x.foodId = o.food.id; x.qty = o.qty; }); setSwap(null); }} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-card-hi">
                    <span><span className="block font-bold">{name(o.food)}</span><span className="text-sm text-muted"><span className="num">{o.qty}</span> {unitLabel(o.food.unit, lang)}</span></span>
                    <span className="text-end text-sm"><span className="num block">{Math.round(o.macros.kcal)} {t("kcal")}</span><MacroLine m={o.macros} /></span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">{t("noSwaps")}</p>;
        })()}
      </Sheet>

      <Sheet open={!!pickFor} onClose={closePicker} title={nf ? t("newFood") : t("pickFood")}>
        {nf ? (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveNew(); }}>
            <Field label={t("foodName")}><input className="input" dir="auto" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} required autoFocus /></Field>
            <Field label={t("foodGroup")}>
              <select className="input" value={nf.group} onChange={(e) => setNf({ ...nf, group: e.target.value as FoodGroup })}>
                {GROUPS.map((g) => <option key={g} value={g}>{t(`g_${g}`)}</option>)}
              </select>
            </Field>
            <Field group label={t("macrosPer")}>
              <div className="flex gap-2">
                <input className="input num w-24 text-center" inputMode="decimal" placeholder={nf.unit === "g" || nf.unit === "ml" ? "100" : "1"} value={nf.per} onChange={(e) => setNf({ ...nf, per: e.target.value })} />
                <div className="grid flex-1 grid-cols-4 gap-1.5">
                  {(["g", "piece", "ml", "scoop"] as Food["unit"][]).map((u) => (
                    <button type="button" key={u} onClick={() => setNf({ ...nf, unit: u })} className={`h-11 rounded-xl border text-sm font-bold ${nf.unit === u ? "border-gold bg-gold text-bg" : "border-line text-text-2"}`}>{unitLabel(u, lang)}</button>
                  ))}
                </div>
              </div>
            </Field>
            <button type="button" onClick={estimate} disabled={ai === "busy" || !nf.name.trim()} className="btn-ghost w-full">
              {ai === "busy" ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} {ai === "busy" ? t("aiBusy") : t("aiEstimate")}
            </button>
            {ai === "nokey" && <p className="text-sm text-muted">{t("aiNoKey")}</p>}
            {ai === "fail" && <p className="text-sm text-danger">{t("aiFail")}</p>}
            <div className="grid grid-cols-3 gap-2">
              {(["p", "c", "f"] as const).map((k) => (
                <Field key={k} label={`${t(k === "p" ? "protein" : k === "c" ? "carbs" : "fat")} (${t("gram")})`}>
                  <input className="input num text-center" inputMode="decimal" value={nf[k]} onChange={(e) => setNf({ ...nf, [k]: e.target.value })} />
                </Field>
              ))}
            </div>
            <Field label={t("kcal")}>
              <input className="input num text-center" inputMode="decimal" placeholder={String(Math.round(4 * (parseFloat(nf.p) || 0) + 4 * (parseFloat(nf.c) || 0) + 9 * (parseFloat(nf.f) || 0)))} value={nf.kcal} onChange={(e) => setNf({ ...nf, kcal: e.target.value })} />
            </Field>
            <p className="text-sm text-muted">{t("kcalAuto")}</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-gold">{t("addToMeal")}</button>
              <button type="button" onClick={() => setNf(null)} className="btn-quiet">{t("back")}</button>
            </div>
          </form>
        ) : (
          <>
            <div className="relative mb-3">
              <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className="input ps-10" placeholder={t("searchFood")} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            </div>
            <button
              onClick={() => setNf({ name: q, group: "protein", unit: "g", per: "", kcal: "", p: "", c: "", f: "" })}
              className="mb-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-line-gold px-3 py-3 font-bold text-gold hover:bg-gold-soft"
            >
              <Plus size={18} /> {q ? t("addNamedFood", { x: q }) : t("newFood")}
            </button>
            <ul className="space-y-1.5">
              {db.foods.filter((f) => !q || f.nameAr.includes(q) || f.nameEn.toLowerCase().includes(q.toLowerCase())).map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => { addItem(f.id, f.per); closePicker(); }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-card-hi"
                  >
                    <span className="font-bold">{name(f)}</span>
                    <span className="text-sm text-muted"><span className="num">{f.kcal}</span> {t("kcal")} / <span className="num">{f.per}</span> {unitLabel(f.unit, lang)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Sheet>
    </div>
  );
}

export default function NutritionBuilderPage() {
  return <Suspense><NutritionBuilder /></Suspense>;
}

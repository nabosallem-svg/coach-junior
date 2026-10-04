"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Dumbbell, Salad, ClipboardList, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { planMacros } from "@/lib/calc";
import { Segmented } from "@/components/ui";

type Tab = "training" | "nutrition" | "forms";

function Plans() {
  const { db, update } = useStore();
  const { t, dir } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) || "training";
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const assigned = (key: "trainingPlanId" | "nutritionPlanId", id: string) => db.clients.filter((c) => c[key] === id).length;

  const create = () => {
    const id = uid(tab === "forms" ? "fm" : tab === "training" ? "tp" : "np");
    update((d) => {
      if (tab === "training") d.trainingPlans.push({ id, name: t("newPlan"), days: [{ id: uid("d"), name: "Day 1", exercises: [] }] });
      else if (tab === "nutrition") d.nutritionPlans.push({ id, name: t("newPlan"), meals: [{ id: uid("m"), name: t("mealName") + " 1", items: [] }] });
      else d.forms.push({ id, title: t("newForm"), questions: [{ id: uid("q"), type: "text", label: "" }] });
    });
    router.push(`/coach/plans/${tab}/${id}`);
  };

  const duplicate = (id: string) =>
    update((d) => {
      if (tab === "training") { const p = structuredClone(d.trainingPlans.find((x) => x.id === id)!); d.trainingPlans.push({ ...p, id: uid("tp"), name: `${p.name} (2)` }); }
      if (tab === "nutrition") { const p = structuredClone(d.nutritionPlans.find((x) => x.id === id)!); d.nutritionPlans.push({ ...p, id: uid("np"), name: `${p.name} (2)` }); }
      if (tab === "forms") { const p = structuredClone(d.forms.find((x) => x.id === id)!); d.forms.push({ ...p, id: uid("fm"), title: `${p.title} (2)` }); }
    });

  const rows =
    tab === "training"
      ? db.trainingPlans.map((p) => ({ id: p.id, name: p.name, sub: `${p.days.length} ${t("days_")} · ${t("assignedTo", { n: assigned("trainingPlanId", p.id) })}`, icon: Dumbbell }))
      : tab === "nutrition"
        ? db.nutritionPlans.map((p) => ({ id: p.id, name: p.name, sub: `${Math.round(planMacros(db, p.meals).kcal)} ${t("kcal")} · ${p.meals.length} ${t("meals")} · ${t("assignedTo", { n: assigned("nutritionPlanId", p.id) })}`, icon: Salad }))
        : db.forms.map((f) => ({ id: f.id, name: f.title, sub: `${f.questions.length} ${t("question")}`, icon: ClipboardList }));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="h1">{t("plans")}</h1>
        <button className="btn-gold" onClick={create}><Plus size={18} /> {tab === "forms" ? t("newForm") : t("newPlan")}</button>
      </div>
      <Segmented
        className="mt-5"
        value={tab}
        onChange={(v) => router.replace(`/coach/plans?tab=${v}`)}
        options={[
          { value: "training", label: t("trainingPlans") },
          { value: "nutrition", label: t("nutritionPlans") },
          { value: "forms", label: t("formTemplates") },
        ]}
      />
      <ul className="mt-4 grid gap-2 lg:grid-cols-2">
        {rows.map(({ id, name, sub, icon: Icon }) => (
          <li key={id} className="card flex items-center gap-3 p-3 hover:border-line-gold">
            <Link href={`/coach/plans/${tab}/${id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold-soft text-gold"><Icon size={20} /></span>
              <span className="min-w-0">
                <span className="block truncate font-bold">{name}</span>
                <span className="block truncate text-sm text-muted">{sub}</span>
              </span>
            </Link>
            <button onClick={() => duplicate(id)} aria-label={t("duplicate")} className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-gold"><Copy size={16} /></button>
            <Chevron size={18} className="text-muted" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PlansPage() {
  return <Suspense><Plans /></Suspense>;
}

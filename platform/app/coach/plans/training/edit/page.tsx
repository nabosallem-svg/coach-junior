"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Plus, Trash2, Search, Video } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { BuilderHeader } from "@/components/BuilderHeader";
import { ExerciseCard } from "@/components/ExerciseCard";
import { Pills, Sheet } from "@/components/ui";
import type { TrainingPlan } from "@/lib/types";

function TrainingBuilder() {
  const id = useSearchParams().get("id") ?? "";
  const { db, update } = useStore();
  const { t, muscle } = useI18n();
  const plan = db.trainingPlans.find((p) => p.id === id);
  const [dayId, setDayId] = useState<string | undefined>(plan?.days[0]?.id);
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState("");
  if (!plan) return null;
  const day = plan.days.find((d) => d.id === dayId) ?? plan.days[0];

  const edit = (fn: (p: TrainingPlan) => void) => update((d) => fn(d.trainingPlans.find((p) => p.id === id)!));
  const editDay = (fn: (day: TrainingPlan["days"][number]) => void) => edit((p) => fn(p.days.find((x) => x.id === day.id)!));

  const addDay = () => {
    const nid = uid("d");
    edit((p) => p.days.push({ id: nid, name: `${t("days")} ${p.days.length + 1}`, exercises: [] }));
    setDayId(nid);
  };

  return (
    <div>
      <BuilderHeader backTab="training" label={t("planName")} value={plan.name} onChange={(v) => edit((p) => { p.name = v; })} onDelete={() => update((d) => {
        d.trainingPlans = d.trainingPlans.filter((p) => p.id !== id);
        d.clients.forEach((c) => { if (c.trainingPlanId === id) c.trainingPlanId = undefined; });
      })} />
      {plan.ownerId ? (
        <p className="mt-2 inline-flex rounded-full border border-line-gold bg-gold-soft px-3 py-1 text-sm font-bold text-gold">{t("personalFor", { name: db.clients.find((c) => c.id === plan.ownerId)?.name ?? "" })}</p>
      ) : (
        <p className="mt-2 text-sm text-muted">{t("templateNote", { n: db.clients.filter((c) => c.trainingPlanId === id).length })}</p>
      )}

      <div className="mt-5 flex items-center gap-2">
        <div className="min-w-0 flex-1"><Pills bleed={false} value={day?.id ?? ""} onChange={setDayId} options={plan.days.map((d) => ({ value: d.id, label: d.name }))} /></div>
        <button onClick={addDay} aria-label={t("addDay")} title={t("addDay")} className="btn-ghost size-11 shrink-0 p-0"><Plus size={20} /></button>
      </div>

      {day && (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <input aria-label={t("dayName")} className="input text-lg font-bold" dir="auto" value={day.name} onChange={(e) => editDay((d) => { d.name = e.target.value; })} />
            {plan.days.length > 1 && (
              <button aria-label={t("delete")} onClick={() => { if (confirm(t("confirmDelete"))) { edit((p) => { p.days = p.days.filter((x) => x.id !== day.id); }); setDayId(undefined); } }} className="grid size-11 shrink-0 place-items-center rounded-xl border border-line text-muted hover:text-danger"><Trash2 size={18} /></button>
            )}
          </div>

          <ol className="mt-4 max-w-3xl space-y-3">
            {day.exercises.map((pe, i) => {
              return (
                <ExerciseCard
                  key={pe.id}
                  pe={pe}
                  ex={db.exercises.find((e) => e.id === pe.exerciseId)}
                  index={i}
                  count={day.exercises.length}
                  onChange={(fn) => editDay((d) => fn(d.exercises[i]))}
                  onMove={(dir) => editDay((d) => { const j = i + dir; [d.exercises[j], d.exercises[i]] = [d.exercises[i], d.exercises[j]]; })}
                  onDelete={() => editDay((d) => { d.exercises.splice(i, 1); })}
                />
              );
            })}
          </ol>

          <button onClick={() => setPicker(true)} className="mt-4 flex w-full max-w-3xl items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-gold p-4 font-bold text-gold hover:bg-gold-soft"><Plus size={20} /> {t("addExerciseFromLib")}</button>
        </div>
      )}

      <Sheet open={picker} onClose={() => setPicker(false)} title={t("pickExercise")}>
        <div className="relative mb-3">
          <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input ps-10" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
        <ul className="space-y-1.5">
          {db.exercises.filter((e) => !q || e.name.toLowerCase().includes(q.toLowerCase()) || muscle(e.muscle).includes(q)).map((e) => (
            <li key={e.id}>
              <button
                onClick={() => { editDay((d) => { d.exercises.push({ id: uid("pe"), exerciseId: e.id, rest: "90", sets: [{ reps: "8-12" }, { reps: "8-12" }, { reps: "8-12" }] }); }); setPicker(false); setQ(""); }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-card-hi"
              >
                <span className="font-bold" dir="auto">{e.name}</span>
                <span className="flex items-center gap-2 text-sm text-muted">{(e.videoKey || e.videoUrl) && <Video size={14} className="text-gold" />}{muscle(e.muscle)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

export default function TrainingBuilderPage() {
  return <Suspense><TrainingBuilder /></Suspense>;
}

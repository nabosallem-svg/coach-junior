"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Search, Video, X } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { BuilderHeader } from "@/components/BuilderHeader";
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
    edit((p) => p.days.push({ id: nid, name: `Day ${p.days.length + 1}`, exercises: [] }));
    setDayId(nid);
  };

  const cell = "input num px-2 py-2 text-center";

  return (
    <div>
      <BuilderHeader backTab="training" label={t("planName")} value={plan.name} onChange={(v) => edit((p) => { p.name = v; })} onDelete={() => update((d) => {
        d.trainingPlans = d.trainingPlans.filter((p) => p.id !== id);
        d.clients.forEach((c) => { if (c.trainingPlanId === id) c.trainingPlanId = undefined; });
      })} />
      <p className="mt-2 text-sm text-muted">{t("assignedTo", { n: db.clients.filter((c) => c.trainingPlanId === id).length })}</p>

      <div className="mt-5 flex items-center gap-2">
        <div className="min-w-0 flex-1"><Pills bleed={false} value={day?.id ?? ""} onChange={setDayId} options={plan.days.map((d) => ({ value: d.id, label: d.name }))} /></div>
        <button onClick={addDay} className="btn-ghost shrink-0 px-3"><Plus size={18} /> {t("addDay")}</button>
      </div>

      {day && (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <input aria-label={t("dayName")} className="input text-lg font-bold" dir="auto" value={day.name} onChange={(e) => editDay((d) => { d.name = e.target.value; })} />
            {plan.days.length > 1 && (
              <button aria-label={t("delete")} onClick={() => { if (confirm(t("confirmDelete"))) { edit((p) => { p.days = p.days.filter((x) => x.id !== day.id); }); setDayId(undefined); } }} className="grid size-11 shrink-0 place-items-center rounded-xl border border-line text-muted hover:text-danger"><Trash2 size={18} /></button>
            )}
          </div>

          <ol className="mt-4 space-y-3">
            {day.exercises.map((pe, i) => {
              const ex = db.exercises.find((e) => e.id === pe.exerciseId);
              return (
                <li key={pe.id} className="card p-4">
                  <div className="flex items-start gap-2">
                    <span className="num mt-0.5 text-muted">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-bold" dir="auto">{ex?.name}{(ex?.videoKey || ex?.videoUrl) && <Video size={14} className="text-gold" />}</p>
                      <span className="text-xs text-muted">{ex && muscle(ex.muscle)}</span>
                    </div>
                    <div className="flex gap-1 text-muted">
                      <button aria-label="up" disabled={i === 0} onClick={() => editDay((d) => { [d.exercises[i - 1], d.exercises[i]] = [d.exercises[i], d.exercises[i - 1]]; })} className="grid size-8 place-items-center rounded-lg hover:text-text disabled:opacity-30"><ChevronUp size={18} /></button>
                      <button aria-label="down" disabled={i === day.exercises.length - 1} onClick={() => editDay((d) => { [d.exercises[i + 1], d.exercises[i]] = [d.exercises[i], d.exercises[i + 1]]; })} className="grid size-8 place-items-center rounded-lg hover:text-text disabled:opacity-30"><ChevronDown size={18} /></button>
                      <button aria-label={t("delete")} onClick={() => editDay((d) => { d.exercises.splice(i, 1); })} className="grid size-8 place-items-center rounded-lg hover:text-danger"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <input className="input mt-3 text-sm" dir="auto" placeholder={`${t("note")}${ex?.cue ? ` (${ex.cue})` : ""}`} value={pe.note ?? ""} onChange={(e) => editDay((d) => { d.exercises[i].note = e.target.value || undefined; })} />
                  <div className="mt-3 grid grid-cols-[2rem_1fr_1fr_1fr_2rem] items-center gap-2 text-center text-xs font-bold uppercase text-muted">
                    <span>{t("set")}</span><span>{t("reps")}</span><span>{t("tempo")}</span><span>{t("rir")}</span><span />
                  </div>
                  {pe.sets.map((s, si) => (
                    <div key={si} className="mt-2 grid grid-cols-[2rem_1fr_1fr_1fr_2rem] items-center gap-2">
                      <span className="num text-center text-muted">{si + 1}</span>
                      <input className={cell} value={s.reps} placeholder="8-12" onChange={(e) => editDay((d) => { d.exercises[i].sets[si].reps = e.target.value; })} />
                      <input className={cell} value={s.tempo ?? ""} placeholder="3-1-1" onChange={(e) => editDay((d) => { d.exercises[i].sets[si].tempo = e.target.value; })} />
                      <input className={cell} value={s.rir ?? ""} placeholder="1" onChange={(e) => editDay((d) => { d.exercises[i].sets[si].rir = e.target.value; })} />
                      <button aria-label={t("delete")} disabled={pe.sets.length === 1} onClick={() => editDay((d) => { d.exercises[i].sets.splice(si, 1); })} className="grid size-8 place-items-center text-muted hover:text-danger disabled:opacity-30"><X size={16} /></button>
                    </div>
                  ))}
                  <button onClick={() => editDay((d) => { const last = d.exercises[i].sets.at(-1); d.exercises[i].sets.push({ ...(last ?? { reps: "8-12" }) }); })} className="mt-3 flex items-center gap-1 text-sm font-bold text-gold"><Plus size={16} /> {t("addSet")}</button>
                </li>
              );
            })}
          </ol>

          <button onClick={() => setPicker(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-gold p-4 font-bold text-gold hover:bg-gold-soft"><Plus size={20} /> {t("addExercise")}</button>
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
                onClick={() => { editDay((d) => { d.exercises.push({ id: uid("pe"), exerciseId: e.id, sets: [{ reps: "8-12", tempo: "", rir: "1" }, { reps: "8-12", tempo: "", rir: "1" }, { reps: "8-12", tempo: "", rir: "1" }] }); }); setPicker(false); setQ(""); }}
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

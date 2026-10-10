"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Plus, Trash2, Search, Video, Upload, Loader2, Link2 } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { useI18n, MUSCLES } from "@/lib/i18n";
import { putVideo } from "@/lib/media";
import { BuilderHeader } from "@/components/BuilderHeader";
import { ExerciseCard } from "@/components/ExerciseCard";
import { Field, Pills, Sheet } from "@/components/ui";
import type { Muscle, TrainingPlan } from "@/lib/types";

function TrainingBuilder() {
  const id = useSearchParams().get("id") ?? "";
  const { db, update } = useStore();
  const { t, muscle } = useI18n();
  const plan = db.trainingPlans.find((p) => p.id === id);
  const [dayId, setDayId] = useState<string | undefined>(plan?.days[0]?.id);
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState("");
  const [mf, setMf] = useState("all");
  const [nx, setNx] = useState<{ name: string; muscle: Muscle | ""; file: File | null; url?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  if (!plan) return null;
  const day = plan.days.find((d) => d.id === dayId) ?? plan.days[0];

  const edit = (fn: (p: TrainingPlan) => void) => update((d) => fn(d.trainingPlans.find((p) => p.id === id)!));
  const editDay = (fn: (day: TrainingPlan["days"][number]) => void) => edit((p) => fn(p.days.find((x) => x.id === day.id)!));

  const addEx = (exerciseId: string) => editDay((d) => { d.exercises.push({ id: uid("pe"), exerciseId, rest: "90", sets: [{ reps: "8-12" }, { reps: "8-12" }, { reps: "8-12" }] }); });
  const closePicker = () => { setPicker(false); setQ(""); setMf("all"); setNx(null); };
  // a new exercise goes into the library too, so it can be reused in other plans
  const saveNew = async () => {
    if (!nx || !nx.name.trim() || !nx.muscle) return;
    setSaving(true);
    const id = uid("ex");
    let videoKey: string | undefined;
    if (nx.file) { try { videoKey = `${id}-${Date.now()}`; await putVideo(videoKey, nx.file); } catch { videoKey = undefined; alert(t("uploadFailed")); } }
    update((d) => { d.exercises.unshift({ id, name: nx.name.trim(), muscle: nx.muscle as Muscle, videoKey, videoUrl: videoKey ? undefined : nx.url?.trim() || undefined }); });
    addEx(id);
    setSaving(false);
    closePicker();
  };

  const addDay = () => {
    const nid = uid("d");
    edit((p) => p.days.push({ id: nid, name: `${t("days")} ${p.days.length + 1}`, exercises: [] }));
    setDayId(nid);
  };

  return (
    <div>
      <BuilderHeader backTab="training" label={t("planName")} placeholder={t("planNamePh")} value={plan.name} onChange={(v) => edit((p) => { p.name = v; })} onDelete={() => update((d) => {
        d.trainingPlans = d.trainingPlans.filter((p) => p.id !== id);
        d.clients.forEach((c) => { if (c.trainingPlanId === id) c.trainingPlanId = undefined; });
      })} />
      {plan.ownerId ? (
        <p className="mt-2 inline-flex rounded-full border border-line-gold bg-gold-soft px-3 py-1 text-sm font-bold text-gold">{t("personalFor", { name: db.clients.find((c) => c.id === plan.ownerId)?.name ?? "" })}</p>
      ) : (
        <p className="mt-2 text-sm text-muted">{(() => { const n = db.clients.filter((c) => c.trainingPlanId === id).length; return n ? t("templateNote", { n }) : t("templateNoteNew"); })()}</p>
      )}

      <p className="mt-3 max-w-3xl rounded-xl bg-card-hi px-3 py-2 text-sm text-text-2">{t("planHow")}</p>

      <div className="mt-5 flex items-center justify-between gap-2">
        <h2 className="font-black">{t("planDays", { n: plan.days.length })}</h2>
        <button onClick={addDay} className="btn-ghost h-10 shrink-0 px-3 text-sm"><Plus size={18} /> {t("addDay")}</button>
      </div>
      <div className="mt-2"><Pills wrap value={day?.id ?? ""} onChange={setDayId} options={plan.days.map((d) => ({ value: d.id, label: d.name || "…" }))} /></div>

      {day && (
        <div className="mt-5 max-w-3xl rounded-2xl border border-line-gold p-3 sm:p-4">
          <label className="mb-1.5 block text-sm font-bold text-text-2" htmlFor="day-name">{t("dayName")}</label>
          <div className="flex items-center gap-2">
            <input id="day-name" className="input text-lg font-bold" dir="auto" placeholder={t("dayNamePh")} value={day.name} onChange={(e) => editDay((d) => { d.name = e.target.value; })} />
            {plan.days.length > 1 && (
              <button aria-label={t("deleteDay")} title={t("deleteDay")} onClick={() => { if (confirm(t("confirmDelete"))) { edit((p) => { p.days = p.days.filter((x) => x.id !== day.id); }); setDayId(undefined); } }} className="grid size-11 shrink-0 place-items-center rounded-xl border border-line text-muted hover:text-danger"><Trash2 size={18} /></button>
            )}
          </div>

          <h3 className="mt-5 text-sm font-bold text-text-2">{t("dayExercises", { n: day.exercises.length })}</h3>
          {day.exercises.length === 0 && <p className="mt-2 rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">{t("dayEmpty")}</p>}
          <ol className="mt-3 space-y-3">
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

          <button onClick={() => setPicker(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-gold p-4 font-bold text-gold hover:bg-gold-soft"><Plus size={20} /> {t("addExToDay")}</button>
        </div>
      )}

      <Sheet open={picker} onClose={closePicker} title={nx ? t("newExercise") : t("pickExercise")}>
        {nx ? (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveNew(); }}>
            <Field label={t("exerciseName")}><input className="input" dir="auto" value={nx.name} onChange={(e) => setNx({ ...nx, name: e.target.value })} required autoFocus /></Field>
            <Field group label={t("pickMuscle")}>
              <div className="flex flex-wrap gap-1.5">
                {MUSCLES.map((m) => <button type="button" key={m} onClick={() => setNx({ ...nx, muscle: m as Muscle })} className={`h-9 rounded-full border px-3 text-sm font-bold ${nx.muscle === m ? "border-gold bg-gold text-bg" : "border-line text-text-2"}`}>{muscle(m as Muscle)}</button>)}
              </div>
            </Field>
            <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-gold px-3 text-sm font-bold text-gold hover:bg-gold-soft">
              <Upload size={18} /> <span className="truncate">{nx.file ? nx.file.name : t("videoOptional")}</span>
              <input type="file" accept="video/*" className="hidden" onChange={(e) => setNx({ ...nx, file: e.target.files?.[0] ?? null })} />
            </label>
            <Field label={t("orLink")}>
              <div className="relative">
                <Link2 size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
                <input className="input ps-9 text-start" dir="ltr" placeholder="https://youtu.be/..." value={nx.url ?? ""} onChange={(e) => setNx({ ...nx, url: e.target.value })} />
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-gold" disabled={saving || !nx.name.trim() || !nx.muscle}>{saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} {t("addToDay")}</button>
              <button type="button" onClick={() => setNx(null)} className="btn-quiet">{t("back")}</button>
            </div>
            <p className="text-xs text-muted">{t("savedToLibrary")}</p>
          </form>
        ) : (
          <>
            <div className="relative mb-3">
              <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className="input ps-10" placeholder={t("searchExercise")} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button onClick={() => setNx({ name: q, muscle: mf === "all" ? "" : (mf as Muscle), file: null })} className="mb-3 flex w-full items-center gap-2 rounded-xl border border-dashed border-line-gold px-3 py-3 font-bold text-gold hover:bg-gold-soft">
              <Plus size={18} /> {q ? t("addNamedExercise", { x: q }) : t("newExercise")}
            </button>
            <Pills wrap value={mf} onChange={setMf} options={[{ value: "all", label: t("all") }, ...MUSCLES.filter((m) => db.exercises.some((e) => e.muscle === m)).map((m) => ({ value: m, label: muscle(m as Muscle) }))]} />
            <ul className="mt-3 space-y-1.5">
              {db.exercises.filter((e) => (mf === "all" || e.muscle === mf) && (!q || e.name.toLowerCase().includes(q.toLowerCase()) || muscle(e.muscle).includes(q))).map((e) => (
                <li key={e.id}>
                  <button onClick={() => { addEx(e.id); closePicker(); }} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-start hover:bg-card-hi">
                    <span className="font-bold" dir="auto">{e.name}</span>
                    <span className="flex shrink-0 items-center gap-2 text-sm text-muted">{e.videoKey || e.videoUrl ? <Video size={14} className="text-gold" /> : <span className="rounded-full border border-line px-2 py-0.5 text-[11px]">{t("noVideoShort")}</span>}{muscle(e.muscle)}</span>
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

export default function TrainingBuilderPage() {
  return <Suspense><TrainingBuilder /></Suspense>;
}

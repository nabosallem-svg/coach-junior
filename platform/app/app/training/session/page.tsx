"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X, ChevronDown } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/hooks";
import { prevSets } from "@/lib/calc";
import { VideoBox } from "@/components/VideoBox";
import { Toast } from "@/components/ui";
import type { LoggedSet } from "@/lib/types";

function Session() {
  const { db, update } = useStore();
  const { t } = useI18n();
  const me = useMe()!;
  const router = useRouter();
  const params = useSearchParams();
  const plan = db.trainingPlans.find((p) => p.id === me.trainingPlanId);
  const day = plan?.days.find((d) => d.id === params.get("day")) ?? plan?.days[0];
  const myLogs = db.logs.filter((l) => l.clientId === me.id);
  const [sets, setSets] = useState<Record<string, LoggedSet[]>>(() =>
    Object.fromEntries((day?.exercises ?? []).map((pe) => [pe.id, pe.sets.map(() => ({ weight: "", reps: "", done: false }))])),
  );
  const [video, setVideo] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!plan || !day) return null;
  const total = Object.values(sets).flat().length;
  const done = Object.values(sets).flat().filter((s) => s.done).length;

  const patch = (peId: string, i: number, p: Partial<LoggedSet>) =>
    setSets((prev) => ({ ...prev, [peId]: prev[peId].map((s, j) => (j === i ? { ...s, ...p } : s)) }));

  const finish = () => {
    update((d) => {
      d.logs.push({ id: uid("log"), clientId: me.id, planId: plan.id, dayId: day.id, date: new Date().toISOString(), sets });
    });
    setToast(t("workoutSaved"));
    setTimeout(() => router.replace("/app/training"), 900);
  };

  return (
    <div className="pb-32">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-muted hover:text-text"><X size={20} /> {t("exitWorkout")}</button>
          <span className="num font-bold text-gold">{done}/{total}</span>
        </div>
        <h1 className="mt-2 text-2xl font-black">{day.name}</h1>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-card-hi"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(done / (total || 1)) * 100}%` }} /></div>
      </header>

      <div className="space-y-4 px-4 pt-5">
        {day.exercises.map((pe, n) => {
          const ex = db.exercises.find((e) => e.id === pe.exerciseId);
          if (!ex) return null;
          const prev = prevSets(myLogs, pe.id);
          const rows = sets[pe.id];
          const allDone = rows.every((s) => s.done);
          return (
            <section key={pe.id} className={`card p-4 ${allDone ? "border-line-gold" : ""}`}>
              <button className="flex w-full items-center justify-between gap-3 text-start" onClick={() => setVideo(video === pe.id ? null : pe.id)}>
                <span className="flex items-baseline gap-2">
                  <span className="num text-muted">{n + 1}</span>
                  <bdi className="font-bold">{ex.name}</bdi>
                </span>
                <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${video === pe.id ? "rotate-180" : ""}`} />
              </button>
              {video === pe.id && <div className="mt-3"><VideoBox ex={ex} /></div>}
              {(pe.note || ex.cue) && <p className="mt-2 border-s-2 border-gold ps-3 text-sm text-text-2">{pe.note || ex.cue}</p>}

              <div className="mt-3 grid grid-cols-[2rem_1fr_1fr_1fr_2.75rem] items-center gap-2 text-center text-xs font-bold uppercase text-muted">
                <span>{t("set")}</span><span>{t("prev")}</span><span>{t("kg")}</span><span>{t("reps")}</span><span />
              </div>
              {rows.map((s, i) => (
                <div key={i} className={`mt-2 grid grid-cols-[2rem_1fr_1fr_1fr_2.75rem] items-center gap-2 text-center ${s.done ? "opacity-70" : ""}`}>
                  <span className="num text-muted">{i + 1}</span>
                  <span className="num text-sm text-muted">{prev?.[i]?.done ? `${prev[i].weight}×${prev[i].reps}` : "—"}</span>
                  <input className="input num px-1 py-2 text-center" inputMode="decimal" placeholder={prev?.[i]?.weight || "—"} value={s.weight} onChange={(e) => patch(pe.id, i, { weight: e.target.value })} aria-label={`${t("set")} ${i + 1} ${t("kg")}`} />
                  <input className="input num px-1 py-2 text-center" inputMode="numeric" placeholder={pe.sets[i].reps} value={s.reps} onChange={(e) => patch(pe.id, i, { reps: e.target.value })} aria-label={`${t("set")} ${i + 1} ${t("reps")}`} />
                  <button
                    onClick={() => patch(pe.id, i, { done: !s.done, weight: s.weight || prev?.[i]?.weight || "", reps: s.reps || pe.sets[i].reps.split("-").pop() || "" })}
                    aria-pressed={s.done}
                    aria-label={`${t("set")} ${i + 1}`}
                    className={`grid size-11 place-items-center rounded-xl border ${s.done ? "border-gold bg-gold text-bg" : "border-line text-muted"}`}
                  >
                    <Check size={20} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button onClick={finish} disabled={done === 0} className="btn-gold mx-auto flex min-h-13 w-full max-w-xl text-lg">
          <Check size={20} /> {t("finishDay")}
        </button>
      </div>
      <Toast text={toast} />
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense>
      <Session />
    </Suspense>
  );
}

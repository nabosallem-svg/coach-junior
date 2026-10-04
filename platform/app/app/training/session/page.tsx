"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X, Shuffle, Loader2 } from "lucide-react";
import { aiTask } from "@/lib/aiTasks";
import { useStore, uid } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/hooks";
import { VideoBox } from "@/components/VideoBox";
import { Sheet, Toast } from "@/components/ui";
import type { Exercise, LoggedSet } from "@/lib/types";

function Session() {
  const { db, update } = useStore();
  const { t, lang, muscle } = useI18n();
  const me = useMe()!;
  const router = useRouter();
  const params = useSearchParams();
  const plan = me.active ? db.trainingPlans.find((p) => p.id === me.trainingPlanId) : undefined;
  const day = plan?.days.find((d) => d.id === params.get("day")) ?? plan?.days[0];
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [swap, setSwap] = useState<{ ex?: Exercise; why?: string; busy?: boolean; err?: string } | null>(null);

  if (!plan || !day) return null;
  const total = day.exercises.length;
  const done = doneIds.length;
  // Gemini picks a replacement from the coach's own exercise library
  const findSwap = async (ex: Exercise) => {
    setSwap({ busy: true });
    try {
      const library = db.exercises.filter((e) => e.id !== ex.id).sort((a, b) => Number(b.muscle === ex.muscle) - Number(a.muscle === ex.muscle)).slice(0, 60).map((e) => ({ id: e.id, name: e.name, muscle: e.muscle }));
      const r = await aiTask<{ exerciseId?: string; why?: string }>("swapExercise", { exercise: { name: ex.name, muscle: ex.muscle }, library }, lang);
      const alt = db.exercises.find((e) => e.id === r.exerciseId);
      setSwap(alt ? { ex: alt, why: r.why } : { err: t("aiNoSwap") });
    } catch (e) { setSwap({ err: (e as Error).message === "nokey" ? t("scanNoKey") : t("aiFailed") }); }
  };
  const toggle = (id: string) => setDoneIds((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  // the log keeps the per-set shape so history stays compatible; sets of a ticked exercise count as done
  const sets: Record<string, LoggedSet[]> = Object.fromEntries(day.exercises.map((pe) => [pe.id, pe.sets.map((x) => ({ weight: "", reps: x.reps, done: doneIds.includes(pe.id) }))]));

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
          <button onClick={() => router.replace("/app/training")} className="flex items-center gap-1 text-muted hover:text-text"><X size={20} /> {t("exitWorkout")}</button>
          <span className="num font-bold text-gold">{done}/{total}</span>
        </div>
        <h1 className="mt-2 text-2xl font-black">{day.name}</h1>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-card-hi"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(done / (total || 1)) * 100}%` }} /></div>
      </header>

      <div className="space-y-4 px-4 pt-5">
        {day.exercises.map((pe, n) => {
          const ex = db.exercises.find((e) => e.id === pe.exerciseId);
          if (!ex) return null;
          const isDone = doneIds.includes(pe.id);
          const reps = [...new Set(pe.sets.map((x) => x.reps))].join(" / ");
          return (
            <section key={pe.id} className={`card overflow-hidden ${isDone ? "border-line-gold" : ""}`}>
              {(ex.videoKey || ex.videoUrl) && <VideoBox ex={ex} />}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-baseline gap-2"><span className="num text-muted">{n + 1}</span><bdi className="text-lg font-bold">{ex.name}</bdi></p>
                    <p className="mt-1 font-bold text-text-2"><span className="num" dir="ltr">{pe.sets.length} × {reps}</span>{pe.rest && <span className="text-gold"> · {t("restN", { n: pe.rest })}</span>}</p>
                  </div>
                  <button
                    onClick={() => toggle(pe.id)}
                    aria-pressed={isDone}
                    aria-label={ex.name}
                    className={`grid size-13 shrink-0 place-items-center rounded-2xl border-2 transition-colors ${isDone ? "border-gold bg-gold text-bg" : "border-line text-muted hover:border-line-gold"}`}
                  >
                    <Check size={26} strokeWidth={3} />
                  </button>
                </div>
                {(pe.note || ex.cue) && <p className="mt-3 border-s-2 border-gold ps-3 text-sm text-text-2">{pe.note || ex.cue}</p>}
                {!(ex.videoKey || ex.videoUrl) && <p className="mt-2 text-xs text-muted">{t("noVideoShort")}</p>}
                <button onClick={() => findSwap(ex)} className="mt-3 flex items-center gap-1.5 text-sm font-bold text-muted hover:text-gold"><Shuffle size={15} /> {t("aiSwap")}</button>
              </div>
            </section>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button onClick={finish} disabled={done === 0} className="btn-gold mx-auto flex min-h-13 w-full max-w-xl text-lg">
          <Check size={20} /> {t("finishDay")}
        </button>
      </div>
      <Sheet open={!!swap} onClose={() => setSwap(null)} title={t("aiSwapTitle")}>
        {swap?.busy && <p className="flex items-center justify-center gap-2 py-6 font-bold text-gold"><Loader2 size={18} className="animate-spin" /> {t("aiBusy")}</p>}
        {swap?.err && <p className="py-4 text-center text-muted">{swap.err}</p>}
        {swap?.ex && (
          <div className="space-y-3">
            {(swap.ex.videoKey || swap.ex.videoUrl) && <VideoBox ex={swap.ex} />}
            <p className="text-lg font-bold"><bdi>{swap.ex.name}</bdi> <span className="text-sm font-medium text-muted">· {muscle(swap.ex.muscle)}</span></p>
            {swap.why && <p className="border-s-2 border-gold ps-3 text-sm text-text-2" dir="auto">{swap.why}</p>}
          </div>
        )}
      </Sheet>
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

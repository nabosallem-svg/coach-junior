"use client";

import Link from "next/link";
import { useState } from "react";
import { History, LineChart as ChartIcon, Play, Dumbbell, BookOpen } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/hooks";
import { fmtDate, prevSets } from "@/lib/calc";
import { LineChart } from "@/components/charts";
import { VideoBox } from "@/components/VideoBox";
import { Divider, Empty, Pills, Sheet } from "@/components/ui";

export default function Training() {
  const { db } = useStore();
  const { t, lang, muscle } = useI18n();
  const me = useMe()!;
  const plan = me.active ? db.trainingPlans.find((p) => p.id === me.trainingPlanId) : undefined;
  const myLogs = db.logs.filter((l) => l.clientId === me.id);
  const lastLog = [...myLogs].sort((a, b) => b.date.localeCompare(a.date))[0];
  const defaultDay = plan ? plan.days[(Math.max(-1, plan.days.findIndex((d) => d.id === lastLog?.dayId)) + 1) % plan.days.length]?.id : undefined;
  const [dayId, setDayId] = useState<string | undefined>(defaultDay);
  const [history, setHistory] = useState(false);
  const [chartFor, setChartFor] = useState<string | null>(null);
  const [cueFor, setCueFor] = useState<string | null>(null);

  if (!plan || plan.days.length === 0) return <Empty icon={<Dumbbell size={36} />} title={t("noPlanYet")} sub={t("noPlanYetSub")} />;
  const day = plan.days.find((d) => d.id === dayId) ?? plan.days[0];

  const chartPe = day.exercises.find((p) => p.id === chartFor);
  const chartPts = chartPe
    ? myLogs
        .filter((l) => l.sets[chartPe.id]?.some((s) => s.done && s.weight))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((l) => ({ x: new Date(l.date).getTime(), y: Math.max(...l.sets[chartPe.id].filter((s) => s.done).map((s) => parseFloat(s.weight) || 0)), label: fmtDate(l.date, lang, { day: "numeric", month: "short" }) }))
    : [];
  const cueEx = db.exercises.find((e) => e.id === day.exercises.find((p) => p.id === cueFor)?.exerciseId);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h1 className="h1">{plan.ownerId ? plan.name.replace(/ - [^-]+$/, "") : plan.name}</h1>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setHistory(true)} aria-label={t("history")} className="grid size-12 place-items-center rounded-full border border-line text-text-2 hover:border-line-gold"><History size={22} /></button>
        </div>
      </div>

      <div className="mt-5">
        <Pills value={day.id} onChange={setDayId} options={plan.days.map((d) => ({ value: d.id, label: d.name }))} />
      </div>

      <Divider>{t("exercises")}</Divider>

      <div className="space-y-8">
        {day.exercises.map((pe) => {
          const ex = db.exercises.find((e) => e.id === pe.exerciseId);
          if (!ex) return null;
          const prev = prevSets(myLogs, pe.id);
          return (
            <article key={pe.id}>
              {(ex.videoKey || ex.videoUrl) && <VideoBox ex={ex} />}
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold" dir="auto">{ex.name}</h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5"><span className="chip">{muscle(ex.muscle)}</span>{pe.rest && <span className="chip num border-line-gold text-gold">{t("restN", { n: pe.rest })}</span>}</div>
                </div>
                <div className="flex gap-1 text-text-2">
                  <button onClick={() => setChartFor(pe.id)} aria-label={t("progress")} className="grid size-10 place-items-center hover:text-gold"><ChartIcon size={22} /></button>
                  {ex.cue && <button onClick={() => setCueFor(pe.id)} aria-label={t("cue")} className="grid size-10 place-items-center hover:text-gold"><BookOpen size={22} /></button>}
                </div>
              </div>
              {(pe.note || ex.cue) && <p className="mt-3 border-s-2 border-gold ps-3 text-text-2">{pe.note || ex.cue}</p>}
              <table className="mt-3 w-full text-center">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-wider text-muted">
                    <th className="py-2 text-start font-bold">{t("set")}</th>
                    <th className="font-bold">{t("prev")}</th>
                    <th className="font-bold">{t("reps")}</th>
                    <th className="font-bold">{t("tempo")}</th>
                    <th className="font-bold">{t("rir")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pe.sets.map((s, i) => (
                    <tr key={i} className="text-text-2">
                      <td className="num py-3 text-start">{i + 1}</td>
                      <td className="num text-muted">{prev?.[i]?.done ? `${prev[i].weight}×${prev[i].reps}` : "—"}</td>
                      <td className="num text-text">{s.reps}</td>
                      <td className="num">{s.tempo || "—"}</td>
                      <td className="num">{s.rir || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          );
        })}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 flex justify-center">
        <Link href={`/app/training/session?day=${day.id}`} className="btn-gold pointer-events-auto min-h-13 rounded-full px-7 text-lg shadow-[0_10px_30px_rgba(0,0,0,.6)]">
          <Play size={20} /> {t("startDay")}
        </Link>
      </div>

      <Sheet open={history} onClose={() => setHistory(false)} title={t("history")}>
        {myLogs.length === 0 ? (
          <p className="py-6 text-center text-muted">{t("noHistory")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {[...myLogs].sort((a, b) => b.date.localeCompare(a.date)).map((l) => {
              const d = db.trainingPlans.find((p) => p.id === l.planId)?.days.find((x) => x.id === l.dayId);
              const sets = Object.values(l.sets).flat().filter((s) => s.done).length;
              return (
                <li key={l.id} className="flex justify-between py-3">
                  <span className="font-bold">{d?.name ?? "—"}</span>
                  <span className="text-sm text-muted">{fmtDate(l.date, lang)} · <span className="num">{sets}</span> {t("set")}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>

      <Sheet open={!!chartPe} onClose={() => setChartFor(null)} title={db.exercises.find((e) => e.id === chartPe?.exerciseId)?.name ?? ""}>
        {chartPts.length ? <LineChart points={chartPts} unit={t("kg")} /> : <p className="py-6 text-center text-muted">{t("noHistory")}</p>}
      </Sheet>

      <Sheet open={!!cueEx} onClose={() => setCueFor(null)} title={cueEx?.name ?? ""}>
        <p className="text-lg text-text-2">{cueEx?.cue}</p>
      </Sheet>
    </div>
  );
}

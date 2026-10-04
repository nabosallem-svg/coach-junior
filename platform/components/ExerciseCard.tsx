"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Trash2, Minus, Plus, Video, ChevronDown, HelpCircle, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Exercise, PlanExercise } from "@/lib/types";

const RESTS = ["60", "90", "120", "180"];

/**
 * One exercise in the coach's plan builder. Default view sets everything for all sets at once
 * (sets count, reps, rest); RIR and per-set values are opt-in.
 */
export function ExerciseCard({ pe, ex, index, count, onChange, onMove, onDelete }: {
  pe: PlanExercise; ex?: Exercise; index: number; count: number;
  onChange: (fn: (pe: PlanExercise) => void) => void; onMove: (dir: -1 | 1) => void; onDelete: () => void;
}) {
  const { t, muscle } = useI18n();
  const same = pe.sets.every((s) => s.reps === pe.sets[0]?.reps && (s.rir ?? "") === (pe.sets[0]?.rir ?? ""));
  const [perSet, setPerSet] = useState(!same);
  const [extra, setExtra] = useState(!!pe.sets[0]?.rir);
  const [help, setHelp] = useState(false);
  const first = pe.sets[0] ?? { reps: "" };
  const all = (k: "reps" | "rir", v: string) => onChange((p) => { p.sets.forEach((s) => { s[k] = v; }); });
  const setCount = (n: number) => onChange((p) => {
    n = Math.min(Math.max(n, 1), 10);
    while (p.sets.length < n) p.sets.push({ ...(p.sets.at(-1) ?? { reps: "8-12" }) });
    p.sets.length = n;
  });
  const field = "input num h-12 bg-bg text-center text-lg font-bold";

  return (
    <li className="card p-4 hover:border-line-gold">
      <div className="flex items-start gap-3">
        <span className="num grid size-8 shrink-0 place-items-center rounded-full bg-gold-soft text-sm font-black text-gold">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[17px] font-black leading-snug"><bdi>{ex?.name}</bdi>{(ex?.videoKey || ex?.videoUrl) && <Video size={15} className="shrink-0 text-gold" />}</p>
          {ex && <span className="mt-1 inline-block rounded-full border border-line-gold px-2.5 py-0.5 text-xs font-bold text-gold">{muscle(ex.muscle)}</span>}
        </div>
      </div>

      {/* sets count + reps + rest: the three things every exercise needs */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <span className="mb-1.5 block text-sm font-bold text-text-2">{t("setsCount")}</span>
          <div className="flex h-12 items-center justify-between rounded-xl border border-line bg-bg">
            <button type="button" aria-label="-" onClick={() => setCount(pe.sets.length - 1)} disabled={pe.sets.length <= 1} className="grid size-12 place-items-center text-gold disabled:opacity-30"><Minus size={18} /></button>
            <span className="num text-xl font-black">{pe.sets.length}</span>
            <button type="button" aria-label="+" onClick={() => setCount(pe.sets.length + 1)} className="grid size-12 place-items-center text-gold"><Plus size={18} /></button>
          </div>
        </div>
        {!perSet && (
          <label>
            <span className="mb-1.5 block text-sm font-bold text-text-2">{t("repsEach")}</span>
            <input dir="ltr" className={field} value={first.reps} placeholder="8-12" onChange={(e) => all("reps", e.target.value)} />
          </label>
        )}
      </div>

      <div className="mt-3">
        <span className="mb-1.5 block text-sm font-bold text-text-2">{t("restBetween")}</span>
        <div className="grid grid-cols-5 gap-1.5">
          {RESTS.map((r) => (
            <button type="button" key={r} onClick={() => onChange((p) => { p.rest = p.rest === r ? undefined : r; })} className={`h-10 rounded-xl border text-sm font-bold ${pe.rest === r ? "border-gold bg-gold text-bg" : "border-line text-text-2"}`}><span className="num">{r}</span> {t("sec")}</button>
          ))}
          <input dir="ltr" inputMode="numeric" aria-label={t("restBetween")} className={`input num h-10 px-1 text-center text-sm ${pe.rest && !RESTS.includes(pe.rest) ? "border-gold" : ""}`} placeholder={t("other")} value={pe.rest && !RESTS.includes(pe.rest) ? pe.rest : ""} onChange={(e) => onChange((p) => { p.rest = e.target.value.replace(/\D/g, "") || undefined; })} />
        </div>
      </div>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-sm font-bold text-text-2">{t("noteForClient")}</span>
        <input className="input border-s-2 border-s-gold/60 text-[15px] text-text-2" dir="auto" placeholder={ex?.cue || t("noteExample")} value={pe.note ?? ""} onChange={(e) => onChange((p) => { p.note = e.target.value || undefined; })} />
      </label>

      {/* optional extras */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setExtra(!extra)} className={`flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm font-bold ${extra ? "border-gold text-gold" : "border-line text-muted"}`}>
          <ChevronDown size={15} className={extra ? "rotate-180" : ""} /> {t("rir")}
        </button>
        <button type="button" onClick={() => setPerSet(!perSet)} className={`flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm font-bold ${perSet ? "border-gold text-gold" : "border-line text-muted"}`}>
          <ChevronDown size={15} className={perSet ? "rotate-180" : ""} /> {t("perSetDetails")}
        </button>
      </div>

      {extra && !perSet && (
        <div className="mt-3 rounded-xl bg-card-hi/60 p-3">
          <div className="grid grid-cols-2 gap-3">
            <label><span className="mb-1.5 block text-sm font-bold text-text-2">{t("rir")}</span><input dir="ltr" inputMode="numeric" className={field} placeholder="1" value={first.rir ?? ""} onChange={(e) => all("rir", e.target.value)} /></label>
          </div>
          <button type="button" onClick={() => setHelp(!help)} className="mt-2 flex items-center gap-1 text-xs font-bold text-muted"><HelpCircle size={14} /> {t("whatIsThis")}</button>
          {help && <p className="mt-1 text-sm leading-relaxed text-text-2">{t("rirHelp")}</p>}
        </div>
      )}

      {perSet && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 text-center text-[13px] font-bold text-text-2">
            <span>{t("set")}</span><span>{t("reps")}</span><span>{t("rir")}</span><span />
          </div>
          {pe.sets.map((s, si) => (
            <div key={si} className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2">
              <span className="num mx-auto grid size-7 place-items-center rounded-full bg-card-hi text-sm font-bold text-text-2">{si + 1}</span>
              <input dir="ltr" className="input num h-11 bg-bg px-1 py-0 text-center font-bold" value={s.reps} placeholder="8-12" onChange={(e) => onChange((p) => { p.sets[si].reps = e.target.value; })} />
              <input dir="ltr" className="input num h-11 bg-bg px-1 py-0 text-center font-bold" value={s.rir ?? ""} placeholder="1" onChange={(e) => onChange((p) => { p.sets[si].rir = e.target.value; })} />
              <button type="button" aria-label={t("delete")} disabled={pe.sets.length === 1} onClick={() => onChange((p) => { p.sets.splice(si, 1); })} className="grid size-8 place-items-center text-muted hover:text-danger disabled:opacity-30"><X size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {/* labelled actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-sm font-bold">
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-text-2 hover:bg-card-hi disabled:opacity-30"><ArrowUp size={16} /> {t("moveUp")}</button>
        <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-text-2 hover:bg-card-hi disabled:opacity-30"><ArrowDown size={16} /> {t("moveDown")}</button>
        <button type="button" onClick={() => { if (confirm(t("confirmDelete"))) onDelete(); }} className="ms-auto flex min-h-9 items-center gap-1 rounded-lg px-2 text-danger/90 hover:bg-danger/10"><Trash2 size={16} /> {t("removeExercise")}</button>
      </div>
    </li>
  );
}

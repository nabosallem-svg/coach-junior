"use client";

import { useId } from "react";
import { Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { fmtDate } from "@/lib/calc";
import type { Measurement } from "@/lib/types";

/** smooth path through the points (Catmull-Rom as cubic Béziers) */
function smooth(p: [number, number][]) {
  if (p.length < 2) return "";
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const [a, b, c, e] = [p[i - 1] ?? p[i], p[i], p[i + 1], p[i + 2] ?? p[i + 1]];
    d += ` C${b[0] + (c[0] - a[0]) / 6},${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6},${c[1] - (e[1] - b[1]) / 6} ${c[0]},${c[1]}`;
  }
  return d;
}

/** the trainee's weight at a glance: now, start, change, and a clean trend line */
export function WeightCard({ readings, goal, onLog, label }: { readings: Measurement[]; goal?: string; onLog?: () => void; label?: string }) {
  const { t, lang } = useI18n();
  const gid = useId();
  const ms = [...readings].sort((a, b) => a.date.localeCompare(b.date));
  const first = ms[0], last = ms.at(-1);
  const change = first && last ? +(last.weight - first.weight).toFixed(1) : 0;
  // losing is the win unless the trainee is bulking
  const good = /تضخيم|bulk/i.test(goal ?? "") ? change >= 0 : change <= 0;

  const W = 320, H = 96;
  const ys = ms.map((m) => m.weight);
  const lo = Math.min(...ys), hi = Math.max(...ys), span = Math.max(hi - lo, 1);
  const t0 = first ? new Date(first.date).getTime() : 0, tx = Math.max(1, (last ? new Date(last.date).getTime() : 0) - t0);
  const pts: [number, number][] = ms.map((m) => [+(6 + ((new Date(m.date).getTime() - t0) / tx) * (W - 12)).toFixed(1), +(8 + (1 - (m.weight - lo) / span) * (H - 16)).toFixed(1)]);
  const line = smooth(pts);
  const end = pts.at(-1);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{label ?? t("weightNow")}</p>
          <p className="num text-5xl font-black leading-tight">{last ? last.weight : "—"} {last && <span className="text-xl font-bold text-text-2">{t("kg")}</span>}</p>
        </div>
        {ms.length > 1 && change !== 0 && (
          <span className={`mt-1 flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ${good ? "bg-ok/15 text-ok" : "bg-gold-soft text-gold"}`}>
            {change < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
            {t(change < 0 ? "lostKg" : "gainedKg", { n: Math.abs(change) })}
          </span>
        )}
      </div>

      {ms.length > 1 && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" style={{ direction: "ltr" }} aria-hidden>
            <defs>
              <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--color-gold)" stopOpacity=".25" />
                <stop offset="1" stopColor="var(--color-gold)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${line} L${end![0]},${H} L${pts[0][0]},${H} Z`} fill={`url(#${gid})`} />
            <path d={line} pathLength={1} className="anim-draw" fill="none" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
            <circle cx={end![0]} cy={end![1]} r="5" fill="var(--color-gold)" stroke="var(--color-bg)" strokeWidth="2" />
          </svg>
          <div className="mt-2 flex justify-between text-sm">
            <span><span className="text-muted">{t("startedAt")} </span><b className="num">{first!.weight}</b> <span className="text-xs text-muted">· {fmtDate(first!.date, lang, { day: "numeric", month: "short" })}</span></span>
            <span><span className="text-muted">{t("nowAt")} </span><b className="num">{last!.weight}</b></span>
          </div>
        </>
      )}
      {ms.length <= 1 && <p className="mt-2 text-sm text-muted">{t("weighWeekly")}</p>}

      {onLog && <button onClick={onLog} className="btn-gold mt-4 w-full"><Plus size={18} /> {t("logWeight")}</button>}
    </div>
  );
}

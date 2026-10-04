"use client";

import { useId } from "react";

type Point = { x: number; y: number; label: string };

/** small dependency-free line chart; always drawn left-to-right (time axis) */
export function LineChart({ points, unit = "", height = 200 }: { points: Point[]; unit?: string; height?: number }) {
  const gid = useId();
  const W = 340;
  const H = height;
  const pad = { l: 40, r: 12, t: 12, b: 26 };
  if (points.length === 0) return null;
  const ys = points.map((p) => p.y);
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  if (max - min < 2) { min -= 1; max += 1; }
  const span = max - min;
  min -= span * 0.1; max += span * 0.1;
  const x0 = points[0].x;
  const xSpan = Math.max(1, points[points.length - 1].x - x0);
  const sx = (x: number) => pad.l + ((x - x0) / xSpan) * (W - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - (y - min) / (max - min)) * (H - pad.t - pad.b);
  const ticks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4).reverse();
  const path = points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const area = `${path} L${sx(points[points.length - 1].x)},${H - pad.b} L${sx(x0)},${H - pad.b} Z`;
  const labelIdx = points.length <= 4 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ direction: "ltr" }} role="img" aria-label={`${last.y} ${unit}`}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--color-gold)" stopOpacity=".28" />
          <stop offset="1" stopColor="var(--color-gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} stroke="var(--color-line)" />
          <text x={pad.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">{t.toFixed(1)}</text>
        </g>
      ))}
      {points.length > 1 && <path d={area} fill={`url(#${gid})`} />}
      {points.length > 1 && <path d={path} fill="none" stroke="var(--color-gold)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={i === points.length - 1 ? 4.5 : 2.5} fill={i === points.length - 1 ? "var(--color-gold)" : "var(--color-bg)"} stroke="var(--color-gold)" strokeWidth="2" />
      ))}
      {labelIdx.map((i) => (
        <text key={i} x={sx(points[i].x)} y={H - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="11" fill="var(--color-muted)">
          {points[i].label}
        </text>
      ))}
    </svg>
  );
}

/** calories ring split by macro calories (carbs 4, fat 9, protein 4) */
export function MacroRing({ kcal, c, f, p, label }: { kcal: number; c: number; f: number; p: number; label: string }) {
  const parts = [
    { v: c * 4, color: "var(--color-carbs)" },
    { v: f * 9, color: "var(--color-fat)" },
    { v: p * 4, color: "var(--color-protein)" },
  ];
  const total = parts.reduce((a, b) => a + b.v, 0) || 1;
  const R = 52;
  const C = 2 * Math.PI * R;
  const gap = 4;
  let offset = 0;
  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
        <circle cx="64" cy="64" r={R} fill="none" stroke="var(--color-card-hi)" strokeWidth="12" />
        {parts.map((part, i) => {
          const len = Math.max(0, (part.v / total) * C - gap);
          const el = <circle key={i} cx="64" cy="64" r={R} fill="none" stroke={part.color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${len} ${C}`} strokeDashoffset={-offset} />;
          offset += (part.v / total) * C;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="num text-3xl font-black">{Math.round(kcal)}</div>
          <div className="text-sm text-muted">{label}</div>
        </div>
      </div>
    </div>
  );
}

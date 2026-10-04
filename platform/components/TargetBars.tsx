"use client";

import { useI18n } from "@/lib/i18n";
import type { Macros } from "@/lib/calc";

/** calories + macros as progress bars: `have` against `target`; `left` shows what remains instead of the total */
export function TargetBars({ have, target, left = false }: { have: Macros; target: Macros; left?: boolean }) {
  const { t } = useI18n();
  const rows = [
    { k: "kcal" as const, a: have.kcal, b: target.kcal, bar: "bg-gold", unit: "" },
    { k: "protein" as const, a: have.p, b: target.p, bar: "bg-protein", unit: t("gram") },
    { k: "carbs" as const, a: have.c, b: target.c, bar: "bg-carbs", unit: t("gram") },
    { k: "fat" as const, a: have.f, b: target.f, bar: "bg-fat", unit: t("gram") },
  ];
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const over = r.a > r.b * 1.05;
        return (
          <div key={r.k}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-bold text-text-2">{t(r.k)}</span>
              <span dir={left ? undefined : "ltr"} className={`num ${over ? "text-danger" : "text-muted"}`}>
                {left ? t("leftOf", { a: Math.max(0, Math.round(r.b - r.a)), b: Math.round(r.b) }) : `${Math.round(r.a)} / ${Math.round(r.b)}`} {r.unit}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-card-hi"><div className={`h-full rounded-full ${over ? "bg-danger" : r.bar}`} style={{ width: `${Math.min(100, (r.a / (r.b || 1)) * 100)}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

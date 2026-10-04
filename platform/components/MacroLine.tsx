"use client";

import type { Macros } from "@/lib/calc";
import { useI18n } from "@/lib/i18n";

/** carbs / fat / protein in grams; letters and unit follow the UI language */
export function MacroLine({ m, className = "" }: { m: Macros; className?: string }) {
  const { t } = useI18n();
  const g = (key: "mC" | "mF" | "mP", v: number) => <bdi className="whitespace-nowrap">{t(key)} {Math.round(v)}{t("gram")}</bdi>;
  return (
    <span className={`inline-flex flex-wrap gap-x-2 ${className}`}>
      <span className="text-carbs">{g("mC", m.c)}</span>
      <span className="text-fat">{g("mF", m.f)}</span>
      <span className="text-protein">{g("mP", m.p)}</span>
    </span>
  );
}

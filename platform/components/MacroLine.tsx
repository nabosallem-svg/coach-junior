import type { Macros } from "@/lib/calc";

export function MacroLine({ m, className = "" }: { m: Macros; className?: string }) {
  return (
    <span className={`num inline-flex gap-2 ${className}`}>
      <span className="text-carbs">C {Math.round(m.c)}g</span>
      <span className="text-fat">F {Math.round(m.f)}g</span>
      <span className="text-protein">P {Math.round(m.p)}g</span>
    </span>
  );
}

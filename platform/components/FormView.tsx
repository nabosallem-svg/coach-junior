"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { FormTemplate } from "@/lib/types";

/** renders a form for filling (onSubmit) or read-only with answers */
export function FormView({ form, answers, onSubmit }: { form: FormTemplate; answers?: Record<string, string>; onSubmit?: (a: Record<string, string>) => void }) {
  const { t } = useI18n();
  const [a, setA] = useState<Record<string, string>>(answers ?? {});
  const [err, setErr] = useState(false);
  const ro = !onSubmit;
  const set = (id: string, v: string) => setA((p) => ({ ...p, [id]: v }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (form.questions.some((q) => !a[q.id]?.trim())) return setErr(true);
        onSubmit?.(a);
      }}
    >
      {form.questions.map((q, i) => (
        <fieldset key={q.id} className="card p-4">
          <legend className="sr-only">{q.label}</legend>
          <p className="mb-3 flex gap-2 font-bold"><span className="num grid size-6 shrink-0 place-items-center rounded-full bg-gold-soft text-xs text-gold">{i + 1}</span><span>{q.label}</span></p>
          {ro ? (
            <p className="text-text-2">{answers?.[q.id] || "—"}</p>
          ) : q.type === "text" ? (
            <textarea className="input min-h-24" value={a[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} />
          ) : q.type === "number" ? (
            <input className="input num text-start" inputMode="decimal" value={a[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} />
          ) : q.type === "scale" ? (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10" dir="ltr">
              {Array.from({ length: 10 }, (_, n) => String(n + 1)).map((v) => (
                <button type="button" key={v} onClick={() => set(q.id, v)} className={`num h-11 rounded-xl border font-bold ${a[q.id] === v ? "border-gold bg-gold text-bg" : "border-line text-text-2"}`}>{v}</button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {q.options?.map((o) => (
                <button type="button" key={o} onClick={() => set(q.id, o)} className={`rounded-full border px-4 py-2 font-bold ${a[q.id] === o ? "border-gold bg-gold text-bg" : "border-line text-text-2"}`}>{o}</button>
              ))}
            </div>
          )}
        </fieldset>
      ))}
      {!ro && (
        <>
          {err && <p className="text-center text-sm text-danger">{t("required")}</p>}
          <button className="btn-gold min-h-13 w-full text-lg">{t("submit")}</button>
        </>
      )}
    </form>
  );
}

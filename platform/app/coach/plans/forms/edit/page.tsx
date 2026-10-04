"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { BuilderHeader } from "@/components/BuilderHeader";
import { Field } from "@/components/ui";
import type { FormTemplate, QuestionType } from "@/lib/types";

function FormBuilder() {
  const id = useSearchParams().get("id") ?? "";
  const { db, update } = useStore();
  const { t } = useI18n();
  const form = db.forms.find((f) => f.id === id);
  if (!form) return null;
  const edit = (fn: (f: FormTemplate) => void) => update((d) => fn(d.forms.find((f) => f.id === id)!));
  const types: { v: QuestionType; k: "qText" | "qNumber" | "qChoice" | "qScale" }[] = [
    { v: "text", k: "qText" }, { v: "number", k: "qNumber" }, { v: "choice", k: "qChoice" }, { v: "scale", k: "qScale" },
  ];

  return (
    <div>
      <BuilderHeader backTab="forms" label={t("formTitle")} value={form.title} onChange={(v) => edit((f) => { f.title = v; })} onDelete={() => update((d) => {
        d.forms = d.forms.filter((f) => f.id !== id);
        d.assignments = d.assignments.filter((a) => a.formId !== id || a.status === "submitted");
      })} />

      <label className="card mt-4 flex items-center gap-3 p-3">
        <input type="checkbox" className="size-5 accent-[var(--color-gold)]" checked={!!form.starter} onChange={(e) => edit((f) => { f.starter = e.target.checked; })} />
        <span className="text-sm font-bold">{t("starterForm")}</span>
      </label>

      <ol className="mt-5 space-y-3">
        {form.questions.map((q, i) => (
          <li key={q.id} className="card space-y-3 p-4">
            <div className="flex items-center gap-2">
              <span className="num text-gold">{i + 1}.</span>
              <input aria-label={t("question")} className="input" dir="auto" placeholder={t("question")} value={q.label} onChange={(e) => edit((f) => { f.questions[i].label = e.target.value; })} />
              <button aria-label={t("delete")} onClick={() => edit((f) => { f.questions.splice(i, 1); })} className="grid size-11 shrink-0 place-items-center rounded-xl border border-line text-muted hover:text-danger"><Trash2 size={16} /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {types.map(({ v, k }) => (
                <button key={v} onClick={() => edit((f) => { f.questions[i].type = v; if (v === "choice" && !f.questions[i].options) f.questions[i].options = []; })} className={`rounded-full border px-3.5 py-1.5 text-sm font-bold ${q.type === v ? "border-gold bg-gold text-bg" : "border-line text-text-2"}`}>{t(k)}</button>
              ))}
            </div>
            {q.type === "choice" && (
              <Field label={t("optionsComma")}>
                <input className="input" dir="auto" defaultValue={q.options?.join("، ")} onBlur={(e) => edit((f) => { f.questions[i].options = e.target.value.split(/[,،]/).map((s) => s.trim()).filter(Boolean); })} />
              </Field>
            )}
          </li>
        ))}
      </ol>
      <button onClick={() => edit((f) => f.questions.push({ id: uid("q"), type: "text", label: "" }))} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-gold p-4 font-bold text-gold hover:bg-gold-soft"><Plus size={20} /> {t("addQuestion")}</button>
    </div>
  );
}

export default function FormBuilderPage() {
  return <Suspense><FormBuilder /></Suspense>;
}

"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/hooks";
import { FormView } from "@/components/FormView";

function FillForm() {
  const id = useSearchParams().get("id") ?? "";
  const { db, update } = useStore();
  const { t, dir } = useI18n();
  const me = useMe()!;
  const router = useRouter();
  const a = db.assignments.find((x) => x.id === id && x.clientId === me.id);
  const form = db.forms.find((f) => f.id === a?.formId);
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;
  if (!a || !form) return null;

  return (
    <div>
      <Link href="/app/forms" className="mb-4 inline-flex items-center gap-1.5 text-muted hover:text-text"><Back size={18} /> {t("forms")}</Link>
      <h1 className="h1 mb-5">{form.title}</h1>
      <FormView
        form={form}
        answers={a.answers}
        onSubmit={
          a.status === "pending"
            ? (answers) => {
                update((d) => {
                  const x = d.assignments.find((y) => y.id === id)!;
                  x.status = "submitted";
                  x.answers = answers;
                  x.submittedAt = new Date().toISOString();
                  // a weight answer also lands in the progress chart
                  const wq = form.questions.find((q) => q.type === "number" && /وزن|weight/i.test(q.label));
                  const w = wq ? parseFloat(answers[wq.id]) : NaN;
                  if (w) {
                    const today = new Date().toISOString().slice(0, 10);
                    d.measurements = d.measurements.filter((m) => !(m.clientId === me.id && m.date === today));
                    d.measurements.push({ id: `ms-${id}`, clientId: me.id, date: today, weight: w });
                  }
                });
                router.replace(form.starter ? "/app" : "/app/forms");
              }
            : undefined
        }
      />
    </div>
  );
}

export default function FillFormPage() {
  return <Suspense><FillForm /></Suspense>;
}

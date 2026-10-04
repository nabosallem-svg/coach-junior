"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, MessageCircle, Send, CalendarPlus, ClipboardList, Phone, KeyRound } from "lucide-react";
import { useStore, uid, genPassword } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { daysLeft, fmtDate } from "@/lib/calc";
import { LineChart } from "@/components/charts";
import { FormView } from "@/components/FormView";
import { Avatar, Field, SectionLabel, Sheet, Toast } from "@/components/ui";
import { waLink } from "@/lib/wa";
import { Creds } from "@/components/Creds";
import { ActivateSheet } from "@/components/Activate";

function ClientDetail() {
  const id = useSearchParams().get("id") ?? "";
  const { db, update } = useStore();
  const { t, lang, dir } = useI18n();
  const [viewAs, setViewAs] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [newPw, setNewPw] = useState<string | null>(null);
  const [pwEdit, setPwEdit] = useState<string | null>(null);
  const [act, setAct] = useState(false);
  const c = db.clients.find((x) => x.id === id);
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;
  if (!c) return null;

  const left = daysLeft(c.subEnd);
  const ms = db.measurements.filter((m) => m.clientId === id).sort((a, b) => a.date.localeCompare(b.date));
  const assigns = db.assignments.filter((a) => a.clientId === id).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const logs = db.logs.filter((l) => l.clientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const viewing = assigns.find((a) => a.id === viewAs);
  const flash = (s: string) => { setToast(s); setTimeout(() => setToast(null), 1400); };
  const set = (patch: Partial<typeof c>) => update((d) => { Object.assign(d.clients.find((x) => x.id === id)!, patch); });

  const extend = () => {
    const base = new Date(Math.max(Date.now(), new Date(c.subEnd).getTime()));
    base.setMonth(base.getMonth() + 1);
    set({ subEnd: base.toISOString().slice(0, 10) });
    flash(t("saved"));
  };

  return (
    <div>
      <Link href="/coach/clients" className="mb-4 inline-flex items-center gap-1.5 text-muted hover:text-text"><Back size={18} /> {t("clients")}</Link>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={c.name} size={60} />
        <div className="flex-1">
          <h1 className="text-2xl font-black">{c.name}</h1>
          <p className="text-muted">{c.goal}</p>
        </div>
        <div className="flex gap-2">
          <a href={waLink(c.phone)} target="_blank" rel="noopener" className="btn-ghost"><MessageCircle size={18} /> {t("whatsapp")}</a>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{t("subscription")}</h2>
            <span className={`num rounded-full px-2.5 py-1 text-xs font-bold ${c.pending || !c.active ? "bg-card-hi text-muted" : left <= 7 ? "bg-danger/15 text-danger" : "bg-gold-soft text-gold"}`}>{c.pending ? t("requests") : !c.active ? t("paused") : left >= 0 ? t("daysLeftN", { n: left }) : t("expiredN", { n: -left })}</span>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div><dt className="text-muted">{t("package")}</dt><dd className="num font-bold">{c.packageName}</dd></div>
            <div><dt className="text-muted">{t("start")}</dt><dd className="font-bold">{fmtDate(c.subStart, lang)}</dd></div>
            <div><dt className="text-muted">{t("end")}</dt><dd className="font-bold">{fmtDate(c.subEnd, lang)}</dd></div>
          </dl>
          <div className="mt-4 flex gap-2">
            <button onClick={extend} disabled={c.pending} className="btn-gold flex-1"><CalendarPlus size={18} /> {t("oneMonth")}</button>
            {c.pending ? (
              <button onClick={() => setAct(true)} className="btn-ghost flex-1">{t("activate")}</button>
            ) : (
              <button onClick={() => set({ active: !c.active })} className="btn-quiet flex-1">{c.active ? t("pause") : t("resume")}</button>
            )}
          </div>
          {pwEdit === null ? (
            <button onClick={() => setPwEdit(genPassword())} className="mt-3 flex items-center gap-1.5 text-sm font-bold text-gold"><KeyRound size={15} /> {t("resetPassword")}</button>
          ) : (
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const pw = pwEdit.trim(); if (pw.length < 6) return flash(t("minChars")); set({ password: pw }); setPwEdit(null); setNewPw(pw); }}>
              <input className="input num min-w-0 flex-1 text-start" dir="ltr" value={pwEdit} onChange={(e) => setPwEdit(e.target.value)} autoFocus />
              <button className="btn-gold shrink-0 px-4">{t("save")}</button>
              <button type="button" onClick={() => setPwEdit(null)} className="btn-quiet shrink-0 px-3">{t("cancel")}</button>
            </form>
          )}
        </section>

        <section className="card space-y-3 p-4">
          <Field label={t("trainingPlan")}>
            <select className="input" value={c.trainingPlanId ?? ""} onChange={(e) => { set({ trainingPlanId: e.target.value || undefined }); flash(t("saved")); }}>
              <option value="">{t("none")}</option>
              {db.trainingPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label={t("nutritionPlan")}>
            <select className="input" value={c.nutritionPlanId ?? ""} onChange={(e) => { set({ nutritionPlanId: e.target.value || undefined }); flash(t("saved")); }}>
              <option value="">{t("none")}</option>
              {db.nutritionPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </section>
      </div>

      <SectionLabel>{t("weight")}</SectionLabel>
      <div className="card p-4">
        {ms.length ? (
          <>
            <p className="num text-3xl font-black">{ms.at(-1)!.weight} <span className="text-lg">{t("kg")}</span></p>
            <LineChart points={ms.map((m) => ({ x: new Date(m.date).getTime(), y: m.weight, label: fmtDate(m.date, lang, { day: "numeric", month: "short" }) }))} height={180} />
          </>
        ) : <p className="text-muted">—</p>}
      </div>

      <div className="mb-3 mt-7 flex items-center justify-between">
        <h2 className="label">{t("forms")}</h2>
      </div>
      <ul className="card divide-y divide-line">
        {assigns.length === 0 && <li className="p-4 text-muted">—</li>}
        {assigns.map((a) => {
          const f = db.forms.find((x) => x.id === a.formId);
          return (
            <li key={a.id}>
              <button
                disabled={a.status === "pending"}
                onClick={() => { setViewAs(a.id); if (!a.reviewed) update((d) => { d.assignments.find((x) => x.id === a.id)!.reviewed = true; }); }}
                className="flex w-full items-center gap-3 p-3 text-start disabled:cursor-default"
              >
                <ClipboardList size={18} className="text-gold" />
                <span className="flex-1">
                  <span className="flex items-center gap-2 font-bold">{f?.title}{a.status === "submitted" && !a.reviewed && <span className="size-2 rounded-full bg-gold" />}</span>
                  <span className="text-sm text-muted">{a.status === "pending" ? t("sentOn", { d: fmtDate(a.sentAt, lang) }) : t("submittedOn", { d: fmtDate(a.submittedAt!, lang) })}</span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${a.status === "pending" ? "bg-card-hi text-muted" : "bg-gold-soft text-gold"}`}>{t(a.status)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <SectionLabel>{t("workouts")}</SectionLabel>
      <ul className="card divide-y divide-line">
        {logs.length === 0 && <li className="p-4 text-muted">{t("noHistory")}</li>}
        {logs.map((l) => {
          const plan = db.trainingPlans.find((p) => p.id === l.planId);
          const day = plan?.days.find((x) => x.id === l.dayId);
          return (
            <li key={l.id} className="p-3">
              <div className="flex justify-between"><b>{day?.name}</b><span className="text-sm text-muted">{fmtDate(l.date, lang)}</span></div>
              <ul className="mt-1 space-y-0.5 text-sm text-text-2">
                {Object.entries(l.sets).filter(([, s]) => s.some((x) => x.done)).map(([peId, s]) => {
                  const pe = day?.exercises.find((x) => x.id === peId);
                  const ex = db.exercises.find((e) => e.id === pe?.exerciseId);
                  return <li key={peId}><span dir="auto">{ex?.name}</span>: <span className="num">{s.filter((x) => x.done).map((x) => `${x.weight}×${x.reps}`).join("  ")}</span></li>;
                })}
              </ul>
            </li>
          );
        })}
      </ul>


      <Sheet open={!!viewing} onClose={() => setViewAs(null)} title={db.forms.find((f) => f.id === viewing?.formId)?.title ?? ""}>
        {viewing && <FormView form={db.forms.find((f) => f.id === viewing.formId)!} answers={viewing.answers} />}
      </Sheet>
      <ActivateSheet client={act ? c : null} onClose={() => setAct(false)} />
      <Creds client={newPw ? c : null} password={newPw ?? ""} onClose={() => setNewPw(null)} />
      <Toast text={toast} />
    </div>
  );
}

export default function ClientDetailPage() {
  return <Suspense><ClientDetail /></Suspense>;
}

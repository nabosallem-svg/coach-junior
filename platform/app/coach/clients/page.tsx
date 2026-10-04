"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useStore, uid, genPassword, normPhone } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { daysLeft } from "@/lib/calc";
import { Avatar, Field, Sheet } from "@/components/ui";
import { Creds } from "@/components/Creds";
import { ActivateSheet, PendingList, PACKAGES } from "@/components/Activate";
import type { Client } from "@/lib/types";


function Clients() {
  const { db, update } = useStore();
  const { t, dir } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [add, setAdd] = useState(false);
  const blank = () => ({ name: "", phone: "", goal: "", pkg: "3+1", pw: genPassword(), tp: "", np: "" });
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState("");
  const [act, setAct] = useState<Client | null>(null);
  const [created, setCreated] = useState<{ id: string; pw: string } | null>(null);
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  useEffect(() => { if (params.get("add")) setAdd(true); }, [params]);

  const list = db.clients.filter((c) => !c.pending && (c.name.includes(q) || c.phone.includes(q)));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="h1">{t("clients")}</h1>
        <button className="btn-gold" onClick={() => setAdd(true)}><UserPlus size={18} /> {t("addClient")}</button>
      </div>

      <PendingList onActivate={setAct} />

      <div className="relative mt-5">
        <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input ps-10" placeholder={t("searchClients")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
        {list.map((c) => {
          const left = daysLeft(c.subEnd);
          return (
            <li key={c.id}>
              <Link href={`/coach/clients/view?id=${c.id}`} className="card flex items-center gap-3 p-3 hover:border-line-gold">
                <Avatar name={c.name} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-bold">{c.name}</span>
                  <span className="block truncate text-sm text-muted">{c.goal} · <span className="num">{c.packageName}</span></span>
                </span>
                <span className={`num shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${!c.active ? "bg-card-hi text-muted" : left <= 7 ? "bg-danger/15 text-danger" : "bg-gold-soft text-gold"}`}>
                  {!c.active ? t("paused") : left >= 0 ? t("daysLeftN", { n: left }) : t("expiredN", { n: -left })}
                </span>
                <Chevron size={18} className="text-muted" />
              </Link>
            </li>
          );
        })}
      </ul>

      <Sheet open={add} onClose={() => { setAdd(false); setErr(""); router.replace("/coach/clients"); }} title={t("addClient")}>
        <p className="mb-4 text-sm text-muted">{t("addClientNote")}</p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.pw.trim().length < 6) return setErr(t("minChars"));
            if (db.clients.some((x) => normPhone(x.phone) === normPhone(form.phone))) return setErr(t("phoneUsed"));
            setErr("");
            const months = PACKAGES.find((p) => p.label === form.pkg)!.months;
            const start = new Date();
            const end = new Date(start);
            end.setMonth(end.getMonth() + months);
            const id = uid("c");
            const pw = form.pw.trim();
            update((d) => {
              d.clients.push({ id, name: form.name.trim(), phone: form.phone.trim(), password: pw, goal: form.goal.trim(), packageName: form.pkg, subStart: start.toISOString().slice(0, 10), subEnd: end.toISOString().slice(0, 10), active: true, trainingPlanId: form.tp || undefined, nutritionPlanId: form.np || undefined });
              const starter = d.forms.find((f) => f.id === "fm-start");
              if (starter) d.assignments.push({ id: uid("as"), formId: starter.id, clientId: id, sentAt: start.toISOString(), status: "pending" });
            });
            setForm(blank());
            setAdd(false);
            setCreated({ id, pw });
          }}
        >
          <Field label={t("name")}><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label={t("phone")}><input className="input num text-start" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="+20" /></Field>
          <Field label={t("goal")}><input className="input" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
          <Field group label={`${t("package")} (${t("months")})`}>
            <div className="grid grid-cols-4 gap-2">
              {PACKAGES.map((p) => (
                <button type="button" key={p.label} onClick={() => setForm({ ...form, pkg: p.label })} className={`num h-11 rounded-xl border font-bold ${form.pkg === p.label ? "border-gold bg-gold text-bg" : "border-line text-text-2"}`}>{p.label}</button>
              ))}
            </div>
          </Field>
          <Field label={t("password")}>
            <div className="flex gap-2">
              <input className="input num flex-1 text-start" dir="ltr" value={form.pw} onChange={(e) => setForm({ ...form, pw: e.target.value })} required />
              <button type="button" onClick={() => setForm({ ...form, pw: genPassword() })} className="btn-quiet shrink-0 whitespace-nowrap px-3 text-sm">{t("generate")}</button>
            </div>
          </Field>
          <Field label={t("trainingPlan")}>
            <select className="input" value={form.tp} onChange={(e) => setForm({ ...form, tp: e.target.value })}>
              <option value="">{t("none")}</option>
              {db.trainingPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label={t("nutritionPlan")}>
            <select className="input" value={form.np} onChange={(e) => setForm({ ...form, np: e.target.value })}>
              <option value="">{t("none")}</option>
              {db.nutritionPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          {err && <p className="text-center text-sm font-bold text-danger">{err}</p>}
          <button className="btn-gold min-h-13 w-full text-lg">{t("add")}</button>
        </form>
      </Sheet>
      <ActivateSheet client={act} onClose={() => setAct(null)} />
      <Creds client={db.clients.find((c) => c.id === created?.id) ?? null} password={created?.pw ?? ""} onClose={() => { const id = created?.id; setCreated(null); router.push(`/coach/clients/view?id=${id}`); }} />
    </div>
  );
}

export default function ClientsPage() {
  return <Suspense><Clients /></Suspense>;
}

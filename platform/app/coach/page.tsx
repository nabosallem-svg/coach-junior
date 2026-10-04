"use client";

import Link from "next/link";
import { Users, CalendarClock, Dumbbell, Camera, Upload, UserPlus, ChevronLeft, ChevronRight, Search, MessageCircle, ClipboardList, Moon, ClipboardCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { daysLeft, fmtDate } from "@/lib/calc";
import { waLink } from "@/lib/wa";
import { Avatar, SectionLabel, Toast } from "@/components/ui";
import { ActivateSheet, PendingList } from "@/components/Activate";
import { useState } from "react";
import type { Client } from "@/lib/types";

const DAY = 864e5;

export default function CoachHome() {
  const { db } = useStore();
  const { t, lang, dir } = useI18n();
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const [act, setAct] = useState<Client | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const now = Date.now();
  const ago = (iso: string) => (now - new Date(iso).getTime()) / DAY;
  const clients = db.clients.filter((c) => !c.pending);
  const active = clients.filter((c) => c.active && daysLeft(c.subEnd) >= 0);
  const first = (c: Client) => c.name.split(" ")[0];
  const lastLog = (id: string) => db.logs.filter((l) => l.clientId === id).sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
  const weekLogs = db.logs.filter((l) => ago(l.date) < 7);
  const newPhotos = (db.photos ?? []).filter((p) => ago(p.date) < 7);
  const photoClients = [...new Set(newPhotos.map((p) => p.clientId))];

  // the coach's morning list, most urgent first; one reason per trainee
  type Item = { c: Client; text: string; tone: "red" | "gold" | "muted"; icon: typeof Users; wa?: string };
  const items: Item[] = [];
  for (const c of clients.filter((x) => x.active && daysLeft(x.subEnd) <= 7).sort((a, b) => daysLeft(a.subEnd) - daysLeft(b.subEnd))) {
    const n = daysLeft(c.subEnd);
    items.push({ c, text: n >= 0 ? t("daysLeftN", { n }) : t("expiredN", { n: -n }), tone: "red", icon: CalendarClock, wa: t("waRenew", { name: first(c), n: Math.max(n, 0) }) });
  }
  for (const a of db.assignments.filter((x) => x.status === "submitted" && !x.reviewed && db.forms.find((f) => f.id === x.formId)?.starter)) {
    const c = clients.find((x) => x.id === a.clientId);
    if (c) items.push({ c, text: t("formArrived"), tone: "gold", icon: ClipboardCheck });
  }
  for (const id of photoClients) { const c = clients.find((x) => x.id === id); if (c) items.push({ c, text: t("sentPhotos"), tone: "gold", icon: Camera }); }
  for (const c of active) {
    const pendingForm = db.assignments.find((a) => a.clientId === c.id && a.status === "pending" && ago(a.sentAt) >= 1);
    const last = lastLog(c.id);
    if (pendingForm) items.push({ c, text: t("formNotFilled"), tone: "muted", icon: ClipboardCheck, wa: t("waForm", { name: first(c) }) });
    else if (!c.trainingPlanId || !c.nutritionPlanId) items.push({ c, text: t("noPlanAssigned"), tone: "muted", icon: ClipboardList });
    else if (ago(c.subStart) >= 7 && (!last || ago(last) >= 7)) items.push({ c, text: last ? t("noWorkoutDays", { n: Math.floor(ago(last)) }) : t("noWorkoutYet"), tone: "muted", icon: Moon, wa: t("waNudge", { name: first(c) }) });
  }
  const todo = items.filter((it, i, arr) => arr.findIndex((x) => x.c.id === it.c.id) === i);

  const stats = [
    { label: t("activeClients"), n: active.length, icon: Users, href: "/coach/clients" },
    { label: t("expiringSoon"), n: clients.filter((c) => c.active && daysLeft(c.subEnd) <= 7).length, icon: CalendarClock, href: "/coach/clients" },
    { label: t("workoutsThisWeek"), n: weekLogs.length, icon: Dumbbell, href: "/coach/clients" },
    { label: t("newPhotos"), n: photoClients.length, icon: Camera, href: photoClients.length === 1 ? `/coach/clients/view?id=${photoClients[0]}` : "/coach/clients" },
  ];

  // workouts, photos and filled forms in one feed
  const feed = [
    ...db.logs.map((l) => ({ id: l.id, cid: l.clientId, date: l.date, icon: Dumbbell, text: t("loggedWorkout", { x: db.trainingPlans.find((p) => p.id === l.planId)?.days.find((x) => x.id === l.dayId)?.name ?? "" }) })),
    ...newPhotos.map((p) => ({ id: p.id, cid: p.clientId, date: p.date, icon: Camera, text: t("sentPhotos") })),
    ...db.assignments.filter((a) => a.status === "submitted" && a.submittedAt).map((a) => ({ id: a.id, cid: a.clientId, date: a.submittedAt!, icon: ClipboardCheck, text: t("filledForm") })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  const found = q.trim() ? clients.filter((c) => c.name.includes(q.trim()) || c.phone.includes(q.trim())).slice(0, 5) : [];
  const hour = new Date().getHours();

  return (
    <div>
      <h1 className="h1">{t(hour < 12 ? "goodMorning" : "goodEvening")}</h1>
      <p className="mt-1 text-muted">
        {fmtDate(new Date().toISOString(), lang, { weekday: "long", day: "numeric", month: "long" })} · {todo.length ? <span className="font-bold text-gold">{t("todoCount", { n: todo.length })}</span> : t("allGood")}
      </p>

      <div className="relative mt-4">
        <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input ps-10" placeholder={t("searchClients")} value={q} onChange={(e) => setQ(e.target.value)} />
        {found.length > 0 && (
          <ul className="card absolute inset-x-0 top-full z-20 mt-1 divide-y divide-line shadow-xl">
            {found.map((c) => (
              <li key={c.id}><Link href={`/coach/clients/view?id=${c.id}`} className="flex items-center gap-3 p-3 hover:bg-card-hi"><Avatar name={c.name} size={32} /><span className="flex-1 font-bold">{c.name}</span><span className="num text-sm text-muted" dir="ltr">{c.phone}</span></Link></li>
            ))}
          </ul>
        )}
      </div>

      <PendingList onActivate={setAct} />

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, n, icon: Icon, href }) => (
          <Link key={label} href={href} className="card flex items-center gap-3 p-3 hover:border-line-gold">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-soft text-gold"><Icon size={18} /></span>
            <span className="min-w-0">
              <span className="num block text-2xl font-black leading-none">{n}</span>
              <span className="mt-1 block text-xs leading-tight text-muted">{label}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link href="/coach/clients?add=1" className="btn-gold"><UserPlus size={18} /> {t("addClient")}</Link>
        <Link href="/coach/library?upload=1" className="btn-ghost"><Upload size={18} /> {t("uploadVideo")}</Link>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        <div>
          <SectionLabel>{t("todayList")}</SectionLabel>
          {todo.length === 0 ? (
            <p className="card p-4 text-muted">{t("allGood")}</p>
          ) : (
            <ul className="space-y-2">
              {todo.map(({ c, text, tone, icon: Icon, wa }) => (
                <li key={c.id} className="card flex items-center gap-3 p-3 hover:border-line-gold">
                  <Link href={`/coach/clients/view?id=${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={c.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{c.name}</span>
                      <span className={`flex items-center gap-1 truncate text-sm ${tone === "red" ? "text-danger" : tone === "gold" ? "text-gold" : "text-muted"}`}><Icon size={14} className="shrink-0" /> {text}</span>
                    </span>
                  </Link>
                  {wa ? (
                    <a href={waLink(c.phone, wa)} target="_blank" rel="noopener" aria-label={t("whatsapp")} title={t("sendReminder")} className="grid size-10 shrink-0 place-items-center rounded-full border border-line-gold text-gold hover:bg-gold-soft"><MessageCircle size={18} /></a>
                  ) : (
                    <Link href={`/coach/clients/view?id=${c.id}`} aria-label={c.name}><Chevron size={18} className="text-muted" /></Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <SectionLabel>{t("recentActivity")}</SectionLabel>
          <ul className="card divide-y divide-line">
            {feed.length === 0 && <li className="p-4 text-muted">—</li>}
            {feed.map((f) => (
              <li key={f.id}>
                <Link href={`/coach/clients/view?id=${f.cid}`} className="flex items-center gap-3 p-3 hover:bg-card-hi">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-soft text-gold"><f.icon size={16} /></span>
                  <span className="flex-1 text-sm"><b>{db.clients.find((c) => c.id === f.cid)?.name}</b> {f.text}</span>
                  <span className="text-xs text-muted">{fmtDate(f.date, lang, { day: "numeric", month: "short" })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <ActivateSheet client={act} onClose={() => setAct(null)} onDone={() => { setToast(t("activated")); setTimeout(() => setToast(null), 1500); }} />
      <Toast text={toast} />
    </div>
  );
}

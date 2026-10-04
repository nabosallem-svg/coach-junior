"use client";

import Link from "next/link";
import { Users, CalendarClock, ClipboardList, ClipboardCheck, Upload, UserPlus, Dumbbell, ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { daysLeft, fmtDate } from "@/lib/calc";
import { Avatar, SectionLabel, Toast } from "@/components/ui";
import { ActivateSheet, PendingList } from "@/components/Activate";
import { useState } from "react";
import type { Client } from "@/lib/types";

export default function CoachHome() {
  const { db } = useStore();
  const { t, lang, dir } = useI18n();
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const [act, setAct] = useState<Client | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const active = db.clients.filter((c) => c.active && daysLeft(c.subEnd) >= 0);
  const expiring = db.clients.filter((c) => c.active && daysLeft(c.subEnd) <= 7);
  const newForms = db.assignments.filter((a) => a.status === "submitted" && !a.reviewed);
  const noPlan = db.clients.filter((c) => c.active && (!c.trainingPlanId || !c.nutritionPlanId));

  const stats = [
    { label: t("activeClients"), n: active.length, icon: Users, href: "/coach/clients" },
    { label: t("expiringSoon"), n: expiring.length, icon: CalendarClock, href: "/coach/clients" },
    { label: t("noPlanAssigned"), n: noPlan.length, icon: ClipboardList, href: "/coach/clients" },
    { label: t("formsToReview"), n: newForms.length, icon: ClipboardCheck, href: "/coach/clients" },
  ];

  type Item = { id: string; clientId: string; text: string; href: string; tone: "red" | "gold" };
  const attention: Item[] = [
    ...expiring.map((c) => ({ id: `e${c.id}`, clientId: c.id, text: daysLeft(c.subEnd) >= 0 ? t("daysLeftN", { n: daysLeft(c.subEnd) }) : t("expiredN", { n: -daysLeft(c.subEnd) }), href: `/coach/clients/view?id=${c.id}`, tone: "red" as const })),
    ...newForms.map((a) => ({ id: `f${a.id}`, clientId: a.clientId, text: `${t("formsToReview")}: ${db.forms.find((f) => f.id === a.formId)?.title}`, href: `/coach/clients/view?id=${a.clientId}`, tone: "gold" as const })),
    ...noPlan.map((c) => ({ id: `p${c.id}`, clientId: c.id, text: t("noPlanAssigned"), href: `/coach/clients/view?id=${c.id}`, tone: "gold" as const })),
  ].filter((it, i, arr) => arr.findIndex((x) => x.clientId === it.clientId) === i);

  const activity = db.logs
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map((l) => ({ l, c: db.clients.find((c) => c.id === l.clientId), d: db.trainingPlans.find((p) => p.id === l.planId)?.days.find((x) => x.id === l.dayId) }));

  return (
    <div>
      <h1 className="h1">{t("dashboard")}</h1>
      <PendingList onActivate={setAct} />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        <Link href="/coach/library?upload=1" className="btn-gold"><Upload size={18} /> {t("uploadVideo")}</Link>
        <Link href="/coach/clients?add=1" className="btn-ghost"><UserPlus size={18} /> {t("addClient")}</Link>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        <div>
          <SectionLabel>{t("needsAttention")}</SectionLabel>
          {attention.length === 0 ? (
            <p className="card p-4 text-muted">{t("allGood")}</p>
          ) : (
            <ul className="space-y-2">
              {attention.map((it) => {
                const c = db.clients.find((x) => x.id === it.clientId);
                return (
                  <li key={it.id}>
                    <Link href={it.href} className="card flex items-center gap-3 p-3 hover:border-line-gold">
                      <Avatar name={c?.name ?? "?"} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{c?.name}</span>
                        <span className={`block truncate text-sm ${it.tone === "red" ? "text-danger" : "text-muted"}`}>{it.text}</span>
                      </span>
                      <Chevron size={18} className="text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div>
          <SectionLabel>{t("recentActivity")}</SectionLabel>
          <ul className="card divide-y divide-line">
            {activity.length === 0 && <li className="p-4 text-muted">—</li>}
            {activity.map(({ l, c, d }) => (
              <li key={l.id} className="flex items-center gap-3 p-3">
                <span className="grid size-9 place-items-center rounded-full bg-gold-soft text-gold"><Dumbbell size={16} /></span>
                <span className="flex-1 text-sm"><b>{c?.name}</b> {t("loggedWorkout", { x: d?.name ?? "" })}</span>
                <span className="text-xs text-muted">{fmtDate(l.date, lang, { day: "numeric", month: "short" })}</span>
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

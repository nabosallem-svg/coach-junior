"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Dumbbell, Salad } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { clientNotices, useMe } from "@/lib/hooks";
import { daysLeft, fmtDate, planMacros } from "@/lib/calc";
import { LineChart } from "@/components/charts";
import { Field, SectionLabel, Segmented, Sheet } from "@/components/ui";
import { noticeIcon, noticeText } from "@/components/ClientShell";
import { COACH_WA, waLink } from "@/lib/wa";

type Range = "30" | "90" | "180" | "all";

export default function ClientHome() {
  const { db, update } = useStore();
  const { t, lang, dir } = useI18n();
  const me = useMe()!;
  const [range, setRange] = useState<Range>("90");
  const [logOpen, setLogOpen] = useState(false);
  const [w, setW] = useState("");
  const [waist, setWaist] = useState("");
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const notices = clientNotices(db, me.id);
  const all = db.measurements.filter((m) => m.clientId === me.id).sort((a, b) => a.date.localeCompare(b.date));
  const from = range === "all" ? (all[0]?.date ?? new Date().toISOString()) : new Date(Date.now() - Number(range) * 86400000).toISOString();
  const shown = all.filter((m) => m.date >= from.slice(0, 10));
  const latest = all[all.length - 1];
  const first = shown[0];
  const change = latest && first ? latest.weight - first.weight : 0;

  const pts = (key: "weight" | "waist") =>
    shown.filter((m) => m[key] != null).map((m) => ({ x: new Date(m.date).getTime(), y: m[key] as number, label: fmtDate(m.date, lang, { day: "numeric", month: "short" }) }));

  const plan = me.active ? db.trainingPlans.find((p) => p.id === me.trainingPlanId) : undefined;
  const lastLog = db.logs.filter((l) => l.clientId === me.id).sort((a, b) => b.date.localeCompare(a.date))[0];
  const nextDay = useMemo(() => {
    if (!plan) return undefined;
    const i = lastLog ? plan.days.findIndex((d) => d.id === lastLog.dayId) : -1;
    return plan.days[(i + 1) % plan.days.length];
  }, [plan, lastLog]);

  const np = me.active ? db.nutritionPlans.find((p) => p.id === me.nutritionPlanId) : undefined;
  const starter = db.assignments.find((a) => a.clientId === me.id && a.status === "pending" && db.forms.find((f) => f.id === a.formId)?.starter);
  const today = new Date().toISOString().slice(0, 10);
  const total = np ? planMacros(db, np.meals, me.id).kcal : 0;
  const eaten = np
    ? np.meals.reduce((acc, m) => acc + planMacros(db, [{ ...m, items: m.items.filter((it) => db.eaten.includes(`${today}:${it.id}`)) }], me.id).kcal, 0)
    : 0;
  const left = daysLeft(me.subEnd);

  return (
    <div>
      <h1 className="h1">{me.pending ? t("welcome", { name: me.name.split(" ")[0] }) : t("home")}</h1>

      {me.pending && (
        <section className="mt-5 rounded-3xl border border-line-gold bg-gold-soft/40 p-5">
          <h2 className="text-xl font-black text-gold">{t("preparingTitle")}</h2>
          <p className="mt-2 text-text-2">{t("preparingSub")}</p>
          <div className="mt-4 grid gap-2">
            {starter && <Link href={`/app/forms/fill?id=${starter.id}`} className="btn-gold">{t("fillStartForm")}</Link>}
            <a href={waLink(COACH_WA, me.name)} target="_blank" rel="noopener" className="btn-ghost">{t("msgCoachWa")}</a>
          </div>
        </section>
      )}

      {notices.length > 0 && !me.pending && (
        <>
          <SectionLabel>{t("actionNeeded")}</SectionLabel>
          <div className="space-y-2">
            {notices.map((n) => {
              const [a, b] = noticeText(n, t);
              const Icon = noticeIcon[n.kind];
              const inner = (
                <>
                  <span className={`grid size-11 shrink-0 place-items-center rounded-full ${n.kind === "sub" ? "bg-danger/15 text-danger" : "bg-gold-soft text-gold"}`}><Icon size={20} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{a}</span>
                    {b && <span className="block text-sm text-muted">{b}</span>}
                  </span>
                  <Chevron size={20} className="text-muted" />
                </>
              );
              return n.kind === "sub" ? (
                <a key={n.kind} href={waLink(COACH_WA, `${t("renewWa")} - ${me.name}`)} target="_blank" rel="noopener" className="card flex items-center gap-3 rounded-full p-3 pe-4">{inner}</a>
              ) : (
                <Link key={n.kind} href={n.href} className="card flex items-center gap-3 rounded-full p-3 pe-4">{inner}</Link>
              );
            })}
          </div>
        </>
      )}

      {!me.pending && <div className="mt-5 grid grid-cols-2 gap-3">
        <Link href="/app/training" className="card p-4 hover:border-line-gold">
          <Dumbbell size={20} className="text-gold" />
          <p className="mt-2 text-sm text-muted">{t("todayWorkout")}</p>
          <p className="truncate font-bold">{nextDay?.name ?? "—"}</p>
        </Link>
        <Link href="/app/nutrition" className="card p-4 hover:border-line-gold">
          <Salad size={20} className="text-gold" />
          <p className="mt-2 text-sm text-muted">{t("todayMeals")}</p>
          <p className="font-bold">{np ? t("eatenOf", { a: Math.round(eaten), b: Math.round(total) }) : "—"}</p>
          {np && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card-hi"><div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, (eaten / (total || 1)) * 100)}%` }} /></div>}
        </Link>
      </div>}

      {!me.pending && <div className="card mt-3 flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted">{t("subscription")} · {t("package")} <span className="num">{me.packageName}</span></p>
          <p className="font-bold">{t("endsOn")} {fmtDate(me.subEnd, lang)}</p>
        </div>
        <span className={`num rounded-full px-3 py-1 text-sm font-bold ${left <= 7 ? "bg-danger/15 text-danger" : "bg-gold-soft text-gold"}`}>
          {left > 0 ? t("daysLeftN", { n: left }) : t("expiredN", { n: -left })}
        </span>
      </div>}

      {all.length === 0 ? (
        <button onClick={() => setLogOpen(true)} className="card mt-5 flex w-full items-center gap-3 p-4 text-start hover:border-line-gold">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold-soft text-gold"><Plus size={20} /></span>
          <span className="font-bold">{t("firstWeigh")}</span>
        </button>
      ) : (
        <>
      <SectionLabel>{t("progress")}</SectionLabel>
      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: "30", label: lang === "ar" ? "30 يوم" : "30d" },
          { value: "90", label: lang === "ar" ? "90 يوم" : "90d" },
          { value: "180", label: lang === "ar" ? "6 شهور" : "6m" },
          { value: "all", label: t("all") },
        ]}
      />
      <div className="card mt-3 flex items-center justify-center gap-2 rounded-2xl p-3 text-text-2">
        <CalendarDays size={18} />
        <span>{fmtDate(from, lang, { day: "numeric", month: "long", year: "numeric" })} - {fmtDate(new Date().toISOString(), lang, { day: "numeric", month: "long", year: "numeric" })}</span>
      </div>

      <div className="mb-3 mt-7 flex items-center justify-between">
        <h2 className="label">{t("measurements")}</h2>
        <button onClick={() => setLogOpen(true)} className="flex items-center gap-1 text-sm font-bold text-gold"><Plus size={16} /> {t("addReading")}</button>
      </div>

      <div className="card p-5">
        <p className="text-text-2">{t("weight")}</p>
        <div className="flex items-baseline gap-3">
          <p className="num text-4xl font-black">{latest ? <>{latest.weight} <span className="text-2xl">{t("kg")}</span></> : "—"}</p>
          {shown.length > 1 && <span className={`num text-sm font-bold ${change <= 0 ? "text-ok" : "text-gold"}`}>{change > 0 ? "+" : ""}{change.toFixed(1)}</span>}
        </div>
        <p className="mb-4 text-sm text-muted">{t("readings", { n: shown.length })}</p>
        <LineChart points={pts("weight")} unit={t("kg")} />
      </div>

      {pts("waist").length > 1 && (
        <div className="card mt-3 p-5">
          <p className="text-text-2">{t("waist")}</p>
          <p className="num mb-4 text-3xl font-black">{shown.filter((m) => m.waist).at(-1)?.waist} <span className="text-xl">{t("cm")}</span></p>
          <LineChart points={pts("waist")} unit={t("cm")} height={160} />
        </div>
      )}

        </>
      )}

      <Sheet open={logOpen} onClose={() => setLogOpen(false)} title={t("addReading")}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const wn = parseFloat(w);
            if (!wn) return;
            update((d) => {
              d.measurements = d.measurements.filter((m) => !(m.clientId === me.id && m.date === today));
              d.measurements.push({ id: uid("ms"), clientId: me.id, date: today, weight: wn, waist: parseFloat(waist) || undefined });
            });
            setW(""); setWaist(""); setLogOpen(false);
          }}
        >
          <Field label={`${t("weight")} (${t("kg")})`}><input className="input num text-start" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} autoFocus required /></Field>
          <Field label={`${t("waist")} (cm)`}><input className="input num text-start" inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} /></Field>
          <button className="btn-gold w-full">{t("save")}</button>
        </form>
      </Sheet>
    </div>
  );
}

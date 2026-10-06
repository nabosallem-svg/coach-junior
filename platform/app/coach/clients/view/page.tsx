"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, MessageCircle, Send, CalendarPlus, ClipboardList, Phone, KeyRound, Pencil, Sparkles, Loader2, FileText, Images, Utensils, Calculator, Plus } from "lucide-react";
import { personalize, type PlanKind } from "@/lib/plans";
import { useStore, uid, genPassword } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { daysLeft, fmtDate, targets, type Activity, type Goal } from "@/lib/calc";
import { clientTargets, intakeInputs } from "@/lib/intake";
import { WeightCard } from "@/components/WeightCard";
import { FormView } from "@/components/FormView";
import { Avatar, Field, SectionLabel, Sheet, Toast } from "@/components/ui";
import { waLink } from "@/lib/wa";
import { Creds } from "@/components/Creds";
import { ActivateSheet, PACKAGES } from "@/components/Activate";
import { deleteAccount } from "@/lib/accounts";
import { ProgressPhotos } from "@/components/ProgressPhotos";
import { setAccountPassword } from "@/lib/accounts";
import { aiTask, photoForAi } from "@/lib/aiTasks";

function ClientDetail() {
  const id = useSearchParams().get("id") ?? "";
  const { db, update } = useStore();
  const { t, lang, dir } = useI18n();
  const [viewAs, setViewAs] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [newPw, setNewPw] = useState<string | null>(null);
  const [pwEdit, setPwEdit] = useState<string | null>(null);
  const [act, setAct] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [info, setInfo] = useState<{ name: string; goal: string } | null>(null);
  const [ai, setAi] = useState<{ title: string; text?: string; busy?: boolean; err?: string; wa?: boolean } | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [calc, setCalc] = useState<{ sex: "m" | "f"; age: string; height: string; weight: string; activity: Activity; goal: Goal } | null>(null);
  const router = useRouter();
  const c = db.clients.find((x) => x.id === id);
  // opening the trainee's page counts as seeing their new form answers (clears the dashboard item)
  const unseen = db.assignments.some((a) => a.clientId === id && a.status === "submitted" && !a.reviewed);
  useEffect(() => { if (unseen) update((d) => { d.assignments.forEach((a) => { if (a.clientId === id && a.status === "submitted") a.reviewed = true; }); }); }, [unseen, id, update]);
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;
  if (!c) return null;

  const left = daysLeft(c.subEnd);
  const ms = db.measurements.filter((m) => m.clientId === id).sort((a, b) => a.date.localeCompare(b.date));
  const assigns = db.assignments.filter((a) => a.clientId === id).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const logs = db.logs.filter((l) => l.clientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const viewing = assigns.find((a) => a.id === viewAs);
  const flash = (s: string) => { setToast(s); setTimeout(() => setToast(null), 2200); };
  const set = (patch: Partial<typeof c>) => update((d) => { Object.assign(d.clients.find((x) => x.id === id)!, patch); });

  // Gemini helpers: each sends only what the task needs and shows the answer in one sheet
  const lastLog = logs[0]?.date;
  const facts = () => ({
    name: c.name, goal: c.goal, active: c.active, daysLeftInSubscription: left,
    weights: ms.slice(-8).map((m) => ({ date: m.date, kg: m.weight })),
    workoutsLast7Days: logs.filter((l) => Date.now() - new Date(l.date).getTime() < 7 * 864e5).length,
    workoutsPrev7Days: logs.filter((l) => { const a = Date.now() - new Date(l.date).getTime(); return a >= 7 * 864e5 && a < 14 * 864e5; }).length,
    daysSinceLastWorkout: lastLog ? Math.floor((Date.now() - new Date(lastLog).getTime()) / 864e5) : null,
  });
  const runAi = async (title: string, run: () => Promise<{ text: string }>, wa = false) => {
    setAi({ title, busy: true, wa });
    try { const r = await run(); setAi({ title, text: r.text, wa }); }
    catch (e) { setAi({ title, err: (e as Error).message === "nokey" ? t("scanNoKey") : t("aiFailed") }); }
  };
  const photos = (db.photos ?? []).filter((p) => p.clientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const photoDates = [...new Set(photos.map((p) => p.date))];
  const comparePhotos = () => runAi(t("aiComparePhotos"), async () => {
    const newer = photos.filter((p) => p.date === photoDates[0]), older = photos.filter((p) => p.date === photoDates[1]);
    const poses = newer.map((p) => p.pose).filter((ps) => older.some((o) => o.pose === ps)).slice(0, 2);
    const pick = (list: typeof photos) => (poses.length ? poses.map((ps) => list.find((p) => p.pose === ps)!) : list.slice(0, 1));
    const imgs = (await Promise.all([...pick(older), ...pick(newer)].map((p) => photoForAi(p.key)))).filter(Boolean) as { mime: string; data: string }[];
    return aiTask("photos", { olderDate: photoDates[1], newerDate: photoDates[0], poses }, lang, imgs);
  });
  const intake = intakeInputs(db, c);
  const needs = clientTargets(db, c);
  const openCalc = () => { const i = intake.input; const s = (n: number) => (n ? String(n) : ""); setCalc({ sex: i.sex, age: s(i.age), height: s(i.heightCm), weight: s(i.weightKg), activity: i.activity, goal: i.goal }); };
  const calcResult = calc && +calc.age > 0 && +calc.height > 0 && +calc.weight > 0 ? targets({ sex: calc.sex, age: +calc.age, heightCm: +calc.height, weightKg: +calc.weight, activity: calc.activity, goal: calc.goal }) : null;

  const draftMeals = async () => {
    setDrafting(true);
    try {
      const intake = assigns.find((a) => a.status === "submitted" && a.answers);
      const form = intake && db.forms.find((f) => f.id === intake.formId);
      const answers = form ? Object.fromEntries(form.questions.map((q) => [q.label, intake!.answers![q.id] ?? ""])) : {};
      const r = await aiTask<{ name?: string; meals?: { name: string; items: { foodId: string; qty: number }[] }[] }>("mealplan", {
        client: { goal: c.goal, latestWeightKg: ms.at(-1)?.weight, intake: answers, ...(needs && { dailyTargets: { kcal: needs.kcal, proteinG: needs.p, carbsG: needs.c, fatG: needs.f } }) },
        foods: db.foods.map((f) => ({ id: f.id, name: lang === "ar" ? f.nameAr : f.nameEn, unit: f.unit, per: f.per, kcal: f.kcal, p: f.p, c: f.c, f: f.f })),
      }, lang);
      const meals = (r.meals ?? []).map((m) => ({ id: uid("m"), name: String(m.name ?? ""), items: (m.items ?? []).filter((it) => db.foods.some((f) => f.id === it.foodId) && Number(it.qty) > 0).map((it) => ({ id: uid("mi"), foodId: it.foodId, qty: Math.round(Number(it.qty) * 10) / 10 })) })).filter((m) => m.items.length);
      if (!meals.length) throw new Error("fail");
      const pid = uid("np");
      update((d) => {
        d.nutritionPlans.push({ id: pid, name: `${r.name || t("aiDraft")} - ${c.name.split(" ")[0]}`, meals, ownerId: c.id });
        d.clients.find((x) => x.id === c.id)!.nutritionPlanId = pid;
      });
      router.push(`/coach/plans/nutrition/edit?id=${pid}`);
    } catch (e) { flash((e as Error).message === "nokey" ? t("scanNoKey") : t("aiFailed")); }
    setDrafting(false);
  };

  // renew by a package from today or from the current end, whichever is later
  const renewEnd = (months: number) => { const d = new Date(Math.max(Date.now(), new Date(c.subEnd).getTime())); d.setMonth(d.getMonth() + months); return d; };
  const renew = (pkg: (typeof PACKAGES)[number]) => {
    const end = renewEnd(pkg.months);
    // only moves the end date; paused stays paused until the coach taps activate
    set({ subEnd: end.toISOString().slice(0, 10), packageName: pkg.label });
    setRenewing(false);
    flash(t("extendedTo", { d: fmtDate(end.toISOString(), lang, { day: "numeric", month: "long" }) }));
  };

  return (
    <div>
      <Link href="/coach/clients" className="mb-4 inline-flex items-center gap-1.5 text-muted hover:text-text"><Back size={18} /> {t("clients")}</Link>

      <div className="flex items-center gap-3">
        <Avatar name={c.name} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-black">{c.name}</h1>
          <p className="truncate text-muted">{c.goal}</p>
        </div>
        <button onClick={() => setInfo({ name: c.name, goal: c.goal })} aria-label={t("editInfo")} title={t("editInfo")} className="grid size-12 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-gold"><Pencil size={18} /></button>
        <a href={waLink(c.phone)} target="_blank" rel="noopener" aria-label={t("whatsapp")} className="grid size-12 shrink-0 place-items-center rounded-full border border-line-gold text-gold hover:bg-gold-soft"><MessageCircle size={20} /></a>
      </div>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        <button onClick={() => runAi(t("aiSummary"), () => aiTask("summary", facts(), lang))} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line-gold px-4 text-sm font-bold text-gold hover:bg-gold-soft"><FileText size={16} /> {t("aiSummary")}</button>
        <button onClick={() => runAi(t("aiWa"), () => aiTask("wa", facts(), lang), true)} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line-gold px-4 text-sm font-bold text-gold hover:bg-gold-soft"><MessageCircle size={16} /> {t("aiWa")}</button>
      </div>

      {/* daily needs: calculated from the starter form, the coach only edits if he wants */}
      <section className="card mt-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 font-bold"><Calculator size={17} className="text-gold" /> {t("dailyNeeds")}</h2>
          <button onClick={openCalc} className="flex items-center gap-1 text-sm font-bold text-gold"><Pencil size={14} /> {needs ? t("edit") : t("calcManually")}</button>
        </div>
        {needs ? (
          <>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[{ v: needs.kcal, l: t("kcal"), cl: "text-gold" }, { v: needs.p, l: t("protein"), cl: "text-protein" }, { v: needs.c, l: t("carbs"), cl: "text-carbs" }, { v: needs.f, l: t("fat"), cl: "text-fat" }].map((x) => (
                <div key={x.l} className="rounded-xl bg-card-hi p-2"><p className={`num text-xl font-black ${x.cl}`}>{x.v}</p><p className="text-xs text-muted">{x.l}</p></div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">{c.targets ? t("needsByCoach") : t("needsFromForm")}</p>
          </>
        ) : <p className="mt-2 text-sm text-muted">{intake.submitted ? t("needsMissing") : t("waitingIntake")}</p>}
      </section>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{t("subscription")}</h2>
            <span className={`num rounded-full px-2.5 py-1 text-xs font-bold ${c.pending || !c.active ? "bg-card-hi text-muted" : left <= 7 ? "bg-danger/15 text-danger" : "bg-gold-soft text-gold"}`}>{c.pending ? t("requests") : !c.active ? t("paused") : left >= 0 ? t("daysLeftN", { n: left }) : t("expiredN", { n: -left })}</span>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr_1fr] gap-5 text-sm">
            <div><dt className="text-muted">{t("package")}</dt><dd className="num font-bold">{c.packageName}</dd></div>
            <div><dt className="text-muted">{t("start")}</dt><dd className="font-bold">{fmtDate(c.subStart, lang, { day: "numeric", month: "short", year: "2-digit" })}</dd></div>
            <div><dt className="text-muted">{t("end")}</dt><dd className="font-bold">{fmtDate(c.subEnd, lang, { day: "numeric", month: "short", year: "2-digit" })}</dd></div>
          </dl>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setRenewing(true)} disabled={c.pending} className="btn-gold flex-1"><CalendarPlus size={18} /> {t("renew")}</button>
            {c.pending ? (
              <button onClick={() => setAct(true)} className="btn-ghost flex-1">{t("activate")}</button>
            ) : (
              <button onClick={() => { if (confirm(t(c.active ? "confirmPause" : "confirmActivate", { name: c.name }))) { set({ active: !c.active }); flash(c.active ? t("pausedNow") : t("activeNow")); } }} className={`flex-1 ${c.active ? "btn-quiet" : "btn-ghost"}`}>{c.active ? t("pause") : t("resume")}</button>
            )}
          </div>
          {pwEdit === null ? (
            <button onClick={() => setPwEdit(genPassword())} className="mt-3 flex items-center gap-1.5 text-sm font-bold text-gold"><KeyRound size={15} /> {t("resetPassword")}</button>
          ) : (
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const pw = pwEdit.trim(); if (pw.length < 6) return flash(t("minChars")); setAccountPassword(c.id, pw).then(() => { set({ password: pw }); setPwEdit(null); setNewPw(pw); flash(t("pwChanged")); }, () => flash(t("syncFailed"))); }}>
              <input className="input num min-w-0 flex-1 text-start" dir="ltr" value={pwEdit} onChange={(e) => setPwEdit(e.target.value)} autoFocus />
              <button disabled={pwEdit.trim().length < 6} className="btn-gold shrink-0 px-4 disabled:opacity-40">{t("save")}</button>
              <button type="button" onClick={() => setPwEdit(null)} className="btn-quiet shrink-0 px-3">{t("cancel")}</button>
            </form>
          )}
          {pwEdit !== null && pwEdit.trim().length < 6 && <p className="mt-1.5 text-xs text-muted">{t("minChars")}</p>}
        </section>

        <section className="card space-y-4 p-4">
          <div>
            <h2 className="font-bold">{t("hisPlans", { name: c.name.split(" ")[0] })}</h2>
            <p className="mt-1 text-sm text-muted">{t("hisPlansNote")}</p>
          </div>
          {(["training", "nutrition"] as PlanKind[]).map((kind) => {
            const key = kind === "training" ? "trainingPlanId" : "nutritionPlanId";
            const plans = kind === "training" ? db.trainingPlans : db.nutritionPlans;
            const cur = plans.find((p) => p.id === c[key]);
            const own = cur?.ownerId === c.id;
            return (
              <div key={kind}>
                <Field label={t(kind === "training" ? "trainingPlan" : "nutritionPlan")}>
                  <select className="input" value={c[key] ?? ""} onChange={(e) => { set({ [key]: e.target.value || undefined, ...(e.target.value && { planAt: new Date().toISOString() }) }); flash(t("saved")); }}>
                    <option value="">{t("none")}</option>
                    <optgroup label={t("templates")}>
                      {plans.filter((p) => !p.ownerId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </optgroup>
                    {plans.some((p) => p.ownerId === c.id) && (
                      <optgroup label={t("ownPlans", { name: c.name.split(" ")[0] })}>
                        {plans.filter((p) => p.ownerId === c.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                </Field>
                {kind === "nutrition" && (
                  <button onClick={draftMeals} disabled={drafting} className="mt-2 flex w-full items-center justify-center gap-1.5 text-sm font-bold text-gold disabled:opacity-60">
                    {drafting ? <Loader2 size={15} className="animate-spin" /> : <Utensils size={15} />} {drafting ? t("aiBusy") : t("aiMealDraft")}
                  </button>
                )}
                {cur && (own ? (
                  <Link href={`/coach/plans/${kind}/edit?id=${cur.id}`} className="btn-ghost mt-2 w-full"><Pencil size={17} /> {t("editHisPlan", { name: c.name.split(" ")[0] })}</Link>
                ) : (
                  <button
                    onClick={() => { const pid = uid(kind === "training" ? "tp" : "np"); update((d) => { personalize(d, c.id, kind, pid); d.clients.find((x) => x.id === c.id)!.planAt = new Date().toISOString(); }); router.push(`/coach/plans/${kind}/edit?id=${pid}`); }}
                    className="btn-ghost mt-2 w-full"
                  >
                    <Sparkles size={17} /> {t("customizeFor", { name: c.name.split(" ")[0] })}
                  </button>
                ))}
                {/* an empty personal plan, built from scratch for this trainee only */}
                <button
                  onClick={() => {
                    const first = c.name.split(" ")[0], pid = uid(kind === "training" ? "tp" : "np");
                    update((d) => {
                      if (kind === "training") d.trainingPlans.push({ id: pid, name: t("trainingOf", { name: first }), ownerId: c.id, days: [{ id: uid("d"), name: `${t("days")} 1`, exercises: [] }] });
                      else d.nutritionPlans.push({ id: pid, name: t("mealsOf", { name: first }), ownerId: c.id, meals: [{ id: uid("m"), name: t("mealN", { n: 1 }), items: [] }] });
                      Object.assign(d.clients.find((x) => x.id === c.id)!, { [key]: pid, planAt: new Date().toISOString() });
                    });
                    router.push(`/coach/plans/${kind}/edit?id=${pid}`);
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-gold py-2.5 text-sm font-bold text-gold hover:bg-gold-soft"
                >
                  <Plus size={16} /> {t("fromScratchFor", { name: c.name.split(" ")[0] })}
                </button>
              </div>
            );
          })}
        </section>
      </div>

      <SectionLabel>{t("weight")}</SectionLabel>
      <WeightCard readings={ms} goal={c.goal} label={t("weight")} />

      <SectionLabel>{t("progressPhotos")}</SectionLabel>
      <ProgressPhotos clientId={c.id} />
      {photoDates.length >= 2 && (
        <button onClick={comparePhotos} className="mt-3 flex h-10 items-center gap-1.5 rounded-full border border-line-gold px-4 text-sm font-bold text-gold hover:bg-gold-soft"><Images size={16} /> {t("aiComparePhotos")}</button>
      )}

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
      <Sheet open={!!calc} onClose={() => setCalc(null)} title={t("calcNeeds")}>
        {calc && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {(["m", "f"] as const).map((s) => <button key={s} type="button" onClick={() => setCalc({ ...calc, sex: s })} className={`h-10 rounded-xl border text-sm font-bold ${calc.sex === s ? "border-gold bg-gold text-bg" : "border-line text-text-2"}`}>{t(s === "m" ? "male" : "female")}</button>)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([["age", "age"], ["height", "heightCm"], ["weight", "weight"]] as const).map(([k, l]) => (
                <Field key={k} label={t(l)}><input className="input num text-center" inputMode="decimal" value={calc[k]} onChange={(e) => setCalc({ ...calc, [k]: e.target.value })} /></Field>
              ))}
            </div>
            <Field label={t("activityLevel")}>
              <select className="input" value={calc.activity} onChange={(e) => setCalc({ ...calc, activity: e.target.value as Activity })}>
                {(["sedentary", "light", "moderate", "high", "athlete"] as Activity[]).map((a) => <option key={a} value={a}>{t(`act_${a}`)}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-2">
              {(["cut", "maintain", "bulk"] as Goal[]).map((g) => <button key={g} type="button" onClick={() => setCalc({ ...calc, goal: g })} className={`h-10 rounded-xl border text-sm font-bold ${calc.goal === g ? "border-gold bg-gold text-bg" : "border-line text-text-2"}`}>{t(`goal_${g}`)}</button>)}
            </div>
            {calcResult ? (
              <>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[{ v: calcResult.kcal, l: t("kcal"), c: "text-gold" }, { v: calcResult.p, l: t("protein"), c: "text-protein" }, { v: calcResult.c, l: t("carbs"), c: "text-carbs" }, { v: calcResult.f, l: t("fat"), c: "text-fat" }].map((x) => (
                    <div key={x.l} className="rounded-xl bg-card-hi p-2"><p className={`num text-xl font-black ${x.c}`}>{x.v}</p><p className="text-xs text-muted">{x.l}</p></div>
                  ))}
                </div>
                <p className="num text-center text-sm text-muted">BMR {calcResult.bmr} · TDEE {calcResult.tdee}</p>
                <button onClick={() => { const { kcal, p, c: cc, f } = calcResult; update((d) => { const x = d.clients.find((y) => y.id === c.id); if (x) x.targets = { kcal, p, c: cc, f }; }); setCalc(null); flash(t("targetsSaved")); }} className="btn-gold w-full">{t("useForDraft")}</button>
              </>
            ) : <p className="text-center text-sm text-muted">{t("fillToCalc")}</p>}
            {c.targets && <button onClick={() => { update((d) => { const x = d.clients.find((y) => y.id === c.id); if (x) delete x.targets; }); setCalc(null); }} className="btn-quiet w-full">{t("backToAuto")}</button>}
          </div>
        )}
      </Sheet>
      <Sheet open={!!ai} onClose={() => setAi(null)} title={ai?.title ?? ""}>
        {ai?.busy && <p className="flex items-center justify-center gap-2 py-6 font-bold text-gold"><Loader2 size={18} className="animate-spin" /> {t("aiBusy")}</p>}
        {ai?.err && <p className="py-4 text-center text-muted">{ai.err}</p>}
        {ai?.text !== undefined && (ai.wa ? (
          <div className="space-y-3">
            <textarea className="input min-h-32 leading-relaxed" dir="auto" value={ai.text} onChange={(e) => setAi({ ...ai, text: e.target.value })} />
            <a href={waLink(c.phone, ai.text)} target="_blank" rel="noopener" className="btn-gold w-full"><Send size={18} /> {t("sendWa")}</a>
          </div>
        ) : <p className="whitespace-pre-line leading-relaxed text-text-2" dir="auto">{ai.text}</p>)}
      </Sheet>
      <Sheet open={renewing} onClose={() => setRenewing(false)} title={t("renewTitle", { name: c.name.split(" ")[0] })}>
        <div className="grid grid-cols-1 gap-2">
          {PACKAGES.map((p) => (
            <button key={p.label} onClick={() => renew(p)} className="card flex flex-col items-center gap-1 p-4 hover:border-gold">
              <span className="num text-2xl font-black text-gold">{p.label}</span>
              <span className="text-xs text-muted">{t("until", { d: fmtDate(renewEnd(p.months).toISOString(), lang, { day: "numeric", month: "short", year: "numeric" }) })}</span>
            </button>
          ))}
        </div>
        {!c.active && <p className="mt-3 text-sm text-muted">{t("renewPausedNote")}</p>}
      </Sheet>
      <Sheet open={!!info} onClose={() => setInfo(null)} title={t("editInfo")}>
        {info && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!info.name.trim()) return; set({ name: info.name.trim(), goal: info.goal.trim() }); setInfo(null); flash(t("saved")); }}>
            <Field label={t("name")}><input className="input" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} required /></Field>
            <Field label={t("goal")}><input className="input" value={info.goal} onChange={(e) => setInfo({ ...info, goal: e.target.value })} /></Field>
            <p className="num text-sm text-muted">{t("phoneLocked", { phone: c.phone })}</p>
            <button className="btn-gold w-full">{t("save")}</button>
            <button type="button" onClick={() => { if (confirm(t("confirmDeleteClient", { name: c.name }))) deleteAccount(c.id).then(() => { update((d) => { d.clients = d.clients.filter((x) => x.id !== c.id); }); router.push("/coach/clients"); }, () => flash(t("syncFailed"))); }} className="w-full py-2 text-sm font-bold text-danger">{t("deleteClient")}</button>
          </form>
        )}
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

"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { useStore, COACH_DEMO_PASSWORD } from "@/lib/store";
import { COACH_WA, waLink } from "@/lib/wa";
import { useI18n } from "@/lib/i18n";
import { Field } from "@/components/ui";
import { asset } from "@/lib/asset";

/** one sign-in screen per audience: trainees at /, the coach at /coach (never linked from the trainee side) */
export function Login({ who, phone0 = "", onDone }: { who: "client" | "coach"; phone0?: string; onDone: () => void }) {
  const { db, reset, login, live } = useStore();
  const { t, toggle } = useI18n();
  const [phone, setPhone] = useState(phone0);
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  useEffect(() => { setDemo(new URLSearchParams(window.location.search).has("demo")); }, []);
  useEffect(() => { if (phone0) setPhone(phone0); }, [phone0]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const ok = await login(who, phone, pw);
    setBusy(false);
    if (ok !== true) {
      // the server's own reason (e.g. "Invalid login credentials", "Email not confirmed") helps when setting up Supabase
      const why = typeof ok === "string" && !/invalid login credentials/i.test(ok) ? ` (${ok})` : "";
      return setErr(t(who === "coach" ? "wrongCoachPw" : "wrongLogin") + why + (!live ? ` · ${t("demoMode")}` : ""));
    }
    onDone();
  };

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col">
      <div className="absolute inset-x-0 top-0 h-[42dvh] overflow-hidden">
        <img src={asset("/img/hero-1200.webp")} srcSet={`${asset("/img/hero-800.webp")} 800w, ${asset("/img/hero-1200.webp")} 1200w`} sizes="(min-width: 448px) 448px, 100vw" alt="" fetchPriority="high" decoding="async" className="anim-hero size-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/0 via-bg/40 to-bg" />
      </div>
      <button onClick={toggle} className="absolute end-4 top-4 z-10 grid h-9 min-w-9 place-items-center rounded-xl border border-line-gold bg-bg/60 px-2 text-sm font-bold text-gold backdrop-blur">
        {t("langToggle")}
      </button>

      <div className="relative z-10 mt-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[30dvh]">
        <div className="flex items-center gap-3">
          <img src={asset("/img/logo.webp")} alt="Coach Junior" width={72} height={72} className="shrink-0 drop-shadow-[0_6px_20px_rgba(0,0,0,.6)]" />
          <div>
            <h1 className="text-2xl font-black leading-tight">{who === "coach" ? t("coachPanel") : t("entryTitle")}</h1>
            {who === "client" && <p className="mt-0.5 text-sm text-text-2">{t("entrySub")}</p>}
          </div>
        </div>

        <form onSubmit={signIn} className="mt-6 space-y-3 rounded-2xl border border-line-gold bg-card/70 p-4 shadow-[0_20px_60px_-20px_rgba(212,175,55,.25)] backdrop-blur">
          {who === "client" && (
            <Field label={t("phone")}>
              <input className="input num text-start" type="tel" inputMode="tel" autoComplete="username" placeholder="01xxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </Field>
          )}
          <Field label={who === "coach" ? t("coachPassword") : t("password")}>
            <div className="relative" dir="ltr">
              <input className="input pe-12 text-start" dir="ltr" type={show ? "text" : "password"} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
              <button type="button" onClick={() => setShow(!show)} aria-label={t("password")} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-muted">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          {err && <p className="text-center text-sm font-bold text-danger">{err}</p>}
          <button disabled={busy} className="btn-gold min-h-12 w-full text-lg">{t("signIn")}</button>
        </form>
        {who === "client" && (
          <a href={waLink(COACH_WA, t("noAccountWa"))} target="_blank" rel="noopener" className="mt-3 block w-full py-2 text-center text-sm font-bold text-gold">
            {t("noAccount")}
          </a>
        )}

        {/* sample logins only for us: add ?demo=1 to the URL */}
        {!live && demo && <details className="mt-4 text-sm text-muted">
          <summary className="cursor-pointer">{t("demoAccounts")}</summary>
          <p className="mt-2">{t("demoNote")}</p>
          <ul className="num mt-2 space-y-1 text-start" dir="ltr">
            {db.clients.slice(0, 3).map((c) => <li key={c.id}>{c.phone} / {c.password}</li>)}
            <li>coach (/coach) / {COACH_DEMO_PASSWORD}</li>
          </ul>
          <button onClick={() => { if (confirm(t("resetConfirm"))) reset(); }} className="mt-3 flex items-center gap-1.5 hover:text-gold"><RotateCcw size={14} /> {t("resetDemo")}</button>
        </details>}
      </div>
    </div>
  );
}

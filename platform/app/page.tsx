"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { useStore, normPhone, COACH_DEMO_PASSWORD } from "@/lib/store";
import { COACH_WA, waLink } from "@/lib/wa";
import { useI18n } from "@/lib/i18n";
import { Field, Segmented } from "@/components/ui";
import { asset } from "@/lib/asset";

export default function Entry() {
  const { ready, session, setSession, db, reset } = useStore();
  const { t, toggle } = useI18n();
  const router = useRouter();
  const [who, setWho] = useState<"client" | "coach">("client");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!ready || !session) return;
    router.replace(session.role === "coach" ? "/coach" : "/app");
  }, [ready, session, router]);

  // Demo check against local data. With Supabase this becomes
  // supabase.auth.signInWithPassword({ phone, password }) and RLS does the rest.
  const signIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (who === "coach") {
      if (pw !== COACH_DEMO_PASSWORD) return setErr(t("wrongLogin"));
      setSession({ role: "coach" });
      return router.push("/coach");
    }
    const c = db.clients.find((x) => normPhone(x.phone) === normPhone(phone) && x.password === pw);
    if (!c) return setErr(t("wrongLogin"));
    // pending and paused clients get in, but only see the waiting screen (ClientShell)
    setSession({ role: "client", clientId: c.id });
    router.push("/app");
  };

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-xl flex-col">
      <div className="absolute inset-x-0 top-0 h-[48dvh] overflow-hidden">
        <img src={asset("/img/hero-1200.webp")} srcSet={`${asset("/img/hero-800.webp")} 800w, ${asset("/img/hero-1200.webp")} 1200w`} sizes="(min-width: 576px) 576px, 100vw" alt="" fetchPriority="high" decoding="async" className="anim-hero size-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/10 via-bg/30 to-bg" />
      </div>
      <button onClick={toggle} className="absolute end-4 top-4 z-10 grid h-10 min-w-10 place-items-center rounded-xl border border-line-gold bg-bg/60 px-2 text-sm font-bold text-gold">
        {t("langToggle")}
      </button>

      <div className="relative z-10 mt-[24dvh] px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <img src={asset("/img/logo.webp")} alt="Coach Junior" width={88} height={88} className="mb-4 rounded-full" />
        <h1 className="text-3xl font-black leading-tight">{t("entryTitle")}</h1>
        <p className="mt-2 text-text-2">{t("entrySub")}</p>

        <Segmented
          className="mt-6"
          value={who}
          onChange={(v) => { setWho(v); setErr(""); }}
          options={[{ value: "client", label: t("enterClient") }, { value: "coach", label: t("enterCoach") }]}
        />

        <form onSubmit={signIn} className="mt-5 space-y-4">
          {who === "client" && (
            <Field label={t("phone")}>
              <input className="input num text-start" type="tel" inputMode="tel" autoComplete="username" placeholder="01xxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </Field>
          )}
          <Field label={who === "coach" ? t("coachPassword") : t("password")}>
            <div className="relative">
              <input className="input pe-11 text-start" dir="ltr" type={show ? "text" : "password"} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
              <button type="button" onClick={() => setShow(!show)} aria-label={t("password")} className="absolute end-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-muted">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          {err && <p className="text-center text-sm font-bold text-danger">{err}</p>}
          <button className="btn-gold min-h-13 w-full text-lg">{t("signIn")}</button>
          {who === "client" && (
            <a href={waLink(COACH_WA, t("noAccountWa"))} target="_blank" rel="noopener" className="block w-full py-2 text-center font-bold text-gold">
              {t("noAccount")}
            </a>
          )}
        </form>

        <details className="mt-6 text-sm text-muted">
          <summary className="cursor-pointer">{t("demoAccounts")}</summary>
          <p className="mt-2">{t("demoNote")}</p>
          <ul className="num mt-2 space-y-1 text-start" dir="ltr">
            {db.clients.slice(0, 3).map((c) => <li key={c.id}>{c.phone} / {c.password}</li>)}
            <li>coach / {COACH_DEMO_PASSWORD}</li>
          </ul>
          <button onClick={reset} className="mt-3 flex items-center gap-1.5 hover:text-gold"><RotateCcw size={14} /> {t("resetDemo")}</button>
        </details>
      </div>
    </div>
  );
}

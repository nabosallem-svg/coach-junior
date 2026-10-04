"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck, User, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { Avatar, Sheet } from "@/components/ui";

export default function Entry() {
  const { ready, session, setSession, db, reset } = useStore();
  const { t, toggle } = useI18n();
  const router = useRouter();
  const [pick, setPick] = useState(false);

  useEffect(() => {
    if (!ready || !session) return;
    router.replace(session.role === "coach" ? "/coach" : "/app");
  }, [ready, session, router]);

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-xl flex-col">
      <div className="absolute inset-x-0 top-0 h-[62dvh] overflow-hidden">
        <img src="/img/gym-m.webp" alt="" className="size-full object-cover object-top opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/30 via-bg/40 to-bg" />
      </div>
      <button onClick={toggle} className="absolute end-4 top-4 z-10 grid h-10 min-w-10 place-items-center rounded-xl border border-line-gold bg-bg/60 px-2 text-sm font-bold text-gold">
        {t("langToggle")}
      </button>

      <div className="relative z-10 mt-auto px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <img src="/img/logo.webp" alt="Coach Junior" width={96} height={96} className="mb-5 rounded-full" />
        <h1 className="text-4xl font-black leading-tight">{t("entryTitle")}</h1>
        <p className="mt-3 text-lg text-text-2">{t("entrySub")}</p>

        <div className="mt-8 grid gap-3">
          <button className="btn-gold min-h-14 text-lg" onClick={() => setPick(true)}>
            <User size={20} /> {t("enterClient")}
          </button>
          <button
            className="btn-ghost min-h-14 text-lg"
            onClick={() => {
              setSession({ role: "coach" });
              router.push("/coach");
            }}
          >
            <ShieldCheck size={20} /> {t("enterCoach")}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-muted">{t("demoNote")}</p>
        <button onClick={reset} className="mx-auto mt-2 flex items-center gap-1.5 text-sm text-muted underline-offset-4 hover:text-gold hover:underline">
          <RotateCcw size={14} /> {t("resetDemo")}
        </button>
      </div>

      <Sheet open={pick} onClose={() => setPick(false)} title={t("chooseClient")}>
        <ul className="space-y-2">
          {db.clients.map((c) => (
            <li key={c.id}>
              <button
                className="card flex w-full items-center gap-3 p-3 text-start hover:border-line-gold"
                onClick={() => {
                  setSession({ role: "client", clientId: c.id });
                  router.push("/app");
                }}
              >
                <Avatar name={c.name} />
                <span>
                  <span className="block font-bold">{c.name}</span>
                  <span className="text-sm text-muted">{c.goal}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

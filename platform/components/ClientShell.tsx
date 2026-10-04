"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, Home, Salad, Dumbbell, ClipboardList, LogOut, CreditCard, MessageCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { clientNotices, useMe, type Notice } from "@/lib/hooks";
import { Avatar, Brand, Field, Sheet, Splash } from "./ui";
import { asset } from "@/lib/asset";
import { COACH_WA, waLink } from "@/lib/wa";
import { changeOwnPassword } from "@/lib/accounts";

const tabs = [
  { href: "/app", icon: Home, key: "home" },
  { href: "/app/nutrition", icon: Salad, key: "nutrition" },
  { href: "/app/training", icon: Dumbbell, key: "training" },
] as const;

export function noticeText(n: Notice, t: ReturnType<typeof useI18n>["t"]) {
  if (n.kind === "sub") return n.n > 0 ? [t("subExpiring"), t("subExpiringSub", { n: n.n })] : [t("subExpired"), t("subExpiredSub")];
  return [t("pendingFormsCta", { n: n.n }), ""];
}
export const noticeIcon = { sub: CreditCard, form: ClipboardList };

export function ClientShell({ children }: { children: ReactNode }) {
  const { ready, session, setSession, db, update } = useStore();
  const { t, toggle } = useI18n();
  const me = useMe();
  const path = usePathname();
  const router = useRouter();
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pw, setPw] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!session || session.role !== "client" || !me) router.replace("/");
  }, [ready, session, me, router]);

  if (!ready || !me) return <Splash />;
  if (!me.active && !me.pending) {
    const pending = false;
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
        <img src={asset("/img/logo.webp")} alt="" width={96} height={96} className="mb-6 rounded-full" />
        <h1 className="text-2xl font-black">{pending ? t("pendingTitle") : t("pausedTitle")}</h1>
        <p className="mt-3 text-text-2">{pending ? t("pendingSub") : t("pausedSub")}</p>
        <a className="btn-gold mt-8 w-full" target="_blank" rel="noopener" href={waLink(COACH_WA, `${me.name} - ${me.phone}`)}>{t("msgCoachWa")}</a>
        <div className="mt-3 flex w-full gap-2">
          <button onClick={toggle} className="btn-ghost flex-1">{t("langToggle")}</button>
          <button onClick={() => { setSession(null); router.replace("/"); }} className="btn-quiet flex-1"><LogOut size={18} /> {t("logout")}</button>
        </div>
      </div>
    );
  }
  // first thing a new trainee does: the starter form; the app opens after it
  const starter = db.assignments.find((a) => a.clientId === me.id && a.status === "pending" && db.forms.find((f) => f.id === a.formId)?.starter);
  if (starter && !path.startsWith("/app/forms/fill")) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
        <img src={asset("/img/logo.webp")} alt="" width={96} height={96} className="mb-6 rounded-full" />
        <h1 className="text-2xl font-black">{t("welcomeName", { name: me.name.split(" ")[0] })}</h1>
        <p className="mt-3 leading-relaxed text-text-2">{t("starterFirst")}</p>
        <Link href={`/app/forms/fill?id=${starter.id}`} className="btn-gold mt-8 w-full">{t("fillStarter")}</Link>
        <div className="mt-3 flex w-full gap-2">
          <button onClick={toggle} className="btn-ghost flex-1">{t("langToggle")}</button>
          <button onClick={() => { setSession(null); router.replace("/"); }} className="btn-quiet flex-1"><LogOut size={18} /> {t("logout")}</button>
        </div>
      </div>
    );
  }
  const notices = clientNotices(db, me.id);
  const workout = path.startsWith("/app/training/session");

  return (
    <div className="mx-auto min-h-dvh max-w-xl">
      {!workout && (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur">
          <button onClick={() => setMenu(true)} aria-label={me.name}>
            <Avatar name={me.name} />
          </button>
          <Brand />
          <div className="flex items-center gap-1">
            <button onClick={toggle} className="grid h-10 min-w-10 place-items-center rounded-xl border border-line-gold px-2 text-sm font-bold text-gold">
              {t("langToggle")}
            </button>
            <button onClick={() => setBell(true)} aria-label={t("notifications")} className="relative grid size-10 place-items-center text-text-2">
              <Bell size={24} />
              {notices.length > 0 && (
                <span className="num absolute end-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-gold text-xs font-black text-bg">{notices.length}</span>
              )}
            </button>
          </div>
        </header>
      )}

      <main key={path} className={`anim-page ${workout ? "" : "px-4 pb-32 pt-6"}`}>{children}</main>

      {!workout && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <ul className="mx-auto flex max-w-xl justify-around px-2 py-2">
            {tabs.map(({ href, icon: Icon, key }) => {
              const on = href === "/app" ? path === "/app" : path.startsWith(href);
              return (
                <li key={href} className="flex-1">
                  <Link href={href} className="flex flex-col items-center gap-1" aria-current={on ? "page" : undefined}>
                    <span className={`relative grid h-9 w-16 place-items-center rounded-full transition-colors ${on ? "bg-gold-soft text-gold" : "text-muted"}`}>
                      <Icon size={24} strokeWidth={on ? 2.2 : 1.8} />
                    </span>
                    <span className={`text-xs font-bold ${on ? "text-gold" : "text-muted"}`}>{t(key)}</span>
                  </Link>
                </li>
              );
            })}
            <li className="flex-1">
              <a href={waLink(COACH_WA, me.name)} target="_blank" rel="noopener" className="flex flex-col items-center gap-1">
                <span className="grid h-9 w-16 place-items-center rounded-full text-[#25d366]"><MessageCircle size={24} strokeWidth={1.8} /></span>
                <span className="text-xs font-bold text-muted">{t("whatsapp")}</span>
              </a>
            </li>
          </ul>
        </nav>
      )}

      <Sheet open={bell} onClose={() => setBell(false)} title={t("notifications")}>
        {notices.length === 0 ? (
          <p className="py-6 text-center text-muted">{t("noNotifications")}</p>
        ) : (
          <ul className="space-y-2">
            {notices.map((n) => {
              const [a, b] = noticeText(n, t);
              const Icon = noticeIcon[n.kind];
              return (
                <li key={n.kind}>
                  <Link href={n.href} onClick={() => setBell(false)} className="card flex items-center gap-3 p-3">
                    <span className="grid size-10 place-items-center rounded-full bg-gold-soft text-gold"><Icon size={18} /></span>
                    <span><span className="block font-bold">{a}</span>{b && <span className="text-sm text-muted">{b}</span>}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>

      <Sheet open={menu} onClose={() => setMenu(false)} title={me.name}>
        <form
          className="mb-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (pw.length < 6) return;
            changeOwnPassword(pw).then(() => {
              update((d) => { d.clients.find((x) => x.id === me.id)!.password = pw; });
              setPw("");
              setMenu(false);
            }, () => alert(t("syncFailed")));
          }}
        >
          <Field label={t("changePassword")}>
            <input className="input text-start" dir="ltr" type="password" autoComplete="new-password" placeholder={t("minChars")} value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          <button disabled={pw.length < 6} className="btn-ghost w-full">{t("save")}</button>
        </form>
        <button
          className="btn-quiet w-full"
          onClick={() => {
            setSession(null);
            router.replace("/");
          }}
        >
          <LogOut size={18} /> {t("logout")}
        </button>
      </Sheet>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, Users, Clapperboard, ClipboardList, LogOut, CalendarClock, Camera, ClipboardCheck, Hourglass } from "lucide-react";
import { coachNotices } from "@/lib/notify";
import { BellButton, useSeen } from "./Bell";
import { PushToggle } from "./PushToggle";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { Avatar, Brand, Sheet, Splash } from "./ui";
import { Login } from "./Login";

const nav = [
  { href: "/coach", icon: LayoutDashboard, key: "dashboard" },
  { href: "/coach/clients", icon: Users, key: "clients" },
  { href: "/coach/library", icon: Clapperboard, key: "libraryShort" },
  { href: "/coach/plans", icon: ClipboardList, key: "plans" },
] as const;

export function CoachShell({ children }: { children: ReactNode }) {
  const { ready, session, setSession, db, live } = useStore();
  const { t, toggle } = useI18n();
  const path = usePathname();
  const router = useRouter();
  const [bell, setBell] = useState(false);
  const [seen, markSeen] = useSeen("coach");

  if (!ready) return <Splash />;
  // /coach is the coach's own door: signed-out visitors get the coach sign-in here
  if (session?.role !== "coach") return <Login who="coach" onDone={() => router.replace("/coach")} />;

  const unread = db.clients.filter((c) => c.pending).length;
  const isOn = (href: string) => (href === "/coach" ? path === "/coach" : path.startsWith(href));
  const logout = () => { setSession(null); router.replace("/coach"); };
  const notes = coachNotices(db);
  const unseen = notes.filter((n) => !seen.has(n.key)).length;
  const openBell = () => { setBell(true); markSeen(notes.map((n) => n.key)); };
  const noteIcon = { waiting: Hourglass, expiring: CalendarClock, photos: Camera, form: ClipboardCheck };
  const noteText = (n: (typeof notes)[number]) =>
    n.kind === "waiting" || n.kind === "form" ? (n.n >= 7 ? t("planLate", { n: n.n }) : t("planWaiting", { n: n.n, left: 7 - n.n })) : n.kind === "photos" ? t("sentPhotos") : n.n >= 0 ? t("daysLeftN", { n: n.n }) : t("expiredN", { n: -n.n });
  const bellButton = <BellButton count={unseen} onClick={openBell} label={t("notifications")} size={20} />;

  return (
    <div className="min-h-dvh lg:flex">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-52 shrink-0 flex-col border-e border-line bg-card/40 p-3 lg:flex">
        <div className="mb-6 flex items-start justify-between px-2 pt-2"><div><Brand small /><p className="mt-1 text-xs text-muted">{t("coachPanel")}</p></div>{bellButton}</div>
        <ul className="space-y-1">
          {nav.map(({ href, icon: Icon, key }) => (
            <li key={href}>
              <Link href={href} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${isOn(href) ? "bg-gold-soft text-gold" : "text-text-2 hover:bg-card-hi"}`}>
                <Icon size={18} /> <span className="flex-1">{t(key)}</span>
                {key === "clients" && unread > 0 && <span className="num grid size-6 place-items-center rounded-full bg-gold text-xs font-black text-bg">{unread}</span>}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex gap-2">
          <button onClick={toggle} className="grid h-10 min-w-10 place-items-center rounded-xl border border-line-gold px-2 text-sm font-bold text-gold">{t("langToggle")}</button>
          <button onClick={logout} className="flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-line px-2 text-sm font-bold text-text-2 hover:bg-card-hi"><LogOut size={16} /> {t("logout")}</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
          <span className="flex items-center gap-2"><Brand small /><span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-black text-bg">{t("roleCoach")}</span></span>
          <div className="flex items-center gap-2">
            {bellButton}
            <button onClick={toggle} className="grid h-10 min-w-10 place-items-center rounded-xl border border-line-gold px-2 text-sm font-bold text-gold">{t("langToggle")}</button>
            <button onClick={logout} aria-label={t("logout")} className="grid size-10 place-items-center rounded-xl border border-line text-muted"><LogOut size={18} /></button>
          </div>
        </header>
        {/* demo data lives in this browser only; say so, or edits "vanish" when checked from another phone */}
        {!live && <p className="border-b border-line bg-card/60 px-4 py-1.5 text-center text-xs text-muted">{t("demoDeviceOnly")}</p>}
        <main key={path} className="anim-page mx-auto max-w-5xl px-4 pb-32 pt-6 lg:px-8 lg:pb-12">{children}</main>
      </div>

      {/* phone bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="flex justify-around px-2 py-2">
          {nav.map(({ href, icon: Icon, key }) => {
            const on = isOn(href);
            return (
              <li key={href} className="flex-1">
                <Link href={href} className="flex flex-col items-center gap-1" aria-current={on ? "page" : undefined}>
                  <span className={`relative grid h-9 w-14 place-items-center rounded-full ${on ? "bg-gold-soft text-gold" : "text-muted"}`}>
                    <Icon size={22} />
                    {key === "clients" && unread > 0 && <span className="num absolute -top-1 end-1 grid size-5 place-items-center rounded-full bg-gold text-[10px] font-black text-bg">{unread}</span>}
                  </span>
                  <span className={`text-[11px] font-bold ${on ? "text-gold" : "text-muted"}`}>{t(key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Sheet open={bell} onClose={() => setBell(false)} title={t("notifications")}>
        {notes.length === 0 ? (
          <p className="py-6 text-center text-muted">{t("noNotifications")}</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => {
              const c = db.clients.find((x) => x.id === n.clientId);
              const Icon = noteIcon[n.kind];
              return (
                <li key={n.key}>
                  <Link href={`/coach/clients/view?id=${n.clientId}`} onClick={() => setBell(false)} className="card flex items-center gap-3 p-3">
                    <Avatar name={c?.name ?? ""} />
                    <span className="min-w-0 flex-1"><span className="block font-bold">{c?.name}</span><span className={`flex items-center gap-1 text-sm ${n.kind === "waiting" || n.kind === "expiring" ? "text-danger" : "text-gold"}`}><Icon size={14} /> {noteText(n)}</span></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <PushToggle />
      </Sheet>
    </div>
  );
}

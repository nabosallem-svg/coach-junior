"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { DB, ID } from "./types";
import { makeSeed, mergeVariants, seedExercises } from "./seed";
import { useI18n } from "./i18n";
import { LIVE, sb, phoneEmail, COACH_EMAIL } from "./supabase";
import { emptyDB, loadDB, saveDiff, seedIfEmpty } from "./sync";

// Two backends behind one API:
// - demo (no Supabase keys): the whole database lives in localStorage so both sides
//   can be clicked through without a server;
// - live (NEXT_PUBLIC_SUPABASE_URL + ANON_KEY set): Supabase Auth for logins and the
//   docs table for data (lib/sync.ts, supabase/schema.sql).

const DB_VERSION = 12;
const DB_KEY = `cj-platform-db-v${DB_VERSION}`;
const SESSION_KEY = "cj-platform-session-v1";

export type Session = { role: "coach" } | { role: "client"; clientId: ID } | null;

type Ctx = {
  ready: boolean;
  db: DB;
  update: (fn: (draft: DB) => void) => void;
  session: Session;
  setSession: (s: Session) => void;
  reset: () => void;
  /** true, or false / the server's reason when sign-in fails */
  login: (who: "coach" | "client", phone: string, pw: string) => Promise<boolean | string>;
  live: boolean;
  /** last save failed (live only) */
  syncError: string | false;
};

const StoreCtx = createContext<Ctx | null>(null);

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or quota: keep working in memory */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [db, setDb] = useState<DB>(LIVE ? emptyDB : makeSeed);
  const [session, setSessionState] = useState<Session>(null);
  const [syncError, setSyncError] = useState<string | false>(false);
  const sessionRef = useRef<Session>(null);
  const saving = useRef<Promise<unknown>>(Promise.resolve());   // saves run one after another; a reload waits for them
  sessionRef.current = session;

  // live: who is signed in, then everything RLS lets them read
  const boot = useCallback(async () => {
    await saving.current.catch(() => {});   // never read back before our own last write landed
    const { data } = await (await sb()).auth.getSession();
    const user = data.session?.user;
    if (!user) {
      setSessionState(null);
      setDb(emptyDB());
      return;
    }
    const { data: coach } = await (await sb()).from("coaches").select("id").eq("id", user.id).maybeSingle();
    if (coach) await seedIfEmpty(makeSeed()).catch(() => {});
    try {
      const loaded = await loadDB();
      const next = structuredClone(loaded);
      if (coach && mergeVariants(next)) await saveDiff(loaded, next).catch(() => {});
      setDb(next); setSyncError(false);
    } catch (e) { setSyncError(errText(e)); }   // keep what is on screen; never show an empty list as if it were saved
    setSessionState(coach ? { role: "coach" } : { role: "client", clientId: user.id });
  }, []);

  useEffect(() => {
    if (LIVE) {
      boot().finally(() => setReady(true));
      // a trainee coming back to the app sees what the coach changed meanwhile (new plan, renewed package)
      const back = () => { if (document.visibilityState === "visible" && sessionRef.current?.role === "client") boot(); };
      document.addEventListener("visibilitychange", back);
      return () => document.removeEventListener("visibilitychange", back);
    }
    // a new version key used to start from fresh demo data, wiping what the coach built; carry the latest older copy over instead
    let stored = load<DB>(DB_KEY);
    for (let v = DB_VERSION - 1; !stored && v >= 9; v--) stored = load<DB>(`cj-platform-db-v${v}`);
    if (stored) {
      // plans made before the fix were named "Day 1"
      stored.trainingPlans?.forEach((p) => p.days.forEach((d) => { d.name = d.name.replace(/^Day (\d+)$/, "يوم $1"); }));
      // exercises added to the seed later show up in older demo data too
      const have = new Set(stored.exercises.map((e) => e.id));
      stored.exercises.push(...seedExercises.filter((e) => !have.has(e.id)));
      mergeVariants(stored);
      setDb(stored);
    }
    setSessionState(load<Session>(SESSION_KEY));
    setReady(true);
    // coach in one tab and trainee in another: take the other tab's writes so a stale tab never overwrites them
    const onStorage = (e: StorageEvent) => {
      if (e.key === DB_KEY && e.newValue) try { setDb(JSON.parse(e.newValue)); } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [boot]);

  const update = useCallback((fn: (draft: DB) => void) => {
    setDb((prev) => {
      const next = structuredClone(prev);
      fn(next);
      if (LIVE) {
        const s = sessionRef.current;
        // StrictMode may run this twice; upserts and deletes are idempotent
        queueMicrotask(() => {
          const run = saving.current.catch(() => {}).then(() => saveDiff(prev, next, s?.role === "client" ? s.clientId : undefined));
          saving.current = run;
          run.then(() => setSyncError(false), (e) => setSyncError(errText(e)));
        });
      } else save(DB_KEY, next);
      return next;
    });
  }, []);

  const setSession = useCallback((s: Session) => {
    setSessionState(s);
    if (LIVE) {
      if (!s) sb().then((c) => c.auth.signOut()).then(() => setDb(emptyDB()));
    } else save(SESSION_KEY, s);
  }, []);

  const login = useCallback(async (who: "coach" | "client", phone: string, pw: string) => {
    if (LIVE) {
      const email = who === "coach" ? COACH_EMAIL : phoneEmail(phone), client = await sb();
      try {
        let { error } = await client.auth.signInWithPassword({ email, password: normPw(pw) });
        if (error && normPw(pw) !== pw) ({ error } = await client.auth.signInWithPassword({ email, password: pw }));   // accounts made before normPw
        if (error) return error.message || false;
        if (who === "coach") {
          // signed in but not listed in public.coaches: without this the form just re-appears with no message
          const { data: { user } } = await client.auth.getUser();
          const { data: row, error: e2 } = await client.from("coaches").select("id").eq("id", user!.id).maybeSingle();
          if (!row) { await client.auth.signOut(); return e2 ? e2.message : "notCoach"; }
        }
        await boot();
        return true;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    }
    if (who === "coach") {
      if (pw !== COACH_DEMO_PASSWORD) return false;
      setSession({ role: "coach" });
      return true;
    }
    const c = db.clients.find((x) => normPhone(x.phone) === normPhone(phone) && normPw(x.password) === normPw(pw));
    if (!c) return false;
    setSession({ role: "client", clientId: c.id });
    return true;
  }, [boot, db.clients, setSession]);

  const reset = useCallback(() => {
    if (LIVE) return;
    // fresh demo trainees and plans, but the coach's video library stays: the videos themselves live in IndexedDB
    setDb((prev) => {
      const fresh = makeSeed();
      const mine = prev.exercises.filter((e) => e.videoKey || e.videoUrl || !fresh.exercises.some((x) => x.id === e.id));
      fresh.exercises = [...mine, ...fresh.exercises.filter((x) => !mine.some((e) => e.id === x.id))];
      mergeVariants(fresh);
      save(DB_KEY, fresh);
      return fresh;
    });
  }, []);

  return (
    <StoreCtx.Provider value={{ ready, db, update, session, setSession, reset, login, live: LIVE, syncError }}>
      {children}
      {syncError !== false && <SyncBanner msg={syncError} />}
    </StoreCtx.Provider>
  );
}

const errText = (e: unknown) => ((e as { message?: string })?.message || String(e)).slice(0, 160);

function SyncBanner({ msg }: { msg: string }) {
  const { t } = useI18n();
  return <div role="alert" className="fixed inset-x-0 top-0 z-[60] bg-danger px-4 py-2 text-center text-sm font-bold text-white">{t("syncFailed")} <span dir="ltr" className="font-normal opacity-90">({msg})</span></div>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore outside StoreProvider");
  return ctx;
}

/** demo coach password; with Supabase the coach is a normal auth user with role = coach */
export const COACH_DEMO_PASSWORD = "123456789";

/** last 10 digits, so 010..., +2010... and 2010... all match */
export const normPhone = (p: string) => p.replace(/\D/g, "").slice(-10);
/** passwords typed on Arabic keyboards: Arabic/Persian digits to 0-9, no spaces */
export const normPw = (p: string) => p.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0)).replace(/\s+/g, "");

/** readable password the coach can send on WhatsApp: no 0/O/1/l */
export function genPassword() {
  const a = "abcdefghjkmnpqrstuvwxyz", d = "23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)];
  for (let i = 0; i < 4; i++) s += d[Math.floor(Math.random() * d.length)];
  return s;
}

export const uid = (prefix = "id") => `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

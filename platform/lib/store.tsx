"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { DB, ID } from "./types";
import { makeSeed } from "./seed";
import { useI18n } from "./i18n";
import { LIVE, sb, phoneEmail, COACH_EMAIL } from "./supabase";
import { emptyDB, loadDB, saveDiff, seedIfEmpty } from "./sync";

// Two backends behind one API:
// - demo (no Supabase keys): the whole database lives in localStorage so both sides
//   can be clicked through without a server;
// - live (NEXT_PUBLIC_SUPABASE_URL + ANON_KEY set): Supabase Auth for logins and the
//   docs table for data (lib/sync.ts, supabase/schema.sql).

const DB_KEY = "cj-platform-db-v11";
const SESSION_KEY = "cj-platform-session-v1";

export type Session = { role: "coach" } | { role: "client"; clientId: ID } | null;

type Ctx = {
  ready: boolean;
  db: DB;
  update: (fn: (draft: DB) => void) => void;
  session: Session;
  setSession: (s: Session) => void;
  reset: () => void;
  login: (who: "coach" | "client", phone: string, pw: string) => Promise<boolean>;
  live: boolean;
  /** last save failed (live only) */
  syncError: boolean;
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
  const [syncError, setSyncError] = useState(false);
  const sessionRef = useRef<Session>(null);
  sessionRef.current = session;

  // live: who is signed in, then everything RLS lets them read
  const boot = useCallback(async () => {
    const { data } = await sb().auth.getSession();
    const user = data.session?.user;
    if (!user) {
      setSessionState(null);
      setDb(emptyDB());
      return;
    }
    const { data: coach } = await sb().from("coaches").select("id").eq("id", user.id).maybeSingle();
    if (coach) await seedIfEmpty(makeSeed()).catch(() => {});
    setDb(await loadDB().catch(() => emptyDB()));
    setSessionState(coach ? { role: "coach" } : { role: "client", clientId: user.id });
  }, []);

  useEffect(() => {
    if (LIVE) {
      boot().finally(() => setReady(true));
      return;
    }
    const stored = load<DB>(DB_KEY);
    if (stored) {
      // plans made before the fix were named "Day 1"
      stored.trainingPlans?.forEach((p) => p.days.forEach((d) => { d.name = d.name.replace(/^Day (\d+)$/, "يوم $1"); }));
      setDb(stored);
    }
    setSessionState(load<Session>(SESSION_KEY));
    setReady(true);
  }, [boot]);

  const update = useCallback((fn: (draft: DB) => void) => {
    setDb((prev) => {
      const next = structuredClone(prev);
      fn(next);
      if (LIVE) {
        const s = sessionRef.current;
        // StrictMode may run this twice; upserts and deletes are idempotent
        queueMicrotask(() => saveDiff(prev, next, s?.role === "client" ? s.clientId : undefined).then(() => setSyncError(false), () => setSyncError(true)));
      } else save(DB_KEY, next);
      return next;
    });
  }, []);

  const setSession = useCallback((s: Session) => {
    setSessionState(s);
    if (LIVE) {
      if (!s) sb().auth.signOut().then(() => setDb(emptyDB()));
    } else save(SESSION_KEY, s);
  }, []);

  const login = useCallback(async (who: "coach" | "client", phone: string, pw: string) => {
    if (LIVE) {
      const { error } = await sb().auth.signInWithPassword({ email: who === "coach" ? COACH_EMAIL : phoneEmail(phone), password: pw });
      if (error) return false;
      await boot();
      return true;
    }
    if (who === "coach") {
      if (pw !== COACH_DEMO_PASSWORD) return false;
      setSession({ role: "coach" });
      return true;
    }
    const c = db.clients.find((x) => normPhone(x.phone) === normPhone(phone) && x.password === pw);
    if (!c) return false;
    setSession({ role: "client", clientId: c.id });
    return true;
  }, [boot, db.clients, setSession]);

  const reset = useCallback(() => {
    if (LIVE) return;
    const fresh = makeSeed();
    setDb(fresh);
    save(DB_KEY, fresh);
  }, []);

  return (
    <StoreCtx.Provider value={{ ready, db, update, session, setSession, reset, login, live: LIVE, syncError }}>
      {children}
      {syncError && <SyncBanner />}
    </StoreCtx.Provider>
  );
}

function SyncBanner() {
  const { t } = useI18n();
  return <div role="alert" className="fixed inset-x-0 top-0 z-[60] bg-danger px-4 py-2 text-center text-sm font-bold text-white">{t("syncFailed")}</div>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore outside StoreProvider");
  return ctx;
}

/** demo coach password; with Supabase the coach is a normal auth user with role = coach */
export const COACH_DEMO_PASSWORD = "junior2026";

/** last 10 digits, so 010..., +2010... and 2010... all match */
export const normPhone = (p: string) => p.replace(/\D/g, "").slice(-10);

/** readable password the coach can send on WhatsApp: no 0/O/1/l */
export function genPassword() {
  const a = "abcdefghjkmnpqrstuvwxyz", d = "23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)];
  for (let i = 0; i < 4; i++) s += d[Math.floor(Math.random() * d.length)];
  return s;
}

export const uid = (prefix = "id") => `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

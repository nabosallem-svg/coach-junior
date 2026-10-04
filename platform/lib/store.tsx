"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { DB, ID } from "./types";
import { makeSeed } from "./seed";

// Demo backend: the whole database lives in localStorage so the coach side and the
// client side can be clicked through without a server. Swap this provider for a
// Supabase-backed one when a project is connected (see supabase/schema.sql).

const DB_KEY = "cj-platform-db-v8";
const SESSION_KEY = "cj-platform-session-v1";

export type Session = { role: "coach" } | { role: "client"; clientId: ID } | null;

type Ctx = {
  ready: boolean;
  db: DB;
  update: (fn: (draft: DB) => void) => void;
  session: Session;
  setSession: (s: Session) => void;
  reset: () => void;
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
  const [db, setDb] = useState<DB>(makeSeed);
  const [session, setSessionState] = useState<Session>(null);

  useEffect(() => {
    const stored = load<DB>(DB_KEY);
    if (stored) setDb(stored);
    setSessionState(load<Session>(SESSION_KEY));
    setReady(true);
  }, []);

  const update = useCallback((fn: (draft: DB) => void) => {
    setDb((prev) => {
      const next = structuredClone(prev);
      fn(next);
      save(DB_KEY, next);
      return next;
    });
  }, []);

  const setSession = useCallback((s: Session) => {
    setSessionState(s);
    save(SESSION_KEY, s);
  }, []);

  const reset = useCallback(() => {
    const fresh = makeSeed();
    setDb(fresh);
    save(DB_KEY, fresh);
  }, []);

  return <StoreCtx.Provider value={{ ready, db, update, session, setSession, reset }}>{children}</StoreCtx.Provider>;
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

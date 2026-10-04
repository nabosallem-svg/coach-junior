"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { DB, ID } from "./types";
import { makeSeed } from "./seed";

// Demo backend: the whole database lives in localStorage so the coach side and the
// client side can be clicked through without a server. Swap this provider for a
// Supabase-backed one when a project is connected (see supabase/schema.sql).

const DB_KEY = "cj-platform-db-v1";
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

export const uid = (prefix = "id") => `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

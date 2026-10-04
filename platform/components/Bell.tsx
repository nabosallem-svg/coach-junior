"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";

/** which notification keys this person already saw, kept per device */
export function useSeen(who: string) {
  const storageKey = `cj-seen-${who}`;
  const [seen, setSeen] = useState<Set<string>>(new Set());
  useEffect(() => {
    try { setSeen(new Set(JSON.parse(localStorage.getItem(storageKey) ?? "[]"))); } catch {}
  }, [storageKey]);
  const markAll = useCallback((keys: string[]) => {
    setSeen(new Set(keys));
    try { localStorage.setItem(storageKey, JSON.stringify(keys)); } catch {}
  }, [storageKey]);
  return [seen, markAll] as const;
}

export function BellButton({ count, onClick, label, size = 24 }: { count: number; onClick: () => void; label: string; size?: number }) {
  return (
    <button onClick={onClick} aria-label={label} className="relative grid size-10 shrink-0 place-items-center text-text-2">
      <Bell size={size} />
      {count > 0 && <span className="num absolute end-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-gold text-xs font-black text-bg">{count}</span>}
    </button>
  );
}

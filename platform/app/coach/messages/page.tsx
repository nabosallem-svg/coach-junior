"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { fmtDate } from "@/lib/calc";
import { Avatar } from "@/components/ui";

export default function CoachMessages() {
  const { db } = useStore();
  const { t, lang } = useI18n();
  const convos = db.clients
    .map((c) => {
      const msgs = db.messages.filter((m) => m.clientId === c.id).sort((a, b) => a.at.localeCompare(b.at));
      return { c, last: msgs.at(-1), unread: msgs.filter((m) => m.from === "client" && !m.read).length };
    })
    .sort((a, b) => (b.last?.at ?? "").localeCompare(a.last?.at ?? ""));

  return (
    <div>
      <h1 className="h1">{t("conversations")}</h1>
      <ul className="card mt-5 divide-y divide-line">
        {convos.map(({ c, last, unread }) => (
          <li key={c.id}>
            <Link href={`/coach/messages/${c.id}`} className="flex items-center gap-3 p-3 hover:bg-card-hi">
              <Avatar name={c.name} size={44} />
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-2">
                  <b>{c.name}</b>
                  {last && <span className="shrink-0 text-xs text-muted">{fmtDate(last.at, lang, { day: "numeric", month: "short" })}</span>}
                </span>
                <span className={`block truncate text-sm ${unread ? "font-bold text-text" : "text-muted"}`} dir="auto">{last ? `${last.from === "coach" ? "↩ " : ""}${last.text}` : t("noMessages")}</span>
              </span>
              {unread > 0 && <span className="num grid size-6 place-items-center rounded-full bg-gold text-xs font-black text-bg">{unread}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

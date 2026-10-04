"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal, Send } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { fmtDate, fmtTime } from "@/lib/calc";
import { Empty } from "./ui";

/** one conversation between the coach and a client, seen from `as` */
export function Chat({ clientId, as, className = "" }: { clientId: string; as: "coach" | "client"; className?: string }) {
  const { db, update } = useStore();
  const { t, lang } = useI18n();
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const msgs = db.messages.filter((m) => m.clientId === clientId).sort((a, b) => a.at.localeCompare(b.at));
  const unread = msgs.some((m) => m.from !== as && !m.read);

  useEffect(() => {
    if (unread) update((d) => d.messages.forEach((m) => { if (m.clientId === clientId && m.from !== as) m.read = true; }));
  }, [unread, clientId, as, update]);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [msgs.length]);

  const send = () => {
    const v = text.trim();
    if (!v) return;
    update((d) => { d.messages.push({ id: uid("msg"), clientId, from: as, text: v, at: new Date().toISOString(), read: false }); });
    setText("");
  };

  let lastDay = "";
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {msgs.length === 0 ? (
          <Empty icon={<Send size={34} />} title={t("noMessages")} sub={as === "client" ? t("noMessagesSub") : undefined} />
        ) : (
          <ul className="space-y-2">
            {msgs.map((m) => {
              const mine = m.from === as;
              const d = m.at.slice(0, 10);
              const showDay = d !== lastDay;
              lastDay = d;
              return (
                <li key={m.id}>
                  {showDay && <p className="my-3 text-center text-xs text-muted">{fmtDate(m.at, lang, { weekday: "long", day: "numeric", month: "short" })}</p>}
                  <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${mine ? "rounded-ee-md bg-gold text-bg" : "rounded-es-md bg-card-hi"}`}>
                      <p className="whitespace-pre-wrap" dir="auto">{m.text}</p>
                      <p className={`num mt-1 text-[11px] ${mine ? "text-bg/60" : "text-muted"}`}>{fmtTime(m.at, lang)}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={end} />
      </div>
      <form
        className="m-3 flex items-end gap-2 rounded-3xl border border-line bg-card-hi p-2"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={t("typeMessage")}
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 outline-none placeholder:text-muted"
          dir="auto"
        />
        <button aria-label={t("send")} disabled={!text.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-gold text-bg disabled:opacity-40">
          <SendHorizontal size={20} className="rtl:-scale-x-100" />
        </button>
      </form>
    </div>
  );
}

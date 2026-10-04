"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/hooks";
import { fmtDate } from "@/lib/calc";
import { Empty } from "@/components/ui";

export default function Forms() {
  const { db } = useStore();
  const { t, lang, dir } = useI18n();
  const me = useMe()!;
  const [tab, setTab] = useState<"pending" | "submitted">("pending");
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const list = db.assignments.filter((a) => a.clientId === me.id && a.status === tab).sort((a, b) => b.sentAt.localeCompare(a.sentAt));

  return (
    <div>
      <h1 className="h1 text-center">{t("forms")}</h1>
      <div className="mt-5 flex justify-center gap-3">
        {(["pending", "submitted"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-6 py-2.5 text-lg font-bold ${tab === k ? "border-gold bg-gold text-bg" : "border-line text-text-2"}`}>
            {t(k)}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty icon={<ClipboardList size={40} />} title={tab === "pending" ? t("noPending") : t("noSubmitted")} sub={tab === "pending" ? t("noPendingSub") : undefined} />
      ) : (
        <ul className="mt-6 space-y-3">
          {list.map((a) => {
            const f = db.forms.find((x) => x.id === a.formId);
            return (
              <li key={a.id}>
                <Link href={`/app/forms/fill?id=${a.id}`} className="card flex items-center gap-3 p-4 hover:border-line-gold">
                  <span className="grid size-11 place-items-center rounded-full bg-gold-soft text-gold"><ClipboardList size={20} /></span>
                  <span className="flex-1">
                    <span className="block font-bold">{f?.title}</span>
                    <span className="text-sm text-muted">{a.status === "pending" ? t("sentOn", { d: fmtDate(a.sentAt, lang) }) : t("submittedOn", { d: fmtDate(a.submittedAt!, lang) })}</span>
                  </span>
                  <Chevron size={20} className="text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

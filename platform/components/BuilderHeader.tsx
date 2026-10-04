"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** back link + editable title + delete, shared by the three builders */
export function BuilderHeader({ backTab, value, onChange, onDelete, label }: { backTab: string; value: string; onChange: (v: string) => void; onDelete: () => void; label: string }) {
  const { t, dir } = useI18n();
  const router = useRouter();
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;
  return (
    <>
      <Link href={`/coach/plans?tab=${backTab}`} className="mb-4 inline-flex items-center gap-1.5 text-muted hover:text-text"><Back size={18} /> {t("plans")}</Link>
      <div className="flex items-center gap-2">
        <input aria-label={label} className="min-w-0 flex-1 border-b border-line bg-transparent py-1 text-2xl font-black outline-none focus:border-gold" dir="auto" value={value} onChange={(e) => onChange(e.target.value)} />
        <button
          aria-label={t("delete")}
          onClick={() => { if (confirm(t("confirmDelete"))) { onDelete(); router.replace(`/coach/plans?tab=${backTab}`); } }}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-danger"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </>
  );
}

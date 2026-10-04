"use client";

import { useState } from "react";
import { UserCheck, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { fmtDate } from "@/lib/calc";
import type { Client } from "@/lib/types";
import { Avatar, Field, Sheet } from "./ui";

export const PACKAGES = [
  { label: "1", months: 1 },
  { label: "3+1", months: 4 },
  { label: "6+1", months: 7 },
  { label: "12+1", months: 13 },
];

/** coach turns a self sign-up into an active client: package dates + plans */
export function ActivateSheet({ client, onClose, onDone }: { client: Client | null; onClose: () => void; onDone?: () => void }) {
  const { db, update } = useStore();
  const { t } = useI18n();
  const [pkg, setPkg] = useState("1");
  const [tp, setTp] = useState("");
  const [np, setNp] = useState("");
  if (!client) return null;
  return (
    <Sheet open onClose={onClose} title={t("activateTitle", { name: client.name })}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const start = new Date();
          const end = new Date(start);
          end.setMonth(end.getMonth() + PACKAGES.find((p) => p.label === pkg)!.months);
          update((d) => {
            const c = d.clients.find((x) => x.id === client.id)!;
            Object.assign(c, { active: true, pending: false, packageName: pkg, subStart: start.toISOString().slice(0, 10), subEnd: end.toISOString().slice(0, 10), trainingPlanId: tp || c.trainingPlanId, nutritionPlanId: np || c.nutritionPlanId });
          });
          onDone?.();
          onClose();
        }}
      >
        <Field group label={`${t("package")} (${t("months")})`}>
          <div className="grid grid-cols-4 gap-2">
            {PACKAGES.map((p) => (
              <button type="button" key={p.label} onClick={() => setPkg(p.label)} className={`num h-12 rounded-xl border font-bold ${pkg === p.label ? "border-gold bg-gold text-bg" : "border-line text-text-2"}`}>{p.label}</button>
            ))}
          </div>
        </Field>
        <Field label={t("trainingPlan")}>
          <select className="input" value={tp} onChange={(e) => setTp(e.target.value)}>
            <option value="">{t("none")}</option>
            {db.trainingPlans.filter((p) => !p.ownerId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("nutritionPlan")}>
          <select className="input" value={np} onChange={(e) => setNp(e.target.value)}>
            <option value="">{t("none")}</option>
            {db.nutritionPlans.filter((p) => !p.ownerId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <button className="btn-gold min-h-13 w-full text-lg"><UserCheck size={20} /> {t("activate")}</button>
      </form>
    </Sheet>
  );
}

/** list of sign-ups waiting for activation */
export function PendingList({ onActivate }: { onActivate: (c: Client) => void }) {
  const { db, update } = useStore();
  const { t, lang } = useI18n();
  const pending = db.clients.filter((c) => c.pending);
  if (!pending.length) return null;
  return (
    <section className="mt-5 rounded-2xl border border-line-gold bg-gold-soft/40 p-3">
      <h2 className="mb-2 flex items-center gap-2 px-1 font-bold text-gold">{t("requests")} <span className="num grid size-6 place-items-center rounded-full bg-gold text-xs font-black text-bg">{pending.length}</span></h2>
      <ul className="space-y-2">
        {pending.map((c) => (
          <li key={c.id} className="card flex items-center gap-3 p-3">
            <Avatar name={c.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{c.name}</span>
              <span className="num block truncate text-sm text-muted">{c.phone}{c.signedUpAt && ` · ${fmtDate(c.signedUpAt, lang, { day: "numeric", month: "short" })}`}</span>
            </span>
            <button onClick={() => onActivate(c)} className="btn-gold min-h-10 px-4 text-sm">{t("activate")}</button>
            <button
              aria-label={t("reject")}
              onClick={() => { if (confirm(t("confirmDelete"))) update((d) => { d.clients = d.clients.filter((x) => x.id !== c.id); }); }}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-muted hover:text-danger"
            >
              <X size={18} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

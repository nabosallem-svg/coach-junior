"use client";

import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Client } from "@/lib/types";
import { Sheet } from "./ui";

/** shown once after the coach creates an account or resets a password */
export function Creds({ client, password, onClose }: { client: Client | null; password: string; onClose: () => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  if (!client) return null;
  const url = typeof window !== "undefined" ? window.location.origin : "";
  const text = t("waCreds", { name: client.name, url, phone: client.phone, pw: password });
  return (
    <Sheet open onClose={onClose} title={t("credsTitle")}>
      <dl className="card space-y-3 p-4">
        <div className="flex justify-between gap-3"><dt className="text-muted">{t("phone")}</dt><dd className="num font-bold">{client.phone}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted">{t("password")}</dt><dd className="num text-xl font-black tracking-wider text-gold">{password}</dd></div>
      </dl>
      <p className="mt-3 text-sm text-muted">{t("credsNote")}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a className="btn-gold whitespace-nowrap px-3" target="_blank" rel="noopener" href={`https://wa.me/${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`}>
          <MessageCircle size={18} /> {t("sendWa")}
        </a>
        <button className="btn-quiet" onClick={() => { navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => {}); }}>
          <Copy size={18} /> {copied ? t("copied") : t("copy")}
        </button>
      </div>
    </Sheet>
  );
}

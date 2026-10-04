"use client";

import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/hooks";
import { Chat } from "@/components/Chat";

export default function Messages() {
  const { t } = useI18n();
  const me = useMe()!;
  return (
    <div className="card flex h-[calc(100dvh-13rem)] flex-col overflow-hidden rounded-3xl">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <img src="/img/logo-120.webp" alt="" width={44} height={44} className="rounded-full" />
        <div>
          <p className="font-bold">{t("yourCoach")}</p>
          <p className="text-sm text-muted">{t("chatWithCoach")}</p>
        </div>
      </div>
      <Chat clientId={me.id} as="client" className="min-h-0 flex-1" />
    </div>
  );
}

"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { Chat } from "@/components/Chat";
import { Avatar } from "@/components/ui";

export default function CoachChat({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const { db } = useStore();
  const { dir } = useI18n();
  const c = db.clients.find((x) => x.id === clientId);
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;
  if (!c) return null;
  return (
    <div className="card flex h-[calc(100dvh-13rem)] flex-col overflow-hidden rounded-3xl lg:h-[calc(100dvh-6rem)]">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <Link href="/coach/messages" className="text-muted hover:text-text" aria-label="back"><Back size={20} /></Link>
        <Avatar name={c.name} />
        <Link href={`/coach/clients/${c.id}`} className="font-bold hover:text-gold">{c.name}</Link>
      </div>
      <Chat clientId={c.id} as="coach" className="min-h-0 flex-1" />
    </div>
  );
}

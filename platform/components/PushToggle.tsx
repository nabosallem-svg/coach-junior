"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { sb } from "@/lib/supabase";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function keyBytes(b64: string) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (ch) => ch.charCodeAt(0));
}

async function send(method: "POST" | "DELETE", sub: PushSubscription) {
  const { data } = await (await sb()).auth.getSession();
  const res = await fetch("/api/push", { method, headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify({ sub: sub.toJSON() }) });
  if (!res.ok) throw new Error("push");
}

/** asks for phone notifications only when the person taps it, never on load */
export function PushToggle() {
  const { live } = useStore();
  const { t } = useI18n();
  const [state, setState] = useState<"off" | "on" | "denied" | "busy" | "unsupported">("off");
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  useEffect(() => {
    if (!supported) return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.getRegistration().then((r) => r?.pushManager.getSubscription()).then((s) => s && setState("on")).catch(() => {});
  }, [supported]);

  // demo, or keys not set yet: say when it will work instead of a dead button
  if (!live || !KEY) return <p className="mt-4 border-t border-line pt-3 text-center text-xs text-muted">{t("pushLater")}</p>;
  if (state === "unsupported") return <p className="mt-4 border-t border-line pt-3 text-center text-xs text-muted">{t("pushInstall")}</p>;
  if (state === "denied") return <p className="mt-4 border-t border-line pt-3 text-center text-xs text-muted">{t("pushDenied")}</p>;

  const toggle = async () => {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const cur = await reg.pushManager.getSubscription();
      if (cur) { await send("DELETE", cur).catch(() => {}); await cur.unsubscribe(); return setState("off"); }
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) });
      await send("POST", sub);
      setState("on");
    } catch { setState("off"); alert(t("syncFailed")); }
  };

  return (
    <button onClick={toggle} disabled={state === "busy"} className={`mt-4 w-full ${state === "on" ? "btn-quiet" : "btn-ghost"}`}>
      <BellRing size={18} /> {t(state === "on" ? "pushOff" : "pushOn")}
    </button>
  );
}

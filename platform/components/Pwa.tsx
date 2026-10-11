"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
declare global { interface Window { __installPrompt?: PromptEvent | null } }

/** in the root layout: registers the service worker on every page and keeps the browser's install prompt for the button */
export function PwaBoot() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const keep = (e: Event) => { e.preventDefault(); window.__installPrompt = e as PromptEvent; window.dispatchEvent(new Event("cj-install")); };
    const done = () => { window.__installPrompt = null; window.dispatchEvent(new Event("cj-install")); };
    window.addEventListener("beforeinstallprompt", keep);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", keep); window.removeEventListener("appinstalled", done); };
  }, []);
  return null;
}

/** "install the app": the browser's own prompt on Android/desktop, a short how-to on iPhone, nothing once installed */
export function InstallApp({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"none" | "prompt" | "ios">("none");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const check = () => setMode(standalone ? "none" : window.__installPrompt ? "prompt" : ios ? "ios" : "none");
    check();
    window.addEventListener("cj-install", check);
    return () => window.removeEventListener("cj-install", check);
  }, []);

  if (mode === "ios") return <p className={`text-center text-xs text-muted ${className}`}>{t("installIos")}</p>;
  if (mode !== "prompt") return null;
  const install = async () => {
    const p = window.__installPrompt;
    if (!p) return;
    await p.prompt();
    await p.userChoice.catch(() => {});
    window.__installPrompt = null;
    setMode("none");
  };
  return (
    <button onClick={install} className={`btn-ghost w-full ${className}`}>
      <Download size={18} /> {t("installApp")}
    </button>
  );
}

"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { asset } from "@/lib/asset";

export function Brand({ small }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <img src={asset("/img/logo-120.webp")} alt="" width={small ? 32 : 36} height={small ? 32 : 36} className="rounded-full" />
      <span className="font-big text-lg tracking-[0.08em] text-gold">JUNIOR</span>
    </span>
  );
}

/** shown while the app opens, instead of a blank page */
export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <img src={asset("/img/logo-120.webp")} alt="Coach Junior" width={88} height={88} className="animate-pulse rounded-full" />
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="label mb-3 mt-7">{children}</h2>;
}

/** "—— EXERCISES ——" divider used in the plan screens */
export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-4">
      <span className="h-px flex-1 bg-line" />
      <span className="label">{children}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function Empty({ icon, title, sub, children }: { icon: ReactNode; title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-5 grid size-20 place-items-center rounded-full bg-card-hi text-muted">{icon}</div>
      <p className="text-xl font-bold">{title}</p>
      {sub && <p className="mt-2 text-muted">{sub}</p>}
      {children}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className = "" }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div className={`flex rounded-2xl bg-card p-1 ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${value === o.value ? "bg-gold text-bg" : "text-muted hover:text-text"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Pills<T extends string>({ value, onChange, options, bleed = true }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; bleed?: boolean }) {
  return (
    <div className={`no-scrollbar flex gap-2 overflow-x-auto ${bleed ? "-mx-4 px-4" : ""}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`shrink-0 rounded-full border px-5 py-2 font-bold transition-colors ${value === o.value ? "border-gold bg-gold text-bg" : "border-line text-text-2 hover:border-line-gold"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** bottom sheet on phones, centred dialog on wider screens */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="anim-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="anim-sheet max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} aria-label={t("close")} className="grid size-9 place-items-center rounded-full bg-card-hi text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** label + control; pass group for button groups so taps don't hit the first button */
export function Field({ label, children, group }: { label: string; children: ReactNode; group?: boolean }) {
  if (group)
    return (
      <div role="group" aria-label={label}>
        <span className="mb-1.5 block text-sm font-bold text-text-2">{label}</span>
        {children}
      </div>
    );
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-text-2">{label}</span>
      {children}
    </label>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full border border-line-gold bg-gold-soft font-bold text-gold" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name.trim().charAt(0)}
    </span>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4">
      <div className="rounded-full border border-line-gold bg-card-hi px-5 py-2.5 font-bold text-gold shadow-lg">{text}</div>
    </div>
  );
}

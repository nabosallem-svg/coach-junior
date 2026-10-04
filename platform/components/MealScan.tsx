"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { shrinkImage } from "@/lib/media";
import { Sheet } from "./ui";

type Result = { meal: string; items: { name: string; grams: number }[]; kcal: number; p: number; c: number; f: number; note: string };

const toBase64 = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.readAsDataURL(b); });

/** trainee snaps a meal, AI estimates calories and macros (nothing is saved) */
export function MealScan() {
  const { t, lang } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "fail" | "nokey" | "notfood">("idle");
  const [photo, setPhoto] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);

  const pick = async (f?: File) => {
    if (!f) return;
    setRes(null);
    setState("busy");
    const small = await shrinkImage(f, 1024);
    setPhoto(URL.createObjectURL(small));
    try {
      const r = await fetch("/api/meal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: await toBase64(small), mime: small.type || "image/jpeg", lang }) });
      if (r.status === 503 || r.status === 404) return setState("nokey");
      if (!r.ok) return setState("fail");
      const j: Result = await r.json();
      if (!j.meal && !j.kcal) return setState("notfood");
      setRes(j);
      setState("idle");
    } catch { setState("fail"); }
  };
  const close = () => { setPhoto(null); setRes(null); setState("idle"); };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      <button onClick={() => fileRef.current?.click()} className="card mt-5 flex w-full items-center gap-3 p-4 text-start hover:border-line-gold">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold-soft text-gold"><Camera size={20} /></span>
        <span><span className="block font-bold">{t("scanMeal")}</span><span className="text-sm text-muted">{t("scanMealSub")}</span></span>
      </button>
      <Sheet open={!!photo} onClose={close} title={t("scanMeal")}>
        {photo && <img src={photo} alt="" className="max-h-56 w-full rounded-2xl object-cover" />}
        {state === "busy" && <p className="mt-4 flex items-center justify-center gap-2 font-bold text-gold"><Loader2 size={18} className="animate-spin" /> {t("scanBusy")}</p>}
        {state === "fail" && <p className="mt-4 text-center font-bold text-danger">{t("aiFailed")}</p>}
        {state === "nokey" && <p className="mt-4 text-center text-muted">{t("scanNoKey")}</p>}
        {state === "notfood" && <p className="mt-4 text-center text-muted">{t("scanNotFood")}</p>}
        {res && (
          <div className="mt-4">
            <p className="text-lg font-bold" dir="auto">{res.meal}</p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[{ v: res.kcal, l: t("kcal"), c: "text-gold" }, { v: res.p, l: t("protein"), c: "text-protein" }, { v: res.c, l: t("carbs"), c: "text-carbs" }, { v: res.f, l: t("fat"), c: "text-fat" }].map((x) => (
                <div key={x.l} className="rounded-xl bg-card-hi p-2"><p className={`num text-xl font-black ${x.c}`}>{Math.round(x.v)}</p><p className="text-xs text-muted">{x.l}</p></div>
              ))}
            </div>
            {res.items.length > 0 && <ul className="mt-3 space-y-1 text-sm text-text-2">{res.items.map((i, n) => <li key={n} className="flex justify-between gap-3"><bdi>{i.name}</bdi><span className="num text-muted">{i.grams} {t("gram")}</span></li>)}</ul>}
            {res.note && <p className="mt-3 border-s-2 border-gold ps-3 text-sm text-text-2" dir="auto">{res.note}</p>}
            <p className="mt-3 text-xs text-muted">{t("scanDisclaimer")}</p>
          </div>
        )}
      </Sheet>
    </>
  );
}

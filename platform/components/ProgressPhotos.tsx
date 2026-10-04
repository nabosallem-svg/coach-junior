"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { fmtDate } from "@/lib/calc";
import { putVideo, deleteVideo, shrinkImage, useVideoSrc } from "@/lib/media";
import type { ProgressPhoto } from "@/lib/types";
import { Sheet } from "./ui";

const POSES: ProgressPhoto["pose"][] = ["front", "side", "back"];

function Thumb({ ph, onOpen }: { ph: ProgressPhoto; onOpen: () => void }) {
  const src = useVideoSrc(ph.key);
  const { t } = useI18n();
  return (
    <button onClick={onOpen} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-line bg-card-hi">
      {src && <img src={src} alt="" className="size-full object-cover" />}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-4 text-xs font-bold">{t(`pose_${ph.pose}`)}</span>
    </button>
  );
}

function Big({ ph }: { ph: ProgressPhoto }) {
  const src = useVideoSrc(ph.key);
  return src ? <img src={src} alt="" className="max-h-[70dvh] w-full rounded-2xl object-contain" /> : null;
}

/** progress photos grouped by date; the trainee adds them, the coach views them */
export function ProgressPhotos({ clientId, canAdd }: { clientId: string; canAdd?: boolean }) {
  const { db, update } = useStore();
  const { t, lang } = useI18n();
  const [pose, setPose] = useState<ProgressPhoto["pose"]>("front");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<ProgressPhoto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photos = (db.photos ?? []).filter((p) => p.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date));
  const dates = [...new Set(photos.map((p) => p.date))];

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const date = new Date().toISOString().slice(0, 10);
    const made: ProgressPhoto[] = [];
    for (const f of [...files].filter((x) => x.type.startsWith("image/"))) {
      const id = uid("ph");
      const key = `${id}-${Date.now()}`;
      await putVideo(key, await shrinkImage(f));
      made.push({ id, clientId, date, pose, key });
    }
    update((d) => { (d.photos ??= []).push(...made); });
    setBusy(false);
  };

  return (
    <div>
      {canAdd && (
        <div className="card p-4">
          <p className="mb-2 text-sm text-muted">{t("photosNote")}</p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {POSES.map((p) => (
              <button key={p} type="button" onClick={() => setPose(p)} className={`h-10 rounded-xl border text-sm font-bold ${pose === p ? "border-gold bg-gold text-bg" : "border-line text-text-2"}`}>{t(`pose_${p}`)}</button>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-gold w-full"><Camera size={18} /> {busy ? t("uploading") : t("addPhoto")}</button>
        </div>
      )}
      {dates.length === 0 ? (
        !canAdd && <div className="card p-4 text-muted">{t("noPhotos")}</div>
      ) : (
        <div className="mt-3 space-y-4">
          {dates.map((d) => (
            <div key={d}>
              <p className="mb-2 text-sm font-bold text-text-2">{fmtDate(d, lang, { day: "numeric", month: "long", year: "numeric" })}</p>
              <div className="grid grid-cols-3 gap-2">
                {photos.filter((p) => p.date === d).map((p) => <Thumb key={p.id} ph={p} onOpen={() => setOpen(p)} />)}
              </div>
            </div>
          ))}
        </div>
      )}
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? `${t(`pose_${open.pose}`)} · ${fmtDate(open.date, lang, { day: "numeric", month: "long" })}` : ""}>
        {open && (
          <div className="space-y-3">
            <Big ph={open} />
            {canAdd && (
              <button
                onClick={() => { if (!confirm(t("confirmDelete"))) return; deleteVideo(open.key).catch(() => {}); update((d) => { d.photos = (d.photos ?? []).filter((x) => x.id !== open.id); }); setOpen(null); }}
                className="btn-quiet w-full text-danger"
              >
                <Trash2 size={16} /> {t("delete")}
              </button>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}

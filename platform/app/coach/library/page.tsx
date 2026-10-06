"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload, Video, VideoOff, Pencil, Trash2, Link2 } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { useI18n, MUSCLES } from "@/lib/i18n";
import { putVideo, deleteVideo, uploadError, MAX_UPLOAD_MB } from "@/lib/media";
import { VideoBox } from "@/components/VideoBox";
import { Field, Pills, Sheet, Toast } from "@/components/ui";
import type { Exercise, Muscle } from "@/lib/types";

type Draft = { id?: string; name: string; muscle: Muscle | ""; cue: string; videoUrl: string; file: File | null; videoKey?: string; removeVideo?: boolean };
type Pending = { id: string; key: string; file: string; name: string; muscle: Muscle | "" };
const empty: Draft = { name: "", muscle: "", cue: "", videoUrl: "", file: null };

/** phone/screen-recorder file names are noise; only keep a file name that looks like a real exercise name */
const niceName = (file: string) => {
  const n = file.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return /screen ?record|^img|^vid|whatsapp|^\d|\d{4}.\d{2}.\d{2}|^mov|^pxl|^trim/i.test(n) ? "" : n;
};

function Library() {
  const { db, update } = useStore();
  const { t, muscle } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [filter, setFilter] = useState<string>("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [pct, setPct] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const defaultMuscle = (filter === "all" ? "" : filter) as Muscle | "";
  const [pending, setPending] = useState<Pending[] | null>(null);
  const [tried, setTried] = useState(false);

  // several videos at once: store them, then ask for each one's name and muscle before they go in the library
  const bulk = async (files: FileList | File[]) => {
    const vids = [...files].filter((f) => f.type.startsWith("video/"));
    if (!vids.length) return;
    if (vids.length === 1) return setDraft({ ...empty, name: niceName(vids[0].name), muscle: defaultMuscle, file: vids[0] });
    setBusy(true);
    const list: Pending[] = [];
    try {
      for (const f of vids) {
        const id = uid("ex");
        const key = `${id}-${Date.now()}`;
        await putVideo(key, f, setPct);
        list.push({ id, key, file: f.name, name: niceName(f.name), muscle: defaultMuscle });
      }
    } catch (e) {
      setBusy(false);
      setPct(0);
      return alert(uploadError(e, t));
    }
    setBusy(false);
    setPct(0);
    setTried(false);
    setPending(list);
  };
  const savePending = () => {
    if (!pending) return;
    setTried(true);
    if (pending.some((p) => !p.name.trim() || !p.muscle)) return;
    update((d) => { d.exercises.unshift(...pending.map((p) => ({ id: p.id, name: p.name.trim(), muscle: p.muscle as Muscle, videoKey: p.key }))); });
    setToast(t("bulkDone", { n: pending.length }));
    setTimeout(() => setToast(null), 3000);
    setPending(null);
  };
  const cancelPending = () => { pending?.forEach((p) => deleteVideo(p.key).catch(() => {})); setPending(null); };

  useEffect(() => { if (params.get("upload")) setDraft({ ...empty }); }, [params]);

  const list = db.exercises.filter((e) => filter === "all" || e.muscle === filter);
  const used = (id: string) => db.trainingPlans.filter((p) => p.days.some((d) => d.exercises.some((x) => x.exerciseId === id))).length;
  const close = () => { setDraft(null); router.replace("/coach/library"); };

  const save = async () => {
    if (!draft || !draft.name.trim() || !draft.muscle) return;
    setBusy(true);
    const id = draft.id ?? uid("ex");
    let videoKey = draft.removeVideo ? undefined : draft.videoKey;
    if (draft.file) {
      videoKey = `${id}-${Date.now()}`;
      try {
        await putVideo(videoKey, draft.file, setPct);
      } catch (e) {
        setBusy(false);
        setPct(0);
        return alert(uploadError(e, t));
      }
      if (draft.videoKey) await deleteVideo(draft.videoKey).catch(() => {});
      setPct(0);
    } else if (draft.removeVideo && draft.videoKey) {
      await deleteVideo(draft.videoKey).catch(() => {});
    }
    const ex: Exercise = { id, name: draft.name.trim(), muscle: draft.muscle as Muscle, cue: draft.cue.trim() || undefined, videoKey, videoUrl: draft.removeVideo ? undefined : draft.videoUrl.trim() || undefined };
    update((d) => {
      const i = d.exercises.findIndex((e) => e.id === id);
      if (i >= 0) d.exercises[i] = ex; else d.exercises.unshift(ex);
    });
    setBusy(false);
    close();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="h1">{t("libraryShort")}</h1>
        <button className="btn-gold shrink-0" onClick={() => setDraft({ ...empty, muscle: defaultMuscle })}><Upload size={18} /> {t("uploadVideo")}</button>
      </div>

      <div className="mt-5">
        <Pills value={filter} onChange={setFilter} options={[{ value: "all", label: t("all") }, ...MUSCLES.filter((m) => db.exercises.some((e) => e.muscle === m)).map((m) => ({ value: m, label: muscle(m) }))]} />
      </div>

      <button
        type="button"
        onClick={() => bulkRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); bulk(e.dataTransfer.files); }}
        className={`mt-5 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center font-bold transition-colors ${drag ? "border-gold bg-gold-soft text-gold" : "border-line-gold text-gold hover:bg-gold-soft"}`}
      >
        <Upload size={28} />
        <span>{busy ? t("uploadingPct", { n: pct }) : t("dropVideos")}</span>
      </button>
      <input ref={bulkRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => { if (e.target.files) bulk(e.target.files); e.target.value = ""; }} />

      <ul className="mt-5 grid grid-cols-1 gap-2 lg:grid-cols-2">
        {list.map((e) => {
          const has = !!(e.videoKey || e.videoUrl);
          return (
            <li key={e.id}>
              <button
                onClick={() => setDraft({ id: e.id, name: e.name, muscle: e.muscle, cue: e.cue ?? "", videoUrl: e.videoUrl ?? "", file: null, videoKey: e.videoKey })}
                className="card flex w-full items-center gap-3 p-3 text-start hover:border-line-gold"
              >
                <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${has ? "bg-gold-soft text-gold" : "bg-card-hi text-muted"}`}>{has ? <Video size={20} /> : <VideoOff size={20} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold" dir="auto">{e.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{muscle(e.muscle)} · {has ? t("hasVideo") : t("noVideoShort")} · {used(e.id) ? t("usedIn", { n: used(e.id) }) : t("notUsed")}</span>
                </span>
                <Pencil size={16} className="shrink-0 text-muted" />
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={!!draft} onClose={close} title={draft?.id ? t("edit") : t("newExercise")}>
        {draft && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            {(() => { const ex = db.exercises.find((x) => x.id === draft.id); return ex && (ex.videoKey || ex.videoUrl) ? <VideoBox ex={ex} /> : null; })()}
            <Field label={t("exerciseName")}><input className="input" dir="auto" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required autoFocus /></Field>
            <Field label={t("muscle")}>
              <select className="input" required value={draft.muscle} onChange={(e) => setDraft({ ...draft, muscle: e.target.value as Muscle })}>
                <option value="" disabled>{t("pickMuscle")}</option>
                {MUSCLES.map((m) => <option key={m} value={m}>{muscle(m)}</option>)}
              </select>
            </Field>
            <Field label={t("cue")}><textarea className="input min-h-20" value={draft.cue} onChange={(e) => setDraft({ ...draft, cue: e.target.value })} /></Field>

            <div>
              <span className="mb-1.5 block text-sm font-bold text-text-2">{t("videoFile")}</span>
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setDraft({ ...draft, file: e.target.files?.[0] ?? null, removeVideo: false })} />
              <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-gold bg-gold-soft/40 p-6 text-gold hover:bg-gold-soft">
                <Upload size={26} />
                <span className="font-bold">{draft.file ? draft.file.name : draft.videoKey && !draft.removeVideo ? t("replaceVideo") : t("uploadVideo")}</span>
                {draft.file && <span className={`num text-xs ${draft.file.size > MAX_UPLOAD_MB * 1048576 ? "font-bold text-danger" : "text-muted"}`}>{(draft.file.size / 1048576).toFixed(1)} MB{draft.file.size > MAX_UPLOAD_MB * 1048576 ? ` / ${MAX_UPLOAD_MB} MB` : ""}</span>}
              </button>
            </div>
            <Field label={t("orLink")}>
              <div className="relative">
                <Link2 size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
                <input className="input ps-9 text-start" dir="ltr" placeholder="https://youtube.com/..." value={draft.videoUrl} onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value, removeVideo: false })} />
              </div>
            </Field>

            <div className="flex gap-2">
              <button disabled={busy} className="btn-gold flex-1">{busy ? (draft.file ? t("uploadingPct", { n: pct }) : t("uploading")) : t("save")}</button>
              {draft.id && (draft.videoKey || draft.videoUrl) && !draft.removeVideo && (
                <button type="button" onClick={() => setDraft({ ...draft, removeVideo: true, file: null, videoUrl: "" })} className="btn-quiet"><VideoOff size={16} /> {t("removeVideo")}</button>
              )}
              {draft.id && used(draft.id) === 0 && (
                <button
                  type="button"
                  aria-label={t("delete")}
                  className="btn-quiet px-3 text-danger"
                  onClick={() => {
                    if (!confirm(t("confirmDelete"))) return;
                    if (draft.videoKey) deleteVideo(draft.videoKey).catch(() => {});
                    update((d) => { d.exercises = d.exercises.filter((x) => x.id !== draft.id); });
                    close();
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </form>
        )}
      </Sheet>
      <Sheet open={!!pending} onClose={cancelPending} title={t("nameVideos", { n: pending?.length ?? 0 })}>
        {pending && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t("nameVideosNote")}</p>
            {pending.map((p, i) => (
              <div key={p.key} className="card space-y-2 p-3">
                <p className="truncate text-xs text-muted" dir="ltr">{p.file}</p>
                <input className={`input ${tried && !p.name.trim() ? "border-danger" : ""}`} dir="auto" placeholder={t("exerciseName")} value={p.name} onChange={(e) => setPending(pending.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <select className={`input ${tried && !p.muscle ? "border-danger" : ""}`} value={p.muscle} onChange={(e) => setPending(pending.map((x, j) => (j === i ? { ...x, muscle: e.target.value as Muscle } : x)))}>
                  <option value="" disabled>{t("pickMuscle")}</option>
                  {MUSCLES.map((m) => <option key={m} value={m}>{muscle(m)}</option>)}
                </select>
              </div>
            ))}
            {tried && pending.some((p) => !p.name.trim() || !p.muscle) && <p className="text-center text-sm font-bold text-danger">{t("fillAll")}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={savePending} className="btn-gold">{t("save")}</button>
              <button onClick={cancelPending} className="btn-quiet">{t("cancel")}</button>
            </div>
          </div>
        )}
      </Sheet>
      <Toast text={toast} />
    </div>
  );
}

export default function LibraryPage() {
  return <Suspense><Library /></Suspense>;
}

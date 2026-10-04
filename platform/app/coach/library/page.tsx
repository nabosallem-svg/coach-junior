"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload, Video, VideoOff, Pencil, Trash2, Link2 } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { useI18n, MUSCLES } from "@/lib/i18n";
import { putVideo, deleteVideo } from "@/lib/media";
import { VideoBox } from "@/components/VideoBox";
import { Field, Pills, Sheet, Toast } from "@/components/ui";
import type { Exercise, Muscle } from "@/lib/types";

type Draft = { id?: string; name: string; muscle: Muscle; cue: string; videoUrl: string; file: File | null; videoKey?: string; removeVideo?: boolean };
const empty: Draft = { name: "", muscle: "chest", cue: "", videoUrl: "", file: null };

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
  const [toast, setToast] = useState<string | null>(null);

  // several videos at once: one exercise per file, named after the file
  const bulk = async (files: FileList | File[]) => {
    const vids = [...files].filter((f) => f.type.startsWith("video/"));
    if (!vids.length) return;
    setBusy(true);
    const made: Exercise[] = [];
    for (const f of vids) {
      const id = uid("ex");
      const videoKey = `${id}-${Date.now()}`;
      await putVideo(videoKey, f);
      made.push({ id, name: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim(), muscle: (filter === "all" ? "chest" : filter) as Muscle, videoKey });
    }
    update((d) => { d.exercises.unshift(...made); });
    setBusy(false);
    setToast(t("bulkDone", { n: made.length }));
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { if (params.get("upload")) setDraft({ ...empty }); }, [params]);

  const list = db.exercises.filter((e) => filter === "all" || e.muscle === filter);
  const used = (id: string) => db.trainingPlans.filter((p) => p.days.some((d) => d.exercises.some((x) => x.exerciseId === id))).length;
  const close = () => { setDraft(null); router.replace("/coach/library"); };

  const save = async () => {
    if (!draft || !draft.name.trim()) return;
    setBusy(true);
    const id = draft.id ?? uid("ex");
    let videoKey = draft.removeVideo ? undefined : draft.videoKey;
    if (draft.file) {
      if (draft.videoKey) await deleteVideo(draft.videoKey).catch(() => {});
      videoKey = `${id}-${Date.now()}`;
      await putVideo(videoKey, draft.file);
    } else if (draft.removeVideo && draft.videoKey) {
      await deleteVideo(draft.videoKey).catch(() => {});
    }
    const ex: Exercise = { id, name: draft.name.trim(), muscle: draft.muscle, cue: draft.cue.trim() || undefined, videoKey, videoUrl: draft.removeVideo ? undefined : draft.videoUrl.trim() || undefined };
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
        <button className="btn-gold shrink-0" onClick={() => setDraft({ ...empty })}><Upload size={18} /> {t("uploadVideo")}</button>
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
        <span>{busy ? t("uploading") : t("dropVideos")}</span>
      </button>
      <input ref={bulkRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => { if (e.target.files) bulk(e.target.files); e.target.value = ""; }} />

      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((e) => {
          const has = !!(e.videoKey || e.videoUrl);
          return (
            <li key={e.id} className="card overflow-hidden p-3">
              <VideoBox ex={e} />
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold" dir="auto">{e.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="chip py-0.5 text-xs">{muscle(e.muscle)}</span>
                    <span className={`flex items-center gap-1 ${has ? "text-gold" : "text-muted"}`}>{has ? <Video size={14} /> : <VideoOff size={14} />} {has ? t("hasVideo") : t("noVideoShort")}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{t("usedIn", { n: used(e.id) })}</p>
                </div>
                <button onClick={() => setDraft({ id: e.id, name: e.name, muscle: e.muscle, cue: e.cue ?? "", videoUrl: e.videoUrl ?? "", file: null, videoKey: e.videoKey })} aria-label={t("edit")} className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-gold"><Pencil size={16} /></button>
              </div>
            </li>
          );
        })}
      </ul>

      <Sheet open={!!draft} onClose={close} title={draft?.id ? t("edit") : t("newExercise")}>
        {draft && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Field label={t("exerciseName")}><input className="input" dir="auto" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required autoFocus /></Field>
            <Field label={t("muscle")}>
              <select className="input" value={draft.muscle} onChange={(e) => setDraft({ ...draft, muscle: e.target.value as Muscle })}>
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
                {draft.file && <span className="num text-xs text-muted">{(draft.file.size / 1048576).toFixed(1)} MB</span>}
              </button>
            </div>
            <Field label={t("orLink")}>
              <div className="relative">
                <Link2 size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
                <input className="input ps-9 text-start" dir="ltr" placeholder="https://youtube.com/..." value={draft.videoUrl} onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value, removeVideo: false })} />
              </div>
            </Field>

            <div className="flex gap-2">
              <button disabled={busy} className="btn-gold flex-1">{busy ? t("uploading") : t("save")}</button>
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
      <Toast text={toast} />
    </div>
  );
}

export default function LibraryPage() {
  return <Suspense><Library /></Suspense>;
}

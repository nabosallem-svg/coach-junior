"use client";

import { useEffect, useState } from "react";
import { LIVE, sb } from "./supabase";

// Media store for exercise videos and progress photos.
// Demo: blobs in the browser's IndexedDB. Live: the private Supabase bucket "media"
// (videos/<key>, photos/<clientId>/<id>.jpg) played through short-lived signed URLs.

const BUCKET = "media";
/** Supabase's free plan refuses anything bigger, and the request just hangs; catch it before it starts */
export const MAX_UPLOAD_MB = 50;
export const isTooBig = (e: unknown) => (e as { code?: string })?.code === "tooBig";
/** one readable Arabic line for any upload failure, instead of a silent hang */
export function uploadError(e: unknown, t: (k: "uploadFailed" | "tooBigVideo", v?: Record<string, string | number>) => string) {
  if (isTooBig(e)) return t("tooBigVideo", { mb: fileMB(e), max: MAX_UPLOAD_MB });
  return `${t("uploadFailed")}: ${e instanceof Error ? e.message : String(e)}`;
}
export const fileMB = (e: unknown) => Math.round(((e as { mb?: number })?.mb ?? 0) * 10) / 10;
const path = (key: string) => (key.startsWith("photos/") ? key : `videos/${key}`);

const DB_NAME = "cj-media";
const STORE = "videos";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putVideo(key: string, file: Blob, onProgress?: (pct: number) => void) {
  if (file.size > MAX_UPLOAD_MB * 1048576) throw Object.assign(new Error("tooBig"), { code: "tooBig", mb: file.size / 1048576 });
  if (LIVE) {
    const p = path(key);
    // a signed upload URL lets us send the file with XHR, which reports progress; the plain SDK upload reports nothing
    const { data, error } = await Promise.race([
      (await sb()).storage.from(BUCKET).createSignedUploadUrl(p, { upsert: true }),
      new Promise<never>((_, no) => setTimeout(() => no(new Error("timeout")), 30_000)),
    ]);
    if (error || !data) throw error ?? new Error("no upload url");
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", data.signedUrl);
      if (file.type) xhr.setRequestHeader("content-type", file.type);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.timeout = 15 * 60_000;   // a stalled connection fails with a message instead of spinning forever
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.responseText?.slice(0, 120) || `HTTP ${xhr.status}`)));
      xhr.onerror = () => reject(new Error("network"));
      xhr.ontimeout = () => reject(new Error("timeout"));
      xhr.send(file);
    });
    onProgress?.(100);
    return;
  }
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  onProgress?.(100);
}

export async function getVideo(key: string): Promise<Blob | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteVideo(key: string) {
  if (LIVE) {
    await (await sb()).storage.from(BUCKET).remove([path(key)]);
    return;
  }
  const db = await open();
  db.transaction(STORE, "readwrite").objectStore(STORE).delete(key);
}

/** shrink a phone photo to max 1280px JPEG before storing it */
export async function shrinkImage(file: File, max = 1280): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
}

/** object URL for a stored video, or the external URL, or undefined */
export function useVideoSrc(videoKey?: string, videoUrl?: string) {
  const [src, setSrc] = useState<string | undefined>(videoUrl);
  useEffect(() => {
    if (!videoKey) {
      setSrc(videoUrl);
      return;
    }
    let url: string | undefined;
    let alive = true;
    if (LIVE) {
      sb().then((c) => c.storage.from(BUCKET).createSignedUrl(path(videoKey!), 3600)).then(({ data }) => { if (alive) setSrc(data?.signedUrl ?? videoUrl); });
      return () => { alive = false; };
    }
    getVideo(videoKey)
      .then((blob) => {
        if (!alive || !blob) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => setSrc(videoUrl));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [videoKey, videoUrl]);
  return src;
}

/** turns a YouTube watch/share link into an embeddable URL */
export function youtubeEmbed(url?: string) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|[?&]v=|shorts\/|embed\/|live\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

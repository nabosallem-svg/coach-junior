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
      xhr.setRequestHeader("content-type", file.type || "video/mp4");   // the bucket only takes video and image types
      xhr.setRequestHeader("x-upsert", "true");
      // without this the bucket stores "no-cache" and every view downloads the file again; photo keys never change, videos may be replaced
      xhr.setRequestHeader("cache-control", `max-age=${p.startsWith("photos/") ? 31536000 : 86400}`);
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
    const cache = urlCache();
    delete cache[path(key)];
    try { localStorage.setItem(URLS_KEY, JSON.stringify(cache)); } catch {}
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

// Signed URLs are reused (memory + localStorage) until near expiry: the same URL lets the browser
// serve the file from its cache, and a page of photos asks Supabase once instead of once per photo.
// A signed URL keeps working after the subscription ends, so videos get one day and only a
// trainee's own photos (or the coach's view of them) get a week. The cache is wiped on login and
// logout, so the next person on a shared phone never inherits the last one's photo links.
const signSecs = (p: string) => (p.startsWith("photos/") ? 7 * 86400 : 86400);
const URLS_KEY = "cj-signed-urls";
type Signed = { url: string; exp: number };
let urls: Record<string, Signed> | null = null;
function urlCache() {
  if (!urls) {
    try { urls = JSON.parse(localStorage.getItem(URLS_KEY) ?? "{}"); } catch { urls = {}; }
    const now = Date.now();
    for (const [k, v] of Object.entries(urls!)) if (v.exp < now) delete urls![k];
  }
  return urls!;
}
/** forget every cached signed URL (login and logout) */
export function clearSignedUrls() {
  urls = {};
  try { localStorage.removeItem(URLS_KEY); } catch {}
}
let waiting: { p: string; done: (u?: string) => void }[] = [];
function flushSign() {
  const batch = waiting;
  waiting = [];
  const paths = [...new Set(batch.map((w) => w.p))];
  const groups = [...new Set(paths.map(signSecs))].map((secs) => ({ secs, paths: paths.filter((p) => signSecs(p) === secs) }));
  sb()
    .then((c) => Promise.all(groups.map((g) => c.storage.from(BUCKET).createSignedUrls(g.paths, g.secs).then(({ data }) => ({ secs: g.secs, data })))))
    .then((res) => {
      const cache = urlCache();
      for (const { secs, data } of res) {
        const exp = Date.now() + (secs - 3600) * 1000;
        for (const d of data ?? []) if (d.signedUrl && d.path) cache[d.path] = { url: d.signedUrl, exp };
      }
      try { localStorage.setItem(URLS_KEY, JSON.stringify(cache)); } catch {}
      for (const w of batch) w.done(cache[w.p]?.url);
    })
    .catch(() => batch.forEach((w) => w.done()));
}
function signedUrl(key: string): Promise<string | undefined> {
  const p = path(key);
  const hit = urlCache()[p];
  if (hit && hit.exp > Date.now()) return Promise.resolve(hit.url);
  return new Promise((done) => {
    if (!waiting.length) setTimeout(flushSign, 0);
    waiting.push({ p, done });
  });
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
      signedUrl(videoKey).then((u) => { if (alive) setSrc(u ?? videoUrl); });
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

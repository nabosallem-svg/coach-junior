"use client";

import { useEffect, useState } from "react";

// Demo media store: uploaded exercise videos are kept in the browser's IndexedDB.
// With Supabase connected these become uploads to the "exercise-videos" bucket and
// playback uses short-lived signed URLs.

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

export async function putVideo(key: string, file: Blob) {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
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
  const db = await open();
  db.transaction(STORE, "readwrite").objectStore(STORE).delete(key);
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
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

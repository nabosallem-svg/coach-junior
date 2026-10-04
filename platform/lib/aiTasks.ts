"use client";

import { getVideo } from "./media";
import { LIVE, sb } from "./supabase";

export type AiError = "nokey" | "fail";

/** calls /api/ai; throws "nokey" when AI isn't set up on the server */
export async function aiTask<T = { text: string }>(task: string, data: unknown, lang: string, images: { mime: string; data: string }[] = []): Promise<T> {
  const r = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task, data, lang, images }) });
  if (r.status === 503 || r.status === 404) throw new Error("nokey");
  if (!r.ok) throw new Error("fail");
  return r.json();
}

const toBase64 = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.readAsDataURL(b); });

/** a stored progress photo as base64 for the AI */
export async function photoForAi(key: string) {
  let blob: Blob | undefined;
  if (LIVE) {
    const { data } = await sb().storage.from("media").download(key);
    blob = data ?? undefined;
  } else blob = await getVideo(key);
  if (!blob) return null;
  return { mime: blob.type || "image/jpeg", data: await toBase64(blob) };
}

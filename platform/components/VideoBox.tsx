"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { useVideoSrc, youtubeEmbed } from "@/lib/media";
import { useI18n } from "@/lib/i18n";
import type { Exercise } from "@/lib/types";
import { asset } from "@/lib/asset";

export function VideoBox({ ex }: { ex: Exercise }) {
  const { t } = useI18n();
  const src = useVideoSrc(ex.videoKey, ex.videoUrl);
  const [bad, setBad] = useState(false);
  const yt = !ex.videoKey ? youtubeEmbed(ex.videoUrl) : null;
  const [playing, setPlaying] = useState(false);

  if (!src && !yt) {
    return (
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-2xl bg-card-hi">
        <img src={asset("/img/logo-120.webp")} alt="" className="size-16 opacity-30" />
        <span className="absolute bottom-3 text-sm text-muted">{t("noVideo")}</span>
      </div>
    );
  }

  if (!playing) {
    return (
      <button onClick={() => setPlaying(true)} aria-label={t("watchVideo")} className="group relative grid aspect-video w-full place-items-center overflow-hidden rounded-2xl bg-card-hi">
        {src && !yt && <video src={`${src}#t=0.5`} preload="metadata" muted playsInline className="absolute inset-0 size-full object-cover opacity-60" />}
        <span className="relative grid size-20 place-items-center rounded-full bg-text/90 text-bg transition-transform group-hover:scale-105">
          <Play size={34} fill="currentColor" className="translate-x-0.5" />
        </span>
      </button>
    );
  }

  return yt ? (
    <iframe src={`${yt}?autoplay=1&rel=0&modestbranding=1&playsinline=1`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full rounded-2xl" title={ex.name} />
  ) : (
    bad ? (
      <div className="grid aspect-video w-full place-items-center rounded-2xl bg-card-hi p-4 text-center text-sm text-text-2">
        <p>{t("videoFailed")}{src && <> <a href={src} target="_blank" rel="noopener" className="font-bold text-gold underline">{t("openVideo")}</a></>}</p>
      </div>
    ) : (
      <video src={src} controls autoPlay playsInline preload="auto" controlsList="nodownload" onError={() => setBad(true)} className="aspect-video w-full rounded-2xl bg-black" />
    )
  );
}

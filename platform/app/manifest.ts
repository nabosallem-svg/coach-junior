import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { modeFor } from "@/lib/site";

// "Add to home screen" opens the entry page (coach to /coach, trainee to /app); the coach site opens its panel directly
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const coach = modeFor((await headers()).get("host")) === "coach";
  return {
    name: coach ? "لوحة الكابتن · Coach Junior" : "Coach Junior",
    short_name: coach ? "الكابتن" : "Junior",
    start_url: `${base}${coach ? "/coach" : "/"}`,
    scope: `${base}/`,
    display: "standalone",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    icons: [
      { src: `${base}/img/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${base}/img/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}

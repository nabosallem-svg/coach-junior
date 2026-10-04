import type { MetadataRoute } from "next";

// "Add to home screen" always opens the entry page, which sends the coach to /coach and a trainee to /app
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return {
    name: "Coach Junior",
    short_name: "Junior",
    start_url: `${base}/`,
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

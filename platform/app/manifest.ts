import type { MetadataRoute } from "next";

// "Add to home screen" opens the entry page. Static (no request host), so it is served from the CDN;
// the coach site gets its own copy via the proxy rewrite to /coach-manifest (app/coach-manifest/route.ts).
export function buildManifest(coach: boolean): MetadataRoute.Manifest {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
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

export default function manifest(): MetadataRoute.Manifest {
  return buildManifest(false);
}

import type { NextConfig } from "next";

// STATIC_EXPORT=1 builds a static copy (out/) for GitHub Pages under BASE_PATH,
// e.g. BASE_PATH=/coach-junior/platform. Normal builds (Vercel) are unaffected.
const exportMode = process.env.STATIC_EXPORT === "1";
const basePath = exportMode ? process.env.BASE_PATH ?? "" : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // the static copy has no server, so the AI macros route (route.ts) is left out of it
  ...(exportMode && { output: "export", basePath, trailingSlash: true, pageExtensions: ["tsx"] }),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // no framing by other sites (clickjacking), no MIME sniffing, no full URLs leaked to other sites
  ...(!exportMode && {
    headers: async () => [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
      ],
    }],
  }),
};

export default nextConfig;

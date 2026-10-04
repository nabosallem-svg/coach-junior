import type { NextConfig } from "next";

// STATIC_EXPORT=1 builds a static copy (out/) for GitHub Pages under BASE_PATH,
// e.g. BASE_PATH=/coach-junior/platform. Normal builds (Vercel) are unaffected.
const exportMode = process.env.STATIC_EXPORT === "1";
const basePath = exportMode ? process.env.BASE_PATH ?? "" : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(exportMode && { output: "export", basePath, trailingSlash: true }),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;

import { buildManifest } from "../manifest";

// The coach site's manifest; proxy.ts rewrites /manifest.webmanifest here on the coach host.
export const dynamic = "force-static";

export function GET() {
  return Response.json(buildManifest(true), { headers: { "Content-Type": "application/manifest+json" } });
}

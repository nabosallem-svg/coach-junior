import { NextResponse, type NextRequest } from "next/server";
import { modeFor, sitesFor } from "@/lib/site";

// Keeps each site to its own pages (lib/site.ts): by host when one project serves both domains, else by NEXT_PUBLIC_SITE_MODE.
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get("host");
  const mode = modeFor(host);
  const { app, coach } = sitesFor(host);
  const isApp = pathname === "/app" || pathname.startsWith("/app/");
  if (mode === "coach") {
    if (pathname === "/manifest.webmanifest") return NextResponse.rewrite(new URL("/coach-manifest", req.url));
    // trainee links (the WhatsApp login link, /app pages) belong to the trainee site
    if (isApp || (pathname === "/" && search.includes("login=client"))) return NextResponse.redirect(`${app}${pathname}${search}`);
    if (pathname === "/") return NextResponse.redirect(new URL("/coach", req.url));
  }
  if (mode === "client" && (pathname === "/coach" || pathname.startsWith("/coach/"))) return NextResponse.redirect(`${coach}${pathname}${search}`);
  const res = NextResponse.next();
  if (mode === "coach") res.headers.set("X-Robots-Tag", "noindex, nofollow");   // was a <meta robots> from the layout
  return res;
}

export const config = { matcher: ["/", "/app/:path*", "/coach/:path*", "/manifest.webmanifest"] };

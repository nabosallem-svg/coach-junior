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
    // trainee links (the WhatsApp login link, /app pages) belong to the trainee site
    if (isApp || (pathname === "/" && search.includes("login=client"))) return NextResponse.redirect(`${app}${pathname}${search}`);
    if (pathname === "/") return NextResponse.redirect(new URL("/coach", req.url));
  }
  if (mode === "client" && (pathname === "/coach" || pathname.startsWith("/coach/"))) return NextResponse.redirect(`${coach}${pathname}${search}`);
  return NextResponse.next();
}

export const config = { matcher: ["/", "/app/:path*", "/coach/:path*"] };

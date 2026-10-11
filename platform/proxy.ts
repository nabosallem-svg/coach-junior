import { NextResponse, type NextRequest } from "next/server";
import { APP_URL, COACH_URL, SITE_MODE } from "@/lib/site";

// Keeps each site to its own pages when the platform runs as two projects (lib/site.ts).
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isApp = pathname === "/app" || pathname.startsWith("/app/");
  if (SITE_MODE === "coach") {
    // trainee links (the WhatsApp login link, /app pages) belong to the trainee site
    if (isApp || (pathname === "/" && search.includes("login=client"))) return NextResponse.redirect(`${APP_URL}${pathname}${search}`);
    if (pathname === "/") return NextResponse.redirect(new URL("/coach", req.url));
  }
  if (SITE_MODE === "client" && (pathname === "/coach" || pathname.startsWith("/coach/"))) return NextResponse.redirect(`${COACH_URL}${pathname}${search}`);
  return NextResponse.next();
}

export const config = { matcher: ["/", "/app/:path*", "/coach/:path*"] };

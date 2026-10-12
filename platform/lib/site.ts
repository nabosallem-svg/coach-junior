/**
 * The trainee app and the coach panel as two sites. Two ways to run it:
 *  - one Vercel project with both domains: the request host picks the site
 *    (admin.* = coach panel, app.* = trainee app), so all env vars and keys stay in one place
 *  - two projects: NEXT_PUBLIC_SITE_MODE = "client" or "coach" on each build
 * With neither (localhost, previews, the vercel.app address) one site serves both, as before.
 * NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_COACH_URL override the other site's address in two-project mode.
 */
type Mode = "client" | "coach" | "all";
const raw = process.env.NEXT_PUBLIC_SITE_MODE;
export const SITE_MODE: Mode = raw === "client" || raw === "coach" ? raw : "all";

const trim = (u: string) => u.replace(/\/$/, "");
/** the trainee site, as seen from the coach site ("" = this same site) */
export const APP_URL = SITE_MODE === "coach" ? trim(process.env.NEXT_PUBLIC_APP_URL || "https://app.couchjunior.com") : "";
/** the coach site, as seen from the trainee site ("" = this same site) */
export const COACH_URL = SITE_MODE === "client" ? trim(process.env.NEXT_PUBLIC_COACH_URL || "https://admin.couchjunior.com") : "";

/** which site a host serves: admin.* (or coach.*) and app.* decide, anything else falls back to SITE_MODE */
export function modeFor(host: string | null | undefined): Mode {
  const h = (host ?? "").toLowerCase();
  if (h.startsWith("admin.") || h.startsWith("coach.")) return "coach";
  if (h.startsWith("app.")) return "client";
  return SITE_MODE;
}

/** the two addresses as seen from this host: sibling subdomains when the host picked the site, else the env ones */
export function sitesFor(host: string | null | undefined): { app: string; coach: string } {
  const h = (host ?? "").toLowerCase();
  if (h.startsWith("app.") || h.startsWith("admin.") || h.startsWith("coach.")) {
    const root = h.slice(h.indexOf(".") + 1);
    return { app: `https://app.${root}`, coach: `https://admin.${root}` };
  }
  return { app: APP_URL, coach: COACH_URL };
}

/** in the browser: the trainee site's address when this page is the coach site, "" when it's this same site */
export function appUrlHere(): string {
  if (typeof window === "undefined") return APP_URL;
  return modeFor(window.location.host) === "coach" ? sitesFor(window.location.host).app : "";
}

/**
 * One codebase, two Vercel projects. NEXT_PUBLIC_SITE_MODE picks what this build serves:
 *  - "client": the trainee app only (app.couchjunior.com); /coach/* goes to the coach site
 *  - "coach":  the coach panel only (coach.couchjunior.com); / opens the coach panel, /app/* goes to the trainee site
 *  - unset:    both, as before (demo mode, previews, the old single project)
 * NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_COACH_URL override the other site's address.
 */
const raw = process.env.NEXT_PUBLIC_SITE_MODE;
export const SITE_MODE: "client" | "coach" | "all" = raw === "client" || raw === "coach" ? raw : "all";

const trim = (u: string) => u.replace(/\/$/, "");
/** the trainee site, as seen from the coach site ("" = this same site) */
export const APP_URL = SITE_MODE === "coach" ? trim(process.env.NEXT_PUBLIC_APP_URL || "https://app.couchjunior.com") : "";
/** the coach site, as seen from the trainee site ("" = this same site) */
export const COACH_URL = SITE_MODE === "client" ? trim(process.env.NEXT_PUBLIC_COACH_URL || "https://coach.couchjunior.com") : "";

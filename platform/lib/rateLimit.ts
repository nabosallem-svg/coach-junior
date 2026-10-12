// Best-effort limit for the AI routes: they are open to anyone with the link and every call
// spends the Gemini quota. Counts live in the server instance's memory, so a burst from one
// address is cut off; it is not a hard global cap.

const WINDOW = 10 * 60e3, MAX = 30;
const hits = new Map<string, number[]>();

/** null when the call may go ahead, otherwise a 429 response */
export function aiLimited(req: Request): Response | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  if (list.length >= MAX) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "600" } });
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] >= WINDOW) hits.delete(k);
  return null;
}

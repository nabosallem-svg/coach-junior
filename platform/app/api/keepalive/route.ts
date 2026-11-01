import { env } from "@/lib/serverEnv";

// Supabase's free plan pauses a project after about a week with no requests, and then nobody
// can sign in ("Failed to fetch"). vercel.json calls this once a day so the database always sees one.
// Only the public URL + anon key are used, and nothing is returned.
export async function GET() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL"), anon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anon) return Response.json({ skipped: "demo mode" });
  const r = await fetch(`${url}/rest/v1/coaches?select=id&limit=1`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` }, cache: "no-store" });
  return Response.json({ ok: r.ok }, { status: r.ok ? 200 : 502 });
}

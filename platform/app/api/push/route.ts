import { createClient } from "@supabase/supabase-js";

// Saves (POST) or forgets (DELETE) this browser's push subscription for the signed-in user.

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && service ? createClient(url, service, { auth: { persistSession: false } }) : null;
}

async function handle(req: Request, remove: boolean) {
  const db = admin();
  if (!db) return Response.json({ error: "not configured" }, { status: 503 });
  const { data: who } = await db.auth.getUser(req.headers.get("authorization")?.replace("Bearer ", "") ?? "");
  if (!who.user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { sub?: { endpoint?: string } };
  const endpoint = body.sub?.endpoint;
  if (!endpoint) return Response.json({ error: "bad input" }, { status: 400 });
  if (remove) {
    await db.from("push_subs").delete().eq("endpoint", endpoint).eq("user_id", who.user.id);
    return Response.json({});
  }
  const { data: coach } = await db.from("coaches").select("id").eq("id", who.user.id).maybeSingle();
  const { error } = await db.from("push_subs").upsert({ endpoint, user_id: who.user.id, is_coach: !!coach, sub: body.sub });
  return error ? Response.json({ error: error.message }, { status: 400 }) : Response.json({});
}

export const POST = (req: Request) => handle(req, false);
export const DELETE = (req: Request) => handle(req, true);

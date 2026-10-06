import { createClient } from "@supabase/supabase-js";

// Coach-only account management: create a trainee login, reset a password, delete.
// Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on the server.

const email = (phone: string) => `${phone.replace(/\D/g, "").slice(-10)}@coach-junior.app`;

export async function POST(req: Request) {
  // any crash comes back as readable JSON, so the coach sees the real reason instead of a generic failure
  try { return await handle(req); } catch (e) { return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 }); }
}

async function handle(req: Request) {
  // trimmed: a key pasted into Vercel with a trailing space or newline is otherwise rejected
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(), anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(), service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !anon || !service) return Response.json({ error: "not configured" }, { status: 503 });
  const admin = createClient(url, service, { auth: { persistSession: false } });

  // who is calling is checked with the caller's own login (RLS lets a coach read their own coaches row),
  // so a wrong service key can't masquerade as "not a coach"
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const asUser = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: who } = await asUser.auth.getUser(token);
  if (!who.user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { data: coach } = await asUser.from("coaches").select("id").eq("id", who.user.id).maybeSingle();
  if (!coach) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  if (body.action === "create") {
    if (!body.phone || (body.password ?? "").length < 6) return Response.json({ error: "bad input" }, { status: 400 });
    const { data, error } = await admin.auth.admin.createUser({ email: email(body.phone), password: body.password, email_confirm: true });
    if (!error) return Response.json({ id: data.user.id });
    // a login left over from an earlier attempt (no trainee record points at it; the page checks that): reuse it with the new password
    if (/already|exists|registered/i.test(error.message)) {
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const old = list?.users.find((u) => u.email === email(body.phone));
      if (old) {
        const { error: e2 } = await admin.auth.admin.updateUserById(old.id, { password: body.password });
        if (!e2) return Response.json({ id: old.id });
      }
    }
    return Response.json({ error: adminError(error.message) }, { status: 400 });
  }
  if (body.action === "password") {
    if (!body.id || (body.password ?? "").length < 6) return Response.json({ error: "bad input" }, { status: 400 });
    const { error } = await admin.auth.admin.updateUserById(body.id, { password: body.password });
    if (error) return Response.json({ error: adminError(error.message) }, { status: 400 });
    return Response.json({});
  }
  if (body.action === "delete") {
    if (!body.id) return Response.json({ error: "bad input" }, { status: 400 });
    await admin.from("docs").delete().eq("client_id", body.id);
    const { error } = await admin.auth.admin.deleteUser(body.id);
    if (error) return Response.json({ error: adminError(error.message) }, { status: 400 });
    return Response.json({});
  }
  return Response.json({ error: "unknown action" }, { status: 400 });
}

/** admin calls fail like this when SUPABASE_SERVICE_ROLE_KEY is not the project's secret key */
const adminError = (m: string) => (/not allowed|invalid api key|api key|jwt|unauthori[sz]ed|forbidden|permission/i.test(m) ? `bad service key: ${m}` : m);

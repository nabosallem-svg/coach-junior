import { createClient } from "@supabase/supabase-js";

// Coach-only account management: create a trainee login, reset a password, delete.
// Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on the server.

const email = (phone: string) => `${phone.replace(/\D/g, "").slice(-10)}@coach-junior.app`;

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return Response.json({ error: "not configured" }, { status: 503 });
  const admin = createClient(url, service, { auth: { persistSession: false } });

  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const { data: who } = await admin.auth.getUser(token);
  if (!who.user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { data: coach } = await admin.from("coaches").select("id").eq("id", who.user.id).maybeSingle();
  if (!coach) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  if (body.action === "create") {
    if (!body.phone || (body.password ?? "").length < 6) return Response.json({ error: "bad input" }, { status: 400 });
    const { data, error } = await admin.auth.admin.createUser({ email: email(body.phone), password: body.password, email_confirm: true });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ id: data.user.id });
  }
  if (body.action === "password") {
    if (!body.id || (body.password ?? "").length < 6) return Response.json({ error: "bad input" }, { status: 400 });
    const { error } = await admin.auth.admin.updateUserById(body.id, { password: body.password });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({});
  }
  if (body.action === "delete") {
    if (!body.id) return Response.json({ error: "bad input" }, { status: 400 });
    await admin.from("docs").delete().eq("client_id", body.id);
    const { error } = await admin.auth.admin.deleteUser(body.id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({});
  }
  return Response.json({ error: "unknown action" }, { status: 400 });
}

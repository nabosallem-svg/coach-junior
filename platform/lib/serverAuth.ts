import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/serverEnv";

/**
 * The AI routes spend the Gemini quota, so only a signed-in coach or trainee may call them:
 * a login with no coaches row and no trainee record (a stray self sign-up) is refused.
 * Without Supabase keys (the demo build) there are no logins, and only the rate limit applies.
 */
export async function signedIn(req: Request): Promise<boolean> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL"), anon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anon) return true;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return false;
  const asUser = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data } = await asUser.auth.getUser(token);
  if (!data.user) return false;
  // RLS lets each user read only their own coaches row and their own trainee record
  const [coach, client] = await Promise.all([
    asUser.from("coaches").select("id").eq("id", data.user.id).maybeSingle(),
    asUser.from("docs").select("id").eq("coll", "clients").eq("id", data.user.id).maybeSingle(),
  ]);
  return !!(coach.data || client.data);
}

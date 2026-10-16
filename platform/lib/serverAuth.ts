import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/serverEnv";

/**
 * The AI routes spend the Gemini quota, so only a signed-in coach or trainee may call them.
 * Without Supabase keys (the demo build) there are no logins, and only the rate limit applies.
 */
export async function signedIn(req: Request): Promise<boolean> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL"), anon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anon) return true;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return false;
  const { data } = await createClient(url, anon, { auth: { persistSession: false } }).auth.getUser(token);
  return !!data.user;
}

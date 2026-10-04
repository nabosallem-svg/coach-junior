"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Live mode switches on when both public keys are set on Vercel; without them the
// app keeps running on the demo data in the browser.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const LIVE = !!(URL && KEY);

let client: SupabaseClient | null = null;
export function sb() {
  if (!client) client = createClient(URL!, KEY!);
  return client;
}

/** logins are phone + password; Supabase Auth gets them as a hidden email so no SMS provider is needed */
export const phoneEmail = (phone: string) => `${phone.replace(/\D/g, "").slice(-10)}@coach-junior.app`;
/** the coach signs in with only a password; his auth user uses this email */
export const COACH_EMAIL = "coach@coach-junior.app";

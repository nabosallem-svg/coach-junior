import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { coachNotices, traineeNotices } from "@/lib/notify";
import type { DB } from "@/lib/types";

// Daily phone reminders (vercel.json cron). Works out the same notices the bell shows
// and sends one short push per subscribed phone. Needs VAPID keys + CRON_SECRET.

export async function GET(req: Request) {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: service, NEXT_PUBLIC_VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, CRON_SECRET: secret } = process.env;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!url || !service || !pub || !priv) return Response.json({ error: "not configured" }, { status: 503 });
  webpush.setVapidDetails("mailto:coach@coach-junior.app", pub, priv);
  const admin = createClient(url, service, { auth: { persistSession: false } });

  const db: Record<string, unknown[]> = { clients: [], photos: [], measurements: [], trainingPlans: [], logs: [], forms: [], assignments: [] };
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from("docs").select("coll,data").in("coll", Object.keys(db)).range(from, from + 999);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    for (const r of data) db[r.coll].push(r.data);
    if (data.length < 1000) break;
  }
  const all = db as unknown as DB;
  const friday = new Date().getDay() === 5;

  const { data: subs } = await admin.from("push_subs").select("endpoint,user_id,is_coach,sub");
  let sent = 0;
  for (const s of subs ?? []) {
    let msg: { title: string; body: string; url: string } | null = null;
    if (s.is_coach) {
      const n = coachNotices(all).length;
      if (n) msg = { title: "صباح الخير يا كابتن", body: `عندك ${n} ${n === 1 ? "حاجة" : "حاجات"} محتاجة تشوفها النهارده`, url: "/coach" };
    } else {
      const ns = traineeNotices(all, s.user_id);
      const sub = ns.find((x) => x.kind === "sub" && x.n <= 3);
      const plan = ns.find((x) => x.kind === "plan");
      if (sub) msg = sub.n >= 0 ? { title: "اشتراكك قرب يخلص", body: `فاضل ${sub.n} يوم. كلم الكابتن عشان تجدد.`, url: "/app" } : { title: "اشتراكك خلص", body: "كلم الكابتن عشان تجدد.", url: "/app" };
      else if (plan) msg = { title: "خطتك جاهزة 💪", body: "الكابتن جهزلك خطتك، ادخل شوفها.", url: "/app/training" };
      else if (ns.some((x) => x.kind === "workout")) msg = { title: "جاهز لتمرين النهارده؟", body: "افتح التمرين وعلّم ✓ على كل تمرين تخلّصه.", url: "/app/training" };
      else if (friday && ns.some((x) => x.kind === "weigh")) msg = { title: "سجّل وزنك", body: "سجّل وزن الأسبوع عشان الكابتن يتابع تقدمك.", url: "/app" };
    }
    if (!msg) continue;
    try {
      await webpush.sendNotification(s.sub, JSON.stringify(msg));
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("push_subs").delete().eq("endpoint", s.endpoint);
    }
  }
  return Response.json({ sent });
}

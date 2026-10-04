import { NextResponse } from "next/server";
import { aiConfigured, askJSON, num } from "@/lib/ai";

// A trainee's meal photo -> estimated calories and macros (Gemini, see lib/ai.ts).
export async function POST(req: Request) {
  if (!aiConfigured()) return NextResponse.json({ error: "no_key" }, { status: 503 });
  const body = await req.json().catch(() => null);
  const mime = String(body?.mime ?? "image/jpeg");
  const data = String(body?.image ?? "");
  if (!/^image\/(jpeg|png|webp)$/.test(mime) || !data || data.length > 4_000_000) return NextResponse.json({ error: "bad_image" }, { status: 400 });
  const lang = body?.lang === "en" ? "English" : "Egyptian Arabic";

  const prompt = `You are a sports nutritionist. Look at this meal photo (likely Egyptian food) and estimate what is on the plate and the portion sizes.
Reply with JSON only:
{"meal": short meal name in ${lang}, "items": [{"name": item name in ${lang}, "grams": number}], "kcal": number, "p": number, "c": number, "f": number, "note": one short tip in ${lang} for someone trying to lose fat and build muscle}
p, c, f are total grams of protein, carbohydrate and fat for the whole plate. If the photo is not food, reply {"meal": "", "items": [], "kcal": 0, "p": 0, "c": 0, "f": 0, "note": ""}.`;

  const j = await askJSON(prompt, { mime, data });
  if (!j) return NextResponse.json({ error: "upstream" }, { status: 502 });
  const items = Array.isArray(j.items) ? (j.items as { name?: unknown; grams?: unknown }[]).slice(0, 8).map((i) => ({ name: String(i.name ?? "").slice(0, 60), grams: Math.round(num(i.grams)) })) : [];
  return NextResponse.json({ meal: String(j.meal ?? "").slice(0, 80), items, kcal: Math.round(num(j.kcal)), p: num(j.p), c: num(j.c), f: num(j.f), note: String(j.note ?? "").slice(0, 200) });
}

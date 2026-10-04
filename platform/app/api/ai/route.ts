import { NextResponse } from "next/server";
import { aiConfigured, askJSON } from "@/lib/ai";

// Small Gemini helpers for the coach and trainee. The browser sends only the data a task
// needs (it already holds it); every task replies with JSON. See lib/aiTasks.ts.

type Img = { mime: string; data: string };

const PROMPTS: Record<string, (d: Record<string, unknown>, lang: string) => string> = {
  // coach: one-glance weekly summary of a trainee
  summary: (d, lang) => `You help an online fitness coach in Egypt. Write a short weekly summary in ${lang} of this trainee for the coach: weight trend, how many workouts this week vs. before, subscription status, and one clear next step (e.g. message them on WhatsApp). Max 4 short lines, plain text, no markdown.
Data: ${JSON.stringify(d)}
Reply JSON: {"text": string}`,
  // coach: ready WhatsApp message to a late or expiring trainee
  wa: (d, lang) => `Write a short friendly WhatsApp message in ${lang} (Egyptian dialect if Arabic) from coach Junior to this trainee. If the subscription ends within 7 days or has ended, remind them to renew. Otherwise, if they have not trained in the last 5 days, motivate them to get back. Otherwise, praise their progress. 2-3 sentences, no hashtags, at most one emoji.
Data: ${JSON.stringify(d)}
Reply JSON: {"text": string}`,
  // coach: compare the two latest progress photos
  photos: (d, lang) => `You help a fitness coach. The first image(s) are the trainee's OLDER progress photos, the last image(s) are the NEWER ones (${JSON.stringify(d)}). Compare visible changes in body shape (waist, shoulders, definition, posture) carefully and kindly. If lighting or pose differ too much, say so. Write 2-4 short lines in ${lang} for the coach, plain text.
Reply JSON: {"text": string}`,
  // coach: first-draft meal plan using only the coach's food list
  mealplan: (d, lang) => `You are a sports nutritionist in Egypt. Build a one-day meal plan draft for this trainee that the coach will edit. Pick a sensible daily calorie target from their weight, height, goal and experience (fat loss: ~20% deficit, protein ~2 g/kg). Use ONLY foods from the list by their id; qty is in the food's unit (grams for "g"/"ml", count for "piece"/"scoop"). Avoid foods they dislike. 4 meals with names in ${lang}.
Trainee: ${JSON.stringify(d.client)}
Foods (id, name, unit, macros per "per" amount): ${JSON.stringify(d.foods)}
Reply JSON: {"name": short plan name in ${lang}, "kcal": target, "meals": [{"name": string, "items": [{"foodId": string, "qty": number}]}]}`,
  // trainee: replacement exercise from the coach's own library
  swapExercise: (d, lang) => `A trainee can't do this exercise right now (no machine free or available): ${JSON.stringify(d.exercise)}.
Choose the single best replacement that trains the same muscle from this list of the coach's exercises (use its id exactly): ${JSON.stringify(d.library)}.
Reply JSON: {"exerciseId": string, "why": one short sentence in ${lang}}. If nothing fits, use "" for exerciseId.`,
};

export async function POST(req: Request) {
  if (!aiConfigured()) return NextResponse.json({ error: "no_key" }, { status: 503 });
  const body = await req.json().catch(() => null);
  const task = String(body?.task ?? "");
  const make = PROMPTS[task];
  if (!make) return NextResponse.json({ error: "bad_task" }, { status: 400 });
  const data = (body?.data ?? {}) as Record<string, unknown>;
  if (JSON.stringify(data).length > 60_000) return NextResponse.json({ error: "too_big" }, { status: 400 });
  const lang = body?.lang === "en" ? "English" : "Egyptian Arabic";
  const images = (Array.isArray(body?.images) ? body.images : []).slice(0, 4).filter((i: Img) => /^image\/(jpeg|png|webp)$/.test(i?.mime) && typeof i?.data === "string" && i.data.length < 3_000_000) as Img[];

  const j = await askJSON(make(data, lang), images);
  if (!j) return NextResponse.json({ error: "upstream" }, { status: 502 });
  return NextResponse.json(j);
}

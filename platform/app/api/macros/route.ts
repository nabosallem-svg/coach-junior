import { NextResponse } from "next/server";

import { aiConfigured, askJSON, num } from "@/lib/ai";

// Estimates macros for a food the coach types in. Needs GEMINI_API_KEY (or ANTHROPIC_API_KEY)
// on the server (Vercel env). Without a key it answers 503 and the form stays manual.
const UNITS = { g: "grams", piece: "piece(s)", ml: "millilitres", scoop: "scoop(s)" } as const;

export async function POST(req: Request) {
  if (!aiConfigured()) return NextResponse.json({ error: "no_key" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 80);
  const unit = (body?.unit in UNITS ? body.unit : "g") as keyof typeof UNITS;
  const per = Math.min(Math.max(Number(body?.per) || (unit === "g" || unit === "ml" ? 100 : 1), 0.1), 2000);
  if (!name) return NextResponse.json({ error: "no_name" }, { status: 400 });

  const prompt = `Food (Egyptian Arabic or English name): "${name}"
Amount: ${per} ${UNITS[unit]}
Give realistic nutrition for exactly that amount, using USDA-style reference values. If the name does not say raw or cooked, assume the way it is normally eaten in Egypt (meat, rice and pasta cooked). For "piece", assume a typical medium piece.
Reply with JSON only: {"kcal": number, "p": number, "c": number, "f": number} where p, c, f are grams of protein, carbohydrate and fat. No other text.`;

  const j = await askJSON(prompt);
  if (!j) return NextResponse.json({ error: "upstream" }, { status: 502 });
  return NextResponse.json({ kcal: Math.round(num(j.kcal)), p: num(j.p), c: num(j.c), f: num(j.f) });
}

import { NextResponse } from "next/server";

// Estimates macros for a food the coach types in. Needs ANTHROPIC_API_KEY on the server (Vercel env).
// Without a key it answers 503 and the form stays manual.
const MODEL = "claude-haiku-4-5-20251001";
const UNITS = { g: "grams", piece: "piece(s)", ml: "millilitres", scoop: "scoop(s)" } as const;

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 80);
  const unit = (body?.unit in UNITS ? body.unit : "g") as keyof typeof UNITS;
  const per = Math.min(Math.max(Number(body?.per) || (unit === "g" || unit === "ml" ? 100 : 1), 0.1), 2000);
  if (!name) return NextResponse.json({ error: "no_name" }, { status: 400 });

  const prompt = `Food (Egyptian Arabic or English name): "${name}"
Amount: ${per} ${UNITS[unit]}
Give realistic nutrition for exactly that amount, using USDA-style reference values. If the name does not say raw or cooked, assume the way it is normally eaten in Egypt (meat, rice and pasta cooked). For "piece", assume a typical medium piece.
Reply with JSON only: {"kcal": number, "p": number, "c": number, "f": number} where p, c, f are grams of protein, carbohydrate and fat. No other text.`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 100, messages: [{ role: "user", content: prompt }] }),
  });
  if (!r.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
  const data = await r.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  try {
    const j = JSON.parse(m?.[0] ?? "");
    const n = (v: unknown) => Math.max(0, Math.round((Number(v) || 0) * 10) / 10);
    return NextResponse.json({ kcal: Math.round(n(j.kcal)), p: n(j.p), c: n(j.c), f: n(j.f) });
  } catch {
    return NextResponse.json({ error: "parse" }, { status: 502 });
  }
}

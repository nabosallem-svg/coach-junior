// Server-only AI helper. Gemini when GEMINI_API_KEY is set, otherwise Claude when
// ANTHROPIC_API_KEY is set. Returns the model's JSON reply, or null on any failure.

type Img = { mime: string; data: string }; // base64

export const aiConfigured = () => !!(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);

export async function askJSON(prompt: string, image?: Img | Img[]): Promise<Record<string, unknown> | null> {
  const gemini = process.env.GEMINI_API_KEY;
  const imgs = image ? ([] as Img[]).concat(image) : [];
  let text = "";
  if (gemini) {
    const parts: unknown[] = [{ text: prompt }];
    for (const im of imgs) parts.push({ inline_data: { mime_type: im.mime, data: im.data } });
    // fall back to the lighter model when the main one is busy (503) or rate limited (429)
    let r: Response | null = null;
    for (const model of ["gemini-flash-latest", "gemini-flash-lite-latest"]) {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(gemini)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }),
      });
      if (r.ok || (r.status !== 503 && r.status !== 429)) break;
    }
    if (!r?.ok) {
      console.error("gemini", r?.status, (await r?.text())?.slice(0, 300));
      return null;
    }
    const data = await r.json();
    text = (data?.candidates?.[0]?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? "").join("");
  } else if (process.env.ANTHROPIC_API_KEY) {
    const content: unknown[] = [...imgs.map((im) => ({ type: "image", source: { type: "base64", media_type: im.mime, data: im.data } })), { type: "text", text: prompt }];
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1500, messages: [{ role: "user", content }] }),
    });
    if (!r.ok) return null;
    text = (await r.json())?.content?.[0]?.text ?? "";
  } else return null;
  try {
    return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "");
  } catch {
    console.error("ai parse", text.slice(0, 300));
    return null;
  }
}

export const num = (v: unknown) => Math.max(0, Math.round((Number(v) || 0) * 10) / 10);

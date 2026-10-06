// Server-only helpers for secrets read from Vercel env vars.

/** a key pasted with a space or line break becomes an invalid HTTP header, so strip all whitespace */
export const env = (name: string) => process.env[name]?.replace(/\s+/g, "") || undefined;

/** never let a key or token reach the screen: library errors can quote request headers */
export const safe = (m: string) =>
  /header|bearer/i.test(m) ? "bad service key: invalid header (check the key on Vercel)"
    : m.replace(/(sb_(secret|publishable)_|eyJ)[\w.-]+/g, "[key]").slice(0, 200);

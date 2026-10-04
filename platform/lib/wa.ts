/** coach's WhatsApp (public on the landing page); questions go there instead of an in-app chat */
export const COACH_WA = "201014007764";

/** wa.me needs the international number: Egyptian 01xxxxxxxxx -> 201xxxxxxxxx */
export const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "").replace(/^00/, "");
  return /^01\d{9}$/.test(d) ? `2${d}` : d;
};

export const waLink = (phone: string, text?: string) =>
  `https://wa.me/${waNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

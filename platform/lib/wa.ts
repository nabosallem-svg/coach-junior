/** coach's WhatsApp (public on the landing page); questions go there instead of an in-app chat */
export const COACH_WA = "201014007764";

export const waLink = (phone: string, text?: string) =>
  `https://wa.me/${phone.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

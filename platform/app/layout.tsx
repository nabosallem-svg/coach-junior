import type { Metadata, Viewport } from "next";
import "./globals.css";
import localFont from "next/font/local";
import { asset } from "@/lib/asset";
import { headers } from "next/headers";
import { modeFor } from "@/lib/site";

// two families so each file keeps its own script (Latin first, Arabic falls through)
const cairoLatin = localFont({ src: "../public/fonts/cairo-latin.woff2", weight: "500 900", variable: "--font-cairo-latin", display: "swap", adjustFontFallback: false });
const cairoArabic = localFont({ src: "../public/fonts/cairo-arabic.woff2", weight: "500 900", variable: "--font-cairo-arabic", display: "swap", adjustFontFallback: false });
const anton = localFont({ src: "../public/fonts/anton-latin.woff2", weight: "400", variable: "--font-anton", display: "swap", adjustFontFallback: false });
import { StoreProvider } from "@/lib/store";
import { I18nProvider } from "@/lib/i18n";
import { PwaBoot } from "@/components/Pwa";

// the coach site (coach.* host or NEXT_PUBLIC_SITE_MODE=coach) gets its own title and stays out of search
export async function generateMetadata(): Promise<Metadata> {
  const coachSite = modeFor((await headers()).get("host")) === "coach";
  return {
    title: coachSite ? "لوحة الكابتن · Coach Junior" : "Coach Junior",
    description: coachSite ? "لوحة تحكم الكابتن جونيور" : "منصة كوتش جونيور للمتابعة الأونلاين",
    icons: { icon: asset("/img/icon-64.png"), apple: asset("/img/icon-180.png") },
    appleWebApp: { capable: true, title: coachSite ? "الكابتن" : "Junior", statusBarStyle: "black-translucent" },
    ...(coachSite && { robots: { index: false, follow: false } }),
  };
}

export const viewport: Viewport = { themeColor: "#0a0a0c", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairoLatin.variable} ${cairoArabic.variable} ${anton.variable}`}>
      <body className="min-h-dvh">
        <I18nProvider>
          <StoreProvider>{children}</StoreProvider>
          <PwaBoot />
        </I18nProvider>
      </body>
    </html>
  );
}

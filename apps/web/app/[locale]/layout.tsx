import type { ReactNode } from "react";
import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { ThemeProvider } from "next-themes";
import "../../styles/globals.css";
import { bodyFont, displayFont, monoFont } from "@/lib/fonts";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";

// Site-wide fallback; per-route pages (starting with the landing page,
// P4.S1) set their own generateMetadata and override title via the "%s |
// پارسیان" template below.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "پارسیان",
    template: "%s | پارسیان",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const dir = locale === "fa" ? "rtl" : "ltr";

  return (
    // suppressHydrationWarning is required by next-themes: its blocking
    // inline script sets `data-theme` on <html> before React hydrates,
    // which would otherwise be flagged as a server/client mismatch
    // (masterPlan.md §6.7 -- no flash on reload in either theme).
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <body className="font-body">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

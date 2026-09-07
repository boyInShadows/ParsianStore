import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { ThemeProvider } from "next-themes";
import "../../styles/globals.css";
import { bodyFont, monoFont } from "@/lib/fonts";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";
import { readThemeColors } from "@/lib/design-tokens";

// Site-wide fallback; per-route pages (starting with the landing page,
// P4.S1) set their own generateMetadata and override title via the "%s |
// پارسیان" template below.
/**
 * Read from tokens.css rather than written here (P13.S9).
 *
 * Next needs a literal for `themeColor` -- it cannot reference a CSS custom
 * property -- and CLAUDE.md rule 5 makes tokens.css the sole hex source. Parsing
 * the value satisfies both; pasting `#0e1418` into this file would satisfy
 * neither for long. The browser paints its own chrome with this, so a drift from
 * `--bg` shows up as a seam above the page.
 */
const themeColors = readThemeColors();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "پارسیان",
    template: "%s | پارسیان",
  },
};

/**
 * `themeColor` lives in the viewport export, not in `metadata`.
 *
 * Next 15 moved it, and it does not fail loudly when it is in the wrong place:
 * the build prints "Unsupported metadata themeColor is configured in metadata
 * export" and then simply omits the tag. The first cut of this shipped with no
 * theme-color at all and a green build, which is exactly the kind of gap the
 * audit found in the first place.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: themeColors.light },
    { media: "(prefers-color-scheme: dark)", color: themeColors.dark },
  ],
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
      // No `displayFont.variable` -- there is no display family any more
      // (P14.S2). `--font-display` is defined in tokens.css as an alias of
      // `--font-body`, so every `font-display` utility still resolves.
      className={`${bodyFont.variable} ${monoFont.variable}`}
    >
      <body className="font-body">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

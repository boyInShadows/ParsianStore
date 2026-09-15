import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { ThemeProvider } from "next-themes";
import "../../styles/globals.css";
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
      // No font className any more (P15.S9). `--font-body`/`--font-mono` are
      // plain :root declarations in tokens.css naming the hand-written
      // @font-face families in styles/fonts.css -- a static family name has
      // no per-build hash to scope, so <html> needs nothing attached for
      // typography to resolve. `--font-display` keeps aliasing --font-body
      // (P14.S1) the same way it always has.
    >
      {/* A real, parser-visible font preload (P15.S9) -- next/font's
          ReactDOM.preload() call never reached <head> at all; it landed in
          the RSC Flight payload as a `:HL[...]` instruction inside an inline
          script instead of a `<link>` (verified on a production build of
          `/`: 18 `<link>` elements, none of them the font -- see
          styles/fonts.css and tasks.md P15.S9/S3c). This is a JSX `<link>`,
          so it is real markup the parser sees before any script runs.
          Vazirmatn only: it is the sole above-the-fold family, and the one
          `display: "optional"` needs to win its block window. JetBrains
          Mono carries codes/SKUs, is never an LCP candidate, and is
          deliberately NOT preloaded. `crossOrigin` is mandatory, not
          decoration: the font spec fetches @font-face resources in CORS
          mode regardless of this attribute, so a preload without a matching
          `crossorigin` is treated as a different request and the font is
          fetched twice. */}
      <head>
        <link
          rel="preload"
          href="/fonts/vazirmatn/Vazirmatn-Variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      {/* `suppressHydrationWarning` here is NOT for anything this app renders
          -- it is for what browser extensions add. ColorZilla writes
          `cz-shortcut-listen="true"` on <body> before React hydrates, and
          several password managers and translators do the same thing, so a
          machine with one installed logs a hydration mismatch on every page
          load. It is noise: the attribute is not ours, nothing reads it, and
          React repairs nothing by warning about it -- but it lands in every
          console capture and every screenshot run (P14.S9). The suppression is
          one level deep, so a real mismatch inside <body>'s children is still
          reported. */}
      <body className="font-body" suppressHydrationWarning>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

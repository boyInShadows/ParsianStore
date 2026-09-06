import { routing } from "@/i18n/routing";

// masterPlan.md §11: no Vercel, self-hosted deploy -- NEXT_PUBLIC_SITE_URL
// is the real deployed origin per .env.example, not inferred from request
// headers (which can't be trusted for canonical/OG URLs).
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}

// next-intl §7.1: `fa` is unprefixed (`/`), `en` is prefixed (`/en/...`).
// Mirrors routing.ts's localePrefix: "as-needed" so hreflang alternates
// stay correct without hardcoding the prefix rule a second time.
export function localizedPath(locale: (typeof routing.locales)[number], path = "/"): string {
  if (locale === routing.defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/**
 * Locales worth advertising to a crawler (P13.S9).
 *
 * `en` is architected but not translated: `i18n/messages.ts` layers `fa`
 * underneath it, so /en serves Persian copy under an English URL. Telling a
 * crawler that is the English alternate of the Persian page is a soft error --
 * two URLs, one language. The route stays (nothing is broken, and the locale
 * returns one day); the advertisement stops.
 *
 * One line to reverse when the translations land.
 */
const SUSPENDED_LOCALES = new Set<string>(["en"]);

export function hreflangAlternates(path = "/"): Record<string, string> {
  return Object.fromEntries(
    routing.locales
      .filter((locale) => !SUSPENDED_LOCALES.has(locale))
      .map((locale) => [locale, absoluteUrl(localizedPath(locale, path))]),
  );
}

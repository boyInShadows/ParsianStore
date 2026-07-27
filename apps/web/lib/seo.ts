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

export function hreflangAlternates(path = "/"): Record<string, string> {
  return Object.fromEntries(
    routing.locales.map((locale) => [locale, absoluteUrl(localizedPath(locale, path))]),
  );
}

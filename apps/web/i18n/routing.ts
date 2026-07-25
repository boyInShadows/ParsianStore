import { defineRouting } from "next-intl/routing";

/**
 * masterPlan.md §7.1: `fa` is the default and only shipped locale in
 * Phase 1-7; `en` is architected from day one but not translated yet.
 * `localePrefix: "as-needed"` keeps `fa` unprefixed (`/`) and prefixes
 * only `en` (`/en/...`).
 *
 * `localeDetection: false` is required to actually get that behavior --
 * next-intl's middleware otherwise negotiates against the browser's
 * Accept-Language header by default, meaning any browser/device with an
 * English preference would silently see the untranslated English copy
 * instead of the real Persian site (caught by a Playwright e2e test:
 * headless Chromium defaults to `Accept-Language: en-US`, which served
 * English at `/` despite fa being the configured defaultLocale).
 */
export const routing = defineRouting({
  locales: ["fa", "en"],
  defaultLocale: "fa",
  localePrefix: "as-needed",
  localeDetection: false,
});

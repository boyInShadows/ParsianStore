import { defineRouting } from "next-intl/routing";

/**
 * masterPlan.md §7.1: `fa` is the default and only shipped locale in
 * Phase 1-7; `en` is architected from day one but not translated yet.
 * `localePrefix: "as-needed"` keeps `fa` unprefixed (`/`) and prefixes
 * only `en` (`/en/...`).
 */
export const routing = defineRouting({
  locales: ["fa", "en"],
  defaultLocale: "fa",
  localePrefix: "as-needed",
});

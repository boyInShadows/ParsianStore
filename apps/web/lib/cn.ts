import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * `cn()` -- the one way to compose Tailwind classes in this app.
 * P11.S2, docs/decisions/0027-design-system-consolidation.md.
 *
 * Every primitive used to build its class string by template literal:
 * `${base} ${variants[variant]} ${className}`. That concatenates, it does
 * not compose -- two utilities from the same group both end up in the
 * attribute and the winner is decided by their order in the generated
 * stylesheet, not by the caller. So `<Button className="bg-surface">` never
 * actually overrode the variant's `bg-brand-solid`; it just added a class
 * that lost. tailwind-merge is what makes the caller win, by dropping the
 * earlier utility of a conflicting group outright.
 *
 * WHY v2 AND NOT v3: tailwind-merge v3 is built for Tailwind CSS v4, whose
 * default scales differ. This app is on Tailwind 3.4 and v4 is explicitly
 * rejected (masterPlan §2.3), so the v2 line is the matching one. Upgrading
 * tailwind-merge is a Tailwind-version decision, not a routine bump.
 *
 * WHY THE CONFIG BELOW IS NOT OPTIONAL: tailwind.config.js *replaces*
 * `colors`, `spacing` and `fontSize` rather than extending them, so
 * tailwind-merge's built-in knowledge of Tailwind's stock scales is wrong
 * here in both directions -- it does not know `text-body-sm` is a size, and
 * its default `theme.colors` matcher accepts ANY value, which made it treat
 * every `text-*` utility as a colour. Measured before writing this:
 * `twMerge("text-body-sm", "text-text-muted")` returned `text-text-muted`,
 * silently discarding the font size. Adopting cn() without this config
 * would have introduced that bug everywhere at once. cn.test.ts pins the
 * behaviour, and also asserts the scales below still match the config.
 */

/** theme.extend.fontSize. Deliberately stops at h3 -- see ADR 0025. */
export const CN_FONT_SIZES = [
  "display-1",
  "display-2",
  "h1",
  "h2",
  "h3",
  "body-lg",
  "body",
  "body-sm",
  "caption",
  "data",
] as const;

/** theme.extend.transitionDuration. */
export const CN_DURATIONS = ["fast", "base", "slow"] as const;

/**
 * theme.colors, with the three ramps flattened to the names Tailwind
 * actually emits (`steel-500`, not `steel.500`). `transparent` and
 * `current` are omitted: tailwind-merge already treats them as colours.
 */
export const CN_COLORS = [
  ...["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"].map(
    (step) => `steel-${step}`,
  ),
  ...["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"].map(
    (step) => `marigold-${step}`,
  ),
  ...[
    "0",
    "25",
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "850",
    "900",
    "950",
    "1000",
  ].map((step) => `graphite-${step}`),
  "success",
  "warning",
  "danger",
  "info",
  "success-fg",
  "danger-fg",
  "info-fg",
  "bg",
  "surface",
  "surface-raised",
  "surface-sunken",
  "text",
  "text-muted",
  "border",
  "rule",
  "price",
  "brand",
  "brand-subtle",
  "brand-solid",
  "brand-fg",
  "cta",
  "cta-fg",
  "focus",
] as const;

/**
 * `override` vs `extend` here is not a style choice -- it mirrors what
 * tailwind.config.js does to each scale, and getting it backwards silently
 * breaks merging:
 *
 * - `colors` is REPLACED in the config (a bare `theme.colors`), so the
 *   matcher is overridden. This is the load-bearing line: tailwind-merge's
 *   default colour matcher accepts ANY value, which is what made it read
 *   `text-body-sm` as a colour and drop the font size.
 * - `fontSize` and `transitionDuration` are EXTENDED (`theme.extend.*`), so
 *   Tailwind still emits `text-xs` and `duration-200` alongside our names.
 *   These groups are therefore extended too -- overriding them would leave
 *   the stock steps unrecognised and unmergeable. None are used today, but
 *   they are one keystroke away from being.
 * - `borderRadius` is extended with names tailwind-merge's default theme
 *   already knows (sm/md/lg/xl/full), so it needs nothing at all. Adding an
 *   override there would only have discarded `rounded-none`/`2xl`/`3xl`.
 * - `spacing` is replaced, but every step is a plain number, which the
 *   default matcher already handles.
 */
const twMerge = extendTailwindMerge({
  override: {
    theme: {
      colors: [...CN_COLORS],
    },
  },
  extend: {
    classGroups: {
      "font-size": [{ text: [...CN_FONT_SIZES] }],
      duration: [{ duration: [...CN_DURATIONS] }],
      // Named tokens that are not steps on any stock scale, so
      // tailwind-merge cannot infer them (see tokens.css for why each is a
      // token rather than a scale step).
      w: [{ w: ["rail"] }],
      basis: [{ basis: ["rail"] }],
      "max-w": [{ "max-w": ["container"] }],
    },
  },
});

/**
 * Compose class names. Accepts everything clsx does (strings, arrays,
 * conditional objects); later Tailwind utilities beat earlier conflicting
 * ones. Always put the caller's `className` last.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

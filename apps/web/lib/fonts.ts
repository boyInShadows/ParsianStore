import localFont from "next/font/local";

/**
 * Self-hosted fonts -- masterPlan.md §6.5. No Google Fonts CDN; every file
 * lives under public/fonts/<family>/ with its OFL.txt, WOFF2 only, subset to
 * Basic Latin + Arabic (covers Persian letters and Persian-Indic digits) +
 * ZWNJ/ZWJ + the punctuation actually used in Persian UI copy.
 *
 * ## Two families, not three (P14.S2)
 *
 * There used to be a `displayFont` here loading Estedad Bold + Black with
 * `preload: true` -- about 64KB on every route's critical path. P14.S1 made
 * `--font-display` an alias of `--font-body` in tokens.css, written as
 * `html:root` so it wins on specificity unconditionally against next/font's
 * own `.__variable_<hash>` rule. That is not a default a heading can opt out
 * of: it means `--font-display` resolves to Vazirmatn for every element at
 * every weight, and no selector anywhere can reach Estedad. A `font-black`
 * heading renders Vazirmatn's 900 through its variable axis and always did
 * once the alias shipped.
 *
 * So the loader entry was preloading two files nothing could use. It is gone;
 * the files stay on disk with their licence, and `--font-display` keeps
 * working because tokens.css -- not this file -- is what defines it now.
 *
 * Preload: Vazirmatn (the variable face, and therefore every weight on the
 * page) is the one above-the-fold family and the only preloaded one. The mono
 * face carries codes and SKUs, none of which are LCP candidates.
 */

export const bodyFont = localFont({
  src: "../public/fonts/vazirmatn/Vazirmatn-Variable.woff2",
  weight: "100 900",
  variable: "--font-body",
  display: "swap",
  preload: true,
});

export const monoFont = localFont({
  src: "../public/fonts/jetbrains-mono/JetBrainsMono-Medium.woff2",
  weight: "500",
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

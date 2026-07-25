import localFont from "next/font/local";

/**
 * Self-hosted fonts -- masterPlan.md §6.5 (Display face amended to Estedad
 * per docs/decisions/0002-morabba-not-ofl-use-estedad.md). No Google Fonts
 * CDN; every file lives under public/fonts/<family>/ with its OFL.txt,
 * WOFF2 only, subset to Basic Latin + Arabic (covers Persian letters and
 * Persian-Indic digits) + ZWNJ/ZWJ + the punctuation actually used in
 * Persian UI copy.
 *
 * Preload: Estedad Black (900, display-1/display-2) and Vazirmatn (400,
 * body text) are the two above-the-fold weights. Estedad Bold (700, h1)
 * ships in the same loader call as Black -- next/font/local's multi-weight
 * `src` array shares one font-family, which is what lets a single "display"
 * font-family switch weight via CSS `font-weight`, but it also means
 * `preload` applies to the whole call rather than one weight in isolation.
 * Both subset files together are ~64KB, small enough that preloading Bold
 * alongside Black doesn't meaningfully affect the LCP budget (§10).
 */

export const displayFont = localFont({
  src: [
    { path: "../public/fonts/estedad/Estedad-Bold.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/estedad/Estedad-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
  preload: true,
});

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

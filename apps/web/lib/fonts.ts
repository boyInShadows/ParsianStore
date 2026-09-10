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
 *
 * ## `display` stays `swap` -- `optional` was measured and HELD (P15.S3c)
 *
 * P15.S2 measured `font-display: swap` at ~47ms of relayout on first paint
 * (down from ~109ms once `content-visibility` containment shipped), and the
 * owner approved moving to `optional` to remove it. **It is not shipped, and
 * the reason is a premise that did not survive measurement.**
 *
 * `optional` gives the browser a ~100ms block window and then commits for the
 * whole page load -- no swap, ever. That is only a good trade if the face
 * usually WINS that window. It does not, because **the font is never preloaded
 * as a parser-visible hint**, and two separate defects sit behind that:
 *
 * 1. next@15.5.21's `next-font-manifest-plugin.js` tests module requests with
 *    a hardcoded `'/next-font-loader/index.js?'` against a Windows path that
 *    is backslash-delimited, so `nextFontManifest.app` stayed `{}` and no font
 *    was preloadable at all. Fixed here by `patches/next.patch`; it is a
 *    Windows-build-only manifestation, so CI and production never had it.
 * 2. With that fixed, `getPreloadableFonts` resolves and Next calls
 *    `ReactDOM.preload(href, {as:"font"})` -- but that lands in the RSC Flight
 *    payload as a `:HL[...]` hoistable instruction inside an inline script,
 *    NOT as a `<link rel="preload" as="font">` in `<head>`. Verified on a
 *    production build: 18 `<link>` elements on `/`, none of them the font;
 *    the woff2 filename appears only inside `self.__next_f`. The hint
 *    therefore does not exist until the JS bundle has loaded and React has
 *    processed the stream -- long past a 100ms window. This one is NOT
 *    Windows-specific and very likely affects production too.
 *
 * The measured consequence of shipping `optional` anyway: the fallback face
 * persisted for the whole load in **4 of 6** landing captures on a LOCAL
 * server, rewrapping the hero heading from three lines to two and making the
 * page 177px (~1.7%) shorter. That is not "a system font on the occasional
 * slow visit" -- it is the common case, and it is not the trade that was
 * agreed to.
 *
 * What `optional` DID buy, and what we give up by holding: CLS 0.0322 -> 0.0000
 * (the 0.0322 was entirely the swap event) and the swap cost ~50ms -> ~10ms.
 * Real wins, waiting on a real preload. The horizontal metric mismatch is the
 * mechanism behind the reflow: the synthetic `"bodyFont Fallback"` matches
 * Vazirmatn's ascent/descent exactly (100.00%, so the CLS-relevant vertical
 * axis is already solved by next/font's `adjustFontFallback`) but its advance
 * width is ~89% of the real face, because `size-adjust` is calibrated against
 * Arial's *Latin* tables and those do not transfer to Persian glyph widths.
 *
 * Revisit when the font is a real head preload. Owner decision pending.
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

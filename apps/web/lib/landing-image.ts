/**
 * The width ladders `scripts/optimize-landing.mjs` actually emitted, per asset
 * group (docs/landing-assets.md). Everything that renders a landing render
 * builds its `srcset` from these, so a `srcset` can never name a file the
 * pipeline did not write -- and the pipeline never upscales, which is why the
 * plates stop at their 1376px master width instead of continuing to 1440.
 *
 * AVIF only. Every browser that reaches this page supports it (Chrome 85+,
 * Firefox 93+, Safari 16.4+) and it is roughly half the WebP weight on these
 * renders -- 30KB against 63KB for the hero car at 1440w, which is the
 * difference between holding and missing the LCP budget. The WebP set stays
 * committed, so dropping to a `<picture>` with a WebP `<source>` is a component
 * change rather than a pipeline re-run if real traffic ever shows the gap.
 */
export const CUTOUT_WIDTHS = [480, 768, 1024, 1440] as const;
export const PLATE_WIDTHS = [480, 768, 1024, 1376] as const;
export const POSTER_WIDTHS = [768, 1024, 1440] as const;

export const CUTOUT_INTRINSIC = { width: 2048, height: 2048 } as const;
export const PLATE_INTRINSIC = { width: 1376, height: 768 } as const;
export const POSTER_INTRINSIC = { width: 1920, height: 1080 } as const;

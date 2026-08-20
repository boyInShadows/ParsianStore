import type { ImageLoaderProps } from "next/image";

/**
 * `scripts/optimize-landing.mjs` already emitted every landing render at these
 * widths (docs/landing-assets.md), so the request-time optimizer has nothing
 * left to do. A custom loader hands `next/image` the pre-built file instead --
 * real `srcset` behavior, zero server work, and the shipped bytes are the ones
 * reviewed in the diff rather than whatever the optimizer decides today.
 *
 * `src` is the path WITHOUT its `-<width>.<ext>` tail, e.g.
 * `/landing/cutouts/car`.
 */
const CUTOUT_WIDTHS = [480, 768, 1024, 1440] as const;

/**
 * AVIF only. Every browser that reaches this hero supports it (Chrome 85+,
 * Firefox 93+, Safari 16.4+) and it is roughly half the WebP weight on these
 * renders -- 30KB vs 63KB for the hero car at 1440w, which is the difference
 * between holding and missing the LCP budget. The WebP set stays committed, so
 * dropping to a `<picture>` with a WebP `<source>` is a component change, not a
 * pipeline re-run, if real traffic ever shows the gap.
 */
export function cutoutLoader({ src, width }: ImageLoaderProps): string {
  const emitted = CUTOUT_WIDTHS.find((candidate) => candidate >= width) ?? CUTOUT_WIDTHS.at(-1);
  return `${src}-${emitted}.avif`;
}

export const CUTOUT_INTRINSIC = { width: 2048, height: 2048 } as const;

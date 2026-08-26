import manifest from "./landing-assets.json";

/**
 * Every landing render `scripts/optimize-landing.mjs` actually emitted, keyed by
 * its public path (docs/landing-assets.md). Everything that renders a landing
 * asset builds its `srcset` from here, so a `srcset` can never name a file the
 * pipeline did not write.
 *
 * The ladder is *read*, not declared. It used to be three hand-written width
 * arrays, which held only while every asset in a group shared one ladder. The
 * P9.S5 hero layers broke that: they are trimmed to their bounding box, so each
 * one lands on its own native width -- 823px for the stripped base, 510px for
 * the headlight sprite -- and a shared ladder would have pointed `srcset` at
 * files that do not exist. The generated manifest already records the real
 * widths per asset, so it is the only honest source.
 *
 * No Zod here: this is a build-time-inlined constant, not an I/O boundary, and
 * a validator in this module would ship into the hero's client chunk. The shape
 * is asserted in `landing-image.test.ts` instead, which also checks every file
 * the manifest names is on disk.
 *
 * AVIF only. Every browser that reaches this page supports it (Chrome 85+,
 * Firefox 93+, Safari 16.4+) and it is roughly half the WebP weight on these
 * renders -- 30KB against 63KB for the hero car at 1440w, which is the
 * difference between holding and missing the LCP budget. The WebP set stays
 * committed, so dropping to a `<picture>` with a WebP `<source>` is a component
 * change rather than a pipeline re-run if real traffic ever shows the gap.
 */
export type LandingTrim = {
  /** The master canvas this asset was cropped out of. */
  readonly canvas: { readonly width: number; readonly height: number };
  readonly left: number;
  readonly top: number;
};

export type LandingAsset = {
  /** Public path with no `-<width>.avif` tail, e.g. `/landing/hero/sprite-hood`. */
  readonly src: string;
  /** Exactly the widths the pipeline wrote, ascending. */
  readonly widths: readonly number[];
  readonly intrinsic: { readonly width: number; readonly height: number };
  /**
   * Where this asset's box sat inside its master canvas, for the groups the
   * pipeline trims to a bounding box. `null` for every untrimmed group -- the
   * 2048² cutouts keep their transparent padding, because `heroLayout.ts`
   * positions them by their centre.
   */
  readonly trim: LandingTrim | null;
};

type ManifestEntry = {
  readonly name: string;
  readonly intrinsic: { readonly width: number; readonly height: number };
  readonly variants: readonly { readonly width: number }[];
  readonly trim: LandingTrim | null;
};

function toAsset(group: string, raw: ManifestEntry): readonly [string, LandingAsset] {
  const src = `/landing/${group}/${raw.name}`;
  return [
    src,
    {
      src,
      widths: raw.variants.map((variant) => variant.width),
      intrinsic: raw.intrinsic,
      trim: raw.trim,
    },
  ];
}

const ASSETS: ReadonlyMap<string, LandingAsset> = new Map([
  ...manifest.cutouts.map((asset) => toAsset("cutouts", asset)),
  ...manifest.hero.map((asset) => toAsset("hero", asset)),
  ...manifest.plates.map((asset) => toAsset("plates", asset)),
  ...manifest.video.map((clip) => toAsset("video", clip.poster)),
]);

/** Every landing asset the last pipeline run emitted, keyed by public path. */
export const LANDING_ASSETS = ASSETS;

export function landingAsset(src: string): LandingAsset {
  const asset = ASSETS.get(src);
  if (!asset) {
    throw new Error(
      `No landing asset at "${src}". Run \`pnpm optimize:landing\` and commit the result.`,
    );
  }
  return asset;
}

export function landingSrcSet(asset: LandingAsset): string {
  return asset.widths.map((width) => `${asset.src}-${width}.avif ${width}w`).join(", ");
}

export function landingFallback(asset: LandingAsset): string {
  return `${asset.src}-${asset.widths.at(-1) ?? asset.intrinsic.width}.avif`;
}

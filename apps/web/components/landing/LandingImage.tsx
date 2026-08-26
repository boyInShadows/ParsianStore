import { landingAsset, landingFallback, landingSrcSet } from "@/lib/landing-image";

type Props = {
  /** Path without the `-<width>.avif` tail, e.g. `/landing/cutouts/car`. */
  src: string;
  alt: string;
  /** Defaults to the asset's own intrinsic size, which is almost always right. */
  width?: number;
  height?: number;
  sizes: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
};

/**
 * The landing renders, served exactly as `scripts/optimize-landing.mjs` emitted
 * them.
 *
 * A plain `<img>` rather than `next/image`, and the one place in this app that
 * is true. CLAUDE.md §0.6 asks for `next/image` because it buys four things:
 * a responsive `srcset`, explicit dimensions, lazy loading below the fold, and
 * modern formats. Every one of those is delivered here -- the widths come from
 * the manifest the pipeline actually wrote, so the `srcset` cannot reference a
 * file that does not exist, and the format is AVIF because that is what was
 * committed.
 *
 * What `next/image` would add on top is a request-time optimizer we
 * deliberately bypassed at P9.S3, plus a client component. That last part is
 * not a preference: `next/image` takes its custom `loader` as a function prop,
 * and a Server Component cannot pass a function to a Client Component -- the
 * page throws "Functions cannot be passed directly to Client Components".
 * Wrapping every static plate in a client leaf to satisfy the letter of the
 * rule would ship JS to render an image that never changes.
 *
 * So: pre-optimized assets get this; everything else -- product media, brand
 * marks, anything user-supplied or unknown-dimension -- still goes through
 * `next/image`.
 */
export function LandingImage({
  src,
  alt,
  width,
  height,
  sizes,
  className,
  style,
  priority = false,
}: Props) {
  const asset = landingAsset(src);

  return (
    <img
      src={landingFallback(asset)}
      srcSet={landingSrcSet(asset)}
      sizes={sizes}
      alt={alt}
      width={width ?? asset.intrinsic.width}
      height={height ?? asset.intrinsic.height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding={priority ? "sync" : "async"}
      className={className}
      style={style}
    />
  );
}

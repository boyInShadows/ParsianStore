import { getTranslations } from "next-intl/server";
import { CATALOG_SYSTEMS, formatToman } from "schemas";
import type { ProductListItemDto } from "schemas";
import { fetchFeaturedProducts } from "@/lib/fetchers/products";
import { Reveal } from "@/components/motion";
import { SystemGlyph, hasSystemGlyph } from "./SystemGlyph";

// masterPlan.md §5 item 04: real newest in-stock products (see
// lib/fetchers/products.ts's comment on why this isn't a real "best
// sellers" ranking yet -- no order history exists until Phase 5+).
// Horizontal snap-scroll on mobile, grid on desktop, per spec. No
// fitment chip: that needs the client's active garage vehicle checked
// per product against /fitment/check, which would add real client JS to
// a route already sitting at the 180KB budget ceiling (P4.S3) -- left
// for a follow-up pass once there's budget headroom, not silently
// dropped.
export async function BestSellers() {
  const t = await getTranslations("Landing.beats.bestSellers");
  const products = await fetchFeaturedProducts();

  if (products.length === 0) return null;

  // Photographed parts first (P12.S9, defect 3). Not a filter -- dropping the
  // rest would misrepresent what is in stock, and the plate below is a
  // respectable thing for a part to arrive as. It is a *preference*: when the
  // shop has photos, the rail leads with them instead of opening on four grey
  // squares because the newest four happen to be unphotographed. Stable within
  // each group, so the underlying "newest" order survives inside it.
  const ordered = [...products].sort(
    (a, b) => Number(b.media.length > 0) - Number(a.media.length > 0),
  );

  return (
    <section
      id="best-sellers"
      aria-labelledby="best-sellers-heading"
      className="mx-auto max-w-container px-4 py-20"
    >
      <Reveal className="flex flex-col gap-2">
        <p className="font-mono text-data text-text-muted">{t("code")}</p>
        <h2 id="best-sellers-heading" className="font-display text-h2 font-black text-text">
          {t("title")}
        </h2>
        <p className="max-w-2xl text-body text-text-muted">{t("subtitle")}</p>
      </Reveal>
      <ul className="mt-6 flex snap-x gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
        {ordered.map((product) => (
          <li key={product.id} className="w-rail flex-none snap-start sm:w-auto">
            <ProductCard product={product} noPhotoLabel={t("noPhoto")} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductCard({
  product,
  noPhotoLabel,
}: {
  product: ProductListItemDto;
  noPhotoLabel: string;
}) {
  return (
    <a
      href={`/p/${product.slug}`}
      className="group relative flex h-full flex-col gap-3 border border-border bg-surface p-3 shadow-sm transition duration-base ease-out hover:-translate-y-1 hover:border-brand hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-cta" />
      {product.media[0] ? (
        <img
          src={product.media[0]}
          alt={product.name.fa}
          loading="lazy"
          className="aspect-square w-full border-b border-rule bg-surface-raised object-contain transition duration-slow group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
        />
      ) : (
        <NoPhotoPlate product={product} label={noPhotoLabel} />
      )}
      <div className="flex flex-1 flex-col gap-2 pt-2">
        <span className="line-clamp-2 min-h-12 text-body font-medium text-text">
          {product.name.fa}
        </span>
        <span className="mt-auto border-t border-rule pt-3 font-mono text-data font-medium text-price">
          {formatToman(product.priceRial)}
        </span>
      </div>
    </a>
  );
}

/**
 * What a part looks like when the shop has no photograph of it yet.
 *
 * P12.S9, recording defect 3. The old state was a dashed box reading
 * «بدون تصویر» -- honest, and the least designed thing on the page: four of
 * them in a row read as a broken grid rather than as a catalogue.
 *
 * This is a technical plate instead: the system's own line drawing on ruled
 * paper, with the `SYS-xx` code and the system's Persian name set in mono
 * beneath it, corner ticks like a drawing frame. It is unmistakably a diagram
 * and could not be mistaken for a photograph of the part -- which is the line
 * the design-quality rule draws, and the reason this does not reach for a
 * generic stock silhouette.
 *
 * It degrades honestly. `systemCode` is optional on the DTO (only endpoints
 * that resolve the product's category send it), and when it is missing the
 * plate keeps the paper and the frame and simply has nothing to draw --
 * rather than picking a glyph that would be a guess about what the part is.
 */
function NoPhotoPlate({ product, label }: { product: ProductListItemDto; label: string }) {
  const system = CATALOG_SYSTEMS.find((entry) => entry.code === product.systemCode);

  return (
    <div
      role="img"
      // The visible text is the code and the system name, so the accessible
      // name has to say what the picture is *instead of*: there is no photo.
      // Announcing "SYS-04 ترمز" alone would imply the part had been shown.
      aria-label={system ? `${label} — ${system.code} ${system.name.fa}` : label}
      className="technical-plate flex aspect-square flex-col items-center justify-center gap-2 border-b border-rule bg-surface-sunken text-text-muted"
    >
      {hasSystemGlyph(product.systemCode) ? (
        <SystemGlyph code={product.systemCode} className="h-16 w-16 text-text-muted" />
      ) : null}
      <span className="font-mono text-caption" dir="ltr">
        {system ? system.code : label}
      </span>
      {system ? <span className="text-caption">{system.name.fa}</span> : null}
    </div>
  );
}

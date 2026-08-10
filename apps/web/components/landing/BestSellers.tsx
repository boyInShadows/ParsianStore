import { getTranslations } from "next-intl/server";
import { formatToman } from "schemas";
import type { ProductListItemDto } from "schemas";
import { fetchFeaturedProducts } from "@/lib/fetchers/products";
import { Reveal } from "@/components/motion";

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
  const t = await getTranslations("Landing.sections.bestSellers");
  const products = await fetchFeaturedProducts();

  if (products.length === 0) return null;

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
        {products.map((product) => (
          <li key={product.id} className="w-64 flex-none snap-start sm:w-auto">
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
        <div
          role="img"
          aria-label={noPhotoLabel}
          className="flex aspect-square items-center justify-center border-b border-dashed border-rule bg-surface-raised font-mono text-caption text-text-muted"
        >
          {noPhotoLabel}
        </div>
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

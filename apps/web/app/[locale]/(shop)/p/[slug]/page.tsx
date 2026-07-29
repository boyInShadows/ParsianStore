import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages, getTranslations } from "next-intl/server";
import { formatToman } from "schemas";
import { routing } from "@/i18n/routing";
import { absoluteUrl, hreflangAlternates, localizedPath } from "@/lib/seo";
import { fetchProductDetailBySlug, fetchRelatedProducts } from "@/lib/fetchers/catalog";
import { Breadcrumb, EmptyState } from "@/components/primitives";
import { Link } from "@/i18n/navigation";
import { Gallery } from "@/components/pdp/Gallery";
import { AuthenticityPanel } from "@/components/pdp/AuthenticityPanel";
import { SpecsTable } from "@/components/pdp/SpecsTable";
import { OemTable } from "@/components/pdp/OemTable";
import { FitmentBanner } from "@/components/pdp/FitmentBanner";
import { RelatedProducts } from "@/components/pdp/RelatedProducts";
import { WishlistButton } from "@/components/wishlist/WishlistButton";

type Props = {
  params: Promise<{ locale: (typeof routing.locales)[number]; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = await fetchProductDetailBySlug(slug);
  if (!result.ok) return {};

  const path = `/p/${slug}`;
  const url = absoluteUrl(localizedPath(locale, path));

  return {
    title: result.data.name.fa,
    alternates: { canonical: url, languages: hreflangAlternates(path) },
  };
}

interface CatalogMessages {
  breadcrumbHome: string;
  apiDown: { title: string; description: string };
  product: {
    inStock: string;
    outOfStock: string;
    noPhoto: string;
    wishlist: { add: string; remove: string; error: string };
  };
  pdp: {
    notFound: { title: string; description: string; backHome: string };
    authenticity: {
      title: string;
      supplyRouteLabel: string;
      supplyRoute: Record<string, string>;
      sourceBrandLabel: string;
      countryLabel: string;
      verificationCodeLabel: string;
      guideLink: string;
    };
    specs: { title: string; weight: string; dimensions: string; warranty: string };
    oemTable: { title: string; oemNumbers: string; crossRefNumbers: string };
    fitment: { exact: string; likely: string; check: string; checkVehicle: string };
    related: { title: string };
    brandLink: string;
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;

  const result = await fetchProductDetailBySlug(slug);

  const t = await getTranslations("Catalog");
  const messages = await getMessages();
  const catalogMessages = messages.Catalog as CatalogMessages;

  if (!result.ok) {
    if (result.reason === "not-found") notFound();
    return (
      <main className="mx-auto max-w-container px-4 py-16">
        <EmptyState
          titleAs="h1"
          title={catalogMessages.apiDown.title}
          description={catalogMessages.apiDown.description}
        />
      </main>
    );
  }

  const product = result.data;
  const related = await fetchRelatedProducts(slug);

  const breadcrumbItems = [
    { label: catalogMessages.breadcrumbHome, href: localizedPath(locale, "/") },
    ...(product.category
      ? [
          {
            label: product.category.name.fa,
            href: localizedPath(locale, `/c/${product.category.slug}`),
          },
        ]
      : []),
    { label: product.name.fa },
  ];

  return (
    <main className="mx-auto max-w-container px-4 py-8">
      <Breadcrumb items={breadcrumbItems} />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Gallery media={product.media} noPhotoLabel={catalogMessages.product.noPhoto} />

        <div className="flex flex-col gap-4">
          <div>
            {/* Brand pages don't exist yet (their own separate Phase 5
                item) -- this links to the brand's products within the
                current category, the closest real destination available
                today, rather than a dedicated /b/[slug] that doesn't
                exist. Needs both brand and category since the PLP route
                is category-scoped. */}
            {product.brand && product.category ? (
              <Link
                href={`/c/${product.category.slug}?brand=${product.brand.slug}`}
                className="text-body-sm text-brand hover:underline"
              >
                {t("pdp.brandLink", { brand: product.brand.name.fa })}
              </Link>
            ) : null}
            <h1 className="mt-1 font-display text-h2 font-black text-text">{product.name.fa}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-mono text-h3 text-text">{formatToman(product.priceRial)}</span>
            {product.compareAtRial ? (
              <span className="font-mono text-body-sm text-text-muted line-through">
                {formatToman(product.compareAtRial)}
              </span>
            ) : null}
            <WishlistButton
              productId={product.id}
              messages={catalogMessages.product.wishlist}
              className="ms-auto"
            />
          </div>

          <p className="text-body-sm text-text-muted">
            {product.stock > 0
              ? catalogMessages.product.inStock
              : catalogMessages.product.outOfStock}
          </p>

          <FitmentBanner productId={product.id} messages={catalogMessages.pdp.fitment} />

          <AuthenticityPanel
            authenticity={product.authenticity}
            messages={catalogMessages.pdp.authenticity}
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SpecsTable
          attributes={product.attributes}
          weightGram={product.weightGram}
          dimensions={product.dimensions}
          warranty={product.warranty}
          messages={catalogMessages.pdp.specs}
        />
        <OemTable
          oemNumbers={product.oemNumbers}
          crossRefNumbers={product.crossRefNumbers}
          messages={catalogMessages.pdp.oemTable}
        />
      </div>

      <RelatedProducts
        title={catalogMessages.pdp.related.title}
        products={related}
        messages={catalogMessages.product}
      />
    </main>
  );
}

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { absoluteUrl, hreflangAlternates, localizedPath } from "@/lib/seo";
import { fetchBrandBySlug } from "@/lib/fetchers/brands";
import {
  fetchCatalogFacets,
  fetchCatalogProducts,
  type CatalogProductFilters,
} from "@/lib/fetchers/catalog";
import { Badge, Breadcrumb, EmptyState } from "@/components/primitives";
import { PageHeader } from "@/components/primitives/PageHeader";
import { FilterBar } from "@/components/plp/FilterBar";
import { ProductGrid } from "@/components/plp/ProductGrid";
import { SortSelect } from "@/components/plp/SortSelect";

type Props = {
  params: Promise<{ locale: (typeof routing.locales)[number]; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const SORT_VALUES = ["newest", "price-asc", "price-desc"] as const;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseFilters(
  slug: string,
  searchParams: Record<string, string | string[] | undefined>,
): CatalogProductFilters {
  const sortParam = firstValue(searchParams.sort);
  const sort = (SORT_VALUES as readonly string[]).includes(sortParam ?? "")
    ? (sortParam as (typeof SORT_VALUES)[number])
    : "newest";
  const minPriceRial = firstValue(searchParams.minPriceRial);
  const maxPriceRial = firstValue(searchParams.maxPriceRial);

  return {
    brand: slug,
    category: firstValue(searchParams.category),
    minPriceRial: minPriceRial ? Number(minPriceRial) : undefined,
    maxPriceRial: maxPriceRial ? Number(maxPriceRial) : undefined,
    inStock: firstValue(searchParams.inStock) === "true",
    sort,
    cursor: firstValue(searchParams.cursor),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const brand = await fetchBrandBySlug(slug);
  if (!brand.ok) return {};
  const path = `/brand/${slug}`;

  return {
    title: brand.data.seo.title || brand.data.name.fa,
    description: brand.data.seo.description || brand.data.description,
    alternates: {
      canonical: absoluteUrl(localizedPath(locale, path)),
      languages: hreflangAlternates(path),
    },
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const brand = await fetchBrandBySlug(slug);

  if (!brand.ok && brand.reason === "not-found") notFound();

  const messages = await getMessages();
  const catalogMessages = messages.Catalog as {
    breadcrumbHome: string;
    apiDown: { title: string; description: string };
    filters: Parameters<typeof FilterBar>[0]["messages"];
    sort: Parameters<typeof SortSelect>[0]["messages"];
    grid: {
      loadMore: string;
      loading: string;
      emptyTitle: string;
      emptyDescription: string;
      clearFilters: string;
    };
    product: Parameters<typeof ProductGrid>[0]["messages"]["product"];
    brandPage: {
      productsTitle: string;
      countryLabel: string;
      oemBadge: string;
      aftermarketBadge: string;
      countries: Record<string, string>;
    };
  };

  if (!brand.ok) {
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

  const filters = parseFilters(slug, resolvedSearchParams);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to drop these keys
  const { sort: _sort, cursor: _cursorForFacets, limit: _limit, ...facetFilters } = filters;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to drop this key
  const { cursor: _cursorForGrid, ...gridFilters } = filters;
  const cookieHeader = (await cookies()).toString();
  const [productsResult, facets] = await Promise.all([
    fetchCatalogProducts(filters, cookieHeader),
    fetchCatalogFacets(facetFilters),
  ]);

  if (!productsResult.ok) {
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

  const brandMessages = catalogMessages.brandPage;
  const hasActiveFilters = Boolean(
    filters.category || filters.minPriceRial || filters.maxPriceRial || filters.inStock,
  );

  return (
    <main className="mx-auto flex max-w-container flex-col gap-6 px-4 py-8">
      <Breadcrumb
        items={[
          { label: catalogMessages.breadcrumbHome, href: localizedPath(locale, "/") },
          { label: brand.data.name.fa },
        ]}
      />
      <PageHeader
        code={brand.data.name.en.toUpperCase()}
        title={brand.data.name.fa}
        meta={
          <>
            <span className="text-body-sm text-text-muted">
              {brandMessages.countryLabel}:{" "}
              {brandMessages.countries[brand.data.country] ?? brand.data.country}
            </span>
            <Badge tone={brand.data.isOEM ? "success" : "neutral"} variant="dot">
              {brand.data.isOEM ? brandMessages.oemBadge : brandMessages.aftermarketBadge}
            </Badge>
          </>
        }
      />
      {brand.data.description ? (
        <p className="max-w-prose text-body text-text-muted">{brand.data.description}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
        <aside>
          <FilterBar
            facets={facets}
            childCategories={[]}
            categoryOptions={(facets?.categories ?? []).map((category) => ({
              slug: category.slug,
              label: category.name.fa,
              count: category.count,
            }))}
            showBrandFilter={false}
            messages={catalogMessages.filters}
          />
        </aside>

        <section aria-labelledby="brand-products-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 id="brand-products-title" className="text-h3 font-bold text-text">
              {brandMessages.productsTitle}
            </h2>
            <SortSelect messages={catalogMessages.sort} />
          </div>
          <ProductGrid
            clearFiltersHref={`/brand/${slug}`}
            products={productsResult.data.data}
            nextCursor={productsResult.data.nextCursor}
            filters={gridFilters}
            hasActiveFilters={hasActiveFilters}
            messages={{
              loadMore: catalogMessages.grid.loadMore,
              loading: catalogMessages.grid.loading,
              emptyTitle: catalogMessages.grid.emptyTitle,
              emptyDescription: catalogMessages.grid.emptyDescription,
              clearFilters: catalogMessages.grid.clearFilters,
              product: catalogMessages.product,
            }}
          />
        </section>
      </div>
    </main>
  );
}

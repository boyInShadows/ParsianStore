import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getMessages, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { absoluteUrl, hreflangAlternates, localizedPath } from "@/lib/seo";
import {
  fetchCatalogFacets,
  fetchCatalogProducts,
  fetchCategoryAncestors,
  fetchCategoryBySlug,
  fetchChildCategories,
  type CatalogProductFilters,
} from "@/lib/fetchers/catalog";
import { Breadcrumb, EmptyState } from "@/components/primitives";
import { FilterBar } from "@/components/plp/FilterBar";
import { ProductGrid } from "@/components/plp/ProductGrid";
import { SortSelect } from "@/components/plp/SortSelect";

type Props = {
  params: Promise<{ locale: (typeof routing.locales)[number]; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const SORT_VALUES = ["newest", "price-asc", "price-desc"] as const;

function parseFilters(
  slug: string,
  searchParams: Record<string, string | string[] | undefined>,
): CatalogProductFilters {
  const sortParam = firstValue(searchParams.sort);
  const sort = (SORT_VALUES as readonly string[]).includes(sortParam ?? "")
    ? (sortParam as (typeof SORT_VALUES)[number])
    : "newest";

  const activeVehicleKey = firstValue(searchParams.v);
  const fitsOff = firstValue(searchParams.fits) === "0";

  const minPriceRial = firstValue(searchParams.minPriceRial);
  const maxPriceRial = firstValue(searchParams.maxPriceRial);

  return {
    category: slug,
    brand: firstValue(searchParams.brand),
    vehicle: activeVehicleKey && !fitsOff ? activeVehicleKey : undefined,
    minPriceRial: minPriceRial ? Number(minPriceRial) : undefined,
    maxPriceRial: maxPriceRial ? Number(maxPriceRial) : undefined,
    attributes: firstValue(searchParams.attributes),
    inStock: firstValue(searchParams.inStock) === "true",
    sort,
    cursor: firstValue(searchParams.cursor),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await fetchCategoryBySlug(slug);
  if (!category.ok) return {};

  const path = `/c/${slug}`;
  const url = absoluteUrl(localizedPath(locale, path));

  return {
    title: category.data.name.fa,
    alternates: { canonical: url, languages: hreflangAlternates(path) },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const resolvedSearchParams = await searchParams;

  const category = await fetchCategoryBySlug(slug);

  if (!category.ok && category.reason === "not-found") {
    notFound();
  }

  const t = await getTranslations("Catalog");
  const messages = await getMessages();
  const catalogMessages = messages.Catalog as {
    breadcrumbHome: string;
    apiDown: { title: string; description: string };
    filters: {
      category: string;
      brand: string;
      price: string;
      priceMin: string;
      priceMax: string;
      inStock: string;
      fitsMyVehicle: string;
      fitsMyVehicleHint: string;
      noActiveVehicle: string;
      clearAll: string;
      removeFilter: string;
    };
    sort: { label: string; newest: string; priceAsc: string; priceDesc: string };
    grid: {
      resultsCount: string;
      loadMore: string;
      loading: string;
      emptyTitle: string;
      emptyDescription: string;
      clearFilters: string;
    };
    product: {
      inStock: string;
      outOfStock: string;
      noPhoto: string;
      wholesalePriceBadge: string;
      wishlist: { add: string; remove: string; error: string };
      compare: { add: string; open: string; limit: string };
    };
  };

  if (!category.ok) {
    // reason === "down" here (not-found already returned above) -- a real
    // API outage must degrade gracefully, never crash the route or look
    // like a 404 (masterPlan's P4.S5 lesson: fetchVehicleTreeSafe existed
    // for exactly this class of bug).
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

  // P6.S1: forwarded so optionalAuth can resolve a real wholesale
  // account's price server-side -- see fetchProductDetailBySlug's own doc
  // comment in lib/fetchers/catalog.ts for why a plain Server Component
  // fetch() needs this explicitly. Facets stay retail-only by design (see
  // pricing.ts), so fetchCatalogFacets doesn't need it.
  const cookieHeader = (await cookies()).toString();
  const [ancestors, childCategories, productsResult, facets] = await Promise.all([
    fetchCategoryAncestors(category.data.path),
    fetchChildCategories(category.data.id),
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

  const hasActiveFilters =
    Boolean(filters.brand) ||
    Boolean(filters.minPriceRial) ||
    Boolean(filters.maxPriceRial) ||
    Boolean(filters.inStock) ||
    Boolean(filters.attributes);

  const totalCount = facets?.categories.find((c) => c.slug === slug)?.count ?? null;

  const breadcrumbItems = [
    { label: catalogMessages.breadcrumbHome, href: localizedPath(locale, "/") },
    ...ancestors.map((ancestor) => ({
      label: ancestor.name.fa,
      href: localizedPath(locale, `/c/${ancestor.slug}`),
    })),
    { label: category.data.name.fa },
  ];

  return (
    <main className="mx-auto max-w-container px-4 py-8">
      <Breadcrumb items={breadcrumbItems} />
      <h1 className="mt-2 font-display text-h2 font-black text-text">{category.data.name.fa}</h1>

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
        <aside>
          <FilterBar
            facets={facets}
            childCategories={childCategories.map((child) => ({
              slug: child.slug,
              label: child.name.fa,
            }))}
            messages={catalogMessages.filters}
          />
        </aside>

        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-body-sm text-text-muted">
              {totalCount !== null ? t("grid.resultsCount", { count: totalCount }) : null}
            </p>
            <SortSelect messages={catalogMessages.sort} />
          </div>

          <ProductGrid
            clearFiltersHref={`/c/${slug}`}
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
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { absoluteUrl, localizedPath } from "@/lib/seo";
import { fetchSearchResults } from "@/lib/fetchers/catalog";
import { EmptyState } from "@/components/primitives";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/plp/ProductCard";

type Props = {
  params: Promise<{ locale: (typeof routing.locales)[number] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const RESULTS_PER_PAGE = 20;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const q = firstValue(resolvedSearchParams.q)?.trim() ?? "";
  const t = await getTranslations({ locale, namespace: "Catalog.search" });

  return {
    title: q ? t("heading", { query: q }) : t("title"),
    // Search results are query-dependent and not a stable canonical
    // destination -- no canonical/hreflang the way a category/product
    // page gets (those are the same content for every visitor).
    alternates: { canonical: absoluteUrl(localizedPath(locale, "/search")) },
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const q = firstValue(resolvedSearchParams.q)?.trim() ?? "";
  const pageParam = firstValue(resolvedSearchParams.page);
  const page = pageParam && /^\d+$/.test(pageParam) ? Number(pageParam) : 1;

  const t = await getTranslations("Catalog");

  if (!q) {
    return (
      <main className="mx-auto max-w-container px-4 py-16">
        <h1 className="font-display text-h2 font-black text-text">{t("search.title")}</h1>
        <p className="mt-4 text-body text-text-muted">{t("search.prompt")}</p>
      </main>
    );
  }

  // P6.S1: see fetchProductDetailBySlug's doc comment in
  // lib/fetchers/catalog.ts -- a Server Component fetch() needs the
  // incoming request's cookies forwarded explicitly for optionalAuth to
  // resolve a real wholesale account's price.
  const cookieHeader = (await cookies()).toString();
  const result = await fetchSearchResults(q, page, RESULTS_PER_PAGE, cookieHeader);

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-container px-4 py-16">
        <EmptyState
          titleAs="h1"
          title={t("apiDown.title")}
          description={t("apiDown.description")}
        />
      </main>
    );
  }

  const { data: products, total, limit } = result.data;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const productCardMessages = {
    inStock: t("product.inStock"),
    outOfStock: t("product.outOfStock"),
    noPhoto: t("product.noPhoto"),
    wholesalePriceBadge: t("product.wholesalePriceBadge"),
    wishlist: {
      add: t("product.wishlist.add"),
      remove: t("product.wishlist.remove"),
      error: t("product.wishlist.error"),
    },
    compare: {
      add: t("product.compare.add"),
      open: t("product.compare.open"),
      limit: t("product.compare.limit"),
    },
  };

  return (
    <main className="mx-auto max-w-container px-4 py-8">
      <h1 className="font-display text-h2 font-black text-text">
        {t("search.heading", { query: q })}
      </h1>
      <p className="mt-2 text-body-sm text-text-muted">
        {t("grid.resultsCount", { count: total })}
      </p>

      {products.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={t("grid.emptyTitle")} description={t("search.emptyHint")} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} messages={productCardMessages} />
            ))}
          </div>

          {pageCount > 1 ? (
            <nav
              aria-label="Pagination"
              className="mt-8 flex items-center justify-between gap-4 text-body-sm"
            >
              {page > 1 ? (
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}`}
                  className="text-brand hover:underline"
                >
                  {t("search.prev")}
                </Link>
              ) : (
                <span aria-hidden="true" />
              )}
              <span className="text-text-muted">{t("search.pageOf", { page, pageCount })}</span>
              {page < pageCount ? (
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&page=${page + 1}`}
                  className="text-brand hover:underline"
                >
                  {t("search.next")}
                </Link>
              ) : (
                <span aria-hidden="true" />
              )}
            </nav>
          ) : null}
        </>
      )}
    </main>
  );
}

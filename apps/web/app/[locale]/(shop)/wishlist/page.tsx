import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/primitives";
import { AccountNav } from "@/components/account/AccountNav";
import { ProductCard } from "@/components/plp/ProductCard";
import { fetchWishlist } from "@/lib/fetchers/wishlist";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const WISHLIST_PER_PAGE = 20;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.5s-7.5-4.6-10-9.3C.6 8 2 4.5 5.3 3.6c2.1-.6 4.3.3 5.7 2.2 1.4-1.9 3.6-2.8 5.7-2.2C20 4.5 21.4 8 20 11.2c-2.5 4.7-8 9.3-8 9.3z"
      />
    </svg>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Wishlist");
  return {
    title: t("title"),
    // A shopper's own saved products are private, per-session data -- not
    // indexable, same reasoning as /cart, /checkout, /orders, /addresses.
    robots: { index: false, follow: false },
  };
}

export default async function WishlistPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const pageParam = firstValue(resolvedSearchParams.page);
  const page = pageParam && /^\d+$/.test(pageParam) ? Number(pageParam) : 1;

  const t = await getTranslations("Wishlist");
  const tOrders = await getTranslations("Orders");
  const tAddresses = await getTranslations("Addresses");
  const tGarage = await getTranslations("Garage");
  const tCatalog = await getTranslations("Catalog");

  // Server-side auth gate, same reasoning as /orders (P7.S1): this page's
  // own content -- a grid + prev/next links -- needs no client JS beyond
  // what each ProductCard's own WishlistButton already ships independently.
  const cookieHeader = (await cookies()).toString();
  const result = await fetchWishlist(page, WISHLIST_PER_PAGE, cookieHeader);

  if (!result.ok && result.reason === "unauthorized") {
    redirect({ href: "/auth/login?next=/wishlist", locale });
  }

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-container px-4 py-16">
        <EmptyState titleAs="h1" title={t("apiDownTitle")} description={t("apiDownDescription")} />
      </main>
    );
  }

  const { data: items, total, limit } = result.data;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const productCardMessages = {
    inStock: tCatalog("product.inStock"),
    outOfStock: tCatalog("product.outOfStock"),
    noPhoto: tCatalog("product.noPhoto"),
    wholesalePriceBadge: tCatalog("product.wholesalePriceBadge"),
    wishlist: {
      add: tCatalog("product.wishlist.add"),
      remove: tCatalog("product.wishlist.remove"),
      error: tCatalog("product.wishlist.error"),
    },
  };

  return (
    <main className="mx-auto max-w-container px-4 py-8">
      <AccountNav
        active="wishlist"
        ordersLabel={tOrders("title")}
        addressesLabel={tAddresses("title")}
        wishlistLabel={t("title")}
        garageLabel={tGarage("title")}
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-h2 font-black text-text">{t("title")}</h1>
        {total > 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-danger bg-surface px-3 py-1 text-body-sm font-medium text-danger">
            {t("itemCount", { count: total })}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<HeartIcon />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Link href="/" className="text-body-sm text-brand hover:underline">
                {t("browseCta")}
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ProductCard key={item.id} product={item.product} messages={productCardMessages} />
            ))}
          </div>

          {pageCount > 1 ? (
            <nav
              aria-label="Pagination"
              className="mt-8 flex items-center justify-between gap-4 text-body-sm"
            >
              {page > 1 ? (
                <Link href={`/wishlist?page=${page - 1}`} className="text-brand hover:underline">
                  {t("prev")}
                </Link>
              ) : (
                <span aria-hidden="true" />
              )}
              <span className="text-text-muted">{t("pageOf", { page, pageCount })}</span>
              {page < pageCount ? (
                <Link href={`/wishlist?page=${page + 1}`} className="text-brand hover:underline">
                  {t("next")}
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

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { formatJalali, formatToman } from "schemas";
import { redirect, Link } from "@/i18n/navigation";
import { EmptyState, Badge } from "@/components/primitives";
import { AccountNav } from "@/components/account/AccountNav";
import { fetchOrders } from "@/lib/fetchers/orders";
import type { OrderStatusDto } from "schemas";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ORDERS_PER_PAGE = 10;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STATUS_TONE: Record<OrderStatusDto, "neutral" | "info" | "success" | "danger"> = {
  pending: "neutral",
  paid: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  refunded: "danger",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Orders");
  return {
    title: t("title"),
    // A shopper's own order history is private, per-session data -- not
    // indexable, same reasoning as /cart and /checkout.
    robots: { index: false, follow: false },
  };
}

export default async function OrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const pageParam = firstValue(resolvedSearchParams.page);
  const page = pageParam && /^\d+$/.test(pageParam) ? Number(pageParam) : 1;

  const t = await getTranslations("Orders");
  const tStatus = await getTranslations("Orders.status");
  const tAddresses = await getTranslations("Addresses");
  const tWishlist = await getTranslations("Wishlist");
  const tGarage = await getTranslations("Garage");

  // Server-side auth gate -- this page needs no client interactivity at
  // all (plain prev/next links, same shape /search already uses), so
  // there's no reason to ship client JS just for an auth check the way
  // /checkout's own interactive form justified doing client-side.
  const cookieHeader = (await cookies()).toString();
  const result = await fetchOrders(page, ORDERS_PER_PAGE, cookieHeader);

  if (!result.ok && result.reason === "unauthorized") {
    redirect({ href: "/auth/login?next=/orders", locale });
  }

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-container px-4 py-16">
        <EmptyState titleAs="h1" title={t("apiDownTitle")} description={t("apiDownDescription")} />
      </main>
    );
  }

  const { data: orders, total, limit } = result.data;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <main className="mx-auto max-w-container px-4 py-8">
      <AccountNav
        active="orders"
        ordersLabel={t("title")}
        addressesLabel={tAddresses("title")}
        wishlistLabel={tWishlist("title")}
        garageLabel={tGarage("title")}
      />
      <h1 className="mt-6 font-display text-h2 font-black text-text">{t("title")}</h1>

      {orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState
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
          <ul className="mt-6 flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.code}`}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 hover:border-brand-solid sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-body-sm text-text">{order.code}</span>
                    <span className="text-caption text-text-muted">
                      {formatJalali(order.createdAt, "YYYY/MM/DD")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={STATUS_TONE[order.status]}>{tStatus(order.status)}</Badge>
                    <span className="text-caption text-text-muted">
                      {t("itemCount", { count: order.itemCount })}
                    </span>
                    <span className="font-mono text-body-sm font-medium text-text">
                      {formatToman(order.totalRial)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {pageCount > 1 ? (
            <nav
              aria-label="Pagination"
              className="mt-8 flex items-center justify-between gap-4 text-body-sm"
            >
              {page > 1 ? (
                <Link href={`/orders?page=${page - 1}`} className="text-brand hover:underline">
                  {t("prev")}
                </Link>
              ) : (
                <span aria-hidden="true" />
              )}
              <span className="text-text-muted">{t("pageOf", { page, pageCount })}</span>
              {page < pageCount ? (
                <Link href={`/orders?page=${page + 1}`} className="text-brand hover:underline">
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

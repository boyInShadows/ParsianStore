import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { formatJalali, toPersianDigits } from "schemas";
import { redirect, Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/primitives";
// By file path, not the barrel -- see primitives/index.ts.
import { PageHeader } from "@/components/primitives/PageHeader";
import { Sheet } from "@/components/primitives/Sheet";
import { PriceTag } from "@/components/primitives/PriceTag";
import { LinkPagination } from "@/components/primitives/LinkPagination";
import { AccountNav } from "@/components/account/AccountNav";
import { OrderStatusBadge } from "@/components/account/OrderStatus";
import { fetchOrders } from "@/lib/fetchers/orders";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ORDERS_PER_PAGE = 10;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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

  const navLabels = {
    orders: t("title"),
    addresses: tAddresses("title"),
    wishlist: tWishlist("title"),
    garage: tGarage("title"),
  };

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
    <main className="mx-auto flex max-w-container flex-col gap-6 px-4 py-8">
      <AccountNav active="orders" labels={navLabels} />
      <PageHeader
        code="ORD"
        title={t("title")}
        meta={
          total > 0 ? (
            <span className="font-mono text-caption text-text-muted">
              {t("itemCount", { count: total })}
            </span>
          ) : null
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link href="/" className="text-body-sm text-brand hover:underline">
              {t("browseCta")}
            </Link>
          }
        />
      ) : (
        <>
          <Sheet>
            <Sheet.Rows>
              {orders.map((order) => (
                <Sheet.Row key={order.id} href={`/orders/${order.code}`}>
                  {/* Three zones, not label-then-value: status leads (it is
                      what a returning shopper scans for), the record code
                      and date identify the row, and the total closes it in
                      --price at a real size. Previously every one of these
                      rendered at the same weight. */}
                  <span className="hidden shrink-0 sm:block">
                    <OrderStatusBadge status={order.status} label={tStatus(order.status)} />
                  </span>
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="font-mono text-body font-medium text-text">{order.code}</span>
                    <span className="flex flex-wrap items-center gap-2 text-caption text-text-muted">
                      <span className="sm:hidden">
                        <OrderStatusBadge status={order.status} label={tStatus(order.status)} />
                      </span>
                      <time dateTime={order.createdAt}>
                        {formatJalali(order.createdAt, "YYYY/MM/DD")}
                      </time>
                      <span aria-hidden="true">·</span>
                      <span>{t("itemCount", { count: order.itemCount })}</span>
                    </span>
                  </span>
                  <PriceTag priceRial={order.totalRial} size="md" className="shrink-0" />
                </Sheet.Row>
              ))}
            </Sheet.Rows>
          </Sheet>

          <LinkPagination
            page={page}
            pageCount={pageCount}
            hrefFor={(target) => `/orders?page=${target}`}
            labels={{
              previous: t("prev"),
              next: t("next"),
              status: t("pageOf", {
                page: toPersianDigits(page),
                pageCount: toPersianDigits(pageCount),
              }),
            }}
          />
        </>
      )}
    </main>
  );
}

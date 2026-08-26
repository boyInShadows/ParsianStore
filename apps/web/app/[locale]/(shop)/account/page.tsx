import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { formatJalali, toPersianDigits } from "schemas";
import { Link, redirect } from "@/i18n/navigation";
import { AccountNav } from "@/components/account/AccountNav";
import { OrderStatusBadge } from "@/components/account/OrderStatus";
import { PageHeader } from "@/components/primitives/PageHeader";
import { PriceTag } from "@/components/primitives/PriceTag";
import { Sheet } from "@/components/primitives/Sheet";
import { fetchMeServer } from "@/lib/fetchers/auth";
import { fetchOrders } from "@/lib/fetchers/orders";
import { fetchAddressesServer } from "@/lib/fetchers/addresses";
import { fetchWishlist } from "@/lib/fetchers/wishlist";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Account.overview");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("Account.overview");
  const tStatus = await getTranslations("Orders.status");
  const cookieHeader = (await cookies()).toString();
  const user = await fetchMeServer(cookieHeader);
  if (!user) return redirect({ href: "/auth/login?next=/account", locale });

  const [ordersResult, addresses, wishlistResult] = await Promise.all([
    fetchOrders(1, 3, cookieHeader),
    fetchAddressesServer(cookieHeader),
    fetchWishlist(1, 1, cookieHeader),
  ]);
  const orders = ordersResult.ok ? ordersResult.data.data : [];
  const orderTotal = ordersResult.ok ? ordersResult.data.total : null;
  const wishlistTotal = wishlistResult.ok ? wishlistResult.data.total : null;
  const hasUnavailableData = !ordersResult.ok || addresses === null || !wishlistResult.ok;

  const metrics = [
    { label: t("ordersLabel"), value: orderTotal, href: "/orders" },
    { label: t("addressesLabel"), value: addresses?.length ?? null, href: "/addresses" },
    { label: t("wishlistLabel"), value: wishlistTotal, href: "/wishlist" },
  ];

  return (
    <main className="mx-auto flex max-w-container flex-col gap-6 px-4 py-8">
      <AccountNav active="overview" />
      <PageHeader code="ACC" title={t("greeting", { name: user.name })} />
      <p className="-mt-3 text-body text-text-muted">{t("subtitle")}</p>

      {hasUnavailableData ? (
        <p role="status" className="text-body-sm text-text-muted">
          {t("apiDown")}
        </p>
      ) : null}

      <section aria-label={t("title")} className="grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Link
            key={metric.href}
            href={metric.href}
            className="p-5 rounded-lg border border-border bg-surface transition-colors duration-fast hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none"
          >
            <span className="block text-body-sm text-text-muted">{metric.label}</span>
            <strong className="mt-2 block font-mono text-h2 text-text">
              {metric.value === null ? "—" : toPersianDigits(metric.value)}
            </strong>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Sheet>
          <Sheet.Header
            title={t("recentOrders")}
            code="REC"
            actions={
              <Link href="/orders" className="text-body-sm text-brand hover:underline">
                {t("viewAll")}
              </Link>
            }
          />
          {orders.length > 0 ? (
            <Sheet.Rows>
              {orders.map((order) => (
                <Sheet.Row key={order.id} href={`/orders/${order.code}`}>
                  <OrderStatusBadge status={order.status} label={tStatus(order.status)} />
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="font-mono text-body font-medium text-text">{order.code}</span>
                    <time dateTime={order.createdAt} className="text-caption text-text-muted">
                      {formatJalali(order.createdAt, "YYYY/MM/DD")}
                    </time>
                  </span>
                  <PriceTag priceRial={order.totalRial} size="sm" />
                </Sheet.Row>
              ))}
            </Sheet.Rows>
          ) : (
            <p className="p-5 text-body-sm text-text-muted">{t("noOrders")}</p>
          )}
        </Sheet>

        <Sheet className="p-5">
          <h2 className="text-h3 font-bold text-text">{t("profilePrompt")}</h2>
          <p className="mt-2 text-body-sm leading-relaxed text-text-muted">
            {t("profileDescription")}
          </p>
          <Link
            href="/profile"
            className="mt-5 inline-flex min-h-12 items-center rounded-md border border-border px-4 text-body-sm font-medium text-text hover:border-brand hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {t("editProfile")}
          </Link>
        </Sheet>
      </div>
    </main>
  );
}

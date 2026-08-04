import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { formatJalali, formatToman, type OrderStatusDto } from "schemas";
import { redirect } from "@/i18n/navigation";
import { EmptyState, Badge } from "@/components/primitives";
import { fetchOrderByCode } from "@/lib/fetchers/orders";

type Props = {
  params: Promise<{ locale: string; code: string }>;
};

const STATUS_TONE: Record<OrderStatusDto, "neutral" | "info" | "success" | "danger"> = {
  pending: "neutral",
  paid: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  refunded: "danger",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const t = await getTranslations("Orders.detail");
  return {
    title: t("title", { code }),
    robots: { index: false, follow: false },
  };
}

export default async function OrderDetailPage({ params }: Props) {
  const { code, locale } = await params;
  const t = await getTranslations("Orders");
  const tDetail = await getTranslations("Orders.detail");
  const tStatus = await getTranslations("Orders.status");

  const cookieHeader = (await cookies()).toString();
  const result = await fetchOrderByCode(code, cookieHeader);

  if (!result.ok && result.reason === "unauthorized") {
    redirect({ href: `/auth/login?next=/orders/${encodeURIComponent(code)}`, locale });
  }

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-container px-4 py-16">
        <EmptyState
          titleAs="h1"
          title={result.reason === "not-found" ? tDetail("notFoundTitle") : t("apiDownTitle")}
          description={
            result.reason === "not-found" ? tDetail("notFoundDescription") : t("apiDownDescription")
          }
        />
      </main>
    );
  }

  const order = result.data;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h2 font-black text-text">
          {tDetail("title", { code: order.code })}
        </h1>
        <div className="flex items-center gap-3">
          <Badge tone={STATUS_TONE[order.status]}>{tStatus(order.status)}</Badge>
          <span className="text-caption text-text-muted">
            {formatJalali(order.createdAt, "YYYY/MM/DD - HH:mm")}
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-h4 font-bold text-text">{tDetail("itemsTitle")}</h2>
        <ul className="flex flex-col gap-3">
          {order.items.map((item, index) => (
            <li
              key={`${item.productId}-${index}`}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-3"
            >
              <div className="flex flex-col gap-1">
                <span className="text-body-sm text-text">{item.nameSnapshot.fa}</span>
                <span className="font-mono text-caption text-text-muted">{item.skuSnapshot}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-caption text-text-muted">
                  {tDetail("qtyAtPrice", { qty: item.qty, price: formatToman(item.priceRial) })}
                </span>
                <span className="font-mono text-body-sm font-medium text-text">
                  {formatToman(item.priceRial * item.qty)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between text-body-sm text-text">
          <span className="text-text-muted">{tDetail("subtotalLabel")}</span>
          <span className="font-mono">{formatToman(order.subtotalRial)}</span>
        </div>
        {order.discountRial > 0 ? (
          <div className="flex items-center justify-between text-body-sm text-text">
            <span className="text-text-muted">
              {order.couponCode
                ? tDetail("discountWithCode", { code: order.couponCode })
                : tDetail("discountLabel")}
            </span>
            <span className="font-mono">-{formatToman(order.discountRial)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between text-body-sm text-text">
          <span className="text-text-muted">{tDetail("shippingLabel")}</span>
          <span className="font-mono">{formatToman(order.shippingRial)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2 text-body font-medium text-text">
          <span>{tDetail("totalLabel")}</span>
          <span className="text-h4 font-mono">{formatToman(order.totalRial)}</span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-body-sm font-bold text-text">{tDetail("addressTitle")}</h2>
          <p className="text-body-sm text-text">{order.address.receiverName}</p>
          <p className="font-mono text-caption text-text-muted">{order.address.receiverPhone}</p>
          <p className="text-body-sm text-text-muted">
            {order.address.province.fa}، {order.address.city.fa}، {order.address.line}
          </p>
          <p className="font-mono text-caption text-text-muted">{order.address.postalCode}</p>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-body-sm font-bold text-text">{tDetail("shippingMethodTitle")}</h2>
          <p className="text-body-sm text-text">{order.shippingMethod.name.fa}</p>
          {order.trackingCode ? (
            <p className="font-mono text-caption text-text-muted">
              {tDetail("trackingCode", { code: order.trackingCode })}
            </p>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h4 font-bold text-text">{tDetail("timelineTitle")}</h2>
        <ol className="flex flex-col gap-4">
          {order.statusHistory.map((entry, index) => (
            <li key={index} className="flex gap-3 border-s-2 border-border ps-3">
              <div className="flex flex-col gap-1">
                <span className="text-body-sm font-medium text-text">
                  {tStatus(entry.status as OrderStatusDto)}
                </span>
                <span className="text-caption text-text-muted">
                  {formatJalali(entry.at, "YYYY/MM/DD - HH:mm")}
                </span>
                {entry.note ? (
                  <span className="text-caption text-text-muted">{entry.note}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

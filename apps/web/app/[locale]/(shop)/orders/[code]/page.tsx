import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { formatJalali, formatToman, type OrderStatusDto } from "schemas";
import { redirect } from "@/i18n/navigation";
import { EmptyState } from "@/components/primitives";
// By file path, not the barrel -- see primitives/index.ts.
import { PageHeader } from "@/components/primitives/PageHeader";
import { Sheet } from "@/components/primitives/Sheet";
import { DataRow } from "@/components/primitives/DataRow";
import { Receipt } from "@/components/primitives/Receipt";
import { PriceTag } from "@/components/primitives/PriceTag";
import { AccountNav } from "@/components/account/AccountNav";
import { OrderStatusBadge, OrderStatusRail } from "@/components/account/OrderStatus";
import { fetchOrderByCode } from "@/lib/fetchers/orders";

type Props = {
  params: Promise<{ locale: string; code: string }>;
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

  const statusLabels = {
    pending: tStatus("pending"),
    paid: tStatus("paid"),
    processing: tStatus("processing"),
    shipped: tStatus("shipped"),
    delivered: tStatus("delivered"),
    cancelled: tStatus("cancelled"),
    refunded: tStatus("refunded"),
  } satisfies Record<OrderStatusDto, string>;

  return (
    <main className="mx-auto flex max-w-container flex-col gap-6 px-4 py-8">
      <AccountNav active="orders" />

      {/* The order code IS this page's identity, so it becomes the mono
          eyebrow at real scale. Previously this page had no back link and
          no AccountNav at all -- opening an order dropped you out of the
          account shell entirely. */}
      <PageHeader
        code={order.code}
        title={tDetail("title", { code: order.code })}
        back={{ href: "/orders", label: t("title") }}
        meta={
          <>
            <OrderStatusBadge status={order.status} label={tStatus(order.status)} />
            <time dateTime={order.createdAt} className="font-mono text-caption text-text-muted">
              {formatJalali(order.createdAt, "YYYY/MM/DD - HH:mm")}
            </time>
          </>
        }
      />

      {/* Two columns at lg: the document on the start side, the money and
          its logistics facts sticky on the end side. This was one
          max-w-3xl column of four identically-styled boxes. */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-6">
          <Sheet>
            <Sheet.Header code="ITM" title={tDetail("itemsTitle")} />
            <Sheet.Rows>
              {order.items.map((item, index) => (
                <Sheet.Row key={`${item.productId}-${index}`}>
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="text-body text-text">{item.nameSnapshot.fa}</span>
                    <span className="font-mono text-caption text-text-muted">
                      {item.skuSnapshot} ·{" "}
                      {tDetail("qtyAtPrice", {
                        qty: item.qty,
                        price: formatToman(item.priceRial),
                      })}
                    </span>
                  </span>
                  <PriceTag priceRial={item.priceRial * item.qty} size="sm" className="shrink-0" />
                </Sheet.Row>
              ))}
            </Sheet.Rows>
          </Sheet>

          <Sheet>
            <Sheet.Header code="TRK" title={tDetail("timelineTitle")} />
            <div className="p-4">
              {/* Was a stack of disconnected 2px stubs (one `border-s-2` per
                  <li>) with no nodes and no sense of where the order is. */}
              <OrderStatusRail
                history={order.statusHistory}
                currentStatus={order.status}
                labels={statusLabels}
                currentLabel={tDetail("currentStatus")}
              />
            </div>
          </Sheet>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <Receipt title={tDetail("summaryTitle")} code="SUM">
            <Receipt.Line
              label={tDetail("subtotalLabel")}
              value={formatToman(order.subtotalRial)}
              mono
            />
            {order.discountRial > 0 ? (
              <Receipt.Line
                label={
                  order.couponCode
                    ? tDetail("discountWithCode", { code: order.couponCode })
                    : tDetail("discountLabel")
                }
                value={`-${formatToman(order.discountRial)}`}
                mono
                emphasis="muted"
              />
            ) : null}
            <Receipt.Line
              label={tDetail("shippingLabel")}
              value={formatToman(order.shippingRial)}
              mono
            />
            {/* The grand total rendered at BODY size before this: its
                `text-h4` class is not in the type scale, so it generated
                no CSS at all. */}
            <Receipt.Total label={tDetail("totalLabel")} value={formatToman(order.totalRial)} />
          </Receipt>

          <Sheet>
            <Sheet.Header code="ADR" title={tDetail("addressTitle")} />
            <div className="flex flex-col gap-3 p-4">
              <DataRow label={tDetail("receiverLabel")} value={order.address.receiverName} />
              <DataRow label={tDetail("phoneLabel")} value={order.address.receiverPhone} mono />
              <DataRow
                label={tDetail("addressLabel")}
                value={`${order.address.province.fa}، ${order.address.city.fa}، ${order.address.line}`}
              />
              <DataRow label={tDetail("postalCodeLabel")} value={order.address.postalCode} mono />
            </div>
          </Sheet>

          <Sheet>
            <Sheet.Header code="SHP" title={tDetail("shippingMethodTitle")} />
            <div className="flex flex-col gap-3 p-4">
              <DataRow label={tDetail("methodLabel")} value={order.shippingMethod.name.fa} />
              {order.trackingCode ? (
                <DataRow label={tDetail("trackingLabel")} value={order.trackingCode} mono />
              ) : null}
            </div>
          </Sheet>
        </div>
      </div>
    </main>
  );
}

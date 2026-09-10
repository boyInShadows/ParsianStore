import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  paginate,
  type PaginatableDelegate,
  type PaginationMeta,
  type PaginationQuery,
  type Where,
} from "../../utils/pagination.js";

export interface OrderSummary {
  id: string;
  code: string;
  status: string;
  itemCount: number;
  totalRial: number;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  code: string;
  status: string;
  items: {
    productId: string;
    nameSnapshot: { fa: string; en: string };
    skuSnapshot: string;
    qty: number;
    priceRial: number;
  }[];
  subtotalRial: number;
  discountRial: number;
  couponCode?: string;
  shippingRial: number;
  taxRial: number;
  totalRial: number;
  address: {
    province: { fa: string; en: string };
    city: { fa: string; en: string };
    line: string;
    postalCode: string;
    plate?: string;
    unit?: string;
    receiverName: string;
    receiverPhone: string;
  };
  shippingMethod: { code: string; name: { fa: string; en: string }; priceRial: number };
  trackingCode?: string;
  statusHistory: { status: string; at: string; note?: string }[];
  notes?: string;
  createdAt: string;
}

/**
 * Everything a detail view reads, in one query.
 *
 * The address and shipping-method snapshots are flat columns now rather than
 * embedded documents. That is a storage decision and it stops at storage: the
 * wire shape below is the nested one every existing consumer already reads,
 * rebuilt by `toOrderDetail`. Same reasoning as `localized()` in
 * utils/serialize.ts.
 */
export const ORDER_DETAIL_INCLUDE = {
  items: { orderBy: { id: "asc" } },
  statusHistory: { orderBy: { at: "asc" } },
} as const satisfies Prisma.OrderInclude;

export type OrderDetailRow = Prisma.OrderGetPayload<{ include: typeof ORDER_DETAIL_INCLUDE }>;

/** The list row is lighter than the detail view, but it still needs the item
 * quantities to total. `_count` cannot sum a column, so the quantities are
 * selected and summed here. */
export const ORDER_SUMMARY_INCLUDE = {
  items: { select: { qty: true } },
} as const satisfies Prisma.OrderInclude;

export type OrderSummaryRow = Prisma.OrderGetPayload<{ include: typeof ORDER_SUMMARY_INCLUDE }>;

export function toOrderSummary(order: OrderSummaryRow): OrderSummary {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    itemCount: order.items.reduce((sum, item) => sum + item.qty, 0),
    totalRial: order.totalRial,
    createdAt: order.createdAt.toISOString(),
  };
}

export function toOrderDetail(order: OrderDetailRow): OrderDetail {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    items: order.items.map((item) => ({
      productId: item.productId,
      nameSnapshot: { fa: item.nameFaSnapshot, en: item.nameEnSnapshot },
      skuSnapshot: item.skuSnapshot,
      qty: item.qty,
      priceRial: item.priceRial,
    })),
    subtotalRial: order.subtotalRial,
    discountRial: order.discountRial,
    ...(order.couponCode ? { couponCode: order.couponCode } : {}),
    shippingRial: order.shippingRial,
    taxRial: order.taxRial,
    totalRial: order.totalRial,
    address: {
      province: { fa: order.addrProvinceFa, en: order.addrProvinceEn },
      city: { fa: order.addrCityFa, en: order.addrCityEn },
      line: order.addrLine,
      postalCode: order.addrPostalCode,
      ...(order.addrPlate ? { plate: order.addrPlate } : {}),
      ...(order.addrUnit ? { unit: order.addrUnit } : {}),
      receiverName: order.addrReceiverName,
      receiverPhone: order.addrReceiverPhone,
    },
    shippingMethod: {
      code: order.shipMethodCode,
      name: { fa: order.shipMethodFa, en: order.shipMethodEn },
      priceRial: order.shipPriceRial,
    },
    ...(order.trackingCode ? { trackingCode: order.trackingCode } : {}),
    statusHistory: order.statusHistory.map((entry) => ({
      status: entry.status,
      at: entry.at.toISOString(),
      ...(entry.note ? { note: entry.note } : {}),
    })),
    ...(order.notes ? { notes: order.notes } : {}),
    createdAt: order.createdAt.toISOString(),
  };
}

/** Lighter than the detail view -- a list only needs enough to identify
 * and triage an order (same "list row is lighter than detail" pattern
 * every other list endpoint in this codebase already follows). */
export async function listOrders(
  userId: string,
  pagination: PaginationQuery,
): Promise<{ data: OrderSummary[]; meta: PaginationMeta }> {
  const { data, meta } = await paginate<OrderSummaryRow>(
    prisma.order as unknown as PaginatableDelegate<OrderSummaryRow>,
    "Order",
    { userId } satisfies Where,
    { ...pagination, sort: pagination.sort ?? "-createdAt" },
    { include: ORDER_SUMMARY_INCLUDE },
  );
  return { data: data.map(toOrderSummary), meta };
}

/** Ownership is baked directly into the query filter (matches
 * addresses.service.ts's own getOwnAddress precedent) -- an order
 * belonging to a different user 404s exactly the same as a code that
 * doesn't exist at all, never leaking whether the code itself is real. */
export async function getOrderByCode(userId: string, code: string): Promise<OrderDetail> {
  const order = await prisma.order.findFirst({
    where: { userId, code },
    include: ORDER_DETAIL_INCLUDE,
  });
  if (!order) {
    throw new ApiError(404, "سفارش یافت نشد");
  }
  return toOrderDetail(order);
}

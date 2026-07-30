import { OrderModel } from "../../models/Order.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationMeta, type PaginationQuery } from "../../utils/pagination.js";

export interface OrderSummary {
  id: string;
  code: string;
  status: string;
  itemCount: number;
  totalRial: number;
  createdAt: string;
}

/** Lighter than the detail view -- a list only needs enough to identify
 * and triage an order (same "list row is lighter than detail" pattern
 * every other list endpoint in this codebase already follows). */
export async function listOrders(
  userId: string,
  pagination: PaginationQuery,
): Promise<{ data: OrderSummary[]; meta: PaginationMeta }> {
  const { data: orders, meta } = await paginate(
    OrderModel,
    { userId },
    { ...pagination, sort: pagination.sort ?? "-createdAt" },
  );

  const data: OrderSummary[] = orders.map((order) => ({
    id: order._id.toString(),
    code: order.code,
    status: order.status,
    itemCount: order.items.reduce((sum, item) => sum + item.qty, 0),
    totalRial: order.totalRial,
    createdAt: order.createdAt.toISOString(),
  }));

  return { data, meta };
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

/** Ownership is baked directly into the query filter (matches
 * addresses.service.ts's own getOwnAddress precedent) -- an order
 * belonging to a different user 404s exactly the same as a code that
 * doesn't exist at all, never leaking whether the code itself is real. */
export async function getOrderByCode(userId: string, code: string): Promise<OrderDetail> {
  const order = await OrderModel.findOne({ userId, code });
  if (!order) {
    throw new ApiError(404, "سفارش یافت نشد");
  }

  return {
    id: order._id.toString(),
    code: order.code,
    status: order.status,
    items: order.items.map((item) => ({
      productId: item.productId.toString(),
      nameSnapshot: item.nameSnapshot,
      skuSnapshot: item.skuSnapshot,
      qty: item.qty,
      priceRial: item.priceRial,
    })),
    subtotalRial: order.subtotalRial,
    discountRial: order.discountRial,
    couponCode: order.couponCode,
    shippingRial: order.shippingRial,
    taxRial: order.taxRial,
    totalRial: order.totalRial,
    address: order.address,
    shippingMethod: order.shippingMethod,
    trackingCode: order.trackingCode,
    statusHistory: order.statusHistory.map((entry) => ({
      status: entry.status,
      at: entry.at.toISOString(),
      note: entry.note,
    })),
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
  };
}

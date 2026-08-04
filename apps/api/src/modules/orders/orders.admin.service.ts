import type { HydratedDocument } from "mongoose";
import { OrderModel, type Order } from "../../models/Order.js";
import { UserModel } from "../../models/User.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationMeta, type PaginationQuery } from "../../utils/pagination.js";
import type { OrderDetail, OrderSummary } from "./orders.service.js";
import type { UpdateOrderStatusInput } from "./orders.admin.schema.js";

export interface AdminOrderSummary extends OrderSummary {
  userId: string;
  customerPhone: string;
}

export interface AdminOrderDetail extends OrderDetail {
  userId: string;
  customerPhone: string;
}

/** Batch-hydrates `customerPhone` per order via a separate User query --
 * same "separate query, never populate" pattern wishlist.service.ts and
 * addresses.service.ts already established, not a live join. A user
 * deleted after placing an order (no such flow exists today, but the
 * model allows it) falls back to an empty string rather than crashing
 * the whole list. */
async function hydrateCustomerPhones(userIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds)];
  const users = await UserModel.find({ _id: { $in: uniqueIds } }).select("phone");
  return new Map(users.map((user) => [user._id.toString(), user.phone]));
}

/** Cross-user by design -- staff need to see every order, not just their
 * own (the whole reason this is a separate module from orders.service.ts
 * rather than a `requireStaff()` variant of the same function: that
 * one's ownership-scoping is baked into the query filter itself, exactly
 * the thing this needs to NOT do). */
export async function listAllOrders(
  pagination: PaginationQuery,
  filters: { status?: string },
): Promise<{ data: AdminOrderSummary[]; meta: PaginationMeta }> {
  const filter = filters.status ? { status: filters.status } : {};
  const { data: orders, meta } = await paginate(OrderModel, filter, {
    ...pagination,
    sort: pagination.sort ?? "-createdAt",
  });

  const phoneByUserId = await hydrateCustomerPhones(orders.map((order) => order.userId.toString()));

  const data: AdminOrderSummary[] = orders.map((order) => ({
    id: order._id.toString(),
    code: order.code,
    status: order.status,
    itemCount: order.items.reduce((sum, item) => sum + item.qty, 0),
    totalRial: order.totalRial,
    createdAt: order.createdAt.toISOString(),
    userId: order.userId.toString(),
    customerPhone: phoneByUserId.get(order.userId.toString()) ?? "",
  }));

  return { data, meta };
}

function toAdminOrderDetail(
  order: HydratedDocument<Order>,
  customerPhone: string,
): AdminOrderDetail {
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
    userId: order.userId.toString(),
    customerPhone,
  };
}

/** No ownership scoping (matches listAllOrders' own reasoning) -- a
 * malformed id is rejected earlier by `adminOrderIdParamSchema`'s regex,
 * so a 404 here always means "this id is well-formed but no such order
 * exists," not an ambiguous ownership case the way the customer-facing
 * getOrderByCode's 404 deliberately is. */
export async function getOrderById(id: string): Promise<AdminOrderDetail> {
  const order = await OrderModel.findById(id);
  if (!order) {
    throw new ApiError(404, "سفارش یافت نشد");
  }
  const phoneByUserId = await hydrateCustomerPhones([order.userId.toString()]);
  return toAdminOrderDetail(order, phoneByUserId.get(order.userId.toString()) ?? "");
}

/** Plain manual transition -- no workflow engine, no allowed-transitions
 * table. Refund/invoice side effects are explicitly out of scope for
 * this first admin piece (see packages/schemas's own comment on
 * `updateOrderStatusInputSchema`); this only ever appends to
 * `statusHistory` and flips `status`, mirroring the exact pattern
 * `payments.service.ts` already uses for its own automatic transitions
 * (`order.status = X; order.statusHistory.push({status, at, note}); await
 * order.save();`), just staff-triggered instead of payment-triggered. */
export async function updateOrderStatus(
  id: string,
  input: UpdateOrderStatusInput,
): Promise<AdminOrderDetail> {
  const order = await OrderModel.findById(id);
  if (!order) {
    throw new ApiError(404, "سفارش یافت نشد");
  }

  const now = new Date();
  order.status = input.status;
  order.statusHistory.push({ status: input.status, at: now, note: input.note });
  await order.save();

  const phoneByUserId = await hydrateCustomerPhones([order.userId.toString()]);
  return toAdminOrderDetail(order, phoneByUserId.get(order.userId.toString()) ?? "");
}

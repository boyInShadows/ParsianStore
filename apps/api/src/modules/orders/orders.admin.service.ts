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
import type { UpdateOrderStatusInput } from "./orders.admin.schema.js";
import {
  ORDER_DETAIL_INCLUDE,
  toOrderDetail,
  toOrderSummary,
  type OrderDetail,
  type OrderSummary,
} from "./orders.service.js";

export interface AdminOrderSummary extends OrderSummary {
  userId: string;
  customerPhone: string;
}

export interface AdminOrderDetail extends OrderDetail {
  userId: string;
  customerPhone: string;
}

/**
 * The customer's phone, joined rather than batch-looked-up.
 *
 * The Mongo version fetched every referenced user in a second query and built
 * a Map, with a note explaining that a user deleted after placing an order
 * would fall back to an empty string rather than crash the list. A foreign key
 * makes the row always present, and `Order.user` is `Restrict`, so the case
 * the fallback guarded against can no longer happen -- but a *soft*-deleted
 * customer can, and the extension does not reach nested reads, so the phone is
 * still read defensively below.
 */
const CUSTOMER = { user: { select: { phone: true } } } as const;

const ADMIN_SUMMARY_INCLUDE = {
  ...CUSTOMER,
  items: { select: { qty: true } },
} as const satisfies Prisma.OrderInclude;

const ADMIN_DETAIL_INCLUDE = {
  ...CUSTOMER,
  ...ORDER_DETAIL_INCLUDE,
} as const satisfies Prisma.OrderInclude;

type AdminSummaryRow = Prisma.OrderGetPayload<{ include: typeof ADMIN_SUMMARY_INCLUDE }>;
type AdminDetailRow = Prisma.OrderGetPayload<{ include: typeof ADMIN_DETAIL_INCLUDE }>;

/** Cross-user by design -- staff need to see every order, not just their
 * own (the whole reason this is a separate module from orders.service.ts
 * rather than a `requireStaff()` variant of the same function: that
 * one's ownership-scoping is baked into the query filter itself, exactly
 * the thing this needs to NOT do). */
export async function listAllOrders(
  pagination: PaginationQuery,
  filters: { status?: string },
): Promise<{ data: AdminOrderSummary[]; meta: PaginationMeta }> {
  const where: Where = filters.status ? { status: filters.status } : {};
  const { data, meta } = await paginate<AdminSummaryRow>(
    prisma.order as unknown as PaginatableDelegate<AdminSummaryRow>,
    "Order",
    where,
    { ...pagination, sort: pagination.sort ?? "-createdAt" },
    { include: ADMIN_SUMMARY_INCLUDE },
  );

  return {
    data: data.map((order) => ({
      ...toOrderSummary(order),
      userId: order.userId,
      customerPhone: order.user?.phone ?? "",
    })),
    meta,
  };
}

function toAdminOrderDetail(order: AdminDetailRow): AdminOrderDetail {
  return {
    ...toOrderDetail(order),
    userId: order.userId,
    customerPhone: order.user?.phone ?? "",
  };
}

/** No ownership scoping (matches listAllOrders' own reasoning) -- a
 * malformed id is rejected earlier by `adminOrderIdParamSchema`, so a 404
 * here always means "this id is well-formed but no such order exists," not
 * an ambiguous ownership case the way the customer-facing getOrderByCode's
 * 404 deliberately is. */
export async function getOrderById(id: string): Promise<AdminOrderDetail> {
  const order = await prisma.order.findUnique({ where: { id }, include: ADMIN_DETAIL_INCLUDE });
  if (!order) {
    throw new ApiError(404, "سفارش یافت نشد");
  }
  return toAdminOrderDetail(order);
}

/**
 * Plain manual transition -- no workflow engine, no allowed-transitions
 * table. Refund/invoice side effects are explicitly out of scope for this
 * first admin piece (see packages/schemas's own comment on
 * `updateOrderStatusInputSchema`); this only ever appends to the status
 * history and flips `status`, mirroring the pattern payments.service.ts uses
 * for its own automatic transitions, just staff-triggered.
 *
 * Both writes are one transaction, where Mongo could only offer one
 * `save()` over a document that happened to embed its own history. The
 * history is a table now, so making them atomic is a choice worth making
 * rather than something the data model handed us.
 */
export async function updateOrderStatus(
  id: string,
  input: UpdateOrderStatusInput,
): Promise<AdminOrderDetail> {
  const existing = await prisma.order.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new ApiError(404, "سفارش یافت نشد");
  }

  const order = await prisma.$transaction(async (tx) => {
    await tx.orderStatusEntry.create({
      data: { orderId: id, status: input.status, note: input.note ?? null },
    });
    return tx.order.update({
      where: { id },
      data: { status: input.status },
      include: ADMIN_DETAIL_INCLUDE,
    });
  });

  return toAdminOrderDetail(order);
}

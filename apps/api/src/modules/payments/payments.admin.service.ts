import { prisma } from "../../config/prisma.js";

const SETTLED_ORDER_STATUSES = new Set(["paid", "processing", "shipped", "delivered"]);
export type ReconciliationIssue =
  | "amount-mismatch"
  | "payment-success-order-unpaid"
  | "order-paid-payment-unsettled"
  | "stale-initiated"
  | "missing-authority";

export async function reconcilePayments(now = new Date()) {
  const [payments, orders] = await Promise.all([
    prisma.payment.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.order.findMany(),
  ]);
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const paymentOrderIds = new Set(payments.map((payment) => payment.orderId));
  const rows: Array<Record<string, unknown>> = [];
  for (const payment of payments) {
    const order = orderById.get(payment.orderId);
    const issues: ReconciliationIssue[] = [];
    if (!order || order.totalRial !== payment.amountRial) issues.push("amount-mismatch");
    if (payment.status === "success" && (!order || !SETTLED_ORDER_STATUSES.has(order.status)))
      issues.push("payment-success-order-unpaid");
    if (
      order &&
      SETTLED_ORDER_STATUSES.has(order.status) &&
      payment.status !== "success" &&
      payment.status !== "refunded"
    )
      issues.push("order-paid-payment-unsettled");
    if (
      payment.status === "initiated" &&
      now.getTime() - payment.createdAt.getTime() > 20 * 60 * 1000
    )
      issues.push("stale-initiated");
    if (payment.status === "initiated" && !payment.authority) issues.push("missing-authority");
    if (issues.length)
      rows.push({
        id: payment.id,
        orderId: payment.orderId,
        orderCode: order?.code,
        orderStatus: order?.status,
        paymentStatus: payment.status,
        provider: payment.provider,
        amountRial: payment.amountRial,
        orderTotalRial: order?.totalRial,
        authority: payment.authority,
        refId: payment.refId,
        createdAt: payment.createdAt,
        issues,
      });
  }
  for (const order of orders)
    if (SETTLED_ORDER_STATUSES.has(order.status) && !paymentOrderIds.has(order.id))
      rows.push({
        id: `missing-${order.id}`,
        orderId: order.id,
        orderCode: order.code,
        orderStatus: order.status,
        orderTotalRial: order.totalRial,
        issues: ["order-paid-payment-unsettled"],
      });
  return {
    generatedAt: now,
    counts: { payments: payments.length, orders: orders.length, issues: rows.length },
    rows,
  };
}

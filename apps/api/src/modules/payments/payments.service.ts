import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { paymentProvider, type PaymentVerifyResult } from "../../providers/payment/index.js";
import { ApiError } from "../../utils/ApiError.js";
import * as cartService from "../cart/cart.service.js";
import { incrementCouponUsage } from "../coupons/coupon.service.js";
import * as inventoryService from "../inventory/inventory.service.js";

export interface FinalizePaymentResult {
  orderCode: string;
  status: string;
}

/**
 * The real outcome of a checkout: the gateway (or the mock) redirects the
 * shopper's browser here after they leave the payment page. `orderId` +
 * `authority` together identify exactly one live Payment (same pair
 * Payment's own compound index is built on).
 *
 * Idempotent by design -- gateways are documented to sometimes hit a
 * callback more than once for the same authority (network retry, user
 * hitting back/refresh). Only a Payment still in `initiated` status ever
 * touches stock/cart/Order status; a repeat call just echoes the
 * already-settled outcome back.
 */
export async function finalizePayment(
  orderId: string,
  authority: string,
  status: "OK" | "NOK",
): Promise<FinalizePaymentResult> {
  const payment = await prisma.payment.findFirst({ where: { orderId, authority } });
  if (!payment) {
    throw new ApiError(404, "پرداخت یافت نشد");
  }
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new ApiError(404, "سفارش یافت نشد");
  }

  if (payment.status !== "initiated") {
    return { orderCode: order.code, status: order.status };
  }

  let success: boolean;
  let verifyResult: PaymentVerifyResult | undefined;
  if (status === "NOK") {
    // Real Zarinpal convention: NOK means the payer explicitly cancelled
    // before completing the payment -- there is no legitimate transaction
    // to verify, so this is treated as a real business decline directly,
    // never a transport failure. Also the only way this codebase's own
    // MockPaymentProvider.verify() (which never simulates failure, same
    // simplicity precedent as MockSmsProvider) can produce a real
    // "failed" outcome for tests.
    success = false;
  } else {
    verifyResult = await paymentProvider.verify({ amountRial: payment.amountRial, authority });
    success = verifyResult.success;
  }

  const now = new Date();

  if (success) {
    // Payment, order status and the history entry in one transaction. Under
    // Mongo these were three `save()` calls with nothing tying them together:
    // a crash after the payment was marked successful left an order still
    // reading "pending" with a settled payment behind it, which is the worst
    // of the possible half-states.
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "success",
          verifiedAt: now,
          refId: verifyResult?.refId ?? null,
          raw: (verifyResult?.raw as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
        },
      });
      await tx.order.update({ where: { id: orderId }, data: { status: "paid" } });
      await tx.orderStatusEntry.create({ data: { orderId, status: "paid", at: now } });
    });

    // Reservations become the real sale (stock was already decremented
    // at reservation time, confirmReservation only closes the audit
    // trail) and the cart that produced this order is emptied -- same
    // "server owns the truth" philosophy every other checkout side
    // effect in this step already follows.
    await inventoryService.confirmReservationsByRefId(orderId);
    await cartService.clearCart({ userId: order.userId });
    // Only a genuinely paid order consumes a redemption -- a cancelled/
    // failed attempt (the else branch below) never reaches this, so an
    // abandoned checkout doesn't permanently burn a limited-use code.
    if (order.couponCode) {
      await incrementCouponUsage(order.couponCode);
    }
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "failed",
          raw: (verifyResult?.raw as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
        },
      });
      await tx.order.update({ where: { id: orderId }, data: { status: "cancelled" } });
      await tx.orderStatusEntry.create({
        data: { orderId, status: "cancelled", at: now, note: "پرداخت ناموفق" },
      });
    });

    await inventoryService.releaseReservationsByRefId(orderId);
  }

  // Read back rather than trusting the local copy: the transaction above is
  // what actually decided the outcome.
  const settled = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { code: true, status: true },
  });
  return { orderCode: settled.code, status: settled.status };
}

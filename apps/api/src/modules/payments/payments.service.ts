import { OrderModel } from "../../models/Order.js";
import { PaymentModel } from "../../models/Payment.js";
import { paymentProvider, type PaymentVerifyResult } from "../../providers/payment/index.js";
import { ApiError } from "../../utils/ApiError.js";
import * as cartService from "../cart/cart.service.js";
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
  const payment = await PaymentModel.findOne({ orderId, authority });
  if (!payment) {
    throw new ApiError(404, "پرداخت یافت نشد");
  }
  const order = await OrderModel.findById(orderId);
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
    payment.status = "success";
    payment.verifiedAt = now;
    payment.refId = verifyResult?.refId;
    payment.raw = verifyResult?.raw;
    await payment.save();

    order.status = "paid";
    order.statusHistory.push({ status: "paid", at: now });
    await order.save();

    // Reservations become the real sale (stock was already decremented
    // at reservation time, confirmReservation only closes the audit
    // trail) and the cart that produced this order is emptied -- same
    // "server owns the truth" philosophy every other checkout side
    // effect in this step already follows.
    await inventoryService.confirmReservationsByRefId(orderId);
    await cartService.clearCart({ userId: order.userId.toString() });
  } else {
    payment.status = "failed";
    payment.raw = verifyResult?.raw;
    await payment.save();

    order.status = "cancelled";
    order.statusHistory.push({ status: "cancelled", at: now, note: "پرداخت ناموفق" });
    await order.save();

    await inventoryService.releaseReservationsByRefId(orderId);
  }

  return { orderCode: order.code, status: order.status };
}

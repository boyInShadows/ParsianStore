import { Types } from "mongoose";
import { formatJalali } from "schemas";
import { env } from "../../config/env.js";
import { OrderModel, type OrderItem } from "../../models/Order.js";
import { PaymentModel } from "../../models/Payment.js";
import { ProductModel } from "../../models/Product.js";
import type { AccountType } from "../../models/User.js";
import { UserModel } from "../../models/User.js";
import { paymentProvider } from "../../providers/payment/index.js";
import { ApiError } from "../../utils/ApiError.js";
import * as addressesService from "../addresses/addresses.service.js";
import * as cartService from "../cart/cart.service.js";
import * as inventoryService from "../inventory/inventory.service.js";
import * as shippingService from "../shipping/shipping.service.js";
import type { InitiateCheckoutInput } from "./checkout.schema.js";

// §3.6: "Stock is reserved on payment initiation with a TTL, released on
// failure/timeout." 15 minutes is a reasonable real-world payment-gateway
// session length; jobs/inventoryCron.ts (P3.S6, already running) sweeps
// anything that outlives it, so an abandoned checkout self-heals without
// this module needing its own cleanup job.
const CHECKOUT_RESERVATION_TTL_MS = 15 * 60 * 1000;

const ORDER_CODE_MAX_ATTEMPTS = 5;

/** §3.6: "Order codes are human-readable and Jalali-year prefixed:
 * PS-1404-04821." A random 5-digit suffix with a uniqueness retry loop,
 * not a dedicated counter collection -- a collision is astronomically
 * unlikely (1 in 90,000 per attempt) and this avoids introducing a new
 * shared-mutable-counter document just for cosmetic code formatting. */
async function generateOrderCode(): Promise<string> {
  const year = formatJalali(new Date(), "YYYY");
  for (let attempt = 0; attempt < ORDER_CODE_MAX_ATTEMPTS; attempt++) {
    const suffix = Math.floor(10_000 + Math.random() * 90_000);
    const code = `PS-${year}-${suffix}`;
    const exists = await OrderModel.exists({ code });
    if (!exists) return code;
  }
  throw new ApiError(500, "امکان تولید کد سفارش منحصربه‌فرد وجود ندارد");
}

function buildPaymentCallbackUrl(orderId: string): string {
  return `${env.PUBLIC_URL}/api/v1/payments/callback?orderId=${orderId}`;
}

export interface InitiateCheckoutResult {
  orderId: string;
  orderCode: string;
  redirectUrl: string;
}

/**
 * §3.6 Checkout, backend half: validates the cart, snapshots the chosen
 * address + shipping method onto a real Order, reserves stock, and hands
 * the caller a redirectUrl to the payment gateway. The real /checkout
 * frontend page (a future step, same "backend infra ahead of its UI
 * consumer" pattern P6.S2/P6.S3/P6.S4 already established) is the real
 * first consumer of this response shape.
 */
export async function initiateCheckout(
  userId: string,
  accountType: AccountType | undefined,
  input: InitiateCheckoutInput,
): Promise<InitiateCheckoutResult> {
  const cart = await cartService.getCart({ userId }, accountType);
  if (cart.items.length === 0) {
    throw new ApiError(400, "سبد خرید خالی است");
  }
  if (cart.items.some((item) => !item.stockOk)) {
    throw new ApiError(409, "موجودی برخی اقلام سبد خرید کافی نیست");
  }

  // Separate query, not `.populate()` (established convention) -- needed
  // for the order's own name/sku snapshot, since CartItemView's `product`
  // is already shaped through toPublicProductJson and shouldn't be
  // re-parsed for internal use.
  const productIds = cart.items.map((item) => item.productId);
  const products = await ProductModel.find({ _id: { $in: productIds } }, "name sku");
  if (products.length !== productIds.length) {
    throw new ApiError(409, "یکی از محصولات سبد خرید دیگر در دسترس نیست");
  }
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const addressView = await addressesService.getOwnAddress(userId, input.addressId);
  const { options } = await shippingService.estimateShipping(userId, input.addressId, accountType);
  const shippingOption = options.find((option) => option.methodCode === input.shippingMethodCode);
  if (!shippingOption) {
    throw new ApiError(400, "روش ارسال انتخاب‌شده برای این سفارش در دسترس نیست");
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(404, "کاربر یافت نشد");
  }

  const orderId = new Types.ObjectId();
  const paymentId = new Types.ObjectId();

  // Sequential, not Promise.all -- reserveStock's own atomic guard can
  // legitimately reject mid-loop (a concurrent checkout raced the last
  // unit), and a partial-success rollback needs to know exactly which
  // reservations already exist. No multi-document transaction is
  // available in this deployment (same constraint inventory.service.ts's
  // own adjustStock already documents), so this loop-then-rollback is the
  // established pattern, not a shortcut.
  try {
    for (const item of cart.items) {
      await inventoryService.reserveStock(
        item.productId,
        item.qty,
        CHECKOUT_RESERVATION_TTL_MS,
        orderId.toString(),
      );
    }
  } catch (err) {
    await inventoryService.releaseReservationsByRefId(orderId.toString());
    throw err instanceof ApiError ? err : new ApiError(409, "موجودی برخی اقلام سبد خرید کافی نیست");
  }

  const orderItems: OrderItem[] = cart.items.map((item) => {
    const product = productById.get(item.productId)!;
    return {
      productId: new Types.ObjectId(item.productId),
      nameSnapshot: product.name,
      skuSnapshot: product.sku,
      qty: item.qty,
      // The effective (tier-resolved) unit price this cart already
      // computed server-side -- never re-derived here, matches §3.6
      // "cart totals recomputed server-side at every step."
      priceRial: item.lineTotalRial / item.qty,
    };
  });

  const subtotalRial = cart.subtotalRial;
  const shippingRial = shippingOption.priceRial;
  const totalRial = subtotalRial + shippingRial;
  const code = await generateOrderCode();
  const now = new Date();

  await OrderModel.create({
    _id: orderId,
    code,
    userId: new Types.ObjectId(userId),
    items: orderItems,
    subtotalRial,
    discountRial: 0,
    shippingRial,
    taxRial: 0,
    totalRial,
    address: {
      province: addressView.province.name,
      city: addressView.city.name,
      line: addressView.line,
      postalCode: addressView.postalCode,
      plate: addressView.plate,
      unit: addressView.unit,
      receiverName: addressView.receiverName,
      receiverPhone: addressView.receiverPhone,
    },
    shippingMethod: {
      code: shippingOption.methodCode,
      name: shippingOption.name,
      priceRial: shippingOption.priceRial,
    },
    status: "pending",
    statusHistory: [{ status: "pending", at: now }],
    paymentId,
    notes: input.notes,
  });

  await PaymentModel.create({
    _id: paymentId,
    orderId,
    provider: env.PAYMENT_PROVIDER,
    amountRial: totalRial,
    status: "initiated",
  });

  try {
    const result = await paymentProvider.initiate({
      amountRial: totalRial,
      callbackUrl: buildPaymentCallbackUrl(orderId.toString()),
      description: `پرداخت سفارش ${code}`,
      mobile: user.phone,
      orderId: orderId.toString(),
    });
    await PaymentModel.updateOne({ _id: paymentId }, { $set: { authority: result.authority } });
    return { orderId: orderId.toString(), orderCode: code, redirectUrl: result.redirectUrl };
  } catch {
    // A real transport-layer failure (network/gateway down), not a
    // business decline -- those only ever surface later, at verify time,
    // via modules/payments. Unwind everything this attempt created.
    await inventoryService.releaseReservationsByRefId(orderId.toString());
    await Promise.all([
      OrderModel.deleteOne({ _id: orderId }),
      PaymentModel.deleteOne({ _id: paymentId }),
    ]);
    throw new ApiError(502, "شروع فرآیند پرداخت با خطا مواجه شد، دوباره تلاش کنید");
  }
}

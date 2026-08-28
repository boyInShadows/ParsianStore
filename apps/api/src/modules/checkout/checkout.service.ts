import type { AccountType } from "@prisma/client";
import { formatJalali } from "schemas";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { paymentProvider } from "../../providers/payment/index.js";
import { ApiError } from "../../utils/ApiError.js";
import * as addressesService from "../addresses/addresses.service.js";
import * as cartService from "../cart/cart.service.js";
import * as inventoryService from "../inventory/inventory.service.js";
import * as shippingService from "../shipping/shipping.service.js";
import type { InitiateCheckoutInput } from "./checkout.schema.js";

// §3.6: "Stock is reserved on payment initiation with a TTL, released on
// failure/timeout." 15 minutes is a reasonable real-world payment-gateway
// session length; jobs/inventoryCron.ts sweeps anything that outlives it, so
// an abandoned checkout self-heals without this module needing its own
// cleanup job.
const CHECKOUT_RESERVATION_TTL_MS = 15 * 60 * 1000;

const ORDER_CODE_MAX_ATTEMPTS = 5;

/** §3.6: "Order codes are human-readable and Jalali-year prefixed:
 * PS-1404-04821." A random 5-digit suffix with a uniqueness retry loop,
 * not a dedicated counter table -- a collision is astronomically
 * unlikely (1 in 90,000 per attempt) and this avoids introducing a new
 * shared-mutable counter just for cosmetic code formatting. */
async function generateOrderCode(): Promise<string> {
  const year = formatJalali(new Date(), "YYYY");
  for (let attempt = 0; attempt < ORDER_CODE_MAX_ATTEMPTS; attempt++) {
    const suffix = Math.floor(10_000 + Math.random() * 90_000);
    const code = `PS-${year}-${suffix}`;
    const exists = await prisma.order.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new ApiError(500, "امکان تولید کد سفارش منحصربه‌فرد وجود ندارد");
}

/**
 * P6.S6: this is what the payment gateway redirects the real shopper's
 * browser to after they leave the payment page -- so it must be a real
 * page, not the API's own JSON `GET /payments/callback`. The result page's
 * client JS is the one that actually calls `GET /payments/callback`
 * (unchanged, still the one authoritative verify path) via fetch once it
 * lands. Reuses `env.CORS_ORIGINS[0]` as "the web app's own primary
 * origin" -- the same value already trusted to talk to this API, so no new
 * env var.
 */
function buildPaymentResultUrl(orderId: string): string {
  const webBaseUrl = env.CORS_ORIGINS[0];
  return `${webBaseUrl}/fa/checkout/result?orderId=${orderId}`;
}

export interface InitiateCheckoutResult {
  orderId: string;
  orderCode: string;
  redirectUrl: string;
}

/** Unwinds everything one failed attempt created. The payment row is
 * deleted before the order because its foreign key is `Restrict`; the
 * order's items and status history go with it, theirs being `Cascade`. */
async function rollback(orderId: string, paymentId: string): Promise<void> {
  await inventoryService.releaseReservationsByRefId(orderId);
  await prisma.payment.deleteMany({ where: { id: paymentId } });
  await prisma.order.deleteMany({ where: { id: orderId } });
}

/**
 * §3.6 Checkout, backend half: validates the cart, snapshots the chosen
 * address + shipping method onto a real Order, reserves stock, and hands
 * the caller a redirectUrl to the payment gateway.
 *
 * The order is written *before* stock is reserved, where the Mongo version
 * minted an ObjectId up front and wrote the order last. The reason is the
 * same one that reordered nothing else: a reservation's `refId` has to be a
 * real order id, and inventing an id for a row that does not exist yet is
 * only safe while nothing enforces that reference. The rollback path is
 * unchanged in effect -- every failure below unwinds the order, the payment
 * and any reservations already taken.
 *
 * The order and its payment row are created in one transaction. Under Mongo
 * they were two writes with nothing tying them together, so a crash between
 * them left an order that could never be paid.
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

  // The order's own name/sku snapshot. Read separately from the cart view
  // because CartItemView's `product` is already shaped for a shopper and
  // should not be re-parsed for internal use.
  const productIds = cart.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, nameFa: true, nameEn: true, sku: true },
  });
  if (products.length !== productIds.length) {
    throw new ApiError(409, "یکی از محصولات سبد خرید دیگر در دسترس نیست");
  }
  const productById = new Map(products.map((product) => [product.id, product]));

  const addressView = await addressesService.getOwnAddress(userId, input.addressId);
  const { options } = await shippingService.estimateShipping(userId, input.addressId, accountType);
  const shippingOption = options.find((option) => option.methodCode === input.shippingMethodCode);
  if (!shippingOption) {
    throw new ApiError(400, "روش ارسال انتخاب‌شده برای این سفارش در دسترس نیست");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  if (!user) {
    throw new ApiError(404, "کاربر یافت نشد");
  }

  // cartService.getCart({ userId }, ...) above already re-validated whatever
  // coupon is attached against this cart's own live subtotal -- including the
  // real perUserLimit check, since checkout always has a real userId (§3.6
  // "recomputed server-side at every step" is already satisfied by that call;
  // no separate re-derivation needed here).
  const subtotalRial = cart.subtotalRial;
  const discountRial = cart.discountRial;
  const shippingRial = shippingOption.priceRial;
  const totalRial = subtotalRial - discountRial + shippingRial;
  const code = await generateOrderCode();

  const { order, payment } = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        code,
        userId,
        subtotalRial,
        discountRial,
        ...(cart.couponCode ? { couponCode: cart.couponCode } : {}),
        shippingRial,
        taxRial: 0,
        totalRial,
        addrProvinceFa: addressView.province.name.fa,
        addrProvinceEn: addressView.province.name.en,
        addrCityFa: addressView.city.name.fa,
        addrCityEn: addressView.city.name.en,
        addrLine: addressView.line,
        addrPostalCode: addressView.postalCode,
        addrPlate: addressView.plate ?? null,
        addrUnit: addressView.unit ?? null,
        addrReceiverName: addressView.receiverName,
        addrReceiverPhone: addressView.receiverPhone,
        shipMethodCode: shippingOption.methodCode,
        shipMethodFa: shippingOption.name.fa,
        shipMethodEn: shippingOption.name.en,
        shipPriceRial: shippingOption.priceRial,
        status: "pending",
        notes: input.notes ?? null,
        items: {
          create: cart.items.map((item) => {
            const product = productById.get(item.productId)!;
            return {
              productId: item.productId,
              variantId: item.variantId ?? null,
              variantNameFaSnapshot: item.variant?.name.fa ?? null,
              variantNameEnSnapshot: item.variant?.name.en ?? null,
              nameFaSnapshot: product.nameFa,
              nameEnSnapshot: product.nameEn,
              skuSnapshot: product.sku,
              qty: item.qty,
              // The effective (tier-resolved) unit price this cart already
              // computed server-side -- never re-derived here, matching §3.6
              // "cart totals recomputed server-side at every step."
              priceRial: item.lineTotalRial / item.qty,
            };
          }),
        },
        statusHistory: { create: [{ status: "pending" }] },
      },
    });
    const createdPayment = await tx.payment.create({
      data: {
        orderId: created.id,
        provider: env.PAYMENT_PROVIDER,
        amountRial: totalRial,
        status: "initiated",
      },
    });
    return { order: created, payment: createdPayment };
  });

  // Sequential, not Promise.all -- reserveStock's own guard can legitimately
  // reject mid-loop (a concurrent checkout raced the last unit), and the
  // rollback needs to release exactly the reservations already taken.
  try {
    for (const item of cart.items) {
      await inventoryService.reserveStock(
        item.productId,
        item.qty,
        CHECKOUT_RESERVATION_TTL_MS,
        order.id,
        item.variantId,
      );
    }
  } catch (err) {
    await rollback(order.id, payment.id);
    throw err instanceof ApiError ? err : new ApiError(409, "موجودی برخی اقلام سبد خرید کافی نیست");
  }

  try {
    const result = await paymentProvider.initiate({
      amountRial: totalRial,
      callbackUrl: buildPaymentResultUrl(order.id),
      description: `پرداخت سفارش ${code}`,
      mobile: user.phone,
      orderId: order.id,
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { authority: result.authority },
    });
    return { orderId: order.id, orderCode: code, redirectUrl: result.redirectUrl };
  } catch {
    // A real transport-layer failure (network/gateway down), not a business
    // decline -- those only ever surface later, at verify time, via
    // modules/payments.
    await rollback(order.id, payment.id);
    throw new ApiError(502, "شروع فرآیند پرداخت با خطا مواجه شد، دوباره تلاش کنید");
  }
}

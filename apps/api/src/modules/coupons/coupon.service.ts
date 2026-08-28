import type { Coupon } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

export type { Coupon };

/** Real coupon codes are conventionally case-insensitive -- callers
 * normalize before every read or write (a script creates them
 * uppercased, this normalizes whatever a shopper types), rather than a
 * case-insensitive index/collation. */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function findCouponByCode(code: string): Promise<Coupon | null> {
  return prisma.coupon.findUnique({ where: { code: normalizeCouponCode(code) } });
}

/** percent: value is 0-100 (percentage points), capped by
 * maxDiscountRial if set. fixed: value is a Rial amount, capped at the
 * subtotal itself so a discount can never exceed (let alone go
 * negative past) what's actually being bought. */
export function computeDiscountRial(coupon: Coupon, subtotalRial: number): number {
  if (coupon.type === "percent") {
    const raw = Math.floor((subtotalRial * coupon.value) / 100);
    return coupon.maxDiscountRial != null ? Math.min(raw, coupon.maxDiscountRial) : raw;
  }
  return Math.min(coupon.value, subtotalRial);
}

// Orders that count as a real redemption for usageLimit/perUserLimit
// purposes -- deliberately excludes "pending" (payment not yet settled;
// an abandoned checkout attempt must not permanently burn a limited-use
// code) and "cancelled"/"refunded". Mirrors exactly which Order statuses
// modules/payments' success branch actually increments Coupon.usedCount
// for -- the two must stay in lockstep, or usedCount and this count-based
// perUserLimit check would disagree with each other.
const REDEEMED_ORDER_STATUSES = ["paid", "processing", "shipped", "delivered"] as const;

/**
 * Every real validation a coupon must pass before its discount applies --
 * called both when a shopper first applies a code to their cart and
 * again, authoritatively, at checkout initiation (§3.6: "cart totals
 * recomputed server-side at every step" -- a coupon valid at apply-time
 * might not still be by the time checkout actually happens: expired,
 * exhausted, or the cart's own subtotal dropped below the minimum).
 * Returns a human Persian reason string on failure rather than throwing,
 * so a live cart re-check can surface it as a soft "couponIssue" hint
 * instead of a hard error that would break an otherwise-normal cart view.
 */
export async function validateCoupon(
  coupon: Coupon,
  subtotalRial: number,
  userId?: string,
): Promise<string | null> {
  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) {
    return "این کد تخفیف هنوز فعال نشده است";
  }
  if (coupon.endsAt && now > coupon.endsAt) {
    return "این کد تخفیف منقضی شده است";
  }
  if (coupon.minSubtotalRial != null && subtotalRial < coupon.minSubtotalRial) {
    return "مبلغ سبد خرید برای استفاده از این کد کافی نیست";
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return "ظرفیت استفاده از این کد تخفیف تمام شده است";
  }
  if (userId && coupon.perUserLimit != null) {
    const usedByUser = await prisma.order.count({
      where: {
        userId,
        couponCode: coupon.code,
        status: { in: [...REDEEMED_ORDER_STATUSES] },
      },
    });
    if (usedByUser >= coupon.perUserLimit) {
      return "شما قبلاً از این کد تخفیف استفاده کرده‌اید";
    }
  }
  return null;
}

/** Called only from modules/payments' success branch, only when the
 * order actually carried a coupon -- a cancelled/failed payment must
 * never consume a limited-use redemption. */
export async function incrementCouponUsage(code: string): Promise<void> {
  await prisma.coupon.updateMany({
    where: { code: normalizeCouponCode(code) },
    data: { usedCount: { increment: 1 } },
  });
}

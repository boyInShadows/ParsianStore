import { Schema, model, type Model } from "mongoose";
import {
  applyBasePlugins,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

// P6.S7 §3.2. Codes are stored/looked-up uppercased (real coupon codes
// are conventionally case-insensitive) -- callers normalize before every
// read or write, matching normalizePhone/normalizePostalCode's own
// "normalize at the boundary" convention rather than a case-insensitive
// index/collation.
export const COUPON_TYPES = ["percent", "fixed"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export interface Coupon extends WithTimestamps, WithSoftDelete {
  code: string;
  type: CouponType;
  // percent: 0-100 (percentage points). fixed: a Rial amount.
  value: number;
  minSubtotalRial?: number;
  // Caps a percent-type discount; meaningless (ignored) for fixed.
  maxDiscountRial?: number;
  // Total redemptions across every shopper; undefined = unlimited.
  usageLimit?: number;
  usedCount: number;
  // Per-shopper redemption cap; undefined = unlimited. Only enforceable
  // for a real signed-in user (checkout is auth-only anyway, P6.S2) --
  // meaningless for a guest cart's anonId.
  perUserLimit?: number;
  startsAt?: Date;
  endsAt?: Date;
  // §3.2 names this field for a future category/brand/product scoping
  // rule -- no such rule is defined or needed yet. Reserved and never
  // populated by anything this step builds, same "documented but
  // presently unused" precedent Order.taxRial already established.
  scope?: Record<string, unknown>;
}

type CouponModelType = Model<Coupon, object, SoftDeleteMethods>;

const couponSchema = new Schema<Coupon, CouponModelType, SoftDeleteMethods>({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: COUPON_TYPES, required: true },
  value: { type: Number, required: true, min: 0 },
  minSubtotalRial: { type: Number, min: 0 },
  maxDiscountRial: { type: Number, min: 0 },
  usageLimit: { type: Number, min: 1 },
  usedCount: { type: Number, required: true, default: 0, min: 0 },
  perUserLimit: { type: Number, min: 1 },
  startsAt: { type: Date },
  endsAt: { type: Date },
  scope: { type: Schema.Types.Mixed },
});

applyBasePlugins(couponSchema);

export const CouponModel = model<Coupon, CouponModelType>("Coupon", couponSchema);

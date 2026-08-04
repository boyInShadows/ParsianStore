import { z } from "zod";

// P8.S3: admin-only coupon CRUD -- its own file, not appended to cart.ts
// or order.ts (which every shop route already imports), per the real
// bundle-budget lesson P8.S1's ADR documents and admin-product.ts
// already follows.

export const COUPON_TYPES = ["percent", "fixed"] as const;
export const couponTypeSchema = z.enum(COUPON_TYPES);
export type CouponTypeDto = z.infer<typeof couponTypeSchema>;

const PERCENT_MAX = 100;

// The code is uppercased server-side before it ever reaches the model
// (Coupon.code is `unique` but MongoDB's index is case-SENSITIVE, so
// "SALE10" and "sale10" would both insert and only one would ever be
// findable by coupon.service.ts's own normalizeCouponCode()). The
// pattern below rejects the ambiguity at the edge rather than silently
// transforming what the admin typed.
const couponCodeSchema = z
  .string()
  .min(3, "کد تخفیف باید حداقل ۳ نویسه باشد")
  .max(32, "کد تخفیف نمی‌تواند بیش از ۳۲ نویسه باشد")
  .regex(/^[A-Za-z0-9-]+$/, "کد تخفیف فقط می‌تواند شامل حروف انگلیسی، عدد و خط تیره باشد");

// startsAt/endsAt travel as ISO strings on the wire (CLAUDE.md §9: dates
// are stored UTC ISO, never a Jalali string) and are coerced to Date at
// the service boundary.
const isoDate = z.string().datetime({ offset: true });

const couponBaseSchema = z.object({
  code: couponCodeSchema,
  type: couponTypeSchema,
  value: z.number().min(0, "مقدار تخفیف نمی‌تواند منفی باشد"),
  minSubtotalRial: z.number().int().min(0).optional(),
  maxDiscountRial: z.number().int().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1).optional(),
  startsAt: isoDate.optional(),
  endsAt: isoDate.optional(),
});

// Cross-field rules the createCoupon script never enforced -- it accepted
// `percent 500` and an `endsAt` before `startsAt` without complaint, both
// of which then misbehave silently in coupon.service.ts's own math.
export interface CouponRuleFields {
  type?: CouponTypeDto;
  value?: number;
  startsAt?: string;
  endsAt?: string;
}

export function isPercentWithinRange(input: CouponRuleFields): boolean {
  return input.type !== "percent" || input.value === undefined || input.value <= PERCENT_MAX;
}

export function isDateRangeOrdered(input: CouponRuleFields): boolean {
  if (!input.startsAt || !input.endsAt) return true;
  return new Date(input.startsAt) < new Date(input.endsAt);
}

export const PERCENT_RANGE_MESSAGE = "درصد تخفیف نمی‌تواند بیش از ۱۰۰ باشد";
export const DATE_ORDER_MESSAGE = "تاریخ پایان باید پس از تاریخ شروع باشد";

export const adminCreateCouponInputSchema = couponBaseSchema
  .refine(isPercentWithinRange, { message: PERCENT_RANGE_MESSAGE, path: ["value"] })
  .refine(isDateRangeOrdered, { message: DATE_ORDER_MESSAGE, path: ["endsAt"] });
export type AdminCreateCouponInput = z.infer<typeof adminCreateCouponInputSchema>;

// `code` stays editable: a coupon that has never been redeemed is often
// created with a typo, and usedCount/order snapshots keep their own copy
// of the code, so renaming one does not rewrite history.
//
// No `.refine()` here, deliberately: on a PATCH the body alone is not
// enough to judge either rule -- `{value: 500}` is only invalid if the
// *stored* coupon is a percent one, and `{endsAt}` must be compared
// against the stored `startsAt`. Both are enforced in
// coupons.admin.service.ts against the merged document instead, where
// the full picture actually exists.
export const adminUpdateCouponInputSchema = couponBaseSchema.partial();
export type AdminUpdateCouponInput = z.infer<typeof adminUpdateCouponInputSchema>;

export const adminCouponSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: couponTypeSchema,
  value: z.number(),
  minSubtotalRial: z.number().optional(),
  maxDiscountRial: z.number().optional(),
  usageLimit: z.number().optional(),
  usedCount: z.number(),
  perUserLimit: z.number().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  createdAt: z.string(),
});
export type AdminCouponDto = z.infer<typeof adminCouponSchema>;

const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const adminCouponListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(adminCouponSchema),
  meta: paginationMetaSchema,
});

export const adminCouponDetailResponseSchema = z.object({
  ok: z.literal(true),
  data: adminCouponSchema,
});

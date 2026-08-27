import { z } from "zod";
import {
  adminCreateCouponInputSchema,
  adminUpdateCouponInputSchema,
  couponTypeSchema,
} from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";
import { idSchema } from "schemas";

// The shared UUID id schema; see packages/schemas/src/id.ts.
const objectId = idSchema;

export const adminCouponIdParamSchema = z.object({ id: objectId });
export type AdminCouponIdParam = z.infer<typeof adminCouponIdParamSchema>;

// `active` is a derived filter, not a stored field -- Coupon has no
// status column (see coupons.admin.service.ts's own note on why
// deactivation is an endsAt transition rather than a new field).
export const adminCouponListQuerySchema = paginationQuerySchema.extend({
  type: couponTypeSchema.optional(),
  active: z.enum(["true", "false"]).optional(),
  code: z.string().optional(),
});
export type AdminCouponListQuery = z.infer<typeof adminCouponListQuerySchema>;

export const createCouponSchema = adminCreateCouponInputSchema;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;

export const updateCouponSchema = adminUpdateCouponInputSchema;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

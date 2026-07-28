import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

// Only the two reasons an admin can trigger directly through this
// endpoint — "reservation"/"reservation-released"/"reservation-confirmed"
// are system-internal lifecycle states inventory.service.ts writes itself,
// never something a manual form submission should be able to claim.
export const adjustStockSchema = z.object({
  productId: objectId,
  delta: z
    .number()
    .int()
    .refine((value) => value !== 0, "دلتا نمی‌تواند صفر باشد"),
  reason: z.enum(["manual-adjustment", "restock"]),
  refId: z.string().optional(),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const listLowStockQuerySchema = paginationQuerySchema;

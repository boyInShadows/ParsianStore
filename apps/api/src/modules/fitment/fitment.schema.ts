import { z } from "zod";
import { parseVehicleKey } from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");
const slugField = z.string().regex(/^[a-z0-9-]+$/, "نامک نامعتبر است");

// Parses the compact `?v=<vehicleKey>` string (packages/schemas) straight
// into its parts as part of Zod validation, so a malformed key is a
// uniform 400 through the same path every other validation error takes.
const vehicleKeyField = z.string().transform((value, ctx) => {
  try {
    return parseVehicleKey(value);
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "کلید خودرو نامعتبر است" });
    return z.NEVER;
  }
});

export const fitmentCheckQuerySchema = z.object({
  productId: objectId,
  vehicleKey: vehicleKeyField,
});
export type FitmentCheckQuery = z.infer<typeof fitmentCheckQuerySchema>;

export const fitmentProductsQuerySchema = paginationQuerySchema.extend({
  vehicleKey: vehicleKeyField,
  category: slugField.optional(),
});
export type FitmentProductsQuery = z.infer<typeof fitmentProductsQuerySchema>;

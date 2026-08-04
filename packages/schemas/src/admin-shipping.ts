import { z } from "zod";
import { SHIPPING_METHODS, SHIPPING_ZONES } from "./shipping.js";

// P8.S9: admin CRUD over the ShippingRate collection. Until now the only
// way to change a courier price was re-running seed/shipping.ts -- the
// ShippingRate model's own header says an admin UI is what these Rial
// amounts were waiting for.

export const SHIPPING_METHOD_CODES = SHIPPING_METHODS.map((method) => method.code) as [
  string,
  ...string[],
];

const weightGram = z.number().int("وزن باید عدد صحیح باشد").min(0, "وزن نمی‌تواند منفی باشد");

export const adminCreateShippingRateInputSchema = z
  .object({
    methodCode: z.enum(SHIPPING_METHOD_CODES),
    zone: z.enum(SHIPPING_ZONES),
    minWeightGram: weightGram,
    // null = the open-ended last bracket for this method+zone pair.
    maxWeightGram: weightGram.nullable(),
    // Rial, integer, never a float (CLAUDE.md rule 8).
    priceRial: z.number().int("قیمت باید عدد صحیح ریالی باشد").min(0, "قیمت نمی‌تواند منفی باشد"),
  })
  .refine((input) => input.maxWeightGram === null || input.maxWeightGram > input.minWeightGram, {
    message: "بیشینه وزن باید از کمینه بزرگ‌تر باشد",
    path: ["maxWeightGram"],
  })
  .refine(
    (input) => {
      // "پیک درون‌شهری" only runs inside Tehran (shipping.ts's own zones
      // tuple). Without this a rate could be saved that estimateShipping
      // would silently never match -- a row that looks configured and does
      // nothing.
      const method = SHIPPING_METHODS.find((entry) => entry.code === input.methodCode);
      return method ? (method.zones as readonly string[]).includes(input.zone) : false;
    },
    { message: "این روش ارسال در این منطقه سرویس نمی‌دهد", path: ["zone"] },
  );
export type AdminCreateShippingRateInput = z.infer<typeof adminCreateShippingRateInputSchema>;

// Not `.partial()` on the object above: a ZodEffects (the two refines)
// has no `.partial()`. An edit re-sends the whole bracket, which is also
// what the form does -- the overlap guard needs every field anyway.
export const adminUpdateShippingRateInputSchema = adminCreateShippingRateInputSchema;
export type AdminUpdateShippingRateInput = AdminCreateShippingRateInput;

export const adminShippingRateSchema = z.object({
  id: z.string(),
  methodCode: z.string(),
  // Derived from SHIPPING_METHODS, not stored -- the UI must never map
  // courier codes to Persian labels for itself.
  methodName: z.object({ fa: z.string(), en: z.string() }),
  zone: z.enum(SHIPPING_ZONES),
  minWeightGram: z.number(),
  maxWeightGram: z.number().nullable(),
  priceRial: z.number(),
  deletedAt: z.string().nullable(),
});
export type AdminShippingRateDto = z.infer<typeof adminShippingRateSchema>;

const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const adminShippingRateListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(adminShippingRateSchema),
  meta: paginationMetaSchema,
});

export const adminShippingRateDetailResponseSchema = z.object({
  ok: z.literal(true),
  data: adminShippingRateSchema,
});

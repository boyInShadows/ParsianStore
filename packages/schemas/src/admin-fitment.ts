import { z } from "zod";
import { idSchema } from "./id.js";

// P8.S6: the Fitment Manager (§3.7). Fitment records have existed since
// P2.S6 and are what /fitment/check and the vehicle-filtered PLP run on,
// but nothing has ever been able to create or correct one outside a seed
// script.

// The shared UUID id schema; see packages/schemas/src/id.ts.
const objectId = idSchema;

const modelYear = z
  .number()
  .int("سال باید عدد صحیح باشد")
  .min(1900, "سال میلادی وارد کنید، نه شمسی")
  .max(2100, "سال معتبر نیست");

export const ADMIN_FITMENT_CONFIDENCES = ["exact", "likely", "check"] as const;
export const adminFitmentConfidenceSchema = z.enum(ADMIN_FITMENT_CONFIDENCES);
export type AdminFitmentConfidenceDto = z.infer<typeof adminFitmentConfidenceSchema>;

export const adminCreateFitmentInputSchema = z
  .object({
    productId: objectId,
    makeId: objectId,
    modelId: objectId,
    // Omitted = applies across every generation of the model within the
    // year range. Real data for a supplier who only knows "fits Pride
    // 2005-2010" (Fitment's own model comment).
    genId: objectId.optional(),
    // Omitted = applies regardless of engine variant.
    engineId: objectId.optional(),
    yearFrom: modelYear,
    // null = still fits the current production run.
    yearTo: modelYear.nullable(),
    note: z.string().optional(),
    confidence: adminFitmentConfidenceSchema,
  })
  .refine((input) => input.yearTo === null || input.yearTo >= input.yearFrom, {
    message: "سال پایان نمی‌تواند پیش از سال شروع باشد",
    path: ["yearTo"],
  })
  .refine((input) => !(input.engineId && !input.genId), {
    // An engine belongs to a generation, so an engine-scoped record with
    // no generation describes a vehicle that cannot be expressed -- and
    // fitment.service.ts's matcher would treat it as applying to every
    // generation, which is not what whoever chose the engine meant.
    message: "برای انتخاب موتور، نسل خودرو هم باید مشخص شود",
    path: ["engineId"],
  });
export type AdminCreateFitmentInput = z.infer<typeof adminCreateFitmentInputSchema>;

export const adminFitmentSchema = z.object({
  id: z.string(),
  productId: z.string(),
  // Resolved names, so the list is readable without a request per row.
  productName: z.string(),
  productSku: z.string(),
  makeId: z.string(),
  makeName: z.string(),
  modelId: z.string(),
  modelName: z.string(),
  genId: z.string().optional(),
  genName: z.string().optional(),
  engineId: z.string().optional(),
  engineCode: z.string().optional(),
  yearFrom: z.number(),
  yearTo: z.number().nullable(),
  note: z.string().optional(),
  confidence: adminFitmentConfidenceSchema,
  deletedAt: z.string().nullable(),
});
export type AdminFitmentDto = z.infer<typeof adminFitmentSchema>;

const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const adminFitmentListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(adminFitmentSchema),
  meta: paginationMetaSchema,
});

export const adminFitmentDetailResponseSchema = z.object({
  ok: z.literal(true),
  data: adminFitmentSchema,
});

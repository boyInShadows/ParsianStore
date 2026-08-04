import { z } from "zod";

// P8.S6: admin CRUD over the four vehicle collections. Own file, same
// bundle-budget reasoning as every other admin-*.ts schema -- vehicles.ts
// stays the shop-facing read shape and is not extended here.

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

const localizedNameSchema = z.object({
  fa: z.string().min(1, "نام فارسی الزامی است"),
  en: z.string().min(1, "نام انگلیسی الزامی است"),
});

const slugField = z
  .string()
  .min(1, "نامک الزامی است")
  .regex(/^[a-z0-9-]+$/, "نامک باید فقط شامل حروف انگلیسی کوچک، عدد و خط تیره باشد");

// Gregorian, matching how VehicleGen/Fitment already store years. The
// lower bound is not decorative: a Jalali year (1404) typed into a
// Gregorian field is the single most likely data-entry mistake on this
// screen, and it would silently make every fitment check fail.
const modelYear = z
  .number()
  .int("سال باید عدد صحیح باشد")
  .min(1900, "سال میلادی وارد کنید، نه شمسی")
  .max(2100, "سال معتبر نیست");

export const BODY_TYPES = ["sedan", "hatchback", "liftback", "pickup", "crossover"] as const;
export type BodyTypeDto = (typeof BODY_TYPES)[number];

export const FUEL_TYPES = ["petrol", "cng"] as const;
export type FuelTypeDto = (typeof FUEL_TYPES)[number];

// --- Make -----------------------------------------------------------------

export const adminCreateVehicleMakeInputSchema = z.object({
  name: localizedNameSchema,
  slug: slugField,
  logo: z.string().optional(),
  country: z.string().min(1, "کشور الزامی است"),
  isDomestic: z.boolean().optional(),
});
export type AdminCreateVehicleMakeInput = z.infer<typeof adminCreateVehicleMakeInputSchema>;

export const adminVehicleMakeSchema = z.object({
  id: z.string(),
  name: z.object({ fa: z.string(), en: z.string() }),
  slug: z.string(),
  logo: z.string().optional(),
  country: z.string(),
  isDomestic: z.boolean(),
  // Derived, not stored -- without them the delete button is
  // guess-and-fail, since deletion is refused for a make still in use.
  modelCount: z.number(),
  fitmentCount: z.number(),
  deletedAt: z.string().nullable(),
});
export type AdminVehicleMakeDto = z.infer<typeof adminVehicleMakeSchema>;

// --- Model ----------------------------------------------------------------

export const adminCreateVehicleModelInputSchema = z.object({
  makeId: objectId,
  name: localizedNameSchema,
  slug: slugField,
  bodyType: z.enum(BODY_TYPES),
});
export type AdminCreateVehicleModelInput = z.infer<typeof adminCreateVehicleModelInputSchema>;

export const adminVehicleModelSchema = z.object({
  id: z.string(),
  makeId: z.string(),
  name: z.object({ fa: z.string(), en: z.string() }),
  slug: z.string(),
  bodyType: z.enum(BODY_TYPES),
  generationCount: z.number(),
  fitmentCount: z.number(),
  deletedAt: z.string().nullable(),
});
export type AdminVehicleModelDto = z.infer<typeof adminVehicleModelSchema>;

// --- Generation -----------------------------------------------------------

export const adminCreateVehicleGenInputSchema = z
  .object({
    modelId: objectId,
    name: localizedNameSchema,
    yearFrom: modelYear,
    // null = still in production.
    yearTo: modelYear.nullable(),
    facelift: z.boolean().optional(),
  })
  .refine((input) => input.yearTo === null || input.yearTo >= input.yearFrom, {
    message: "سال پایان نمی‌تواند پیش از سال شروع باشد",
    path: ["yearTo"],
  });
export type AdminCreateVehicleGenInput = z.infer<typeof adminCreateVehicleGenInputSchema>;

export const adminVehicleGenSchema = z.object({
  id: z.string(),
  modelId: z.string(),
  name: z.object({ fa: z.string(), en: z.string() }),
  yearFrom: z.number(),
  yearTo: z.number().nullable(),
  facelift: z.boolean(),
  engineCount: z.number(),
  fitmentCount: z.number(),
  deletedAt: z.string().nullable(),
});
export type AdminVehicleGenDto = z.infer<typeof adminVehicleGenSchema>;

// --- Engine ---------------------------------------------------------------

export const adminCreateVehicleEngineInputSchema = z.object({
  genId: objectId,
  code: z.string().min(1, "کد موتور الزامی است"),
  // Liters (1.5), not cc -- matches VehicleEngine's own field comment and
  // how the domain refers to these everywhere else.
  displacement: z.number().positive("حجم موتور باید بزرگ‌تر از صفر باشد"),
  fuel: z.enum(FUEL_TYPES),
  power: z.number().int("قدرت باید عدد صحیح باشد").positive("قدرت باید بزرگ‌تر از صفر باشد"),
});
export type AdminCreateVehicleEngineInput = z.infer<typeof adminCreateVehicleEngineInputSchema>;

export const adminVehicleEngineSchema = z.object({
  id: z.string(),
  genId: z.string(),
  code: z.string(),
  displacement: z.number(),
  fuel: z.enum(FUEL_TYPES),
  power: z.number(),
  fitmentCount: z.number(),
  deletedAt: z.string().nullable(),
});
export type AdminVehicleEngineDto = z.infer<typeof adminVehicleEngineSchema>;

// --- Envelopes ------------------------------------------------------------

const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

function listResponse<T extends z.ZodTypeAny>(item: T) {
  return z.object({ ok: z.literal(true), data: z.array(item), meta: paginationMetaSchema });
}
function detailResponse<T extends z.ZodTypeAny>(item: T) {
  return z.object({ ok: z.literal(true), data: item });
}

export const adminVehicleMakeListResponseSchema = listResponse(adminVehicleMakeSchema);
export const adminVehicleMakeDetailResponseSchema = detailResponse(adminVehicleMakeSchema);
export const adminVehicleModelListResponseSchema = listResponse(adminVehicleModelSchema);
export const adminVehicleModelDetailResponseSchema = detailResponse(adminVehicleModelSchema);
export const adminVehicleGenListResponseSchema = listResponse(adminVehicleGenSchema);
export const adminVehicleGenDetailResponseSchema = detailResponse(adminVehicleGenSchema);
export const adminVehicleEngineListResponseSchema = listResponse(adminVehicleEngineSchema);
export const adminVehicleEngineDetailResponseSchema = detailResponse(adminVehicleEngineSchema);

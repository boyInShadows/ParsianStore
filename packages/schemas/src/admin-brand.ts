import { z } from "zod";

// P8.S4: admin-only brand CRUD -- its own file, never appended to
// brands.ts, same bundle reasoning as admin-category.ts.

const localizedNameSchema = z.object({
  fa: z.string().min(1, "نام فارسی الزامی است"),
  en: z.string().min(1, "نام انگلیسی الزامی است"),
});
const slugField = z
  .string()
  .min(1, "نامک الزامی است")
  .regex(/^[a-z0-9-]+$/, "نامک باید فقط شامل حروف انگلیسی کوچک، عدد و خط تیره باشد");
const seoField = z
  .object({ title: z.string().optional(), description: z.string().optional() })
  .optional();

export const adminCreateBrandInputSchema = z.object({
  name: localizedNameSchema,
  slug: slugField,
  logo: z.string().optional(),
  country: z.string().min(1, "کشور الزامی است"),
  isOEM: z.boolean().optional(),
  description: z.string().optional(),
  seo: seoField,
});
export type AdminCreateBrandInput = z.infer<typeof adminCreateBrandInputSchema>;

export const adminUpdateBrandInputSchema = adminCreateBrandInputSchema.partial();
export type AdminUpdateBrandInput = z.infer<typeof adminUpdateBrandInputSchema>;

export const adminBrandSchema = z.object({
  id: z.string(),
  name: z.object({ fa: z.string(), en: z.string() }),
  slug: z.string(),
  logo: z.string().optional(),
  country: z.string(),
  isOEM: z.boolean(),
  description: z.string().optional(),
  seo: z.object({ title: z.string().optional(), description: z.string().optional() }).optional(),
  // Derived, not stored: how many live products point at this brand. Without
  // it the delete button is guess-and-fail, since deletion is refused for a
  // brand still in use.
  productCount: z.number(),
  deletedAt: z.string().nullable(),
});
export type AdminBrandDto = z.infer<typeof adminBrandSchema>;

const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const adminBrandListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(adminBrandSchema),
  meta: paginationMetaSchema,
});

export const adminBrandDetailResponseSchema = z.object({
  ok: z.literal(true),
  data: adminBrandSchema,
});

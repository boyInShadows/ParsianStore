import { z } from "zod";
import { CATALOG_SYSTEM_CODES } from "./catalogSystems.js";
import { idSchema } from "./id.js";

// P8.S4: admin-only category CRUD -- its own file, never appended to
// categories.ts, for the same reason admin-product.ts is its own file
// (P8.S1's measured bundle regression): the shop's PLP imports
// categories.ts, and this package has no compiled build step, so Next
// tree-shakes it at file granularity, not per export.

const localizedNameSchema = z.object({
  fa: z.string().min(1, "نام فارسی الزامی است"),
  en: z.string().min(1, "نام انگلیسی الزامی است"),
});
// The shared UUID id schema; see packages/schemas/src/id.ts.
const objectId = idSchema;
const slugField = z
  .string()
  .min(1, "نامک الزامی است")
  .regex(/^[a-z0-9-]+$/, "نامک باید فقط شامل حروف انگلیسی کوچک، عدد و خط تیره باشد");
const seoField = z
  .object({ title: z.string().optional(), description: z.string().optional() })
  .optional();

export const adminCreateCategoryInputSchema = z.object({
  name: localizedNameSchema,
  slug: slugField,
  parentId: objectId.optional(),
  systemCode: z.enum(CATALOG_SYSTEM_CODES),
  icon: z.string().optional(),
  order: z.number().int().optional(),
  seo: seoField,
});
export type AdminCreateCategoryInput = z.infer<typeof adminCreateCategoryInputSchema>;

export const adminUpdateCategoryInputSchema = adminCreateCategoryInputSchema.partial();
export type AdminUpdateCategoryInput = z.infer<typeof adminUpdateCategoryInputSchema>;

// `depth`, `ancestorNames`, `productCount` and `childCount` are derived
// server-side, not stored. `path` holds ancestor *slugs* (see Category.ts),
// which are useless as a breadcrumb label, so the service resolves them to
// Persian names in one batched query per page -- never .populate(), matching
// getProductDetailBySlug's own precedent.
export const adminCategorySchema = z.object({
  id: z.string(),
  name: z.object({ fa: z.string(), en: z.string() }),
  slug: z.string(),
  parentId: z.string().nullable(),
  systemCode: z.string(),
  icon: z.string().optional(),
  order: z.number(),
  path: z.array(z.string()),
  seo: z.object({ title: z.string().optional(), description: z.string().optional() }).optional(),
  depth: z.number(),
  ancestorNames: z.array(z.string()),
  productCount: z.number(),
  childCount: z.number(),
  deletedAt: z.string().nullable(),
});
export type AdminCategoryDto = z.infer<typeof adminCategorySchema>;

const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const adminCategoryListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(adminCategorySchema),
  meta: paginationMetaSchema,
});

export const adminCategoryDetailResponseSchema = z.object({
  ok: z.literal(true),
  data: adminCategorySchema,
});

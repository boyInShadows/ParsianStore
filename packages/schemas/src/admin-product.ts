import { z } from "zod";
import { SUPPLY_ROUTES } from "./products.js";
import { idSchema } from "./id.js";

// P8.S2: admin-only product CRUD -- deliberately its own file, not
// appended to products.ts, per the real bundle-budget lesson P8.S1's
// own ADR documents (every shop route importing anything from
// products.ts would otherwise pull these admin-only schemas in too,
// since this package has no compiled build step and Next's bundler
// tree-shakes at the file level, not per-export).

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export const productStatusSchema = z.enum(PRODUCT_STATUSES);
export type ProductStatusDto = z.infer<typeof productStatusSchema>;

const localizedNameSchema = z.object({ fa: z.string(), en: z.string() });
// The shared UUID id schema; see packages/schemas/src/id.ts.
const objectId = idSchema;
const productVariantInputSchema = z.object({
  name: localizedNameSchema,
  sku: z.string().min(1),
  priceRial: z.number().int().min(0),
  wholesalePriceRial: z.number().int().min(0).optional(),
  stock: z.number().int().min(0),
});

// Essential fields only (owner-confirmed scope, P8.S2) -- dimensions,
// warranty, and SEO get real, honest server-side defaults on create
// rather than crowding this form; a future admin step can add them if
// editing those fields turns out to be needed often. Media/variants
// stay entirely out of scope -- no upload path or variant model exists
// yet (see docs/decisions/0021-p8s2-admin-products.md).
export const adminCreateProductInputSchema = z.object({
  name: localizedNameSchema,
  slug: z
    .string()
    .min(1, "نامک الزامی است")
    .regex(/^[a-z0-9-]+$/, "نامک باید فقط شامل حروف انگلیسی کوچک، عدد و خط تیره باشد"),
  sku: z.string().min(1, "کد کالا الزامی است"),
  brandId: objectId,
  categoryId: objectId,
  priceRial: z.number().int().min(0),
  wholesalePriceRial: z.number().int().min(0).optional(),
  compareAtRial: z.number().int().min(0).optional(),
  taxRate: z.number().min(0),
  stock: z.number().int().min(0),
  weightGram: z.number().min(0),
  authenticity: z.object({
    supplyRoute: z.enum(SUPPLY_ROUTES),
    sourceBrand: z.string().min(1, "برند منبع الزامی است"),
    countryOfManufacture: z.string().min(1, "کشور سازنده الزامی است"),
    verificationCode: z.string().min(1, "کد راستی‌آزمایی الزامی است"),
  }),
  status: productStatusSchema.optional(),
  // P8.S4. Added when the attribute dictionary got its own admin UI:
  // defining an attribute was inert until a product could carry a value for
  // it, which is what the PLP facets and PDP specs table have been reading
  // (and finding empty) since P5.S1. `key` must match a defined Attribute
  // and, for a select attribute, `value` must be one of its own options —
  // both enforced server-side in attributes.service.ts, which is the only
  // place that can see the dictionary.
  attributes: z.array(z.object({ key: z.string().min(1), value: z.string().min(1) })).optional(),
  variants: z.array(productVariantInputSchema).optional(),
});
export type AdminCreateProductInput = z.infer<typeof adminCreateProductInputSchema>;

export const adminUpdateProductInputSchema = adminCreateProductInputSchema.partial();
export type AdminUpdateProductInput = z.infer<typeof adminUpdateProductInputSchema>;

const adminAuthenticitySchema = z.object({
  supplyRoute: z.enum(SUPPLY_ROUTES),
  sourceBrand: z.string(),
  countryOfManufacture: z.string(),
  hologramCode: z.string().optional(),
  guideUrl: z.string().optional(),
  verificationCode: z.string(),
});

// The admin list/detail shape is deliberately the RAW essential fields
// (not routed through pricing.ts's toPublicProductJson -- that
// function resolves an effective price for a *shopper*; admin needs
// to see and edit both real numbers directly).
export const adminProductSummarySchema = z.object({
  id: z.string(),
  name: localizedNameSchema,
  slug: z.string(),
  sku: z.string(),
  priceRial: z.number(),
  stock: z.number(),
  lowStockAt: z.number(),
  status: productStatusSchema,
});
export type AdminProductSummaryDto = z.infer<typeof adminProductSummarySchema>;

export const adminProductDetailSchema = adminProductSummarySchema.extend({
  wholesalePriceRial: z.number().optional(),
  compareAtRial: z.number().optional(),
  taxRate: z.number(),
  weightGram: z.number(),
  brandId: z.string(),
  categoryId: z.string(),
  authenticity: adminAuthenticitySchema,
  attributes: z.array(z.object({ key: z.string(), value: z.string() })),
  media: z.array(z.string()),
  variants: z.array(productVariantInputSchema.extend({ id: z.string() })),
});
export type AdminProductDetailDto = z.infer<typeof adminProductDetailSchema>;

const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const adminProductListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(adminProductSummarySchema),
  meta: paginationMetaSchema,
});

export const adminProductDetailResponseSchema = z.object({
  ok: z.literal(true),
  data: adminProductDetailSchema,
});

// Mirrors apps/api's existing (P3.S6) POST /admin/inventory/adjust body
// -- that route already exists and works, this is just its wire schema
// for apps/web's new frontend consumer. Response reuses
// adminProductDetailResponseSchema: adjustStock returns the raw updated
// Product doc, a strict superset of the admin detail shape (Zod strips
// the rest -- dimensions/warranty/media/etc. -- same as every other
// schema in this codebase that validates a subset of a larger document).
export const adjustStockInputSchema = z.object({
  productId: objectId,
  delta: z
    .number()
    .int()
    .refine((value) => value !== 0, "دلتا نمی‌تواند صفر باشد"),
  reason: z.enum(["manual-adjustment", "restock"]),
  refId: z.string().optional(),
});
export type AdjustStockInput = z.infer<typeof adjustStockInputSchema>;

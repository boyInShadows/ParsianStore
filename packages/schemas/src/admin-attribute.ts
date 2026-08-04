import { z } from "zod";

// P8.S4: admin-only attribute CRUD -- its own file, same bundle reasoning
// as admin-category.ts. Attributes have no public route at all (§9), but
// the PLP's attribute facets and the PDP specs table both render their
// Persian `name` as a display label, so this dictionary is what makes
// Product.attributes[{key,value}] human-readable.

// Mirrors ATTRIBUTE_TYPES in apps/api/src/models/Attribute.ts. Duplicated
// across the package boundary the same way PRODUCT_STATUSES and
// SUPPLY_ROUTES already are; Attribute.test.ts asserts the two stay equal.
export const ATTRIBUTE_TYPES = ["select", "number", "bool", "text"] as const;
export const attributeTypeSchema = z.enum(ATTRIBUTE_TYPES);
export type AttributeTypeDto = z.infer<typeof attributeTypeSchema>;

const keyField = z
  .string()
  .min(1, "کلید الزامی است")
  .regex(/^[a-z][a-z0-9_]*$/, "کلید باید با حرف انگلیسی کوچک شروع شود");

export const adminCreateAttributeInputSchema = z
  .object({
    name: z.string().min(1, "نام الزامی است"),
    key: keyField,
    type: attributeTypeSchema,
    unit: z.string().optional(),
    options: z.array(z.string().min(1)).optional(),
  })
  // `options` is only meaningful for type "select" (Attribute.ts says so).
  // A select attribute with no options can never be assigned to a product,
  // so it is rejected here rather than accepted and silently unusable.
  .refine((input) => input.type !== "select" || (input.options?.length ?? 0) > 0, {
    message: "برای ویژگی چندگزینه‌ای حداقل یک گزینه لازم است",
    path: ["options"],
  });
export type AdminCreateAttributeInput = z.infer<typeof adminCreateAttributeInputSchema>;

// Not `.partial()` on the refined schema -- a ZodEffects has no .partial().
// The same select/options rule is re-checked in the service against the
// merged document, because a PATCH body alone genuinely cannot answer it
// (`{options: []}` is invalid only if the *stored* attribute is a select).
// Identical shape to P8.S3's coupon cross-field rules, same reasoning.
export const adminUpdateAttributeInputSchema = z.object({
  name: z.string().min(1, "نام الزامی است").optional(),
  key: keyField.optional(),
  type: attributeTypeSchema.optional(),
  unit: z.string().optional(),
  options: z.array(z.string().min(1)).optional(),
});
export type AdminUpdateAttributeInput = z.infer<typeof adminUpdateAttributeInputSchema>;

export const SELECT_NEEDS_OPTIONS_MESSAGE = "برای ویژگی چندگزینه‌ای حداقل یک گزینه لازم است";

/** Shared by the create schema above and the service's update path. */
export function isValidAttributeShape(input: {
  type: AttributeTypeDto;
  options?: string[];
}): boolean {
  return input.type !== "select" || (input.options?.length ?? 0) > 0;
}

export const adminAttributeSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  type: attributeTypeSchema,
  unit: z.string().optional(),
  options: z.array(z.string()),
  // Derived: how many live products carry this attribute's key. Drives both
  // the delete guard and the "is this dictionary entry actually used?"
  // question staff could not answer at all before this step.
  usageCount: z.number(),
  deletedAt: z.string().nullable(),
});
export type AdminAttributeDto = z.infer<typeof adminAttributeSchema>;

const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const adminAttributeListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(adminAttributeSchema),
  meta: paginationMetaSchema,
});

export const adminAttributeDetailResponseSchema = z.object({
  ok: z.literal(true),
  data: adminAttributeSchema,
});

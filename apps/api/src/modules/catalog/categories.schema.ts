import { z } from "zod";
import { CATALOG_SYSTEM_CODES } from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");
const slugField = z
  .string()
  .min(1, "نامک الزامی است")
  .regex(/^[a-z0-9-]+$/, "نامک باید فقط شامل حروف انگلیسی کوچک، عدد و خط تیره باشد");
const localizedNameField = z.object({
  fa: z.string().min(1, "نام فارسی الزامی است"),
  en: z.string().min(1, "نام انگلیسی الزامی است"),
});
const seoField = z
  .object({ title: z.string().optional(), description: z.string().optional() })
  .optional();

export const listCategoriesQuerySchema = paginationQuerySchema.extend({
  parentId: objectId.optional(),
});
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;

export const categoryIdParamSchema = z.object({ id: objectId });
export const categorySlugParamSchema = z.object({ slug: slugField });

export const createCategorySchema = z.object({
  name: localizedNameField,
  slug: slugField,
  parentId: objectId.optional(),
  systemCode: z.enum(CATALOG_SYSTEM_CODES),
  icon: z.string().optional(),
  order: z.number().int().optional(),
  seo: seoField,
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

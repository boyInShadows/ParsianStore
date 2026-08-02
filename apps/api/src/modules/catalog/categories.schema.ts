import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination.js";

// Shopper-facing only as of P8.S4. The admin create/update shapes moved to
// packages/schemas (admin-category.ts) so apps/web's new admin form validates
// against the exact same rules and Persian messages the API enforces —
// the same split products already had since P8.S2.
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");
const slugField = z
  .string()
  .min(1, "نامک الزامی است")
  .regex(/^[a-z0-9-]+$/, "نامک باید فقط شامل حروف انگلیسی کوچک، عدد و خط تیره باشد");

export const listCategoriesQuerySchema = paginationQuerySchema.extend({
  parentId: objectId.optional(),
});
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;

export const categorySlugParamSchema = z.object({ slug: slugField });

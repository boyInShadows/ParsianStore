import { z } from "zod";
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

export const listBrandsQuerySchema = paginationQuerySchema;

export const brandIdParamSchema = z.object({ id: objectId });
export const brandSlugParamSchema = z.object({ slug: slugField });

export const createBrandSchema = z.object({
  name: localizedNameField,
  slug: slugField,
  logo: z.string().optional(),
  country: z.string().min(1, "کشور الزامی است"),
  isOEM: z.boolean().optional(),
  description: z.string().optional(),
  seo: seoField,
});
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = createBrandSchema.partial();
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;

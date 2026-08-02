import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination.js";

// Shopper-facing only as of P8.S4 — the admin create/update shapes moved to
// packages/schemas (admin-brand.ts) so apps/web's form validates against the
// exact same rules and Persian messages the API enforces.
const slugField = z
  .string()
  .min(1, "نامک الزامی است")
  .regex(/^[a-z0-9-]+$/, "نامک باید فقط شامل حروف انگلیسی کوچک، عدد و خط تیره باشد");

export const listBrandsQuerySchema = paginationQuerySchema;

export const brandSlugParamSchema = z.object({ slug: slugField });

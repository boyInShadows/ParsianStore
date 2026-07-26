import { z } from "zod";
import { ATTRIBUTE_TYPES } from "../../models/Attribute.js";
import { paginationQuerySchema } from "../../utils/pagination.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");
const keyField = z
  .string()
  .min(1, "کلید الزامی است")
  .regex(/^[a-z][a-z0-9_]*$/, "کلید باید با حرف انگلیسی کوچک شروع شود");

export const listAttributesQuerySchema = paginationQuerySchema;

export const attributeIdParamSchema = z.object({ id: objectId });

export const createAttributeSchema = z.object({
  name: z.string().min(1, "نام الزامی است"),
  key: keyField,
  type: z.enum(ATTRIBUTE_TYPES),
  unit: z.string().optional(),
  options: z.array(z.string().min(1)).optional(),
});
export type CreateAttributeInput = z.infer<typeof createAttributeSchema>;

export const updateAttributeSchema = createAttributeSchema.partial();
export type UpdateAttributeInput = z.infer<typeof updateAttributeSchema>;

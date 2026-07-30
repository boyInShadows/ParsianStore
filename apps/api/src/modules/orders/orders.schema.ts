import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination.js";

export const listOrdersQuerySchema = paginationQuerySchema;

export const orderCodeParamSchema = z.object({
  code: z.string().min(1),
});
export type OrderCodeParam = z.infer<typeof orderCodeParamSchema>;

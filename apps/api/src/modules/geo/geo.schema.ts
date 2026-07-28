import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

export const listProvincesQuerySchema = paginationQuerySchema;

export const listCitiesQuerySchema = paginationQuerySchema.extend({
  provinceId: objectId.optional(),
});

export type ListCitiesQuery = z.infer<typeof listCitiesQuerySchema>;

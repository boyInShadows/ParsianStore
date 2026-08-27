import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination.js";
import { idSchema } from "schemas";

// The shared UUID id schema; see packages/schemas/src/id.ts.
const objectId = idSchema;

export const listProvincesQuerySchema = paginationQuerySchema;

export const listCitiesQuerySchema = paginationQuerySchema.extend({
  provinceId: objectId.optional(),
});

export type ListCitiesQuery = z.infer<typeof listCitiesQuerySchema>;

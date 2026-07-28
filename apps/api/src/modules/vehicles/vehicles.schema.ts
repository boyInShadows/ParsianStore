import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

export const listMakesQuerySchema = paginationQuerySchema;

export const listModelsQuerySchema = paginationQuerySchema.extend({
  makeId: objectId.optional(),
});

export const listGenerationsQuerySchema = paginationQuerySchema.extend({
  modelId: objectId.optional(),
});

export const listEnginesQuerySchema = paginationQuerySchema.extend({
  genId: objectId.optional(),
});

export type ListModelsQuery = z.infer<typeof listModelsQuerySchema>;
export type ListGenerationsQuery = z.infer<typeof listGenerationsQuerySchema>;
export type ListEnginesQuery = z.infer<typeof listEnginesQuerySchema>;

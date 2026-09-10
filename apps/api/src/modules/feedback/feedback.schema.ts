import { idSchema } from "schemas";
import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination.js";

export const productFeedbackParamSchema = z.object({
  productId: idSchema,
});
export type ProductFeedbackParam = z.infer<typeof productFeedbackParamSchema>;
export const feedbackListQuerySchema = paginationQuerySchema;
export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(2000),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export const createQuestionSchema = z.object({ body: z.string().trim().min(10).max(1000) });
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

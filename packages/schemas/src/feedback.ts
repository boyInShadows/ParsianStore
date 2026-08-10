import { z } from "zod";

const metaSchema = z.object({ total: z.number(), page: z.number(), limit: z.number() });
export const reviewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  authorName: z.string(),
  rating: z.number().min(1).max(5),
  title: z.string(),
  body: z.string(),
  verifiedPurchase: z.boolean(),
  createdAt: z.string(),
});
export type ReviewDto = z.infer<typeof reviewSchema>;
export const questionSchema = z.object({
  id: z.string(),
  productId: z.string(),
  authorName: z.string(),
  body: z.string(),
  answer: z.string().optional(),
  answeredAt: z.string().optional(),
  createdAt: z.string(),
});
export type QuestionDto = z.infer<typeof questionSchema>;
export const reviewsResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(reviewSchema),
  meta: metaSchema,
});
export const questionsResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(questionSchema),
  meta: metaSchema,
});
export const feedbackCreatedResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ id: z.string(), status: z.literal("pending") }),
});

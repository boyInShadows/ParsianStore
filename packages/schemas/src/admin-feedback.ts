import { z } from "zod";
export const moderationStatusSchema = z.enum(["pending", "approved", "rejected"]);
const base = z.object({
  id: z.string(),
  productId: z.string(),
  authorNameSnapshot: z.string(),
  body: z.string(),
  status: moderationStatusSchema,
  createdAt: z.string(),
});
export const adminReviewSchema = base.extend({
  rating: z.number(),
  title: z.string(),
  verifiedPurchase: z.boolean(),
});
export const adminQuestionSchema = base.extend({ answer: z.string().optional() });
export type AdminReviewDto = z.infer<typeof adminReviewSchema>;
export type AdminQuestionDto = z.infer<typeof adminQuestionSchema>;
const meta = z.object({ total: z.number(), page: z.number(), limit: z.number() });
export const adminReviewsResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(adminReviewSchema),
  meta,
});
export const adminQuestionsResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(adminQuestionSchema),
  meta,
});

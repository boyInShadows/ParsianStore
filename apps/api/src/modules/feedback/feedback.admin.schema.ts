import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination.js";
import { MODERATION_STATUSES } from "../../models/Review.js";
export const adminFeedbackListSchema = paginationQuerySchema.extend({
  status: z.enum(MODERATION_STATUSES).optional(),
});
export type AdminFeedbackListQuery = z.infer<typeof adminFeedbackListSchema>;
export const adminFeedbackIdSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });
export type AdminFeedbackId = z.infer<typeof adminFeedbackIdSchema>;
export const moderateFeedbackSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  answer: z.string().trim().min(2).max(2000).optional(),
});
export type ModerateFeedbackInput = z.infer<typeof moderateFeedbackSchema>;

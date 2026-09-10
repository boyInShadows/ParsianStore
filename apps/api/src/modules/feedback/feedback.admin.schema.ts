import { ModerationStatus } from "@prisma/client";
import { z } from "zod";
import { idSchema } from "schemas";
import { paginationQuerySchema } from "../../utils/pagination.js";

/** From Prisma's generated enum rather than a hand-kept array, so the query
 * filter cannot accept a status the column will not hold. */
const MODERATION_STATUSES = Object.values(ModerationStatus) as [
  ModerationStatus,
  ...ModerationStatus[],
];
export const adminFeedbackListSchema = paginationQuerySchema.extend({
  status: z.enum(MODERATION_STATUSES).optional(),
});
export type AdminFeedbackListQuery = z.infer<typeof adminFeedbackListSchema>;
// The shared UUID id schema. This route was missed by the sweep that
// replaced the 24-hex ObjectId check in 27 other files, because it spelled
// the regex out inline instead of importing the shared one -- so every
// moderation call would have been rejected with a 400 before reaching a
// handler.
export const adminFeedbackIdSchema = z.object({ id: idSchema });
export type AdminFeedbackId = z.infer<typeof adminFeedbackIdSchema>;
export const moderateFeedbackSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  answer: z.string().trim().min(2).max(2000).optional(),
});
export type ModerateFeedbackInput = z.infer<typeof moderateFeedbackSchema>;

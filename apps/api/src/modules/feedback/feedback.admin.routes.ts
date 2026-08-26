import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireStaff } from "../../middleware/rbac.js";
import { auditLog } from "../../middleware/auditLog.js";
import { validate, validateParams, validateQuery } from "../../middleware/validate.js";
import * as controller from "./feedback.admin.controller.js";
import {
  adminFeedbackIdSchema,
  adminFeedbackListSchema,
  moderateFeedbackSchema,
} from "./feedback.admin.schema.js";
export const adminFeedbackRouter = Router();
adminFeedbackRouter.use(requireAuth, requireStaff(), auditLog("feedback"));
adminFeedbackRouter.get("/reviews", validateQuery(adminFeedbackListSchema), controller.reviews);
adminFeedbackRouter.get("/questions", validateQuery(adminFeedbackListSchema), controller.questions);
adminFeedbackRouter.patch(
  "/reviews/:id",
  validateParams(adminFeedbackIdSchema),
  validate(moderateFeedbackSchema),
  controller.review,
);
adminFeedbackRouter.patch(
  "/questions/:id",
  validateParams(adminFeedbackIdSchema),
  validate(moderateFeedbackSchema),
  controller.question,
);

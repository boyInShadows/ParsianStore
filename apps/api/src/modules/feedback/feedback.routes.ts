import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate, validateParams, validateQuery } from "../../middleware/validate.js";
import * as controller from "./feedback.controller.js";
import {
  createQuestionSchema,
  createReviewSchema,
  feedbackListQuerySchema,
  productFeedbackParamSchema,
} from "./feedback.schema.js";

export const feedbackRouter = Router();
feedbackRouter.get(
  "/products/:productId/reviews",
  validateParams(productFeedbackParamSchema),
  validateQuery(feedbackListQuerySchema),
  controller.listReviews,
);
feedbackRouter.post(
  "/products/:productId/reviews",
  requireAuth,
  validateParams(productFeedbackParamSchema),
  validate(createReviewSchema),
  controller.createReview,
);
feedbackRouter.get(
  "/products/:productId/questions",
  validateParams(productFeedbackParamSchema),
  validateQuery(feedbackListQuerySchema),
  controller.listQuestions,
);
feedbackRouter.post(
  "/products/:productId/questions",
  requireAuth,
  validateParams(productFeedbackParamSchema),
  validate(createQuestionSchema),
  controller.createQuestion,
);

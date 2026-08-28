import type { NextFunction, Request, Response } from "express";
import type { PaginationQuery } from "../../utils/pagination.js";
import * as service from "./feedback.service.js";
import type {
  CreateQuestionInput,
  CreateReviewInput,
  ProductFeedbackParam,
} from "./feedback.schema.js";

/**
 * What a shopper is allowed to see of somebody else's review or question.
 *
 * Built by naming the fields to keep, where the Mongoose version deleted the
 * fields to hide from a `toObject()` copy. The inversion matters: a column
 * added to Review or Question later -- an internal note, a moderator's
 * comment -- is invisible here by default instead of being published until
 * somebody remembers to add another `delete`.
 */
function publicItem(item: {
  id: string;
  authorNameSnapshot: string;
  createdAt: Date;
  productId: string;
  rating?: number;
  title?: string;
  body: string;
  answer?: string | null;
  answeredAt?: Date | null;
  verifiedPurchase?: boolean;
}) {
  return {
    id: item.id,
    productId: item.productId,
    authorName: item.authorNameSnapshot,
    ...(item.rating === undefined ? {} : { rating: item.rating }),
    ...(item.title === undefined ? {} : { title: item.title }),
    body: item.body,
    ...(item.verifiedPurchase === undefined ? {} : { verifiedPurchase: item.verifiedPurchase }),
    ...(item.answer ? { answer: item.answer } : {}),
    ...(item.answeredAt ? { answeredAt: item.answeredAt } : {}),
    createdAt: item.createdAt,
  };
}
export async function listReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.listReviews(
      (req.params as unknown as ProductFeedbackParam).productId,
      req.validatedQuery as PaginationQuery,
    );
    res.json({ ok: true, data: result.data.map(publicItem), meta: result.meta });
  } catch (e) {
    next(e);
  }
}
export async function createReview(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.createReview(
      req.user!.sub,
      (req.params as unknown as ProductFeedbackParam).productId,
      req.body as CreateReviewInput,
    );
    res.status(201).json({ ok: true, data: { id: item.id, status: item.status } });
  } catch (e) {
    next(e);
  }
}
export async function listQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.listQuestions(
      (req.params as unknown as ProductFeedbackParam).productId,
      req.validatedQuery as PaginationQuery,
    );
    res.json({ ok: true, data: result.data.map(publicItem), meta: result.meta });
  } catch (e) {
    next(e);
  }
}
export async function createQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.createQuestion(
      req.user!.sub,
      (req.params as unknown as ProductFeedbackParam).productId,
      req.body as CreateQuestionInput,
    );
    res.status(201).json({ ok: true, data: { id: item.id, status: item.status } });
  } catch (e) {
    next(e);
  }
}

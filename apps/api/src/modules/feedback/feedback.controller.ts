import type { NextFunction, Request, Response } from "express";
import type { PaginationQuery } from "../../utils/pagination.js";
import * as service from "./feedback.service.js";
import type {
  CreateQuestionInput,
  CreateReviewInput,
  ProductFeedbackParam,
} from "./feedback.schema.js";

function publicItem(item: {
  _id: unknown;
  authorNameSnapshot: string;
  createdAt: Date;
  toObject(): Record<string, unknown>;
}) {
  const raw = item.toObject();
  delete raw.userId;
  delete raw.moderatedBy;
  delete raw.moderatedAt;
  delete raw.status;
  delete raw.deletedAt;
  return { ...raw, id: String(item._id), authorName: item.authorNameSnapshot };
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
    res.status(201).json({ ok: true, data: { id: item._id.toString(), status: item.status } });
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
    res.status(201).json({ ok: true, data: { id: item._id.toString(), status: item.status } });
  } catch (e) {
    next(e);
  }
}

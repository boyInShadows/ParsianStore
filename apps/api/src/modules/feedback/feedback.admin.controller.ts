import type { NextFunction, Request, Response } from "express";
import * as service from "./feedback.admin.service.js";
import type {
  AdminFeedbackId,
  AdminFeedbackListQuery,
  ModerateFeedbackInput,
} from "./feedback.admin.schema.js";
/** A row already carries a plain `id`, so this is the identity function the
 * Mongoose version could not be: it existed only to rename `_id` and unwrap
 * the document. Kept as a named seam because the admin moderation screen is
 * the one place that is *meant* to see every column. */
function dto<T extends { id: string }>(item: T): T {
  return item;
}
export async function reviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, ...page } = req.validatedQuery as AdminFeedbackListQuery;
    const result = await service.listAdminReviews(page, status);
    res.json({ ok: true, data: result.data.map(dto), meta: result.meta });
  } catch (e) {
    next(e);
  }
}
export async function questions(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, ...page } = req.validatedQuery as AdminFeedbackListQuery;
    const result = await service.listAdminQuestions(page, status);
    res.json({ ok: true, data: result.data.map(dto), meta: result.meta });
  } catch (e) {
    next(e);
  }
}
export async function review(req: Request, res: Response, next: NextFunction) {
  try {
    const input = req.body as ModerateFeedbackInput;
    const item = await service.moderateReview(
      (req.params as unknown as AdminFeedbackId).id,
      req.user!.sub,
      input.status,
    );
    res.json({ ok: true, data: dto(item) });
  } catch (e) {
    next(e);
  }
}
export async function question(req: Request, res: Response, next: NextFunction) {
  try {
    const input = req.body as ModerateFeedbackInput;
    const item = await service.moderateQuestion(
      (req.params as unknown as AdminFeedbackId).id,
      req.user!.sub,
      input.status,
      input.answer,
    );
    res.json({ ok: true, data: dto(item) });
  } catch (e) {
    next(e);
  }
}

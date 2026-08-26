import type { NextFunction, Request, Response } from "express";
import * as service from "./feedback.admin.service.js";
import type {
  AdminFeedbackId,
  AdminFeedbackListQuery,
  ModerateFeedbackInput,
} from "./feedback.admin.schema.js";
function dto(item: { _id: unknown; toObject(): Record<string, unknown> }) {
  return { ...item.toObject(), id: String(item._id) };
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

import type { ModerationStatus, Question, Review } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationQuery } from "../../utils/pagination.js";

export function listAdminReviews(pagination: PaginationQuery, status?: ModerationStatus) {
  return paginate<Review>(prisma.review, "Review", status ? { status } : {}, {
    ...pagination,
    sort: "-createdAt",
  });
}

export function listAdminQuestions(pagination: PaginationQuery, status?: ModerationStatus) {
  return paginate<Question>(prisma.question, "Question", status ? { status } : {}, {
    ...pagination,
    sort: "-createdAt",
  });
}

/**
 * `Product.ratingAvg`/`ratingCount` recomputed from the approved reviews.
 *
 * The Mongo version had to repeat `deletedAt: null` in its `$match`, because
 * the aggregation framework bypassed the soft-delete middleware entirely.
 * Prisma's client extension does reach `aggregate`, so the filter is applied
 * for us and the explicit condition is gone rather than merely tidied away.
 */
async function recalculateRating(productId: string): Promise<void> {
  const result = await prisma.review.aggregate({
    where: { productId, status: "approved" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: { ratingAvg: result._avg.rating ?? 0, ratingCount: result._count._all },
  });
}

export async function moderateReview(id: string, actorId: string, status: ModerationStatus) {
  const review = await prisma.review.findUnique({ where: { id }, select: { id: true } });
  if (!review) throw new ApiError(404, "نظر یافت نشد");
  const updated = await prisma.review.update({
    where: { id },
    data: { status, moderatedById: actorId, moderatedAt: new Date() },
  });
  await recalculateRating(updated.productId);
  return updated;
}

export async function moderateQuestion(
  id: string,
  actorId: string,
  status: ModerationStatus,
  answer?: string,
) {
  const question = await prisma.question.findUnique({ where: { id }, select: { id: true } });
  if (!question) throw new ApiError(404, "پرسش یافت نشد");
  const answered = answer ? { answer, answeredById: actorId, answeredAt: new Date() } : {};
  return prisma.question.update({
    where: { id },
    data: { status, moderatedById: actorId, moderatedAt: new Date(), ...answered },
  });
}

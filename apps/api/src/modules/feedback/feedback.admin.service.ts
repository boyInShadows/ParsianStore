import { ProductModel } from "../../models/Product.js";
import { QuestionModel } from "../../models/Question.js";
import { ReviewModel, type ModerationStatus } from "../../models/Review.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationQuery } from "../../utils/pagination.js";

export function listAdminReviews(pagination: PaginationQuery, status?: ModerationStatus) {
  return paginate(ReviewModel, status ? { status } : {}, { ...pagination, sort: "-createdAt" });
}
export function listAdminQuestions(pagination: PaginationQuery, status?: ModerationStatus) {
  return paginate(QuestionModel, status ? { status } : {}, { ...pagination, sort: "-createdAt" });
}

async function recalculateRating(productId: string) {
  const [result] = await ReviewModel.aggregate<{ _id: null; avg: number; count: number }>([
    { $match: { productId: new Types.ObjectId(productId), status: "approved", deletedAt: null } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await ProductModel.updateOne(
    { _id: productId },
    { $set: { rating: { avg: result?.avg ?? 0, count: result?.count ?? 0 } } },
  );
}

export async function moderateReview(id: string, actorId: string, status: "approved" | "rejected") {
  const review = await ReviewModel.findById(id);
  if (!review) throw new ApiError(404, "نظر یافت نشد");
  review.status = status;
  review.moderatedBy = new Types.ObjectId(actorId);
  review.moderatedAt = new Date();
  await review.save();
  await recalculateRating(review.productId.toString());
  return review;
}
export async function moderateQuestion(
  id: string,
  actorId: string,
  status: "approved" | "rejected",
  answer?: string,
) {
  const question = await QuestionModel.findById(id);
  if (!question) throw new ApiError(404, "پرسش یافت نشد");
  question.status = status;
  question.moderatedBy = new Types.ObjectId(actorId);
  question.moderatedAt = new Date();
  if (answer) {
    question.answer = answer;
    question.answeredBy = question.moderatedBy;
    question.answeredAt = new Date();
  }
  await question.save();
  return question;
}
import { Types } from "mongoose";

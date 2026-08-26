import { OrderModel } from "../../models/Order.js";
import { ProductModel } from "../../models/Product.js";
import { QuestionModel } from "../../models/Question.js";
import { ReviewModel } from "../../models/Review.js";
import { UserModel } from "../../models/User.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationQuery } from "../../utils/pagination.js";
import type { CreateQuestionInput, CreateReviewInput } from "./feedback.schema.js";

async function requireProduct(productId: string): Promise<void> {
  if (!(await ProductModel.exists({ _id: productId, status: "active" })))
    throw new ApiError(404, "محصول یافت نشد");
}

async function authorName(userId: string): Promise<string> {
  const user = await UserModel.findById(userId).select("name");
  if (!user) throw new ApiError(404, "کاربر یافت نشد");
  return user.name;
}

export async function listReviews(productId: string, pagination: PaginationQuery) {
  await requireProduct(productId);
  return paginate(
    ReviewModel,
    { productId, status: "approved" },
    { ...pagination, sort: "-createdAt" },
  );
}

export async function createReview(userId: string, productId: string, input: CreateReviewInput) {
  await requireProduct(productId);
  const delivered = await OrderModel.exists({
    userId,
    status: "delivered",
    "items.productId": productId,
  });
  if (!delivered) throw new ApiError(403, "ثبت نظر فقط پس از تحویل این کالا امکان‌پذیر است");
  try {
    return await ReviewModel.create({
      productId,
      userId,
      authorNameSnapshot: await authorName(userId),
      ...input,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
      throw new ApiError(409, "برای این کالا قبلاً نظر ثبت کرده‌اید");
    }
    throw error;
  }
}

export async function listQuestions(productId: string, pagination: PaginationQuery) {
  await requireProduct(productId);
  return paginate(
    QuestionModel,
    { productId, status: "approved" },
    { ...pagination, sort: "-createdAt" },
  );
}

export async function createQuestion(
  userId: string,
  productId: string,
  input: CreateQuestionInput,
) {
  await requireProduct(productId);
  return QuestionModel.create({
    productId,
    userId,
    authorNameSnapshot: await authorName(userId),
    ...input,
  });
}

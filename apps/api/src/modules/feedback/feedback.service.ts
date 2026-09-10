import type { Question, Review } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationQuery } from "../../utils/pagination.js";
import type { CreateQuestionInput, CreateReviewInput } from "./feedback.schema.js";

async function requireProduct(productId: string): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { id: productId, status: "active" },
    select: { id: true },
  });
  if (!product) throw new ApiError(404, "محصول یافت نشد");
}

async function authorName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!user) throw new ApiError(404, "کاربر یافت نشد");
  return user.name;
}

export async function listReviews(productId: string, pagination: PaginationQuery) {
  await requireProduct(productId);
  return paginate<Review>(
    prisma.review,
    "Review",
    { productId, status: "approved" },
    {
      ...pagination,
      sort: "-createdAt",
    },
  );
}

export async function createReview(userId: string, productId: string, input: CreateReviewInput) {
  await requireProduct(productId);
  // "Has this customer had this part delivered?" -- a relation filter now
  // rather than a dotted path into an embedded array.
  const delivered = await prisma.order.findFirst({
    where: { userId, status: "delivered", items: { some: { productId } } },
    select: { id: true },
  });
  if (!delivered) throw new ApiError(403, "ثبت نظر فقط پس از تحویل این کالا امکان‌پذیر است");
  try {
    return await prisma.review.create({
      data: {
        productId,
        userId,
        authorNameSnapshot: await authorName(userId),
        ...input,
      },
    });
  } catch (error: unknown) {
    // One review per customer per product, enforced by the unique. Prisma
    // reports that as P2002 where Mongo said 11000; the shared handler in
    // middleware/error.ts knows the new code too, but this one is caught here
    // because it deserves a 409 and its own sentence rather than the generic
    // "this value is already taken".
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      throw new ApiError(409, "برای این کالا قبلاً نظر ثبت کرده‌اید");
    }
    throw error;
  }
}

export async function listQuestions(productId: string, pagination: PaginationQuery) {
  await requireProduct(productId);
  return paginate<Question>(
    prisma.question,
    "Question",
    { productId, status: "approved" },
    {
      ...pagination,
      sort: "-createdAt",
    },
  );
}

export async function createQuestion(
  userId: string,
  productId: string,
  input: CreateQuestionInput,
) {
  await requireProduct(productId);
  return prisma.question.create({
    data: {
      productId,
      userId,
      authorNameSnapshot: await authorName(userId),
      ...input,
    },
  });
}

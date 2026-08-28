import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb } from "../../config/testDb.js";
import { seedOrder, seedProduct, seedUser } from "../../test/factories.js";
import * as admin from "./feedback.admin.service.js";
import * as feedback from "./feedback.service.js";

beforeAll(async () => {
  await resetDb();
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDB();
});

async function seed() {
  const [user, staff] = await Promise.all([
    seedUser({ phone: "+989121110001", name: "خریدار" }),
    seedUser({ phone: "+989121110002", name: "مدیر", role: "admin" }),
  ]);
  const product = await seedProduct({ nameFa: "لنت", nameEn: "Pad", stock: 2 });
  return { product, user, staff };
}

/** A delivered order carrying this product -- the evidence createReview
 * demands. The order's line items are a table now, so the fixture writes a
 * real OrderItem row rather than an embedded array. */
async function delivered(userId: string, productId: string) {
  await seedOrder(userId, {
    status: "delivered",
    totalRial: 1000,
    items: {
      create: [
        {
          productId,
          nameFaSnapshot: "لنت",
          nameEnSnapshot: "Pad",
          skuSnapshot: "FB-1",
          qty: 1,
          priceRial: 1000,
        },
      ],
    },
  });
}

describe("feedback trust and moderation", () => {
  it("rejects a review without a delivered purchase", async () => {
    const { product, user } = await seed();
    await expect(
      feedback.createReview(user.id, product.id, {
        rating: 5,
        title: "نظر واقعی",
        body: "متن نظر به اندازه کافی بلند است",
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("keeps pending content out of public lists", async () => {
    const { product, user } = await seed();
    await delivered(user.id, product.id);
    await feedback.createReview(user.id, product.id, {
      rating: 5,
      title: "نظر واقعی",
      body: "متن نظر به اندازه کافی بلند است",
    });
    const page = await feedback.listReviews(product.id, { page: 1, limit: 20 });
    expect(page.data).toHaveLength(0);
  });

  it("publishes approved reviews and recalculates rating", async () => {
    const { product, user, staff } = await seed();
    await delivered(user.id, product.id);
    const review = await feedback.createReview(user.id, product.id, {
      rating: 4,
      title: "نظر واقعی",
      body: "متن نظر به اندازه کافی بلند است",
    });
    await admin.moderateReview(review.id, staff.id, "approved");
    const rated = await prisma.product.findUnique({ where: { id: product.id } });
    expect(rated).toMatchObject({ ratingAvg: 4, ratingCount: 1 });
    expect((await feedback.listReviews(product.id, { page: 1, limit: 20 })).data).toHaveLength(1);
  });

  it("refuses a second review of the same product by the same customer", async () => {
    const { product, user } = await seed();
    await delivered(user.id, product.id);
    const input = {
      rating: 4,
      title: "نظر واقعی",
      body: "متن نظر به اندازه کافی بلند است",
    };
    await feedback.createReview(user.id, product.id, input);
    // The unique constraint speaks P2002 now where Mongo said 11000; this
    // asserts the translated branch still produces the same 409.
    await expect(feedback.createReview(user.id, product.id, input)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("publishes an answered question after moderation", async () => {
    const { product, user, staff } = await seed();
    const question = await feedback.createQuestion(user.id, product.id, {
      body: "آیا این قطعه با خودرو سازگار است؟",
    });
    await admin.moderateQuestion(
      question.id,
      staff.id,
      "approved",
      "بله، با رکورد فیتمنت بررسی کنید.",
    );
    const page = await feedback.listQuestions(product.id, { page: 1, limit: 20 });
    expect(page.data[0]?.answer).toContain("بله");
  });
});

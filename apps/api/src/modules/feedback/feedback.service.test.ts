import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../../config/testDbUri.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { OrderModel } from "../../models/Order.js";
import { ProductModel } from "../../models/Product.js";
import { QuestionModel } from "../../models/Question.js";
import { ReviewModel } from "../../models/Review.js";
import { UserModel } from "../../models/User.js";
import * as feedback from "./feedback.service.js";
import * as admin from "./feedback.admin.service.js";

const URI = testDbUri("parsian-store-test-feedback");
beforeAll(async () => {
  await mongoose.connect(URI);
});
beforeEach(async () => {
  await Promise.all([
    ReviewModel.deleteMany({}),
    QuestionModel.deleteMany({}),
    OrderModel.deleteMany({}),
    ProductModel.deleteMany({}),
    BrandModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

async function seed() {
  const [brand, category, user, staff] = await Promise.all([
    BrandModel.create({
      name: { fa: "برند", en: "Brand" },
      slug: "feedback-brand",
      country: "Iran",
    }),
    CategoryModel.create({
      name: { fa: "ترمز", en: "Brake" },
      slug: "feedback-category",
      systemCode: "SYS-04",
    }),
    UserModel.create({ phone: "+989121110001", name: "خریدار" }),
    UserModel.create({ phone: "+989121110002", name: "مدیر", role: "admin" }),
  ]);
  const product = await ProductModel.create({
    name: { fa: "لنت", en: "Pad" },
    slug: "feedback-product",
    sku: "FB-1",
    brandId: brand._id,
    categoryId: category._id,
    priceRial: 1000,
    stock: 2,
    weightGram: 100,
    dimensions: { lengthMm: 1, widthMm: 1, heightMm: 1 },
    warranty: { months: 1, text: "یک ماه" },
    authenticity: {
      supplyRoute: "domestic",
      sourceBrand: "Brand",
      countryOfManufacture: "Iran",
      verificationCode: "FB-V-1",
    },
    status: "active",
  });
  return { product, user, staff };
}

async function delivered(userId: mongoose.Types.ObjectId, productId: mongoose.Types.ObjectId) {
  await OrderModel.create({
    code: "FB-ORDER",
    userId,
    items: [
      {
        productId,
        nameSnapshot: { fa: "لنت", en: "Pad" },
        skuSnapshot: "FB-1",
        qty: 1,
        priceRial: 1000,
      },
    ],
    subtotalRial: 1000,
    discountRial: 0,
    shippingRial: 0,
    taxRial: 0,
    totalRial: 1000,
    address: {
      province: { fa: "تهران", en: "Tehran" },
      city: { fa: "تهران", en: "Tehran" },
      line: "خیابان",
      postalCode: "1234567890",
      receiverName: "خریدار",
      receiverPhone: "+989121110001",
    },
    shippingMethod: { code: "post", name: { fa: "پست", en: "Post" }, priceRial: 0 },
    status: "delivered",
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
    await delivered(user._id, product._id);
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
    await delivered(user._id, product._id);
    const review = await feedback.createReview(user.id, product.id, {
      rating: 4,
      title: "نظر واقعی",
      body: "متن نظر به اندازه کافی بلند است",
    });
    await admin.moderateReview(review.id, staff.id, "approved");
    expect((await ProductModel.findById(product.id))?.rating).toMatchObject({ avg: 4, count: 1 });
    expect((await feedback.listReviews(product.id, { page: 1, limit: 20 })).data).toHaveLength(1);
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

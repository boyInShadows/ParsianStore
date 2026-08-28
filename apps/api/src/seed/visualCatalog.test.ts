import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../config/testDb.js";
import { BrandModel } from "../models/Brand.js";
import { CategoryModel } from "../models/Category.js";
import { ProductModel } from "../models/Product.js";
import { parseCsv, seedVisualCatalog } from "./visualCatalog.js";

beforeAll(async () => {
  await resetDb();
  await ProductModel.init();
});

afterAll(async () => {
  await disconnectDB();
});

describe("visual catalog seed", () => {
  it("parses quoted commas and escaped quotes", () => {
    expect(parseCsv('name,price\r\n"part, large","10""000"\r\n')).toEqual([
      { name: "part, large", price: '10"000' },
    ]);
  });

  it("imports 100 image-backed products into one idempotent category", async () => {
    expect(await seedVisualCatalog()).toBe(100);
    expect(await seedVisualCatalog()).toBe(100);

    const category = await CategoryModel.findOne({ slug: "visual-products" });
    const brand = await BrandModel.findOne({ slug: "visual-sample" });
    expect(category).not.toBeNull();
    expect(brand).not.toBeNull();

    const products = await ProductModel.find({ categoryId: category!._id });
    expect(products).toHaveLength(100);
    expect(products.every((product) => product.media.length === 1)).toBe(true);
    expect(products.every((product) => product.priceRial > 0)).toBe(true);
  }, 30_000);
});

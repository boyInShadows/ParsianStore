import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDB } from "../../../config/testDb.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { ProductModel } from "../../models/Product.js";
import { importProductsCsv, parseCsv } from "./products.import.service.js";

beforeAll(() => mongoose.connect(testDbUri("parsian-store-test-product-import")));
beforeEach(() =>
  Promise.all([
    BrandModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    ProductModel.deleteMany({}),
  ]),
);
afterAll(async () => {
  await disconnectDB();
});

describe("product CSV import", () => {
  it("parses quoted commas", () =>
    expect(parseCsv('sku,nameFa\nA,"لنت، جلو"')[0]?.nameFa).toBe("لنت، جلو"));

  it("previews then commits valid rows through normal product creation", async () => {
    const brand = await BrandModel.create({
      name: { fa: "برند", en: "Brand" },
      slug: "brand",
      country: "IR",
      isOEM: true,
    });
    const category = await CategoryModel.create({
      name: { fa: "دسته", en: "Category" },
      slug: "category",
      systemCode: "SYS-04",
      path: [],
      order: 1,
    });
    const header =
      "nameFa,nameEn,slug,sku,brandId,categoryId,priceRial,stock,weightGram,supplyRoute,sourceBrand,countryOfManufacture,verificationCode";
    const csv = `${header}\nلنت,Pad,pad-import,IMP-1,${brand.id},${category.id},100000,4,500,oem,Bosch,DE,VERIFY-IMP-1`;
    const preview = await importProductsCsv(csv, false);
    expect(preview).toMatchObject({ total: 1, valid: 1, imported: 0 });
    expect(await ProductModel.countDocuments()).toBe(0);
    const committed = await importProductsCsv(csv, true);
    expect(committed.imported).toBe(1);
    const product = await ProductModel.findOne({ sku: "IMP-1" });
    expect(product?.searchText).toContain("imp-1");
  });

  it("never partially commits a file containing an invalid row", async () => {
    const result = await importProductsCsv("sku,nameFa\nA,Incomplete", true);
    expect(result.imported).toBe(0);
    expect(result.rows[0]?.ok).toBe(false);
  });
});

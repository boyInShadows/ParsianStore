import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { CategoryModel } from "./Category.js";

const TEST_URI = testDbUri("parsian-store-test-category");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await CategoryModel.init();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("CategoryModel", () => {
  it("stores a localized name, defaults order/path, and enforces a unique slug", async () => {
    const category = await CategoryModel.create({
      name: { fa: "ترمز", en: "Brakes" },
      slug: "brakes",
      systemCode: "SYS-04",
    });
    expect(category.name.fa).toBe("ترمز");
    expect(category.parentId).toBeNull();
    expect(category.order).toBe(0);
    expect(category.path).toEqual([]);

    await expect(
      CategoryModel.create({
        name: { fa: "x", en: "x" },
        slug: "brakes",
        systemCode: "SYS-04",
      }),
    ).rejects.toThrow();
  });

  it("rejects a systemCode outside the fixed SYS-xx taxonomy", async () => {
    await expect(
      CategoryModel.create({
        name: { fa: "نامعتبر", en: "Invalid" },
        slug: "invalid-system",
        systemCode: "SYS-99",
      }),
    ).rejects.toThrow();
  });

  it("links a subcategory to its parent and records the ancestor path", async () => {
    const parent = await CategoryModel.create({
      name: { fa: "ترمز", en: "Brakes" },
      slug: "brakes-parent",
      systemCode: "SYS-04",
    });
    const child = await CategoryModel.create({
      name: { fa: "لنت ترمز", en: "Brake pads" },
      slug: "brake-pads",
      parentId: parent._id,
      systemCode: "SYS-04",
      path: [parent.slug],
    });
    expect(child.parentId?.toString()).toBe(parent._id.toString());
    expect(child.path).toEqual(["brakes-parent"]);
  });
});

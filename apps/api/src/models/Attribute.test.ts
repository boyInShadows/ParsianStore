import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../../config/testDb.js";
import { AttributeModel } from "./Attribute.js";

beforeAll(async () => {
  await resetDb();
  await AttributeModel.init();
});

afterAll(async () => {
  await disconnectDB();
});

describe("AttributeModel", () => {
  it("stores a select attribute with its options and enforces a unique key", async () => {
    const attribute = await AttributeModel.create({
      name: "رنگ",
      key: "color",
      type: "select",
      options: ["قرمز", "آبی"],
    });
    expect(attribute.name).toBe("رنگ");
    expect(attribute.options).toEqual(["قرمز", "آبی"]);

    await expect(
      AttributeModel.create({ name: "x", key: "color", type: "text" }),
    ).rejects.toThrow();
  });

  it("defaults options to an empty array for non-select types", async () => {
    const attribute = await AttributeModel.create({
      name: "وزن",
      key: "weight",
      type: "number",
      unit: "kg",
    });
    expect(attribute.options).toEqual([]);
    expect(attribute.unit).toBe("kg");
  });

  it("rejects a type outside the fixed enum", async () => {
    await expect(
      AttributeModel.create({ name: "x", key: "bad-type", type: "date" }),
    ).rejects.toThrow();
  });
});

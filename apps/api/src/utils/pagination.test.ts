import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose, { Schema } from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { clampLimit, paginate, paginationQuerySchema, toSkip } from "./pagination.js";

describe("paginationQuerySchema", () => {
  it("defaults page to 1 and limit to 20 when absent", () => {
    const result = paginationQuerySchema.parse({});
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it("coerces string query values to numbers", () => {
    const result = paginationQuerySchema.parse({ page: "3", limit: "50" });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it("rejects a non-positive page or limit", () => {
    expect(() => paginationQuerySchema.parse({ page: "0" })).toThrow();
    expect(() => paginationQuerySchema.parse({ limit: "-5" })).toThrow();
  });
});

describe("clampLimit", () => {
  it("passes through a value at or under 100", () => {
    expect(clampLimit(50)).toBe(50);
    expect(clampLimit(100)).toBe(100);
  });

  it("caps a value over 100", () => {
    expect(clampLimit(500)).toBe(100);
  });
});

describe("toSkip", () => {
  it("computes the correct offset", () => {
    expect(toSkip(1, 20)).toBe(0);
    expect(toSkip(2, 20)).toBe(20);
    expect(toSkip(3, 10)).toBe(20);
  });
});

describe("paginate", () => {
  const TEST_URI = testDbUri("parsian-store-test-pagination");
  interface Widget {
    n: number;
  }
  let Widget: mongoose.Model<Widget>;

  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
    Widget = mongoose.model<Widget>("PaginationWidget", new Schema<Widget>({ n: Number }));
  });

  beforeEach(async () => {
    await Widget.deleteMany({});
    await Widget.insertMany(Array.from({ length: 25 }, (_, i) => ({ n: i + 1 })));
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("returns the correct page slice and total count", async () => {
    const result = await paginate(Widget, {}, { page: 1, limit: 10 });
    expect(result.data).toHaveLength(10);
    expect(result.meta).toEqual({ total: 25, page: 1, limit: 10 });
  });

  it("returns the remainder on the last page", async () => {
    const result = await paginate(Widget, {}, { page: 3, limit: 10 });
    expect(result.data).toHaveLength(5);
  });

  it("clamps an over-limit request instead of erroring", async () => {
    const result = await paginate(Widget, {}, { page: 1, limit: 500 });
    expect(result.meta.limit).toBe(100);
  });

  it("applies the given filter", async () => {
    const result = await paginate(Widget, { n: { $gt: 20 } }, { page: 1, limit: 20 });
    expect(result.meta.total).toBe(5);
  });
});

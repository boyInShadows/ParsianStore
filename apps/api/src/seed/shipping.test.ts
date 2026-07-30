import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { ShippingRateModel } from "../models/ShippingRate.js";
import { seedShipping } from "./shipping.js";

const TEST_URI = testDbUri("parsian-store-test-seed-shipping");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("seedShipping", () => {
  it("creates a rate row for every weight-dependent method x zone x bracket, plus the flat intracity row", async () => {
    await seedShipping();
    // 3 weight-dependent methods x 2 zones x 4 brackets + 1 flat intracity row
    await expect(ShippingRateModel.countDocuments({})).resolves.toBe(3 * 2 * 4 + 1);
  });

  it("is idempotent — running it again does not create duplicates", async () => {
    await seedShipping();
    await seedShipping();
    await expect(ShippingRateModel.countDocuments({})).resolves.toBe(3 * 2 * 4 + 1);
  });

  it("every rate is a positive integer Rial amount, and every bracket's max (when set) exceeds its min", async () => {
    await seedShipping();
    const rates = await ShippingRateModel.find({});
    for (const rate of rates) {
      expect(Number.isInteger(rate.priceRial)).toBe(true);
      expect(rate.priceRial).toBeGreaterThan(0);
      if (rate.maxWeightGram !== null) {
        expect(rate.maxWeightGram).toBeGreaterThan(rate.minWeightGram);
      }
    }
  });
});

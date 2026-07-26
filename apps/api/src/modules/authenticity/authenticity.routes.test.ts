import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { ProductModel } from "../../models/Product.js";

const TEST_URI = testDbUri("parsian-store-test-authenticity-routes");
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected server to bind to a TCP port");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await ProductModel.deleteMany({});
});

afterAll(async () => {
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

interface Envelope<T> {
  ok: boolean;
  data: T;
}

async function seedProduct() {
  return ProductModel.create({
    name: { fa: "لنت ترمز جلو", en: "Front brake pad" },
    slug: "front-brake-pad",
    sku: "SKU-AUTH-1",
    brandId: new mongoose.Types.ObjectId(),
    categoryId: new mongoose.Types.ObjectId(),
    priceRial: 1_500_000,
    weightGram: 800,
    dimensions: { lengthMm: 150, widthMm: 100, heightMm: 40 },
    warranty: { months: 12, text: "۱۲ ماه ضمانت توسط فروشنده" },
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "Bosch",
      countryOfManufacture: "Germany",
      hologramCode: "HG-001",
      verificationCode: "VER-AUTH-1",
    },
  });
}

describe("GET /authenticity/verify/:code", () => {
  it("returns the evidence panel for a known verification code", async () => {
    await seedProduct();
    const res = await fetch(`${baseUrl}/api/v1/authenticity/verify/VER-AUTH-1`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{
      productSlug: string;
      sourceBrand: string;
      hologramCode: string;
    }>;
    expect(body.data.productSlug).toBe("front-brake-pad");
    expect(body.data.sourceBrand).toBe("Bosch");
    expect(body.data.hologramCode).toBe("HG-001");
  });

  it("returns 404 for an unknown code", async () => {
    const res = await fetch(`${baseUrl}/api/v1/authenticity/verify/does-not-exist`);
    expect(res.status).toBe(404);
  });
});

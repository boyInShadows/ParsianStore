import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { seedProduct } from "../../test/factories.js";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  close();
  await disconnectDB();
});

interface Envelope<T> {
  ok: boolean;
  data: T;
}

async function seedVerifiableProduct() {
  return seedProduct({
    slug: "front-brake-pad",
    sku: "SKU-AUTH-1",
    hologramCode: "HG-001",
    verificationCode: "VER-AUTH-1",
  });
}

describe("GET /authenticity/verify/:code", () => {
  it("returns the evidence panel for a known verification code", async () => {
    await seedVerifiableProduct();
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

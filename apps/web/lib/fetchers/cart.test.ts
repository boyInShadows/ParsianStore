import { afterEach, describe, expect, it, vi } from "vitest";
import type { CartDto, ProductListItemDto } from "schemas";
import { applyCartCoupon, fetchCart } from "./cart";

/**
 * P15.S8b: these guard the hand-written shape check that replaced
 * `cartResponseSchema.safeParse()` -- a malformed `/cart` response must
 * resolve to `null` (or the coupon error path) exactly like the zod
 * version did, never a half-built cart object.
 */

function validProduct(): ProductListItemDto {
  return {
    id: "p1",
    name: { fa: "لنت ترمز", en: "Brake Pad" },
    slug: "brake-pad",
    priceRial: 1_500_000,
    isWholesalePrice: false,
    stock: 12,
    media: [],
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "Bosch",
      countryOfManufacture: "Germany",
      verificationCode: "VER-1",
    },
  };
}

function validCartData(): CartDto {
  return {
    id: "cart1",
    items: [
      {
        id: "item1",
        productId: "p1",
        qty: 2,
        priceRialSnapshot: 1_500_000,
        product: validProduct(),
        availableQty: 5,
        stockOk: true,
        priceChanged: false,
        lineTotalRial: 3_000_000,
      },
    ],
    subtotalRial: 3_000_000,
    discountRial: 0,
    totalRial: 3_000_000,
  };
}

function stubFetchOnce(response: { ok: boolean; json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function okCart(data: unknown) {
  return { ok: true, data };
}

describe("fetchCart", () => {
  it("returns the cart for a well-formed response", async () => {
    stubFetchOnce({ ok: true, json: async () => okCart(validCartData()) });
    expect(await fetchCart()).toEqual(validCartData());
  });

  it("returns null when a required field is missing", async () => {
    const broken: Record<string, unknown> = { ...validCartData() };
    delete broken.subtotalRial;
    stubFetchOnce({ ok: true, json: async () => okCart(broken) });
    expect(await fetchCart()).toBeNull();
  });

  it("returns null when a line item's nested product is malformed", async () => {
    const data = validCartData();
    const brokenItem = { ...data.items[0]!, product: { id: "p1" } };
    stubFetchOnce({ ok: true, json: async () => okCart({ ...data, items: [brokenItem] }) });
    expect(await fetchCart()).toBeNull();
  });

  it("returns null when a field has the wrong type", async () => {
    const data = validCartData() as unknown as Record<string, unknown>;
    data.totalRial = "3000000";
    stubFetchOnce({ ok: true, json: async () => okCart(data) });
    expect(await fetchCart()).toBeNull();
  });

  it("returns null when items is not an array", async () => {
    const data = validCartData() as unknown as Record<string, unknown>;
    data.items = "not-an-array";
    stubFetchOnce({ ok: true, json: async () => okCart(data) });
    expect(await fetchCart()).toBeNull();
  });

  it("returns null when the response body is null", async () => {
    stubFetchOnce({ ok: true, json: async () => null });
    expect(await fetchCart()).toBeNull();
  });

  it("returns null when the HTTP response itself is not ok", async () => {
    stubFetchOnce({ ok: false });
    expect(await fetchCart()).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network down")));
    expect(await fetchCart()).toBeNull();
  });
});

describe("applyCartCoupon", () => {
  it("returns the updated cart for a well-formed response", async () => {
    stubFetchOnce({ ok: true, json: async () => okCart(validCartData()) });
    const result = await applyCartCoupon("SAVE10");
    expect(result).toEqual({ ok: true, data: validCartData() });
  });

  it("falls back to the generic error message on a malformed response", async () => {
    stubFetchOnce({ ok: true, json: async () => okCart({ id: "cart1" }) });
    const result = await applyCartCoupon("SAVE10");
    expect(result.ok).toBe(false);
  });
});

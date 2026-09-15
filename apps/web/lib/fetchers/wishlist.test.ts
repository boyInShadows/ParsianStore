import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProductListItemDto } from "schemas";
import { addToWishlist, fetchWishlist, fetchWishlistIds, removeFromWishlist } from "./wishlist";

/**
 * P15.S8b: these guard the hand-written shape checks that replaced
 * `wishlistResponseSchema`/`wishlistMutationResponseSchema.safeParse()`.
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

function validWishlistItem() {
  return {
    id: "w1",
    productId: "p1",
    createdAt: "2026-09-15T00:00:00.000Z",
    product: validProduct(),
  };
}

function stubFetchOnce(response: { ok: boolean; status?: number; json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function okList(data: unknown[], meta = { total: data.length, page: 1, limit: 100 }) {
  return { ok: true, data, meta };
}

describe("fetchWishlistIds", () => {
  it("returns the saved product ids for a well-formed response", async () => {
    stubFetchOnce({ ok: true, json: async () => okList([validWishlistItem()]) });
    expect(await fetchWishlistIds()).toEqual(["p1"]);
  });

  it("returns [] when an item is missing a required field", async () => {
    const broken: Record<string, unknown> = { ...validWishlistItem() };
    delete broken.productId;
    stubFetchOnce({ ok: true, json: async () => okList([broken]) });
    expect(await fetchWishlistIds()).toEqual([]);
  });

  it("returns [] when createdAt is not a valid date", async () => {
    stubFetchOnce({
      ok: true,
      json: async () => okList([{ ...validWishlistItem(), createdAt: "not-a-date" }]),
    });
    expect(await fetchWishlistIds()).toEqual([]);
  });

  it("returns [] when the embedded product is malformed", async () => {
    stubFetchOnce({
      ok: true,
      json: async () => okList([{ ...validWishlistItem(), product: { id: "p1" } }]),
    });
    expect(await fetchWishlistIds()).toEqual([]);
  });

  it("returns [] when meta is missing", async () => {
    stubFetchOnce({ ok: true, json: async () => ({ ok: true, data: [validWishlistItem()] }) });
    expect(await fetchWishlistIds()).toEqual([]);
  });

  it("returns [] when the response body is null", async () => {
    stubFetchOnce({ ok: true, json: async () => null });
    expect(await fetchWishlistIds()).toEqual([]);
  });

  it("returns [] when the HTTP response itself is not ok", async () => {
    stubFetchOnce({ ok: false });
    expect(await fetchWishlistIds()).toEqual([]);
  });

  it("returns [] when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network down")));
    expect(await fetchWishlistIds()).toEqual([]);
  });
});

describe("fetchWishlist (server)", () => {
  it("returns the page for a well-formed response", async () => {
    stubFetchOnce({ ok: true, json: async () => okList([validWishlistItem()]) });
    const result = await fetchWishlist(1, 20, "cookie=1");
    // createdAt is coerced to a real `Date` instance (mirrors zod's
    // `z.coerce.date()`), not left as the raw wire string.
    expect(result).toEqual({
      ok: true,
      data: {
        data: [{ ...validWishlistItem(), createdAt: new Date("2026-09-15T00:00:00.000Z") }],
        total: 1,
        page: 1,
        limit: 100,
      },
    });
  });

  it("reports 'unauthorized' on a 401, distinct from a malformed body", async () => {
    stubFetchOnce({ ok: false, status: 401 });
    expect(await fetchWishlist(1, 20, "cookie=1")).toEqual({ ok: false, reason: "unauthorized" });
  });

  it("reports 'down' when the payload is malformed", async () => {
    stubFetchOnce({ ok: true, json: async () => okList([{ id: "w1" }]) });
    expect(await fetchWishlist(1, 20, "cookie=1")).toEqual({ ok: false, reason: "down" });
  });
});

describe("addToWishlist / removeFromWishlist", () => {
  it("returns true for a well-formed mutation response", async () => {
    stubFetchOnce({
      ok: true,
      json: async () => ({ ok: true, data: { productId: "p1", isSaved: true } }),
    });
    expect(await addToWishlist("p1")).toBe(true);
  });

  it("returns false when the mutation response is malformed", async () => {
    stubFetchOnce({ ok: true, json: async () => ({ ok: true, data: { productId: "p1" } }) });
    expect(await addToWishlist("p1")).toBe(false);
  });

  it("returns false when isSaved has the wrong type", async () => {
    stubFetchOnce({
      ok: true,
      json: async () => ({ ok: true, data: { productId: "p1", isSaved: "yes" } }),
    });
    expect(await removeFromWishlist("p1")).toBe(false);
  });

  it("returns false when the HTTP response itself is not ok", async () => {
    stubFetchOnce({ ok: false });
    expect(await removeFromWishlist("p1")).toBe(false);
  });
});

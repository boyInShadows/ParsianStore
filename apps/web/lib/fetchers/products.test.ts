import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProductListItemDto } from "schemas";
import { fetchExampleProduct, fetchFeaturedProducts } from "./products";

/**
 * Guards P14.S9's real defect: the seed creates `VARIANTS_PER_TEMPLATE = 4`
 * rows per part template, consecutively, so `sort=newest&limit=8` returned
 * eight rows drawn from two templates and the grid showed the same part four
 * times in a row. The fix over-fetches and dedupes on `name.fa`; this file is
 * the only thing that would notice if a future edit "simplified" that away.
 */

function makeProduct(nameFa: string, id: string): ProductListItemDto {
  return {
    id,
    name: { fa: nameFa, en: nameFa },
    slug: `${id}-slug`,
    priceRial: 1_000_000,
    isWholesalePrice: false,
    stock: 5,
    media: [],
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "Bosch",
      countryOfManufacture: "Germany",
      verificationCode: `VER-${id}`,
    },
  };
}

/**
 * Mirrors the real seed shape described in the ticket: every template
 * contributes `VARIANTS_PER_TEMPLATE` consecutive rows (same `name.fa`,
 * different id/brand/vehicle) before the next template starts.
 */
function consecutiveTemplateRows(templateCount: number, variantsPerTemplate: number) {
  const rows: ProductListItemDto[] = [];
  for (let template = 0; template < templateCount; template += 1) {
    for (let variant = 0; variant < variantsPerTemplate; variant += 1) {
      rows.push(makeProduct(`قالب-${template}`, `t${template}-v${variant}`));
    }
  }
  return rows;
}

function stubFetchOnce(response: { ok: boolean; json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchFeaturedProducts", () => {
  it("de-duplicates by name.fa over the real 4-per-template seed shape", async () => {
    // 16 distinct templates x 4 consecutive variants = 64 rows, matching the
    // real measurement in the ticket (64-row window, 16 distinct templates).
    const rows = consecutiveTemplateRows(16, 4);
    stubFetchOnce({ ok: true, json: async () => okResponse(rows) });

    const result = await fetchFeaturedProducts(8);

    expect(result).toHaveLength(8);
    const names = result.map((product) => product.name.fa);
    expect(new Set(names).size, "duplicate part shown in the grid").toBe(names.length);
  });

  it(
    "requests a strictly wider window than it renders -- the over-fetch IS the fix; " +
      "a future edit that 'simplifies' the query back to limit=8 must fail here even " +
      "though a plain length/uniqueness assertion on a tidy fixture would not catch it",
    async () => {
      const fetchMock = stubFetchOnce({ ok: true, json: async () => okResponse([]) });

      await fetchFeaturedProducts(8);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const requestedUrl = new URL(String(fetchMock.mock.calls[0]![0]));
      const requestedLimit = Number(requestedUrl.searchParams.get("limit"));
      expect(requestedLimit, "over-fetch window collapsed to the render limit").toBeGreaterThan(8);
    },
  );

  it("still respects a smaller requested limit once de-duplicated", async () => {
    const rows = consecutiveTemplateRows(6, 4);
    stubFetchOnce({ ok: true, json: async () => okResponse(rows) });

    const result = await fetchFeaturedProducts(3);

    expect(result).toHaveLength(3);
  });

  it("returns [] when the response is not ok", async () => {
    stubFetchOnce({ ok: false });

    expect(await fetchFeaturedProducts(8)).toEqual([]);
  });

  it("returns [] when the payload fails schema validation", async () => {
    stubFetchOnce({ ok: true, json: async () => ({ ok: true, data: "not-an-array" }) });

    expect(await fetchFeaturedProducts(8)).toEqual([]);
  });

  it("returns [] when fetch itself throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network down")));

    expect(await fetchFeaturedProducts(8)).toEqual([]);
  });
});

describe("fetchExampleProduct", () => {
  it("returns the first product from the featured list", async () => {
    const rows = consecutiveTemplateRows(2, 4);
    stubFetchOnce({ ok: true, json: async () => okResponse(rows) });

    const product = await fetchExampleProduct();

    expect(product?.name.fa).toBe(rows[0]!.name.fa);
  });

  it("returns null when there are no products", async () => {
    stubFetchOnce({ ok: true, json: async () => okResponse([]) });

    expect(await fetchExampleProduct()).toBeNull();
  });
});

function okResponse(data: ProductListItemDto[]) {
  return { ok: true, data, meta: { nextCursor: null, limit: data.length } };
}

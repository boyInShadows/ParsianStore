import { afterEach, describe, expect, it, vi } from "vitest";
import { ZarinpalProvider } from "./ZarinpalProvider.js";

const AUTHORITY = "A00000000000000000000000000000000123";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("ZarinpalProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("initiate", () => {
    it("posts the correct request body/headers to the sandbox request endpoint", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse({ data: { code: 100, authority: AUTHORITY }, errors: [] }));
      vi.stubGlobal("fetch", fetchMock);

      const provider = new ZarinpalProvider("test-merchant-id", true);
      await provider.initiate({
        amountRial: 1_500_000,
        callbackUrl: "https://example.com/checkout/callback",
        description: "سفارش تست",
        mobile: "+989121234567",
        orderId: "order-1",
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://sandbox.zarinpal.com/pg/v4/payment/request.json");
      expect(options.method).toBe("POST");
      expect(options.headers).toMatchObject({
        "Content-Type": "application/json",
        Accept: "application/json",
      });
      const body = JSON.parse(options.body as string) as Record<string, unknown>;
      expect(body).toMatchObject({
        merchant_id: "test-merchant-id",
        amount: 1_500_000,
        currency: "IRR",
        callback_url: "https://example.com/checkout/callback",
        description: "سفارش تست",
        metadata: { mobile: "+989121234567", order_id: "order-1" },
      });
    });

    it("uses the production base URL when sandbox is false", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse({ data: { code: 100, authority: AUTHORITY }, errors: [] }));
      vi.stubGlobal("fetch", fetchMock);

      const provider = new ZarinpalProvider("test-merchant-id", false);
      await provider.initiate({
        amountRial: 1_000_000,
        callbackUrl: "https://example.com/callback",
        description: "test",
      });

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe("https://payment.zarinpal.com/pg/v4/payment/request.json");
    });

    it("returns the authority and a StartPay redirectUrl on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            jsonResponse({ data: { code: 100, authority: AUTHORITY }, errors: [] }),
          ),
      );

      const provider = new ZarinpalProvider("test-merchant-id", true);
      const result = await provider.initiate({
        amountRial: 1_000_000,
        callbackUrl: "https://example.com/callback",
        description: "test",
      });

      expect(result).toEqual({
        authority: AUTHORITY,
        redirectUrl: `https://sandbox.zarinpal.com/pg/StartPay/${AUTHORITY}`,
      });
    });

    it("throws an ApiError on a non-2xx response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 500)));

      const provider = new ZarinpalProvider("test-merchant-id", true);
      await expect(
        provider.initiate({
          amountRial: 1_000_000,
          callbackUrl: "https://example.com/callback",
          description: "test",
        }),
      ).rejects.toThrow();
    });

    it("throws an ApiError when Zarinpal's own envelope reports a non-100 code inside a 200", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            jsonResponse({ data: { code: -9 }, errors: [{ message: "amount is required" }] }),
          ),
      );

      const provider = new ZarinpalProvider("test-merchant-id", true);
      await expect(
        provider.initiate({
          amountRial: 1_000_000,
          callbackUrl: "https://example.com/callback",
          description: "test",
        }),
      ).rejects.toThrow();
    });
  });

  describe("verify", () => {
    it("posts merchant_id/amount/authority to the verify endpoint", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse({ data: { code: 100, ref_id: 987654321 }, errors: [] }));
      vi.stubGlobal("fetch", fetchMock);

      const provider = new ZarinpalProvider("test-merchant-id", true);
      await provider.verify({ amountRial: 1_500_000, authority: AUTHORITY });

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://sandbox.zarinpal.com/pg/v4/payment/verify.json");
      const body = JSON.parse(options.body as string) as Record<string, unknown>;
      expect(body).toEqual({
        merchant_id: "test-merchant-id",
        amount: 1_500_000,
        authority: AUTHORITY,
      });
    });

    it("returns success:true for code 100 (first verify)", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(jsonResponse({ data: { code: 100, ref_id: 987654321 }, errors: [] })),
      );
      const provider = new ZarinpalProvider("test-merchant-id", true);
      const result = await provider.verify({ amountRial: 1_000_000, authority: AUTHORITY });
      expect(result.success).toBe(true);
      expect(result.refId).toBe("987654321");
    });

    it("returns success:true for code 101 (already verified)", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(jsonResponse({ data: { code: 101, ref_id: 987654321 }, errors: [] })),
      );
      const provider = new ZarinpalProvider("test-merchant-id", true);
      const result = await provider.verify({ amountRial: 1_000_000, authority: AUTHORITY });
      expect(result.success).toBe(true);
    });

    it("returns success:false (not a throw) for a business-level decline", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse({ data: { code: 51 }, errors: [] })),
      );
      const provider = new ZarinpalProvider("test-merchant-id", true);
      const result = await provider.verify({ amountRial: 1_000_000, authority: AUTHORITY });
      expect(result.success).toBe(false);
    });

    it("throws an ApiError only on a non-2xx response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 500)));
      const provider = new ZarinpalProvider("test-merchant-id", true);
      await expect(
        provider.verify({ amountRial: 1_000_000, authority: AUTHORITY }),
      ).rejects.toThrow();
    });
  });
});

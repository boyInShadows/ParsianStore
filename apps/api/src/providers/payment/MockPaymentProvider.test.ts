import { describe, expect, it } from "vitest";
import { MockPaymentProvider } from "./MockPaymentProvider.js";

describe("MockPaymentProvider", () => {
  it("initiate resolves with a redirectUrl that simulates an instant-approve callback", async () => {
    const provider = new MockPaymentProvider();
    const result = await provider.initiate({
      amountRial: 1_000_000,
      callbackUrl: "https://example.com/checkout/callback",
      description: "test order",
    });

    expect(result.authority).toMatch(/^MOCK-/);
    const redirectUrl = new URL(result.redirectUrl);
    expect(redirectUrl.origin + redirectUrl.pathname).toBe("https://example.com/checkout/callback");
    expect(redirectUrl.searchParams.get("Authority")).toBe(result.authority);
    expect(redirectUrl.searchParams.get("Status")).toBe("OK");
  });

  it("verify always resolves success:true without making any real network call", async () => {
    const provider = new MockPaymentProvider();
    const result = await provider.verify({ amountRial: 1_000_000, authority: "MOCK-abc123" });
    expect(result.success).toBe(true);
    expect(result.refId).toMatch(/^MOCK-REF-/);
  });
});

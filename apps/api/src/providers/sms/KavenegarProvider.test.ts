import { afterEach, describe, expect, it, vi } from "vitest";
import { KavenegarProvider } from "./KavenegarProvider.js";

describe("KavenegarProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the Verify Lookup endpoint with receptor/token/template", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new KavenegarProvider("test-api-key", "otp-template");
    await provider.sendOtp("+989123456789", "654321");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0]?.[0] as URL;
    expect(calledUrl.toString()).toBe(
      "https://api.kavenegar.com/v1/test-api-key/verify/lookup.json?receptor=%2B989123456789&token=654321&template=otp-template",
    );
  });

  it("throws an ApiError when the provider responds with a non-2xx status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 400 })));

    const provider = new KavenegarProvider("test-api-key", "otp-template");
    await expect(provider.sendOtp("+989123456789", "654321")).rejects.toThrow();
  });
});

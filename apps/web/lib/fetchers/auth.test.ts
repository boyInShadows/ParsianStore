import { afterEach, describe, expect, it, vi } from "vitest";
import type { MeDto } from "schemas";
import { fetchMe, fetchMeServer, requestOtp, verifyOtp } from "./auth";

/**
 * P15.S8b: these guard the hand-written shape check that replaced
 * `meResponseSchema.safeParse()` -- a malformed `/auth/me` response must
 * resolve exactly the way the zod version did (null / guest), not throw
 * and not silently pass a broken user object through to the header.
 */

function validMe(): MeDto {
  return {
    id: "u1",
    phone: "09120000000",
    name: "کاربر تست",
    email: "user@example.com",
    role: "customer",
    accountType: "retail",
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

function okMe(data: unknown) {
  return { ok: true, data };
}

describe("fetchMe", () => {
  it("returns the user for a well-formed response", async () => {
    stubFetchOnce({ ok: true, json: async () => okMe(validMe()) });
    expect(await fetchMe()).toEqual(validMe());
  });

  it("accepts a response with the optional email field omitted", async () => {
    const withoutEmail: Record<string, unknown> = { ...validMe() };
    delete withoutEmail.email;
    stubFetchOnce({ ok: true, json: async () => okMe(withoutEmail) });
    expect(await fetchMe()).toEqual(withoutEmail);
  });

  it("returns null when a required field is missing", async () => {
    const broken: Record<string, unknown> = { ...validMe() };
    delete broken.name;
    stubFetchOnce({ ok: true, json: async () => okMe(broken) });
    expect(await fetchMe()).toBeNull();
  });

  it("returns null when a field has the wrong type", async () => {
    stubFetchOnce({ ok: true, json: async () => okMe({ ...validMe(), id: 12345 }) });
    expect(await fetchMe()).toBeNull();
  });

  it("returns null when role is not one of the known values", async () => {
    stubFetchOnce({ ok: true, json: async () => okMe({ ...validMe(), role: "owner" }) });
    expect(await fetchMe()).toBeNull();
  });

  it("returns null when the response body is null", async () => {
    stubFetchOnce({ ok: true, json: async () => null });
    expect(await fetchMe()).toBeNull();
  });

  it("returns null when data is null", async () => {
    stubFetchOnce({ ok: true, json: async () => okMe(null) });
    expect(await fetchMe()).toBeNull();
  });

  it("returns null when the envelope's ok flag is false", async () => {
    stubFetchOnce({ ok: true, json: async () => ({ ok: false }) });
    expect(await fetchMe()).toBeNull();
  });

  it("returns null when the HTTP response itself is not ok (guest)", async () => {
    stubFetchOnce({ ok: false });
    expect(await fetchMe()).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network down")));
    expect(await fetchMe()).toBeNull();
  });
});

describe("fetchMeServer", () => {
  it("returns the user for a well-formed response", async () => {
    stubFetchOnce({ ok: true, json: async () => okMe(validMe()) });
    expect(await fetchMeServer("cookie=1")).toEqual(validMe());
  });

  it("returns null for a malformed response", async () => {
    stubFetchOnce({ ok: true, json: async () => okMe({ id: "u1" }) });
    expect(await fetchMeServer("cookie=1")).toBeNull();
  });
});

describe("requestOtp", () => {
  it("returns the message for a well-formed response", async () => {
    stubFetchOnce({ ok: true, json: async () => okMe({ message: "کد ارسال شد" }) });
    const result = await requestOtp("09120000000");
    expect(result).toEqual({ ok: true, data: { message: "کد ارسال شد" } });
  });

  it("falls back to the generic error message on a malformed response", async () => {
    stubFetchOnce({ ok: true, json: async () => okMe({ message: 123 }) });
    const result = await requestOtp("09120000000");
    expect(result.ok).toBe(false);
  });
});

describe("verifyOtp", () => {
  it("returns the user for a well-formed response", async () => {
    stubFetchOnce({ ok: true, json: async () => okMe(validMe()) });
    const result = await verifyOtp("09120000000", "1234");
    expect(result).toEqual({ ok: true, data: validMe() });
  });

  it("fails with the generic message when the response is malformed", async () => {
    stubFetchOnce({ ok: true, json: async () => okMe({ id: "u1" }) });
    const result = await verifyOtp("09120000000", "1234");
    expect(result.ok).toBe(false);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { getHealth } from "./api-client.js";

describe("getHealth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a valid response from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ ok: true, data: { status: "up" } }),
      }),
    );

    await expect(getHealth()).resolves.toEqual({ ok: true, data: { status: "up" } });
  });

  it("throws when the API returns a payload that fails validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ ok: true, data: { status: "down" } }),
      }),
    );

    await expect(getHealth()).rejects.toThrow();
  });
});

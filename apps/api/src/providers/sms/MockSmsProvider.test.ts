import { describe, expect, it } from "vitest";
import { MockSmsProvider } from "./MockSmsProvider.js";

describe("MockSmsProvider", () => {
  it("resolves without making any real network call", async () => {
    const provider = new MockSmsProvider();
    await expect(provider.sendOtp("+989123456789", "123456")).resolves.toBeUndefined();
  });
});

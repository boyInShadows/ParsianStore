import { describe, expect, it } from "vitest";
import { CONFIG_PACKAGE_READY } from "./index.js";

describe("config package placeholder", () => {
  it("resolves and type-checks", () => {
    expect(CONFIG_PACKAGE_READY).toBe(true);
  });
});

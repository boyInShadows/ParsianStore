import { describe, expect, it } from "vitest";
import { env } from "./env.js";
import { testDbUri } from "./testDbUri.js";

describe("testDbUri", () => {
  it("swaps in the given database name while keeping host, port, credentials, and query", () => {
    const result = new URL(testDbUri("parsian-store-test-example"));
    const base = new URL(env.MONGODB_URI);

    expect(result.pathname).toBe("/parsian-store-test-example");
    expect(result.host).toBe(base.host);
    expect(result.username).toBe(base.username);
    expect(result.password).toBe(base.password);
    expect(result.search).toBe(base.search);
  });
});

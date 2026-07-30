import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { signAccessToken, verifyAccessToken } from "./jwt.js";

describe("signAccessToken / verifyAccessToken", () => {
  it("round-trips the payload", () => {
    const token = signAccessToken({ sub: "user-1", role: "customer", accountType: "wholesale" });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.role).toBe("customer");
    expect(payload.accountType).toBe("wholesale");
  });

  it("rejects a token signed with a different secret", () => {
    const forged = jwt.sign(
      { sub: "user-1", role: "admin" },
      "wrong-secret-at-least-32-chars-long",
    );
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign(
      { sub: "user-1", role: "customer", exp: Math.floor(Date.now() / 1000) - 10 },
      env.JWT_ACCESS_SECRET,
    );
    expect(() => verifyAccessToken(expired)).toThrow();
  });

  it("rejects garbage input", () => {
    expect(() => verifyAccessToken("not-a-jwt")).toThrow();
  });
});

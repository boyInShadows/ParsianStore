import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../../config/testDb.js";
import { RefreshTokenModel } from "./RefreshToken.js";

beforeAll(async () => {
  await resetDb();
  // See OtpToken.test.ts — waits for background index builds so the
  // unique/TTL assertions below don't race an as-yet-unbuilt index.
  await RefreshTokenModel.init();
});

afterAll(async () => {
  await disconnectDB();
});

describe("RefreshTokenModel", () => {
  it("defaults revokedAt to null", async () => {
    const token = await RefreshTokenModel.create({
      userId: randomUUID(),
      tokenHash: "hashed-token-1",
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    expect(token.revokedAt).toBeNull();
  });

  it("enforces a unique tokenHash", async () => {
    const userId = randomUUID();
    await RefreshTokenModel.create({
      userId,
      tokenHash: "duplicate-hash",
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await expect(
      RefreshTokenModel.create({
        userId,
        tokenHash: "duplicate-hash",
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    ).rejects.toThrow();
  });

  it("has a TTL index on expiresAt", async () => {
    const indexes = await RefreshTokenModel.collection.indexes();
    const ttlIndex = indexes.find((index) => "expiresAt" in index.key);
    expect(ttlIndex?.expireAfterSeconds).toBe(0);
  });
});

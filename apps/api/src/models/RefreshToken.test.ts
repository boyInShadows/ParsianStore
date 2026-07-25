import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { RefreshTokenModel } from "./RefreshToken.js";

const TEST_URI = testDbUri("parsian-store-test-refresh-token");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  // See OtpToken.test.ts — waits for background index builds so the
  // unique/TTL assertions below don't race an as-yet-unbuilt index.
  await RefreshTokenModel.init();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("RefreshTokenModel", () => {
  it("defaults revokedAt to null", async () => {
    const token = await RefreshTokenModel.create({
      userId: new mongoose.Types.ObjectId(),
      tokenHash: "hashed-token-1",
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    expect(token.revokedAt).toBeNull();
  });

  it("enforces a unique tokenHash", async () => {
    const userId = new mongoose.Types.ObjectId();
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

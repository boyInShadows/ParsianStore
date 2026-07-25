import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { OtpTokenModel } from "./OtpToken.js";

const TEST_URI = testDbUri("parsian-store-test-otp-token");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  // Mongoose builds indexes in the background after connecting; without
  // waiting here, the unique/TTL assertions below can race a not-yet-built
  // index and see the collection as if it had none.
  await OtpTokenModel.init();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("OtpTokenModel", () => {
  it("defaults attempts to 0 and purpose to login", async () => {
    const otp = await OtpTokenModel.create({
      phone: "+989120000001",
      codeHash: "hashed",
      expiresAt: new Date(Date.now() + 120_000),
    });
    expect(otp.attempts).toBe(0);
    expect(otp.purpose).toBe("login");
  });

  it("has a TTL index on expiresAt so Mongo expires it automatically", async () => {
    const indexes = await OtpTokenModel.collection.indexes();
    const ttlIndex = indexes.find((index) => "expiresAt" in index.key);
    expect(ttlIndex?.expireAfterSeconds).toBe(0);
  });
});

import { afterAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "./db.js";

// Against a real local MongoDB — see plugins.test.ts for why. Dedicated
// throwaway database, dropped in afterAll.
const TEST_HOST = process.env.TEST_MONGODB_HOST ?? "mongodb://localhost:27017";
const TEST_URI = `${TEST_HOST}/parsian-store-test-db`;

describe("connectDB / disconnectDB", () => {
  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await disconnectDB();
    }
  });

  it("connects to the given URI and reports the ready state", async () => {
    await connectDB(TEST_URI);
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    expect(mongoose.connection.name).toBe("parsian-store-test-db");
  });

  it("disconnects cleanly", async () => {
    await disconnectDB();
    expect(mongoose.connection.readyState).toBe(0); // 0 = disconnected
  });
});

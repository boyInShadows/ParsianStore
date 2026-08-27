import { afterAll, describe, expect, it } from "vitest";
import { connectDB, disconnectDB } from "./db.js";
import { disconnectDB } from "../../config/testDb.js";

// Against a real local MongoDB — see plugins.test.ts for why. Dedicated
// throwaway database, dropped in afterAll.

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

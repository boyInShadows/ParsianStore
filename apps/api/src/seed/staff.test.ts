import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { UserModel } from "../models/User.js";
import { seedStaff } from "./staff.js";

const TEST_URI = testDbUri("parsian-store-test-seed-staff");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

beforeEach(async () => {
  await UserModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("seedStaff", () => {
  it("creates exactly one superadmin for the given phone", async () => {
    await seedStaff("09121110099");

    const user = await UserModel.findOne({ phone: "+989121110099" });
    expect(user).not.toBeNull();
    expect(user?.role).toBe("superadmin");
  });

  it("is idempotent — running it again does not create a duplicate", async () => {
    await seedStaff("09121110099");
    await seedStaff("09121110099");

    const count = await UserModel.countDocuments({ phone: "+989121110099" });
    expect(count).toBe(1);
  });

  it("is a no-op when no phone is provided (e.g. ADMIN_SEED_PHONE unset)", async () => {
    await seedStaff(undefined);
    expect(await UserModel.countDocuments({})).toBe(0);
  });
});

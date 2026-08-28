import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../config/prisma.js";
import { disconnectDB, resetDb } from "../config/testDb.js";
import { seedStaff } from "./staff.js";

beforeAll(async () => {
  await resetDb();
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDB();
});

describe("seedStaff", () => {
  it("creates exactly one superadmin for the given phone", async () => {
    await seedStaff("09121110099");

    const user = await prisma.user.findFirst({ where: { phone: "+989121110099" } });
    expect(user).not.toBeNull();
    expect(user?.role).toBe("superadmin");
  });

  it("is idempotent — running it again does not create a duplicate", async () => {
    await seedStaff("09121110099");
    await seedStaff("09121110099");

    const count = await prisma.user.count({ where: { phone: "+989121110099" } });
    expect(count).toBe(1);
  });

  it("is a no-op when no phone is provided (e.g. ADMIN_SEED_PHONE unset)", async () => {
    await seedStaff(undefined);
    expect(await prisma.user.count()).toBe(0);
  });
});

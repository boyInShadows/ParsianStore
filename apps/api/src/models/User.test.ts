import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { UserModel } from "./User.js";

const TEST_URI = testDbUri("parsian-store-test-user");

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  // Waits for background index builds — see OtpToken.test.ts for why this
  // matters for the uniqueness assertion below.
  await UserModel.init();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("UserModel", () => {
  it("defaults role to customer and walletBalanceRial to 0", async () => {
    const user = await UserModel.create({ phone: "+989120000001", name: "Test User" });
    expect(user.role).toBe("customer");
    expect(user.walletBalanceRial).toBe(0);
    expect(user.isActive).toBe(true);
    expect(user.lastLoginAt).toBeNull();
    expect(user.addresses).toEqual([]);
    expect(user.garage).toEqual([]);
  });

  // P6.S1: accountType is a separate pricing-tier concept from role -- a
  // wholesale customer is still role: "customer". No self-service signup
  // path sets this to "wholesale"; every real user starts retail.
  it("defaults accountType to retail", async () => {
    const user = await UserModel.create({ phone: "+989120000006", name: "Retail By Default" });
    expect(user.accountType).toBe("retail");
  });

  it("enforces a unique phone number", async () => {
    await UserModel.create({ phone: "+989120000002", name: "First" });
    await expect(UserModel.create({ phone: "+989120000002", name: "Second" })).rejects.toThrow();
  });

  it("never returns passwordHash unless explicitly selected", async () => {
    await UserModel.create({
      phone: "+989120000003",
      name: "Has Password",
      passwordHash: "hashed",
    });

    const found = await UserModel.findOne({ phone: "+989120000003" });
    expect(found?.passwordHash).toBeUndefined();

    const withPassword = await UserModel.findOne({ phone: "+989120000003" }).select(
      "+passwordHash",
    );
    expect(withPassword?.passwordHash).toBe("hashed");
  });

  it("toJSON strips _id/__v/passwordHash and exposes a plain id", async () => {
    const user = await UserModel.create({ phone: "+989120000004", name: "JSON Check" });
    const json = user.toJSON() as Record<string, unknown>;
    expect(json.id).toBe(user._id.toString());
    expect(json._id).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(json.passwordHash).toBeUndefined();
  });

  it("soft-deletes without a hard delete", async () => {
    const user = await UserModel.create({ phone: "+989120000005", name: "Deletable" });
    await user.softDelete();

    const foundDefault = await UserModel.findById(user._id);
    expect(foundDefault).toBeNull();

    const foundExplicit = await UserModel.findOne({ _id: user._id, deletedAt: { $ne: null } });
    expect(foundExplicit).not.toBeNull();
  });
});

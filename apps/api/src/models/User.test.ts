import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../config/testDb.js";
import { UserModel } from "./User.js";

beforeAll(async () => {
  await resetDb();
  // Waits for background index builds — see OtpToken.test.ts for why this
  // matters for the uniqueness assertion below.
  await UserModel.init();
});

afterAll(async () => {
  await disconnectDB();
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

  // P6.S2: Address.provinceId/cityId are real ObjectId refs now (migrated
  // off plain province/city strings) -- confirms the embedded subdocument
  // round-trips correctly through toJSON with a real `id`, same style as
  // the top-level user object's own toJSON check above.
  it("round-trips an embedded address with provinceId/cityId through toJSON", async () => {
    const provinceId = randomUUID();
    const cityId = randomUUID();
    const user = await UserModel.create({
      phone: "+989120000007",
      name: "Has Address",
      addresses: [
        {
          provinceId,
          cityId,
          line: "خیابان ولیعصر",
          postalCode: "1234567890",
          receiverName: "علی رضایی",
          receiverPhone: "+989121234567",
        },
      ],
    });

    expect(user.addresses).toHaveLength(1);
    expect(user.addresses[0]!.provinceId.toString()).toBe(provinceId.toString());
    expect(user.addresses[0]!.cityId.toString()).toBe(cityId.toString());
    expect(user.addresses[0]!._id).toBeDefined();

    const reloaded = await UserModel.findById(user._id);
    expect(reloaded!.addresses[0]!.provinceId.toString()).toBe(provinceId.toString());
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

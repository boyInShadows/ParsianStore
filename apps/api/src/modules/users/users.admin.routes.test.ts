import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { UserModel, type UserRole } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

const TEST_URI = testDbUri("parsian-store-test-users-admin-routes");
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected server to bind to a TCP port");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await UserModel.deleteMany({});
});

afterAll(async () => {
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

interface Envelope<T> {
  ok: boolean;
  data: T;
  meta?: { total: number; page: number; limit: number };
}

interface CustomerBody {
  id: string;
  phone: string;
  accountType: "retail" | "wholesale";
  role: string;
}

function staffCookie(role: UserRole = "admin"): Record<string, string> {
  const token = signAccessToken({
    sub: new mongoose.Types.ObjectId().toString(),
    role,
    accountType: "retail",
  });
  return { cookie: `accessToken=${token}` };
}

async function seedCustomer(phone: string, name = "مشتری") {
  return UserModel.create({ phone, name, role: "customer" });
}

describe("admin customers routes", () => {
  it("rejects an unauthenticated caller", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/customers`);
    expect(res.status).toBe(401);
  });

  it("rejects a signed-in customer", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/customers`, {
      headers: staffCookie("customer"),
    });
    expect(res.status).toBe(403);
  });

  it("lists customers and excludes staff accounts", async () => {
    await seedCustomer("+989120000001");
    await UserModel.create({ phone: "+989120000002", name: "کارمند", role: "admin" });

    const res = await fetch(`${baseUrl}/api/v1/admin/customers`, { headers: staffCookie() });
    const body = (await res.json()) as Envelope<CustomerBody[]>;

    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.phone).toBe("+989120000001");
  });

  it("never leaks passwordHash in a list response", async () => {
    await seedCustomer("+989120000003");

    const res = await fetch(`${baseUrl}/api/v1/admin/customers`, { headers: staffCookie() });
    const raw = await res.text();

    expect(raw).not.toContain("passwordHash");
  });

  // The screen renders phone/name/role/accountType and nothing else, so
  // the endpoint should not be shipping the rest of the user document.
  it("sends only the fields the customers screen renders", async () => {
    await seedCustomer("+989120000010");

    const res = await fetch(`${baseUrl}/api/v1/admin/customers`, { headers: staffCookie() });
    const body = (await res.json()) as Envelope<Record<string, unknown>[]>;

    expect(Object.keys(body.data[0] ?? {}).sort()).toEqual([
      "accountType",
      "createdAt",
      "id",
      "name",
      "phone",
      "role",
    ]);
  });

  it("defaults a new customer to retail", async () => {
    const user = await seedCustomer("+989120000004");
    expect(user.accountType).toBe("retail");
  });

  it("flips a customer to wholesale", async () => {
    const user = await seedCustomer("+989120000005");

    const res = await fetch(`${baseUrl}/api/v1/admin/customers/${user.id}/account-type`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ accountType: "wholesale" }),
    });
    expect(res.status).toBe(200);

    const stored = await UserModel.findById(user.id);
    expect(stored?.accountType).toBe("wholesale");
  });

  it("rejects an account type outside the enum", async () => {
    const user = await seedCustomer("+989120000006");

    const res = await fetch(`${baseUrl}/api/v1/admin/customers/${user.id}/account-type`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ accountType: "vip" }),
    });
    expect(res.status).toBe(400);
  });

  it("refuses to set an account type on a staff account", async () => {
    const staff = await UserModel.create({
      phone: "+989120000007",
      name: "اپراتور",
      role: "operator",
    });

    const res = await fetch(`${baseUrl}/api/v1/admin/customers/${staff.id}/account-type`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...staffCookie() },
      body: JSON.stringify({ accountType: "wholesale" }),
    });
    expect(res.status).toBe(400);
  });

  // The stored phone is always the normalized "+98…" form, but staff
  // search with whatever they have written down. The *leading* fragment
  // cases matter most: an earlier suffix-anchored regex passed every
  // trailing-fragment test here while returning nothing at all for
  // someone typing "0912…", which is how staff actually search.
  it.each([
    ["09121110099", "national with leading zero"],
    ["+989121110099", "full international"],
    ["9121110099", "bare national"],
    ["۰۹۱۲۱۱۱۰۰۹۹", "Persian digits"],
    ["1110099", "trailing fragment"],
    ["0912", "leading fragment with zero"],
    ["912111", "leading fragment, bare"],
    ["211100", "middle fragment"],
  ])("finds a customer by phone written as %s (%s)", async (typed) => {
    await seedCustomer("+989121110099");

    const res = await fetch(
      `${baseUrl}/api/v1/admin/customers?phone=${encodeURIComponent(typed)}`,
      { headers: staffCookie() },
    );
    const body = (await res.json()) as Envelope<CustomerBody[]>;

    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.phone).toBe("+989121110099");
  });

  it("filters by account type", async () => {
    await seedCustomer("+989120000008");
    const wholesale = await seedCustomer("+989120000009");
    wholesale.accountType = "wholesale";
    await wholesale.save();

    const res = await fetch(`${baseUrl}/api/v1/admin/customers?accountType=wholesale`, {
      headers: staffCookie(),
    });
    const body = (await res.json()) as Envelope<CustomerBody[]>;

    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.phone).toBe("+989120000009");
  });

  it("returns 404 for an unknown customer id", async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/admin/customers/${new mongoose.Types.ObjectId().toString()}`,
      { headers: staffCookie() },
    );
    expect(res.status).toBe(404);
  });
});

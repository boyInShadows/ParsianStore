import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { CityModel } from "../../models/City.js";
import { OrderModel, type OrderStatus } from "../../models/Order.js";
import { ProvinceModel } from "../../models/Province.js";
import { UserModel, type UserRole } from "../../models/User.js";
import { VehicleGenModel } from "../../models/VehicleGen.js";
import { VehicleMakeModel } from "../../models/VehicleMake.js";
import { VehicleModelModel } from "../../models/VehicleModel.js";
import { signAccessToken } from "../../utils/jwt.js";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

beforeEach(async () => {
  await UserModel.deleteMany({});
});

afterAll(async () => {
  close();
  await disconnectDB();
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
    sub: randomUUID(),
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
    const res = await fetch(`${baseUrl}/api/v1/admin/customers/${randomUUID()}`, {
      headers: staffCookie(),
    });
    expect(res.status).toBe(404);
  });
});

// --------------------------------------------------------------------------
// P8.S7 -- detail view
// --------------------------------------------------------------------------

interface DetailBody {
  id: string;
  phone: string;
  walletBalanceRial: number;
  stats: {
    orderCount: number;
    lifetimeValueRial: number;
    averageOrderRial: number;
    lastOrderAt: string | null;
    openOrderCount: number;
  };
  addresses: { province: string; city: string; line: string }[];
  garage: { make: string; model: string; year: number }[];
  recentOrders: { code: string; status: string }[];
}

const LOCALIZED = { fa: "نمونه", en: "Sample" };

let detailOrderCounter = 0;

async function seedOrderFor(
  userId: mongoose.Types.ObjectId,
  status: OrderStatus,
  totalRial: number,
) {
  detailOrderCounter += 1;
  return OrderModel.create({
    code: `PS-D-${String(detailOrderCounter).padStart(4, "0")}`,
    userId,
    items: [
      {
        productId: randomUUID(),
        nameSnapshot: LOCALIZED,
        skuSnapshot: `SKU-D-${detailOrderCounter}`,
        qty: 1,
        priceRial: totalRial,
      },
    ],
    subtotalRial: totalRial,
    shippingRial: 0,
    totalRial,
    address: {
      province: LOCALIZED,
      city: LOCALIZED,
      line: "خیابان نمونه",
      postalCode: "1234567890",
      receiverName: "گیرنده",
      receiverPhone: "+989120000000",
    },
    shippingMethod: { code: "post", name: LOCALIZED, priceRial: 0 },
    status,
  });
}

async function getDetail(id: string): Promise<{ status: number; body: DetailBody }> {
  const res = await fetch(`${baseUrl}/api/v1/admin/customers/${id}`, { headers: staffCookie() });
  const json = (await res.json()) as { data: DetailBody };
  return { status: res.status, body: json.data };
}

describe("admin customer detail", () => {
  beforeEach(async () => {
    await Promise.all([
      OrderModel.deleteMany({}),
      ProvinceModel.deleteMany({}),
      CityModel.deleteMany({}),
      VehicleMakeModel.deleteMany({}),
      VehicleModelModel.deleteMany({}),
      VehicleGenModel.deleteMany({}),
    ]);
  });

  it("rejects a signed-in customer", async () => {
    const user = await seedCustomer("+989121230001");
    const res = await fetch(`${baseUrl}/api/v1/admin/customers/${user.id}`, {
      headers: staffCookie("customer"),
    });
    expect(res.status).toBe(403);
  });

  it("counts only paid-through-delivered orders toward lifetime value", async () => {
    const user = await seedCustomer("+989121230002");
    await seedOrderFor(user._id, "paid", 1_000_000);
    await seedOrderFor(user._id, "delivered", 3_000_000);
    await seedOrderFor(user._id, "cancelled", 9_000_000);
    await seedOrderFor(user._id, "pending", 9_000_000);

    const { body } = await getDetail(user.id);

    expect(body.stats.orderCount).toBe(2);
    expect(body.stats.lifetimeValueRial).toBe(4_000_000);
    expect(body.stats.averageOrderRial).toBe(2_000_000);
  });

  it("counts pending and processing orders as open work", async () => {
    const user = await seedCustomer("+989121230003");
    await seedOrderFor(user._id, "pending", 1_000_000);
    await seedOrderFor(user._id, "processing", 1_000_000);
    await seedOrderFor(user._id, "delivered", 1_000_000);

    const { body } = await getDetail(user.id);

    expect(body.stats.openOrderCount).toBe(2);
  });

  it("never attributes another customer's orders", async () => {
    const user = await seedCustomer("+989121230004");
    const other = await seedCustomer("+989121230005");
    await seedOrderFor(other._id, "paid", 5_000_000);

    const { body } = await getDetail(user.id);

    expect(body.stats.orderCount).toBe(0);
    expect(body.recentOrders).toHaveLength(0);
  });

  it("resolves province and city names on each address", async () => {
    const province = await ProvinceModel.create({
      name: { fa: "تهران", en: "Tehran" },
      slug: "tehran",
    });
    const city = await CityModel.create({
      provinceId: province._id,
      name: { fa: "شهریار", en: "Shahriar" },
      slug: "shahriar",
    });
    const user = await seedCustomer("+989121230006");
    user.addresses.push({
      provinceId: province._id,
      cityId: city._id,
      line: "خیابان اول",
      postalCode: "1111111111",
      receiverName: "گیرنده",
      receiverPhone: "+989120000000",
    });
    await user.save();

    const { body } = await getDetail(user.id);

    expect(body.addresses[0]?.province).toBe("تهران");
    expect(body.addresses[0]?.city).toBe("شهریار");
  });

  // A province that was deleted after the address was saved must not blank
  // out the street line staff still need to read.
  it("keeps an address readable when its province no longer resolves", async () => {
    const user = await seedCustomer("+989121230007");
    user.addresses.push({
      provinceId: randomUUID(),
      cityId: randomUUID(),
      line: "خیابان دوم",
      postalCode: "2222222222",
      receiverName: "گیرنده",
      receiverPhone: "+989120000000",
    });
    await user.save();

    const { body } = await getDetail(user.id);

    expect(body.addresses[0]?.province).toBe("—");
    expect(body.addresses[0]?.line).toBe("خیابان دوم");
  });

  it("resolves the garage vehicle names", async () => {
    const make = await VehicleMakeModel.create({
      name: { fa: "سایپا", en: "Saipa" },
      slug: "saipa",
      country: "ایران",
      isDomestic: true,
    });
    const model = await VehicleModelModel.create({
      makeId: make._id,
      name: { fa: "پراید", en: "Pride" },
      slug: "pride",
      bodyType: "hatchback",
    });
    const generation = await VehicleGenModel.create({
      modelId: model._id,
      name: { fa: "۱۳۱", en: "131" },
      yearFrom: 2008,
      facelift: false,
    });
    const user = await seedCustomer("+989121230008");
    user.garage.push({
      makeId: make._id,
      modelId: model._id,
      genId: generation._id,
      year: 2015,
      nickname: "ماشین کار",
    });
    await user.save();

    const { body } = await getDetail(user.id);

    expect(body.garage[0]?.make).toBe("سایپا");
    expect(body.garage[0]?.model).toBe("پراید");
    expect(body.garage[0]?.year).toBe(2015);
  });

  it("never leaks passwordHash on the detail response", async () => {
    const user = await seedCustomer("+989121230009");
    const res = await fetch(`${baseUrl}/api/v1/admin/customers/${user.id}`, {
      headers: staffCookie(),
    });
    expect(await res.text()).not.toContain("passwordHash");
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { testDbUri } from "../../config/testDbUri.js";
import { CityModel } from "../../models/City.js";
import { ProvinceModel } from "../../models/Province.js";
import { UserModel } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

const TEST_URI = testDbUri("parsian-store-test-addresses-routes");
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
  await Promise.all([
    UserModel.deleteMany({}),
    ProvinceModel.deleteMany({}),
    CityModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

interface Envelope<T> {
  ok: boolean;
  data: T;
}

interface AddressDto {
  id: string;
  province: { id: string; name: { fa: string; en: string }; slug: string };
  city: { id: string; name: { fa: string; en: string }; slug: string };
  line: string;
  postalCode: string;
  receiverName: string;
  receiverPhone: string;
}

// addresses.service.ts looks the caller up via UserModel.findById -- unlike
// Wishlist (which never touches UserModel at all), a real User document is
// required for these routes, not just a bare ObjectId in the JWT.
async function createUser(overrides: Record<string, unknown> = {}) {
  return UserModel.create({
    phone: `+989${Math.floor(100000000 + Math.random() * 800000000)}`,
    name: "Test User",
    ...overrides,
  });
}

function customerCookie(userId: string): Record<string, string> {
  const token = signAccessToken({ sub: userId, role: "customer", accountType: "retail" });
  return { cookie: `accessToken=${token}` };
}

async function seedGeo() {
  const province = await ProvinceModel.create({
    name: { fa: "تهران", en: "Tehran" },
    slug: `tehran-${new mongoose.Types.ObjectId().toString()}`,
  });
  const otherProvince = await ProvinceModel.create({
    name: { fa: "فارس", en: "Fars" },
    slug: `fars-${new mongoose.Types.ObjectId().toString()}`,
  });
  const city = await CityModel.create({
    provinceId: province._id,
    name: { fa: "تهران", en: "Tehran" },
    slug: `tehran-city-${new mongoose.Types.ObjectId().toString()}`,
  });
  const cityInOtherProvince = await CityModel.create({
    provinceId: otherProvince._id,
    name: { fa: "شیراز", en: "Shiraz" },
    slug: `shiraz-${new mongoose.Types.ObjectId().toString()}`,
  });
  return { province, otherProvince, city, cityInOtherProvince };
}

function addressPayload(overrides: Record<string, unknown> = {}) {
  return {
    line: "خیابان ولیعصر، پلاک ۱۲",
    postalCode: "1234567890",
    plate: "۱۲",
    unit: "۳",
    receiverName: "علی رضایی",
    receiverPhone: "09121234567",
    ...overrides,
  };
}

describe("GET/POST/PATCH/DELETE /me/addresses", () => {
  it("rejects every route without a session", async () => {
    const results = await Promise.all([
      fetch(`${baseUrl}/api/v1/me/addresses`),
      fetch(`${baseUrl}/api/v1/me/addresses`, { method: "POST" }),
      fetch(`${baseUrl}/api/v1/me/addresses/${new mongoose.Types.ObjectId().toString()}`, {
        method: "PATCH",
      }),
      fetch(`${baseUrl}/api/v1/me/addresses/${new mongoose.Types.ObjectId().toString()}`, {
        method: "DELETE",
      }),
    ]);
    for (const res of results) {
      expect(res.status).toBe(401);
    }
  });

  it("returns an empty list for a fresh user", async () => {
    const user = await createUser();
    const res = await fetch(`${baseUrl}/api/v1/me/addresses`, {
      headers: customerCookie(user.id as string),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<AddressDto[]>;
    expect(body.data).toEqual([]);
  });

  it("creates an address and lists it back with hydrated province/city names", async () => {
    const user = await createUser();
    const { province, city } = await seedGeo();

    const createRes = await fetch(`${baseUrl}/api/v1/me/addresses`, {
      method: "POST",
      headers: { ...customerCookie(user.id as string), "content-type": "application/json" },
      body: JSON.stringify(
        addressPayload({ provinceId: province._id.toString(), cityId: city._id.toString() }),
      ),
    });
    expect(createRes.status).toBe(200);
    const createBody = (await createRes.json()) as Envelope<AddressDto>;
    expect(createBody.data.province.slug).toBe(province.slug);
    expect(createBody.data.city.slug).toBe(city.slug);
    expect(createBody.data.line).toBe("خیابان ولیعصر، پلاک ۱۲");

    const listRes = await fetch(`${baseUrl}/api/v1/me/addresses`, {
      headers: customerCookie(user.id as string),
    });
    const listBody = (await listRes.json()) as Envelope<AddressDto[]>;
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0]!.id).toBe(createBody.data.id);
  });

  it("400s when cityId doesn't belong to provinceId", async () => {
    const user = await createUser();
    const { province, cityInOtherProvince } = await seedGeo();

    const res = await fetch(`${baseUrl}/api/v1/me/addresses`, {
      method: "POST",
      headers: { ...customerCookie(user.id as string), "content-type": "application/json" },
      body: JSON.stringify(
        addressPayload({
          provinceId: province._id.toString(),
          cityId: cityInOtherProvince._id.toString(),
        }),
      ),
    });
    expect(res.status).toBe(400);
  });

  it("accepts a valid postal code typed entirely in Persian digits, normalized to ASCII", async () => {
    const user = await createUser();
    const { province, city } = await seedGeo();

    const res = await fetch(`${baseUrl}/api/v1/me/addresses`, {
      method: "POST",
      headers: { ...customerCookie(user.id as string), "content-type": "application/json" },
      body: JSON.stringify(
        addressPayload({
          provinceId: province._id.toString(),
          cityId: city._id.toString(),
          postalCode: "۱۲۳۴۵۶۷۸۹۰",
        }),
      ),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<AddressDto>;
    expect(body.data.postalCode).toBe("1234567890");
  });

  it("400s on a malformed postal code, including one typed in Persian digits", async () => {
    const user = await createUser();
    const { province, city } = await seedGeo();

    const res = await fetch(`${baseUrl}/api/v1/me/addresses`, {
      method: "POST",
      headers: { ...customerCookie(user.id as string), "content-type": "application/json" },
      body: JSON.stringify(
        addressPayload({
          provinceId: province._id.toString(),
          cityId: city._id.toString(),
          // Persian digits, and too short -- normalizePostalCode must run
          // before the 10-digit regex check for this to correctly reject.
          postalCode: "۱۲۳۴۵",
        }),
      ),
    });
    expect(res.status).toBe(400);
  });

  it("updates an address in place, keeping the same id", async () => {
    const user = await createUser();
    const { province, city } = await seedGeo();
    const cookie = customerCookie(user.id as string);

    const createRes = await fetch(`${baseUrl}/api/v1/me/addresses`, {
      method: "POST",
      headers: { ...cookie, "content-type": "application/json" },
      body: JSON.stringify(
        addressPayload({ provinceId: province._id.toString(), cityId: city._id.toString() }),
      ),
    });
    const createBody = (await createRes.json()) as Envelope<AddressDto>;

    const updateRes = await fetch(`${baseUrl}/api/v1/me/addresses/${createBody.data.id}`, {
      method: "PATCH",
      headers: { ...cookie, "content-type": "application/json" },
      body: JSON.stringify(
        addressPayload({
          provinceId: province._id.toString(),
          cityId: city._id.toString(),
          line: "خیابان انقلاب، پلاک ۵",
        }),
      ),
    });
    expect(updateRes.status).toBe(200);
    const updateBody = (await updateRes.json()) as Envelope<AddressDto>;
    expect(updateBody.data.id).toBe(createBody.data.id);
    expect(updateBody.data.line).toBe("خیابان انقلاب، پلاک ۵");
  });

  it("404s updating an address id that doesn't belong to the caller", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const { province, city } = await seedGeo();

    const createRes = await fetch(`${baseUrl}/api/v1/me/addresses`, {
      method: "POST",
      headers: {
        ...customerCookie(owner.id as string),
        "content-type": "application/json",
      },
      body: JSON.stringify(
        addressPayload({ provinceId: province._id.toString(), cityId: city._id.toString() }),
      ),
    });
    const createBody = (await createRes.json()) as Envelope<AddressDto>;

    const updateRes = await fetch(`${baseUrl}/api/v1/me/addresses/${createBody.data.id}`, {
      method: "PATCH",
      headers: {
        ...customerCookie(stranger.id as string),
        "content-type": "application/json",
      },
      body: JSON.stringify(
        addressPayload({ provinceId: province._id.toString(), cityId: city._id.toString() }),
      ),
    });
    expect(updateRes.status).toBe(404);
  });

  it("deletes an address, and 404s deleting it again (not idempotent, unlike wishlist)", async () => {
    const user = await createUser();
    const { province, city } = await seedGeo();
    const cookie = customerCookie(user.id as string);

    const createRes = await fetch(`${baseUrl}/api/v1/me/addresses`, {
      method: "POST",
      headers: { ...cookie, "content-type": "application/json" },
      body: JSON.stringify(
        addressPayload({ provinceId: province._id.toString(), cityId: city._id.toString() }),
      ),
    });
    const createBody = (await createRes.json()) as Envelope<AddressDto>;

    const deleteRes = await fetch(`${baseUrl}/api/v1/me/addresses/${createBody.data.id}`, {
      method: "DELETE",
      headers: cookie,
    });
    expect(deleteRes.status).toBe(200);

    const secondDeleteRes = await fetch(`${baseUrl}/api/v1/me/addresses/${createBody.data.id}`, {
      method: "DELETE",
      headers: cookie,
    });
    expect(secondDeleteRes.status).toBe(404);
  });
});

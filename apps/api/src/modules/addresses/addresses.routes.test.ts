import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb, startTestServer } from "../../config/testDb.js";
import { seedUser, uniqueSuffix } from "../../test/factories.js";
import { signAccessToken } from "../../utils/jwt.js";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  ({ baseUrl, close } = await startTestServer());
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  close();
  await disconnectDB();
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

// An address row has a foreign key to its owner, so these routes need a real
// user -- not just a subject id inside a signed token, which is all Wishlist
// ever needed.
async function createUser(overrides: Record<string, unknown> = {}) {
  return seedUser({ name: "Test User", ...overrides });
}

function customerCookie(userId: string): Record<string, string> {
  const token = signAccessToken({ sub: userId, role: "customer", accountType: "retail" });
  return { cookie: `accessToken=${token}` };
}

async function seedGeo() {
  const province = await prisma.province.create({
    data: { nameFa: "تهران", nameEn: "Tehran", slug: `tehran-${uniqueSuffix()}` },
  });
  const otherProvince = await prisma.province.create({
    data: { nameFa: "فارس", nameEn: "Fars", slug: `fars-${uniqueSuffix()}` },
  });
  const city = await prisma.city.create({
    data: {
      provinceId: province.id,
      nameFa: "تهران",
      nameEn: "Tehran",
      slug: `tehran-city-${uniqueSuffix()}`,
    },
  });
  const cityInOtherProvince = await prisma.city.create({
    data: {
      provinceId: otherProvince.id,
      nameFa: "شیراز",
      nameEn: "Shiraz",
      slug: `shiraz-${uniqueSuffix()}`,
    },
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
      fetch(`${baseUrl}/api/v1/me/addresses/${randomUUID()}`, {
        method: "PATCH",
      }),
      fetch(`${baseUrl}/api/v1/me/addresses/${randomUUID()}`, {
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
      body: JSON.stringify(addressPayload({ provinceId: province.id, cityId: city.id })),
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
          provinceId: province.id,
          cityId: cityInOtherProvince.id,
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
          provinceId: province.id,
          cityId: city.id,
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
          provinceId: province.id,
          cityId: city.id,
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
      body: JSON.stringify(addressPayload({ provinceId: province.id, cityId: city.id })),
    });
    const createBody = (await createRes.json()) as Envelope<AddressDto>;

    const updateRes = await fetch(`${baseUrl}/api/v1/me/addresses/${createBody.data.id}`, {
      method: "PATCH",
      headers: { ...cookie, "content-type": "application/json" },
      body: JSON.stringify(
        addressPayload({
          provinceId: province.id,
          cityId: city.id,
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
      body: JSON.stringify(addressPayload({ provinceId: province.id, cityId: city.id })),
    });
    const createBody = (await createRes.json()) as Envelope<AddressDto>;

    const updateRes = await fetch(`${baseUrl}/api/v1/me/addresses/${createBody.data.id}`, {
      method: "PATCH",
      headers: {
        ...customerCookie(stranger.id as string),
        "content-type": "application/json",
      },
      body: JSON.stringify(addressPayload({ provinceId: province.id, cityId: city.id })),
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
      body: JSON.stringify(addressPayload({ provinceId: province.id, cityId: city.id })),
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

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, prisma, resetDb, startTestServer } from "../../config/testDb.js";
import { seedGeo } from "../../seed/geo.js";

let baseUrl: string;
let close: () => void;

beforeAll(async () => {
  await resetDb();
  await seedGeo();
  ({ baseUrl, close } = await startTestServer());
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

describe("GET /geo/provinces", () => {
  it("returns all 31 provinces, paginated", async () => {
    const res = await fetch(`${baseUrl}/api/v1/geo/provinces?limit=100`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ slug: string }[]>;
    expect(body.meta).toEqual({ total: 31, page: 1, limit: 100 });
    expect(body.data.map((p) => p.slug)).toContain("tehran");
  });

  it("still emits the localized name as { fa, en }, not the two columns", async () => {
    const res = await fetch(`${baseUrl}/api/v1/geo/provinces?limit=1`);
    const body = (await res.json()) as Envelope<{ name: { fa: string; en: string } }[]>;
    expect(body.data[0]!.name).toEqual({
      fa: expect.any(String) as unknown as string,
      en: expect.any(String) as unknown as string,
    });
  });

  it("clamps a limit over 100", async () => {
    const res = await fetch(`${baseUrl}/api/v1/geo/provinces?limit=500`);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.meta?.limit).toBe(100);
  });

  it("ignores a ?sort naming a column that does not exist", async () => {
    // Mongoose silently ignored an unknown sort path; Prisma throws on an
    // unknown orderBy key, so parseSort() drops it rather than 500ing.
    const res = await fetch(`${baseUrl}/api/v1/geo/provinces?sort=notAColumn`);
    expect(res.status).toBe(200);
  });
});

describe("GET /geo/cities", () => {
  it("filters by provinceId", async () => {
    const tehran = await prisma.province.findUnique({ where: { slug: "tehran" } });
    const res = await fetch(`${baseUrl}/api/v1/geo/cities?provinceId=${tehran!.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Envelope<{ provinceId: string }[]>;
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((c) => c.provinceId === tehran!.id)).toBe(true);
  });

  it("rejects a malformed provinceId", async () => {
    const res = await fetch(`${baseUrl}/api/v1/geo/cities?provinceId=not-a-uuid`);
    expect(res.status).toBe(400);
  });

  it("returns every seeded city when no provinceId is given", async () => {
    const res = await fetch(`${baseUrl}/api/v1/geo/cities?limit=100`);
    const body = (await res.json()) as Envelope<unknown[]>;
    expect(body.meta?.total).toBeGreaterThan(31);
  });
});

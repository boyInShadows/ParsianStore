import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../config/prisma.js";
import { disconnectDB, resetDb } from "../config/testDb.js";
import { seedProduct } from "../test/factories.js";
import { cursorPaginate } from "./cursorPaginate.js";

/**
 * Products, not a throwaway model.
 *
 * Mongoose let a test register an ad-hoc schema at runtime; Prisma's client
 * is generated from schema.prisma, so a fixture has to be a table that
 * actually exists. Product is the right one anyway -- it is the only thing
 * this helper is used for in the app (the PLP's cursor-paged grid), and it
 * has both a numeric sort field and a timestamp.
 */
const Widget = prisma.product;

async function seedWidget(name: string, priceRial: number) {
  return seedProduct({ nameFa: name, nameEn: name, priceRial });
}

beforeAll(async () => {
  await resetDb();
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDB();
});

describe("cursorPaginate", () => {
  it("pages through ascending numeric sort without skipping or duplicating", async () => {
    for (let i = 1; i <= 5; i += 1) {
      await seedWidget(`w${i}`, i * 100);
    }

    const page1 = await cursorPaginate(
      Widget,
      {},
      {
        sortField: "priceRial",
        valueType: "number",
        direction: 1,
        cursor: undefined,
        limit: 2,
      },
    );
    expect(page1.data.map((w) => w.priceRial)).toEqual([100, 200]);
    expect(page1.meta.nextCursor).not.toBeNull();

    const page2 = await cursorPaginate(
      Widget,
      {},
      {
        sortField: "priceRial",
        valueType: "number",
        direction: 1,
        cursor: page1.meta.nextCursor!,
        limit: 2,
      },
    );
    expect(page2.data.map((w) => w.priceRial)).toEqual([300, 400]);

    const page3 = await cursorPaginate(
      Widget,
      {},
      {
        sortField: "priceRial",
        valueType: "number",
        direction: 1,
        cursor: page2.meta.nextCursor!,
        limit: 2,
      },
    );
    expect(page3.data.map((w) => w.priceRial)).toEqual([500]);
    expect(page3.meta.nextCursor).toBeNull();
  });

  it("stays stable when a row is inserted ahead of the cursor between pages", async () => {
    for (let i = 1; i <= 3; i += 1) {
      await seedWidget(`w${i}`, i * 100);
    }

    const page1 = await cursorPaginate(
      Widget,
      {},
      {
        sortField: "priceRial",
        valueType: "number",
        direction: 1,
        cursor: undefined,
        limit: 2,
      },
    );
    expect(page1.data.map((w) => w.priceRial)).toEqual([100, 200]);

    // Insert a row that would land on "page 1" under skip/limit, then
    // fetch "page 2" via the cursor already handed out for page 1 — a
    // correct cursor implementation must not re-show or skip anything.
    await seedWidget("inserted", 150);

    const page2 = await cursorPaginate(
      Widget,
      {},
      {
        sortField: "priceRial",
        valueType: "number",
        direction: 1,
        cursor: page1.meta.nextCursor!,
        limit: 2,
      },
    );
    expect(page2.data.map((w) => w.priceRial)).toEqual([300]);
  });

  it("uses the id as a tiebreaker when the sort field has duplicate values", async () => {
    const a = await seedWidget("a", 100);
    const b = await seedWidget("b", 100);
    const c = await seedWidget("c", 100);
    const orderedIds = [a, b, c].map((w) => w.id).sort();

    const page1 = await cursorPaginate(
      Widget,
      {},
      {
        sortField: "priceRial",
        valueType: "number",
        direction: 1,
        cursor: undefined,
        limit: 2,
      },
    );
    const page2 = await cursorPaginate(
      Widget,
      {},
      {
        sortField: "priceRial",
        valueType: "number",
        direction: 1,
        cursor: page1.meta.nextCursor!,
        limit: 2,
      },
    );
    const allIds = [...page1.data, ...page2.data].map((w) => w.id);
    expect(allIds).toEqual(orderedIds);
  });

  it("pages through a Date sort field (createdAt) correctly", async () => {
    for (let i = 1; i <= 3; i += 1) {
      await seedWidget(`w${i}`, i);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const page1 = await cursorPaginate(
      Widget,
      {},
      {
        sortField: "createdAt",
        valueType: "date",
        direction: -1,
        cursor: undefined,
        limit: 2,
      },
    );
    expect(page1.data.map((w) => w.nameFa)).toEqual(["w3", "w2"]);

    const page2 = await cursorPaginate(
      Widget,
      {},
      {
        sortField: "createdAt",
        valueType: "date",
        direction: -1,
        cursor: page1.meta.nextCursor!,
        limit: 2,
      },
    );
    expect(page2.data.map((w) => w.nameFa)).toEqual(["w1"]);
  });

  it("rejects a malformed cursor with an ApiError", async () => {
    await expect(
      cursorPaginate(
        Widget,
        {},
        {
          sortField: "priceRial",
          valueType: "number",
          direction: 1,
          cursor: "not-a-valid-cursor",
          limit: 2,
        },
      ),
    ).rejects.toThrow();
  });
});

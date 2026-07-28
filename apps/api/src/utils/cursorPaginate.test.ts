import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose, { Schema } from "mongoose";
import { testDbUri } from "../config/testDbUri.js";
import { cursorPaginate } from "./cursorPaginate.js";

const TEST_URI = testDbUri("parsian-store-test-cursor-paginate");

interface Widget {
  name: string;
  priceRial: number;
  createdAt: Date;
}

type WidgetModel = mongoose.Model<Widget>;
let Widget: WidgetModel;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  const schema = new Schema<Widget, WidgetModel>(
    { name: { type: String, required: true }, priceRial: { type: Number, required: true } },
    { timestamps: true },
  );
  Widget = mongoose.model<Widget, WidgetModel>("CursorWidget", schema);
});

beforeEach(async () => {
  await Widget.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("cursorPaginate", () => {
  it("pages through ascending numeric sort without skipping or duplicating", async () => {
    for (let i = 1; i <= 5; i += 1) {
      await Widget.create({ name: `w${i}`, priceRial: i * 100 });
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
      await Widget.create({ name: `w${i}`, priceRial: i * 100 });
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
    await Widget.create({ name: "inserted", priceRial: 150 });

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

  it("uses _id as a tiebreaker when the sort field has duplicate values", async () => {
    const a = await Widget.create({ name: "a", priceRial: 100 });
    const b = await Widget.create({ name: "b", priceRial: 100 });
    const c = await Widget.create({ name: "c", priceRial: 100 });
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
      await Widget.create({ name: `w${i}`, priceRial: i });
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
    expect(page1.data.map((w) => w.name)).toEqual(["w3", "w2"]);

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
    expect(page2.data.map((w) => w.name)).toEqual(["w1"]);
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

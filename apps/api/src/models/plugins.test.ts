import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose, { Schema } from "mongoose";
import { applyBasePlugins } from "./plugins.js";
import { testDbUri } from "../config/testDbUri.js";

// Runs against a real local MongoDB (the same one dev/CI already need for
// P2.S2+ — no mongodb-memory-server in the dependency manifest, and a real
// connection exercises the plugins' actual query-hook behavior instead of
// a mocked approximation of it). Uses a disposable, dedicated database so
// it never touches real dev data, and drops it afterwards.
const TEST_URI = testDbUri("parsian-store-test-plugins");

interface Widget {
  name: string;
  deletedAt: Date | null;
}

interface WidgetMethods {
  softDelete(): Promise<void>;
}

type WidgetModel = mongoose.Model<Widget, object, WidgetMethods>;

let Widget: WidgetModel;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  const schema = new Schema<Widget, WidgetModel, WidgetMethods>({
    name: { type: String, required: true },
  });
  applyBasePlugins(schema);
  Widget = mongoose.model<Widget, WidgetModel>("Widget", schema);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("timestampsPlugin", () => {
  it("adds createdAt/updatedAt to every document", async () => {
    const doc = await Widget.create({ name: "brake pad" });
    expect(doc.get("createdAt")).toBeInstanceOf(Date);
    expect(doc.get("updatedAt")).toBeInstanceOf(Date);
  });
});

describe("toJSONPlugin", () => {
  it("replaces _id with a string id and drops __v", async () => {
    const doc = await Widget.create({ name: "oil filter" });
    const json = doc.toJSON() as Record<string, unknown>;
    expect(json.id).toBe(doc._id.toString());
    expect(json._id).toBeUndefined();
    expect(json.__v).toBeUndefined();
  });
});

describe("softDeletePlugin", () => {
  it("defaults deletedAt to null on a new document", async () => {
    const doc = await Widget.create({ name: "timing belt" });
    expect(doc.deletedAt).toBeNull();
  });

  it("hides a soft-deleted document from default queries", async () => {
    const doc = await Widget.create({ name: "spark plug" });
    await doc.softDelete();

    const found = await Widget.findById(doc._id);
    expect(found).toBeNull();
  });

  it("still returns a soft-deleted document when the caller asks for deletedAt explicitly", async () => {
    const doc = await Widget.create({ name: "clutch disc" });
    await doc.softDelete();

    const found = await Widget.findOne({ _id: doc._id, deletedAt: { $ne: null } });
    expect(found).not.toBeNull();
    expect(found?.deletedAt).toBeInstanceOf(Date);
  });

  // P8.S4. `countDocuments` is its own Mongoose query-middleware name — it
  // is NOT matched by /^find/, so for three phases every paginated list
  // endpoint's `meta.total` (utils/pagination.ts runs find + countDocuments
  // against the same filter) silently counted soft-deleted documents the
  // accompanying `data` array had already excluded. Found while building
  // the first admin UI with a real delete button; fixed once here rather
  // than per-endpoint, same as P8.S2's duplicate-key handling.
  it("excludes soft-deleted documents from countDocuments, not just find", async () => {
    const tag = "count-scope";
    await Widget.create({ name: `${tag} live` });
    const doomed = await Widget.create({ name: `${tag} doomed` });
    await doomed.softDelete();

    const found = await Widget.find({ name: { $regex: tag } });
    const counted = await Widget.countDocuments({ name: { $regex: tag } });

    expect(found).toHaveLength(1);
    expect(counted).toBe(found.length);
  });

  it("still counts a soft-deleted document when the caller asks for deletedAt explicitly", async () => {
    const tag = "count-explicit";
    const doomed = await Widget.create({ name: `${tag} doomed` });
    await doomed.softDelete();

    const counted = await Widget.countDocuments({
      name: { $regex: tag },
      deletedAt: { $ne: null },
    });
    expect(counted).toBe(1);
  });

  // Guards the regex above from over-matching: estimatedDocumentCount takes
  // no filter at all, so a hook calling this.where() on it would throw.
  it("leaves estimatedDocumentCount working", async () => {
    await expect(Widget.estimatedDocumentCount()).resolves.toBeTypeOf("number");
  });
});

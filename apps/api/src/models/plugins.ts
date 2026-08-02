import type { Schema, Query, HydratedDocument } from "mongoose";

// Shared shape every model built from P2.S4 onward extends, so each model
// file doesn't redeclare the same two fields/one method the base plugins
// actually add at runtime.
export interface WithTimestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface WithSoftDelete {
  deletedAt: Date | null;
}

export interface SoftDeleteMethods {
  softDelete(): Promise<void>;
}

// Every fa/en pair in the domain (vehicle makes/models, provinces,
// cities, ...) shares this exact shape — one definition, not one per model.
export interface LocalizedName {
  fa: string;
  en: string;
}

// §3.2's `seo{}` field recurs across Category, Brand, and Product (P3.S1+)
// with the same minimal shape — one definition, not one per model.
export interface SeoMeta {
  title?: string;
  description?: string;
}

// createdAt/updatedAt on every collection (§3.2: "add createdAt/updatedAt
// to all"). A named plugin rather than passing `{ timestamps: true }` at
// each schema's construction site keeps the requirement enforced in one
// place instead of relying on every model author to remember it.
export function timestampsPlugin(schema: Schema): void {
  schema.set("timestamps", true);
}

// Soft delete: mark-and-hide instead of removing documents, so admin
// audit trails (AuditLog, §3.2) and order history stay intact even after
// a product/category/etc. is "deleted". `deletedAt: null` means live.
//
// The pre-find hook only injects the `deletedAt: null` filter when the
// query doesn't already mention `deletedAt` — this lets a caller who
// explicitly wants deleted documents (e.g. an admin "trash" view) query
// `{ deletedAt: { $ne: null } }` without the plugin fighting them.
//
// `countDocuments` is matched explicitly: it is its own Mongoose
// query-middleware name, NOT covered by /^find/, so before P8.S4 every
// paginated endpoint's `meta.total` (utils/pagination.ts pairs `find` with
// `countDocuments` over the same filter) counted soft-deleted documents
// that the `data` array itself had already excluded.
// Deliberately not /^count/: `estimatedDocumentCount` accepts no filter,
// so calling `this.where()` on it throws. `aggregate` is never covered by
// query middleware at all — any pipeline over a soft-deletable collection
// has to `$match: { deletedAt: null }` for itself.
export function softDeletePlugin(schema: Schema): void {
  schema.add({ deletedAt: { type: Date, default: null, index: true } });

  schema.pre(/^(find|countDocuments)/, function (this: Query<unknown, unknown>, next) {
    const filter = this.getFilter();
    if (filter.deletedAt === undefined) {
      this.where({ deletedAt: null });
    }
    next();
  });

  schema.methods.softDelete = async function (this: HydratedDocument<{ deletedAt?: Date | null }>) {
    this.deletedAt = new Date();
    await this.save();
  };
}

// API responses should never leak Mongo's internal `_id`/`__v` shape —
// every model gets a plain `id: string` instead, matching the `{ ok,
// data }` envelope's expectation of clean JSON (§9).
export function toJSONPlugin(schema: Schema): void {
  schema.set("toJSON", {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });
}

export function applyBasePlugins(schema: Schema): void {
  timestampsPlugin(schema);
  softDeletePlugin(schema);
  toJSONPlugin(schema);
}

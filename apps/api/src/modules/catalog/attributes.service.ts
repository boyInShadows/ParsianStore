import type { FilterQuery, HydratedDocument } from "mongoose";
import {
  SELECT_NEEDS_OPTIONS_MESSAGE,
  isValidAttributeShape,
  type AdminAttributeDto,
} from "schemas";
import { AttributeModel, type Attribute } from "../../models/Attribute.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationQuery } from "../../utils/pagination.js";
import { escapeRegExp } from "../../utils/regex.js";
import { assertAttributeKeyUnused, countProductsByAttributeKey } from "./catalogUsage.js";
import type {
  CreateAttributeInput,
  ListAttributesQuery,
  UpdateAttributeInput,
} from "./attributes.schema.js";

const NOT_FOUND = "ویژگی یافت نشد";

/** See categories.admin.service.ts for why this shape, not `$in: [null, ...]`. */
const ANY_STATE = { deletedAt: { $exists: true } } as const;

type ListFilters = Omit<ListAttributesQuery, keyof PaginationQuery>;

function buildListFilter(filters: ListFilters): FilterQuery<Attribute> {
  const filter: FilterQuery<Attribute> =
    filters.state === "deleted" ? { deletedAt: { $ne: null } } : { deletedAt: null };

  if (filters.type) filter.type = filters.type;
  if (filters.q) {
    const escaped = escapeRegExp(filters.q);
    filter.$or = [{ name: { $regex: escaped } }, { key: { $regex: escaped, $options: "i" } }];
  }
  return filter;
}

function toDto(doc: HydratedDocument<Attribute>, usageCount: number): AdminAttributeDto {
  return {
    id: String(doc._id),
    name: doc.name,
    key: doc.key,
    type: doc.type,
    unit: doc.unit,
    options: doc.options,
    usageCount,
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
  };
}

async function hydrate(docs: HydratedDocument<Attribute>[]): Promise<AdminAttributeDto[]> {
  const counts = await countProductsByAttributeKey(docs.map((doc) => doc.key));
  return docs.map((doc) => toDto(doc, counts.get(doc.key) ?? 0));
}

async function hydrateOne(doc: HydratedDocument<Attribute>): Promise<AdminAttributeDto> {
  const [dto] = await hydrate([doc]);
  if (!dto) throw new ApiError(404, NOT_FOUND);
  return dto;
}

export async function listAttributes(
  pagination: PaginationQuery,
  filters: ListFilters,
): Promise<{ data: AdminAttributeDto[]; meta: { total: number; page: number; limit: number } }> {
  const { data, meta } = await paginate(AttributeModel, buildListFilter(filters), {
    ...pagination,
    sort: pagination.sort ?? "key",
  });
  return { data: await hydrate(data), meta };
}

/** Finds regardless of soft-delete state, so edit/restore can reach a deleted row. */
async function findAnyById(id: string): Promise<HydratedDocument<Attribute>> {
  const attribute = await AttributeModel.findOne({ _id: id, ...ANY_STATE });
  if (!attribute) throw new ApiError(404, NOT_FOUND);
  return attribute;
}

export async function getAttributeById(id: string): Promise<AdminAttributeDto> {
  return hydrateOne(await findAnyById(id));
}

export async function createAttribute(input: CreateAttributeInput): Promise<AdminAttributeDto> {
  return hydrateOne(await AttributeModel.create(input));
}

export async function updateAttribute(
  id: string,
  input: UpdateAttributeInput,
): Promise<AdminAttributeDto> {
  const attribute = await AttributeModel.findById(id);
  if (!attribute) throw new ApiError(404, NOT_FOUND);

  // Product.attributes[].key is a plain string, not a ref (P3.S2), so a
  // rename silently orphans every product carrying the old key — the PDP
  // specs table and PLP facets would fall back to the raw machine key.
  if (input.key && input.key !== attribute.key) {
    await assertAttributeKeyUnused(attribute.key, "rename");
  }

  // Re-checked against the MERGED document, not the patch body: `{options: []}`
  // is invalid only if the stored attribute is (or is becoming) a select.
  // Same two-place cross-field pattern P8.S3's coupon rules established, and
  // both sites call the one exported predicate so they cannot drift.
  const merged = {
    type: input.type ?? attribute.type,
    options: input.options ?? attribute.options,
  };
  if (!isValidAttributeShape(merged)) {
    throw new ApiError(400, SELECT_NEEDS_OPTIONS_MESSAGE);
  }

  Object.assign(attribute, input);
  await attribute.save();
  return hydrateOne(attribute);
}

export async function deleteAttribute(id: string): Promise<void> {
  const attribute = await AttributeModel.findById(id);
  if (!attribute) throw new ApiError(404, NOT_FOUND);
  await assertAttributeKeyUnused(attribute.key, "delete");
  await attribute.softDelete();
}

export async function restoreAttribute(id: string): Promise<AdminAttributeDto> {
  const attribute = await findAnyById(id);
  attribute.deletedAt = null;
  await attribute.save();
  return hydrateOne(attribute);
}

/**
 * Validates a product's `attributes[{key,value}]` against this dictionary.
 * Used by the product admin form (P8.S4) — before this step nothing ever
 * wrote Product.attributes at all, so a key could not be checked against
 * anything. Returns the normalized pairs; throws on the first problem.
 */
export async function validateProductAttributes(
  pairs: { key: string; value: string }[],
): Promise<{ key: string; value: string }[]> {
  if (pairs.length === 0) return [];

  const keys = pairs.map((pair) => pair.key);
  const duplicate = keys.find((key, index) => keys.indexOf(key) !== index);
  if (duplicate) {
    throw new ApiError(400, `ویژگی «${duplicate}» تکراری است`);
  }

  const defined = await AttributeModel.find({ key: { $in: keys } });
  const byKey = new Map(defined.map((doc) => [doc.key, doc]));

  for (const pair of pairs) {
    const attribute = byKey.get(pair.key);
    if (!attribute) {
      throw new ApiError(400, `ویژگی «${pair.key}» تعریف نشده است`);
    }
    // A select attribute's value must be one of its own declared options —
    // otherwise the PLP facet buckets fill with one-off typos.
    if (attribute.type === "select" && !attribute.options.includes(pair.value)) {
      throw new ApiError(400, `مقدار «${pair.value}» برای ویژگی «${attribute.name}» معتبر نیست`);
    }
    if (attribute.type === "number" && Number.isNaN(Number(pair.value))) {
      throw new ApiError(400, `مقدار ویژگی «${attribute.name}» باید عدد باشد`);
    }
    if (attribute.type === "bool" && !["true", "false"].includes(pair.value)) {
      throw new ApiError(400, `مقدار ویژگی «${attribute.name}» باید بله یا خیر باشد`);
    }
  }

  return pairs;
}

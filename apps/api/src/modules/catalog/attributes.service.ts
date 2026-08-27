import {
  SELECT_NEEDS_OPTIONS_MESSAGE,
  isValidAttributeShape,
  type AdminAttributeDto,
} from "schemas";
import { ANY_STATE, prisma, softDeleteData, stateFilter } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationQuery, type Where } from "../../utils/pagination.js";
import { optional } from "../../utils/serialize.js";
import { assertAttributeKeyUnused, countProductsByAttributeKey } from "./catalogUsage.js";
import type {
  CreateAttributeInput,
  ListAttributesQuery,
  UpdateAttributeInput,
} from "./attributes.schema.js";

const NOT_FOUND = "ویژگی یافت نشد";

type ListFilters = Omit<ListAttributesQuery, keyof PaginationQuery>;

interface AttributeRow {
  id: string;
  name: string;
  key: string;
  type: string;
  unit: string | null;
  options: string[];
  deletedAt: Date | null;
}

function buildListFilter(filters: ListFilters): Where {
  const where: Where = stateFilter(filters.state);
  if (filters.type) where.type = filters.type;
  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const };
    where.OR = [{ name: contains }, { key: contains }];
  }
  return where;
}

function toDto(row: AttributeRow, usageCount: number): AdminAttributeDto {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    type: row.type as AdminAttributeDto["type"],
    unit: optional(row.unit),
    options: row.options,
    usageCount,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

async function hydrate(rows: AttributeRow[]): Promise<AdminAttributeDto[]> {
  const counts = await countProductsByAttributeKey(rows.map((row) => row.key));
  return rows.map((row) => toDto(row, counts.get(row.key) ?? 0));
}

async function hydrateOne(row: AttributeRow): Promise<AdminAttributeDto> {
  const [dto] = await hydrate([row]);
  if (!dto) throw new ApiError(404, NOT_FOUND);
  return dto;
}

export async function listAttributes(
  pagination: PaginationQuery,
  filters: ListFilters,
): Promise<{ data: AdminAttributeDto[]; meta: { total: number; page: number; limit: number } }> {
  const { data, meta } = await paginate<AttributeRow>(
    prisma.attribute,
    "Attribute",
    buildListFilter(filters),
    { ...pagination, sort: pagination.sort ?? "key" },
  );
  return { data: await hydrate(data), meta };
}

/** Finds regardless of soft-delete state, so edit/restore can reach a deleted row. */
async function findAnyById(id: string): Promise<AttributeRow> {
  const attribute = await prisma.attribute.findFirst({ where: { id, ...ANY_STATE } });
  if (!attribute) throw new ApiError(404, NOT_FOUND);
  return attribute;
}

async function findLiveById(id: string): Promise<AttributeRow> {
  const attribute = await prisma.attribute.findUnique({ where: { id } });
  if (!attribute) throw new ApiError(404, NOT_FOUND);
  return attribute;
}

export async function getAttributeById(id: string): Promise<AdminAttributeDto> {
  return hydrateOne(await findAnyById(id));
}

export async function createAttribute(input: CreateAttributeInput): Promise<AdminAttributeDto> {
  return hydrateOne(await prisma.attribute.create({ data: input }));
}

export async function updateAttribute(
  id: string,
  input: UpdateAttributeInput,
): Promise<AdminAttributeDto> {
  const attribute = await findLiveById(id);

  // See assertAttributeKeyUnused's own comment: with ProductAttributeValue
  // holding a foreign key rather than a copied string, a rename no longer
  // orphans anything. The guard is kept because relaxing it is a product
  // decision, not a consequence of changing databases.
  if (input.key && input.key !== attribute.key) {
    await assertAttributeKeyUnused(attribute.key, "rename");
  }

  // Re-checked against the MERGED row, not the patch body: `{options: []}`
  // is invalid only if the stored attribute is (or is becoming) a select.
  // Same two-place cross-field pattern P8.S3's coupon rules established, and
  // both sites call the one exported predicate so they cannot drift.
  const merged = {
    type: input.type ?? (attribute.type as CreateAttributeInput["type"]),
    options: input.options ?? attribute.options,
  };
  if (!isValidAttributeShape(merged)) {
    throw new ApiError(400, SELECT_NEEDS_OPTIONS_MESSAGE);
  }

  return hydrateOne(await prisma.attribute.update({ where: { id }, data: input }));
}

export async function deleteAttribute(id: string): Promise<void> {
  const attribute = await findLiveById(id);
  await assertAttributeKeyUnused(attribute.key, "delete");
  await prisma.attribute.update({ where: { id }, data: softDeleteData() });
}

export async function restoreAttribute(id: string): Promise<AdminAttributeDto> {
  await findAnyById(id);
  return hydrateOne(
    await prisma.attribute.update({ where: { id, ...ANY_STATE }, data: { deletedAt: null } }),
  );
}

/** A validated attribute pair, resolved to the row it points at. */
export interface ResolvedAttributePair {
  attributeId: string;
  key: string;
  value: string;
}

/**
 * Validates a product's `attributes[{key,value}]` against this dictionary.
 * Used by the product admin form (P8.S4) — before that step nothing ever
 * wrote a product's attributes at all, so a key could not be checked against
 * anything. Throws on the first problem.
 *
 * It now returns the resolved `attributeId` alongside each pair rather than
 * echoing the input back. That is what the migration actually changed here: a
 * product used to store the key as a copied string, and now stores a foreign
 * key, so the caller needs the id and this function is already holding it.
 */
export async function validateProductAttributes(
  pairs: { key: string; value: string }[],
): Promise<ResolvedAttributePair[]> {
  if (pairs.length === 0) return [];

  const keys = pairs.map((pair) => pair.key);
  const duplicate = keys.find((key, index) => keys.indexOf(key) !== index);
  if (duplicate) {
    throw new ApiError(400, `ویژگی «${duplicate}» تکراری است`);
  }

  const defined = await prisma.attribute.findMany({ where: { key: { in: keys } } });
  const byKey = new Map(defined.map((row) => [row.key, row]));

  return pairs.map((pair) => {
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
    return { attributeId: attribute.id, key: pair.key, value: pair.value };
  });
}

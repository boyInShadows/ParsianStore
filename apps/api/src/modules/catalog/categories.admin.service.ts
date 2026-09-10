import type { AdminCategoryDto } from "schemas";
import { ANY_STATE, prisma, softDeleteData, stateFilter } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationQuery, type Where } from "../../utils/pagination.js";
import {
  localized,
  optional,
  seo,
  seoColumns,
  systemCodeFromWire,
  systemCodeToWire,
  toColumns,
} from "../../utils/serialize.js";
import {
  assertCategoryDeletable,
  countChildCategories,
  countProductsByCategory,
} from "./catalogUsage.js";
import type {
  AdminCategoryListQuery,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./categories.admin.schema.js";

const NOT_FOUND = "دسته‌بندی یافت نشد";

type ListFilters = Omit<AdminCategoryListQuery, keyof PaginationQuery>;

interface CategoryRow {
  id: string;
  nameFa: string;
  nameEn: string;
  slug: string;
  parentId: string | null;
  systemCode: string;
  icon: string | null;
  path: string[];
  order: number;
  seoTitle: string | null;
  seoDescription: string | null;
  deletedAt: Date | null;
}

function buildListFilter(filters: ListFilters): Where {
  const where: Where = stateFilter(filters.state);
  if (filters.parentId) where.parentId = filters.parentId;
  if (filters.systemCode) where.systemCode = systemCodeFromWire(filters.systemCode);
  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const };
    where.OR = [{ nameFa: contains }, { nameEn: contains }, { slug: contains }];
  }
  return where;
}

/**
 * `Category.path` stores ancestor *slugs*, which are useless as a breadcrumb
 * label in an all-Persian admin table. Resolve them to names in ONE batched
 * query for the whole page — a separate query, never a join, matching
 * getProductDetailBySlug's own precedent.
 */
async function resolveAncestorNames(rows: CategoryRow[]): Promise<Map<string, string>> {
  const slugs = [...new Set(rows.flatMap((row) => row.path))];
  if (slugs.length === 0) return new Map();
  // ANY_STATE rather than the extension's implicit `deletedAt: null`: an
  // ancestor may itself have been soft-deleted, and showing its real Persian
  // name still beats falling back to a raw slug.
  const ancestors = await prisma.category.findMany({
    where: { slug: { in: slugs }, ...ANY_STATE },
    select: { slug: true, nameFa: true },
  });
  return new Map(ancestors.map((row) => [row.slug, row.nameFa]));
}

function toDto(
  row: CategoryRow,
  ancestorNames: Map<string, string>,
  productCount: number,
  childCount: number,
): AdminCategoryDto {
  return {
    id: row.id,
    name: localized(row),
    slug: row.slug,
    parentId: row.parentId,
    systemCode: systemCodeToWire(row.systemCode),
    icon: optional(row.icon),
    order: row.order,
    path: row.path,
    seo: seo(row),
    depth: row.path.length,
    ancestorNames: row.path.map((slug) => ancestorNames.get(slug) ?? slug),
    productCount,
    childCount,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

async function hydrate(rows: CategoryRow[]): Promise<AdminCategoryDto[]> {
  const ids = rows.map((row) => row.id);
  const [ancestorNames, productCounts, childCounts] = await Promise.all([
    resolveAncestorNames(rows),
    countProductsByCategory(ids),
    countChildCategories(ids),
  ]);
  return rows.map((row) =>
    toDto(row, ancestorNames, productCounts.get(row.id) ?? 0, childCounts.get(row.id) ?? 0),
  );
}

async function hydrateOne(row: CategoryRow): Promise<AdminCategoryDto> {
  const [dto] = await hydrate([row]);
  if (!dto) throw new ApiError(404, NOT_FOUND);
  return dto;
}

export async function listAdminCategories(
  pagination: PaginationQuery,
  filters: ListFilters,
): Promise<{ data: AdminCategoryDto[]; meta: { total: number; page: number; limit: number } }> {
  const { data, meta } = await paginate<CategoryRow>(
    prisma.category,
    "Category",
    buildListFilter(filters),
    {
      ...pagination,
      // Groups a system's categories together and keeps paging deterministic;
      // NOT a true tree ordering — that would need a materialized scalar path,
      // deliberately not added while the real taxonomy is 10 flat roots.
      sort: pagination.sort ?? "systemCode order slug",
    },
  );
  return { data: await hydrate(data), meta };
}

/** Finds regardless of soft-delete state, so the edit/restore paths can reach a deleted row. */
async function findAnyById(id: string): Promise<CategoryRow> {
  const category = await prisma.category.findFirst({ where: { id, ...ANY_STATE } });
  if (!category) throw new ApiError(404, NOT_FOUND);
  return category;
}

async function findLiveById(id: string): Promise<CategoryRow> {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new ApiError(404, NOT_FOUND);
  return category;
}

export async function getAdminCategoryById(id: string): Promise<AdminCategoryDto> {
  return hydrateOne(await findAnyById(id));
}

/** Root-first ancestor slugs, self excluded — see Category.path's doc comment. */
async function resolvePath(parentId: string | undefined): Promise<string[]> {
  if (!parentId) return [];
  const parent = await prisma.category.findUnique({ where: { id: parentId } });
  if (!parent) {
    throw new ApiError(400, "دسته‌بندی والد یافت نشد");
  }
  return [...parent.path, parent.slug];
}

export async function createCategory(input: CreateCategoryInput): Promise<AdminCategoryDto> {
  const path = await resolvePath(input.parentId);
  const { name, seo: seoInput, parentId, ...rest } = input;
  return hydrateOne(
    await prisma.category.create({
      // `parentId` is spelled out as `string | null` rather than left optional
      // on purpose. Prisma generates two create-input shapes -- one taking the
      // `parent` relation, one taking the raw foreign key -- and an optional
      // `parentId?: string | undefined` matches neither well enough for TS to
      // choose, so it picks the relation branch, where parentId must be
      // undefined, and the whole payload fails to typecheck.
      data: {
        ...rest,
        ...toColumns(name),
        ...seoColumns(seoInput),
        systemCode: systemCodeFromWire(rest.systemCode),
        parentId: parentId ?? null,
        path,
      },
    }),
  );
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<AdminCategoryDto> {
  const category = await findLiveById(id);

  const childCount = (await countChildCategories([id])).get(id) ?? 0;

  if ("parentId" in input) {
    // A category cannot be its own parent, nor a descendant's child — either
    // produces a cycle that resolvePath would happily materialize into a
    // path that never terminates at a root.
    if (input.parentId === id) {
      throw new ApiError(400, "دسته‌بندی نمی‌تواند والد خودش باشد");
    }
    if (input.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
      if (!parent) throw new ApiError(400, "دسته‌بندی والد یافت نشد");
      if (parent.path.includes(category.slug)) {
        throw new ApiError(400, "دسته‌بندی را نمی‌توان زیرمجموعه یکی از فرزندان خودش کرد");
      }
    }
    // Re-parenting with children would silently invalidate every descendant's
    // materialized `path`. Refusing is honest and cheap; cascading a subtree
    // rewrite belongs in a background job, not a request handler — the same
    // limit updateCategory's original P3.S1 comment already documented.
    if (childCount > 0) {
      throw new ApiError(409, "ابتدا زیرمجموعه‌های این دسته‌بندی را جابه‌جا کنید");
    }
  }

  const previousSlug = category.slug;
  const path = "parentId" in input ? await resolvePath(input.parentId) : category.path;
  const { name, seo: seoInput, parentId, systemCode, ...rest } = input;

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...rest,
      ...(name ? toColumns(name) : {}),
      ...seoColumns(seoInput),
      ...(systemCode ? { systemCode: systemCodeFromWire(systemCode) } : {}),
      // Same create-input branch problem as createCategory, and the same fix.
      // Only written when the caller actually asked to re-parent, so an update
      // that does not mention parentId leaves it alone rather than nulling it.
      ...("parentId" in input ? { parentId: parentId ?? null } : {}),
      path,
    },
  });

  if (input.slug && input.slug !== previousSlug) {
    await renameSlugInDescendantPaths(previousSlug, input.slug);
  }

  return hydrateOne(updated);
}

/**
 * Descendants store the ancestor's slug, not its id, so a rename would
 * otherwise break every descendant breadcrumb.
 *
 * Raw SQL, and this is the honest place for it: Mongo did this with the
 * positional operator (`$set: { "path.$": newSlug }`), and Prisma has no
 * equivalent for replacing one element of a scalar list in place -- its list
 * operations are `set`, `push` and nothing else, so the alternative is reading
 * every matching row into Node, rewriting the array and writing it back. That
 * is a read-modify-write race for something Postgres does atomically in one
 * statement. `array_replace` is exactly the positional operator's counterpart.
 *
 * Both values are bound parameters, not interpolated, so a slug cannot carry
 * SQL with it -- and slugs are already constrained to [a-z0-9-] by the schema.
 */
async function renameSlugInDescendantPaths(previous: string, next: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Category"
    SET path = array_replace(path, ${previous}, ${next})
    WHERE ${previous} = ANY(path)
  `;
}

export async function deleteCategory(id: string): Promise<void> {
  await findLiveById(id);
  await assertCategoryDeletable(id);
  await prisma.category.update({ where: { id }, data: softDeleteData() });
}

export async function restoreCategory(id: string): Promise<AdminCategoryDto> {
  await findAnyById(id);
  return hydrateOne(
    await prisma.category.update({ where: { id, ...ANY_STATE }, data: { deletedAt: null } }),
  );
}

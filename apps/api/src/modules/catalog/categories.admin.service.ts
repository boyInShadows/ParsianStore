import type { FilterQuery, HydratedDocument } from "mongoose";
import type { AdminCategoryDto } from "schemas";
import { CategoryModel, type Category } from "../../models/Category.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationQuery } from "../../utils/pagination.js";
import { escapeRegExp } from "../../utils/regex.js";
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

/**
 * Reaches soft-deleted rows as well as live ones. The soft-delete plugin
 * steps aside for any query that mentions `deletedAt` at all, and
 * `$exists: true` is true for both `null` and a real date since the field
 * carries `default: null`. (`$in: [null, {$ne: null}]` looks equivalent but
 * is not valid Mongo — `$in` takes literal values, not operators.)
 */
const ANY_STATE = { deletedAt: { $exists: true } } as const;

type ListFilters = Omit<AdminCategoryListQuery, keyof PaginationQuery>;

function buildListFilter(filters: ListFilters): FilterQuery<Category> {
  // Stated explicitly rather than left to the soft-delete plugin: the
  // plugin steps aside entirely once a query mentions `deletedAt`, which is
  // exactly how the "deleted" view reaches its rows.
  const filter: FilterQuery<Category> =
    filters.state === "deleted" ? { deletedAt: { $ne: null } } : { deletedAt: null };

  if (filters.parentId) filter.parentId = filters.parentId;
  if (filters.systemCode) filter.systemCode = filters.systemCode;
  if (filters.q) {
    const escaped = escapeRegExp(filters.q);
    filter.$or = [
      { "name.fa": { $regex: escaped } },
      { "name.en": { $regex: escaped, $options: "i" } },
      { slug: { $regex: escaped, $options: "i" } },
    ];
  }
  return filter;
}

/**
 * `Category.path` stores ancestor *slugs*, which are useless as a breadcrumb
 * label in an all-Persian admin table. Resolve them to names in ONE batched
 * query for the whole page — a separate query, never `.populate()`, matching
 * getProductDetailBySlug's own precedent.
 */
async function resolveAncestorNames(
  docs: HydratedDocument<Category>[],
): Promise<Map<string, string>> {
  const slugs = [...new Set(docs.flatMap((doc) => doc.path))];
  if (slugs.length === 0) return new Map();
  // ANY_STATE rather than the plugin's implicit `deletedAt: null`: an
  // ancestor may itself have been soft-deleted, and showing its real Persian
  // name still beats falling back to a raw slug.
  const ancestors = await CategoryModel.find({
    slug: { $in: slugs },
    ...ANY_STATE,
  }).select("slug name");
  return new Map(ancestors.map((doc) => [doc.slug, doc.name.fa]));
}

function toDto(
  doc: HydratedDocument<Category>,
  ancestorNames: Map<string, string>,
  productCount: number,
  childCount: number,
): AdminCategoryDto {
  return {
    id: String(doc._id),
    name: { fa: doc.name.fa, en: doc.name.en },
    slug: doc.slug,
    parentId: doc.parentId ? String(doc.parentId) : null,
    systemCode: doc.systemCode,
    icon: doc.icon,
    order: doc.order,
    path: doc.path,
    seo: doc.seo,
    depth: doc.path.length,
    ancestorNames: doc.path.map((slug) => ancestorNames.get(slug) ?? slug),
    productCount,
    childCount,
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
  };
}

async function hydrate(docs: HydratedDocument<Category>[]): Promise<AdminCategoryDto[]> {
  const ids = docs.map((doc) => String(doc._id));
  const [ancestorNames, productCounts, childCounts] = await Promise.all([
    resolveAncestorNames(docs),
    countProductsByCategory(ids),
    countChildCategories(ids),
  ]);
  return docs.map((doc) =>
    toDto(
      doc,
      ancestorNames,
      productCounts.get(String(doc._id)) ?? 0,
      childCounts.get(String(doc._id)) ?? 0,
    ),
  );
}

async function hydrateOne(doc: HydratedDocument<Category>): Promise<AdminCategoryDto> {
  const [dto] = await hydrate([doc]);
  if (!dto) throw new ApiError(404, NOT_FOUND);
  return dto;
}

export async function listAdminCategories(
  pagination: PaginationQuery,
  filters: ListFilters,
): Promise<{ data: AdminCategoryDto[]; meta: { total: number; page: number; limit: number } }> {
  const { data, meta } = await paginate(CategoryModel, buildListFilter(filters), {
    ...pagination,
    // Groups a system's categories together and keeps paging deterministic;
    // NOT a true tree ordering — that would need a materialized scalar path,
    // deliberately not added while the real taxonomy is 10 flat roots.
    sort: pagination.sort ?? "systemCode order slug",
  });
  return { data: await hydrate(data), meta };
}

/** Finds regardless of soft-delete state, so the edit/restore paths can reach a deleted row. */
async function findAnyById(id: string): Promise<HydratedDocument<Category>> {
  const category = await CategoryModel.findOne({ _id: id, ...ANY_STATE });
  if (!category) throw new ApiError(404, NOT_FOUND);
  return category;
}

export async function getAdminCategoryById(id: string): Promise<AdminCategoryDto> {
  const category = await findAnyById(id);
  return hydrateOne(category);
}

/** Root-first ancestor slugs, self excluded — see Category.path's doc comment. */
async function resolvePath(parentId: string | undefined): Promise<string[]> {
  if (!parentId) return [];
  const parent = await CategoryModel.findById(parentId);
  if (!parent) {
    throw new ApiError(400, "دسته‌بندی والد یافت نشد");
  }
  return [...parent.path, parent.slug];
}

export async function createCategory(input: CreateCategoryInput): Promise<AdminCategoryDto> {
  const path = await resolvePath(input.parentId);
  const created = await CategoryModel.create({ ...input, path });
  return hydrateOne(created);
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<AdminCategoryDto> {
  const category = await CategoryModel.findById(id);
  if (!category) throw new ApiError(404, NOT_FOUND);

  const childCount = (await countChildCategories([id])).get(id) ?? 0;

  if ("parentId" in input) {
    // A category cannot be its own parent, nor a descendant's child — either
    // produces a cycle that resolvePath would happily materialize into a
    // path that never terminates at a root.
    if (input.parentId === id) {
      throw new ApiError(400, "دسته‌بندی نمی‌تواند والد خودش باشد");
    }
    if (input.parentId) {
      const parent = await CategoryModel.findById(input.parentId);
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
  Object.assign(category, input, { path });
  await category.save();

  // Descendants store the ancestor's slug, not its id, so a rename would
  // otherwise break every descendant breadcrumb. Slugs are unique, so at most
  // one array element can match the positional operator.
  if (input.slug && input.slug !== previousSlug) {
    await CategoryModel.updateMany({ path: previousSlug }, { $set: { "path.$": input.slug } });
  }

  return hydrateOne(category);
}

export async function deleteCategory(id: string): Promise<void> {
  const category = await CategoryModel.findById(id);
  if (!category) throw new ApiError(404, NOT_FOUND);
  await assertCategoryDeletable(id);
  await category.softDelete();
}

export async function restoreCategory(id: string): Promise<AdminCategoryDto> {
  const category = await findAnyById(id);
  category.deletedAt = null;
  await category.save();
  return hydrateOne(category);
}

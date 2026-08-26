import type { FilterQuery, HydratedDocument } from "mongoose";
import { normalizeFa } from "schemas";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { ProductModel, type Product } from "../../models/Product.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import { escapeRegExp } from "../../utils/regex.js";
import { validateProductAttributes } from "./attributes.service.js";
import { storageProvider } from "../../providers/storage/index.js";
import type { CreateProductInput, UpdateProductInput } from "./products.admin.schema.js";

// Real, honest defaults for the fields P8.S2's own create form deliberately
// excludes (owner-confirmed scope: essential fields only) -- not fabricated
// specifics, both state plainly that the real value hasn't been recorded
// yet, editable later once a full-detail admin step exists.
const DEFAULT_DIMENSIONS = { lengthMm: 100, widthMm: 100, heightMm: 100 };
const DEFAULT_WARRANTY = { months: 0, text: "اطلاعات ضمانت متعاقباً تکمیل می‌شود" };

async function assertBrandAndCategoryExist(brandId: string, categoryId: string): Promise<void> {
  const [brand, category] = await Promise.all([
    BrandModel.exists({ _id: brandId }),
    CategoryModel.exists({ _id: categoryId }),
  ]);
  if (!brand) {
    throw new ApiError(400, "برند یافت نشد");
  }
  if (!category) {
    throw new ApiError(400, "دسته‌بندی یافت نشد");
  }
}

export function listAdminProducts(
  pagination: PaginationQuery,
  filters: { status?: string; q?: string },
): Promise<PaginatedResult<HydratedDocument<Product>>> {
  const filter: FilterQuery<Product> = {};
  if (filters.status) filter.status = filters.status;
  // P8.S6 adds `q`: the Fitment Manager has to let staff pick one product
  // out of the whole catalog, which a paged dropdown cannot do. Matches
  // the Persian name and the SKU -- the two things staff have in front of
  // them. `normalizeFa` is applied to the query for the same reason
  // Product.searchText is normalized on write (§8.3): normalizing only
  // one side is the single most common way Persian search breaks.
  if (filters.q) {
    const escaped = escapeRegExp(filters.q);
    filter.$or = [
      { searchText: { $regex: escapeRegExp(normalizeFa(filters.q)) } },
      { sku: { $regex: escaped, $options: "i" } },
    ];
  }
  return paginate(ProductModel, filter, { ...pagination, sort: pagination.sort ?? "-createdAt" });
}

export async function getAdminProductById(id: string): Promise<HydratedDocument<Product>> {
  const product = await ProductModel.findById(id).select("+wholesalePriceRial");
  if (!product) {
    throw new ApiError(404, "محصول یافت نشد");
  }
  return product;
}

/** `.create()`, never `findOneAndUpdate` -- Product.ts's own doc comment
 * on `computeProductSearchText` documents a real bug this exact mistake
 * already caused once (seed/catalog.ts, found at P5.S3): the
 * `pre("save")` hook that computes `searchText` only fires on document
 * middleware (`.save()`/`.create()`), never on query middleware. */
export async function createProduct(input: CreateProductInput): Promise<HydratedDocument<Product>> {
  await assertBrandAndCategoryExist(input.brandId, input.categoryId);
  // P8.S4: every attribute key/value is checked against the real Attribute
  // dictionary before it is stored, so a typo can never create a phantom
  // PLP facet bucket that no attribute definition can ever label.
  if (input.attributes) {
    await validateProductAttributes(input.attributes);
  }
  return ProductModel.create({
    ...input,
    stock: input.variants?.length
      ? input.variants.reduce((sum, variant) => sum + variant.stock, 0)
      : input.stock,
    dimensions: DEFAULT_DIMENSIONS,
    warranty: DEFAULT_WARRANTY,
  });
}

/** Fetch-then-`.save()`, same reasoning as createProduct -- an update
 * that changes `name`/`sku` must still recompute `searchText` correctly,
 * which a raw `findOneAndUpdate` would silently skip. Mirrors
 * categories.service.ts's own `updateCategory` pattern exactly. */
export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<HydratedDocument<Product>> {
  const product = await ProductModel.findById(id).select("+wholesalePriceRial");
  if (!product) {
    throw new ApiError(404, "محصول یافت نشد");
  }
  if (input.brandId || input.categoryId) {
    await assertBrandAndCategoryExist(
      input.brandId ?? product.brandId.toString(),
      input.categoryId ?? product.categoryId.toString(),
    );
  }
  if (input.attributes) {
    await validateProductAttributes(input.attributes);
  }
  Object.assign(product, input);
  if (input.variants)
    product.stock = input.variants.reduce((sum, variant) => sum + variant.stock, 0);
  await product.save();
  return product;
}

/** A status transition (draft/active -> archived), not the soft-delete
 * plugin's own `deletedAt` mechanism -- those are two different
 * concepts. `status` already exists on Product exactly for this: taking
 * a listing off-sale while keeping the document, its order history
 * references, and its own listing/edit history all intact. */
export async function archiveProduct(id: string): Promise<HydratedDocument<Product>> {
  return updateProduct(id, { status: "archived" });
}

export async function addProductMedia(id: string, buffer: Buffer) {
  const product = await getAdminProductById(id);
  const stored = await storageProvider.saveImage(buffer);
  const preferred = stored.variants.find((item) => item.size === "large" && item.format === "webp");
  if (!preferred) {
    await storageProvider.deleteImage(stored.key);
    throw new ApiError(500, "نسخه اصلی تصویر ساخته نشد");
  }
  product.media.push(preferred.url);
  await product.save();
  return { product, stored };
}

export async function removeProductMedia(id: string, url: string) {
  const product = await getAdminProductById(id);
  if (!product.media.includes(url)) throw new ApiError(404, "تصویر برای این محصول یافت نشد");
  product.media = product.media.filter((item) => item !== url);
  await product.save();
  const match = new URL(url).pathname.match(/\/uploads\/([^/]+)\//);
  if (match?.[1]) await storageProvider.deleteImage(match[1]);
  return product;
}

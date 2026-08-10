import { adminCreateProductInputSchema, type AdminCreateProductInput } from "schemas";
import { ProductModel } from "../../models/Product.js";
import { BrandModel } from "../../models/Brand.js";
import { CategoryModel } from "../../models/Category.js";
import { createProduct } from "./products.admin.service.js";

type CsvRow = Record<string, string>;
export interface ImportRowResult {
  row: number;
  sku: string;
  ok: boolean;
  errors: string[];
}
export interface ProductImportResult {
  total: number;
  valid: number;
  imported: number;
  rows: ImportRowResult[];
}

export function parseCsv(input: string): CsvRow[] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]!;
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some(Boolean)) records.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field);
  if (row.some(Boolean)) records.push(row);
  const [headers, ...data] = records;
  if (!headers) return [];
  return data.map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [header.trim(), values[index]?.trim() ?? ""]),
    ),
  );
}

function optionalNumber(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}
function toInput(row: CsvRow): unknown {
  return {
    name: { fa: row.nameFa, en: row.nameEn },
    slug: row.slug,
    sku: row.sku,
    brandId: row.brandId,
    categoryId: row.categoryId,
    priceRial: Number(row.priceRial),
    wholesalePriceRial: optionalNumber(row.wholesalePriceRial ?? ""),
    compareAtRial: optionalNumber(row.compareAtRial ?? ""),
    taxRate: Number(row.taxRate ?? 0),
    stock: Number(row.stock),
    weightGram: Number(row.weightGram),
    authenticity: {
      supplyRoute: row.supplyRoute,
      sourceBrand: row.sourceBrand,
      countryOfManufacture: row.countryOfManufacture,
      verificationCode: row.verificationCode,
    },
    status: row.status || "draft",
  };
}

export async function importProductsCsv(
  csv: string,
  commit: boolean,
): Promise<ProductImportResult> {
  const sourceRows = parseCsv(csv);
  const rows: ImportRowResult[] = [];
  const validInputs: AdminCreateProductInput[] = [];
  const seenSku = new Set<string>();
  const seenSlug = new Set<string>();
  for (const [index, source] of sourceRows.entries()) {
    const parsed = adminCreateProductInputSchema.safeParse(toInput(source));
    const errors = parsed.success
      ? []
      : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    const sku = source.sku ?? "";
    if (seenSku.has(sku)) errors.push("sku: duplicate in file");
    if (seenSlug.has(source.slug ?? "")) errors.push("slug: duplicate in file");
    seenSku.add(sku);
    seenSlug.add(source.slug ?? "");
    if (parsed.success && errors.length === 0) {
      const exists = await ProductModel.exists({
        $or: [
          { sku: parsed.data.sku },
          { slug: parsed.data.slug },
          { "authenticity.verificationCode": parsed.data.authenticity.verificationCode },
        ],
      });
      if (exists) errors.push("sku, slug, or verificationCode already exists");
      const [brand, category] = await Promise.all([
        BrandModel.exists({ _id: parsed.data.brandId }),
        CategoryModel.exists({ _id: parsed.data.categoryId }),
      ]);
      if (!brand) errors.push("brandId: not found");
      if (!category) errors.push("categoryId: not found");
      if (errors.length === 0) validInputs.push(parsed.data);
    }
    rows.push({ row: index + 2, sku, ok: errors.length === 0, errors });
  }
  let imported = 0;
  if (commit && rows.every((row) => row.ok)) {
    for (const input of validInputs) {
      await createProduct(input);
      imported += 1;
    }
  }
  return { total: rows.length, valid: rows.filter((row) => row.ok).length, imported, rows };
}

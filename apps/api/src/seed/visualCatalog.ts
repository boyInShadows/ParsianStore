import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizeFa, toEnglishDigits } from "schemas";
import { connectDB, disconnectDB } from "../config/db.js";
import { logger } from "../config/logger.js";
import { BrandModel } from "../models/Brand.js";
import { CategoryModel } from "../models/Category.js";
import { computeProductSearchText, ProductModel } from "../models/Product.js";

const SOURCE_PATH = fileURLToPath(
  new URL("../../../../apps/web/public/products/digikala.csv", import.meta.url),
);
const IMPORT_LIMIT = 100;
const CATEGORY_SLUG = "visual-products";
const BRAND_SLUG = "visual-sample";

type CsvRow = Record<string, string>;
type SourceProduct = { name: string; image: string; priceToman: number; stock: number };

/** Minimal RFC-4180 parser for the user-supplied browser export. Keeping it
 * local avoids adding a CSV dependency for a temporary development dataset. */
export function parseCsv(input: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]!;
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value !== "")) rows.push(row);

  const [headers, ...data] = rows;
  if (!headers) return [];
  return data.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

function digits(value: string): string {
  return toEnglishDigits(value).replace(/\D/g, "");
}

function sourceProducts(rows: CsvRow[]): SourceProduct[] {
  const products: SourceProduct[] = [];
  const seenNames = new Set<string>();

  for (const row of rows) {
    for (let slot = 1; slot <= 5; slot += 1) {
      const suffix = slot === 1 ? "" : ` ${slot}`;
      const name = row[`ellipsis-2${suffix}`]?.trim() ?? "";
      const image = row[`w-full src${suffix}`]?.trim() ?? "";
      const priceText = row[slot === 1 ? "flex" : `flex ${slot}`] ?? "";
      const normalizedName = normalizeFa(name);
      const priceDigits = digits(priceText);
      if (
        !name ||
        !priceDigits ||
        seenNames.has(normalizedName) ||
        !/^https:\/\/dkstatics-public\.digikala\.com\/.+\.(?:jpe?g|png)(?:\?|$)/i.test(image)
      )
        continue;

      const stockText = row[`text-caption${suffix}`] ?? "";
      const explicitStock = Number(digits(stockText));
      products.push({
        name,
        image,
        priceToman: Number(priceDigits),
        stock: stockText.includes("تنها") && explicitStock > 0 ? explicitStock : 10,
      });
      seenNames.add(normalizedName);
      if (products.length === IMPORT_LIMIT) return products;
    }
  }
  return products;
}

export async function seedVisualCatalog(): Promise<number> {
  const products = sourceProducts(parseCsv(await readFile(SOURCE_PATH, "utf8")));
  const category = await CategoryModel.findOneAndUpdate(
    { slug: CATEGORY_SLUG },
    {
      name: { fa: "محصولات نمونه", en: "Visual sample products" },
      slug: CATEGORY_SLUG,
      parentId: null,
      systemCode: "SYS-06",
      path: [],
      order: 99,
      seo: { description: "محصولات موقت برای بررسی نمای بصری فروشگاه" },
    },
    { upsert: true, new: true },
  );
  const brand = await BrandModel.findOneAndUpdate(
    { slug: BRAND_SLUG },
    {
      name: { fa: "نمونه بازار", en: "Market sample" },
      slug: BRAND_SLUG,
      country: "IR",
      isOEM: false,
      description: "داده نمایشی موقت برای ارزیابی رابط فروشگاه",
    },
    { upsert: true, new: true },
  );

  for (const [index, source] of products.entries()) {
    const number = String(index + 1).padStart(3, "0");
    const slug = `visual-sample-${number}`;
    const sku = `VISUAL-${number}`;
    const name = { fa: source.name, en: source.name };
    await ProductModel.findOneAndUpdate(
      { slug },
      {
        name,
        slug,
        sku,
        oemNumbers: [],
        crossRefNumbers: [],
        searchText: computeProductSearchText({ name, sku, oemNumbers: [], crossRefNumbers: [] }),
        brandId: brand._id,
        categoryId: category._id,
        attributes: [],
        media: [source.image],
        priceRial: source.priceToman * 10,
        taxRate: 9,
        stock: source.stock,
        lowStockAt: 2,
        backorderable: false,
        weightGram: 0,
        dimensions: { lengthMm: 0, widthMm: 0, heightMm: 0 },
        warranty: { months: 0, text: "بدون ضمانت ثبت‌شده" },
        authenticity: {
          supplyRoute: "grade1-aftermarket",
          sourceBrand: "Visual sample dataset",
          countryOfManufacture: "IR",
          verificationCode: `VISUAL-${number}`,
        },
        status: "active",
      },
      { upsert: true, new: true },
    );
  }

  logger.info(
    { products: products.length, category: CATEGORY_SLUG },
    "Visual catalog seed complete",
  );
  return products.length;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  connectDB()
    .then(() => seedVisualCatalog())
    .then(() => disconnectDB())
    .catch((err: unknown) => {
      logger.error({ err }, "Visual catalog seed failed");
      process.exit(1);
    });
}

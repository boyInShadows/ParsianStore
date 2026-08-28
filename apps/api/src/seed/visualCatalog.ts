import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizeFa, toEnglishDigits } from "schemas";
import { logger } from "../config/logger.js";
import { connectDB, disconnectDB, prisma } from "../config/prisma.js";
import { computeProductSearchText } from "../modules/catalog/searchText.js";
import { supplyRouteFromWire, systemCodeFromWire } from "../utils/serialize.js";

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
  const categoryFields = {
    nameFa: "محصولات نمونه",
    nameEn: "Visual sample products",
    parentId: null,
    systemCode: systemCodeFromWire("SYS-06"),
    path: [],
    order: 99,
    seoDescription: "محصولات موقت برای بررسی نمای بصری فروشگاه",
  };
  const category = await prisma.category.upsert({
    where: { slug: CATEGORY_SLUG },
    update: categoryFields,
    create: { ...categoryFields, slug: CATEGORY_SLUG },
  });

  const brandFields = {
    nameFa: "نمونه بازار",
    nameEn: "Market sample",
    country: "IR",
    isOEM: false,
    description: "داده نمایشی موقت برای ارزیابی رابط فروشگاه",
  };
  const brand = await prisma.brand.upsert({
    where: { slug: BRAND_SLUG },
    update: brandFields,
    create: { ...brandFields, slug: BRAND_SLUG },
  });

  for (const [index, source] of products.entries()) {
    const number = String(index + 1).padStart(3, "0");
    const slug = `visual-sample-${number}`;
    const sku = `VISUAL-${number}`;
    const fields = {
      nameFa: source.name,
      nameEn: source.name,
      sku,
      oemNumbers: [],
      crossRefNumbers: [],
      brandId: brand.id,
      categoryId: category.id,
      media: [source.image],
      priceRial: source.priceToman * 10,
      taxRate: 9,
      stock: source.stock,
      lowStockAt: 2,
      backorderable: false,
      weightGram: 0,
      lengthMm: 0,
      widthMm: 0,
      heightMm: 0,
      warrantyMonths: 0,
      warrantyText: "بدون ضمانت ثبت‌شده",
      // Hyphenated on the wire, underscored as an enum member -- converted
      // here for the reason utils/serialize.ts explains.
      supplyRoute: supplyRouteFromWire("grade1-aftermarket"),
      sourceBrand: "Visual sample dataset",
      countryOfManufacture: "IR",
      verificationCode: `VISUAL-${number}`,
      status: "active" as const,
      // Still derived explicitly at the write, exactly as it is everywhere
      // else -- the derive step is not automatic, and a seeded product with
      // an empty searchText is invisible to search.
      searchText: computeProductSearchText({
        nameFa: source.name,
        nameEn: source.name,
        sku,
        oemNumbers: [],
        crossRefNumbers: [],
      }),
    };
    await prisma.product.upsert({
      where: { slug },
      update: fields,
      create: { ...fields, slug },
    });
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

import { productsResponseSchema, type ProductListItemDto } from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// masterPlan.md §5 item 04: no real sales history exists yet (Cart/Order
// are Phase 5+), so there is no honest "best sellers" signal today --
// this is a real, defensible query (newest in-stock products), not a
// fabricated ranking. See Landing.sections.bestSellers's "پیشنهاد ما"
// copy, which says so plainly rather than claiming a ranking that isn't
// real.
/**
 * How many rows to ask for per card we intend to show.
 *
 * The seed generates `VARIANTS_PER_TEMPLATE = 4` products from every part
 * template -- same Persian name, different brand and different vehicle -- and
 * they are created consecutively, so `sort=newest&limit=8` returns eight rows
 * drawn from **two** templates and the grid showed «لنت ترمز» four times in a
 * row (P14.S9). De-duplication therefore has to happen over a wider window
 * than the one we render.
 *
 * Eight, not four, so the window still fills the grid if a future seed adds
 * brands. The endpoint caps `limit` at 100 (masterPlan.md §9), which is the
 * ceiling below; there is no `?featured=true` and none is invented here.
 */
const DEDUPE_WINDOW = 8;

/** The list endpoint's own cap. Asking for more is a 400, not a bigger page. */
const LIST_LIMIT_MAX = 100;

export async function fetchFeaturedProducts(limit = 8): Promise<ProductListItemDto[]> {
  const rows = Math.min(LIST_LIMIT_MAX, limit * DEDUPE_WINDOW);
  try {
    const res = await fetch(
      `${API_URL}/api/v1/catalog/products?sort=newest&inStock=true&limit=${rows}`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    const parsed = productsResponseSchema.safeParse(json);
    if (!parsed.success) return [];

    // `name.fa` is the key because it is the only one the list DTO carries that
    // identifies the template: there is no template id on the wire, and `slug`
    // and `sku` both embed the vehicle, so they are distinct for rows that read
    // as the same part. First occurrence wins, which under `sort=newest` is the
    // newest variant of each template -- the same ordering promise the query
    // makes, just applied per part rather than per row.
    const seen = new Set<string>();
    const unique: ProductListItemDto[] = [];
    for (const product of parsed.data.data) {
      if (seen.has(product.name.fa)) continue;
      seen.add(product.name.fa);
      unique.push(product);
      if (unique.length === limit) break;
    }
    return unique;
  } catch {
    return [];
  }
}

// masterPlan.md §5 item 06: "Explains the Authenticity Record with a
// real example product." Reuses the same endpoint/schema as the
// featured grid -- just the first real in-stock product, not a
// specially curated one (there's no "pick the best example" signal
// either, same honesty reasoning as fetchFeaturedProducts above).
export async function fetchExampleProduct(): Promise<ProductListItemDto | null> {
  const products = await fetchFeaturedProducts(1);
  return products[0] ?? null;
}

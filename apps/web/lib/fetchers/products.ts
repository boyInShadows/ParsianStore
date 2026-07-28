import { productsResponseSchema, type ProductListItemDto } from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// masterPlan.md §5 item 04: no real sales history exists yet (Cart/Order
// are Phase 5+), so there is no honest "best sellers" signal today --
// this is a real, defensible query (newest in-stock products), not a
// fabricated ranking. See Landing.sections.bestSellers's "پیشنهاد ما"
// copy, which says so plainly rather than claiming a ranking that isn't
// real.
export async function fetchFeaturedProducts(limit = 8): Promise<ProductListItemDto[]> {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/catalog/products?sort=newest&inStock=true&limit=${limit}`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    const parsed = productsResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : [];
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

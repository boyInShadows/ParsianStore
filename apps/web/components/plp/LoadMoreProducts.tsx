"use client"; // accumulates additional cursor pages client-side on click

import { useState } from "react";
import type { ProductListItemDto } from "schemas";
import { fetchCatalogProducts, type CatalogProductFilters } from "@/lib/fetchers/catalog";
import { ProductCard, type ProductCardMessages } from "./ProductCard";

type Props = {
  initialCursor: string;
  // Same filters the server-rendered first page used, minus cursor/limit --
  // this component only ever appends the NEXT page of the same query.
  filters: Omit<CatalogProductFilters, "cursor">;
  loadMoreLabel: string;
  loadingLabel: string;
  productMessages: ProductCardMessages;
};

// Dynamically imported (next/dynamic, ssr:false) from ProductGrid -- not
// needed for the initial page load or LCP, only once a shopper actually
// clicks past the first server-rendered page (masterPlan.md §10's PLP
// budget is 160KB, tighter than landing's 180KB, so nothing gets a free
// pass into the initial bundle here).
export function LoadMoreProducts({
  initialCursor,
  filters,
  loadMoreLabel,
  loadingLabel,
  productMessages,
}: Props) {
  const [items, setItems] = useState<ProductListItemDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    const result = await fetchCatalogProducts({ ...filters, cursor });
    setLoading(false);
    if (!result.ok) {
      setCursor(null); // stop offering "load more" against a down API
      return;
    }
    setItems((prev) => [...prev, ...result.data.data]);
    setCursor(result.data.nextCursor);
  }

  return (
    <>
      {items.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} messages={productMessages} />
          ))}
        </div>
      ) : null}
      {cursor ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="rounded-md border border-border px-4 py-2 text-body-sm text-text hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? loadingLabel : loadMoreLabel}
          </button>
        </div>
      ) : null}
    </>
  );
}

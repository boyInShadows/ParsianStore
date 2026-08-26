import type { ProductListItemDto } from "schemas";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/primitives";
import type { CatalogProductFilters } from "@/lib/fetchers/catalog";
import { ProductCard, type ProductCardMessages } from "./ProductCard";
import { LoadMoreProductsLazy } from "./LoadMoreProductsLazy";

export interface ProductGridMessages {
  loadMore: string;
  loading: string;
  emptyTitle: string;
  emptyDescription: string;
  clearFilters: string;
  product: ProductCardMessages;
}

type Props = {
  clearFiltersHref: string;
  products: ProductListItemDto[];
  nextCursor: string | null;
  filters: Omit<CatalogProductFilters, "cursor">;
  hasActiveFilters: boolean;
  messages: ProductGridMessages;
};

export function ProductGrid({
  clearFiltersHref,
  products,
  nextCursor,
  filters,
  hasActiveFilters,
  messages,
}: Props) {
  if (products.length === 0) {
    return (
      <EmptyState
        title={messages.emptyTitle}
        description={messages.emptyDescription}
        action={
          hasActiveFilters ? (
            <Link
              href={clearFiltersHref}
              className="text-body-sm text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              {messages.clearFilters}
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} messages={messages.product} />
        ))}
      </div>
      {nextCursor ? (
        <LoadMoreProductsLazy
          initialCursor={nextCursor}
          filters={filters}
          loadMoreLabel={messages.loadMore}
          loadingLabel={messages.loading}
          productMessages={messages.product}
        />
      ) : null}
    </div>
  );
}

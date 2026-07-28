import { formatToman } from "schemas";
import type { ProductListItemDto } from "schemas";
import { Link } from "@/i18n/navigation";

export interface ProductCardMessages {
  inStock: string;
  outOfStock: string;
  noPhoto: string;
}

type Props = {
  product: ProductListItemDto;
  messages: ProductCardMessages;
};

// Same "no photo" honesty pattern as components/landing/BestSellers.tsx
// (P4.S4) -- no product photography exists in the seed data yet, so this
// is a real placeholder state, not a fabricated stock image. Kept as its
// own component (not reused from landing) since the PLP card also needs
// the in/out-of-stock badge landing's card doesn't.
export function ProductCard({ product, messages }: Props) {
  return (
    <Link
      href={`/p/${product.slug}`}
      className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-brand motion-reduce:transition-none"
    >
      <div
        role="img"
        aria-label={messages.noPhoto}
        className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border bg-surface-raised text-caption text-text-muted"
      >
        {messages.noPhoto}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <span className="line-clamp-2 text-body-sm text-text">{product.name.fa}</span>
        <span className="font-mono text-data text-text">{formatToman(product.priceRial)}</span>
        {/* text-success on white fails WCAG AA at caption size (3.3:1, needs
            4.5:1) -- caught by axe building this component (P5.S1). Status
            is conveyed by the word itself, not color, so this stays
            text-muted for both states rather than reaching for a still-
            unverified darker green. */}
        <span className="text-caption text-text-muted">
          {product.stock > 0 ? messages.inStock : messages.outOfStock}
        </span>
      </div>
    </Link>
  );
}

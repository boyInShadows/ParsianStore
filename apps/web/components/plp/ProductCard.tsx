import { formatToman } from "schemas";
import type { ProductListItemDto } from "schemas";
import { Link } from "@/i18n/navigation";
// Direct file-path import, not the components/wishlist barrel -- P4.S5's
// documented lesson: a barrel-exported client component forces every
// consumer of that barrel to eat its module-level cost, and ProductCard
// is used on PLP, search, and PDP's related-products all at once.
import { WishlistButton, type WishlistButtonMessages } from "@/components/wishlist/WishlistButton";

export interface ProductCardMessages {
  inStock: string;
  outOfStock: string;
  noPhoto: string;
  wholesalePriceBadge: string;
  wishlist: WishlistButtonMessages;
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
      <div className="relative">
        <div
          role="img"
          aria-label={messages.noPhoto}
          className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border bg-surface-raised text-caption text-text-muted"
        >
          {messages.noPhoto}
        </div>
        {/* WishlistButton stops its own click from bubbling into this
            card's <Link> navigation -- see its own doc comment. */}
        <WishlistButton
          productId={product.id}
          messages={messages.wishlist}
          className="bg-surface/90 absolute end-2 top-2 backdrop-blur-sm"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <span className="line-clamp-2 text-body-sm text-text">{product.name.fa}</span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-data text-text">{formatToman(product.priceRial)}</span>
          {product.isWholesalePrice ? (
            <span className="rounded-full bg-brand-subtle px-2 py-1 text-caption font-medium leading-none text-brand">
              {messages.wholesalePriceBadge}
            </span>
          ) : null}
        </span>
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

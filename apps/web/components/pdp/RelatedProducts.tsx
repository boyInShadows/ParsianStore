import type { ProductListItemDto } from "schemas";
import { ProductCard, type ProductCardMessages } from "@/components/plp/ProductCard";

type Props = {
  title: string;
  products: ProductListItemDto[];
  messages: ProductCardMessages;
};

// Reuses the PLP's ProductCard directly (imported by file path, not a
// barrel -- P4.S5's lesson: a shared barrel forces every consumer to
// evaluate every export's module-level side effect, even ones it never
// uses) rather than building a second card component for the same "part
// in a grid" shape.
export function RelatedProducts({ title, products, messages }: Props) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="related-products-heading" className="mt-10">
      <h2 id="related-products-heading" className="text-h3 font-semibold text-text">
        {title}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} messages={messages} />
        ))}
      </div>
    </section>
  );
}

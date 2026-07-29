"use client"; // reads the client-only cart store, drives qty/remove mutations

import { formatToman } from "schemas";
import { Link } from "@/i18n/navigation";
import { EmptyState, Button } from "@/components/primitives";
import { useCartStore } from "@/stores/cart-store";
import { useToastStore } from "@/stores/toast-store";

export interface CartPageMessages {
  title: string;
  noPhoto: string;
  emptyTitle: string;
  emptyDescription: string;
  browseCta: string;
  decreaseAria: string;
  increaseAria: string;
  removeAria: string;
  stockIssue: string;
  priceChanged: string;
  subtotalLabel: string;
  continueToCheckout: string;
  mutationError: string;
}

type Props = { messages: CartPageMessages };

export function CartPageContent({ messages }: Props) {
  const cart = useCartStore((state) => state.cart);
  const status = useCartStore((state) => state.status);
  const updateItem = useCartStore((state) => state.updateItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const showToast = useToastStore((state) => state.show);

  // CartSession already triggers a load on mount -- a brief blank beats a
  // flash of the wrong empty state before the real cart arrives.
  if (status === "loading" || status === "idle") return null;

  async function handleQtyChange(itemId: string, qty: number): Promise<void> {
    if (qty < 1) return;
    const ok = await updateItem(itemId, qty);
    if (!ok) showToast(messages.mutationError, "danger");
  }

  async function handleRemove(itemId: string): Promise<void> {
    const ok = await removeItem(itemId);
    if (!ok) showToast(messages.mutationError, "danger");
  }

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        titleAs="h1"
        title={messages.emptyTitle}
        description={messages.emptyDescription}
        action={
          <Link href="/" className="text-body-sm text-brand hover:underline">
            {messages.browseCta}
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-h2 font-black text-text">{messages.title}</h1>

      <ul className="flex flex-col gap-4">
        {cart.items.map((item) => (
          <li key={item.id} className="flex gap-4 rounded-lg border border-border bg-surface p-4">
            <Link
              href={`/p/${item.product.slug}`}
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-surface-raised"
            >
              <span
                role="img"
                aria-label={messages.noPhoto}
                className="text-caption text-text-muted"
              >
                {messages.noPhoto}
              </span>
            </Link>

            <div className="flex flex-1 flex-col gap-1">
              <Link
                href={`/p/${item.product.slug}`}
                className="line-clamp-2 text-body-sm text-text hover:underline"
              >
                {item.product.name.fa}
              </Link>
              <span className="font-mono text-data text-text">
                {formatToman(item.product.priceRial)}
              </span>
              {item.priceChanged ? (
                <span className="text-caption text-warning">{messages.priceChanged}</span>
              ) : null}
              {!item.stockOk ? (
                <span className="text-caption text-danger">
                  {messages.stockIssue.replace("{count}", String(item.availableQty))}
                </span>
              ) : null}

              <div className="mt-1 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  aria-label={messages.decreaseAria}
                  disabled={item.qty <= 1}
                  onClick={() => void handleQtyChange(item.id, item.qty - 1)}
                  className="h-8 w-8 p-0"
                >
                  −
                </Button>
                <span className="w-6 text-center font-mono text-body-sm text-text">{item.qty}</span>
                <Button
                  type="button"
                  variant="outline"
                  aria-label={messages.increaseAria}
                  onClick={() => void handleQtyChange(item.id, item.qty + 1)}
                  className="h-8 w-8 p-0"
                >
                  +
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={messages.removeAria}
                  onClick={() => void handleRemove(item.id)}
                  className="ms-auto text-danger"
                >
                  {messages.removeAria}
                </Button>
              </div>
            </div>

            <span className="whitespace-nowrap font-mono text-data text-text">
              {formatToman(item.lineTotalRial)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-body font-medium text-text">{messages.subtotalLabel}</span>
        <span className="font-mono text-h3 text-text">{formatToman(cart.subtotalRial)}</span>
      </div>

      <Link
        href="/checkout"
        className="inline-flex items-center justify-center rounded-md bg-cta px-4 py-2 text-body-sm font-medium text-cta-fg hover:opacity-90"
      >
        {messages.continueToCheckout}
      </Link>
    </div>
  );
}

"use client"; // reads auth/wishlist client state, calls the toggle endpoint

import { useState, type MouseEvent } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useWishlistStore, selectIsSaved } from "@/stores/wishlist-store";
import { addToWishlist, removeFromWishlist } from "@/lib/fetchers/wishlist";
import { useToastStore } from "@/stores/toast-store";

export interface WishlistButtonMessages {
  add: string;
  remove: string;
  error: string;
}

type Props = {
  productId: string;
  messages: WishlistButtonMessages;
  className?: string;
};

// aria-pressed is the WCAG-correct pattern for a true toggle button --
// ThemeToggle (the closest precedent in this codebase) doesn't use it,
// but that's a gap in existing code, not a reason to repeat it here.
export function WishlistButton({ productId, messages, className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.status === "authenticated");
  const isSaved = useWishlistStore(selectIsSaved(productId));
  const addLocal = useWishlistStore((state) => state.add);
  const removeLocal = useWishlistStore((state) => state.remove);
  const showToast = useToastStore((state) => state.show);
  const [pending, setPending] = useState(false);

  async function handleClick(event: MouseEvent<HTMLButtonElement>): Promise<void> {
    // Every call site nests this inside a card that's itself a <Link> (or
    // could be) -- stop the click from also triggering that navigation.
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (pending) return;

    setPending(true);
    if (isSaved) {
      removeLocal(productId);
      const ok = await removeFromWishlist(productId);
      if (!ok) {
        addLocal(productId);
        showToast(messages.error, "danger");
      }
    } else {
      addLocal(productId);
      const ok = await addToWishlist(productId);
      if (!ok) {
        removeLocal(productId);
        showToast(messages.error, "danger");
      }
    }
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={(event) => void handleClick(event)}
      aria-pressed={isSaved}
      aria-label={isSaved ? messages.remove : messages.add}
      className={`h-9 w-9 inline-flex items-center justify-center rounded-full border border-border bg-surface text-text transition-colors duration-fast hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none ${className}`}
    >
      <HeartIcon filled={isSaved} />
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
      className={filled ? "text-danger" : undefined}
    >
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.5s-7.5-4.6-10-9.3C.6 8 2 4.5 5.3 3.6c2.1-.6 4.3.3 5.7 2.2 1.4-1.9 3.6-2.8 5.7-2.2C20 4.5 21.4 8 20 11.2c-2.5 4.7-8 9.3-8 9.3z"
      />
    </svg>
  );
}

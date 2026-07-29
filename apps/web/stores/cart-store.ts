import { create } from "zustand";
import type { CartDto } from "schemas";
import { addCartItem, fetchCart, removeCartItem, updateCartItem } from "@/lib/fetchers/cart";

// Holds the FULL cart object (unlike wishlist-store's id-only Set) since
// the cart page/badge render line items directly. Always re-fetched from
// the server, never persisted/cookie-backed on the client -- the server
// (via the anonId/accessToken cookies) is the identity source of truth,
// this store is just a cache of its current shape.
type CartStatus = "idle" | "loading" | "loaded";

type CartState = {
  cart: CartDto | null;
  status: CartStatus;
  load: (options?: { force?: boolean }) => Promise<void>;
  addItem: (productId: string, qty?: number) => Promise<boolean>;
  updateItem: (itemId: string, qty: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  clear: () => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  status: "idle",
  load: async (options) => {
    if (!options?.force && get().status !== "idle") return;
    set({ status: "loading" });
    const cart = await fetchCart();
    set({ cart, status: "loaded" });
  },
  addItem: async (productId, qty = 1) => {
    const cart = await addCartItem(productId, qty);
    if (!cart) return false;
    set({ cart, status: "loaded" });
    return true;
  },
  updateItem: async (itemId, qty) => {
    const cart = await updateCartItem(itemId, qty);
    if (!cart) return false;
    set({ cart, status: "loaded" });
    return true;
  },
  removeItem: async (itemId) => {
    const cart = await removeCartItem(itemId);
    if (!cart) return false;
    set({ cart, status: "loaded" });
    return true;
  },
  clear: () => set({ cart: null, status: "idle" }),
}));

export function selectItemCount(state: CartState): number {
  return state.cart?.items.reduce((sum, item) => sum + item.qty, 0) ?? 0;
}

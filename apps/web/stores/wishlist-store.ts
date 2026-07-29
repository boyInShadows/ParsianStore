import { create } from "zustand";
import { fetchWishlistIds } from "@/lib/fetchers/wishlist";

// Always re-fetched from the server, never persisted/cookie-backed like
// garage-store -- this is authoritative server state (P5.S7's plan), not
// client-owned state. Populated once, by use-auth-session.ts, right after
// the session resolves to authenticated -- every ProductCard/PDP
// WishlistButton on the page then reads from this one shared Set instead
// of each firing its own request.
type WishlistState = {
  ids: Set<string>;
  status: "idle" | "loading" | "loaded";
  load: () => Promise<void>;
  add: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: new Set(),
  status: "idle",
  load: async () => {
    if (get().status !== "idle") return;
    set({ status: "loading" });
    const ids = await fetchWishlistIds();
    set({ ids: new Set(ids), status: "loaded" });
  },
  add: (productId) => set((state) => ({ ids: new Set(state.ids).add(productId) })),
  remove: (productId) =>
    set((state) => {
      const next = new Set(state.ids);
      next.delete(productId);
      return { ids: next };
    }),
  clear: () => set({ ids: new Set(), status: "idle" }),
}));

export function selectIsSaved(productId: string) {
  return (state: WishlistState): boolean => state.ids.has(productId);
}

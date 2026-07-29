"use client";

import { useEffect, useRef } from "react";
import { fetchMe } from "@/lib/fetchers/auth";
import { useAuthStore } from "@/stores/auth-store";
import { useWishlistStore } from "@/stores/wishlist-store";

// Mounted once at the (shop) layout root (mirrors use-garage-url-sync's
// placement). There is no client-readable session cookie -- the only way
// to know "is this browser signed in" is to ask the API, once, on load.
// A 401/failure resolves to "guest", not an error state: most visitors
// are guests, that's the expected steady state, not a failure.
export function useAuthSession(): void {
  const setLoading = useAuthStore((state) => state.setLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const clear = useAuthStore((state) => state.clear);
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    setLoading();
    void fetchMe().then((user) => {
      if (user) {
        setUser(user);
        // Seeds every WishlistButton's initial saved/unsaved state from
        // one shared request -- see stores/wishlist-store.ts's own comment.
        void useWishlistStore.getState().load();
      } else {
        clear();
      }
    });
    // Runs exactly once per mount (requested ref guards it) -- deliberately
    // not re-run on store-identity churn, same pattern as
    // use-garage-url-sync's first effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

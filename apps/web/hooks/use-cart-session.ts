"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/stores/cart-store";

// Mounted once at the (shop) layout root (mirrors use-auth-session.ts).
// Works for guest and authenticated visitors alike -- the API's
// optionalAuth-gated /cart resolves identity from whichever cookie is
// present (or mints a fresh anonId), so there's no separate guest/auth
// branch needed here.
export function useCartSession(): void {
  const load = useCartStore((state) => state.load);
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void load();
    // Runs exactly once per mount -- same pattern as use-auth-session.ts's
    // first effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

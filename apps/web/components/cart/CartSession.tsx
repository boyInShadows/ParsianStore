"use client"; // reads/writes the client-only cart store via useCartSession

import { useCartSession } from "@/hooks/use-cart-session";

// Renderless -- mounted once in the (shop) layout (same pattern as
// AuthSession/GarageUrlSync) so the header badge and any add-to-cart
// button work on first load, not just on pages that happen to render the
// cart page itself.
export function CartSession() {
  useCartSession();
  return null;
}

"use client"; // reads/writes the client-only auth store via useAuthSession

import { useAuthSession } from "@/hooks/use-auth-session";

// Renderless -- mounted once in the (shop) layout (same pattern as
// GarageUrlSync) so every page knows the signed-in state, not just the
// ones that happen to render a wishlist button or the header's account link.
export function AuthSession() {
  useAuthSession();
  return null;
}

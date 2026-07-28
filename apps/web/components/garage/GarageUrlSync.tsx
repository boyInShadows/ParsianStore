"use client"; // useSearchParams/useRouter + the garage store's client state

import { useGarageUrlSync } from "@/hooks/use-garage-url-sync";

// Renderless -- mounted once in the (shop) layout so `?v=` sync works on
// every page, not just the landing hero where the selector itself lives.
export function GarageUrlSync() {
  useGarageUrlSync();
  return null;
}

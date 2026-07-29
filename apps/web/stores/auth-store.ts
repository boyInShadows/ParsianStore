import { create } from "zustand";
import type { MeDto } from "schemas";

// Plain in-memory state -- no `persist`/cookie, unlike garage-store. Session
// truth lives entirely server-side in the httpOnly accessToken/refreshToken
// cookies auth.controller.ts sets; this store is just a client-side cache
// of "who is the current user," rehydrated from GET /auth/me on every load
// (see hooks/use-auth-session.ts), never trusted as the source of truth
// itself.
export type AuthStatus = "idle" | "loading" | "authenticated" | "guest";

type AuthState = {
  user: MeDto | null;
  status: AuthStatus;
  setLoading: () => void;
  setUser: (user: MeDto) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  setLoading: () => set({ status: "loading" }),
  setUser: (user) => set({ user, status: "authenticated" }),
  clear: () => set({ user: null, status: "guest" }),
}));

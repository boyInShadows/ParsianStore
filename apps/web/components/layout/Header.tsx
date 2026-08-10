"use client";

import { useState } from "react";
import Link from "next/link";
import { Drawer, Modal } from "@/components/primitives";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { VehicleSelectorLazy } from "@/components/garage";
import { selectActiveVehicle, useGarageStore } from "@/stores/garage-store";
import { useAuthStore } from "@/stores/auth-store";
import { useWishlistStore } from "@/stores/wishlist-store";
import { selectItemCount, useCartStore } from "@/stores/cart-store";
import { logout } from "@/lib/fetchers/auth";

export interface HeaderMessages {
  signInAria: string;
  signedInAria: string;
  signOutAria: string;
}

type Props = { messages: HeaderMessages };

// Real system-category vocabulary from masterPlan.md §1.2 / §3.1 -- the
// mechanic persona's own terms, not invented labels.
const CATEGORIES = [
  { label: "موتوری", slug: "engine" },
  { label: "جلوبندی", slug: "suspension" },
  { label: "برقی", slug: "electrical" },
  { label: "بدنه", slug: "body" },
  { label: "ترمز", slug: "brake" },
];

export function Header({ messages }: Props) {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  // Persisted client state (garage-store.ts's cookie-backed storage) is
  // only readable in the browser -- SSR and the first client render both
  // show "no active vehicle" here, then this updates once Zustand's
  // persist middleware finishes rehydrating from the cookie. Same
  // accepted-tradeoff category as any cart/wishlist badge that flashes
  // empty before hydration; not attempting an SSR-cookie-read here.
  const activeVehicle = useGarageStore(selectActiveVehicle);
  // auth-store starts "idle" on both the server render and the first
  // client paint (no httpOnly cookie read during SSR, by design -- see
  // P5.S7's plan) -- "idle"/"loading"/"guest" all render the same
  // signed-out affordance below, so there's no hydration mismatch, only
  // the same accepted post-hydration flash as the garage chip above once
  // GET /auth/me actually resolves.
  const authStatus = useAuthStore((state) => state.status);
  const authUser = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clear);
  const isAuthenticated = authStatus === "authenticated";
  const cartItemCount = useCartStore(selectItemCount);

  async function handleSignOut(): Promise<void> {
    await logout();
    clearAuth();
    useWishlistStore.getState().clear();
    // Logging out swaps identity server-side (the merged account cart is
    // no longer reachable without the accessToken cookie; a fresh
    // request now resolves to a brand-new guest cart) -- force a refetch
    // so the badge/page don't keep showing the just-logged-out cart.
    void useCartStore.getState().load({ force: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-container items-center justify-between gap-4 px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="باز کردن منو"
          className="inline-flex h-12 w-12 items-center justify-center rounded-md text-text md:hidden"
        >
          <MenuIcon />
        </button>

        <Link href="/" className="font-display text-h3 font-black text-brand">
          پارسیان
        </Link>

        <nav aria-label="دسته‌بندی‌ها" className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setCategoriesOpen((open) => !open)}
            aria-expanded={categoriesOpen}
            className="rounded-md px-3 py-2 text-body-sm font-medium text-text hover:bg-surface-raised"
          >
            دسته‌بندی‌ها
          </button>
          {categoriesOpen ? (
            <ul className="w-64 absolute top-full z-10 mt-1 rounded-md border border-border bg-surface p-2 shadow-md">
              {CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/c/${category.slug}`}
                    className="block rounded-md px-3 py-2 text-body-sm text-text hover:bg-surface-raised"
                  >
                    {category.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </nav>

        <form action="/search" className="hidden max-w-sm flex-1 md:flex">
          <label htmlFor="header-search" className="sr-only">
            جستجوی قطعه
          </label>
          <input
            id="header-search"
            name="q"
            type="search"
            placeholder="جستجوی قطعه یا کد فنی"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-body-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
        </form>

        <div className="flex items-center gap-2">
          {/* masterPlan.md §3.4: "Header shows the active vehicle as a
              compact chip; tap to switch." */}
          <button
            type="button"
            onClick={() => setVehicleModalOpen(true)}
            aria-label={
              activeVehicle ? `تعویض خودرو، فعلاً ${activeVehicle.label}` : "انتخاب خودرو"
            }
            className="hidden items-center gap-1 rounded-full border border-border px-3 py-1 text-body-sm text-text-muted hover:text-text sm:inline-flex"
          >
            <CarIcon />
            {activeVehicle?.label ?? "انتخاب خودرو"}
          </button>
          <Link
            href="/cart"
            aria-label={cartItemCount > 0 ? `سبد خرید، ${cartItemCount} قلم` : "سبد خرید"}
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-md text-text hover:bg-surface-raised"
          >
            <CartIcon />
            {cartItemCount > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -end-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-cta px-1 font-mono text-caption leading-none text-cta-fg"
              >
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </span>
            ) : null}
          </Link>
          {isAuthenticated ? (
            <>
              {/* The account overview is the stable entry point for every
                  customer self-service page. */}
              <Link
                href="/account"
                aria-label={
                  authUser ? `${messages.signedInAria} ${authUser.phone}` : messages.signedInAria
                }
                title={authUser?.phone}
                className="inline-flex h-12 w-12 items-center justify-center rounded-md text-brand hover:bg-surface-raised"
              >
                <AccountIcon />
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                aria-label={messages.signOutAria}
                className="inline-flex h-12 w-12 items-center justify-center rounded-md text-text hover:bg-surface-raised"
              >
                <SignOutIcon />
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              aria-label={messages.signInAria}
              className="inline-flex h-12 w-12 items-center justify-center rounded-md text-text hover:bg-surface-raised"
            >
              <AccountIcon />
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>

      <Drawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="منو"
        side="start"
      >
        <nav aria-label="منوی موبایل" className="flex flex-col gap-1">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/c/${category.slug}`}
              className="rounded-md px-3 py-2 text-body text-text hover:bg-surface-raised"
              onClick={() => setMobileMenuOpen(false)}
            >
              {category.label}
            </Link>
          ))}
          <hr className="my-2 border-border" />
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                void handleSignOut();
              }}
              className="rounded-md px-3 py-2 text-start text-body text-text hover:bg-surface-raised"
            >
              {messages.signOutAria}
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-md px-3 py-2 text-body text-text hover:bg-surface-raised"
              onClick={() => setMobileMenuOpen(false)}
            >
              {messages.signInAria}
            </Link>
          )}
          <Link
            href="/cart"
            className="rounded-md px-3 py-2 text-body text-text hover:bg-surface-raised"
            onClick={() => setMobileMenuOpen(false)}
          >
            {cartItemCount > 0 ? `سبد خرید (${cartItemCount})` : "سبد خرید"}
          </Link>
        </nav>
      </Drawer>

      <Modal
        open={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        title="انتخاب خودرو"
      >
        {/* Modal renders its children into the DOM even while closed (it
            only toggles the native <dialog>'s open state) -- mounting
            VehicleSelectorLazy unconditionally would trigger its dynamic
            import on every page load regardless of whether this modal is
            ever opened. Gating on vehicleModalOpen defers the fetch to
            an actual click, which is the whole point of code-splitting
            it (masterPlan.md §10). */}
        {vehicleModalOpen ? (
          <VehicleSelectorLazy onSelected={() => setVehicleModalOpen(false)} />
        ) : null}
      </Modal>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v-3l2-5h12l2 5v3M4 16h16M4 16v2M20 16v2M7 16v0M17 16v0"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L20 8H6"
      />
      <circle cx="9" cy="20" r="1" fill="currentColor" />
      <circle cx="17" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17l5-5-5-5M20 12H9M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"
      />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5"
      />
    </svg>
  );
}

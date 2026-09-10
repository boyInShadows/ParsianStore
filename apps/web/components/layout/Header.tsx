"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "@/i18n/navigation";
import { CATALOG_SYSTEMS } from "schemas";
import { initOverlays, overlaysReducer } from "./header-overlays";
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
  /** Threaded down to ThemeToggle, which sits in this header and nowhere
   *  else. One STABLE name for a two-state control -- it names the feature and
   *  lets `aria-pressed` carry the state; see components/theme/theme-toggle.tsx
   *  both for that and for why it takes props rather than calling next-intl's
   *  client hook. */
  themeToggleAria: string;
}

type Props = { messages: HeaderMessages };

// The five systems the DESKTOP dropdown surfaces, named by their catalogue code
// and resolved to a real slug at module load -- P9.S16's link sweep found three
// of the five hardcoded slugs here ("suspension", "body", "brake") 404ing, the
// exact drift the footer had already been fixed for: the real slugs are
// "suspension-steering", "body-exterior" and "brakes"
// (packages/schemas/catalogSystems.ts). Taking the slug from the source of
// truth means the link cannot rot again; a code that stops existing throws at
// import rather than shipping a dead menu entry.
//
// The labels stay local and stay short: this is the mechanic persona's own
// shorthand (masterPlan §1.2 / §3.1), deliberately terser than the catalogue's
// full names, which are written for a category page heading and are too long
// for a nav row.
//
// The MOBILE drawer does not use this list -- P14.S6 gives it all ten systems
// in a two-column grid, taken straight from CATALOG_SYSTEMS. A phone menu that
// shows five of ten categories is a phone menu that hides half the shop.
const NAV_SYSTEMS = [
  { code: "SYS-01", label: "موتوری" },
  { code: "SYS-03", label: "جلوبندی" },
  { code: "SYS-05", label: "برقی" },
  { code: "SYS-06", label: "بدنه" },
  { code: "SYS-04", label: "ترمز" },
] as const;

const CATEGORIES = NAV_SYSTEMS.map(({ code, label }) => {
  const system = CATALOG_SYSTEMS.find((entry) => entry.code === code);
  if (!system) throw new Error(`Header nav references unknown catalog system ${code}`);
  return { label, slug: system.slug };
});

/**
 * The information pages the drawer links to, and only the ones that exist.
 *
 * «برندها» is deliberately absent: fableTasks §P14.S6 item 2 asks for it, and
 * there is no `/brand` index route in this app -- only `/brand/[slug]`. The
 * brief's §2.2 is explicit that inventing a route is the failure mode that
 * costs the most time, so the entry is dropped and reported rather than
 * pointed at a 404.
 */
const DRAWER_PAGES = [
  { label: "راهنما", href: "/faq" },
  { label: "درباره ما", href: "/about" },
  { label: "تماس با ما", href: "/contact" },
];

/** Below this many pixels of downward travel the header stays whole. */
const COLLAPSE_AFTER_PX = 80;
/** Scroll deltas smaller than this are touch rubber-banding, not intent. */
const SCROLL_NOISE_PX = 4;
/**
 * How long the listener keeps ignoring direction AFTER row 2 has finished
 * animating.
 *
 * Changing a sticky header's height changes the height of content above the
 * viewport, and Chrome's scroll anchoring answers that by adjusting `scrollY`
 * to hold the visible content still -- which is exactly what you want visually
 * (no jump) and a trap for a scroll-direction listener: the correction arrives
 * as a scroll event in the OPPOSITE direction, which un-collapses the header,
 * which anchors again. Instrumented at 390x844 the loop ran indefinitely,
 * `scrollY` oscillating 571/585 and the attribute flipping true/false every
 * frame.
 *
 * The window that closes the loop is measured from `transitionend` on the row
 * itself, so a device that needs 600ms to reflow gets 600ms + this tail rather
 * than a fixed budget tuned on the machine it was written on. Inside the
 * window `lastY` keeps resyncing, so the listener resumes from wherever the
 * page actually ended up rather than from where it thought it was.
 */
const ANCHOR_SETTLE_MS = 200;
/**
 * Fallback transition length, used only when the computed style cannot be read
 * (no layout yet, a test environment without a real stylesheet). The real
 * number comes from the element, so `--duration-base` can change without this
 * file drifting from it.
 */
const FALLBACK_TRANSITION_MS = 250;

/** First `transition-duration` of `element`, in milliseconds. */
function transitionMs(element: Element): number {
  const raw = window.getComputedStyle(element).transitionDuration.split(",")[0]?.trim() ?? "";
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return FALLBACK_TRANSITION_MS;
  return raw.endsWith("ms") ? value : value * 1000;
}

const SEARCH_PLACEHOLDER = "جستجوی قطعه یا کد فنی";
const SEARCH_LABEL = "جستجوی قطعه";

export function Header({ messages }: Props) {
  const headerRef = useRef<HTMLElement>(null);
  const rowTwoRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  /**
   * The two overlays that must not survive the navigation they start.
   *
   * next/link does not unmount this component on a route change, so without
   * this a drawer opened on `/` stays open on top of `/c/…`. The state carries
   * the route it was last reconciled against and `navigate` REBASES it, which
   * is what makes a route change a one-way edge to closed -- see
   * `header-overlays.ts` for the browser-forward reopen that a plain
   * `openedOn === pathname` derivation could not fix.
   *
   * Dispatched during render, on purpose: this is React's documented
   * "adjusting state while rendering", it re-renders this component only and
   * before anything is committed, and it is the shape that neither
   * `react-hooks/set-state-in-effect` nor a cascading effect render applies
   * to. The reducer returns the same object when the route has not moved, so
   * the dispatch below is a no-op on every render that is not a navigation.
   */
  const [overlays, dispatch] = useReducer(overlaysReducer, pathname, initOverlays);
  if (overlays.pathname !== pathname) {
    dispatch({ type: "navigate", pathname });
  }
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const mobileMenuOpen = overlays.pathname === pathname && overlays.menu;
  const categoriesOpen = overlays.pathname === pathname && overlays.categories;
  const setMobileMenuOpen = (open: boolean) => dispatch({ type: "set", overlay: "menu", open });
  const setCategoriesOpen = (open: boolean) =>
    dispatch({ type: "set", overlay: "categories", open });
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

  /**
   * Collapse row 2 on the way down, bring it back on the way up (P14.S6).
   *
   * The result is written straight onto the element as a data attribute rather
   * than held in React state: this fires on every scroll frame of a 10,000px
   * page, and a `setState` here would re-render the header -- and with it the
   * drawer, the modal and the vehicle selector's mount guard -- for a change
   * that only one CSS rule cares about. `requestAnimationFrame` coalesces
   * bursts so the listener itself never reads layout more than once a frame.
   */
  useEffect(() => {
    const header = headerRef.current;
    const rowTwo = rowTwoRef.current;
    if (!header || !rowTwo) return;
    let lastY = window.scrollY;
    let frame = 0;
    let collapsed = false;
    /** `performance.now()` after which direction may be read again. */
    let settledAt = 0;
    // The deadline that applies until the row reports its own transition end:
    // an interrupted transition, `display: none` above `md`, and
    // `prefers-reduced-motion` (transition: none) all fire no `transitionend`
    // at all, so the wall clock has to cover them. Read from the element so a
    // change to `--duration-base` cannot leave this stale.
    const fallbackWindowMs = transitionMs(rowTwo) + ANCHOR_SETTLE_MS;

    function measure() {
      frame = 0;
      if (!header) return;
      const y = window.scrollY;
      const now = performance.now();
      // Our own last change is still settling -- resync and read nothing into
      // it. See ANCHOR_SETTLE_MS.
      if (now < settledAt) {
        lastY = y;
        return;
      }
      const delta = y - lastY;
      if (Math.abs(delta) < SCROLL_NOISE_PX) return;
      lastY = y;
      const next = y > COLLAPSE_AFTER_PX && delta > 0;
      if (next === collapsed) return;
      collapsed = next;
      header.dataset.headerCollapsed = next ? "true" : "false";
      settledAt = now + fallbackWindowMs;
    }

    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    }

    // The self-correcting half: when the row genuinely finishes animating,
    // restart the window from THAT moment plus the anchoring tail. On a fast
    // device this lands on the same ~450ms the fixed budget used to guess; on
    // a slow one, where reflow after the transition is what overruns the
    // budget, the window grows to match instead of reopening the oscillation.
    function onTransitionEnd(event: TransitionEvent) {
      if (event.target !== rowTwo) return;
      if (event.propertyName !== "grid-template-rows") return;
      // Only ever extend a window we opened; never start one.
      if (settledAt === 0) return;
      settledAt = performance.now() + ANCHOR_SETTLE_MS;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    rowTwo.addEventListener("transitionend", onTransitionEnd);
    return () => {
      window.removeEventListener("scroll", onScroll);
      rowTwo.removeEventListener("transitionend", onTransitionEnd);
      // A frame queued on the last scroll before unmount would otherwise still
      // run and write to a detached node.
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

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

  const vehicleChipLabel = activeVehicle?.label ?? "انتخاب خودرو";
  const vehicleChipAria = activeVehicle
    ? `تعویض خودرو، فعلاً ${activeVehicle.label}`
    : "انتخاب خودرو";

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-border bg-surface-translucent text-text shadow-md backdrop-blur"
    >
      {/* Two rows on a phone, one from `md` up.
          `md:contents` on the row-1 wrapper is what buys the second layout
          without a second copy of the markup: above `md` the wrapper stops
          generating a box and its children become direct children of this
          flex row, which is exactly the single-row header that shipped before
          P14.S6.

          Mobile height: 4 (py-1) + 44 (row 1) + 4 (gap) + 44 (row 2) + 4 + 1px
          border = 101px, against the step's 104px ceiling. */}
      <div className="mx-auto flex max-w-container flex-col gap-1 px-4 py-1 md:flex-row md:items-center md:justify-between md:gap-4 md:py-3">
        <div className="flex items-center justify-between gap-2 md:contents">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="باز کردن منو"
            aria-expanded={mobileMenuOpen}
            className="w-tap inline-flex h-tap shrink-0 items-center justify-center border border-border text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:hidden"
          >
            <MenuIcon />
          </button>

          <Link
            href="/"
            className="inline-flex min-h-tap items-center font-display text-h3 font-black text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:min-h-0"
          >
            پارسیان
          </Link>

          <nav aria-label="دسته‌بندی‌ها" className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setCategoriesOpen(!categoriesOpen)}
              aria-expanded={categoriesOpen}
              className="px-3 py-2 text-body-sm font-medium text-text-muted hover:bg-surface-raised hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              دسته‌بندی‌ها
            </button>
            {categoriesOpen ? (
              <ul className="w-64 absolute top-full z-10 mt-1 rounded-md border border-border bg-surface p-2 shadow-md">
                {CATEGORIES.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/c/${category.slug}`}
                      className="block rounded-md px-3 py-2 text-body-sm text-text hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      {category.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </nav>

          <SearchForm id="header-search" className="hidden max-w-sm flex-1 md:flex" />

          <div className="flex items-center gap-1 md:gap-2">
            {/* masterPlan.md §3.4: "Header shows the active vehicle as a
                compact chip; tap to switch." On a phone it moves to row 2,
                beside the search field -- see the second instance below. */}
            <VehicleChip
              aria={vehicleChipAria}
              label={vehicleChipLabel}
              onClick={() => setVehicleModalOpen(true)}
              className="hidden md:inline-flex"
            />
            <Link
              href="/cart"
              aria-label={cartItemCount > 0 ? `سبد خرید، ${cartItemCount} قلم` : "سبد خرید"}
              className="w-tap relative inline-flex h-tap items-center justify-center text-text hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
                  className="w-tap inline-flex h-tap items-center justify-center text-brand hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <AccountIcon />
                </Link>
                {/* Sign-out is a drawer action on a phone: row 1 has room for
                    four targets at 44px and this is the least-used of five. */}
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  aria-label={messages.signOutAria}
                  className="w-tap hidden h-tap items-center justify-center text-text hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:inline-flex"
                >
                  <SignOutIcon />
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                aria-label={messages.signInAria}
                className="w-tap inline-flex h-tap items-center justify-center text-text hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <AccountIcon />
              </Link>
            )}
            {/* The toggle is a drawer control on a phone (P14.S6 item 2). It
                was row 1's first item and it is the one control there nobody
                reaches for twice a session. */}
            <div className="hidden md:block">
              <ThemeToggle label={messages.themeToggleAria} />
            </div>
          </div>
        </div>

        {/* Row 2 -- phones only, and the whole point of this step: a parts shop
            was hiding search and "my car" behind a hamburger on the device
            most of its visitors use. `.header-row-2` collapses this row after
            80px of downward scroll; see styles/globals.css. */}
        <div ref={rowTwoRef} className="header-row-2">
          <div>
            <div className="flex items-center gap-2">
              <SearchForm id="header-search-mobile" className="min-w-0 flex-1 basis-1/2" />
              <VehicleChip
                aria={vehicleChipAria}
                label={vehicleChipLabel}
                onClick={() => setVehicleModalOpen(true)}
                className="inline-flex min-w-0 flex-1 basis-1/3 justify-center"
              />
            </div>
          </div>
        </div>
      </div>

      <Drawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="منو"
        side="start"
      >
        <nav aria-label="منوی موبایل" className="flex flex-col gap-6">
          {/* All ten systems, two columns.
              No glyphs, and that is a budget decision rather than a design one:
              `SystemGlyph` is a Server Component today, reached only from the
              landing page's system index, and importing it here would drag ten
              inline SVGs across the "use client" boundary into EVERY route's
              client bundle -- on a route already 6KB over its First Load gate.
              The names are what a visitor reads anyway. */}
          <ul className="grid grid-cols-2 gap-2">
            {CATALOG_SYSTEMS.map((system) => (
              <li key={system.code}>
                <Link
                  href={`/c/${system.slug}`}
                  className="flex min-h-tap items-center rounded-md border border-border p-2 text-body-sm text-text hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {system.name.fa}
                </Link>
              </li>
            ))}
          </ul>

          <ul className="flex flex-col border-t border-border pt-2">
            {DRAWER_PAGES.map((page) => (
              <li key={page.href}>
                <Link
                  href={page.href}
                  className="flex min-h-tap items-center rounded-md px-3 text-body text-text hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex flex-col border-t border-border pt-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void handleSignOut();
                }}
                className="flex min-h-tap items-center rounded-md px-3 text-start text-body text-text hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {messages.signOutAria}
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="flex min-h-tap items-center rounded-md px-3 text-body text-text hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                onClick={() => setMobileMenuOpen(false)}
              >
                {messages.signInAria}
              </Link>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            <span className="text-body-sm text-text-muted">{messages.themeToggleAria}</span>
            <ThemeToggle label={messages.themeToggleAria} />
          </div>
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

/**
 * The search field, rendered twice on purpose.
 *
 * The desktop instance sits between the category nav and the actions; the
 * mobile one is row 2's whole reason for existing. They cannot be one node --
 * they are in different rows of a flex column -- so this keeps them one
 * definition, and the `id` is a parameter because two `<input id="...">` with
 * the same value is a real accessibility failure, not a lint nit. Only one is
 * ever displayed, so only one is ever in the accessibility tree.
 */
function SearchForm({ id, className }: { id: string; className: string }) {
  return (
    <form action="/search" className={className}>
      <label htmlFor={id} className="sr-only">
        {SEARCH_LABEL}
      </label>
      <input
        id={id}
        name="q"
        type="search"
        placeholder={SEARCH_PLACEHOLDER}
        className="h-tap w-full border border-border bg-surface px-3 font-mono text-body-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus md:h-12 md:px-4"
      />
    </form>
  );
}

function VehicleChip({
  aria,
  label,
  onClick,
  className,
}: {
  aria: string;
  label: string;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      className={`h-tap items-center gap-2 border border-border px-3 text-body-sm text-text-muted hover:border-brand hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${className}`}
    >
      <CarIcon />
      {/* A selected vehicle reads «سایپا شاهین ۲۰۲۰» -- longer than the chip
          has room for beside a search field at 360px. Truncating the label is
          right where truncating the control would not be: the full name is
          still in the accessible name above. */}
      <span className="truncate">{label}</span>
    </button>
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
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
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

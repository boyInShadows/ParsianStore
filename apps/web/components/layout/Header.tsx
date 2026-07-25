"use client";

import { useState } from "react";
import Link from "next/link";
import { Drawer } from "@/components/primitives";
import { ThemeToggle } from "@/components/theme/theme-toggle";

// Real system-category vocabulary from masterPlan.md §1.2 / §3.1 -- the
// mechanic persona's own terms, not invented labels.
const CATEGORIES = [
  { label: "موتوری", slug: "engine" },
  { label: "جلوبندی", slug: "suspension" },
  { label: "برقی", slug: "electrical" },
  { label: "بدنه", slug: "body" },
  { label: "ترمز", slug: "brake" },
];

export function Header() {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-container items-center justify-between gap-4 px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="باز کردن منو"
          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-text md:hidden"
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
            <ul className="w-48 absolute top-full z-10 mt-1 rounded-md border border-border bg-surface p-2 shadow-md">
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
          {/* Static for now -- wired to the real garage store in P4.S3 (masterPlan.md §3.4). */}
          <button
            type="button"
            aria-label="انتخاب خودرو"
            className="hidden items-center gap-1 rounded-full border border-border px-3 py-1 text-body-sm text-text-muted hover:text-text sm:inline-flex"
          >
            <CarIcon />
            انتخاب خودرو
          </button>
          <Link
            href="/cart"
            aria-label="سبد خرید"
            className="h-9 w-9 inline-flex items-center justify-center rounded-md text-text hover:bg-surface-raised"
          >
            <CartIcon />
          </Link>
          <Link
            href="/account"
            aria-label="حساب کاربری"
            className="h-9 w-9 inline-flex items-center justify-center rounded-md text-text hover:bg-surface-raised"
          >
            <AccountIcon />
          </Link>
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
          <Link
            href="/account"
            className="rounded-md px-3 py-2 text-body text-text hover:bg-surface-raised"
            onClick={() => setMobileMenuOpen(false)}
          >
            حساب کاربری
          </Link>
          <Link
            href="/cart"
            className="rounded-md px-3 py-2 text-body text-text hover:bg-surface-raised"
            onClick={() => setMobileMenuOpen(false)}
          >
            سبد خرید
          </Link>
        </nav>
      </Drawer>
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

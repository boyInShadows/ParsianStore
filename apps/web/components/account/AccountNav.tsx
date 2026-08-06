import { Link } from "@/i18n/navigation";

// Plain Server Component -- no "use client" needed, `active` is passed
// statically by each page rather than computed via usePathname(), so
// this adds zero client JS to /orders (P7.S1's own pure-SSR page).
export type AccountNavKey = "orders" | "addresses" | "wishlist" | "garage";

// One `labels` record rather than one prop per entry. The per-entry shape
// meant every new account page (reviews, wallet, tickets are all named
// Phase 7 scope) forced an edit to all four existing call sites just to
// pass another label. Adding a key now touches this file and the new page.
type Props = {
  active: AccountNavKey;
  labels: Record<AccountNavKey, string>;
};

const ITEMS: { key: AccountNavKey; href: string }[] = [
  { key: "orders", href: "/orders" },
  { key: "addresses", href: "/addresses" },
  { key: "wishlist", href: "/wishlist" },
  { key: "garage", href: "/garage" },
];

export function AccountNav({ active, labels }: Props) {
  return (
    // Full-bleed horizontal scroll at 360px (the negative inline margin
    // cancels the page gutter) so a fifth or sixth tab never wraps into a
    // second row. border-rule, so this and PageHeader's own rule read as one
    // continuous shell rather than two stacked boxes.
    <nav
      aria-label="حساب کاربری"
      className="-mx-4 overflow-x-auto border-b border-rule px-4 lg:mx-0 lg:px-0"
    >
      <ul className="flex min-w-max items-end gap-1">
        {ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                // The active tab is raised onto --surface with a solid
                // underline, not just a colored word -- it reads as the
                // sheet the page below it belongs to.
                className={`-mb-px inline-flex min-h-12 items-center rounded-t-md border-b-2 px-4 text-body-sm transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus motion-reduce:transition-none ${
                  isActive
                    ? "border-brand-solid bg-surface font-medium text-text"
                    : "border-transparent text-text-muted hover:bg-surface-raised hover:text-text"
                }`}
              >
                {labels[item.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

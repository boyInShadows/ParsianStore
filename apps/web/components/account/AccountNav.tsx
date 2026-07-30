import { Link } from "@/i18n/navigation";

// Plain Server Component -- no "use client" needed, `active` is passed
// statically by each page rather than computed via usePathname(), so
// this adds zero client JS to /orders (P7.S1's own pure-SSR page).
// Justified now that two real account pages exist (P7.S2); a single
// page never needed cross-navigation. Extended to a third entry at P7.S3
// (wishlist) -- still a flat list, not worth a data-driven map until a
// fourth page (My Garage) makes the repetition real.
type Props = {
  active: "orders" | "addresses" | "wishlist";
  ordersLabel: string;
  addressesLabel: string;
  wishlistLabel: string;
};

export function AccountNav({ active, ordersLabel, addressesLabel, wishlistLabel }: Props) {
  return (
    <nav aria-label="حساب کاربری" className="flex gap-4 border-b border-border text-body-sm">
      <Link
        href="/orders"
        aria-current={active === "orders" ? "page" : undefined}
        className={`-mb-px border-b-2 pb-2 ${
          active === "orders"
            ? "border-brand-solid text-text"
            : "border-transparent text-text-muted hover:text-text"
        }`}
      >
        {ordersLabel}
      </Link>
      <Link
        href="/addresses"
        aria-current={active === "addresses" ? "page" : undefined}
        className={`-mb-px border-b-2 pb-2 ${
          active === "addresses"
            ? "border-brand-solid text-text"
            : "border-transparent text-text-muted hover:text-text"
        }`}
      >
        {addressesLabel}
      </Link>
      <Link
        href="/wishlist"
        aria-current={active === "wishlist" ? "page" : undefined}
        className={`-mb-px border-b-2 pb-2 ${
          active === "wishlist"
            ? "border-brand-solid text-text"
            : "border-transparent text-text-muted hover:text-text"
        }`}
      >
        {wishlistLabel}
      </Link>
    </nav>
  );
}

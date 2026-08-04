import { Link } from "@/i18n/navigation";

// Plain Server Component -- no "use client" needed, `active` is passed
// statically by each page rather than computed via usePathname(), so
// this adds zero client JS to /orders (P7.S1's own pure-SSR page).
// Extended to a fourth entry at P7.S4 (My Garage) -- the repetition
// predicted at P7.S3 is now real, so this switched from four copies of
// the same JSX block to one data-driven map.
type NavKey = "orders" | "addresses" | "wishlist" | "garage";

type Props = {
  active: NavKey;
  ordersLabel: string;
  addressesLabel: string;
  wishlistLabel: string;
  garageLabel: string;
};

export function AccountNav({
  active,
  ordersLabel,
  addressesLabel,
  wishlistLabel,
  garageLabel,
}: Props) {
  const items: { key: NavKey; href: string; label: string }[] = [
    { key: "orders", href: "/orders", label: ordersLabel },
    { key: "addresses", href: "/addresses", label: addressesLabel },
    { key: "wishlist", href: "/wishlist", label: wishlistLabel },
    { key: "garage", href: "/garage", label: garageLabel },
  ];

  return (
    <nav aria-label="حساب کاربری" className="flex gap-4 border-b border-border text-body-sm">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={active === item.key ? "page" : undefined}
          className={`-mb-px border-b-2 pb-2 ${
            active === item.key
              ? "border-brand-solid text-text"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

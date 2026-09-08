import Link from "next/link";

const ITEMS = [
  { label: "خانه", href: "/", icon: HomeIcon },
  { label: "جستجو", href: "/search", icon: SearchIcon },
  { label: "گاراژ", href: "/garage", icon: CarIcon },
  { label: "سبد خرید", href: "/cart", icon: CartIcon },
  { label: "حساب", href: "/account", icon: AccountIcon },
];

// Fixed bottom bar, mobile only -- the Header's hamburger Drawer covers the
// full menu, this covers the handful of always-reachable core actions.
//
// P14.S6 asked for a "sticky bottom action bar" with search, my-car and a
// phone link. This IS that bar, and a second one would have been a defect:
// two fixed bars on an 844px screen. Two of the three actions it named are
// already here -- «جستجو» is the search entry point and «گاراژ» is "my car" --
// and the phone stays where a phone number belongs, in the footer's contact
// block and the closing beat's support panel, both `tel:` links. The plan was
// written without knowing this component existed.
//
// `-outline-offset-2` (inset), not the usual `outline-offset-2`: the bar sits
// flush against the bottom of the viewport, so an outward focus ring on the
// last row would be drawn off-screen.
export function MobileNav() {
  return (
    <nav
      aria-label="پیمایش پایین صفحه"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface md:hidden"
    >
      {ITEMS.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex min-h-tap flex-1 flex-col items-center justify-center gap-1 py-2 text-caption text-text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        >
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4 11 8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="m20 20-4.3-4.3" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v-3l2-5h12l2 5v3M4 16h16M4 16v2M20 16v2"
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

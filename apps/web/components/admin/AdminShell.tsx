"use client"; // MUI's `component={Link}` prop pattern passes a component
// reference (not a rendered element) across the Server->Client boundary --
// React can't serialize that from a Server Component, confirmed by a real
// "Only plain objects can be passed to Client Components" crash building
// this. Unlike components/account/AccountNav.tsx's plain Tailwind <Link>
// (no cross-boundary component-prop trickiness), MUI's own composition
// pattern needs this file to be a Client Component itself. `active` is
// still passed statically per page, not computed via usePathname() --
// that part of AccountNav's reasoning still applies. Kept per-page (not
// rendered once in the (admin) layout) for the same reason AccountNav is:
// the layout only ever sees "some admin page is rendering," it has no way
// to know which nav item that page wants highlighted without either an
// awkward per-route config or a client-side pathname read.

import type { ReactNode } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { Link } from "@/i18n/navigation";
import { useAdminRole } from "./AdminRoleProvider";
type Props = {
  active:
    | "dashboard"
    | "orders"
    | "products"
    | "catalog"
    | "discounts"
    | "customers"
    | "vehicles"
    | "shipping"
    | "feedback"
    | "audit";
  children: ReactNode;
};

// P8.S8. Roles the audit trail is readable by -- it records what staff
// did, so support/operator accounts must not be able to review it. Kept
// byte-identical to requireRole("admin", "superadmin") in
// audit.admin.routes.ts, which is what actually enforces this.
const AUDIT_ROLES = new Set(["admin", "superadmin"]);

const NAV_ITEMS = [
  // P8.S5. First entry, not appended: /admin is now a real overview page
  // and the place staff land after signing in.
  { key: "dashboard" as const, href: "/admin", label: "داشبورد" },
  { key: "orders" as const, href: "/admin/orders", label: "سفارش‌ها" },
  { key: "products" as const, href: "/admin/products", label: "محصولات" },
  // P8.S4. One entry, not three: masterPlan §5's map names /admin/categories,
  // /admin/brands and /admin/attributes as separate routes (and they are --
  // each keeps its own page/search state in its own URL), but seven top-level
  // sidebar items would bury the ones staff use daily. The three share an
  // in-page tab bar instead; `catalog` stays highlighted across all of them.
  { key: "catalog" as const, href: "/admin/categories", label: "کاتالوگ" },
  // P8.S3. /admin/discounts, not /admin/coupons -- masterPlan §5's own
  // admin route map already names this surface "coupons & campaigns".
  // P8.S6. One entry for both /admin/vehicles and /admin/fitment, sharing
  // an in-page tab bar -- the same reasoning `catalog` above uses for its
  // three routes.
  { key: "vehicles" as const, href: "/admin/vehicles", label: "خودروها" },
  { key: "discounts" as const, href: "/admin/discounts", label: "تخفیف‌ها" },
  { key: "customers" as const, href: "/admin/customers", label: "مشتریان" },
  // P8.S9. The courier method list itself is a static const; this route
  // configures the weight/price ladder behind it.
  { key: "shipping" as const, href: "/admin/shipping", label: "ارسال" },
  { key: "feedback" as const, href: "/admin/feedback", label: "نظرات و پرسش‌ها" },
  { key: "audit" as const, href: "/admin/audit", label: "گزارش رویدادها" },
];

export function AdminShell({ active, children }: Props) {
  const role = useAdminRole();
  // Hidden rather than shown-and-403: a nav entry that always fails for
  // half the staff roles is worse than no entry at all.
  const navItems = NAV_ITEMS.filter(
    (item) => item.key !== "audit" || (role !== null && AUDIT_ROLES.has(role)),
  );

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
            پنل مدیریت پارسیان
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: "flex", flex: 1 }}>
        <Box component="nav" sx={{ width: 220, borderInlineEnd: 1, borderColor: "divider", py: 2 }}>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.key} disablePadding>
                <ListItemButton component={Link} href={item.href} selected={item.key === active}>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
        <Box component="main" sx={{ flex: 1, p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

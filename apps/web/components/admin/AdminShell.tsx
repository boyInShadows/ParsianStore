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
type Props = {
  active: "orders";
  children: ReactNode;
};

const NAV_ITEMS = [{ key: "orders" as const, href: "/admin/orders", label: "سفارش‌ها" }];

export function AdminShell({ active, children }: Props) {
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
            {NAV_ITEMS.map((item) => (
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

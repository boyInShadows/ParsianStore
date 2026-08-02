"use client"; // MUI Tabs needs a value and renders interactive controls.

import { Tabs, Tab, Box } from "@mui/material";
import { Link } from "@/i18n/navigation";

export type CatalogTab = "categories" | "brands" | "attributes";

// Each tab is a real Link to its own route rather than local tab state:
// masterPlan §5's admin map names all three paths, and a shared URL keeps
// each screen's own page/search/state independent — the same URL-as-state
// discipline the shop's PLP filters follow.
const TABS: { value: CatalogTab; href: string; label: string }[] = [
  { value: "categories", href: "/admin/categories", label: "دسته‌بندی‌ها" },
  { value: "brands", href: "/admin/brands", label: "برندها" },
  { value: "attributes", href: "/admin/attributes", label: "ویژگی‌ها" },
];

export function AdminCatalogTabs({ active }: { active: CatalogTab }) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Tabs value={active} aria-label="بخش‌های کاتالوگ">
        {TABS.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label}
            component={Link}
            href={tab.href}
          />
        ))}
      </Tabs>
    </Box>
  );
}

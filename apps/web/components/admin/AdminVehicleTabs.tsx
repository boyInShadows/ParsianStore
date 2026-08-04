"use client"; // MUI Tabs needs a value and renders interactive controls.

import { Tabs, Tab, Box } from "@mui/material";
import { Link } from "@/i18n/navigation";

export type VehicleTab = "tree" | "fitment";

// Two real routes, not local tab state -- the same URL-as-state
// discipline AdminCatalogTabs already follows, so each screen keeps its
// own selection and filters in its own URL.
const TABS: { value: VehicleTab; href: string; label: string }[] = [
  { value: "tree", href: "/admin/vehicles", label: "درخت خودروها" },
  { value: "fitment", href: "/admin/fitment", label: "مدیریت سازگاری" },
];

export function AdminVehicleTabs({ active }: { active: VehicleTab }) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Tabs value={active} aria-label="بخش‌های خودرو">
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

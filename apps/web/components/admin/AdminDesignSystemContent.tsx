"use client"; // Owns the selected-tab state.

import { useState } from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import type { DesignTokens } from "@/lib/design-tokens";
import { AdminDesignSystemFoundations } from "./AdminDesignSystemFoundations";
import { AdminDesignSystemStorefront } from "./AdminDesignSystemStorefront";
import { AdminDesignSystemComponents } from "./AdminDesignSystemComponents";

/**
 * P11.S1 -- docs/decisions/0027-design-system-consolidation.md.
 *
 * In-page tabs rather than three routes, the same call AdminCatalogTabs and
 * AdminVehicleTabs already make: this is one subject read top-to-bottom, and
 * three sidebar entries for documentation would bury the entries staff use
 * daily. Unlike those two, these tabs are NOT routes -- there is no
 * per-tab state worth putting in a URL, and the storefront tab's iframe
 * would reload on every switch if they were.
 */
const TABS = [
  { id: "foundations", label: "بنیان‌ها" },
  { id: "storefront", label: "اجزای فروشگاه" },
  { id: "admin", label: "اجزای پنل مدیریت" },
] as const;

export function AdminDesignSystemContent({
  tokens,
  styleguideHref,
}: {
  tokens: DesignTokens;
  styleguideHref: string;
}) {
  const [tab, setTab] = useState(0);
  // TABS is a const tuple, so TABS[0] is statically known to exist while
  // TABS[tab] is not -- the fallback satisfies noUncheckedIndexedAccess
  // without an assertion, and is unreachable in practice.
  const current = TABS[tab] ?? TABS[0];

  return (
    <Box>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 0.5 }}>
        سیستم طراحی
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: "72ch" }}>
        مرجع زندهٔ سیستم طراحی پارسیان: توکن‌های پایه، اجزای فروشگاه و اجزای پنل مدیریت، در هر دو تم
        روشن و تیره. جهت طراحی «فولادی + همیشه‌بهار» است با انضباط دو-لهجه‌ای — فولادی صاحب ناوبری،
        همیشه‌بهار صاحب پول.
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
      >
        {TABS.map((entry, index) => (
          <Tab
            key={entry.id}
            label={entry.label}
            id={`ds-tab-${entry.id}`}
            aria-controls={`ds-panel-${entry.id}`}
            value={index}
          />
        ))}
      </Tabs>

      {/* Only the selected panel is mounted. The storefront tab's iframe is a
          whole second document -- mounting all three would load the entire
          storefront on every visit to a page most staff open for the colors. */}
      <Box role="tabpanel" id={`ds-panel-${current.id}`} aria-labelledby={`ds-tab-${current.id}`}>
        {tab === 0 && <AdminDesignSystemFoundations tokens={tokens} />}
        {tab === 1 && <AdminDesignSystemStorefront styleguideHref={styleguideHref} />}
        {tab === 2 && <AdminDesignSystemComponents />}
      </Box>
    </Box>
  );
}

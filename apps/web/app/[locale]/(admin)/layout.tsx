import type { ReactNode } from "react";
import { MuiProviders } from "@/components/admin/mui-providers";

/**
 * MUI is imported ONLY here, under (admin) -- masterPlan.md §7.4's physical
 * separation rule. tailwind.config.js's content glob excludes app/(admin)/**
 * so Tailwind never generates utility classes for anything in this subtree.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <MuiProviders>{children}</MuiProviders>;
}

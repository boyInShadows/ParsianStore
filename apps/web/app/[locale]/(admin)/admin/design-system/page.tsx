import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDesignSystemContent } from "@/components/admin/AdminDesignSystemContent";
import { getDesignTokens } from "@/lib/design-tokens";
import { getPathname } from "@/i18n/navigation";

/**
 * P11.S1 -- docs/decisions/0027-design-system-consolidation.md.
 *
 * A Server Component on purpose: getDesignTokens() reads styles/tokens.css
 * and tailwind.config.js off disk, so it can only run here. The parsed
 * result is plain serializable data, which is what crosses to the client.
 */
export default async function AdminDesignSystemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tokens = getDesignTokens();
  // localePrefix is "as-needed" (i18n/routing.ts), so fa resolves to
  // /styleguide and en to /en/styleguide. Built through getPathname rather
  // than string-concatenated so that rule stays in one place.
  const styleguideHref = getPathname({ href: "/styleguide", locale });

  return (
    <AdminShell active="design-system">
      <AdminDesignSystemContent tokens={tokens} styleguideHref={styleguideHref} />
    </AdminShell>
  );
}

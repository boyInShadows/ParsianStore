import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/primitives";

// Same reasoning as the PLP's own not-found.tsx (P5.S1): without this,
// Next falls back to a generic English/non-RTL 404 for a real, reachable
// state (any unknown or removed product slug).
export default async function ProductNotFound() {
  const t = await getTranslations("Catalog.pdp.notFound");

  return (
    <main className="mx-auto max-w-container px-4 py-16">
      <EmptyState
        titleAs="h1"
        title={t("title")}
        description={t("description")}
        action={
          <Link href="/" className="text-body-sm text-brand hover:underline">
            {t("backHome")}
          </Link>
        }
      />
    </main>
  );
}

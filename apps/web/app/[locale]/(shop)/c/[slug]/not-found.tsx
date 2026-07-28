import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/primitives";

// Next.js falls back to a generic (English, non-RTL) 404 for this segment
// without a file here -- a real, reachable state for `/c/[slug]` (any
// unknown or removed category slug), so it needs the same locale/RTL
// treatment as every other shipped page (CLAUDE.md rule 4).
export default async function CategoryNotFound() {
  const t = await getTranslations("Catalog.notFound");

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

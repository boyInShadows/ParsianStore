import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/primitives";

export default async function BrandNotFound() {
  const t = await getTranslations("Catalog.brandPage.notFound");

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

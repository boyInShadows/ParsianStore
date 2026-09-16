import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/primitives";

// At `brand/`, not `brand/[slug]/`, and for the reason spelled out in
// `c/not-found.tsx`: the not-found decision lives in `brand/[slug]/layout.tsx`
// so the 404 status survives the streaming flush, and a layout's `notFound()`
// is caught one segment above that layout. Moved back down, this file would
// never render again (P15.S10).
export default async function BrandNotFound() {
  const t = await getTranslations("Catalog.brandPage.notFound");

  return (
    <main className="mx-auto max-w-container px-4 py-16">
      <EmptyState
        titleAs="h1"
        title={t("title")}
        description={t("description")}
        action={
          <Link
            href="/"
            className="inline-flex text-body-sm text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {t("backHome")}
          </Link>
        }
      />
    </main>
  );
}

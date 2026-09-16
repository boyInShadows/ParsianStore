import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/primitives";

// Same reasoning as the PLP's own not-found.tsx (P5.S1): without this,
// Next falls back to a generic English/non-RTL 404 for a real, reachable
// state (any unknown or removed product slug).
//
// At `p/`, not `p/[slug]/`, and for the reason spelled out in
// `c/not-found.tsx`: the decision lives in `p/[slug]/layout.tsx` so the 404
// status survives the streaming flush, and a layout's `notFound()` is caught
// one segment above that layout. This is the boundary that keeps a dead
// product link saying «کالا یافت نشد» rather than «این صفحه پیدا نشد» --
// the shopper is told the *part* is gone, which is a next step rather than a
// dead end (P15.S10, owner call).
export default async function ProductNotFound() {
  const t = await getTranslations("Catalog.pdp.notFound");

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

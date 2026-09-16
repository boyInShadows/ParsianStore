import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/primitives";

/**
 * The shop group's 404 (P15.S10).
 *
 * Three more specific boundaries exist and **take precedence over this one**:
 * `c/not-found.tsx`, `brand/not-found.tsx` and `p/not-found.tsx`. They name the
 * thing that was missing — «کالا یافت نشد» on a dead product link, not «این
 * صفحه پیدا نشد» — which is the difference between telling a shopper the part
 * is gone and telling them a page is missing.
 *
 * They each sit one segment **above** the `[slug]` they describe, and that is
 * load-bearing rather than tidy. The first cut of P15.S10 left them inside
 * `[slug]`, where React's rule that a layout's `notFound()` is caught above
 * that layout's own segment made all three unreachable and quietly downgraded
 * every catalogue 404 to the generic copy below. The owner reversed that: the
 * specific message is the point, and this file is the fallback, not the
 * default.
 *
 * So what reaches *this* file is everything the catalogue has no specific
 * sentence for:
 *
 * **1. `/vehicle/[make]` and `/vehicle/[make]/[model]/[gen]`**, which have
 * called `notFound()` on an unknown slug since P9.S15 and answered it in
 * English, LTR, the whole time. Giving those two a localised 404 is why this
 * file was added.
 *
 * **2. Anything added later with no boundary of its own** — including any
 * future segment that follows P15.S10 and moves its decision into a
 * `layout.tsx` without also adding a parent-segment `not-found.tsx`. Next's
 * built-in "This page could not be found" is the alternative, and it is English
 * and LTR.
 *
 * Same primitives and same shape as the three specific boundaries,
 * deliberately: a visitor who lands here and a visitor who lands on the
 * category one should not feel they found two different sites.
 */
export default async function ShopNotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main className="mx-auto max-w-container px-4 py-16">
      <EmptyState
        titleAs="h1"
        title={t("title")}
        description={t("description")}
        action={
          /* The three leaves rely on the browser's default ring here; this one
             carries the repo's own focus token, the same combination the
             footer's link columns use. A 404 is often reached by keyboard (a
             typed URL, a back button) and its single link is the only way out
             of the page. */
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

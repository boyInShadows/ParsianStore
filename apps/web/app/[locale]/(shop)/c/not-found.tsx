import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/primitives";

// Next.js falls back to a generic (English, non-RTL) 404 for this segment
// without a file here -- a real, reachable state for `/c/[slug]` (any
// unknown or removed category slug), so it needs the same locale/RTL
// treatment as every other shipped page (CLAUDE.md rule 4).
//
// **It sits at `c/`, not at `c/[slug]/`, and moving it back down would silently
// retire it** (P15.S10). The not-found decision is made in
// `c/[slug]/layout.tsx` -- it has to be, to keep the 404 status ahead of the
// streaming flush -- and React catches a layout's `notFound()` *above* that
// layout's own segment. One segment up is the nearest boundary that is
// eligible; from inside `[slug]` this file would never render again and every
// missing category would fall through to the group's generic 404.
export default async function CategoryNotFound() {
  const t = await getTranslations("Catalog.notFound");

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

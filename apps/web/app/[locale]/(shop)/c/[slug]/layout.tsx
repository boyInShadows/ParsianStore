import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { fetchCategoryBySlug } from "@/lib/fetchers/catalog";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

/**
 * Where `/c/[slug]` decides it is a 404 — **outside the Suspense boundary that
 * `loading.tsx` creates** (P15.S10).
 *
 * ## Why this is a layout and not `generateMetadata`
 *
 * P15.S3 measured that adding a `loading.tsx` here turned `/c/{unknown}` from
 * 404 into 200: the streaming shell is flushed before the page reaches its
 * `notFound()`, and once the shell is flushed the response is committed.
 * P15.S10's brief proposed hoisting the decision into `generateMetadata`,
 * because Next used to resolve metadata before it streamed. **It does not any
 * more.** Next 15.2 introduced streaming metadata: `generateMetadata` renders
 * inside a Suspense boundary of its own and is streamed with the page, so it no
 * longer gates the shell. Measured on 15.5.21, a `notFound()` there leaves the
 * route answering **200** — and worse than before, because the visitor then
 * lands on Next's built-in English, LTR 404 instead of a localised one.
 * Googlebot and Twitterbot get the 200 too; the `htmlLimitedBots` blocking path
 * does not rescue it.
 *
 * A layout does gate it. `loading.tsx` wraps only its segment's **page** in
 * Suspense; the segment's layout sits above that boundary, so an `await` here
 * still blocks the first flush. Measured on a production build with
 * `loading.tsx` present: `/c/{unknown}` → **404** with «دسته‌بندی یافت نشد»,
 * `/c/engine` → **200**.
 *
 * ## What it must not do
 *
 * Only `reason === "not-found"` 404s. An unreachable API is `reason === "down"`
 * and must fall through to the page, which renders its `EmptyState` — P9.S15's
 * rule, and the reason `fetchCategoryBySlug` returns a three-way result at all:
 * degrading on a typo'd slug tells a crawler the URL is real, and 404-ing
 * during an outage deletes the catalogue from the index.
 *
 * ## Cost
 *
 * Zero extra HTTP calls. This is the same argument-identical `fetch` GET that
 * `generateMetadata` and the page already make, and Next memoizes those across
 * layout, metadata and page within one request — verified on a real build, not
 * assumed. Nothing here needs a dedupe helper.
 *
 * ## Which boundary renders it
 *
 * A `notFound()` thrown in a layout is caught **above** that layout's own
 * segment, so a `not-found.tsx` sitting beside this file could never serve it.
 * That is why the category boundary lives one segment up, at
 * `c/not-found.tsx`, and why moving it back down beside the page would
 * silently retire it and drop every missing category onto the group's generic
 * `(shop)/not-found.tsx` instead of «دسته‌بندی یافت نشد».
 */
export default async function CategoryLayout({ children, params }: Props) {
  const { slug } = await params;
  const category = await fetchCategoryBySlug(slug);

  if (!category.ok && category.reason === "not-found") notFound();

  return children;
}

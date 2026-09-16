import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { fetchBrandBySlug } from "@/lib/fetchers/brands";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

/**
 * `/brand/[slug]`'s not-found decision, above the Suspense boundary.
 *
 * Same mechanism, same reasons and the same measured evidence as
 * `c/[slug]/layout.tsx` — read that one for the full account of why this is a
 * layout and not `generateMetadata`.
 *
 * `fetchBrandBySlug` is the argument-identical `fetch` GET the page and
 * `generateMetadata` already make, so Next's per-request memoization covers it
 * and this adds no HTTP call. Only `reason === "not-found"` 404s; an outage is
 * `"down"` and falls through to the page's `EmptyState`.
 */
export default async function BrandLayout({ children, params }: Props) {
  const { slug } = await params;
  const brand = await fetchBrandBySlug(slug);

  if (!brand.ok && brand.reason === "not-found") notFound();

  return children;
}

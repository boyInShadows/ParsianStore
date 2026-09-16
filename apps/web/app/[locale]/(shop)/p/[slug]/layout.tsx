import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { fetchProductDetailBySlug } from "@/lib/fetchers/catalog";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

/**
 * `/p/[slug]`'s not-found decision, above the Suspense boundary.
 *
 * Same mechanism and the same measured evidence as `c/[slug]/layout.tsx` — read
 * that one for why this is a layout and not `generateMetadata`.
 *
 * **Deliberately the cookie-less call.** The page passes this request's own
 * cookies so `optionalAuth` can resolve a wholesale price server-side (P6.S1);
 * the 404 decision does not depend on who is asking — the endpoint is public and
 * answers 404 for an unknown slug to everyone — so this uses the same
 * argument-identical call `generateMetadata` already makes and memoizes with it.
 * Net new HTTP calls on this route: **zero**. Passing the cookie header here
 * instead would simply move which of the two existing calls it shares.
 *
 * Only `reason === "not-found"` 404s; an outage is `"down"` and falls through to
 * the page's `EmptyState`.
 */
export default async function ProductLayout({ children, params }: Props) {
  const { slug } = await params;
  const result = await fetchProductDetailBySlug(slug);

  if (!result.ok && result.reason === "not-found") notFound();

  return children;
}

import { siteUrl } from "@/lib/seo";

export type JsonLdObject = Record<string, unknown>;

// No logo/sameAs yet -- no real brand-mark asset or verified social profile
// exists to point at (same "honest empty slot" reasoning as the Footer's
// e-Namad seal placeholder). Add once real, never fabricate.
export function organizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "پارسیان",
    url: siteUrl,
  };
}

// SearchAction target matches the real header search form (action="/search",
// input name="q") in components/layout/Header.tsx -- not a speculative route.
export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "پارسیان",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

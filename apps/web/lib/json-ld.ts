import { CATALOG_SYSTEMS } from "schemas";
import { absoluteUrl, siteUrl } from "@/lib/seo";
import { CONTACT_CHANNELS, CONTACT_PHONE_TEL } from "@/lib/contact-info";

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
    // The real number, from the same module the footer and the closing beat
    // read (P13.S9). The `tel:` form, not the Persian-digit display form: this
    // is for a machine to dial, and `CONTACT_PHONE_TEL` is already the
    // normalized +98 international value for exactly that reason.
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: CONTACT_PHONE_TEL,
        contactType: "customer support",
        areaServed: "IR",
        availableLanguage: ["fa"],
      },
    ],
    // Telegram is a real, owner-supplied channel, and `sameAs` is where a
    // profile URL belongs. Still no logo and no other profile: absent rather
    // than fabricated, the same rule the footer's empty trust-badge slots
    // follow. `tel:` is filtered out because it is not a profile.
    sameAs: CONTACT_CHANNELS.filter((channel) => channel.href.startsWith("https://")).map(
      (channel) => channel.href,
    ),
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

/**
 * The ten catalogue systems as an `ItemList` (fableTasks v1.1 P13.S9).
 *
 * Built from `CATALOG_SYSTEMS`, the same closed set the page renders from, so
 * the structured data and the visible index can never describe different
 * catalogues. `position` is 1-based because schema.org's is.
 */
export function systemsItemListJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "دسته‌بندی قطعات",
    itemListElement: CATALOG_SYSTEMS.map((system, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: system.name.fa,
      url: absoluteUrl(`/c/${system.slug}`),
    })),
  };
}

/**
 * A breadcrumb trail, for the category pages.
 *
 * Two levels, because the catalogue is two levels: the store, then a system.
 * Inventing an intermediate "all categories" crumb would point at `/c`, which
 * does not exist -- the finale CTA already tried that and 404'd.
 */
export function breadcrumbJsonLd(trail: readonly { name: string; path: string }[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

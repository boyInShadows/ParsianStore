import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { absoluteUrl, hreflangAlternates, localizedPath } from "@/lib/seo";
import { organizationJsonLd, websiteJsonLd } from "@/lib/json-ld";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  AuthenticityStory,
  BestSellers,
  BrandWall,
  Deals,
  GuidesTeaser,
  HeroV2,
  HowItWorks,
  Newsletter,
  Numbers,
  ShopByVehicle,
  Support,
  SymptomFinder,
  TrustStrip,
} from "@/components/landing";

type Props = {
  params: Promise<{ locale: (typeof routing.locales)[number] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing.meta" });
  const title = t("title");
  const description = t("description");
  const url = absoluteUrl(localizedPath(locale));

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: hreflangAlternates(),
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "پارسیان",
      locale: locale === "fa" ? "fa_IR" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

// Real landing route (masterPlan.md §5, roadmap P4.S1). Sections carry real
// Persian copy end to end -- no placeholder/lorem content. Data-driven
// sections (best sellers, brand wall, deals, ...) stay heading-only until
// P4.S4/P4.S5 wire real data; see each section's own file for why.
export default function LandingPage() {
  return (
    <main>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <HeroV2 />
      <TrustStrip />
      <BestSellers />
      <AuthenticityStory />
      <ShopByVehicle />
      <SymptomFinder />
      <BrandWall />
      <Deals />
      <Numbers />
      <HowItWorks />
      <GuidesTeaser />
      <Support />
      <Newsletter />
    </main>
  );
}

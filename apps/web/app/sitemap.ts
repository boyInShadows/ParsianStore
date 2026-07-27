import type { MetadataRoute } from "next";
import { hreflangAlternates, siteUrl } from "@/lib/seo";

// Only the landing route exists in apps/web today -- PLP/PDP/vehicle pages
// land in later phases per masterPlan.md's roadmap. Extend this list as
// real routes ship; splitting the sitemap by type is Phase 8+ scope
// (masterPlan.md line 967).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      alternates: { languages: hreflangAlternates() },
    },
  ];
}

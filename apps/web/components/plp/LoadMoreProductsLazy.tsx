"use client"; // ssr:false is only permitted from a Client Component boundary

import dynamic from "next/dynamic";

// Same reasoning as components/garage/VehicleSelectorLazy.tsx (P4.S3):
// LoadMoreProducts renders unconditionally whenever a next page exists,
// so without `ssr:false` its JS would still ship in the initial PLP
// bundle even though most visits never click it. No skeleton needed here
// (unlike VehicleSelector) -- a "Load more" button appearing slightly
// after hydration causes no layout shift worth guarding against, since
// the grid above it already reserves its own space.
export const LoadMoreProductsLazy = dynamic(
  () => import("./LoadMoreProducts").then((mod) => mod.LoadMoreProducts),
  { ssr: false },
);
